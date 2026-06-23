import { describe, expect, it } from "vitest";
import { expectedKoboFromTotal } from "../route";

describe("expectedKoboFromTotal", () => {
  it("converts a typical naira total to kobo", () => {
    expect(expectedKoboFromTotal(7500)).toBe(750000);
  });

  it("converts a non-integer naira total to kobo", () => {
    // 1234.567 naira = 123456.7 kobo. Paystack accepts integer kobo,
    // so we round to 123457 — not 123456 (floor) and not 123456
    // (truncate). A regression here would silently under- or
    // over-charge by up to 1 kobo per order.
    expect(expectedKoboFromTotal(1234.567)).toBe(123457);
  });

  it("returns 0 for 0", () => {
    expect(expectedKoboFromTotal(0)).toBe(0);
  });

  it("returns 0 for null", () => {
    expect(expectedKoboFromTotal(null)).toBe(0);
  });

  it("returns 0 for undefined", () => {
    expect(expectedKoboFromTotal(undefined)).toBe(0);
  });

  it("returns 0 for NaN", () => {
    expect(expectedKoboFromTotal(NaN)).toBe(0);
  });

  it("handles a large total correctly", () => {
    expect(expectedKoboFromTotal(450000)).toBe(45000000);
  });

  it("handles a small fractional total", () => {
    // 0.5 naira = 50 kobo
    expect(expectedKoboFromTotal(0.5)).toBe(50);
  });
});