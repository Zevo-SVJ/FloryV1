# LOCK

A private program for building real SaaS products with AI.

LOCK is not a course platform and not a Claude Code tutorial. It is the
structure around one claim: **you are the founder, the tools are the execution
layer**, and the work is to think, decide, direct, build, verify, ship and
operate. The program runs in ten phases —

`THINK → RESEARCH → VALIDATE → PRODUCT → DESIGN → BUILD → TEST → SHIP → MONETIZE → GROW`

— and the platform exists to carry a learner through them with lessons,
missions, deliverables, artifacts and mentor feedback.

**The platform is complete.** Every system below is built, wired to the others
and tested: accounts and roles, the learning engine, missions and the workspace,
artifacts and evidence, the mentor review loop, the toolbox, and progress with
skills, milestones and XP. There are no placeholder pages and no dead links.

**The curriculum is not written yet**, and that is the only thing left. The
content architecture is finished and seeded with its vocabulary — ten phases,
twenty-three skills, fifteen milestones — waiting for lessons and missions to be
authored into it. See [Adding curriculum content](#adding-curriculum-content).
Nothing in the platform needs to change to accept them.

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
    states/                empty, error, forbidden, state-block
    learning/              the block renderer and the lesson controls
    workspace/             the mission workspace, artifacts, evidence, build log
    mentor/                review form, feedback history, ask-your-mentor
    progress/              skills, awards, activity, phase progress
    toolbox/               item cards, bodies, category and search controls
    auth/  account/        feature components, named for their feature
  lib/
    auth/                  routes (policy), dal (reads), actions (writes)
    supabase/              client / server / proxy — one file per environment
    lock/                  the product's own model: phases, roadmap, navigation
    learning/  workspace/  mentor/  progress/  toolbox/
                           one folder per system: queries, actions, labels
    validation/            Zod schemas, shared by forms and actions
    security/              rate limiting and the Content-Security-Policy
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

## Adding curriculum content

Everything below is authored with SQL, in a migration. There is no CMS, and that
is a decision rather than a gap: content is version-controlled, reviewable in a
diff, and deployed the same way the schema is.

**The one rule:** set `status`, never `published`. `published` is a generated
column computed from `status`, so writing it directly is refused by the
database. Statuses are `draft` → `review` → `published` → `archived`, and a
learner sees only `published`.

A phase already exists as a row for each of the ten. To fill one in:

```sql
-- 1. A module inside the phase.
insert into public.modules (phase_key, slug, title, summary, position, status)
values ('validate', 'talking-to-people', 'Talking to people',
        'How to run a conversation that produces evidence.', 1, 'draft');

-- 2. Lessons inside the module. `blocks` is the JSONB array the renderer
--    parses — 22 block kinds, defined in src/lib/learning/blocks.ts.
insert into public.lessons
  (module_id, slug, title, summary, type, difficulty, estimated_minutes,
   objectives, completion_rule, position, status, blocks)
values (
  (select id from public.modules where slug = 'talking-to-people'),
  'the-mom-test', 'The Mom Test', 'Asking questions that cannot be answered politely.',
  'concept', 'foundational', 18,
  array['Ask about the past rather than the future'],
  'decision', 1, 'draft',
  '[{"id":"h1","kind":"heading","text":"Why most questions fail"}]'::jsonb
);

-- 3. Relationships. None of this duplicates content — the same skill,
--    prompt or resource is stored once and referenced.
insert into public.lesson_skills (lesson_id, skill_key) values (…, 'validation');
insert into public.lesson_prerequisites (lesson_id, requires_lesson_id) values (…, …);
insert into public.lesson_resources (lesson_id, kind, title, url, why, position) values (…);
insert into public.lesson_toolbox_items (lesson_id, item_id, position) values (…);

-- 4. The mission that applies the lesson, and what proves it was done.
insert into public.missions
  (phase_key, module_id, lesson_id, requires_lesson_id, slug, title, type,
   objective, why_it_matters, deliverable_title, deliverable_description,
   required_evidence, requires_reflection, requires_review, position, status, blocks)
values ('validate', …, …, …, 'run-five-conversations', 'Run five conversations',
        'research', 'Leave with five conversations and one thing you were wrong about.',
        'Opinions are not evidence.', 'Conversation Notes',
        'Five write-ups, one per person.', '{note}', true, true, 1, 'draft', '[]'::jsonb);

insert into public.mission_skills (mission_id, skill_key, is_primary) values (…, 'validation', true);

-- 5. Toolbox items — prompts, frameworks, templates, checklists, stack entries.
insert into public.toolbox_items (kind, slug, title, summary, phase_key, tags, status, body)
values ('prompt', 'interview-script', 'Interview script', '…', 'validate',
        '{research}', 'draft', '{…}'::jsonb);

-- 6. Release it. Nothing else changes.
update public.lessons  set status = 'published' where slug = 'the-mom-test';
update public.missions set status = 'published' where slug = 'run-five-conversations';
```

Skills (23) and milestones (15) are already seeded, so a lesson written today has
something to link to. Adding a skill or a milestone is one row in `public.skills`
or `public.milestones` — milestone requirements are a closed set of
deterministic predicates, listed in `supabase/README.md`.

**Editing published content is safe.** Progress rows key on the stable `id`, so
correcting a lesson never erases somebody's completion, and archiving one keeps
both the completion and the skill evidence it produced. `content_version` and
`published_at` record that the lesson somebody finished is not the lesson on
screen today.

## Architecture and decisions

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — every system, and the reasoning behind
  each decision, including what was deliberately *not* built.
- **[supabase/README.md](supabase/README.md)** — the schema, the security model,
  and the table-by-table reference.
- **[SETUP.md](SETUP.md)** — Supabase and deployment setup, step by step.
