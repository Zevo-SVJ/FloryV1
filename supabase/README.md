# The LOCK database

One table today. This file explains that table's security model, and — more
usefully — the decisions already taken about the tables that do not exist yet.

## Applying it

```bash
npm run test:db     # migrations + security suite against a throwaway database
```

In a Supabase project: paste `migrations/20260901000000_foundation.sql` into the
SQL editor, or `supabase db push` with the CLI. Migrations are applied in
filename order and are never edited after they ship — a change is a new file.

## What exists

### `public.profiles`

The application-side half of an account, keyed by `auth.users.id`.

| Column | Notes |
|---|---|
| `id` | PK, FK to `auth.users` with `on delete cascade` |
| `display_name` | Optional, 1–80 characters after trimming |
| `role` | `learner` \| `mentor` \| `admin`. Not writable through the API |
| `created_at`, `updated_at` | `updated_at` maintained by a trigger |

`auth.users` belongs to Supabase and must not be extended. `profiles` is the
table LOCK owns, and every future foreign key points at `profiles(id)` so that
deleting an account cascades through the whole schema in one step.

`handle_new_user()` fills `display_name` from the first of `display_name`,
`full_name` or `name` present in `raw_user_meta_data` — LOCK's own form sends
the first, Google sends the other two. It reads no role from that field under
any circumstances.

### Functions

| Function | Returns |
|---|---|
| `current_app_role()` | The caller's role, or null with no session |
| `is_staff()` | Mentor or admin |
| `is_admin()` | Admin |

All three are `stable security definer` with `set search_path = ''`. Definer is
required, not preferred: a policy on `profiles` that reads `profiles` to find
the caller's role would recurse forever. `stable` lets the planner call them
once per statement rather than once per row.

`is_staff()` is the question nearly every future policy actually asks — "may
this person see work that is not theirs?" — so write policies against it rather
than against `role in ('mentor','admin')`.

## The security model

- **RLS is on, and no policy is permissive.** A learner reads and edits their
  own row. Staff read every row and edit none but their own. Nobody inserts or
  deletes: the signup trigger creates rows, the cascade from `auth.users`
  removes them.
- **Column privileges do what RLS cannot.** RLS decides *which rows*, not *which
  columns*. `revoke all` then `grant update (display_name)` is what keeps `role`
  out of reach of a caller who legitimately owns the row. Supabase grants the
  API roles everything on `public` by default, so the revoke is load-bearing —
  and the test shim reproduces that default, or the test would prove nothing.
- **`anon` is granted nothing.** LOCK has no public data.
- **Signup metadata is untrusted.** `handle_new_user()` reads a *name* out of
  `raw_user_meta_data` and deliberately never reads `role`. That field is
  `options.data` from the browser on a password signup, and the identity
  provider's claims on a social one — neither is a source of authorization.
  There is a test for each shape: one puts `"role": "admin"` in a form signup,
  another puts it in a Google-shaped payload, and both assert the account comes
  out a learner.

Changing a role is SQL run by the project owner. See `SETUP.md`.

## The tables that do not exist yet

Not built, because their shape depends on content nobody has written. These are
the decisions already made about how they relate, so that later prompts extend
this rather than reinvent it.

```
auth.users
  └─ profiles (id)                       role lives here
       ├─ enrollments? ─────────────────  not yet. One learner, one program.
       ├─ progress (profile_id, …)        one row per learner per unit
       ├─ submissions (profile_id, …)     a learner's answer to a mission
       │    └─ feedback (submission_id, author_id → profiles)
       ├─ artifacts (profile_id, …)       what a mission produced
       └─ projects (profile_id, …)        the SaaS being built

phases (key)                              content spine — no owner
  └─ modules (phase_id)
       └─ lessons (module_id)
            └─ missions (lesson_id)
                 └─ deliverables (mission_id)

resources / prompts / templates / frameworks / checklists
                                          content, no owner, read by everyone
```

Four decisions inside that sketch:

**1. Content and progress are separate trees.** Phases, modules, lessons and
missions have no owner and one copy. What a learner *did* — progress,
submissions, artifacts — hangs off `profiles`. Mixing them (a `lessons` row per
learner) is the mistake that makes content edits rewrite history.

**2. Content is world-readable to authenticated accounts; progress is not.**
Content policies will be `to authenticated using (true)`; progress policies will
be `using (profile_id = auth.uid() or public.is_staff())`. Two shapes, applied
consistently, rather than a bespoke policy per table.

**3. `phases` will be seeded from `src/lib/lock/phases.ts`**, keyed on the same
`key` values (`think`, `research`, …). That is a seed script, not a rewrite, and
anything already written against those identifiers keeps working.

**4. Nothing gets a `deleted_at` until something needs one.** Soft deletion
doubles the number of predicates in every policy, and every policy is a place to
get authorization wrong.

## Writing a migration

- New file, `YYYYMMDDHHMMSS_name.sql`. Never edit one that has shipped.
- `enable row level security` in the same statement block as `create table`.
  A table that exists without RLS for one deploy is a table that was open.
- `revoke all` and grant the columns you mean, if the table has any column a
  client must not write.
- Add assertions to `tests/` in the same change. The suite is cheap to extend
  and it is the only thing that proves a policy does what its name says.
