# LOCK

A private program for building real SaaS products with AI.

LOCK is not a course platform and not a Claude Code tutorial. It is the
structure around one claim: **you are the founder, the tools are the execution
layer**, and the work is to think, decide, direct, build, verify, ship and
operate. The program runs in ten phases —

`THINK → RESEARCH → VALIDATE → PRODUCT → DESIGN → BUILD → TEST → SHIP → MONETIZE → GROW`

— and the platform exists to carry a learner through them with lessons,
missions, deliverables, artifacts and mentor feedback.

**This repository is at Foundation.** The shell, the accounts, the roles and the
security boundaries are built and tested. The sections are routed and empty, and
each one says which prompt fills it in. Nothing here pretends to work.

---

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, React 19, Server Components) |
| Language | TypeScript, `strict` with `noUncheckedIndexedAccess` |
| Styling | Tailwind CSS v4, CSS-first tokens in `src/app/globals.css` |
| Data | Supabase — PostgreSQL, Auth, Row Level Security |
| Validation | Zod |
| Tests | Node's own test runner; `psql` for the database suite |
| Hosting | Vercel-compatible; nothing depends on Vercel |

Requires **Node 20.9+** (`npm install` refuses anything older).

## Commands

```bash
npm install
npm run dev         # development server on :3000
npm run build       # production build
npm start           # serve the production build

npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # unit tests (Node test runner)
npm run test:db     # Row Level Security suite — needs PostgreSQL 16+ and psql
npm run check       # typecheck + lint + test + build
```

`npm run check` is what "does this still work" means here. `npm run test:db` is
separate because it needs a database; run it after touching anything under
`supabase/`.

## Getting it running

1. `npm install`
2. `cp .env.example .env.local` and fill in the two Supabase values
3. Apply `supabase/migrations/` to your project
4. `npm run dev`

The full walkthrough — creating the project, applying the migration, promoting
an account to mentor or admin, closing signups — is in **[SETUP.md](SETUP.md)**.

Without `.env.local` the app still starts. The entry page says it has no
database rather than failing with a stack trace, which is deliberate: the first
thing a new clone does is run, and the first thing it should say is what is
missing.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Anon key. Safe in the browser — it grants only what RLS allows |
| `NEXT_PUBLIC_SITE_URL` | on deployments | Canonical origin, used for auth redirects. Falls back to `VERCEL_URL`, then localhost |

There is deliberately **no service-role key** in this codebase. See
[ARCHITECTURE.md](ARCHITECTURE.md#no-service-role-key).

## Folder structure

```
src/
  app/                     routes only — a page is a thin shell over lib/
    (auth)/                sign in, sign up — its own centred layout
    (app)/                 everything behind a session: the shell + sections
    auth/callback/         PKCE code exchange for email confirmation links
    globals.css            the design tokens. The whole design system is here
  components/
    ui/                    primitives: button, field, surface, skeleton,
                           spinner, avatar, page-header, progress-bar
    layout/                the shell: wordmark, nav-list, mobile-nav, account
    lock/                  product components: the roadmap
    states/                loading, error, empty, forbidden, not-built-yet
    auth/  account/        feature components, named for their feature
  lib/
    auth/                  routes (policy), dal (reads), actions (writes)
    supabase/              client / server / proxy — one file per environment
    lock/                  the product's own model: phases, sections, access
    validation/            Zod schemas, shared by forms and actions
    security/              rate limiting
    utils/                 cn
  types/database.ts        the schema, in TypeScript
  proxy.ts                 session refresh before every render
supabase/
  migrations/              the schema, in order
  tests/                   the RLS suite, run against real PostgreSQL
scripts/                   the test runner and its `@/*` alias hook
```

Two conventions worth knowing before adding to it:

- **Business logic lives in `lib/`, not in `app/`.** A route file reads a
  session, calls into `lib/`, and renders. That is what makes any of it
  testable — `app/` is the one place the Node test runner cannot reach.
- **A section is declared once**, in `src/lib/lock/navigation.ts`. That nested
  list drives the sidebar, the mobile drawer, the route protection and the role
  gating; the flat `SECTIONS` view and `PROTECTED_ROOTS` are derived from it.
  Adding a page is an entry there plus a `page.tsx`.
- **Pages render content, never chrome.** The shell owns the padding, the
  content measure and the navigation. A page starts with `<PageHeader>` and a
  `space-y-*` stack — it never sets its own page margins.

## Architecture and decisions

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — the decisions taken at Foundation and
  the reasoning behind each, including what was deliberately *not* built.
- **[supabase/README.md](supabase/README.md)** — the schema, the security model,
  and how the tables that do not exist yet are expected to relate.
- **[SETUP.md](SETUP.md)** — Supabase and deployment setup, step by step.

## What comes next

Foundation is Prompt 1 of nine. The rest, in order: platform UI/UX, the learning
engine, missions and artifacts, the toolbox, mentor and admin, progress, the
content system, then QA and production. The curriculum itself is designed
separately, before the content phases — none of it is invented here.
