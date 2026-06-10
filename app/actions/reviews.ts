"use server";

import { createClient } from "@/utils/supabase/server";
import { z } from "zod";
import { SupabaseClient } from "@supabase/supabase-js";
import { Order, OrderItem } from "@/types/database";

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

  // 4. Verify the user has a completed order from this seller
  // We need to find if any product in any of the user's orders belongs to the seller
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('items')
    .eq('user_id', user.id)
    .eq('status', 'completed');

  if (ordersError) return { success: false, error: "Error verifying purchase history" };

  const hasPurchased = await verifyPurchase(supabase, (orders || []) as any, formData.sellerId);
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

async function verifyPurchase(supabase: SupabaseClient, orders: { items: OrderItem[] }[], sellerId: string) {
  for (const order of orders) {
    const items = order.items || [];
    for (const item of items) {
      const { data: product } = await supabase
        .from('products')
        .select('seller_id')
        .eq('id', item.product_id)
        .single();

      if (product?.seller_id === sellerId) return true;
    }
  }
  return false;
}
