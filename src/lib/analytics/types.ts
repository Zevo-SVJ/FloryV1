/**
 * The vocabulary of ShowMe analytics.
 *
 * Four device categories and a small set of traffic sources, both closed at the
 * point they are written rather than at the point they are read. Everything the
 * dashboard groups by is one of these, so a chart can never grow a row nobody
 * designed.
 */

export const DEVICES = ["mobile", "tablet", "desktop", "unknown"] as const;
export type Device = (typeof DEVICES)[number];

export const DEVICE_LABELS: Record<Device, string> = {
  mobile: "Mobile",
  tablet: "Tablet",
  desktop: "Desktop",
  unknown: "Unknown",
};

/** What the two tables hold for one event, minus the parts the server derives. */
export interface EventDimensions {
  /** Normalized: `instagram`, `google`, `direct`, `other`. Never a URL. */
  source: string;
  /** Only for the `other` bucket. A host, never a path. */
  referrerHost: string | null;
  device: Device;
  /** ISO 3166-1 alpha-2, or null when the deployment cannot tell us. */
  country: string | null;
}
