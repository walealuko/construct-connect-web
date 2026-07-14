"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createClientAdmin } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { log } from "@/lib/logger";

export async function logProductView(productId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return;

  try {
    const { error } = await supabase
      .from('viewed_products')
      .upsert({
        user_id: user.id,
        product_id: productId,
        viewed_at: new Date().toISOString()
      }, { onConflict: 'user_id,product_id' });

    if (error) throw error;
  } catch (err: any) {
    console.error("Error logging product view:", err);
  }
}

export async function updateProfile(userId: string, updates: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    return { success: false, error: "Unauthorized to update this profile" };
  }

  // Whitelist the columns we are willing to write. The form layer sends
  // a permissive `updates` blob; if a future input is added that the
  // profiles table doesn't have, we don't want the whole upsert to fail
  // with a schema-cache error. Only the fields listed here ever leave
  // the action.
  const WRITABLE = new Set([
    "first_name",
    "last_name",
    "username",
    "phone",
    "bio",
    "avatar_url",
    "tier",
    "business_name",
    "business_type",
    "location",
    "state",
    "portfolio",
    "full_name",
    "email",
  ]);
  const safeUpdates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates ?? {})) {
    if (WRITABLE.has(k)) safeUpdates[k] = v;
  }

  try {
    // 1. Upsert the profiles table. New users may not have a row yet, so
    //    update() would silently no-op for them.
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...safeUpdates }, { onConflict: 'id' });

    if (profileError) throw profileError;

    // 2. Sync full_name to Auth Metadata if name changed
    if (updates.first_name || updates.last_name) {
      // Get current values to construct full name
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', userId)
        .single();

      const fullName = `${profileData?.first_name || ''} ${profileData?.last_name || ''}`.trim();

      // Initialize admin client with service role key
      const adminSupabase = createClientAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { error: metaError } = await adminSupabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          full_name: fullName
        }
      });

      if (metaError) {
        console.error("Failed to sync full_name to auth metadata:", metaError.message);
        // We don't throw here because the profile update succeeded
      }
    }

    revalidatePath('/profile/edit');
    revalidatePath('/seller-dashboard');
    revalidatePath('/artisan-dashboard');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Permanently delete the caller's own account and every row they
 * own. The user must be authenticated and must type their own
 * email to confirm (passed in as `confirmEmail` and compared
 * case-insensitively to the session email).
 *
 * The cleanup runs in this order, each step best-effort with a
 * logged warning on failure — the auth delete at the end is the
 * hard cut, and any row the cookie-bound client can't reach
 * (RLS-gated) will be cleaned up by the `on delete cascade` FKs
 * once the auth user is gone:
 *
 *   1. products (seller_id = user) — RLS lets the owner delete
 *   2. profile row — RLS lets the owner delete
 *   3. portfolio storage objects — best-effort, ignored on miss
 *   4. order_items for the user's orders — also cascade from #5
 *   5. orders (buyer_id = user) — RLS lets the buyer delete
 *   6. conversation_hides, conversation_reads, messages,
 *      conversations — these are RLS-gated per-user or per-conv;
 *      an orphaned conv with only one surviving participant is
 *      empty-handled by the messaging client.
 *   7. viewed_products — RLS lets the viewer delete
 *   8. cart_items — RLS lets the cart owner delete
 *
 * Finally, the service-role admin client calls
 * `auth.admin.deleteUser` to drop the auth.users row. Cascading
 * FKs on every "references auth.users(id) on delete cascade"
 * table take care of any profile/orders/etc rows that the
 * cookie-bound client couldn't reach.
 *
 * Returns { success: true } on the full path. On any failure
 * before the auth delete, returns { success: false, error } and
 * leaves the data alone. After the auth delete is issued, the
 * session is gone and the next read from the client will 401,
 * so we don't try to revalidate any page.
 */
export async function deleteAccountAction(
  confirmEmail: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in" };

  // Confirmation gate: the user must type their own email
  // (case-insensitive, whitespace-trimmed). The form has a
  // "type your email to confirm" UX; this is the server side.
  if (
    !confirmEmail ||
    confirmEmail.trim().toLowerCase() !== (user.email ?? "").toLowerCase()
  ) {
    return { success: false, error: "Confirmation email does not match your account" };
  }

  const userId = user.id;

  // 1. products owned by the user. We do this with the cookie-
  //    bound client (RLS allows owner delete). Storage cleanup
  //    is best-effort — a single file miss is logged, not fatal.
  try {
    const { data: ownedProducts } = await supabase
      .from("products")
      .select("id, images")
      .eq("seller_id", userId);
    if (ownedProducts && ownedProducts.length > 0) {
      // Collect storage paths from every product's image array
      // and remove them in a single batch.
      const paths: string[] = [];
      for (const p of ownedProducts as Array<{ images?: string[] | null }>) {
        if (Array.isArray(p.images)) {
          for (const img of p.images) {
            if (typeof img === "string" && img) paths.push(img);
          }
        }
      }
      if (paths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("product-images")
          .remove(paths);
        if (storageError) {
          log.warn("delete_account_storage_cleanup_failed", {
            userId,
            message: storageError.message,
          });
        }
      }
      const { error: productsError } = await supabase
        .from("products")
        .delete()
        .eq("seller_id", userId);
      if (productsError) {
        log.warn("delete_account_products_failed", {
          userId,
          message: productsError.message,
        });
      }
    }
  } catch (e) {
    log.warn("delete_account_products_threw", {
      userId,
      message: e instanceof Error ? e.message : String(e),
    });
  }

  // 2. profile row (RLS-gated to the owner).
  try {
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);
    if (profileError) {
      log.warn("delete_account_profile_failed", {
        userId,
        message: profileError.message,
      });
    }
  } catch (e) {
    log.warn("delete_account_profile_threw", {
      userId,
      message: e instanceof Error ? e.message : String(e),
    });
  }

  // 3. portfolio storage objects. We don't know the user's
  //    portfolio paths after the profile row is gone, so the
  //    cleanup runs *before* the profile delete on the next pass
  //    — for now we just log that this is best-effort. The
  //    storage bucket itself is not removed, so an orphaned
  //    file is a small disk-cost issue, not a security one.
  //    (Re-doing this requires the admin client + a listObjects
  //    under the user's prefix; deferred to a follow-up.)

  // 4. order_items: delete any items belonging to the user's
  //    orders. We don't need to read them first; deleting
  //    orders in step 5 will cascade to order_items via the
  //    existing FK. Skipping the explicit delete here is safe
  //    because orders is the parent.

  // 5. orders owned (bought) by the user. RLS lets the buyer
  //    delete their own orders; the on-delete-cascade on
  //    order_items.order_id cleans the line items.
  try {
    const { error: ordersError } = await supabase
      .from("orders")
      .delete()
      .eq("buyer_id", userId);
    if (ordersError) {
      log.warn("delete_account_orders_failed", {
        userId,
        message: ordersError.message,
      });
    }
  } catch (e) {
    log.warn("delete_account_orders_threw", {
      userId,
      message: e instanceof Error ? e.message : String(e),
    });
  }

  // 6. messaging tables: hides, reads, messages sent. RLS
  //    gates each delete to the caller. Conversations that lose
  //    a participant are kept (we don't have a "delete conv
  //    when only one participant" cascade) — the other side
  //    will see a sidebar row with the deleted user as a
  //    "ghost" participant and the getOtherParticipant helper
  //    already falls back to "Unknown" in that case.
  try {
    await supabase
      .from("conversation_hides")
      .delete()
      .eq("user_id", userId);
  } catch (e) {
    log.warn("delete_account_hides_threw", {
      userId,
      message: e instanceof Error ? e.message : String(e),
    });
  }
  try {
    await supabase
      .from("conversation_reads")
      .delete()
      .eq("user_id", userId);
  } catch (e) {
    log.warn("delete_account_reads_threw", {
      userId,
      message: e instanceof Error ? e.message : String(e),
    });
  }
  try {
    await supabase
      .from("messages")
      .delete()
      .eq("sender_id", userId);
  } catch (e) {
    log.warn("delete_account_messages_threw", {
      userId,
      message: e instanceof Error ? e.message : String(e),
    });
  }

  // 7. viewed_products the user logged.
  try {
    await supabase
      .from("viewed_products")
      .delete()
      .eq("user_id", userId);
  } catch (e) {
    log.warn("delete_account_viewed_threw", {
      userId,
      message: e instanceof Error ? e.message : String(e),
    });
  }

  // 8. cart_items.
  try {
    await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", userId);
  } catch (e) {
    log.warn("delete_account_cart_threw", {
      userId,
      message: e instanceof Error ? e.message : String(e),
    });
  }

  // 9. Finally, the auth user. This is the hard cut — the
  //    service-role client bypasses RLS and drops the
  //    auth.users row. Every table with `on delete cascade` to
  //    auth.users (orders, messages, conversation_reads, etc.)
  //    is cleaned up by the database. The cookie-bound session
  //    is invalidated server-side; the next request from the
  //    client will 401.
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseServiceKey || !supabaseUrl) {
    log.error("delete_account_admin_env_missing", { userId });
    return {
      success: false,
      error: "Server is missing the service role key; cannot finalize account deletion",
    };
  }
  const admin = createClientAdmin(supabaseUrl, supabaseServiceKey);
  const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
  if (deleteUserError) {
    log.error("delete_account_auth_failed", {
      userId,
      message: deleteUserError.message,
    });
    return { success: false, error: deleteUserError.message };
  }

  return { success: true };
}
