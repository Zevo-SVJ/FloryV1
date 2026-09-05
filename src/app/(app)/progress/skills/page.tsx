import type { Metadata } from "next";
import { PageHeader, HeaderMeta } from "@/components/ui/page-header";
import { Label } from "@/components/ui/surface";
import { EmptyState } from "@/components/states/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { SkillCard } from "@/components/progress/skill";
import { getSkillStates, getSkillEvidence } from "@/lib/progress/queries";
import { getCurriculum } from "@/lib/learning/queries";
import { getMissions } from "@/lib/workspace/queries";
import { SKILL_AREAS, SKILL_AREA_LABEL, SKILL_STATE_RANK } from "@/lib/progress/labels";
import { formatDate } from "@/components/progress/award";
import type { SkillEvidenceRow } from "@/types/database";

export const metadata: Metadata = { title: "Skills" };

/**
 * What the learner can do, and what says so.
 *
 * The evidence list under each skill is the reason this page exists.
 * "Validation — Demonstrated" is an assertion, and an assertion with nothing
 * behind it is a badge. Every skill past `introduced` shows the lessons,
 * missions and approvals it was counted from, by name and by date.
 *
 * Grouped by area, and an area with nothing moving in it still draws — a
 * learner should be able to see the whole map of what LOCK will teach them,
 * not only the corner they have started.
 *
 * The evidence lines are resolved server-side into plain strings. That is
 * deliberate rather than incidental: anything passed to a Client Component is
 * serialized into the page, and a lesson title is cheaper to send than the
 * curriculum it came from.
 */
export default async function SkillsPage() {
  const [skills, evidence, curriculum, missions] = await Promise.all([
    getSkillStates(),
    getSkillEvidence(),
    getCurriculum(),
    getMissions(),
  ]);

  // Titles, so a piece of evidence can name the thing it came from.
  const lessonTitles = new Map(
    curriculum
      .flatMap(({ modules }) => modules.flatMap((module) => module.lessons))
      .map((lesson) => [lesson.id, lesson.title]),
  );
  const missionTitles = new Map(
    missions.map(({ mission }) => [mission.id, mission.title]),
  );

  const linesFor = (skillKey: string): string[] =>
    evidence
      .filter((row) => row.skill_key === skillKey)
      .map((row) => describe(row, lessonTitles, missionTitles));

  const demonstrated = skills.filter(
    (skill) => SKILL_STATE_RANK[skill.state] >= SKILL_STATE_RANK.demonstrated,
  ).length;
  const moving = skills.filter((skill) => skill.state !== "not_started").length;

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Progress"
        title="Skills"
        description="What you can do now that you could not do before, counted from work you produced rather than from lessons you opened. Reading a lesson gets a skill to Introduced. Only work your mentor approved takes it past Practising."
        meta={
          <>
            <HeaderMeta label="Tracked">{skills.length}</HeaderMeta>
            <HeaderMeta label="In motion">{moving}</HeaderMeta>
            <HeaderMeta label="Demonstrated">{demonstrated}</HeaderMeta>
          </>
        }
      />

      {moving === 0 ? (
        <EmptyState title="Start building to develop your first skills">
          <p>
            Nothing is claimed yet, and nothing should be. A skill moves when
            you finish a lesson that teaches it, complete a mission that applies
            it, or have work using it approved — three states, in that order of
            weight.
          </p>
          <p className="pt-3">
            <ButtonLink href="/learn/missions" size="sm">
              See the missions
            </ButtonLink>
          </p>
        </EmptyState>
      ) : null}

      {SKILL_AREAS.map((area) => {
        const inArea = skills.filter((skill) => skill.area === area);
        if (inArea.length === 0) return null;

        return (
          <section key={area} className="space-y-3">
            <Label as="h2">{SKILL_AREA_LABEL[area]}</Label>
            <div className="grid gap-4 md:grid-cols-2">
              {inArea.map((skill) => (
                <SkillCard
                  key={skill.skill_key}
                  skill={skill}
                  evidence={linesFor(skill.skill_key)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/**
 * One line of evidence, in the past tense.
 *
 * `detail` was frozen when the row was written, so it still names what the
 * lesson was called at the time. The live title is preferred when it is still
 * available and the stored one is used otherwise — which is what makes an
 * archived lesson's evidence readable rather than a bare id.
 */
function describe(
  row: SkillEvidenceRow,
  lessons: Map<string, string>,
  missions: Map<string, string>,
): string {
  const when = formatDate(row.occurred_at);

  switch (row.kind) {
    case "lesson_completed": {
      const title = (row.lesson_id ? lessons.get(row.lesson_id) : null) ?? row.detail;
      return `Completed ${title || "a lesson"} · ${when}`;
    }
    case "mission_completed": {
      const title = (row.mission_id ? missions.get(row.mission_id) : null) ?? row.detail;
      return `Completed the mission ${title || "you finished"} · ${when}`;
    }
    case "artifact_approved":
      return `${row.detail || "Your work"} approved by your mentor · ${when}`;
  }
}
