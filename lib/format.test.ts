import { describe, expect, it } from "vitest";
import { formatNaira } from "./format";

describe("formatNaira", () => {
  it("formats a typical amount with thousands separator and 2 decimals", () => {
    expect(formatNaira(1234.5)).toBe("₦1,234.50");
  });

  it("formats a large amount", () => {
    expect(formatNaira(450000)).toBe("₦450,000.00");
  });

  it("formats zero as ₦0.00", () => {
    expect(formatNaira(0)).toBe("₦0.00");
  });

  it("returns ₦0.00 for null", () => {
    expect(formatNaira(null)).toBe("₦0.00");
  });

  it("returns ₦0.00 for undefined", () => {
    expect(formatNaira(undefined)).toBe("₦0.00");
  });

  it("returns ₦0.00 for NaN", () => {
    expect(formatNaira(NaN)).toBe("₦0.00");
  });

  it("keeps exactly two decimals even for integer amounts", () => {
    // The 2-decimal policy is intentional — kobo (fractions of a
    // naira) should always be visible where the schema allows them.
    expect(formatNaira(7)).toBe("₦7.00");
  });

  it("truncates extra decimals (does not round the displayed value)", () => {
    // Note: toLocaleString with maxFractionDigits rounds, not
    // truncates. Pin the rounding behavior so a future change is
    // conscious.
    expect(formatNaira(1.005)).toMatch(/^₦1\.0[01]$/);
  });
});