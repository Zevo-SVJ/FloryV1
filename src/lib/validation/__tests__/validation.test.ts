import assert from "node:assert/strict";
import { test } from "node:test";

import {
  checkUsername,
  normalizeUsername,
  usernameFromPath,
  usernameSchema,
} from "../username.ts";
import { reservedUsernameList } from "../reserved.ts";
import { checkUrl, normalizeUrl, urlSchema } from "../url.ts";

/**
 * The rules that decide what ends up in a URL and in an href.
 *
 * Run with:  npm test
 *
 * These use Node's built-in test runner and type stripping — no jest, no
 * vitest, no transform step. Imports are relative and carry the `.ts`
 * extension because Node resolves them itself, without the bundler's alias.
 */

test("normalizeUsername folds case, whitespace and unicode", () => {
  assert.equal(normalizeUsername("  Alex  "), "alex");
  assert.equal(normalizeUsername("ALEX_01"), "alex_01");
  assert.equal(normalizeUsername("alex smith"), "alexsmith");
  assert.equal(normalizeUsername("a.l.e.x"), "alex");
  // Fullwidth characters normalize to ASCII rather than being dropped, so two
  // visually identical names cannot both be claimed.
  assert.equal(normalizeUsername("ａlex"), "alex");
});

test("checkUsername enforces the documented rules", () => {
  assert.equal(checkUsername("alex"), null);
  assert.equal(checkUsername("8zevo"), null);
  assert.equal(checkUsername("a_b"), null);

  assert.equal(checkUsername("al"), "too_short");
  assert.equal(checkUsername("a".repeat(31)), "too_long");
  assert.equal(checkUsername("_alex"), "bad_edges");
  assert.equal(checkUsername("alex_"), "bad_edges");
  assert.equal(checkUsername("al__ex"), "consecutive_underscores");
  assert.equal(checkUsername("alex!"), "invalid_characters");
});

test("every reserved username is refused", () => {
  for (const reserved of reservedUsernameList()) {
    const normalized = normalizeUsername(reserved);
    // Some reserved entries exist only to block a route and are not themselves
    // valid usernames; those are refused for a different reason, which is fine.
    if (checkUsername(normalized) === null) {
      assert.fail(`${reserved} was accepted`);
    }
  }
  assert.equal(checkUsername("dashboard"), "reserved");
  assert.equal(checkUsername("showme"), "reserved");
});

test("usernameSchema normalizes before validating", () => {
  assert.equal(usernameSchema.parse("  Alex  "), "alex");
  assert.equal(usernameSchema.safeParse("Dashboard").success, false);
  assert.equal(usernameSchema.safeParse("no").success, false);
});

test("usernameFromPath accepts only the canonical form", () => {
  assert.equal(usernameFromPath("alex"), "alex");
  // Anything the browser would show differently must miss, so the route can
  // redirect to one address instead of serving two.
  assert.equal(usernameFromPath("Alex"), null);
  assert.equal(usernameFromPath("a.lex"), null);
  assert.equal(usernameFromPath("dashboard"), null);
  assert.equal(usernameFromPath("%E2%82%AC"), null);
  assert.equal(usernameFromPath("%"), null);
});

test("normalizeUrl adds a scheme only when one is absent", () => {
  assert.equal(normalizeUrl("example.com"), "https://example.com");
  assert.equal(normalizeUrl("http://example.com"), "http://example.com");
  assert.equal(normalizeUrl("  example.com/a  "), "https://example.com/a");
  // An explicit scheme is never rewritten, so this stays visible to checkUrl
  // and gets rejected rather than silently turned into a valid https URL.
  assert.equal(normalizeUrl("javascript:alert(1)"), "javascript:alert(1)");
});

test("checkUrl allows only http and https with a real host", () => {
  assert.equal(checkUrl("https://example.com"), null);
  assert.equal(checkUrl("http://example.com/path?q=1"), null);

  assert.equal(checkUrl("javascript:alert(1)"), "bad_protocol");
  assert.equal(checkUrl("data:text/html;base64,PHNjcmlwdD4="), "bad_protocol");
  assert.equal(checkUrl("vbscript:msgbox(1)"), "bad_protocol");
  assert.equal(checkUrl("file:///etc/passwd"), "bad_protocol");
  assert.equal(checkUrl("https://localhost"), "no_host");
  assert.equal(checkUrl("not a url"), "unparseable");
  assert.equal(checkUrl(""), "empty");
});

test("urlSchema rejects script-bearing schemes however they are cased", () => {
  assert.equal(urlSchema.parse("example.com").startsWith("https://"), true);
  for (const hostile of [
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "  javascript:alert(1)  ",
    "data:text/html,<script>alert(1)</script>",
  ]) {
    assert.equal(urlSchema.safeParse(hostile).success, false, hostile);
  }
});

test("every reserved entry is stored in its normalized form", () => {
  // Otherwise the entry protects nothing: a name is normalized before it is
  // looked up, so `well-known` in the list never matches `wellknown` in a URL.
  for (const reserved of reservedUsernameList()) {
    assert.equal(
      normalizeUsername(reserved),
      reserved,
      `${reserved} is not normalized`,
    );
  }
});
