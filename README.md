# ShowMe

One page for everything you make — `showme.at/<username>`.

**Phase 1: foundation.** Auth, the schema, the security model and the route
skeleton. There is no editor, no themes and no analytics UI yet; those are
later phases, and this exists so they can be built without a rewrite.

---

## Running it

```bash
npm install
cp .env.example .env.local     # then fill in your Supabase keys
npm run dev                    # http://localhost:3000
```

```bash
npm run typecheck
npm run lint
npm test                       # validation unit tests
npm run test:db                # schema + RLS, against a real Postgres
npm run build
npm run check                  # all of the above
```

Node 20+. Without Supabase keys the app still runs: public routes render, and
anything needing a session says so instead of crashing.

---

## Structure

```
src/
  app/
    page.tsx              landing placeholder
    login/  signup/       functional auth
    (app)/                the signed-in shell — protection lives in its layout
      dashboard/  editor/
    [username]/           the public creator page
    error.tsx  global-error.tsx  not-found.tsx
  components/
    ui/                   button, field
    layout/               site header, app nav
    auth/                 the auth form, sign out
  lib/
    supabase/             server client, browser client, session refresh
    auth/                 the data access layer, server actions, route rules
    validation/           usernames, URLs, reserved names, schemas
    profiles.ts           reading a public page
    env.ts                configuration, and whether there is any
  types/database.ts       the schema, in TypeScript
  proxy.ts                runs before every route
supabase/
  migrations/             the schema and its policies
  tests/                  a Postgres shim, an RLS suite, a runner
```

---

## How authentication works

Three layers, and only one of them is the security boundary.

**`src/proxy.ts`** runs before every rendered route. Its real job is refreshing
the Supabase session: access tokens are short-lived, Server Components cannot
write cookies, so without this a rotated token would be discarded on every
render and people would be logged out at random. It also redirects a signed-out
visitor away from `/dashboard` and `/editor` — but that is a convenience, so the
browser never paints a shell it is about to lose.

> Next.js 16 renamed `middleware.ts` to `proxy.ts`. The behaviour is unchanged.

**`src/lib/auth/dal.ts`** is the boundary that counts. Every function that
depends on who is asking verifies the session itself, with `getUser()` rather
than `getSession()` — the latter decodes the cookie and believes it, which is
fine for rendering a name and unacceptable for deciding what somebody may read.
It is wrapped in React's `cache()`, so a layout, a page and three components
asking the same question cost one round trip.

**Row Level Security** is the layer that holds when the other two are bypassed
entirely. A Server Action is reachable by direct POST; `supabase-js` is
reachable from a browser console. Neither can read or write a row the policies
do not allow. See [`supabase/README.md`](supabase/README.md).

Nothing that crosses into the server trusts a `profile_id` from the request.
Ownership always comes from the session.

---

## Decisions worth knowing

**`connection()` in the data access layer, not `export const dynamic`.**
Next.js 16 removed the `dynamic` route segment config. Reading cookies usually
makes a route dynamic on its own, but the unconfigured code path returns before
touching them — which would let a protected page be prerendered at build time
into whatever the build machine saw. `await connection()` in `getUser()` states
the requirement once, where it cannot be forgotten per route.

**No app-wide `loading.tsx`.** A root loading boundary opens a Suspense
boundary on every route, which commits a `200` before `notFound()` or
`redirect()` can set a status. With one, a mistyped creator name returned a soft
404 and `/Alex` returned 200 with a meta refresh. Without one, `/nope` is a real
`404` and `/Alex` is a real `307`. Add Suspense where data is genuinely slow,
not globally.

**Usernames are canonical or they are a redirect.** `/Alex`, `/alex` and
`/a.lex` must not be three pages. `usernameFromPath()` accepts only the already
normalized form; anything else redirects to the canonical address, so links,
analytics and search results never fragment across spellings.

**The reserved list is duplicated on purpose.** `src/lib/validation/reserved.ts`
gives instant feedback while someone types; `reserved_usernames` is what
actually holds the line, and it is a table so names can be added without a
deploy.

**Analytics has no insert policy.** Not an oversight — an anonymous insert
policy would let anyone forge a creator's traffic. Ingestion is server-side with
the service-role key, in phase 6.

**Cache Components is off.** Next.js 16 ships it opt-in, and it changes caching
semantics across the whole app. Turning it on is a decision for the phase that
makes the public page fast, with the public page in front of us.

---

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Safe in the browser; RLS is what grants access. |
| `NEXT_PUBLIC_SITE_URL` | no | Canonical origin. Falls back to `VERCEL_URL`, then localhost. |

The service-role key is **not** used in this phase and must never be exposed to
the browser or prefixed with `NEXT_PUBLIC_`.

---

## What is not here yet

The editor, drag and drop, themes, custom fonts and backgrounds, the analytics
dashboard, QR codes, monetization, Stripe, AI, and sharing. All later phases.
The schema and the policies for them are already in place, which is the point.
