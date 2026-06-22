"use server";

import { createClient } from "@/utils/supabase/server";
import { z } from "zod";
import { SupabaseClient } from "@supabase/supabase-js";

const ReviewSchema = z.object({
  sellerId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function submitReviewAction(formData: {
  sellerId: string;
  rating: number;
  comment: string;
}) {
  const supabase = await createClient();

  // 1. Validate input
  const validation = ReviewSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false, error: "Invalid review data" };
  }

  // 2. Verify user session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "You must be logged in to leave a review" };
  }

  // 3. Check if user is a buyer
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier, full_name')
    .eq('id', user.id)
    .single();

  if (profile?.tier !== 'individual') {
    return { success: false, error: "Only buyers can leave reviews" };
  }

  // 4. Verify the user has a completed order containing a product from
  //    this seller. The orders schema has `buyer_id` (not `user_id`) on
  //    the orders table, and line items live in a separate
  //    `order_items` table — so we need a two-step fetch plus a final
  //    seller lookup. (See app/buyer-dashboard/page.tsx for the same
  //    pattern.) The previous version filtered on `user_id` and tried
  //    to embed a non-existent `items` column, which silently matched
  //    nothing and blocked every legitimate reviewer.
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id')
    .eq('buyer_id', user.id)
    .eq('status', 'completed');

  if (ordersError) return { success: false, error: "Error verifying purchase history" };

  const orderIds = (orders ?? []).map((o) => o.id);
  if (orderIds.length === 0) {
    return { success: false, error: "You must have completed a purchase from this seller to leave a review" };
  }

  const hasPurchased = await verifyPurchase(supabase, orderIds, formData.sellerId);
  if (!hasPurchased) {
    return { success: false, error: "You must have completed a purchase from this seller to leave a review" };
  }

  // 5. Prevent duplicate reviews
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('seller_id', formData.sellerId)
    .eq('reviewer_id', user.id)
    .single();

  if (existingReview) {
    return { success: false, error: "You have already reviewed this seller" };
  }

  // 6. Insert review
  const { error: insertError } = await supabase
    .from('reviews')
    .insert({
      seller_id: formData.sellerId,
      reviewer_id: user.id,
      rating: formData.rating,
      comment: formData.comment,
      reviewer_name: profile?.full_name || user.email?.split('@')[0] || 'Customer'
    });

  if (insertError) return { success: false, error: insertError.message };

  return { success: true };
}

/**
 * Check whether ANY of the supplied completed orders contains a
 * product sold by `sellerId`. Two-step fetch: pull the product ids
 * from `order_items`, then resolve their sellers in one query. The
 * previous implementation did one product lookup per order item
 * (N+1) and assumed an `items` column on the orders table.
 */
async function verifyPurchase(
  supabase: SupabaseClient,
  orderIds: string[],
  sellerId: string
): Promise<boolean> {
  if (orderIds.length === 0) return false;

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('product_id')
    .in('order_id', orderIds);

  if (itemsError || !items || items.length === 0) return false;

  // De-dup product ids before the seller lookup — the same product
  // can appear across multiple line items / orders.
  const productIds = Array.from(new Set(items.map((i) => i.product_id)));
  if (productIds.length === 0) return false;

  const { data: products } = await supabase
    .from('products')
    .select('id, seller_id')
    .in('id', productIds);

  if (!products) return false;

  return products.some((p) => p.seller_id === sellerId);
}
