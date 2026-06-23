import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the supabase client. The helper uses one chained call:
// .from("reviews").select(...).in(...). We capture the input ids
// so the tests can assert on the deduplication logic.
const mockIn = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

import { loadSellerRatings } from "./seller-ratings";

describe("loadSellerRatings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ in: mockIn });
  });

  it("returns an empty map when no seller ids are passed", async () => {
    const out = await loadSellerRatings([]);
    expect(out.size).toBe(0);
    // No supabase call should be made — saving a round-trip for the
    // empty-cart case.
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("deduplicates repeated seller ids before querying", async () => {
    // The same seller appears twice in the input. The helper should
    // only pass one id to .in(), not the duplicated list.
    mockIn.mockResolvedValueOnce({ data: [], error: null });
    await loadSellerRatings(["seller-a", "seller-a", "seller-b"]);
    expect(mockIn).toHaveBeenCalledTimes(1);
    const idsArg = mockIn.mock.calls[0][1];
    expect(new Set(idsArg)).toEqual(new Set(["seller-a", "seller-b"]));
    expect(idsArg.length).toBe(2);
  });

  it("strips empty / falsy ids from the query", async () => {
    // A cart row whose seller_id never loaded (e.g. a deleted
    // product) shouldn't poison the .in() call.
    mockIn.mockResolvedValueOnce({ data: [], error: null });
    await loadSellerRatings(["seller-a", "", null as unknown as string, undefined as unknown as string]);
    const idsArg = mockIn.mock.calls[0][1];
    expect(idsArg).toEqual(["seller-a"]);
  });

  it("reduces multiple reviews per seller to an average", async () => {
    // 3 reviews for seller-a (5+4+3 = 12/3 = 4.0)
    // 2 reviews for seller-b (1+5 = 6/2 = 3.0)
    // 1 review for seller-c (4)
    mockIn.mockResolvedValueOnce({
      data: [
        { seller_id: "seller-a", rating: 5 },
        { seller_id: "seller-a", rating: 4 },
        { seller_id: "seller-a", rating: 3 },
        { seller_id: "seller-b", rating: 1 },
        { seller_id: "seller-b", rating: 5 },
        { seller_id: "seller-c", rating: 4 },
      ],
      error: null,
    });
    const out = await loadSellerRatings(["seller-a", "seller-b", "seller-c"]);
    expect(out.get("seller-a")).toEqual({ average: 4.0, count: 3 });
    expect(out.get("seller-b")).toEqual({ average: 3.0, count: 2 });
    expect(out.get("seller-c")).toEqual({ average: 4.0, count: 1 });
  });

  it("omits sellers with no reviews from the map", async () => {
    // A seller in the input list who has no reviews shouldn't
    // appear in the result — callers render "No reviews yet" for
    // missing keys rather than inferring a count.
    mockIn.mockResolvedValueOnce({
      data: [{ seller_id: "seller-a", rating: 5 }],
      error: null,
    });
    const out = await loadSellerRatings(["seller-a", "seller-b"]);
    expect(out.has("seller-a")).toBe(true);
    expect(out.has("seller-b")).toBe(false);
  });

  it("fails open: returns an empty map on supabase error", async () => {
    // The cart page must not crash if reviews are unreachable.
    // The chip falls back to "No reviews yet" when the entry is
    // missing.
    mockIn.mockResolvedValueOnce({ data: null, error: { message: "db down" } });
    const out = await loadSellerRatings(["seller-a"]);
    expect(out.size).toBe(0);
  });
});
