"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { createClient as createServerClient } from '@/utils/supabase/server';

export async function updateUserRoleAction(userId: string, newRole: string) {
  const supabase = await createServerClient();

  // Check if the current user is an admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single();

  if (adminProfile?.tier !== 'admin') {
    return { success: false, error: "Only administrators can perform this action" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseServiceKey) {
    throw new Error("Server role key is missing");
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const tier = newRole === 'seller' ? 'business' : 'individual';

    // 1. Update Profile Table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ tier })
      .eq('id', userId);

    if (profileError) throw profileError;

    // 2. Update Auth User Metadata (This is what the middleware uses)
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { user_metadata: { tier: tier } }
    );

    if (authError) throw authError;

    revalidatePath('/admin-dashboard');
    return { success: true };
  } catch (err: any) {
    console.error("Role update action failed:", err);
    return { success: false, error: err.message };
  }
}
