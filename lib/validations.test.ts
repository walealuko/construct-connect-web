import { describe, expect, it } from "vitest";
import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  passwordSchema,
  registerSchema,
  scorePassword,
} from "./validations";

// Smoke tests for the registration schema. The "what do you sell?"
// field and the password policy were added in later rounds — both
// have non-trivial interactions with the rest of the schema
// (tier-aware for businessCategory, length + character-class for
// password) and both are the kind of thing that silently regresses
// when someone reorders the refines or drops a branch. Pin the
// contracts here so a future edit can't quietly let a business
// signup through with a blank category, or accept a 6-character
// password.

// A password that satisfies the 9–15 + ≥1-special rule. The form
// tests in app/actions/auth.test.ts use the same string so any
// future relaxation/tightening of the policy only has to be
// reflected in one place. Pinned to a 12-char string with upper,
// lower, digit, and `!`.
const COMPLIANT_PASSWORD = "Sup3rSecret!";

describe("registerSchema — businessCategory refine", () => {
  const base = {
    firstName: "Chidi",
    lastName: "Okonkwo",
    email: "chidi@example.com",
    phone: "08012345678",
    password: COMPLIANT_PASSWORD,
    confirmPassword: COMPLIANT_PASSWORD,
    location: "Lagos",
  };

  it("accepts an individual signup with no businessCategory", () => {
    const result = registerSchema.safeParse({ ...base, tier: "individual" });
    expect(result.success).toBe(true);
  });

  it("accepts a business signup with a businessCategory", () => {
    const result = registerSchema.safeParse({
      ...base,
      tier: "business",
      businessName: "Chidi Hotels Ltd",
      businessCategory: "General",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a business signup with a blank businessCategory", () => {
    const result = registerSchema.safeParse({
      ...base,
      tier: "business",
      businessName: "Chidi Hotels Ltd",
      businessCategory: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.issues.map((i) => i.path[0]);
      expect(fieldErrors).toContain("businessCategory");
    }
  });

  it("rejects an artisan signup with a blank businessCategory", () => {
    const result = registerSchema.safeParse({
      ...base,
      tier: "artisan",
      businessName: "Chidi the Electrician",
      businessCategory: "   ",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.issues.map((i) => i.path[0]);
      expect(fieldErrors).toContain("businessCategory");
    }
  });
});

describe("passwordSchema — registration password policy", () => {
  // 9–15 chars + ≥1 special character. The rules are split into
  // three separate refines so a future edit can't accidentally
  // short-circuit the special-character check with the length
  // error. Each test pins one rule in isolation.

  it("accepts a password that meets all three rules", () => {
    // 12 chars, has upper/lower/digit/special — the happy path.
    const result = passwordSchema.safeParse(COMPLIANT_PASSWORD);
    expect(result.success).toBe(true);
  });

  it("rejects a password shorter than the minimum", () => {
    // 8 chars, has special — fails length, not special.
    const result = passwordSchema.safeParse("Abcd1!@$");
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain(
        `Password must be at least ${PASSWORD_MIN} characters`,
      );
    }
  });

  it("rejects a password longer than the maximum", () => {
    // 16 chars, has special — fails length, not special. The
    // upper cap blocks long passphrases per the project owner's
    // explicit choice; see README.md > Security.
    const result = passwordSchema.safeParse("Sup3rSecret!extra");
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain(
        `Password must be at most ${PASSWORD_MAX} characters`,
      );
    }
  });

  it("rejects a password with no special character", () => {
    // 12 chars, no special — fails the character-class check.
    const result = passwordSchema.safeParse("Sup3rSecretXy");
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain(
        "Password must include at least one special character",
      );
    }
  });

  it("accepts the boundary value of exactly the minimum length", () => {
    // 9 chars + 1 special — exactly the lower bound. Without
    // this test, a future off-by-one in `.min()` would slip
    // through (8-char passwords would be accepted silently).
    const result = passwordSchema.safeParse("Abcdef1!$");
    expect(result.success).toBe(true);
  });

  it("accepts the boundary value of exactly the maximum length", () => {
    // 15 chars + 1 special — exactly the upper bound. Same
    // off-by-one concern as the minimum test. Recount:
    // A-b-c-d-e-f-g-h-i-j-1-2-3-4-! = 15.
    const result = passwordSchema.safeParse("Abcdefghij1234!");
    expect(result.success).toBe(true);
  });
});

describe("scorePassword", () => {
  // The form's strength meter reads this. The Zod schema is the
  // authoritative gate (a score of 0 means the form should
  // disable the submit button); a score of 1 or 2 just changes
  // the meter color and label. Pin the scoring rules so a
  // refactor that flips the boundary can't quietly let a
  // borderline password through the disabled-submit check.

  it("returns 0 for an out-of-bounds length", () => {
    expect(scorePassword("Ab1!")).toBe(0); // too short
    expect(scorePassword("Abcdefghijklmnop1!")).toBe(0); // too long
  });

  it("returns 0 for a length-valid password with no special character", () => {
    // 12 chars, no special — same case that fails the Zod
    // schema. The meter should also read "weak" so the
    // disabled-submit gate agrees with the server rule.
    expect(scorePassword("Sup3rSecretXy")).toBe(0);
  });

  it("returns 1 for a valid password with only two character classes", () => {
    // 12 chars, has special, but only lower + upper (no digit).
    expect(scorePassword("AbcdefGhijK!")).toBe(1);
  });

  it("returns 2 for a valid password with three character classes", () => {
    // 12 chars, has upper + lower + digit + special — all four
    // classes. The meter should read "strong".
    expect(scorePassword(COMPLIANT_PASSWORD)).toBe(2);
  });

  it("returns 0 for the empty string", () => {
    // The meter renders nothing when the field is empty, but
    // the function should still be safe to call with `""` —
    // some forms pass through a cleared field.
    expect(scorePassword("")).toBe(0);
  });
});
