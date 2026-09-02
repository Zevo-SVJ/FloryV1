# ShowMe

One page for everything you make — `showme.at/<username>`.

**Phase 3: the public page engine.** Someone can sign up, claim an address,
and that address renders — `showme.at/<username>` serves a real creator page,
built from the database, to a visitor with no account. There is no editor yet:
rows are added through Supabase, and the page shows them. Themes and analytics
are later phases.

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
    onboarding/           for an account that arrived without a username
    api/username/         availability, while somebody is typing
    (app)/                the signed-in shell — protection lives in its layout
      dashboard/  editor/
    [username]/           the public creator page, and its 404
    robots.ts             what a crawler may visit
    error.tsx  global-error.tsx  not-found.tsx
  components/
    ui/                   button, field
    layout/               site header, app nav
    auth/                 the auth form, sign out
    public/               everything the creator page renders
  lib/
    supabase/             server client, browser client, session refresh,
                          and a session-less client for the public page
    auth/                 the data access layer, server actions, route rules
    validation/           usernames, URLs, reserved names, schemas
    usernames/            is this name free?
    public-page/          the query, the shape, the block registry, the avatar
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

## Usernames

A username is the whole address, so the rules are strict and they live in two
places: `src/lib/validation/username.ts` for the browser, and SQL for the
database. The database is the one that decides;
`supabase/tests/02_usernames.sql` asserts the two agree.

Lowercase letters, digits, underscore and hyphen. Three to thirty characters.
Alphanumeric at both ends, and never two separators in a row.

**Normalizing folds, it does not strip.** `Alex` becomes `alex`, but `john doe`
stays `john doe` and is then refused. Quietly deleting the space would hand
somebody `johndoe` — an address they never typed and never checked.

**The name is claimed in the same transaction as the account.** `signUp` passes
it as user metadata; a trigger on `auth.users` reads it back out and creates the
profile. There is no second request that could fail on its own, and no window
where an account exists without a page. If the name was taken in the
milliseconds since the availability check, the unique index rejects it, the
whole signup rolls back, and no orphaned account is left behind.

**The availability check is a courtesy, not a guarantee.** It exists to tell
somebody early. Between the check and the write, anybody can take the name, so
both the signup action and the claim action are written to expect the answer to
arrive late — from `profiles_username_key`, which is the only thing that
actually decides.

**Usernames are write-once for now.** Changing one changes a public URL, which
breaks old links, splits analytics and rots search results. None of that is
handled yet, so a trigger refuses the change rather than leaving the door open
for a client to walk through `supabase-js` directly. `username_claimed_at` is
maintained by that trigger, because a client that could write it could reset
itself to unclaimed and rename freely.

**An account without a username is a real state.** Created from the Supabase
dashboard, or by a signup that predates this flow. It gets a placeholder derived
from its id, `username_claimed_at` stays null, and the app shell sends it to
`/onboarding`. The normal signup never lands there.

---

## The public page

`showme.at/<username>` is the route the product exists to serve. It is opened
from a bio link, on a phone, on mobile data, by somebody who will give it about
a second. Everything about it is arranged around that.

**One function reads it.** `getPublicPage(username)` in
`src/lib/public-page/query.ts` returns the profile, the links, the socials and
the blocks in a single embedded select — not four queries fanned out across the
component tree. It is wrapped in React's `cache()`, so `generateMetadata` and
the page body share one round trip instead of making two. Columns are named
rather than `select("*")`, which keeps `profile_id` and the owner's uuid out of
the server-rendered payload.

**The query has no session.** `createPublicClient()` builds a Supabase client
with `persistSession: false` and no cookies, so Row Level Security evaluates
every row as `anon`. Two things follow. The response depends only on the URL, so
it can be cached. And a signed-in creator opening their own address sees exactly
what the world sees — with a session-bearing client they would see their own
drafts on their public page, which is the one place they must not appear.

**Shaping is separate from fetching.** `src/lib/public-page/shape.ts` is a pure
`toPublicPage(row)`: ordering, what gets dropped, what a null column means. It
is unit-tested without a database, and Phase 4's live preview will shape editor
state through the same function — which is what stops the preview and the
published page from disagreeing. It filters unpublished rows itself rather than
trusting its caller, because the preview will hand it unfiltered state.

**Ordering is deterministic.** `position ASC`, then `created_at`, then `id`.
`position` is not unique — mid-reorder two rows share one — and without the last
two steps the same page can come back in a different order on two requests.

**Nothing renders arbitrary HTML.** Block `data` is untrusted JSON. It goes
through a zod registry in `src/lib/public-page/blocks.ts`, and a block whose
type is unknown or whose data fails its schema is dropped rather than rendered
as a fallback. There is no `dangerouslySetInnerHTML` anywhere in
`src/components/public/`. Two block types exist today, `text` and `divider` —
the point of this phase is the registry, not the catalogue.

**URLs are checked twice more than they need to be.** The database has a CHECK
constraint on the scheme and every write goes through `urlSchema`, so a
`javascript:` href should be impossible — `toPublicPage` drops one anyway,
because "impossible" is a claim about today's code and this one renders an
`href`. Avatars are narrower still: `renderableAvatarUrl()` accepts only an
`https` URL on the Supabase storage host, so a creator cannot point the page's
one `<img>` at an arbitrary server.

**No client JavaScript of its own.** No component under
`src/components/public/` is a Client Component. The page ships the Next.js
runtime and nothing else.

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

**No `robots` directive in the root layout.** An absent one already means index
and follow, so declaring it bought nothing — and on a 404 it was actively wrong.
Next.js emits its own `noindex` for a not-found render and then appends the
layout's metadata after it, so `/nope` went out with two contradictory `robots`
tags. Routes that must not be indexed declare it themselves; `robots.txt` covers
the crawl rules.

**The reserved list is duplicated on purpose.** `src/lib/validation/reserved.ts`
gives instant feedback while someone types; `reserved_usernames` is what
actually holds the line, and it is a table so names can be added without a
deploy.

**Analytics has no insert policy.** Not an oversight — an anonymous insert
policy would let anyone forge a creator's traffic. Ingestion is server-side with
the service-role key, in phase 6.

**The public page is cached for sixty seconds, and the route is prerenderable.**
`export const revalidate = 60` alone did nothing: Next.js treats a dynamic
segment as fully dynamic and re-renders it on every request, and the route went
out with `private, no-cache, no-store`. Adding `generateStaticParams()` returning
an empty list is what makes the segment prerenderable — "build nothing now,
cache what you render" — after which it serves
`s-maxage=60, stale-while-revalidate` and `x-nextjs-cache: HIT`. Sixty seconds
is only the ceiling; `revalidatePublicPage()` drops an entry immediately, and
Phase 4 calls it after every edit.

**The proxy skips the public page.** Refreshing a Supabase session on a route
that never reads one costs a round trip on the request that most needs to be
fast. `needsSession()` limits the proxy's work to the landing page and the
signed-in routes; `/<username>` returns before any Supabase client is built.

**Cache Components is off.** Next.js 16 ships it opt-in, and it changes caching
semantics across the whole app — including removing `revalidate`, which the
public page depends on. Turning it on is a migration, not a flag, and it belongs
to the phase that has a reason to want it.

**Nothing sets cache headers to defeat the Back button.** It was tried. A
`cache-control` set in the proxy is replaced by the one Next.js writes when it
renders, so the header never reached the browser — protection that looked real
and was not. It is also unnecessary: every dynamically rendered response leaves
production with `private, no-cache, no-store, max-age=0, must-revalidate`, and
`no-store` is exactly what keeps a page out of the back-forward cache.

**A database failure on a public page is a 500, not a 404.** The two are
indistinguishable to the code that fetches a profile and very distinguishable to
a search engine: a page that 404s while the database is down gets de-indexed,
where a 500 is retried. `getPublicPage` returns null only for a name nobody has
claimed, and throws `PublicPageError` otherwise.

**Profiles are readable by anyone, including anonymously.** The public page has
to render for a logged-out visitor, and the table holds only what a creator
chose to publish. The cost is that the full list of usernames is enumerable
through the anon key — as it already is by visiting URLs. Nothing private lives
there; email is in `auth.users`, which is not exposed.

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

The editor and drag and drop, themes, custom fonts and backgrounds, the rich
block types, analytics of any kind — no page views, no link clicks, nothing is
recorded when somebody opens a page — QR codes, monetization, Stripe, AI, and
sharing. All later phases. The schema and the policies for them are already in
place, which is the point.
