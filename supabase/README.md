# Database

The schema, its policies, and a suite that proves the policies do what they say.

```
migrations/   applied in filename order by the Supabase CLI
tests/        a Supabase shim, three suites, and a runner
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
JWT claim, and the `anon` / `authenticated` / `service_role` roles with the same
grants Supabase gives them.

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

## Conventions

- Every function is `set search_path = ''`. Without it, a caller can prepend a
  schema they control and shadow the tables a `SECURITY DEFINER` function reads.
- Policies use `(select auth.uid())` rather than a bare `auth.uid()`, so
  Postgres evaluates it once per statement instead of once per row.
- `reserved_usernames` mirrors `src/lib/validation/reserved.ts`. Entries must be
  stored already normalized — a hyphenated entry would never match, because a
  username is normalized before it is looked up. A unit test asserts this.
