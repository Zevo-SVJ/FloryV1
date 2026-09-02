import assert from "node:assert/strict";
import { test } from "node:test";

import {
  USERNAME_MAX,
  USERNAME_MIN,
  checkUsername,
  isPlaceholderUsername,
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
 *
 * The same rules exist as SQL. `supabase/tests/02_usernames.sql` asserts the
 * database agrees with every case below; the database is the one that decides.
 */

test("normalizeUsername folds case and whitespace, and nothing else", () => {
  assert.equal(normalizeUsername("  Alex  "), "alex");
  assert.equal(normalizeUsername("ALEX_01"), "alex_01");
  // Fullwidth characters normalize to ASCII, so two names that look identical
  // in a browser tab cannot be two different accounts.
  assert.equal(normalizeUsername("ａlex"), "alex");

  // Crucially it does not strip. Silently turning "john doe" into "johndoe"
  // would hand somebody an address they never typed and never checked.
  assert.equal(normalizeUsername("john doe"), "john doe");
  assert.equal(normalizeUsername("john.doe"), "john.doe");
});

test("checkUsername accepts the names the product promises", () => {
  for (const valid of ["john", "john123", "john_doe", "john-doe", "8zevo", "a1b"]) {
    assert.equal(checkUsername(valid), null, valid);
  }
});

test("checkUsername refuses everything else", () => {
  assert.equal(checkUsername("john doe"), "invalid_characters");
  assert.equal(checkUsername("john/doe"), "invalid_characters");
  assert.equal(checkUsername("john.doe"), "invalid_characters");
  assert.equal(checkUsername("john@doe"), "invalid_characters");
  assert.equal(checkUsername("🔥john"), "invalid_characters");
  assert.equal(checkUsername("John"), "invalid_characters");

  assert.equal(checkUsername("_john"), "bad_edges");
  assert.equal(checkUsername("-john"), "bad_edges");
  assert.equal(checkUsername("john_"), "bad_edges");
  assert.equal(checkUsername("john-"), "bad_edges");

  assert.equal(checkUsername("jo__hn"), "adjacent_separators");
  assert.equal(checkUsername("jo--hn"), "adjacent_separators");
  assert.equal(checkUsername("jo-_hn"), "adjacent_separators");
});

test("checkUsername holds the length boundaries exactly", () => {
  assert.equal(checkUsername("a".repeat(USERNAME_MIN - 1)), "too_short");
  assert.equal(checkUsername("a".repeat(USERNAME_MIN)), null);
  assert.equal(checkUsername("a".repeat(USERNAME_MAX)), null);
  assert.equal(checkUsername("a".repeat(USERNAME_MAX + 1)), "too_long");
});

test("system placeholders cannot be claimed", () => {
  const placeholder = `u${"0123456789ab".repeat(3).slice(0, 29)}`;
  assert.equal(isPlaceholderUsername(placeholder), true);
  // Claiming another account's placeholder would take over the address that
  // account is about to be given.
  assert.equal(checkUsername(placeholder), "reserved");

  assert.equal(isPlaceholderUsername("under_score"), false);
  assert.equal(isPlaceholderUsername("u0123"), false);
});

test("every reserved username is refused", () => {
  for (const reserved of reservedUsernameList()) {
    assert.notEqual(checkUsername(reserved), null, `${reserved} was accepted`);
  }
  assert.equal(checkUsername("dashboard"), "reserved");
  assert.equal(checkUsername("administrator"), "reserved");
  assert.equal(checkUsername("well-known"), "reserved");
  assert.equal(checkUsername("showme"), "reserved");
});

test("every reserved entry is a name somebody could otherwise have typed", () => {
  // An entry that is not itself a valid username shape protects nothing — it
  // sits in the list looking useful while the name it meant to block stays
  // free. Both halves matter: normalized, and reserved for the right reason.
  for (const reserved of reservedUsernameList()) {
    assert.equal(normalizeUsername(reserved), reserved, `${reserved} is not normalized`);
    assert.equal(
      checkUsername(reserved),
      "reserved",
      `${reserved} is refused for the wrong reason — it is not a claimable shape`,
    );
  }
});

test("usernameSchema normalizes, then judges", () => {
  assert.equal(usernameSchema.parse("  Alex  "), "alex");
  assert.equal(usernameSchema.parse("John-Doe"), "john-doe");

  for (const invalid of ["Dashboard", "no", "john doe", "john.doe", "a".repeat(31)]) {
    assert.equal(usernameSchema.safeParse(invalid).success, false, invalid);
  }
});

test("usernameFromPath sends every spelling to one address", () => {
  assert.deepEqual(usernameFromPath("alex"), { kind: "canonical", username: "alex" });
  assert.deepEqual(usernameFromPath("john-doe"), {
    kind: "canonical",
    username: "john-doe",
  });

  // Case is the same person, so it redirects rather than serving two pages.
  assert.deepEqual(usernameFromPath("Alex"), { kind: "redirect", username: "alex" });
  assert.deepEqual(usernameFromPath("ALEX"), { kind: "redirect", username: "alex" });

  // Not a username at all. A redirect to /johndoe would invent an address and
  // could land the visitor on a stranger's page.
  assert.deepEqual(usernameFromPath("john.doe"), { kind: "miss" });
  assert.deepEqual(usernameFromPath("dashboard"), { kind: "miss" });
  assert.deepEqual(usernameFromPath("%E2%82%AC"), { kind: "miss" });
  assert.deepEqual(usernameFromPath("%"), { kind: "miss" });
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
