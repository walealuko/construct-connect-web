import { supabase } from "@/lib/supabase";

/**
 * Aggregate stats for one seller's reviews.
 */
export interface SellerRatingSummary {
  average: number; // 0..5
  count: number;
}

/**
 * Map of sellerId -> rating summary. Sellers with no reviews are
 * absent from the map (callers should render a "No reviews yet"
 * placeholder rather than inferring from a missing key).
 */
export type SellerRatingsMap = Map<string, SellerRatingSummary>;

/**
 * Fetch reviews for many sellers in one query. Two-step:
 * 1. Pull every review row whose seller_id is in the input list.
 * 2. Reduce them to per-seller averages client-side.
 *
 * One round-trip regardless of how many sellers are passed —
 * important on the cart page where a 5-line cart could span 5
 * sellers and per-row queries would be N+1.
 *
 * Returns an empty map on error. Failing open (silent empty
 * result) is fine here because the UI degrades to "No reviews
 * yet" — much better than failing the whole cart page render.
 */
export async function loadSellerRatings(
  sellerIds: string[],
): Promise<SellerRatingsMap> {
  const unique = Array.from(new Set(sellerIds.filter(Boolean)));
  if (unique.length === 0) return new Map();

  const { data, error } = await supabase
    .from("reviews")
    .select("seller_id, rating")
    .in("seller_id", unique);

  if (error || !data) {
    console.warn("loadSellerRatings failed:", error?.message);
    return new Map();
  }

  const sums = new Map<string, { sum: number; count: number }>();
  for (const row of data as { seller_id: string; rating: number }[]) {
    const prev = sums.get(row.seller_id) ?? { sum: 0, count: 0 };
    sums.set(row.seller_id, {
      sum: prev.sum + row.rating,
      count: prev.count + 1,
    });
  }

  const out: SellerRatingsMap = new Map();
  for (const [sellerId, { sum, count }] of sums) {
    out.set(sellerId, { average: sum / count, count });
  }
  return out;
}
