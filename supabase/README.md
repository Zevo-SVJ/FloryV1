# Database

The schema, its policies, and a suite that proves the policies do what they say.

```
migrations/   applied in filename order by the Supabase CLI
tests/        a Supabase shim, six suites, and a runner
```

Each suite runs against its own database, cloned from the migrated one, because
they insert overlapping fixtures and a shared database would make the result
depend on the order they ran in.

## Applying migrations

With the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref <ref>
supabase db push
```

Or paste `migrations/*.sql` into the SQL editor, in filename order.

## Running the tests

The suite needs a PostgreSQL 16+ server and `psql`. It does **not** need a
Supabase project: `tests/00_supabase_shim.sql` recreates the parts the schema
depends on — the `auth` schema, `auth.users`, `auth.uid()` reading the request's
JWT claim, the `anon` / `authenticated` / `service_role` roles with the same
grants Supabase gives them, and enough of `storage` (`buckets`, `objects`,
`foldername()`) to create and exercise the bucket policies.

```bash
npm run test:db
# or against a specific server
SHOWME_TEST_PGHOST=/var/run/postgresql SHOWME_TEST_PGUSER=postgres npm run test:db
```

It drops and recreates its database each run, so a pass never depends on what
the previous run left behind.

## The security model

One paragraph, and every policy follows from it.

A **profile** is the public identity of a page. It is readable by anyone,
because `showme.at/<username>` has to render for a logged-out visitor arriving
from a TikTok bio. That is safe because the table holds only what a creator
chose to publish — no email, no tokens, no billing.

Everything a creator owns — **links**, **social_links**, **blocks** — hangs off
that profile. The world may read a row only once the creator has published it
(`is_active` / `is_visible`) *and*, for a link, only while it is inside its
schedule; the creator may read all of theirs, including drafts and links that
have not started; and only the creator may write. Every write policy is
`profile_id = (select auth.uid())` in both `USING` and `WITH CHECK`, so a client
can neither create a row owned by somebody else nor hand one of its own away.

**page_views**, **link_clicks** and **subscriptions** are readable by their
owner and writable by nobody through the API. Analytics ingestion writes them
server-side with the service-role key, which bypasses RLS, and the Stripe
webhook will do the same. An anonymous insert policy on analytics would let
anyone forge a creator's traffic with a browser console open; a client-writable
`subscriptions` row would mean a user could grant themselves a paid plan.

### Blocks, links and media

A page is an ordered list of **blocks**. Two kinds own rows elsewhere rather
than carrying them as JSON: a `links` block owns `links` through `block_id`, and
the `socials` block reads `social_links`. Both are first-class tables because
`link_clicks` references a link by id, and burying links inside a JSONB blob
would make per-link analytics a rewrite.

`links_block_same_owner` is the trigger that makes `block_id` safe. Row Level
Security already stops a creator from inserting a link they do not own; it does
not stop them from pointing a link they *do* own at a block they do not, which
would be an attempt to place content on a stranger's page. Today the public
query reaches links through the profile rather than through the block, so the
attempt renders nothing — but that is a property of one query, and the trigger
is a property of the database.

`save_page(payload jsonb)` replaces a whole page in one transaction. It is
`security invoker`, so every statement inside it is subject to the same
policies as a statement from the application: it is a transaction boundary, not
a privilege boundary, and it grants nothing the caller did not already have.
The owner is `auth.uid()` and never an argument, which is a stronger guarantee
than validating a profile id would be. Execute is granted to `authenticated`
only.

**page-media** is a public bucket with a locked write side. The images are the
content of a public page — fetched by strangers, cached by a CDN, embedded in
HTML that Next.js caches for a minute — and signed URLs would expire inside
that window and leave a cached page pointing at dead images. So reads are open
and writes require the first path segment to be the caller's own id. The
bucket also enforces its own 5 MiB limit and MIME list, so a request that never
passes through the application is still refused. SVG is deliberately absent: it
is a document that can carry script.

### Design

`profiles.design` is one JSONB column holding presentation and nothing else:
theme, colours, background, typography, button and layout choices. It is read
exactly when the profile is read — on every public page render — so a separate
table would be a join on the hottest query in the product for a row that is
always exactly one.

It needs no policy of its own. `profiles` is world-readable and owner-writable,
which is precisely the access a page's appearance wants: a stranger must be
able to read it to render the page, and only its owner may change it.

Two constraints keep it honest: it must be a JSON object, and it must fit in
8KB. A full design is a few hundred bytes, so the limit is roomy enough that no
legitimate value approaches it and tight enough that the column never becomes
somewhere to put things. Everything else is enforced in
`src/lib/design/schema.ts`, which parses on the way in and on the way out — a
hand-edited row renders as the default design rather than as broken CSS.

### Analytics

`20260105000000_analytics.sql` finishes the two event tables the first
migration sketched, and the shape of the change is mostly about what a number
has to survive.

**A click outlives its link.** `link_clicks.link_id` was
`on delete cascade`, which meant deleting a link silently deleted its history —
so a creator tidying their page would watch last month's total drop. It is now
`on delete set null`, with a `link_title` snapshot written at click time, and
the dashboard shows the row as *deleted* rather than pretending it never
happened. The same applies to deleting a whole links block.

**A raw user agent and a full referrer are not analytics, they are a log.**
Both columns are gone. What replaces them is what the dashboard actually
displays: a `source` from a fixed list of identifiers, a bare `referrer_host`
with no path or query, and a `device` that is one of four enum values. A
constraint refuses a URL-shaped source and an off-enum device, so the columns
cannot quietly become free text again.

**Unique visitors, without identifying a visitor.** `visitor_hash` is a
32-character HMAC of address, user agent and profile, keyed by a secret and
today's date, computed in `src/lib/analytics/visitor.ts` and never stored
alongside anything it was derived from. The key rotates daily, so two days of
rows cannot be joined into a history of one person, and no address is written
anywhere. Without `ANALYTICS_SALT` the column stays null and the dashboard says
the figure is unavailable.

Five `security invoker` functions read the data — `analytics_overview`,
`analytics_timeseries`, `analytics_top_links`, `analytics_breakdown` and
`analytics_recent`. **None of them takes a profile id.** The rows a caller sees
are the rows their own policies allow, which makes cross-account access a
property of the database rather than of a `where` clause somebody has to
remember to write. Execute is granted to `authenticated` and revoked from
`public`, so an anonymous client cannot call them at all.

`analytics_timeseries` takes a bucket, and it is checked against two literals in
a `CASE` before it reaches `date_trunc` — an interpolated identifier there would
be an injection point. It fills empty buckets with `generate_series` so a quiet
Tuesday is a gap in the chart rather than a missing column.

### A link's life

`20260106000001_growth.sql` gives a link a schedule, a featured flag and an
icon. Only the first is a security boundary, and it is worth being precise
about why it is in a policy rather than in a `where` clause.

`live links are readable by anyone` replaces the policy that only looked at
`is_active`:

```sql
using (
  is_active
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at > now())
)
```

Every reader of a link goes through it: the public page's session-less query, a
direct `supabase-js` call from a browser console, and — the one that matters
most — the `/go/<id>` redirect, which refuses a scheduled or expired link
without a line of application code being added to it. A link that has not
started is indistinguishable from one that does not exist, which is the right
answer to a stranger asking about a drop that has not happened yet. The
owner's own `owners read all their links` policy is untouched, so the editor
still sees everything it manages.

The window is **inclusive at its start and exclusive at its end**, the same
convention every window in the product uses. Two links scheduled back to back
are therefore never both on the page. `src/lib/links/schedule.ts` states the
same rule for the editor and the preview, and both ends stand on the same two
instants in their tests.

Times are absolute. `starts_at` and `ends_at` are `timestamptz`, written from
ISO-8601 strings with an explicit offset, so there is exactly one moment at
which a link appears and the server's own zone never enters into it.

`is_featured` is presentation and nothing else — a featured link is not
readable for one second longer than an unfeatured one, which the suite
asserts directly. An icon is either one of the eighteen platform marks the
socials row already ships or an image in `page-media`, never both, and never
a favicon: fetching one would mean this server making requests to whatever
host a creator typed.

### Search visibility

`profiles.search_visible` decides whether a page asks to be indexed and whether
it appears in the sitemap. It defaults to true, because a creator page exists to
be found.

It is deliberately **not** an access control, and the column's name and comment
both say so. The page stays readable by anyone holding the address — it has to,
because that address is in somebody's bio — and turning this off only changes
what the page tells a crawler. A test asserts exactly that: a page kept out of
search is still readable by a stranger, and a stranger still cannot turn it
back on.

### Hardening

`20260107000000_hardening.sql` is the Phase 8 migration, and it adds no
feature. Four things:

**The `DELETE` policy on `profiles` is dropped.** Nothing in the product deletes
an account. A policy permitting what no code performs is one nobody is
maintaining, and it was the only place a single mistaken statement could remove
a creator's page, their links, their blocks and their history at once.

**Three covering indexes.** `page_views` and `link_clicks` gain
`(profile_id, created_at desc)` indexes that `include` the columns each
breakdown groups by, so a dimension query is an index-only scan; `links` gains a
partial index on the live-link lookup shape.

**`anon` may execute nothing.** Postgres grants `EXECUTE` on a new function to
`PUBLIC`, and `PUBLIC` includes `anon`. The analytics functions revoked it
explicitly; four username helpers from Phase 2 never did, because nothing draws
attention to a default. None was dangerous — they normalize and validate text —
but the rule is worth being able to state without exceptions, and the test suite
now asserts it for every function in the schema.

**`analytics_timeseries` counts each table once.** The Phase 6 version ran two
correlated subqueries per bucket, which at the All-time window's twenty thousand
buckets was forty thousand index scans and a four-second page. It now groups
each table once and left-joins the bucket list, and takes about seven
milliseconds for the same window. The new `p_from_first_event` argument lets a
caller that means "everything" start the series at the first bucket holding
anything: a chart of All time should begin at the creator's first view, while
for a seven-day window the empty leading days are the information. It defaults
to false, so a caller that says nothing gets the old shape.

### Smart Optimization

`20260108000000_optimization.sql` adds three things, and deliberately no copy of
any analytics. A recommendation is derived from `page_views` and `link_clicks`
on every request, so there is no second table drifting out of step with the
first — and no way for the dashboard to show "move YouTube to #1" after YouTube
has been moved.

**`analytics_device_performance`** returns views *and* clicks per device. The
existing `analytics_breakdown` returns views only, and a per-device
click-through rate needs both halves measured the same way. Device is the one
dimension where they are: both tables derive it from the user agent of their own
request. Source is not — a view's source comes from `document.referrer` while a
click is recorded by `/go/<id>`, whose referrer is the creator's own page and
normalizes to `direct` — so there is deliberately no source equivalent of this
function.

**`optimization_events`** holds one row per optimization a creator applied or
dismissed: the rule that produced it, the stable key of the situation, a line
for the history, and — for an applied one — the previous state of the rows it
touched, which is what Undo reads. A partial unique index on
`(profile_id, recommendation_key) where kind = 'dismissed'` makes dismissing
twice the same as dismissing once. Four policies, all `profile_id =
auth.uid()`, and no read policy for anyone else: an optimization score is a
private number about a private dashboard.

**`optimize_reorder_links`** applies a new position to several of the caller's
own links in one statement, because reordering four links is one decision and
four round trips from the application would let a dropped connection leave a
page in an order nobody chose. It **takes no block id**, so a recommendation can
reorder a section and can never move a link between sections — which is both a
product decision and the removal of the one place a crafted payload could name
another creator's block. `security invoker` plus an explicit `profile_id = me`
means a payload naming another creator's links matches nothing, and the returned
count says so.

### Usernames

`profiles.username` is the whole public address, so the rules are enforced in
three layers: a CHECK constraint on the format, a trigger for reserved names,
and a unique index that settles every race.

`handle_new_user()` reads the username the user chose out of
`raw_user_meta_data` and creates the profile in the same transaction as the auth
row. A taken name makes that transaction fail as a whole — there is deliberately
no fallback there, because silently assigning a different name would be worse
than a refused signup, and a rollback leaves no orphaned account.

`guard_username_change()` makes the username write-once. It also owns
`username_claimed_at` outright: a client that could set that column could reset
itself to unclaimed and rename at will, which would defeat the rule entirely.
An attempt to write it is refused rather than quietly reverted, so a rejected
write never answers with a success.

### Things the suites actually check

- A profile is created automatically for every new auth user.
- Reserved, uppercase, spaced, doubled-underscore and duplicate usernames are all refused.
- A `javascript:` URL cannot be stored.
- Anonymous readers see profiles and active links, never drafts, analytics or subscriptions.
- One creator cannot read, edit, delete, or plant rows on another's page.
- A creator cannot reassign their own row to somebody else.
- A creator cannot write their own entitlement or forge their own analytics.
- A creator cannot rewrite their profile id to become another user.
- RLS is enabled on every table, and no write policy is unconditional.
- Every username rule agrees with the TypeScript copy: length boundaries,
  hyphens, underscores, spaces, periods, slashes, emoji, uppercase, edges and
  adjacent separators.
- A username chosen at signup reaches the profile and is marked claimed.
- A taken username fails signup atomically, leaving no account without a page.
- Missing, malformed and reserved usernames fall back to a placeholder and land
  in onboarding.
- A claimed username cannot be changed, and `username_claimed_at` cannot be
  reset to sidestep that.
- One user cannot claim a username on another's profile, nor take over another
  account's placeholder.
- Two accounts racing for the same name are settled by the unique index.
- A stranger with no session at all can read a creator's profile, active links,
  active socials and visible blocks — the public page renders for a logged-out
  visitor without a single policy exception.
- A draft link, an inactive social and a hidden block are invisible to that
  stranger at the row level, so a hidden block's `data` never leaves the
  database even if the query forgot to filter.
- One creator's links never appear under another's username, and two creators
  resolve independently.
- A stranger cannot edit a profile, edit or delete a link, publish somebody
  else's draft, plant a link, or add a block.
- A stranger reading profiles gets no auth rows, no analytics and no billing.
- The owner still reads their own drafts when authenticated — the public page
  hides them by filtering, not by a policy the owner would also hit.
- `javascript:`, `data:` and `vbscript:` URLs cannot be stored in `links` or
  `social_links` in the first place.
- `save_page` writes a whole page: array order becomes `position`, hidden blocks
  stay hidden, unpublished links stay saved, a cleared bio becomes null, and
  anything left out of the payload is deleted.
- An empty payload empties the page rather than failing.
- `save_page` cannot upsert a block owned by another creator — and when it
  refuses, nothing partial is left behind, which is what the single transaction
  is for.
- A link cannot be placed in another creator's block, moved into one, or
  attached to a block that is not a links block.
- Deleting a links block deletes the links inside it.
- A creator can upload into their own folder and into no other; cannot delete
  another creator's media; and cannot move their own object into somebody
  else's folder.
- A stranger can read media and can neither write it nor call `save_page`.
- A design is saved with the page it belongs to, and changing a theme leaves
  every block and link exactly as it was.
- A payload that never mentions design leaves the stored design in place, so an
  older client cannot silently wipe a creator's theme.
- A creator cannot restyle another creator's page, and a stranger cannot
  restyle anybody.
- A design that is not an object, or is larger than the column allows, is
  refused by the database rather than by the application alone.
- A creator reads their own analytics and only their own: a rival's views and
  clicks are invisible at the row level, and every function returns the caller's
  rows without being told whose they are.
- Nobody can insert, update or delete an event through the API — not the owner,
  not a rival, not a stranger — so a creator cannot forge their own traffic.
- An anonymous client reads no events and cannot execute any analytics function.
- Deleting a link, or the whole block that held it, keeps its clicks: they show
  up under the snapshotted title with a deleted marker.
- Window boundaries are exclusive at the top and inclusive at the bottom, so an
  event never lands in two ranges at once.
- The time series buckets sum to exactly the overview totals for the same
  window.
- Repeat views from one visitor hash count once toward visitors and every time
  toward views.
- `page_views` and `link_clicks` have no `user_agent`, `referrer` or `ip`
  column at all.
- A URL-shaped source, a non-hash visitor hash and an off-enum device are all
  refused by the database.
- A stranger sees only the links that are live *right now*: one that has not
  started, one that has ended and one switched off are all invisible at the row
  level, so the click redirect refuses them without knowing scheduling exists.
- A link is live from the instant its window opens and gone at the instant it
  closes.
- Featuring a scheduled link does not make it readable.
- A window that ends before it begins, or lasts no time at all, is refused.
- A link cannot carry a platform mark and an uploaded icon at once, and an icon
  served over http is refused.
- A link keeps its id — and therefore its clicks — through every status change,
  and a scheduled link deleted through `save_page` still keeps them.
- `save_page` writes a schedule, a featured flag, an icon, a grid layout and the
  three new block types in one transaction.
- A client that has never heard of search visibility cannot reset it by saving.
- A rival can read a live link, like anybody, and cannot publish a scheduled one
  early, un-feature one, delete one, or remove a page from search.
- A page kept out of search is still readable by a stranger, which is what makes
  it a search setting rather than a privacy one.

**Smart Optimization** (`08_optimization.sql`) checks the three additions above,
and the assertion that matters most is what `optimize_reorder_links` does with a
payload naming another creator's links: it moves nothing, reports zero, and
leaves their page exactly as it was. A mixed payload moves only the caller's own
rows. Alongside that: views and clicks are counted per device and scoped by RLS;
a dismissal cannot be recorded twice; a recommendation type has to look like a
rule name; a rival reads, writes and deletes none of another creator's history;
and an anonymous visitor can execute neither new function.

**The Phase 8 audit** (`07_hardening.sql`) asks the questions an auditor asks
rather than testing a feature, so most of it duplicates nothing above:

- RLS is on for *every* table in `public`, by enumeration rather than by list —
  a table added later without it is the single most likely way this product
  leaks, and it would leak silently.
- No write policy anywhere is unconditional, and `page_views`, `link_clicks`
  and `subscriptions` have no write policy at all.
- `profiles` has no `DELETE` policy.
- Every function pins `search_path`, and `handle_new_user` is the only
  `SECURITY DEFINER` one.
- **`anon` can execute no function.** This is the assertion that found four
  username helpers from Phase 2 still carrying Postgres's default grant to
  `PUBLIC`.
- Every owned table has a foreign key to the profile that owns it; deleting a
  link nulls its clicks' `link_id` rather than deleting the history.
- A stranger and a rival are each walked through the whole surface: read,
  write, delete, escalate.
- The covering indexes exist, and both event tables are indexed by owner and
  time.
- `analytics_timeseries` puts every event in the bucket it belongs to,
  including one a microsecond before midnight and one at the exact end of a
  window; empty days are still rows; the `p_from_first_event` flag changes
  where a chart starts and nothing about what it totals.

## Conventions

- Every function is `set search_path = ''`. Without it, a caller can prepend a
  schema they control and shadow the tables a `SECURITY DEFINER` function reads.
- Policies use `(select auth.uid())` rather than a bare `auth.uid()`, so
  Postgres evaluates it once per statement instead of once per row.
- `reserved_usernames` mirrors `src/lib/validation/reserved.ts`. Entries must be
  stored already normalized — a hyphenated entry would never match, because a
  username is normalized before it is looked up. A unit test asserts this.
