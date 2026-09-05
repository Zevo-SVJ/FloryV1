import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { contentSecurityPolicy, makeNonce, CSP_HEADER } from "@/lib/security/csp";

/**
 * The policy is security-critical in two opposite directions: too loose and it
 * protects nothing, too tight and the application is a blank page. Both
 * failures are asserted here, because both have shipped in real products.
 */

const parse = (csp: string): Map<string, string[]> =>
  new Map(
    csp.split(";").map((part) => {
      const [name, ...values] = part.trim().split(/\s+/);
      return [name ?? "", values];
    }),
  );

describe("makeNonce", () => {
  test("is different every time", () => {
    const seen = new Set(Array.from({ length: 200 }, () => makeNonce()));
    assert.equal(seen.size, 200);
  });

  test("carries enough entropy to be unguessable", () => {
    // 16 random bytes, base64 — anything shorter is decoration.
    assert.ok(Buffer.from(makeNonce(), "base64").length >= 16);
  });
});

describe("contentSecurityPolicy", () => {
  const csp = contentSecurityPolicy("TESTNONCE");
  const d = parse(csp);

  test("carries the nonce it was given", () => {
    assert.ok(d.get("script-src")?.includes("'nonce-TESTNONCE'"));
  });

  test("never allows inline script", () => {
    /*
     * The whole reason this file exists. `unsafe-inline` in `script-src` makes
     * the policy decorative: it would permit exactly the injection a CSP is for.
     * A nonce plus `strict-dynamic` is the alternative, and it is what is used.
     */
    assert.ok(!d.get("script-src")?.includes("'unsafe-inline'"));
    assert.ok(d.get("script-src")?.includes("'strict-dynamic'"));
  });

  test("closes the directives that have no legitimate use here", () => {
    assert.deepEqual(d.get("object-src"), ["'none'"]);
    assert.deepEqual(d.get("frame-src"), ["'none'"]);
    assert.deepEqual(d.get("frame-ancestors"), ["'none'"]);
    assert.deepEqual(d.get("base-uri"), ["'self'"]);
    // A stolen form must have nowhere to post to.
    assert.deepEqual(d.get("form-action"), ["'self'"]);
  });

  test("falls back to default-src 'self'", () => {
    assert.deepEqual(d.get("default-src"), ["'self'"]);
  });

  test("lets the browser reach the auth server", () => {
    // Without this, token refresh fails and everybody is signed out at random.
    assert.ok(d.get("connect-src")?.includes("'self'"));
  });

  test("allows lesson imagery over https and nothing over plain http", () => {
    const img = d.get("img-src") ?? [];
    assert.ok(img.includes("https:"));
    assert.ok(!img.includes("http:"));
    assert.ok(!img.includes("*"));
  });

  test("is a single header line with no stray separators", () => {
    assert.ok(!csp.includes(";;"));
    assert.ok(!csp.includes("\n"));
    assert.equal(csp.trim(), csp);
  });

  test("names every directive exactly once", () => {
    const names = csp.split(";").map((p) => p.trim().split(/\s+/)[0]);
    assert.equal(new Set(names).size, names.length);
  });
});

describe("the header name", () => {
  test("is the one browsers enforce, not the report-only variant", () => {
    // `content-security-policy-report-only` observes and permits everything.
    assert.equal(CSP_HEADER, "content-security-policy");
  });
});
