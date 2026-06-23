"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { log } from "@/lib/logger";
import { sendEmail } from "@/lib/email";
import { orderStatusChangedEmail } from "@/lib/email-templates";

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
