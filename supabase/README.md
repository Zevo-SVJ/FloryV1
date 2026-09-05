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

## The learning system

Added by `20260906000000_learning_system.sql`, seeded by `…000001_learning_seed.sql`.

| Table | Notes |
|---|---|
| `phases` | Keyed on the same strings as `src/lib/lock/phases.ts`. Seeded, permanent |
| `modules` | Belong to a phase, ordered within it |
| `lessons` | `blocks` is JSONB; `completion_rule` decides what finishing means |
| `lesson_prerequisites` | Lesson B requires Lesson A. Cannot require itself |
| `lesson_resources` | External material. `why` is required — "watch this" is not teaching |
| `learner_lesson_progress` | Status, reading position, confidence. One row per learner per lesson |
| `learner_block_responses` | One per interactive block. `is_correct` is computed, never written by a client |
| `learner_lesson_notes` | Private, including from staff |

Two functions own what a learner must not write: `record_block_response()`
grades an answer from the lesson's own content, and `complete_lesson()` refuses
a completion the lesson's rule has not earned. Neither table grants a client the
write that would bypass them. `supabase/tests/03_learning.sql` tries both
forgeries and asserts they fail.

Notes are private from staff by policy. A note is thinking out loud, and a
learner who knows a mentor reads it writes a different note; submitted work is a
separate thing and belongs to Prompt 4.

### Adding a lesson

```sql
insert into public.modules (phase_key, slug, title, position, published)
values ('think', 'first-module', 'Finding a problem', 1, true);

insert into public.lessons (module_id, slug, title, summary, type,
                            estimated_minutes, completion_rule, position,
                            published, blocks)
values ((select id from public.modules where slug = 'first-module'),
        'what-makes-a-problem-worth-solving', 'What makes a problem worth solving',
        'One sentence.', 'concept', 12, 'decision', 1, true,
        '[{"kind":"text","id":"intro","text":"…"}]'::jsonb);
```

Block shapes are defined in `src/lib/learning/blocks.ts`. Anything the schema
there rejects is dropped at render time and counted on the page, so validate
new content by opening the lesson.

## Missions and the workspace

Added by `20260907000000_missions_workspace.sql`, seeded by `…000001_missions_seed.sql`.

| Table | Notes |
|---|---|
| `projects` | The learner's product. One per learner in practice |
| `missions` | Content, like lessons. `blocks` reuses the lesson vocabulary |
| `mission_prerequisites` | Mission B requires Mission A |
| `artifacts` | What the learner produced. `status` is not client-writable |
| `evidence` | Proof, one row per piece. Link kinds refused without a URL |
| `artifact_feedback` | Read policy only — Prompt 6 adds the insert |
| `learner_mission_progress` | Status and reflection, one row per learner per mission |
| `build_log_entries` | Written automatically on submit and complete, plus the learner's own |

`submit_artifact()` and `complete_mission()` own every transition a learner must
not make for themselves, and write the build log in the same transaction.
`supabase/tests/04_missions.sql` tries each shortcut and asserts it fails.

## The Toolbox

Added by `20260908000000_toolbox.sql`, seeded by `…000001_toolbox_seed.sql`.

| Table | Notes |
|---|---|
| `toolbox_items` | All six kinds. `body` JSONB, `search` a generated tsvector |
| `lesson_toolbox_items` / `mission_toolbox_items` | "Tools for this step" |
| `toolbox_item_links` | Curated "use it with" relationships |
| `learner_saved_items` | Private, including from staff |
| `learner_recent_items` | One row per item, time replaced on each view |
| `learner_checklist_progress` | An array of ticked ids, keyed on the body's item ids |

No client holds a write on `toolbox_items` at any role. Content is authored with
SQL:

```sql
insert into public.toolbox_items (kind, slug, title, summary, phase_key, tags, published, body)
values ('prompt', 'name-it', 'Name it', 'One line that stands alone in a search result.',
        'think', '{tag}', true,
        '{"whatItDoes":"…","whenToUse":"…","prompt":"…","howToUse":"…",
          "expectedOutput":"…","commonMistake":"…"}'::jsonb);

-- Surface it where it is needed:
insert into public.mission_toolbox_items (mission_id, item_id, position)
values ('<mission uuid>', (select id from public.toolbox_items where slug = 'name-it'), 0);
```

Body shapes are in `src/lib/toolbox/schemas.ts`. Anything the schema rejects
renders as unreadable rather than half-rendering, so validate new content by
opening the item.

## The mentor layer

Added by `20260909000000_mentor_admin.sql`.

| Table | Notes |
|---|---|
| `learner_mentor_relationships` | Who may review whom. `can_review()` reads it |
| `mentor_notes` | Private. No learner-facing policy exists |
| `mentor_questions` | Attached to a mission/artifact/project. `answer_question()` writes the response |
| `notifications` | Four kinds, written in the same transaction as the event |
| `artifact_feedback` | Extended with the four structured fields and a category |

`review_artifact()` is the only path that approves work, and it refuses a caller
who is not staff, not assigned to that learner, or reviewing their own artifact.
`missions.requires_review` makes `complete_mission()` wait for that verdict.

**`can_review()` replaced `is_staff()` in every learner-data policy.** A mentor
now reads only the learners paired with them; an admin reads everything. Pair
them with:

```sql
insert into public.learner_mentor_relationships (learner_id, mentor_id)
values ('<learner uuid>', '<mentor uuid>');
```

`supabase/tests/06_mentor.sql` attempts every shortcut the brief names: a
learner approving their own work, marking it final, forging feedback, altering a
review, answering their own question, and reading mentor notes.

## Progress, skills, milestones and XP

Added by `20260910000000_progress_skills.sql`, seeded by
`20260910000001_progress_seed.sql`.

| Table | Notes |
|---|---|
| `skills` | 23 founder capabilities in 6 areas. Definitions, read-only to clients |
| `lesson_skills` | Which skills a lesson introduces |
| `mission_skills` | Which a mission practises. `is_primary` marks the one it is about |
| `skill_evidence` | Append-only. Written only by `record_skill_evidence()` |
| `milestones` | 15 definitions. `kind` is `milestone` or `achievement` |
| `learner_milestones` | Earned, once, permanently. No update or delete policy |
| `xp_rules` | One row per event kind, with the amount and the reasoning |
| `xp_events` | The ledger. Unique on (learner, kind, subject) — no duplicate awards |

| View (all `security_invoker`) | Answers |
|---|---|
| `learner_skill_states` | Every published skill, and the state its evidence justifies |
| `learner_xp_totals` | `sum(amount)` over the ledger |
| `learner_module_progress` | Completed published lessons over published lessons |
| `learner_phase_progress` | Weighted: a lesson is 1, a mission is 3 |
| `learner_overall_progress` | The same rule, summed across every phase |
| `learner_activity` | Build log ∪ lesson completions ∪ milestones earned |
| `learner_streak` | Consecutive active days. Yesterday still counts |

**No table stores a percentage.** Every figure above is computed on read. The
three tables that are written are append-only records of things that happened.

**No client may write any of them.** `xp_events`, `skill_evidence` and
`learner_milestones` have no insert, update or delete grant for `authenticated`
at any role. `award_xp()`, `record_skill_evidence()` and `evaluate_milestones()`
have no `execute` grant either — they are called from inside the domain
functions, which run as the owner.

`award_milestone()` is the one exception and the only progress function a client
may call. It exists for FIRST USER, FIRST PAYMENT and FOUNDER, which LOCK
genuinely cannot observe. It refuses a caller who is not staff, one acting on
their own account, and one not assigned to that learner.

`complete_lesson()`, `complete_mission()`, `submit_artifact()` and
`review_artifact()` were replaced to award progress in the same transaction as
the event. `projects` gained an `after insert` trigger for the same reason.

`supabase/tests/07_progress.sql` covers all fifteen behaviours the brief names,
including every attempt a learner could make to award themselves something.

## Content lifecycle

`content_status` — `draft` → `review` → `published` → `archived` — on `phases`,
`modules`, `lessons`, `missions`, `toolbox_items`, `skills` and `milestones`.

**`status` is authoritative; `published` is now a generated column** computed as
`status = 'published'`. Every policy and function written before Prompt 7 still
reads `published` and still works. Writing `published` directly is refused by
the database rather than silently ignored.

```sql
-- Author content like this from now on.
insert into public.lessons (module_id, slug, title, position, status, blocks)
values ('<module uuid>', 'my-lesson', 'My lesson', 1, 'draft', '[]'::jsonb);

-- Release it.
update public.lessons set status = 'published' where slug = 'my-lesson';
```

`lessons` and `missions` also carry `content_version` and `published_at`.
Neither forks content: progress keys on the stable `id`, so editing or archiving
a lesson never erases somebody's completion.

## Column privileges

Added by `20260911000000_grant_hardening.sql`, after an audit found three
exploitable holes.

**The rule: an insert grant names its columns.** `grant insert on <table>` hands
over every column; `grant insert (a, b, c) on <table>` is what was meant
everywhere it appeared. Three tables were exploitable through the difference —
a learner could insert an artifact that was already `approved`, a mission
already `completed`, and a question with their mentor's answer already in it.

RLS was correct throughout and did not help: each forgery is a row the learner
legitimately owns. **RLS decides which rows; column privileges decide which
columns.** Both are needed.

The columns that carry authority, and must never be client-writable:

| Table | Columns |
|---|---|
| `profiles` | `role` |
| `artifacts` | `status`, `submitted_at` |
| `learner_mission_progress` | `status`, `completed_at`, `submitted_at` |
| `learner_lesson_progress` | `status`, `completed_at` |
| `learner_block_responses` | `is_correct`, `attempts` |
| `mentor_questions` | `response`, `answered_at`, `status`, `mentor_id` |
| `build_log_entries` | `is_automatic` |
| `artifact_feedback` | `status`, `reviewer_id` |
| `xp_events` | `amount`, `kind` |
| `learner_milestones` | `earned_at`, `awarded_by` |
| `skill_evidence` | `kind` |

`supabase/tests/08_grants.sql` attempts each forgery, asserts the honest paths
still work, and asserts the table above as a rule. Restoring the original grant
makes it fail, so the test is proven rather than vacuous.

The same migration adds five indexes — the ones where a query in `src/lib`
filters on a column no existing index leads with. Twenty-nine foreign keys lack
a leading index; the other twenty-four are covered by composite primary keys or
are not filtered on alone, and indexing them would be cost without a reader.

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
