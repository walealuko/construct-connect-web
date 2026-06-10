"use server";

import { createClient } from "@/utils/supabase/server";

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
  try {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
