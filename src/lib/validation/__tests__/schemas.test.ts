import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  displayNameSchema,
  emailSchema,
  passwordSchema,
  signUpSchema,
} from "@/lib/validation/schemas";

describe("emailSchema", () => {
  it("trims and lowercases", () => {
    assert.equal(emailSchema.parse("  Founder@Example.COM "), "founder@example.com");
  });

  it("refuses what is not an address", () => {
    for (const value of ["", "   ", "founder", "founder@", "@example.com"]) {
      assert.equal(emailSchema.safeParse(value).success, false, `accepted: ${value}`);
    }
  });
});

describe("passwordSchema", () => {
  it("asks for length and nothing else", () => {
    assert.equal(passwordSchema.safeParse("correct horse battery").success, true);
    assert.equal(passwordSchema.safeParse("short").success, false);
    // bcrypt truncates past 72 bytes, so a longer one is silently not what the
    // person typed.
    assert.equal(passwordSchema.safeParse("x".repeat(73)).success, false);
  });
});

describe("displayNameSchema", () => {
  it("trims, and refuses empty or oversized", () => {
    assert.equal(displayNameSchema.parse("  Alex  "), "Alex");
    assert.equal(displayNameSchema.safeParse("   ").success, false);
    assert.equal(displayNameSchema.safeParse("x".repeat(81)).success, false);
    // The same bound the database check constraint enforces.
    assert.equal(displayNameSchema.safeParse("x".repeat(80)).success, true);
  });
});

describe("signUpSchema", () => {
  it("treats the name as optional", () => {
    const parsed = signUpSchema.safeParse({
      email: "founder@example.com",
      password: "correct horse battery",
    });
    assert.equal(parsed.success, true);
    assert.equal(parsed.data?.displayName, undefined);
  });

  it("has no field for a role", () => {
    const parsed = signUpSchema.safeParse({
      email: "founder@example.com",
      password: "correct horse battery",
      role: "admin",
    });
    // Zod strips unknown keys rather than failing, which is the behaviour that
    // matters: nothing a signup form sends can reach the role column, and the
    // parsed object has no `role` on it to pass along by accident.
    assert.equal(parsed.success, true);
    assert.ok(!("role" in (parsed.data ?? {})));
  });
});
