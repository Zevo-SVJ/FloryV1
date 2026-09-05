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

### Two ways in, one exchange

Google and email/password both end at `/auth/callback` with a `code` to trade
for a session. One route serves both, because they *are* the same exchange, and
a second would be a second place for the redirect allowlist and the `next`
handling to drift apart.

`signInWithGoogle` is a Server Action rather than an `onClick`, and that is
structural: `signInWithOAuth` writes the PKCE code verifier into a cookie as a
side effect of building the authorization URL. A Server Action can set cookies;
a Server Component cannot. It also means the sign-in needs no Supabase client in
the browser and starts working before JavaScript has loaded.

`skipBrowserRedirect: true` because there is no browser in a Server Action to
redirect — we take `data.url` and issue the redirect ourselves. The `redirect()`
call sits outside any `try`/`catch`: it works by throwing, and a catch would
swallow the navigation and report it as a failure.

`prompt: select_account` is passed to Google on every attempt. Without it Google
silently reuses whichever account the browser used last, which on a shared
machine — or for anybody with a work and a personal address — signs you in as
the wrong person with nothing to notice.

### A provider's error text is never rendered

An OAuth failure comes back as `error`, `error_code` and `error_description` on
the redirect URI, all written by somebody else's server.
`lib/auth/auth-errors.ts` maps them to one of seven fixed keys, the key travels
in the redirect, and the sign-in page looks the sentence up. React would escape
the raw string safely enough, but "safe to render" is not "ours to say" — a
provider's prose in our typography reads as our copy. Anything unrecognised
becomes `unknown` and still says something, because a silent bounce back to an
unchanged form is the state people retry forever.

### Email confirmation is off, deliberately

LOCK has no SMTP provider, so the only sender is Supabase's shared one: a couple
of messages an hour, routinely undelivered. Leaving confirmation on would mean
accounts that exist and cannot be reached, with no path through from the app.

Confirmation proves that whoever typed an address controls it, which matters
when strangers can sign up. Here the accounts are made by the person who owns
the project and signups close the moment they exist, so the property being
bought is one LOCK does not need yet. When it does need real email — password
resets, invitations — the answer is SMTP, and confirmation goes back on in the
same change.

The code does not assume the setting. If `signUp` returns a user with no
session, the form says exactly which switch is on and where to find it, rather
than claiming to have sent something.

### Roles are untouched by any of this

Google supplies an identity. The database supplies the role. The signup trigger
reads a *name* from `raw_user_meta_data` — now `display_name`, `full_name` or
`name`, so a Google account arrives with the name Google already knew — and
still never reads a role from it. That field is a browser's `options.data` on a
password signup and a provider's claims on a social one; neither is a source of
authorization. There is a database assertion for the OAuth shape of that attack
alongside the original one.

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

## The application shell

One layout, `app/(app)/layout.tsx`, wraps every authenticated route. It does two
things and nothing else: insists on a session and a profile, then draws the
frame. Pages inside it render content and never their own chrome or their own
page padding — that is what keeps twenty-four routes from looking like
twenty-four templates.

Above `lg` the sidebar is `sticky` with its own `h-dvh`, beside a normally
scrolling document. The first attempt made the *grid* `h-dvh` with
`overflow-hidden`, which clipped: a single implicit grid row is sized `auto`, so
it grew past the container and cut the last navigation group off the bottom of
the screen with no way to scroll to it. Putting the height on the element that
needs it leaves the page's own scrollbar to the content and cannot clip.

`min-w-0` on `main` is load-bearing. A grid item's default minimum width is its
content, so without it one wide table in one child page pushes the whole
document sideways.

## Navigation

`lib/lock/navigation.ts` is the single source of truth for the sidebar, the
mobile drawer, the session boundary and the role gates. Foundation held a flat
list; the product has groups, so the list is now nested and the flat `SECTIONS`
view is **derived** from it rather than maintained beside it.

`PROTECTED_ROOTS` is derived too — the first path segment of every item — so
`/learn` covers `/learn/lessons` and anything added under it later. A new child
page cannot end up outside the session boundary because somebody forgot to list
it. There is a test asserting exactly that.

`sectionAt` matches longest-first, which is what makes `/learn/lessons`
highlight Lessons rather than the Roadmap at `/learn`.

**One change to Foundation's routes.** `/mentor` was the staff review queue; the
product needs that path for the learner's own mentor page ("Your Mentor, Zevo").
The queue moved to `/review` rather than losing its gate — a mentor still has
somewhere only a mentor can go, and `/admin` is still admin-only.

Grouping prefixes that are not pages (`/toolbox`, `/progress`, `/resources`)
redirect to their first child. Nobody arrives there by clicking, but people
type URLs and keep stale bookmarks, and a 404 on a path the product plainly owns
reads as a broken application.

## Mobile navigation

Not a compressed sidebar. A 15rem column on a 375px screen leaves nothing for
the content, and a horizontally scrolling strip of twenty-one links across seven
groups loses the grouping that makes the product legible. The same `NavList` —
same configuration, same component — moves into a drawer.

Written by hand rather than pulled from a library, and each thing a library
would have supplied is there deliberately: Escape closes it, focus moves into
the panel on open and back to the trigger on close, the page behind does not
scroll, following a link closes it, and the closed panel is `inert` so it is out
of the tab order. There is no focus *trap*: that needs a full tab-cycle
implementation, and the honest trade is to say so rather than ship a broken one.

The drawer closes on a route change by adjusting state during render against the
previous pathname, not in an effect. An effect would paint the drawer over the
new page for one frame before closing it.

## Theme

**Both modes work. Before this prompt, neither did — only dark.**

`globals.css` defined the dark palette in a second `@theme` block inside
`@media (prefers-color-scheme: dark)`. Tailwind v4 hoists every `@theme` to
`:root` regardless of the at-rule wrapping it, so those variables were emitted
unconditionally and, being second, won everywhere. The light palette had never
once rendered. Found by asserting the computed value of `--color-canvas` in a
real browser under an emulated light preference, which is the only way this kind
of fault shows up — it looks intentional.

The fix: `@theme` defines the light palette, and the dark values are plain
custom properties on `:root` inside the media query. Utilities reference
`var(--color-*)`, so redefining the variables is all that is needed. A manual
toggle can be layered on later by repeating those declarations under
`:root[data-theme="dark"]`, without touching a component.

## Honest empty states

Most of LOCK is routed and empty, and how it says so is a product decision. Every
`planned` page renders a real page header in the same position as every other
page, the section's own words, and one calm sentence about what will appear and
which prompt supplies it. `EmptyState` uses a dashed border: a space reserved
for something, not a thing that is finished.

The dashboard draws all seven blocks it will eventually carry — current phase,
next action, progress, roadmap, my SaaS, recent activity, milestones — and every
one reports that it has no data. `ProgressBar` accepts `value={null}` and renders
an empty track with `aria-valuetext="Not tracked yet"` rather than a zero that
looks like a measurement.

`buildRoadmap(null)` marks every phase `upcoming`. It does **not** mark phase one
as current: nobody has started anything, and a product that decides on your
behalf that you are mid-way through Think is a product that lies in its first
sentence. Prompt 3 passes real progress and nothing else changes.

## The learning system

`Phase → Module → Lesson → blocks`. Content and learner state are separate
trees: phases, modules and lessons have no owner and one copy; what a learner
did hangs off `profiles`. Mixing them — a lesson row per learner — is the
mistake that makes editing content rewrite history.

### Blocks are JSONB, deliberately

A `lesson_content_blocks` table was the obvious alternative and buys nothing
here. Blocks are always read together and written together, their order is the
array's order rather than a column that can disagree with itself, and each type
has a different shape — so the table would carry a JSONB payload column anyway,
plus a position column to keep in step. Adding a block type would become a
migration instead of a TypeScript change.

What JSONB costs is validation, paid once: `lib/learning/blocks.ts` is a Zod
discriminated union that produces the TypeScript type, and every lesson is
parsed through `parseBlocks` on the way out of the database. A malformed block
is dropped and counted rather than thrown — one bad callout should cost that
callout, not the whole lesson — and the count is shown on the page.

The database enforces one thing about the JSON: every block has a stable `id`
and a `kind`. Responses are keyed on the id, so a block that lost one would
orphan somebody's answer.

**Adding a block type**: a schema in `lib/learning/blocks.ts`, a case in
`components/learning/content-renderer.tsx`, a component. No migration. The
renderer's `default` branch assigns to `never`, so a forgotten case is a compile
error rather than a blank space.

### Two things a learner must not write for themselves

A learner holds the `authenticated` role, so anything they may INSERT they may
also forge. If "this answer was correct" and "this lesson is complete" were
ordinary columns with an update grant, completion would be a POST request.

Both live in `security definer` functions and the tables grant no direct write:

- `record_block_response()` reads the block out of the lesson, grades it, and
  writes the row. `is_correct` is computed, never accepted.
- `complete_lesson()` reads the lesson's `completion_rule` and refuses unless it
  is satisfied — every graded block correct, or a decision recorded, or a
  reflection with something in it. `practical` raises rather than passing
  quietly, because missions do not exist yet and nothing can honestly verify it.

There are database assertions for both forgery attempts.

### Commit before reveal

Explanations, recommended options and analyses are not in the document until a
response exists. This is enforced in `content-renderer.tsx`, on the server: the
reveal is built there and passed to the Client Component as an already rendered
node, null until the learner has answered.

That shape is a fix, not a preference. The first version passed the whole block
object to the client, and a Client Component's props are serialized into the
page — so every explanation and every `correct` array sat in the HTML of a
lesson nobody had answered. It was found by asserting the absence of four reveal
strings in the page source in a real browser.

What this does **not** guarantee: `lessons.blocks` is still readable through the
API by any signed-in account. Closing that needs the graded fields split out of
the row, and it is a deliberate deferral — casual leakage was what was worth
fixing for a private tool whose learner is the person it is for.

### Progress, and what it refuses to claim

`deriveRoadmapProgress` has one rule worth knowing: **a phase with no published
lessons is never complete**. Without it, every phase of an unwritten curriculum
would render as finished on day one. A phase becomes "current" only once
something in it is done — an untouched phase is ahead of you, not under your
feet.

`remainingMinutes` returns null rather than a confident zero when nothing is
published.

### Shared constants and the server boundary

`lib/learning/labels.ts` exists because a client control importing one label
from `queries.ts` dragged the whole `server-only` data access layer into the
browser bundle. TypeScript cannot see that; the production build can, and did.
A constant shared across the boundary belongs in a module that imports from
neither side.

### Demo content

Two seeded lessons carry `is_demo`. They exist so the renderer, grading,
prerequisites and completion can be exercised before the curriculum exists, and
they are removed with `delete from public.lessons where is_demo;`.

## Missions and the workspace

```
PHASE → MODULE → LESSON → MISSION → ARTIFACT → EVIDENCE → REVIEW
```

**Deliverable and artifact are different words on purpose.** A deliverable is
what a mission asks for — content, authored with the mission, in columns on
`missions`. An artifact is what the learner produced — a row they own. One
table each would have been two near-identical tables.

### The same three guarantees as the learning system

A learner holds `authenticated`, so a status column they could write is one they
could forge. `submit_artifact()` and `complete_mission()` own the transitions
and the tables grant no update on `status` or `submitted_at`.

- **Submission** requires something in the work, and every kind of evidence the
  mission demands. A SHIP mission asking for a deployment URL cannot be
  submitted with an empty box and good intentions.
- **Completion** requires a submitted deliverable, plus a reflection where the
  mission asks for one.
- **The build log writes itself** inside the same transaction, so the record
  cannot drift from what happened.

There are database assertions for each shortcut: submitting nothing, submitting
with half the required evidence, completing without submitting, completing
without the reflection.

### Evidence

The point is one sentence: a checkbox saying "done" is not evidence. `evidence`
is a row per piece, not a column per kind, because a BUILD mission wants a
repository *and* a pull request. Everything except `note` is refused without a
URL, and a `note` under ten characters is refused too.

`missions.required_evidence` is a `evidence_kind[]`. Setting it to
`'{repository,deployment}'` makes `submit_artifact()` start enforcing it with no
code change — which is how BUILD and SHIP missions will differ from THINK ones.

GitHub is represented as evidence kinds (`repository`, `commit`,
`pull_request`), not an OAuth integration. GitHub stays the source of truth for
the code; LOCK records the link.

### Locking, and how little of it there is

A mission is locked only by an unfinished prerequisite mission or an unfinished
`requires_lesson_id`. Deliberately not "everything before it in order": the
program is a sequence, but a learner reading ahead is not cheating, and a wall
in front of every mission would make LOCK a school rather than a workspace. A
locked mission still shows its objective and names exactly what to finish.

### Missions reuse the lesson renderer

`missions.blocks` is the same JSONB vocabulary as `lessons.blocks`, rendered by
the same `ContentRenderer`. Only presentational blocks belong there — a
mission's interactivity is the workspace beneath it, not a quiz inside it. This
is what building the renderer as a registry bought.

### One project, in the singular

The schema allows several projects per learner; the workspace is written around
one, because that is what the program is. The most recently touched wins if
there are ever two.

### What Prompt 6 plugs into

`artifact_feedback` exists with its table, its constraint that a verdict must be
a verdict, and a read policy — and **no insert policy**. The mentor experience
adds that policy along with the interface, rather than needing a migration and a
backfill. There is a test asserting a mentor cannot yet write feedback, and
another asserting a mentor cannot edit a learner's artifact: reviewing is
reading plus commenting, and a mentor who could edit would be doing the mission.

### Writing a mission

```sql
insert into public.missions (
  phase_key, lesson_id, requires_lesson_id, slug, title, type, objective,
  why_it_matters, deliverable_title, deliverable_description,
  required_evidence, requires_reflection, position, published, blocks
) values (
  'ship', '<lesson uuid>', '<lesson uuid>', 'ship-your-first-version',
  'Ship your first version', 'deploy',
  'Get it in front of somebody who is not you.',
  'A product nobody can open is a document.',
  'Ship Report', 'What you shipped, where it lives, and what broke.',
  '{deployment,repository}', true, 1, true,
  '[{"kind":"heading","id":"task","level":2,"text":"Your task"}]'::jsonb
);
```

## The Toolbox

Six kinds — prompt, framework, template, checklist, resource, stack note — in
**one table** with a `kind` and a JSONB body.

Six tables was the obvious alternative and is the wrong shape here. The six
share almost every column and differ only in a body that is prose either way.
Worse, three features cut across all of them: a unified search, saved items, and
links from lessons and missions. With six tables each becomes six joins or a
union; with one table each is a single index, a single foreign key, a single
join table. A seventh kind later is an enum value.

The cost is validation, paid the way Prompt 3 paid it for lesson blocks:
`lib/toolbox/schemas.ts` parses every body through Zod on the way out. A body
that fails renders "this item could not be read" rather than half an item — a
Toolbox entry that silently drops its *common mistake* section is worse than one
that admits it is broken.

### Every item has to answer the questions

The schemas make the answers required fields rather than conventions. A prompt
without `whenToUse` cannot be authored; a resource whose `why` is under twenty
characters is refused. "Watch this video" is filler; "watch 04:20–11:10 after
the research lesson, because it shows the technique used badly and then well" is
teaching. There are tests for both refusals.

### Search

A generated `tsvector` column, weighted title > summary > body, with a GIN
index. Generated rather than trigger-maintained so it cannot fall out of step
with the row.

Two things that cost an hour and are worth writing down. `to_tsvector('english',
…)` with a bare literal resolves to the overload that reads
`default_text_search_config` — a session setting, so it is only *stable* and
Postgres refuses it in a generated column; the fix is `'english'::regconfig`.
And `array_to_string` is `stable` too, so tags cannot be in the vector at all —
the honest options were a wrapper function declared immutable, which is a lie
the planner would believe, or leaving tags out. They are out, and filter through
their own GIN index instead, which is a better job for them than diluting a
ranking.

The search page is a **GET form**: the query lives in the URL, so a result set
is a link, the back button works, and it functions before JavaScript loads.

### Resources are a view, not a section

`/resources/videos`, `/docs` and `/references` read the same `toolbox_items`
table, narrowed by the body's own `resourceKind`. Not a second table and not a
second navigation config — which is what lets one search cover them and one save
button work everywhere.

### Contextual tools

`lesson_toolbox_items` and `mission_toolbox_items` exist so a learner never has
to work out which item from a growing library applies to the thing in front of
them. The curriculum states it; the lesson and mission pages render it.
Curated order is preserved in the query rather than left to the database.

### Platform content versus learner work

Stated in the migration and enforced by the grants: **no client holds a write on
`toolbox_items` at any role, including staff.** Authoring is SQL until Prompt 6
decides otherwise, and there is deliberately no action that pretends otherwise.

What the learner adds — saved items, recents, checklist ticks — is private *even
from staff*, unlike progress and artifacts which staff do read. Which boxes
somebody ticked is working behaviour, not submitted work, and a mentor reading
it would change it. Same argument as lesson notes.

### A checklist is not evidence

Said in the migration, in the action, and on the page. Ticking every box means
you stopped guessing about the cheap things; evidence is the artifact and its
links, and that lives in the workspace.

## The mentor layer

`LEARN → DO → SUBMIT → PROVE → REVIEW → IMPROVE → ADVANCE`.

### Why approval is separated from completion

A learner completing a mission does not mean they did it well. Those are two
different facts and only one of them is the learner's to assert. So completion
stays with the learner — the deliverable is submitted, the evidence is attached,
the reflection is written — and the verdict on quality belongs to a person who
did not do the work.

`missions.requires_review` decides which missions need that verdict.
`complete_mission()` refuses those until the artifact is `approved` or `final`.
Most missions leave it false: requiring a human on every one makes the mentor a
bottleneck and the learner passive, which is the opposite of the point.

### Nobody reviews their own work

`review_artifact()` is the only path that writes `approved` or `final` to an
artifact, and it checks four things: the caller is authenticated, the caller is
staff, the caller may review *that learner*, and the caller is not the learner.
The last is not redundant — an admin who is also building something would
otherwise pass the first three. There is a test that tries exactly that.

The learner's grant on `artifacts` still excludes `status` and `submitted_at`,
and `artifact_feedback` grants no insert to anybody. The database is the
guarantee; the interface is a convenience over it.

### Staff access was narrowed

Until this prompt `is_staff()` meant "may read every learner's work". With one
learner that was invisible; as a rule it is wrong. `can_review(learner_id)` now
gates every learner-owned table: your own rows, plus learners paired with you in
`learner_mentor_relationships`, plus everything for an admin. The Prompt 3 and 4
suites were updated to create a pairing, and each gained an assertion that an
*unassigned* mentor reads nothing.

### Reviews are append-only

A returned artifact that is later approved has two feedback rows, not one edited
row. "You submitted this twice before it was approved" is information about
somebody getting better, and a product that showed only the latest verdict would
delete it. No client holds update or delete on `artifact_feedback`.

### Feedback has a shape

Four fields — what works, what needs work, why it matters, next step — rather
than a comment box, because "looks good" teaches nothing and is what a comment
box invites. A `needs_work` verdict is refused by a check constraint unless the
last two say something. The action checks the same thing first, to produce a
sentence a mentor can act on rather than a constraint name.

### Mentor notes are private, and that is the point

No policy anywhere lets a learner select `mentor_notes`. A note somebody knows
is read is a note that stops being honest, and the honesty is its whole value.
There is a test asserting a learner sees zero notes *after* one exists about
them.

### Questions are not chat

`mentor_questions` attaches a question to the mission, artifact or project it is
about, and it is answered once. No presence, no threads, no typing indicators —
an interface that rewards fast back-and-forth produces a mentor who writes the
answer instead of the question that leads to it. `answer_question()` writes the
response, because there is no client grant on that column: a learner must not be
able to put words in their mentor's mouth.

### Notifications

Four kinds, each corresponding to something a person did. Written inside the
same transaction as the thing they describe, so a notification cannot exist for
an event that rolled back. `href` is constrained to start with `/` — a
notification is not a place to send somebody off the platform.

### Admin is a foundation, not a console

`/admin` shows who holds which role, who is paired with whom, and what is
published. It deliberately cannot edit content: a half-built CMS is worse than
none, because it invites people to use it for the things it cannot do. The SQL
for the two operations that matter is on the page rather than in a document
nobody opens.

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
