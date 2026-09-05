-- Close the insert grants, and index what the application actually queries
--
-- ── The defect ──────────────────────────────────────────────────────────────
--
-- Prompts 4, 5 and 6 wrote `grant insert on <table> to authenticated`. Column
-- privileges only constrain a statement when they are *column* privileges; a
-- table-wide grant hands over every column, including the ones those prompts
-- spent their entire design keeping out of a learner's reach. The TypeScript
-- `Insert` types have always described the narrow, intended shape — so the
-- application never wrote these columns, and nothing looked wrong.
--
-- Three of them were exploitable with a single POST, and were demonstrated
-- against a running instance before this migration was written:
--
--   1. `insert into artifacts (..., status) values (..., 'approved')`
--      A learner approved their own work. `complete_mission()` then let them
--      finish a mission that requires review, and `milestone_is_met(
--      'artifacts_approved')` turned true — so the forged row also paid out XP
--      and milestones. Every guarantee Prompt 6 documented about self-approval
--      was defeated here rather than in `review_artifact()`, which was never
--      called.
--
--   2. `insert into learner_mission_progress (..., status) values (..., 'completed')`
--      A mission marked complete with no artifact, no evidence and no
--      reflection, bypassing `complete_mission()` entirely.
--
--   3. `insert into mentor_questions (..., response, status) values (..., 'Yes, ship it.', 'answered')`
--      A learner writing their mentor's answer and reading it back as the
--      mentor's. ARCHITECTURE.md claimed this was impossible; it was not.
--
-- Row Level Security was never the missing piece and adding a policy would not
-- have helped: the insert policies correctly check `auth.uid() = profile_id`,
-- and every one of these forgeries is a row the learner legitimately owns. RLS
-- decides *which rows*; only column privileges decide *which columns*. That is
-- the same sentence the foundation migration used to justify revoking `role`,
-- and it applies verbatim here.
--
-- ── The fix ─────────────────────────────────────────────────────────────────
--
-- Revoke insert, then grant it one column at a time, matching what
-- `src/types/database.ts` already declares. Nothing the application does
-- changes; what changes is that the database now refuses everything else.
--
-- `update` grants were audited at the same time and were already correct —
-- every one of them is column-scoped. Only `insert` was written table-wide.

-- ────────────────────────────────────────────────────────────────────────────
-- The learner's own work
-- ────────────────────────────────────────────────────────────────────────────

-- `status` and `submitted_at` belong to `submit_artifact()` and to a reviewer.
-- This is the one that mattered most.
revoke insert on public.artifacts from authenticated;
grant insert (project_id, profile_id, mission_id, title, description, content, url)
  on public.artifacts to authenticated;

-- Proof is written by the learner; only the identity columns are theirs to set.
revoke insert on public.evidence from authenticated;
grant insert (artifact_id, kind, url, label, note)
  on public.evidence to authenticated;

-- `status`, `submitted_at` and `completed_at` belong to `complete_mission()`.
-- `reflection` stays out of the insert deliberately: the update grant already
-- allows it, and a row is created by starting the mission, not by finishing it.
revoke insert on public.learner_mission_progress from authenticated;
grant insert (profile_id, mission_id, project_id)
  on public.learner_mission_progress to authenticated;

/*
 * `is_automatic` is the whole reason this column exists: it separates the lines
 * the system wrote — "Submitted X", "Approved X" — from the learner's own
 * notes. A learner who can set it can write a build log that says their mentor
 * approved something, and their mentor reads that log.
 */
revoke insert on public.build_log_entries from authenticated;
grant insert (project_id, profile_id, mission_id, artifact_id, title, detail, occurred_at)
  on public.build_log_entries to authenticated;

-- `status` and `current_phase` are set by living with the product, not at the
-- moment of naming it. Both remain updatable, which is where they belong.
revoke insert on public.projects from authenticated;
grant insert (profile_id, name, slug, description)
  on public.projects to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- The mentor layer
-- ────────────────────────────────────────────────────────────────────────────

-- `response`, `answered_at`, `status` and `mentor_id` belong to
-- `answer_question()`. A learner must not be able to put words in their
-- mentor's mouth, which is what Prompt 6 said and what this now enforces.
revoke insert on public.mentor_questions from authenticated;
grant insert (learner_id, question, project_id, mission_id, artifact_id)
  on public.mentor_questions to authenticated;

-- Already unreachable for a learner — the RLS policy requires staff — but the
-- column list is narrowed for the same reason as the rest.
revoke insert on public.mentor_notes from authenticated;
grant insert (learner_id, author_id, body)
  on public.mentor_notes to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- Toolbox state
-- ────────────────────────────────────────────────────────────────────────────

-- Low consequence — these tables hold only what a learner saved or ticked —
-- and narrowed anyway, so the rule is "insert grants name their columns" with
-- no exceptions to remember.
revoke insert on public.learner_saved_items from authenticated;
grant insert (profile_id, item_id) on public.learner_saved_items to authenticated;

revoke insert on public.learner_recent_items from authenticated;
grant insert (profile_id, item_id, viewed_at) on public.learner_recent_items to authenticated;

revoke insert on public.learner_checklist_progress from authenticated;
grant insert (profile_id, item_id, checked_ids)
  on public.learner_checklist_progress to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- Indexes the application actually needs
-- ────────────────────────────────────────────────────────────────────────────

/*
 * Five, not twenty-nine.
 *
 * An audit of every foreign key without a leading index turned up twenty-nine
 * candidates. Most are already covered: a composite primary key indexes its
 * first column, so `lesson_prerequisites (lesson_id, …)` and
 * `mission_skills (mission_id, …)` need nothing, and `evidence` and
 * `artifact_feedback` already carry explicit indexes on the column the
 * application filters by.
 *
 * These five are the ones where a query in `src/lib` filters on a column that
 * no existing index leads with. Each is named with the query that justifies it.
 * The rest are left alone: LOCK has one learner, and an index nobody's query
 * uses is a write cost and a line of maintenance in exchange for nothing.
 */

-- `getLesson()` and `completeLesson()` read progress by lesson alone; the
-- primary key leads with `profile_id`.
create index if not exists learner_lesson_progress_lesson_idx
  on public.learner_lesson_progress (lesson_id);

-- Same shape, same query path in `getLesson()`.
create index if not exists learner_block_responses_lesson_idx
  on public.learner_block_responses (lesson_id);

create index if not exists learner_lesson_notes_lesson_idx
  on public.learner_lesson_notes (lesson_id);

-- `getMission()` looks the deliverable up by mission; the unique constraint
-- leads with `project_id`.
create index if not exists artifacts_mission_idx
  on public.artifacts (mission_id);

-- `getMission()` again, for the learner's progress on it.
create index if not exists learner_mission_progress_mission_idx
  on public.learner_mission_progress (mission_id);
