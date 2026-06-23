import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { take, __resetForTests } from "./rateLimit";

describe("take (rate limiter)", () => {
  beforeEach(() => {
    __resetForTests();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to `limit` calls in a window", () => {
    for (let i = 0; i < 5; i++) {
      expect(take("k", 5, 60_000)).toBe(true);
    }
  });

  it("refuses the (limit+1)th call within the window", () => {
    for (let i = 0; i < 5; i++) take("k", 5, 60_000);
    expect(take("k", 5, 60_000)).toBe(false);
  });

  it("refuses again on subsequent calls until the window resets", () => {
    for (let i = 0; i < 5; i++) take("k", 5, 60_000);
    expect(take("k", 5, 60_000)).toBe(false);
    expect(take("k", 5, 60_000)).toBe(false);
  });

  it("resets after the window elapses", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    for (let i = 0; i < 5; i++) take("k", 5, 60_000);
    expect(take("k", 5, 60_000)).toBe(false);

    // Advance past the 60s window.
    vi.setSystemTime(new Date("2026-01-01T00:01:01Z"));
    expect(take("k", 5, 60_000)).toBe(true);
  });

  it("treats different keys as independent buckets", () => {
    for (let i = 0; i < 5; i++) take("ip-a", 5, 60_000);
    // ip-a is exhausted…
    expect(take("ip-a", 5, 60_000)).toBe(false);
    // …but ip-b has its own bucket.
    expect(take("ip-b", 5, 60_000)).toBe(true);
  });

  it("__resetForTests clears state", () => {
    for (let i = 0; i < 5; i++) take("k", 5, 60_000);
    expect(take("k", 5, 60_000)).toBe(false);
    __resetForTests();
    expect(take("k", 5, 60_000)).toBe(true);
  });
});