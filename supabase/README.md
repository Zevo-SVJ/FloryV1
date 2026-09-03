# Database

The schema, its policies, and a suite that proves the policies do what they say.

```
migrations/   applied in filename order by the Supabase CLI
tests/        a Supabase shim, four suites, and a runner
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
(`is_active` / `is_visible`); the creator may read all of theirs, including
drafts; and only the creator may write. Every write policy is
`profile_id = (select auth.uid())` in both `USING` and `WITH CHECK`, so a client
can neither create a row owned by somebody else nor hand one of its own away.

**page_views**, **link_clicks** and **subscriptions** are readable by their
owner and writable by nobody through the API. Analytics ingestion and the Stripe
webhook will write them server-side with the service-role key, which bypasses
RLS. An anonymous insert policy on analytics would let anyone forge a creator's
traffic; a client-writable `subscriptions` row would mean a user could grant
themselves a paid plan.

### Blocks, links and media

A page is an ordered list of **blocks**. Two kinds own rows elsewhere rather
than carrying them as JSON: a `links` block owns `links` through `block_id`, and
the `socials` block reads `social_links`. Both are first-class tables because
`link_clicks` will reference a link by id in Phase 6, and burying links inside a
JSONB blob would make per-link analytics a rewrite.

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

## Conventions

- Every function is `set search_path = ''`. Without it, a caller can prepend a
  schema they control and shadow the tables a `SECURITY DEFINER` function reads.
- Policies use `(select auth.uid())` rather than a bare `auth.uid()`, so
  Postgres evaluates it once per statement instead of once per row.
- `reserved_usernames` mirrors `src/lib/validation/reserved.ts`. Entries must be
  stored already normalized — a hyphenated entry would never match, because a
  username is normalized before it is looked up. A unit test asserts this.
