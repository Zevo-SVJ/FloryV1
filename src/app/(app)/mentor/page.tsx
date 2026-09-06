import type { Metadata } from "next";
import Link from "next/link";
import { Screen } from "@/components/ui/screen";
import { Card, Label, Badge } from "@/components/ui/surface";
import { EmptyState } from "@/components/states/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { FeedbackCard } from "@/components/mentor/feedback";
import { AskMentorForm } from "@/components/mentor/ask-form";
import { getLearnerMentorView, getNotifications } from "@/lib/mentor/queries";
import { getProject } from "@/lib/workspace/queries";
import { QUESTION_STATUS_LABEL } from "@/lib/mentor/labels";
import { ARTIFACT_STATUS_LABEL } from "@/lib/workspace/labels";

export const metadata: Metadata = { title: "Your Mentor" };

/**
 * The learner's side of the guidance layer.
 *
 * The job of this page is to answer one question honestly: is somebody actually
 * looking at my work? It answers it with facts — what was reviewed, what is
 * waiting, what came back — rather than with presence indicators or an activity
 * feed. Nothing here is social.
 *
 * Feedback leads, because feedback is the reason the page exists. Asking a
 * question is below it, not above: the mentor's written review is worth more
 * than a conversation, and the layout should say so.
 */
export default async function YourMentorPage() {
  const [view, project, notifications] = await Promise.all([
    getLearnerMentorView(),
    getProject(),
    getNotifications(6),
  ]);

  const latest = view.feedback[0];
  const unread = notifications.filter((row) => row.read_at === null);

  return (
    <Screen
      title={view.mentor?.display_name ?? "Zevo"}
      eyebrow="Your Mentor"
      lede="Your work is read by somebody who has built products and will tell you when yours is not ready. That is the point of the review."
      width="content"
    >
      <div className="space-y-8">

      {!view.mentor ? (
        <EmptyState title="No mentor assigned yet">
          <p>
            Reviews need somebody to give them. Once a mentor is paired with your
            account, submitted work appears in their queue and their feedback
            appears here.
          </p>
        </EmptyState>
      ) : (
        <Card className="flex flex-wrap items-center gap-4 p-5">
          <Avatar name={view.mentor.display_name} className="size-10" />
          <div className="min-w-0 flex-1">
            <p className="text-[0.9375rem] font-medium text-ink">
              {view.mentor.display_name ?? "Your mentor"}
            </p>
            <p className="text-sm text-ink-muted">
              Reviews your submitted work, and answers questions about the
              decisions behind it — not about the code.
            </p>
          </div>
        </Card>
      )}

      {unread.length > 0 ? (
        <section className="space-y-3">
          <Label as="h2">New since you were last here</Label>
          <ul className="space-y-2">
            {unread.map((row) => (
              <li
                key={row.id}
                className="rounded-card border border-border p-4"
              >
                <p className="text-[0.9375rem] text-ink">{row.title}</p>
                {row.body ? <p className="mt-1 text-sm text-ink-muted">{row.body}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {view.needsWork.length > 0 ? (
        <section className="space-y-3">
          <Label as="h2">Waiting on you</Label>
          <ul className="space-y-2">
            {view.needsWork.map((artifact) => (
              <li key={artifact.id}>
                <Link
                  href="/build/artifacts"
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-card border border-accent/40 bg-accent-quiet/25 p-4"
                >
                  <span className="text-[0.9375rem] font-medium text-ink">{artifact.title}</span>
                  <Badge tone="accent">{ARTIFACT_STATUS_LABEL[artifact.status]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {view.awaitingReview.length > 0 ? (
        <section className="space-y-3">
          <Label as="h2">With your mentor</Label>
          <ul className="space-y-2">
            {view.awaitingReview.map((artifact) => (
              <li
                key={artifact.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-card border border-border p-4"
              >
                <span className="text-[0.9375rem] text-ink">{artifact.title}</span>
                <Badge>{ARTIFACT_STATUS_LABEL[artifact.status]}</Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="max-w-read space-y-3">
        <Label as="h2">Latest feedback</Label>
        {latest ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-subtle">On {latest.artifactTitle}</p>
            <FeedbackCard feedback={latest} />
            {view.feedback.length > 1 ? (
              <p className="text-sm text-ink-subtle">
                {view.feedback.length - 1} earlier review
                {view.feedback.length > 2 ? "s" : ""} on your work, kept in the
                artifact&rsquo;s history.
              </p>
            ) : null}
          </div>
        ) : (
          <EmptyState title="No feedback yet">
            <p>
              Submit a mission deliverable and it lands in your mentor&rsquo;s
              queue. What comes back appears here, with what worked, what did
              not, and one thing to do next.
            </p>
          </EmptyState>
        )}
      </section>

      <section className="max-w-read space-y-3">
        <AskMentorForm projectId={project?.id ?? null} />

        {view.questions.length > 0 ? (
          <ul className="space-y-3 pt-2">
            {view.questions.map((question) => (
              <li key={question.id}>
                <Card className="space-y-3 p-5">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <Badge tone={question.status === "answered" ? "accent" : "quiet"}>
                      {QUESTION_STATUS_LABEL[question.status]}
                    </Badge>
                    <span className="label text-ink-subtle tabular-nums">
                      {new Date(question.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        timeZone: "UTC",
                      })}
                    </span>
                  </div>
                  <p className="text-[0.9375rem] text-ink">{question.question}</p>
                  {question.response ? (
                    <div className="border-l-2 border-accent py-1 pl-4">
                      <p className="label mb-1 text-accent">Answer</p>
                      <p className="text-[0.9375rem] leading-relaxed text-ink-muted">
                        {question.response}
                      </p>
                    </div>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      </div>
    </Screen>
  );
}
