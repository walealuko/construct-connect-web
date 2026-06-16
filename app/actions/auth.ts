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

    // 2. Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
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
    // This allows the middleware to redirect users immediately without database lookups
    const { error: metaError } = await supabase.auth.admin.updateUserForAdmin(user.id, {
      user_metadata: {
        tier,
        full_name: `${firstName} ${lastName}`
      }
    });

    // If admin update fails (e.g. lacking service role), try the standard updateUser
    if (metaError) {
      console.warn("Admin update failed, trying standard user update:", metaError.message);
      await supabase.auth.updateUser({
        data: {
          tier,
          full_name: `${firstName} ${lastName}`
        }
      });
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
