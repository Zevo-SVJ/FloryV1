import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/dal";
import { sortActivity } from "@/lib/progress/rules";
import type {
  LearnerActivityRow,
  LearnerMilestoneRow,
  LearnerOverallProgressRow,
  LearnerPhaseProgressRow,
  LearnerSkillStateRow,
  LearnerStreakRow,
  LearnerXpTotalRow,
  MilestoneRow,
  SkillEvidenceRow,
  SkillRow,
  XpEventRow,
  XpRuleRow,
} from "@/types/database";

/**
 * Reads for the progress system.
 *
 * Everything here selects from a view, and every one of those views is
 * `security_invoker` — so the policies on the tables underneath decide which
 * rows come back. That is why these functions take a `profileId` for a mentor
 * viewing a learner and pass it straight through: it is a *filter*, not a
 * permission. A mentor with no assignment to that learner gets nothing back
 * whatever id they pass, because `can_review()` says so in the policy.
 *
 * Nothing here recalculates a percentage. The rules live in SQL, in one place,
 * and a second implementation in TypeScript would be a second answer.
 */

export interface ProgressSnapshot {
  overall: LearnerOverallProgressRow | null;
  phases: LearnerPhaseProgressRow[];
  xp: LearnerXpTotalRow | null;
  streak: LearnerStreakRow | null;
}

/**
 * The four numbers every progress surface needs, in four small queries.
 *
 * `maybeSingle()` throughout, because a brand-new learner has no rows in the
 * aggregate views at all — `learner_xp_totals` groups over an empty ledger and
 * returns nothing. Null is the correct answer there and every caller renders
 * it as a real empty state rather than as a zero.
 */
export const getProgressSnapshot = cache(
  async (profileId?: string): Promise<ProgressSnapshot> => {
    const profile = await requireProfile();
    const id = profileId ?? profile.id;
    const supabase = await createClient();

    const [overall, phases, xp, streak] = await Promise.all([
      supabase
        .from("learner_overall_progress")
        .select("*")
        .eq("profile_id", id)
        .maybeSingle(),
      supabase
        .from("learner_phase_progress")
        .select("*")
        .eq("profile_id", id)
        .order("position", { ascending: true }),
      supabase.from("learner_xp_totals").select("*").eq("profile_id", id).maybeSingle(),
      supabase.from("learner_streak").select("*").eq("profile_id", id).maybeSingle(),
    ]);

    return {
      overall: overall.data ?? null,
      phases: phases.data ?? [],
      xp: xp.data ?? null,
      streak: streak.data ?? null,
    };
  },
);

/** Every published skill and the state its evidence justifies. */
export const getSkillStates = cache(
  async (profileId?: string): Promise<LearnerSkillStateRow[]> => {
    const profile = await requireProfile();
    const supabase = await createClient();

    const { data } = await supabase
      .from("learner_skill_states")
      .select("*")
      .eq("profile_id", profileId ?? profile.id)
      .order("position", { ascending: true });

    return data ?? [];
  },
);

/**
 * What a skill is claimed on.
 *
 * The skills page shows this under each skill that has moved, because "Claude
 * Code — Demonstrated" is an assertion and an assertion without its evidence
 * is just a badge.
 */
export const getSkillEvidence = cache(
  async (profileId?: string): Promise<SkillEvidenceRow[]> => {
    const profile = await requireProfile();
    const supabase = await createClient();

    const { data } = await supabase
      .from("skill_evidence")
      .select("*")
      .eq("profile_id", profileId ?? profile.id)
      .order("occurred_at", { ascending: false });

    return data ?? [];
  },
);

export interface AwardsView {
  /** Every published definition, earned or not. */
  definitions: MilestoneRow[];
  earned: Map<string, LearnerMilestoneRow>;
}

/**
 * Milestones and achievements, with the unearned ones kept.
 *
 * Showing only what has been earned would leave a new learner with a blank
 * page and no idea what the program is asking of them. The definitions are the
 * map; the earned set is the position on it.
 */
export const getAwards = cache(async (profileId?: string): Promise<AwardsView> => {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [definitions, earned] = await Promise.all([
    supabase.from("milestones").select("*").order("position", { ascending: true }),
    supabase
      .from("learner_milestones")
      .select("*")
      .eq("profile_id", profileId ?? profile.id),
  ]);

  return {
    definitions: definitions.data ?? [],
    earned: new Map((earned.data ?? []).map((row) => [row.milestone_key, row])),
  };
});

/** Newest first. See `sortActivity` for why the ordering is not left to SQL. */
export const getActivity = cache(
  async (limit = 20, profileId?: string): Promise<LearnerActivityRow[]> => {
    const profile = await requireProfile();
    const supabase = await createClient();

    const { data } = await supabase
      .from("learner_activity")
      .select("*")
      .eq("profile_id", profileId ?? profile.id);

    return sortActivity(data ?? []).slice(0, limit);
  },
);

/**
 * The scoring rules, on their own.
 *
 * `xp_rules` is readable by every signed-in account on purpose: a points
 * system nobody can audit is a points system nobody should trust, so the
 * progress page prints the amounts beside the total.
 */
export const getXpRules = cache(async (): Promise<XpRuleRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("xp_rules")
    .select("*")
    .order("amount", { ascending: false });
  return data ?? [];
});

export interface XpLedger {
  rules: XpRuleRow[];
  events: XpEventRow[];
}

/** The ledger with its rules — every point, and what it was paid for. */
export const getXpLedger = cache(async (limit = 12): Promise<XpLedger> => {
  const supabase = await createClient();

  const [rules, events] = await Promise.all([
    supabase.from("xp_rules").select("*").order("amount", { ascending: false }),
    supabase
      .from("xp_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  return { rules: rules.data ?? [], events: events.data ?? [] };
});

/**
 * The skills a lesson introduces or a mission practises.
 *
 * A relationship rather than a copy: the same skill is named by many lessons
 * and stored once, which is what §13 asks for. The join is two queries rather
 * than a nested PostgREST select for the reason `lib/learning/queries.ts`
 * gives — the embedded-resource syntax is the hardest part of this stack to
 * read back, and two flat queries against two small tables cost less than the
 * ambiguity.
 */
export const getSkillsForLesson = cache(async (lessonId: string): Promise<SkillRow[]> => {
  const supabase = await createClient();

  const { data: links } = await supabase
    .from("lesson_skills")
    .select("skill_key")
    .eq("lesson_id", lessonId);

  const keys = (links ?? []).map((row) => row.skill_key);
  if (keys.length === 0) return [];

  const { data } = await supabase
    .from("skills")
    .select("*")
    .in("key", keys)
    .order("position", { ascending: true });

  return data ?? [];
});

export interface MissionSkill {
  skill: SkillRow;
  /** The one the mission is actually about. Named first and marked. */
  isPrimary: boolean;
}

export const getSkillsForMission = cache(
  async (missionId: string): Promise<MissionSkill[]> => {
    const supabase = await createClient();

    const { data: links } = await supabase
      .from("mission_skills")
      .select("skill_key,is_primary")
      .eq("mission_id", missionId);

    const rows = links ?? [];
    if (rows.length === 0) return [];

    const { data } = await supabase
      .from("skills")
      .select("*")
      .in("key", rows.map((row) => row.skill_key))
      .order("position", { ascending: true });

    const primary = new Set(rows.filter((row) => row.is_primary).map((row) => row.skill_key));

    return (data ?? [])
      .map((skill) => ({ skill, isPrimary: primary.has(skill.key) }))
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  },
);
