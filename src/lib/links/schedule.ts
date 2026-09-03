/**
 * When a link is on the page, and when it is not.
 *
 * Four states, and the order they are checked in is the whole of the logic:
 *
 *   hidden     The creator switched it off. This wins over every date, because
 *              somebody who reaches for the toggle wants the link gone now and
 *              not at whatever time a forgotten schedule says.
 *   expired    Its end has passed.
 *   scheduled  Its start has not arrived.
 *   live       None of the above.
 *
 * Everything here is a pure function of a link and an instant, which is what
 * lets the editor's badge, the preview, the public renderer and a database
 * policy all agree about the same link. The authoritative copy of this rule is
 * the `live links are readable by anyone` policy in
 * `supabase/migrations/20260106000001_growth.sql`; this file is what the
 * interface says out loud, and `supabase/tests/06_growth.sql` asserts the two
 * do not disagree.
 *
 * ── Time zones ──────────────────────────────────────────────────────────────
 *
 * A schedule is stored as an absolute instant — a `timestamptz`, serialized as
 * ISO-8601 with an explicit offset — and never as a wall-clock time plus a
 * zone to interpret it in. That choice is what removes the ambiguity the
 * feature is famous for: there is exactly one moment at which a link appears,
 * every reader of the row computes the same answer, and the server's own zone
 * never enters into it.
 *
 * The creator enters and reads those instants in their device's own zone, and
 * the editor prints the zone's name beside the field so the number on screen
 * is never unlabelled. The one consequence worth stating: a creator who
 * schedules a drop in Paris and then opens the editor in New York sees the
 * same instant written as a different clock time. The link did not move; the
 * reader did.
 */

/** The parts of a link that decide whether it is on the page. */
export interface LinkSchedule {
  isActive: boolean;
  /** ISO-8601 instant, or null for "already live". */
  startsAt: string | null;
  /** ISO-8601 instant, or null for "no end". */
  endsAt: string | null;
}

export type LinkState = "live" | "hidden" | "scheduled" | "expired";

/** An instant, or null if the value is absent or not a date. */
export function instant(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

export function linkState(link: LinkSchedule, now: Date = new Date()): LinkState {
  if (!link.isActive) return "hidden";

  const at = now.getTime();
  const ends = instant(link.endsAt);
  /*
   * Exclusive at the top, inclusive at the bottom — the same convention every
   * window in the product uses, including the analytics ranges. A link that
   * ends at 23:59 is gone at 23:59:00.000, so two links scheduled back to back
   * are never both on the page for a millisecond.
   */
  if (ends !== null && at >= ends) return "expired";

  const starts = instant(link.startsAt);
  if (starts !== null && at < starts) return "scheduled";

  return "live";
}

/** Whether the world can see this link right now. */
export const isLive = (link: LinkSchedule, now: Date = new Date()): boolean =>
  linkState(link, now) === "live";

/**
 * Whether a schedule is one a link could ever be seen in.
 *
 * The editor cannot produce a backwards window, and the database refuses one
 * outright. This is the sentence in between — the message a creator reads when
 * they set an end before a start.
 */
export function scheduleProblem(link: {
  startsAt: string | null;
  endsAt: string | null;
}): string | null {
  const starts = instant(link.startsAt);
  const ends = instant(link.endsAt);

  if (link.startsAt && starts === null) return "That start time is not a date.";
  if (link.endsAt && ends === null) return "That end time is not a date.";
  if (starts !== null && ends !== null && ends <= starts) {
    return "The end has to come after the start.";
  }
  return null;
}

/* ── Between an instant and a field somebody types in ─────────────────────── */

const pad = (value: number): string => String(value).padStart(2, "0");

/**
 * An instant, as `<input type="datetime-local">` wants it.
 *
 * Built from the local getters rather than by slicing `toISOString()`, which
 * would silently show UTC in a field labelled with the creator's own zone —
 * the single most common way this feature goes wrong.
 */
export function toLocalInput(iso: string | null): string {
  const at = instant(iso);
  if (at === null) return "";

  const date = new Date(at);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * What somebody typed, as an absolute instant.
 *
 * `new Date("2026-09-10T18:00")` is local time by specification — a date-time
 * form with no offset is interpreted in the runtime's zone — which is exactly
 * the reading a field labelled "Europe/Paris" implies. Returns null for an
 * empty or unparseable field, which is how "no schedule" travels.
 */
export function fromLocalInput(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  const at = new Date(trimmed).getTime();
  return Number.isNaN(at) ? null : new Date(at).toISOString();
}

/** The zone the creator is currently reading times in, for the label. */
export function localZoneName(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "your device's time zone";
  } catch {
    return "your device's time zone";
  }
}

/** An instant, spelled out in the reader's own zone. */
export function formatInstant(iso: string): string {
  const at = instant(iso);
  if (at === null) return "";

  return new Date(at).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
