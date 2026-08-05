/**
 * The loading sequence is the first thing that tells a user this product has
 * a point of view. Seven beats, 700ms each — just under five seconds.
 */
export const LOADING_MESSAGES = [
  "Reading visual hierarchy",
  "Evaluating trust signals",
  "Understanding profile composition",
  "Measuring authority",
  "Analyzing consistency",
  "Estimating first impression",
  "Generating report",
] as const;

export const MESSAGE_INTERVAL_MS = 700;
