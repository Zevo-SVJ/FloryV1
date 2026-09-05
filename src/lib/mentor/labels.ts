import type {
  ArtifactStatus, FeedbackCategory, NotificationKind, QuestionStatus,
} from "@/types/database";

/** Mentor-layer vocabulary. No server imports: both sides read it. */

export const FEEDBACK_CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  product: "Product",
  research: "Research",
  ux: "UX",
  technical: "Technical",
  business: "Business",
  quality: "Quality",
  other: "General",
};

export const QUESTION_STATUS_LABEL: Record<QuestionStatus, string> = {
  open: "Waiting on your mentor",
  answered: "Answered",
  closed: "Closed",
};

export const NOTIFICATION_KIND_LABEL: Record<NotificationKind, string> = {
  artifact_submitted: "Submission",
  artifact_reviewed: "Review",
  question_asked: "Question",
  question_answered: "Answer",
};

/** The three verdicts a mentor may record. Nothing else is a decision. */
export const REVIEW_DECISIONS = ["approved", "needs_work", "final"] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

export const DECISION_LABEL: Record<ReviewDecision, string> = {
  approved: "Approve",
  needs_work: "Needs work",
  final: "Mark final",
};

/** Statuses that mean the work is sitting with the mentor. */
export const AWAITING_REVIEW: ArtifactStatus[] = ["submitted", "in_review"];
