# Architecture

The decisions taken at Foundation, and why. Each one is a thing the next person
would otherwise have to reverse-engineer or re-litigate.

---

## The repository

LOCK is built in this repository, replacing the previous product that lived
here. That product is not deleted — it remains at
`origin/claude/blink-landing-mvp-icii2o`, and its history is intact in this
branch's ancestry. Nothing was lost; a different product simply stopped being
what this branch builds.

Preserved from it, because it was good and general: the tooling
(`tsconfig.json`, `eslint.config.mjs`, the Node test runner and its `@/*` alias
hook), the Supabase SSR client structure, the `psql`-based RLS test harness, and
the route-policy approach to open redirects. Everything domain-specific was
removed rather than adapted.

---

## Layers

```
app/          routes. Thin. Reads a session, calls lib/, renders.
components/   presentation. ui/ has no product knowledge; the rest is by feature.
lib/          all of it. Policy, data access, writes, the product's own model.
supabase/     the schema and the tests that prove its policies.
```

The rule that matters: **`app/` holds no logic**. Not for tidiness — Next.js
route files cannot be imported by the Node test runner, so anything that lives
there is untestable by construction. `lib/` is where the same code is a function
somebody can call.

### Why not a `server/` or `services/` directory

Because there is one product and one database, and a service layer between a
Server Component and `lib/auth/dal.ts` would be a folder that forwards calls.
Server Components *are* the server layer; adding another is the abstraction the
brief warns about. When a piece of logic is genuinely shared by a route handler,
an action and a page, it goes in `lib/<feature>/` — which is where it already
would be.

---

## Authentication

Supabase Auth, email and password, PKCE, with the session in cookies.

**Three places touch it, and each does one thing.**

| File | Job |
|---|---|
| `src/proxy.ts` → `lib/supabase/proxy.ts` | Refreshes the token on every rendered request and writes the rotated cookie back. Redirects early. |
| `lib/auth/dal.ts` | Verifies the session next to the data. The check that counts. |
| `lib/auth/actions.ts` | Writes. Each action re-verifies rather than trusting its caller. |

The proxy's redirects are **an optimization, not a boundary**. A Server Action
is a URL and can be POSTed to directly, never passing through a layout, so a
guard that lives only in front of the page guards nothing. Every action calls
into the DAL itself.

`getUser()` everywhere, never `getSession()`. `getSession()` decodes the cookie
and believes it; `getUser()` verifies it with the auth server. Only the second
is worth basing an authorization decision on.

`connection()` is awaited at the top of `getUser()`. In Next.js 16 there is no
`export const dynamic`, and the unconfigured code path returns before reading
cookies — which would let a protected page be prerendered at build time into
whatever the build machine saw. `connection()` states the requirement once,
centrally.

### Email confirmation needs `/auth/callback`

`@supabase/ssr` uses PKCE, so the link in a confirmation email carries a `code`
that must be exchanged for a session on the server, where the verifier cookie
is. Pointing the email at `/dashboard` produces a confirmed account nobody can
sign into. The route exists for exactly this.

---

## Roles and authorization

Three roles in an enum: `learner`, `mentor`, `admin`.

Two were asked for. Three are stored, because "reviews the work" and
"administers the platform" diverge as soon as there is more than one learner,
and splitting them later means rewriting every policy written before the split.
Most policies ask `is_staff()` — mentor-or-admin — so the extra role costs
nothing at the call site.

**The role is never writable through the API.** Not by its owner, not by an
admin. Three independent mechanisms say so:

1. `revoke all` then `grant update (display_name)` — a column-level privilege.
   PostgREST cannot write a column the role has no privilege on.
2. A `before update` trigger that refuses a role change when `current_user` is
   `anon` or `authenticated`, and stays out of the way of the project owner.
3. The signup trigger reads `display_name` out of `raw_user_meta_data` and
   deliberately does not read `role` — that field is whatever the browser sent.

Promotion is SQL run by the project owner (`SETUP.md` has the statement). When
that becomes inconvenient, Prompt 6 can add a `security definer` function with
its own audit trail — a considered decision, rather than a widened grant.

Role helpers are `security definer` with `set search_path = ''`. Definer is not
a shortcut: a policy on `profiles` that reads `profiles` to find the caller's
role recurses until Postgres gives up, and a definer function terminates it. The
empty search path stops a caller who can create a schema from shadowing
`profiles` and deciding what the function returns.

### Role gating is in the page, not the proxy

The proxy verifies sessions and knows nothing about roles. Reading a profile
from the database in front of every route would put a query in the path of every
navigation to save a redirect. So the role is read on the server where the page
renders, and `checkAccess()` returns the answer.

It **returns** rather than throwing, and that is a production concern rather
than a style one: Next.js strips error messages from a production build and
hands the boundary a digest, leaving an `error.tsx` unable to distinguish
"forbidden" from "the database fell over". A returned value survives the build.

`forbidden()` from Next.js would be the idiomatic answer and is still behind the
experimental `authInterrupts` flag. Foundation enables no experimental flags.
Revisit at Prompt 6.

---

## Security

- **Row Level Security on from the first row.** No table has a permissive
  policy. `profiles` has select and update policies and deliberately no insert
  or delete: rows are created by a trigger and removed by the cascade from
  `auth.users`.
- **Column privileges, not just row policies.** RLS decides *which rows*; it has
  nothing to say about *which columns*. Both are used.
- **`anon` is granted nothing.** LOCK has no public data.
- **Open redirects are closed by resolution, not pattern-matching.**
  `lib/auth/routes.ts` resolves a `next` value against a throwaway origin and
  accepts it only if it stays there. The obvious check —
  `startsWith("/") && !startsWith("//")` — passes `/\evil.example`, which a URL
  parser reads as `https://evil.example/`. There is a test for each form.
- **Security headers in `next.config.ts`**, not the proxy: the proxy does not run
  on static assets, and Next.js replaces some headers a proxy writes.
- **No Content-Security-Policy yet, on purpose.** A real one needs a per-request
  nonce threaded through the proxy; a policy that ships `unsafe-inline` reads as
  protection while providing none. LOCK renders no user HTML and embeds nothing
  third-party. Scheduled for Prompt 9.
- **Rate limiting is honest about being a `Map` in one process.** It resets on
  deploy and does not coordinate across instances. It stops a loop against a
  Server Action, which is what it is for; Supabase rate-limits auth itself, and
  that is the limit that matters.

### No service-role key

`SUPABASE_SERVICE_ROLE_KEY` is read nowhere. The key bypasses RLS entirely, so
it is worth introducing only for a job that cannot be done any other way —
writing rows no user may write, for instance. Foundation has no such job: every
read and write happens as the signed-in user, through RLS.

When a later phase needs it, it belongs in exactly one `server-only` module,
never with a `NEXT_PUBLIC_` prefix, and the reason belongs in this file.

---

## The database

One table. `supabase/README.md` explains the schema and how the tables that do
not exist yet are expected to relate.

The short version: an account and a role cannot be retrofitted safely once rows
exist, so they are built properly now. Everything else — phases, lessons,
missions, submissions, artifacts, progress, feedback — is a shape that depends
on content nobody has written, and choosing it now would be choosing it blind.

**The ten phases are a typed constant** (`lib/lock/phases.ts`), not rows. The
sequence is fixed and known, the interface needs to name it today, and turning
it into content is Prompt 3's job. When the learning engine arrives, `phases`
becomes a table seeded from that list, keyed on the same `key` values, so
anything written against them keeps working.

---

## Design

The tokens are the design system, and they are all in `src/app/globals.css`.
Nothing in the application hard-codes a colour, a radius or a size.

Three decisions:

1. **Nearly monochrome.** Primary actions are inverted ink, not a coloured fill.
   This is what separates a builder's tool from a course platform — the
   interface recedes and the work does not.
2. **One signal colour, used sparingly.** Amber: focus rings, the active
   section, progress. Warm against the neutral scale, carries the product's own
   semantics, and is not the blue every SaaS reaches for.
3. **Monospace as a texture.** Geist Mono at small sizes with open tracking for
   labels, numbers and statuses. That is the "technical detail" of a developer
   product, and it costs one font variable.

Two radii, two shadows, one type scale. A third of anything is a decision nobody
can remember making. Light and dark are both defined as semantic tokens and
switch on `prefers-color-scheme` in CSS, so there is no flash; a manual toggle
can be layered on later under a `[data-theme]` selector without touching a
component.

No component library. Six primitives cover what Foundation renders, and a
library's weight is paid in every future decision about how to override it.

---

## Empty, loading, error

Every "there is nothing here" moment is one component — `StateBlock` — with
different words. Empty, error, unauthorized, not-found and not-built-yet are the
same thing to the person reading them: an explanation and, where one exists, a
way out. Building them separately is how a product ends up with five different
apologies.

There are two error boundaries and they differ by one action. The one inside the
shell offers **sign out**, because the failure it most plausibly catches is a
session that is valid but whose profile cannot be read — and retry loops on that
forever.

---

## Testing

Two suites, both real.

- `npm test` — Node's own runner, TypeScript stripped by the runtime, no jest,
  no vitest, no transform pipeline to keep in step with the bundler. It covers
  the redirect helpers, the section registry, the phase spine and the schemas.
- `npm run test:db` — the migration applied to a throwaway PostgreSQL, then a
  suite that connects as `anon` and as `authenticated` with a specific `sub`
  claim, exactly as PostgREST does. Twenty-six assertions, each one something a
  hostile client would try.

The database suite matters more than it looks. RLS refuses work in two different
ways — a privilege violation raises, a filtered `UPDATE` quietly matches no rows
— and a suite that only looks for the first passes while the door is open. The
`denied()` helper accepts both and fails on anything that touched a row.

---

## What Foundation deliberately does not include

Each of these was considered and left out:

| Not built | Why |
|---|---|
| An invite system | Supabase already has a signup switch, and the real version — an admin who invites people — belongs in Prompt 6. |
| A generated `database.types.ts` | `supabase gen types` needs the CLI or a running project, in front of every clone, for one table. Switch when the schema outgrows a screen. |
| A service-role client | Nothing needs to bypass RLS. See above. |
| A CSP | A policy that looks right and ships `unsafe-inline` is worse than none. Prompt 9. |
| A `phases` table | The content that decides its shape does not exist yet. |
| Dashboard statistics | There is nothing to count. Invented numbers make the product look finished and make every later prompt harder. |
| A theme toggle | The tokens support it; nobody has asked, and `prefers-color-scheme` is already right for most people. |
| `clsx` + `tailwind-merge` | Four lines do it at this size. |
