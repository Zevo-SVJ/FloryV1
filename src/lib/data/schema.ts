/**
 * How Blink's data is laid out.
 *
 * Written down here because a collection path is an interface: once reports are
 * stored under it, moving them costs a migration. The shape below is the one
 * subscriptions will need, so adding them later is new fields on an existing
 * document rather than a new home for everything.
 *
 *   users/{uid}
 *     profile and entitlement — one document, read on every visit
 *
 *   users/{uid}/analyses/{reportId}
 *     one document per completed analysis, id derived from the observation so
 *     re-running an identical screenshot updates rather than duplicates
 *
 * Access is enforced by Firestore rules, not by this file. The intended rule is
 * the simplest possible one: a signed-in user may read and write documents
 * under their own uid and nothing else. See `firestore.rules`.
 */

export const usersPath = () => "users";
export const userPath = (uid: string) => `users/${uid}`;
export const analysesPath = (uid: string) => `users/${uid}/analyses`;
export const analysisPath = (uid: string, id: string) => `users/${uid}/analyses/${id}`;

/** What a person is entitled to. One free run is the whole free tier today. */
export type Plan = "free" | "pro";

export type PlanStatus = "active" | "past_due" | "canceled" | "trialing" | "none";

export interface UserDoc {
  uid: string;
  createdAt: string;
  displayName: string | null;
  email: string | null;
  photoUrl: string | null;
  /* Entitlement. Present from the first write so no document ever needs
     backfilling when subscriptions ship. */
  plan: Plan;
  planStatus: PlanStatus;
  /** ISO timestamp the current period ends, when there is one. */
  planRenewsAt: string | null;
  /** Set by the billing webhook. Never written by the client. */
  billingCustomerId: string | null;
  analysisCount: number;
  lastAnalysisAt: string | null;
}

export function newUserDoc(input: {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoUrl: string | null;
}): UserDoc {
  return {
    ...input,
    createdAt: new Date().toISOString(),
    plan: "free",
    planStatus: "none",
    planRenewsAt: null,
    billingCustomerId: null,
    analysisCount: 0,
    lastAnalysisAt: null,
  };
}

/** The row a history list needs, without pulling a whole report down. */
export interface AnalysisSummary {
  id: string;
  createdAt: string;
  overall: number;
  archetype: string;
  headline: string;
}
