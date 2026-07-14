// Mock revalidatePath — it's a Next.js runtime helper that throws
// "static generation store missing" outside a Next request context.
// The action calls it for cache busting after a successful signup,
// but we don't care about the cache side-effect in unit tests.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks for the cookie-bound server client. registerUserAction uses:
//   - auth.signUp() with options.data (initial user_metadata)
//   - auth.signInWithPassword() — fallback when signup returns
//     session:null (e.g. email confirmation required); we want the
//     user to land on the dashboard without verifying first.
//   - auth.admin.updateUserById() (re-sync metadata)
//   - from('profiles').upsert() (professional profile)
//   - auth.getUser() is not called by this action
const mockSignUp = vi.fn();
const mockSignIn = vi.fn();
const mockAdminUpdate = vi.fn();
const mockProfileUpsert = vi.fn();

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignIn(...args),
      admin: {
        updateUserById: (...args: unknown[]) => mockAdminUpdate(...args),
      },
    },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          upsert: (...args: unknown[]) => mockProfileUpsert(table, ...args),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  })),
}));

import { registerUserAction } from "./auth";

const validForm = {
  firstName: "Ada",
  lastName: "Okafor",
  email: "ada@example.com",
  phone: "08012345678",
  password: "supersecret",
  confirmPassword: "supersecret",
  tier: "individual" as const,
  businessName: undefined,
  location: "Lagos",
};

describe("registerUserAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default happy-path mocks. Individual tests override as needed.
    // signUp defaults to the email-confirmation-required case
    // (session:null). signIn fallback defaults to success with a
    // fake session so the user lands on the dashboard without
    // verifying — the product decision is to skip verification.
    mockSignUp.mockResolvedValue({
      data: { user: { id: "new-user-id" }, session: null },
      error: null,
    });
    mockSignIn.mockResolvedValue({
      data: { user: { id: "new-user-id" }, session: { access_token: "x" } },
      error: null,
    });
    mockAdminUpdate.mockResolvedValue({ error: null });
    mockProfileUpsert.mockResolvedValue({ error: null });
  });

  it("refuses a tier outside the individual/business/artisan enum", async () => {
    // A malicious client could submit tier=admin hoping the server
    // would write it to user_metadata. The Zod schema restricts the
    // enum — this is the gate that keeps admin tier from being
    // self-issued at sign-up.
    const result = await registerUserAction({
      ...validForm,
      tier: "admin",
    } as unknown as Parameters<typeof registerUserAction>[0]);
    expect(result.success).toBe(false);
    expect(mockSignUp).not.toHaveBeenCalled();
    expect(mockProfileUpsert).not.toHaveBeenCalled();
  });

  it("rejects when tier is a non-string value", async () => {
    // type-coercion attempt: pass tier as a number.
    const result = await registerUserAction({
      ...validForm,
      tier: 0,
    } as unknown as Parameters<typeof registerUserAction>[0]);
    expect(result.success).toBe(false);
  });

  it("rejects when password and confirm don't match", async () => {
    // The Zod refine rule catches this. The action must surface
    // the validation error rather than writing a broken profile.
    const result = await registerUserAction({
      ...validForm,
      confirmPassword: "different",
    });
    expect(result.success).toBe(false);
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it("rejects when a business account has no business name", async () => {
    // The refine rule requires businessName for non-individual tiers.
    const result = await registerUserAction({
      ...validForm,
      tier: "business",
      businessName: undefined,
    });
    expect(result.success).toBe(false);
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it("seeds the signup options.data with tier and full_name", async () => {
    // The signup options.data is the durable copy of `tier` —
    // the admin updateUserById below may be silently skipped if
    // the service role key isn't set in this deployment, so the
    // metadata we pass at signup time is the one the proxy reads.
    await registerUserAction(validForm);
    expect(mockSignUp).toHaveBeenCalledTimes(1);
    const call = mockSignUp.mock.calls[0][0];
    expect(call.options.data).toEqual({
      tier: "individual",
      full_name: "Ada Okafor",
    });
  });

  it("writes the profile row with the canonical fields", async () => {
    await registerUserAction(validForm);
    expect(mockProfileUpsert).toHaveBeenCalledTimes(1);
    const upsertArgs = mockProfileUpsert.mock.calls[0];
    expect(upsertArgs[0]).toBe("profiles");
    expect(upsertArgs[1]).toMatchObject({
      first_name: "Ada",
      last_name: "Okafor",
      email: "ada@example.com",
      phone: "08012345678",
      tier: "individual",
      // Individual accounts have null business fields even if the
      // client sends blank strings.
      business_name: null,
    });
  });

  it("continues when the admin metadata sync fails", async () => {
    // The signup options.data is the durable copy. If the admin
    // re-sync fails (no service role key, transient error), we
    // log and continue — the user is still created, and the
    // proxy reads the metadata we set at signup.
    mockAdminUpdate.mockResolvedValueOnce({
      error: { message: "admin not configured" },
    });
    const result = await registerUserAction(validForm);
    expect(result.success).toBe(true);
    // The success branch of the discriminated union carries
    // session/userId/tier/warning. Cast at the assertion site so
    // we don't have to repeat the narrowing `if (result.success)`
    // on every line.
    const ok = result as Extract<typeof result, { success: true }>;
    expect(ok.tier).toBe("individual");
  });

  it("falls back to signInWithPassword when signup returns no session", async () => {
    // The Supabase project has email confirmation enabled, so
    // signUp returns session:null. Per the product decision to
    // skip email verification, we immediately sign the user in
    // with the same credentials so they land on the dashboard
    // without verifying first.
    mockSignUp.mockResolvedValueOnce({
      data: { user: { id: "new-user-id" }, session: null },
      error: null,
    });
    const result = await registerUserAction(validForm);
    expect(mockSignIn).toHaveBeenCalledTimes(1);
    expect(mockSignIn).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "supersecret",
    });
    const ok = result as Extract<typeof result, { success: true }>;
    expect(ok.success).toBe(true);
    expect(ok.session).toBe(true);
  });

  it("returns session:false and a warning when both signup and signIn fail", async () => {
    // Rare path: email confirmation is enabled AND unverified users
    // are blocked at sign-in too (some Supabase configs do this).
    // The action surfaces the upstream sign-in error so the register
    // page can show it before the verification interstitial.
    mockSignUp.mockResolvedValueOnce({
      data: { user: { id: "new-user-id" }, session: null },
      error: null,
    });
    mockSignIn.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: "Email not confirmed" },
    });
    const result = await registerUserAction(validForm);
    const ok = result as Extract<typeof result, { success: true }>;
    expect(ok.success).toBe(true);
    expect(ok.session).toBe(false);
    expect(ok.warning).toBe("Email not confirmed");
    // Profile is still written — the user has a complete account
    // for when they verify their email and sign in.
    expect(mockProfileUpsert).toHaveBeenCalledTimes(1);
  });

  it("returns session:true when email confirmation is disabled", async () => {
    // signUp returns a real session; the fallback signIn is not
    // called because we already have a session.
    mockSignUp.mockResolvedValueOnce({
      data: { user: { id: "new-user-id" }, session: { access_token: "x" } },
      error: null,
    });
    const result = await registerUserAction(validForm);
    expect(mockSignIn).not.toHaveBeenCalled();
    const ok = result as Extract<typeof result, { success: true }>;
    expect(ok.success).toBe(true);
    expect(ok.session).toBe(true);
  });

  it("returns an error when signUp itself fails", async () => {
    // "User already registered" from Supabase. We surface the
    // upstream message so the user knows which email collided.
    mockSignUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: "User already registered" },
    });
    const result = await registerUserAction(validForm);
    expect(result.success).toBe(false);
    // Profile must not be written if signup failed — otherwise
    // we'd have a profile row for a user that doesn't exist.
    expect(mockProfileUpsert).not.toHaveBeenCalled();
  });
});
