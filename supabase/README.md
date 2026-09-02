# Database

The schema, its policies, and a suite that proves the policies do what they say.

```
migrations/   applied in filename order by the Supabase CLI
tests/        a Supabase shim, an RLS suite, and a runner
```

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

### Things the suite actually checks

- A profile is created automatically for every new auth user.
- Reserved, uppercase, spaced, doubled-underscore and duplicate usernames are all refused.
- A `javascript:` URL cannot be stored.
- Anonymous readers see profiles and active links, never drafts, analytics or subscriptions.
- One creator cannot read, edit, delete, or plant rows on another's page.
- A creator cannot reassign their own row to somebody else.
- A creator cannot write their own entitlement or forge their own analytics.
- A creator cannot rewrite their profile id to become another user.
- RLS is enabled on every table, and no write policy is unconditional.

## Conventions

- Every function is `set search_path = ''`. Without it, a caller can prepend a
  schema they control and shadow the tables a `SECURITY DEFINER` function reads.
- Policies use `(select auth.uid())` rather than a bare `auth.uid()`, so
  Postgres evaluates it once per statement instead of once per row.
- `reserved_usernames` mirrors `src/lib/validation/reserved.ts`. Entries must be
  stored already normalized — a hyphenated entry would never match, because a
  username is normalized before it is looked up. A unit test asserts this.
