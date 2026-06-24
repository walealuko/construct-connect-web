import { beforeEach, describe, expect, it, vi } from "vitest";

// Build a chainable mock that returns a thenable. We use a Proxy
// that returns itself for any chain method (from/select/in/eq/etc.),
// so the test only has to set up the final awaited value. Tests
// then assert on the recorded call sequence.
const terminalValues: { data?: unknown; error?: unknown }[] = [];
let terminalIndex = 0;

const chainCalls: string[] = [];
const proxy: unknown = new Proxy(function () {}, {
  get(_target, prop) {
    if (prop === "then") {
      // Make the chain awaitable. Each `await` consumes one
      // terminal value from the queue.
      const value = terminalValues[terminalIndex] ?? { data: [], error: null };
      terminalIndex++;
      return (resolve: (v: unknown) => void) => resolve(value);
    }
    if (prop === "mock" || typeof prop === "symbol") return undefined;
    chainCalls.push(String(prop));
    return proxy;
  },
  // Methods like .in('tier', [...]) are called as functions on the
  // proxy. We just return the proxy so the chain continues.
  apply() {
    return proxy;
  },
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => proxy,
  },
}));

import { getArtisans, getArtisanById, getArtisansByCategory } from "./artisanService";

function setTerminal(value: { data?: unknown; error?: unknown }) {
  terminalValues.push(value);
}

describe("artisanService — tier scoping", () => {
  beforeEach(() => {
    chainCalls.length = 0;
    terminalValues.length = 0;
    terminalIndex = 0;
  });

  describe("getArtisans", () => {
    it("scopes the query to artisan and business tiers", async () => {
      // The service should not return buyer/admin profiles.
      // We assert the chain method sequence (select → in) is
      // present, so the SQL filter is in the WHERE clause.
      setTerminal({ data: [], error: null });
      await getArtisans();

      // Chain includes both select and in — the only way to scope
      // by tier in the PostgREST builder.
      expect(chainCalls).toContain("select");
      expect(chainCalls).toContain("in");
      // The service does not call .eq() for the all-tiers path.
      expect(chainCalls).not.toContain("eq");
    });

    it("maps the first/last name into a single display name", async () => {
      setTerminal({
        data: [
          {
            id: "u-1",
            first_name: "Ada",
            last_name: "Okafor",
            category: "Electricians",
            skills: ["wiring", "solar"],
            rate: "₦5000/hr",
            image: null,
            location: "Lagos",
            bio: "10 years experience",
          },
        ],
        error: null,
      });

      const result = await getArtisans();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "u-1",
        name: "Ada Okafor",
        category: "Electricians",
        skills: ["wiring", "solar"],
        rate: "₦5000/hr",
        // Default image when the row has no image set.
        image: "https://placehold.co/400x400?text=Artisan",
        location: "Lagos",
        bio: "10 years experience",
      });
    });

    it("falls back to 'Unknown Artisan' for blank names", async () => {
      // A real artisan whose first_name and last_name are both null
      // (possible during onboarding) still gets a name. We don't
      // want the listing to show empty cells.
      setTerminal({
        data: [
          {
            id: "u-2",
            first_name: null,
            last_name: null,
            category: null,
            skills: null,
            rate: null,
            image: null,
            location: null,
            bio: null,
          },
        ],
        error: null,
      });

      const result = await getArtisans();
      expect(result[0].name).toBe("Unknown Artisan");
      expect(result[0].category).toBe("General");
      expect(result[0].skills).toEqual([]);
      expect(result[0].location).toBe("Unknown");
    });
  });

  describe("getArtisanById", () => {
    it("scopes by tier and uses maybeSingle for safe lookup", async () => {
      // The previous implementation used .single() and returned
      // any profile row matching the id. We assert that the tier
      // filter is part of the chain and that we don't 500 on a
      // missing row.
      setTerminal({ data: null, error: null });
      await expect(getArtisanById("victim-id")).rejects.toThrow("Artisan not found");

      // Tier filter is applied via .in() on the chain.
      expect(chainCalls).toContain("in");
      // id filter is applied via .eq() after the tier filter.
      expect(chainCalls).toContain("eq");
      // Final lookup uses maybeSingle, not single — so a missing
      // row surfaces as "not found" rather than a 500.
      expect(chainCalls).toContain("maybeSingle");
      expect(chainCalls).not.toContain("single");
    });

    it("returns a buyer profile lookup as 'not found'", async () => {
      // Regression for the bug where /artisans/<buyer-id> rendered
      // the buyer as if they were an artisan.
      setTerminal({ data: null, error: null });
      await expect(getArtisanById("buyer-id")).rejects.toThrow("Artisan not found");
    });
  });

  describe("getArtisansByCategory", () => {
    it("applies both tier and category filters", async () => {
      setTerminal({ data: [], error: null });
      await getArtisansByCategory("Plumbers");

      // Both filters must be on the chain.
      expect(chainCalls).toContain("in");
      expect(chainCalls).toContain("eq");
    });
  });
});
