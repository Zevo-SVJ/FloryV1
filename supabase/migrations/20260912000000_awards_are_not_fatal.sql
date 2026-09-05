-- Bookkeeping must never destroy the work it is bookkeeping about
--
-- ── The bug ─────────────────────────────────────────────────────────────────
--
-- Creating a project failed with "That did not save. Try again.", every time,
-- for every valid input. The project insert itself was never the problem: the
-- row, the policy, the column privileges and the PostgREST request were all
-- correct and were verified individually.
--
-- What failed was the `projects_award_progress` AFTER INSERT trigger that
-- Prompt 7 attached. It runs in the same transaction as the insert, so when
-- anything inside it raised, PostgreSQL rolled the whole statement back and the
-- learner's product disappeared along with the error.
--
-- The specific trigger, reproduced end to end: `evaluate_milestones()` awards
-- FIRST IDEA the moment a project exists and writes a notification for it with
-- `kind = 'milestone_earned'`. That enum value is added at the top of
-- `20260910000000_progress_skills.sql`. On any database where that one
-- statement did not take effect — a migration applied in pieces, an editor
-- session that rolled back, a project restored from a backup taken between the
-- two — every project insert aborts with:
--
--   invalid input value for enum public.notification_kind: "milestone_earned"
--
-- Disabling only that trigger made the identical insert succeed, which is the
-- whole proof: nothing about the project was ever wrong.
--
-- ── The fix, and why it is this one ─────────────────────────────────────────
--
-- Repairing the enum alone would close this instance and leave the class open.
-- The real defect is that a *secondary* concern can veto a *primary* one: XP,
-- milestones and notifications are a record of work, and a record that can
-- destroy the work it describes has its priorities inverted. A learner losing
-- their product because a points table could not be written is never the right
-- outcome.
--
-- So both, in this order:
--
--   1. Add the enum value, idempotently, repairing any database missing it.
--   2. Make the awards path incapable of aborting its caller. `award_xp()` and
--      `evaluate_milestones()` now catch, warn, and return. The warning carries
--      SQLERRM and reaches the Postgres log, so a real bug is still visible to
--      anybody looking — this is a demotion from fatal to logged, not a
--      silencing.
--
-- Nothing is lost by demoting it. `evaluate_milestones()` is idempotent and is
-- called at the end of every domain function — completing a lesson or a
-- mission, submitting work, a review landing. A milestone missed because of a
-- transient fault is awarded on the learner's very next action, so the system
-- heals itself rather than needing a backfill.
--
-- The tests keep this honest: suites 07 and 08 assert the XP amounts and the
-- milestone rows that these functions are supposed to write, so a failure that
-- is merely logged still fails the build.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Repair the enum
-- ────────────────────────────────────────────────────────────────────────────

-- Idempotent, and first in the file so the value is committed before anything
-- could use it at runtime.
alter type public.notification_kind add value if not exists 'milestone_earned';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Demote the awards path from fatal to logged
-- ────────────────────────────────────────────────────────────────────────────

/*
 * Same body as Prompt 7, wrapped.
 *
 * The `exception when others` block is deliberate here in a way it would not be
 * in a function that decides something. This one hands out points. If it cannot,
 * the caller — a learner finishing a mission, or naming their product — must
 * still succeed.
 */
create or replace function public.award_xp(
  p_profile_id uuid,
  p_kind public.xp_event_kind,
  p_subject_type text,
  p_subject_key text,
  p_detail text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_amount integer;
begin
  if p_profile_id is null or p_subject_key is null or btrim(p_subject_key) = '' then
    return;
  end if;

  select amount into v_amount from public.xp_rules where kind = p_kind;
  if v_amount is null then
    return;  -- No rule, no award. A missing rule is not worth aborting work for.
  end if;

  -- `do nothing` is the duplicate protection, enforced by xp_events_once_idx.
  insert into public.xp_events (profile_id, kind, amount, subject_type, subject_key, detail)
  values (p_profile_id, p_kind, v_amount, p_subject_type, btrim(p_subject_key), btrim(p_detail))
  on conflict do nothing;

exception when others then
  -- Logged, not swallowed. The learner's work is worth more than the points.
  raise warning 'award_xp(%, %) failed and was skipped: %', p_profile_id, p_kind, sqlerrm;
end;
$$;

/*
 * The same demotion, and the one that actually bit.
 *
 * A milestone missed here is not lost: this function is idempotent and runs
 * again at the end of the learner's next completed lesson, mission, submission
 * or review, so the award lands then.
 */
create or replace function public.evaluate_milestones(p_profile_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.milestones;
  v_awarded integer := 0;
begin
  for v_row in
    select * from public.milestones m
    where m.published
      and m.requirement <> 'manual'
      and not exists (
        select 1 from public.learner_milestones lm
        where lm.profile_id = p_profile_id and lm.milestone_key = m.key
      )
    order by m.position
  loop
    if public.milestone_is_met(p_profile_id, v_row.requirement, v_row.requirement_config) then
      insert into public.learner_milestones (profile_id, milestone_key)
      values (p_profile_id, v_row.key)
      on conflict do nothing;

      if found then
        v_awarded := v_awarded + 1;

        perform public.award_xp(
          p_profile_id, 'milestone_earned', 'milestone', v_row.key, v_row.title
        );

        insert into public.notifications (profile_id, kind, title, body, href)
        values (
          p_profile_id, 'milestone_earned',
          v_row.title, v_row.summary, '/progress/achievements'
        );
      end if;
    end if;
  end loop;

  return v_awarded;

exception when others then
  raise warning 'evaluate_milestones(%) failed and was skipped: %', p_profile_id, sqlerrm;
  return v_awarded;
end;
$$;

/*
 * The trigger boundary itself, guarded as well.
 *
 * The two functions above cannot raise any more, so this is redundant today. It
 * is here because this is the seam where a rollback would cost the most — the
 * moment a learner names the thing they are building — and a future edit to
 * either function should not be able to make project creation fragile again.
 */
create or replace function public.project_started_awards()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    perform public.award_xp(new.profile_id, 'project_started', 'project', new.id::text, new.name);
    perform public.evaluate_milestones(new.profile_id);
  exception when others then
    raise warning 'project_started_awards for % was skipped: %', new.profile_id, sqlerrm;
  end;
  return null;
end;
$$;
