import { describe, expect, it } from "vitest";
import { registerSchema } from "./validations";

// Smoke test for the registration schema. The "what do you sell?"
// field was added in a later round (business-category pre-fill) and
// the refine has a non-trivial interaction with the tier — it's the
// kind of thing that silently regresses when someone reorders the
// refines or drops a branch. Pin the contract here so a future
// edit can't quietly let a business signup through with a blank
// category.
describe("registerSchema — businessCategory refine", () => {
  const base = {
    firstName: "Chidi",
    lastName: "Okonkwo",
    email: "chidi@example.com",
    phone: "08012345678",
    password: "secret123",
    confirmPassword: "secret123",
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
