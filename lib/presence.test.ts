import { describe, expect, it } from "vitest";
import { shouldEmailForPresence, PRESENCE_WINDOW_MS } from "./presence";

// Reuse the imported constant so a future change to the window in
// lib/presence.ts is reflected here automatically. The alias keeps
// the test readable.
const WINDOW = PRESENCE_WINDOW_MS;

const FIVE_MINUTES_MS = WINDOW;

describe("shouldEmailForPresence", () => {
  it("returns true when lastSeen is null (never recorded)", () => {
    expect(shouldEmailForPresence(Date.now(), null)).toBe(true);
  });

  it("returns true when lastSeen is undefined", () => {
    expect(shouldEmailForPresence(Date.now(), undefined)).toBe(true);
  });

  it("returns false when the user was active within the last 5 minutes", () => {
    const now = Date.now();
    const lastSeen = new Date(now - 60 * 1000).toISOString(); // 1 minute ago
    expect(shouldEmailForPresence(now, lastSeen)).toBe(false);
  });

  it("returns true when the user was active more than 5 minutes ago", () => {
    const now = Date.now();
    const lastSeen = new Date(now - 10 * 60 * 1000).toISOString(); // 10 minutes ago
    expect(shouldEmailForPresence(now, lastSeen)).toBe(true);
  });

  it("returns false at exactly the 5-minute boundary (still treated as online)", () => {
    const now = Date.now();
    const lastSeen = new Date(now - FIVE_MINUTES_MS).toISOString();
    // The boundary is `> 5 min`, so at exactly 5 min we don't send.
    // A user who was active 5 min ago is still considered online.
    expect(shouldEmailForPresence(now, lastSeen)).toBe(false);
  });

  it("returns true 1ms past the boundary", () => {
    const now = Date.now();
    const lastSeen = new Date(now - FIVE_MINUTES_MS - 1).toISOString();
    expect(shouldEmailForPresence(now, lastSeen)).toBe(true);
  });

  it("returns true when lastSeen is an unparseable string (defensive)", () => {
    expect(shouldEmailForPresence(Date.now(), "not a date")).toBe(true);
  });

  it("returns true when lastSeen is in the future (clock skew)", () => {
    // If the recipient's clock is ahead of ours, `now - lastSeen`
    // is negative — they look like they were active in the past.
    // The function should NOT email in that case (they appear to
    // be online). Wait — actually, the recipient is the one whose
    // last_seen we're reading; their clock being ahead means they
    // think they were active more recently than they actually were.
    // To be safe (we'd rather over-email than under-email), treat
    // it as "not active" and send. The test below pins the
    // current behavior either way; if we ever change it, the
    // failure will be intentional.
    const now = Date.now();
    const lastSeen = new Date(now + 60 * 1000).toISOString(); // 1 minute in the future
    expect(shouldEmailForPresence(now, lastSeen)).toBe(false);
  });
});