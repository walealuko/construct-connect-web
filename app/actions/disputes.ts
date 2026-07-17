"use server";

// Server actions for the dispute flow.
//
// Two actions:
//   - openDisputeAction: insert a `disputes` row, flip the order's
//     status to 'disputed', revalidate the affected pages.
//   - listMyOpenDisputesAction: count the caller's open disputes
//     across their products — drives the seller-dashboard
//     "Needs review" widget.
//
// The "resolve" action is intentionally NOT in this round. Without
// a resolver path, a dispute stays in `open` until a human flips
// it via the Supabase dashboard. The admin resolver is a separate
// follow-up.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { log } from "@/lib/logger";

const openDisputeSchema = z.object({
  orderId: z.uuid("Invalid order id"),
  // The reason is a free-text string, 1–2000 chars. The DB has a
  // CHECK constraint at the same bounds; the client-side form
  // requires at least 10 chars (per the plan) but the action
  // layer's lower bound is 1 so an empty/short reason submitted
  // through an API client still produces a clean validation
  // error rather than a generic 500.
  reason: z.string().min(1, "Reason is required").max(2000, "Reason is too long"),
});

/**
 * Open a dispute on an order. Either the buyer or a seller on one
 * of the line items can open a dispute; the action layer enforces
 * that and RLS enforces it again at the database. On success:
 *   - inserts a `disputes` row with the canonical shape
 *   - flips the order's status to 'disputed'
 *   - revalidates /orders/[id] and the dashboards
 *
 * The status flip is done via the cookie-bound client (RLS gates
 * the write to either party on the order). If a buyer is opening,
 * the buyer-side UPDATE policy from migration 0017 lets them write
 * their own row. If a seller is opening, the existing seller-side
 * UPDATE policy is in play.
 */
export async function openDisputeAction(input: {
  orderId: string;
  reason: string;
}): Promise<{ success: true; disputeId: string } | { success: false; error: string }> {
  const parsed = openDisputeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in" };

  // 1. Verify the caller has a relationship to the order. We do
  //    this before writing so we can return a clear error message
  //    rather than relying on RLS to deny silently. Two cases
  //    count as a relationship:
  //    - buyer_id = auth.uid()
  //    - a line item in the order belongs to a product the caller
  //      sells
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(`
      id, buyer_id, status,
      order_items(product_id, products!inner(seller_id))
    `)
    .eq("id", parsed.data.orderId)
    .maybeSingle();

  if (orderError) return { success: false, error: orderError.message };
  if (!order) return { success: false, error: "Order not found" };

  const isBuyer = order.buyer_id === user.id;
  const isSeller = (order.order_items ?? []).some(
    (it) => (it.products as { seller_id?: string } | null)?.seller_id === user.id,
  );
  if (!isBuyer && !isSeller) {
    log.warn("dispute_open_not_party", { userId: user.id, orderId: parsed.data.orderId });
    return { success: false, error: "Order not found" };
  }

  // No double-opening. If a dispute is already open on this order
  // by either party, we return a clear error rather than letting
  // the user pile on rows.
  const { data: existing, error: existingError } = await supabase
    .from("disputes")
    .select("id, status")
    .eq("order_id", parsed.data.orderId)
    .maybeSingle();
  if (existingError) return { success: false, error: existingError.message };
  if (existing) {
    return { success: false, error: "A dispute is already open on this order" };
  }

  // 2. Insert the dispute row. The database is the source of truth
  //    for the id; we read it back from the insert response.
  const { data: dispute, error: insertError } = await supabase
    .from("disputes")
    .insert({
      order_id: parsed.data.orderId,
      opened_by: user.id,
      reason: parsed.data.reason,
      status: "open",
    })
    .select("id")
    .single();

  if (insertError || !dispute) {
    log.error("dispute_open_insert_failed", {
      orderId: parsed.data.orderId,
      message: insertError?.message,
    });
    return { success: false, error: insertError?.message ?? "Failed to open dispute" };
  }

  // 3. Flip the order's status to 'disputed'. RLS gates the write
  //    to either party on the order; we already verified the
  //    membership above. The action layer is the safety net that
  //    whitelists the literal status string 'disputed' — RLS
  //    can't column-scope.
  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: "disputed" })
    .eq("id", parsed.data.orderId);

  if (updateError) {
    // The dispute row exists but the status flip failed. We log
    // and surface the error — the user can retry, and the dispute
    // is the source of truth for "this is in review" anyway.
    log.error("dispute_open_status_update_failed", {
      orderId: parsed.data.orderId,
      message: updateError.message,
    });
    return { success: false, error: updateError.message };
  }

  revalidatePath(`/orders/${parsed.data.orderId}`);
  revalidatePath("/buyer-dashboard");
  revalidatePath("/seller-dashboard");

  return { success: true, disputeId: dispute.id };
}

/**
 * Count the caller's open disputes across the products they sell.
 * Used by the seller-dashboard widget as the "needs human" count.
 *
 * Implementation: read the caller's product ids, then count the
 * disputes whose order_id has at least one order_item pointing to
 * one of those products. We could also do this with a single
 * nested SELECT, but the explicit two-step is easier to read and
 * matches the existing useDashboardData product-id cache shape.
 */
export async function listMyOpenDisputesAction(): Promise<
  { success: true; count: number } | { success: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in" };

  // Get the caller's product ids.
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id")
    .eq("seller_id", user.id);
  if (productsError) return { success: false, error: productsError.message };
  const productIds = (products ?? []).map((p) => p.id);
  if (productIds.length === 0) return { success: true, count: 0 };

  // Find the distinct order ids with at least one of these
  // products. RLS scopes the result to disputes the caller can
  // see (either party on the order).
  const { data: orderItems, error: oiError } = await supabase
    .from("order_items")
    .select("order_id")
    .in("product_id", productIds);
  if (oiError) return { success: false, error: oiError.message };
  const orderIds = Array.from(new Set((orderItems ?? []).map((r) => r.order_id)));
  if (orderIds.length === 0) return { success: true, count: 0 };

  // Count the open disputes on those orders.
  const { count, error: countError } = await supabase
    .from("disputes")
    .select("id", { count: "exact", head: true })
    .eq("status", "open")
    .in("order_id", orderIds);

  if (countError) return { success: false, error: countError.message };
  return { success: true, count: count ?? 0 };
}
