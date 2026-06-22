"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createClientAdmin } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

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
