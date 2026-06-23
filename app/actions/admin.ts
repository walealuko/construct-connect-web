"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { log } from '@/lib/logger';

export async function clearAllUserSessionsAction(userId: string) {
  // Caller-side admin check. The action runs with the service-role key
  // (bypasses RLS) — without this guard, any signed-in client could
  // call the action against an arbitrary `userId` and force a
  // session-version bump. The proxy already verifies the caller is
  // signed in, but admin-only enforcement lives here, not at the
  // proxy layer (admin users may navigate to a normal page, and the
  // proxy has no concept of "this action needs admin").
  const callerSupabase = await createServerClient();
  const { data: { user: caller } } = await callerSupabase.auth.getUser();
  if (!caller) {
    return { success: false, error: "Unauthorized" };
  }
  const { data: callerProfile } = await callerSupabase
    .from('profiles')
    .select('tier')
    .eq('id', caller.id)
    .maybeSingle();
  if (callerProfile?.tier !== 'admin') {
    return { success: false, error: "Admin only" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseServiceKey) {
    throw new Error("Server role key is missing");
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Rotate profiles.session_version. The proxy reads the JWT's
    // embedded session_version claim and compares it to the current
    // row value; a mismatch means an admin killed this user's
    // sessions, so the proxy clears the cookies and redirects to
    // /login. We picked profiles over auth.users.user_metadata
    // because profiles is RLS-readable from the proxy without
    // service-role and the index is one row.
    //
    // We also write the new version into auth.user_metadata so a
    // freshly-minted JWT embeds the rotated value. Without this,
    // a user who signs in again right after a kill would get a
    // JWT with the old version and the proxy would kick them out
    // immediately. (The proxy also re-reads profiles on every
    // request, so this is belt-and-braces.)
    const nextVersion = Date.now();
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ session_version: nextVersion })
      .eq('id', userId);
    if (profileError) throw profileError;

    const { data: targetAuth } = await supabaseAdmin.auth.admin.getUserById(userId);
    const prevMetadata = (targetAuth?.user?.user_metadata as Record<string, unknown> | undefined) ?? {};
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { user_metadata: { ...prevMetadata, session_version: nextVersion } }
    );
    if (authError) throw authError;

    return { success: true, session_version: nextVersion };
  } catch (err: any) {
    log.error('admin_clear_sessions_failed', { userId, message: err?.message });
    return { success: false, error: err.message };
  }
}

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
    log.error('admin_role_update_failed', { userId, newRole, message: err?.message });
    return { success: false, error: err.message };
  }
}
