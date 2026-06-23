"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { log } from "@/lib/logger";
import { sendEmail } from "@/lib/email";
import { orderStatusChangedEmail } from "@/lib/email-templates";

interface PlaceOrderItem {
  productId: string;
  quantity: number;
}

/**
 * Server-side order placement. The previous flow had the client
 * computing the total from `cartItem.price` and writing the orders
 * row with that total — which meant a buyer who tampered with their
 * localStorage cart could pay any amount they liked (or zero) and
 * still get an order row created. This action ignores the client's
 * cart and re-fetches the canonical price for every product from
 * the database. The total_amount written to the orders row is the
 * sum of those server-fetched prices, and that same number is the
 * only one the client gets back to send to Paystack.
 *
 * Stock is checked inline by reading the products row. The
 * decrement itself is atomic on the verify route (via the
 * `decrement_product_stock` RPC, see migration 0013), so the
 * check-then-decrement window is closed there. Here we just need
 * a quick yes/no for the buyer before we burn a Paystack init.
 *
 * Returns the new order id and the canonical total so the client
 * can pass them to the Paystack initialize endpoint.
 */
export async function placeOrderAction(
  items: PlaceOrderItem[],
): Promise<
  | { success: true; orderId: string; totalAmount: number }
  | { success: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in" };

  if (!items || items.length === 0) {
    return { success: false, error: "Cart is empty" };
  }

  // Coalesce duplicate product ids. The cart is a client-side store
  // and a buyer could in theory add the same product twice via two
  // browser tabs. Server-side we want one row per product.
  const byProduct = new Map<string, number>();
  for (const item of items) {
    if (!item.productId || !Number.isFinite(item.quantity) || item.quantity < 1) {
      return { success: false, error: "Invalid cart item" };
    }
    byProduct.set(
      item.productId,
      (byProduct.get(item.productId) ?? 0) + Math.floor(item.quantity),
    );
  }
  const productIds = Array.from(byProduct.keys());

  // Re-read every product from the database in one round-trip. This
  // is the canonical price + stock check; we deliberately do not
  // trust any price the client sent.
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, price, stock, name")
    .in("id", productIds);

  if (productsError) return { success: false, error: productsError.message };
  if (!products || products.length !== productIds.length) {
    // Either a product was deleted, the user is probing, or RLS hid
    // a row. Don't leak which one — just say a product is missing.
    return { success: false, error: "One or more products are no longer available" };
  }

  // Validate stock and compute the canonical total.
  let totalAmount = 0;
  const lineItems: { product_id: string; quantity: number; price_at_purchase: number }[] = [];
  for (const product of products) {
    const qty = byProduct.get(product.id) ?? 0;
    if (qty <= 0) continue;
    if ((product.stock ?? 0) < qty) {
      return {
        success: false,
        error: `Insufficient stock for ${product.name}. Only ${product.stock ?? 0} left.`,
      };
    }
    // `Number(price)` defensively: prices in the DB are numeric and
    // should always be numbers, but a hand-edited row could be a
    // string. Math on a string silently coerces to NaN which would
    // propagate through the total — refuse rather than send NaN to
    // Paystack.
    const price = Number(product.price);
    if (!Number.isFinite(price) || price < 0) {
      log.error("place_order_invalid_price", { productId: product.id, price: product.price });
      return { success: false, error: `Invalid price for ${product.name}` };
    }
    totalAmount += price * qty;
    lineItems.push({
      product_id: product.id,
      quantity: qty,
      price_at_purchase: price,
    });
  }

  if (lineItems.length === 0) {
    return { success: false, error: "Cart is empty" };
  }

  // Create the order row first, then the line items. RLS gates the
  // insert: a buyer can only insert an order with their own id.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      buyer_id: user.id,
      total_amount: totalAmount,
      status: "pending",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return {
      success: false,
      error: orderError?.message ?? "Failed to create order",
    };
  }

  const orderItemsWithOrderId = lineItems.map((li) => ({
    ...li,
    order_id: order.id,
  }));
  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItemsWithOrderId);

  if (itemsError) {
    // The order row exists but the line items didn't. Best-effort
    // cleanup: mark the order as cancelled so the buyer doesn't see
    // a paid-looking order with no contents. The verify route's
    // already-completed short-circuit won't trigger because we set
    // status='cancelled' (not 'completed') and the route only
    // short-circuits on 'completed'.
    log.error("place_order_items_insert_failed", {
      orderId: order.id,
      message: itemsError.message,
    });
    await supabase.from("orders").update({ status: "cancelled" }).eq("id", order.id);
    return { success: false, error: "Failed to record order items" };
  }

  return { success: true, orderId: order.id, totalAmount };
}

/**
 * Server-side order status update. Replaces the previous client-side
 * `supabase.from('orders').update(...)` call in useDashboardData.
 *
 * Why this is a server action: the email trigger needs to run in a
 * place where it can read the buyer's email and write to the order
 * row in the same handler. The client SDK doesn't have admin access
 * to auth.users; the server action does, through `createClient` (the
 * cookie-bound client — RLS still applies) and `createAdminClient`
 * (the service-role client — bypasses RLS).
 *
 * Returns { success, error? }. The dashboard hook treats the
 * response the same way it treated the previous supabase update
 * result: on failure, revert the optimistic update and surface a
 * toast.
 */
export async function updateOrderStatusAction(
  orderId: string,
  newStatus: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in" };

  // 1. Verify the caller has a relationship to this order (a row
  //    in order_items for one of their products). RLS would catch
  //    this too, but a pre-check lets us return a clearer error
  //    message and avoids logging on benign RLS denials.
  const { data: lineCheck, error: lineError } = await supabase
    .from("order_items")
    .select("order_id, product:product_id(seller_id)")
    .eq("order_id", orderId)
    .limit(1);
  if (lineError) return { success: false, error: lineError.message };
  if (!lineCheck || lineCheck.length === 0) {
    return { success: false, error: "Order not found" };
  }

  // 2. Update the order. RLS will block if the caller isn't a
  //    seller of one of the line items — same gate as the pre-check,
  //    but the RLS policy is the source of truth.
  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId);
  if (updateError) return { success: false, error: updateError.message };

  // 3. Fire the email to the buyer. We need the buyer's email and
  //    first name, which means going through auth.users. The
  //    cookie-bound client doesn't have that access — the user
  //    can only see their own row. Use the admin client to look up
  //    the buyer's email, then go back to the cookie-bound client
  //    for the profile row (RLS lets the buyer be read by the
  //    seller of one of their order_items, but using the admin
  //    client is simpler and the seller-dashboard context already
  //    trusts the admin client for similar lookups).
  void (async () => {
    try {
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseServiceKey || !supabaseUrl) {
        log.error("email_status_admin_env_missing", { orderId });
        return;
      }
      const admin = createAdminClient(supabaseUrl, supabaseServiceKey);

      const { data: order, error: orderError } = await admin
        .from("orders")
        .select("buyer_id")
        .eq("id", orderId)
        .maybeSingle();
      if (orderError || !order) {
        log.error("email_status_buyer_lookup_failed", {
          orderId,
          message: orderError?.message,
        });
        return;
      }

      const { data: buyer, error: buyerError } = await admin.auth.admin.getUserById(order.buyer_id);
      if (buyerError || !buyer?.user?.email) {
        log.error("email_status_buyer_email_missing", { orderId, buyerId: order.buyer_id });
        return;
      }

      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", order.buyer_id)
        .maybeSingle();
      if (profileError) {
        log.error("email_status_profile_lookup_failed", {
          orderId,
          message: profileError.message,
        });
        return;
      }

      const buyerName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() || "there";
      const tpl = orderStatusChangedEmail({ buyerName, orderId, status: newStatus });
      await sendEmail({ to: buyer.user.email, subject: tpl.subject, html: tpl.html });
    } catch (e) {
      log.error("email_status_threw", {
        orderId,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  })();

  revalidatePath("/seller-dashboard");
  revalidatePath("/artisan-dashboard");
  revalidatePath(`/orders/${orderId}`);
  return { success: true };
}
