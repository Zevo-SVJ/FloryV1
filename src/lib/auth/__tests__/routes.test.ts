import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AFTER_SIGN_IN,
  isAuthOnlyPath,
  isProtectedPath,
  needsSession,
  safeReturnTo,
  signInUrl,
} from "@/lib/auth/routes";

/**
 * The redirect helpers, which are the only part of the route policy that a
 * hostile visitor gets to supply input to.
 */

describe("safeReturnTo", () => {
  it("keeps a path on this origin", () => {
    assert.equal(safeReturnTo("/learn"), "/learn");
    assert.equal(safeReturnTo("/learn?phase=think#top"), "/learn?phase=think#top");
  });

  it("falls back when there is nothing usable", () => {
    for (const value of [null, undefined, "", "   "]) {
      assert.equal(safeReturnTo(value), AFTER_SIGN_IN);
    }
  });

  it("refuses anything that leaves this origin", () => {
    const attacks = [
      "https://evil.example/steal",
      "//evil.example",
      // The one the obvious check misses: a URL parser reads the backslash as
      // a second slash, so this resolves to https://evil.example/.
      "/\\evil.example",
      "\\\\evil.example",
      // Normalizes to the pathname `//evil.example`, protocol-relative the
      // moment it reaches redirect().
      "/..//evil.example",
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      `/${"a".repeat(3000)}`,
    ];

    for (const attack of attacks) {
      assert.equal(safeReturnTo(attack), AFTER_SIGN_IN, `allowed: ${attack}`);
    }
  });
});

describe("signInUrl", () => {
  it("carries a same-origin destination through, encoded", () => {
    assert.equal(signInUrl("/build"), "/login?next=%2Fbuild");
  });

  it("drops a destination it cannot vouch for", () => {
    assert.equal(signInUrl("https://evil.example"), "/login");
    assert.equal(signInUrl("/\\evil.example"), "/login");
    assert.equal(signInUrl(), "/login");
  });
});

describe("path classification", () => {
  it("protects every section and their descendants", () => {
    assert.ok(isProtectedPath("/dashboard"));
    assert.ok(isProtectedPath("/learn/think/lesson-1"));
    assert.ok(isProtectedPath("/admin"));
    assert.ok(!isProtectedPath("/"));
    assert.ok(!isProtectedPath("/login"));
  });

  it("does not match a prefix that is only a string prefix", () => {
    // `/learners` is not inside `/learn`, and a naive startsWith says it is.
    assert.ok(!isProtectedPath("/learners"));
    assert.ok(!isAuthOnlyPath("/loginsomething"));
  });

  it("refreshes a session only where one is used", () => {
    assert.ok(needsSession("/"));
    assert.ok(needsSession("/dashboard"));
    assert.ok(needsSession("/login"));
    assert.ok(!needsSession("/auth/callback"));
    assert.ok(!needsSession("/favicon.ico"));
  });
});
