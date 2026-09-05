import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AUTH_ERROR_KEYS,
  authErrorMessage,
  classifyProviderError,
} from "@/lib/auth/auth-errors";

/**
 * Everything here is fed by somebody else's server, so the assertions are less
 * about the happy path than about what happens to input nobody vouched for.
 */

describe("classifyProviderError", () => {
  it("reads a cancelled consent screen as cancelled", () => {
    assert.equal(classifyProviderError({ error: "access_denied" }), "cancelled");
  });

  it("prefers the specific code over the generic error", () => {
    // Supabase reports a closed signup as access_denied *with* a code. Reading
    // only `error` would tell somebody they cancelled when they were refused.
    assert.equal(
      classifyProviderError({ error: "access_denied", errorCode: "signup_disabled" }),
      "signup_disabled",
    );
  });

  it("maps an expired link", () => {
    assert.equal(classifyProviderError({ errorCode: "otp_expired" }), "link_expired");
  });

  it("maps the provider's own outages", () => {
    assert.equal(classifyProviderError({ error: "server_error" }), "provider_unavailable");
    assert.equal(
      classifyProviderError({ error: "temporarily_unavailable" }),
      "provider_unavailable",
    );
    assert.equal(
      classifyProviderError({ errorCode: "provider_disabled" }),
      "provider_unavailable",
    );
  });

  it("is case- and whitespace-insensitive", () => {
    assert.equal(classifyProviderError({ error: "  ACCESS_DENIED " }), "cancelled");
  });

  it("never returns nothing for something it has not seen", () => {
    assert.equal(classifyProviderError({ error: "wat" }), "unknown");
    assert.equal(classifyProviderError({}), "unknown");
  });
});

describe("authErrorMessage", () => {
  it("says nothing when there is no error", () => {
    for (const value of [null, undefined, ""]) {
      assert.equal(authErrorMessage(value), null);
    }
  });

  it("has a sentence for every key it can produce", () => {
    for (const key of AUTH_ERROR_KEYS) {
      const message = authErrorMessage(key);
      assert.ok(message && message.length > 0, `no message for ${key}`);
    }
  });

  it("does not render an invented parameter back to the visitor", () => {
    // The query string is attacker-controllable. Anything unrecognised must
    // collapse to our own copy rather than becoming it.
    const injected = authErrorMessage("<img src=x onerror=alert(1)>");
    assert.equal(injected, authErrorMessage("unknown"));
    assert.ok(!injected?.includes("<img"));
  });
});
