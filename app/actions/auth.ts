"use server";

import { createClient } from "@/utils/supabase/server";
import { registerSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function registerUserAction(formData: any) {
  try {
    const supabase = await createClient();

    // 1. Validate input
    const validated = registerSchema.safeParse(formData);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0].message
      };
    }

    const { firstName, lastName, email, password, tier, businessName, businessType, location, phone } = validated.data;

    // 2. Sign up the user. Pass tier + full_name as initial user_metadata
    //    so the proxy/role-gate can route the user correctly on their
    //    first request, even before the admin update below has a chance
    //    to run. If admin.updateUserById is unavailable (e.g. the
    //    service role key isn't set in this deployment), the signup
    //    metadata is the only copy of `tier` we'll have.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          tier,
          full_name: `${firstName} ${lastName}`,
        },
      },
    });

    if (authError) throw authError;
    const user = authData.user;

    if (!user) {
      throw new Error("Authentication failed: No user created");
    }

    // 3. Create professional profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        phone,
        tier,
        business_type: (tier === 'business' || tier === 'artisan') ? businessType : null,
        business_name: (tier === 'business' || tier === 'artisan') ? businessName : null,
        email,
        location,
        full_name: `${firstName} ${lastName}`,
      });

    if (profileError) throw profileError;

    // 4. CRITICAL: Sync the role to Auth Metadata
    // This allows the middleware to redirect users immediately without database lookups.
    // The signup call above already seeded user_metadata with `tier` and
    // `full_name`; this admin write is a defensive re-sync in case the
    // server's service-role key wasn't set at signup time (the signup
    // options.data may have been silently ignored without it). We don't
    // fall back to `supabase.auth.updateUser` here — that would update
    // the *current* session, not the freshly-registered user, and after
    // signUp there's typically no current session.
    const { error: metaError } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        tier,
        full_name: `${firstName} ${lastName}`
      }
    });

    if (metaError) {
      // The signup options.data above is the durable copy. Log and
      // continue — the proxy will read the metadata we set there.
      console.warn("Admin metadata sync skipped:", metaError.message);
    }

    revalidatePath('/login');
    revalidatePath('/register');
    revalidatePath('/');

    return {
      success: true,
      session: !!authData.session,
      userId: user.id,
      tier
    };

  } catch (err: any) {
    console.error("Registration Action Error:", err);
    return {
      success: false,
      error: err.message || "An unexpected error occurred during registration"
    };
  }
}
