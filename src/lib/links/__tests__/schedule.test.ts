import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  fromLocalInput,
  isLive,
  linkState,
  scheduleProblem,
  toLocalInput,
} from "@/lib/links/schedule";

/**
 * When a link is on the page.
 *
 * The rule this file checks is duplicated on purpose: it is a Row Level
 * Security policy in `20260106000001_growth.sql`, which is what actually
 * decides, and a pure function here, which is what the editor's badge and the
 * preview read. `supabase/tests/06_growth.sql` asserts the policy end; these
 * assertions cover the boundaries a SQL suite states less precisely — the
 * exact instant a window opens and closes.
 *
 * The time-zone assertions are the other half. A schedule stored as a
 * wall-clock time would be ambiguous, and the way that ships broken is a field
 * labelled with one zone showing a number from another — so the two
 * conversions are checked against each other rather than trusted.
 */

const at = (iso: string) => new Date(iso);

const link = (over: Partial<Parameters<typeof linkState>[0]> = {}) => ({
  isActive: true,
  startsAt: null,
  endsAt: null,
  ...over,
});

describe("link state", () => {
  it("is live with no schedule at all", () => {
    assert.equal(linkState(link()), "live");
    assert.equal(isLive(link()), true);
  });

  it("is hidden when switched off, whatever the dates say", () => {
    // The precedence that matters most. A creator reaching for the toggle
    // wants the link gone now, not when a schedule they have forgotten says.
    assert.equal(linkState(link({ isActive: false })), "hidden");
    assert.equal(
      linkState(
        link({
          isActive: false,
          startsAt: "2020-01-01T00:00:00Z",
          endsAt: "2099-01-01T00:00:00Z",
        }),
      ),
      "hidden",
    );
  });

  it("is scheduled before its start and live from it", () => {
    const starts = "2026-09-10T18:00:00Z";

    assert.equal(linkState(link({ startsAt: starts }), at("2026-09-10T17:59:59.999Z")), "scheduled");
    // Inclusive at the bottom: at exactly the start, the link is live.
    assert.equal(linkState(link({ startsAt: starts }), at("2026-09-10T18:00:00.000Z")), "live");
  });

  it("is live until its end and expired from it", () => {
    const ends = "2026-09-15T23:59:00Z";

    assert.equal(linkState(link({ endsAt: ends }), at("2026-09-15T23:58:59.999Z")), "live");
    /*
     * Exclusive at the top — the same convention every window in the product
     * uses, including the analytics ranges. Two links scheduled back to back
     * are therefore never both on the page, not even for a millisecond.
     */
    assert.equal(linkState(link({ endsAt: ends }), at("2026-09-15T23:59:00.000Z")), "expired");
  });

  it("prefers expired over scheduled when both could apply", () => {
    // Only reachable from a backwards window, which the database refuses — so
    // this pins the answer for a row that got in some other way.
    const backwards = link({ startsAt: "2099-01-01T00:00:00Z", endsAt: "2020-01-01T00:00:00Z" });
    assert.equal(linkState(backwards, at("2026-01-01T00:00:00Z")), "expired");
  });

  it("treats an unparseable date as no bound rather than hiding the link", () => {
    /*
     * A hand-edited row, or a column that once held something else. Losing a
     * creator's link because a date is malformed is worse than showing it: the
     * link still works, and the editor's own validation is what stops a bad
     * value being written in the first place.
     */
    assert.equal(linkState(link({ startsAt: "not a date" })), "live");
    assert.equal(linkState(link({ endsAt: "" })), "live");
  });

  it("is live inside a window and not outside it", () => {
    const window = link({
      startsAt: "2026-09-10T00:00:00Z",
      endsAt: "2026-09-12T00:00:00Z",
    });

    assert.equal(isLive(window, at("2026-09-09T23:00:00Z")), false);
    assert.equal(isLive(window, at("2026-09-11T12:00:00Z")), true);
    assert.equal(isLive(window, at("2026-09-13T00:00:00Z")), false);
  });
});

describe("schedule problems", () => {
  it("accepts every shape a creator can legitimately want", () => {
    assert.equal(scheduleProblem({ startsAt: null, endsAt: null }), null);
    assert.equal(scheduleProblem({ startsAt: "2026-09-10T00:00:00Z", endsAt: null }), null);
    assert.equal(scheduleProblem({ startsAt: null, endsAt: "2026-09-10T00:00:00Z" }), null);
    assert.equal(
      scheduleProblem({ startsAt: "2026-09-10T00:00:00Z", endsAt: "2026-09-11T00:00:00Z" }),
      null,
    );
  });

  it("refuses a window nobody could ever see", () => {
    assert.ok(
      scheduleProblem({ startsAt: "2026-09-11T00:00:00Z", endsAt: "2026-09-10T00:00:00Z" }),
    );
    // Zero length included: the end is exclusive, so it would never be live.
    assert.ok(
      scheduleProblem({ startsAt: "2026-09-10T00:00:00Z", endsAt: "2026-09-10T00:00:00Z" }),
    );
  });

  it("names an unparseable value rather than accepting it", () => {
    assert.ok(scheduleProblem({ startsAt: "next tuesday", endsAt: null }));
    assert.ok(scheduleProblem({ startsAt: null, endsAt: "soon" }));
  });
});

describe("the field and the instant", () => {
  it("round-trips an instant through the field it is typed in", () => {
    /*
     * The property that matters: whatever the runtime's zone is, reading an
     * instant into the field and writing it back out is the same instant. A
     * conversion that used UTC on one side and local time on the other would
     * fail this everywhere except a machine set to UTC — which is exactly why
     * it is asserted rather than eyeballed.
     */
    for (const iso of [
      "2026-09-10T18:00:00.000Z",
      "2026-01-01T00:00:00.000Z",
      "2026-06-30T23:59:00.000Z",
      "2026-12-31T12:34:00.000Z",
    ]) {
      const field = toLocalInput(iso);
      assert.match(field, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, iso);
      assert.equal(fromLocalInput(field), iso, iso);
    }
  });

  it("reads the field in local time, not UTC", () => {
    // `new Date("…T18:00")` with no offset is local by specification. This
    // asserts the consequence: the instant matches what a local clock means.
    const instant = fromLocalInput("2026-09-10T18:00");
    assert.ok(instant);
    const parsed = new Date(instant);
    assert.equal(parsed.getHours(), 18);
    assert.equal(parsed.getMinutes(), 0);
  });

  it("treats an empty field as no schedule", () => {
    assert.equal(fromLocalInput(""), null);
    assert.equal(fromLocalInput("   "), null);
    assert.equal(toLocalInput(null), "");
  });

  it("refuses a field it cannot read rather than inventing a date", () => {
    assert.equal(fromLocalInput("tomorrow"), null);
    assert.equal(toLocalInput("tomorrow"), "");
  });
});
