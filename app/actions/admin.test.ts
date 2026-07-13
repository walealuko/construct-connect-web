// Mock revalidatePath — it throws "static generation store missing"
// outside a Next request context. updateUserRoleAction and
// clearAllUserSessionsAction both call it on the success path;
// we don't care about the cache side-effect in unit tests.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks for both Supabase clients used by admin.ts. The cookie-
// bound server client is what the new admin guard checks; the
// admin client from @supabase/supabase-js is what the rest of the
// action uses (and we want to confirm the guard short-circuits
// before that runs).
//
// clearAllUserSessionsAction now writes profiles.session_version
// (RLS-bypassed via the service-role admin client) AND
// auth.user_metadata.session_version (so a freshly minted JWT
// embeds the new value). The mocks cover both paths.
const mockServerAuth = vi.fn();
const mockServerProfileQuery = vi.fn();
const mockAdminProfileUpdate = vi.fn();
const mockAdminGetUserById = vi.fn();
const mockAdminUpdate = vi.fn();

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: (...args: unknown[]) => mockServerAuth(...args) },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: (...args: unknown[]) => mockServerProfileQuery(table, ...args),
          single: (...args: unknown[]) => mockServerProfileQuery(table, ...args),
        }),
      }),
    }),
  })),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: (table: string) => ({
      update: (...args: unknown[]) => {
        const captured: { table: string; args: unknown[] } = { table, args };
        const chain = {
          eq: () => Promise.resolve(mockAdminProfileUpdate(captured)),
        };
        return chain;
      },
    }),
    auth: {
      admin: {
        getUserById: (...args: unknown[]) => mockAdminGetUserById(...args),
        updateUserById: (...args: unknown[]) => mockAdminUpdate(...args),
      },
    },
  })),
}));

// env vars must be set before the action runs. The admin path
// requires a service role key to construct the admin client.
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

// Import after mocks so the module picks them up.
import { clearAllUserSessionsAction, updateUserRoleAction } from "./admin";

describe("clearAllUserSessionsAction — admin guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuses unauthenticated callers", async () => {
    mockServerAuth.mockResolvedValueOnce({ data: { user: null }, error: null });
    const result = await clearAllUserSessionsAction("victim-id");
    expect(result).toEqual({ success: false, error: "Unauthorized" });
    expect(mockAdminUpdate).not.toHaveBeenCalled();
  });

  it("refuses non-admin callers (tier !== admin)", async () => {
    mockServerAuth.mockResolvedValueOnce({
      data: { user: { id: "caller-id" } },
      error: null,
    });
    mockServerProfileQuery.mockResolvedValueOnce({
      data: { tier: "individual" },
      error: null,
    });
    const result = await clearAllUserSessionsAction("victim-id");
    expect(result).toEqual({ success: false, error: "Admin only" });
    expect(mockAdminUpdate).not.toHaveBeenCalled();
  });

  it("refuses business-tier callers (tier !== admin)", async () => {
    mockServerAuth.mockResolvedValueOnce({
      data: { user: { id: "caller-id" } },
      error: null,
    });
    mockServerProfileQuery.mockResolvedValueOnce({
      data: { tier: "business" },
      error: null,
    });
    const result = await clearAllUserSessionsAction("victim-id");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Admin only");
  });

  it("refuses artisan-tier callers", async () => {
    mockServerAuth.mockResolvedValueOnce({
      data: { user: { id: "caller-id" } },
      error: null,
    });
    mockServerProfileQuery.mockResolvedValueOnce({
      data: { tier: "artisan" },
      error: null,
    });
    const result = await clearAllUserSessionsAction("victim-id");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Admin only");
  });

  it("admits admin callers and rotates session_version", async () => {
    mockServerAuth.mockResolvedValueOnce({
      data: { user: { id: "admin-id" } },
      error: null,
    });
    mockServerProfileQuery.mockResolvedValueOnce({
      data: { tier: "admin" },
      error: null,
    });
    // profiles.session_version rotation succeeds
    mockAdminProfileUpdate.mockResolvedValueOnce({ error: null });
    // getUserById returns the target's existing metadata (so we can
    // spread + add the new session_version without clobbering tier).
    mockAdminGetUserById.mockResolvedValueOnce({
      data: { user: { id: "target-id", user_metadata: { tier: "individual" } } },
      error: null,
    });
    mockAdminUpdate.mockResolvedValueOnce({ error: null });

    const result = await clearAllUserSessionsAction("target-id");
    expect(result.success).toBe(true);
    expect(typeof result.session_version).toBe("number");
    expect(result.session_version).toBeGreaterThan(0);

    // profiles update ran for the right row.
    expect(mockAdminProfileUpdate).toHaveBeenCalledTimes(1);
    // user-metadata update ran for the right row, and the new
    // session_version is in the metadata payload.
    expect(mockAdminUpdate).toHaveBeenCalledTimes(1);
    expect(mockAdminUpdate.mock.calls[0][0]).toBe("target-id");
    const meta = mockAdminUpdate.mock.calls[0][1]?.user_metadata;
    expect(meta?.session_version).toBe(result.session_version);
    // Spreading preserved the prior metadata.
    expect(meta?.tier).toBe("individual");
  });
});

describe("updateUserRoleAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an unrecognized role string", async () => {
    // A malicious or buggy UI could send a non-tier value (e.g. the
    // old "seller"/"buyer" tokens). The action must refuse rather
    // than silently coerce to individual.
    mockServerAuth.mockResolvedValueOnce({
      data: { user: { id: "admin-id" } },
      error: null,
    });
    mockServerProfileQuery.mockResolvedValueOnce({
      data: { tier: "admin" },
      error: null,
    });
    const result = await updateUserRoleAction("target-id", "seller");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid role");
    expect(mockAdminUpdate).not.toHaveBeenCalled();
  });

  it("accepts admin role and writes it through to both profile and metadata", async () => {
    // The previous handler mapped any non-business value to
    // `individual`, so selecting "Admin" in the UI silently demoted
    // the user. Verify the new action round-trips "admin" correctly.
    mockServerAuth.mockResolvedValueOnce({
      data: { user: { id: "admin-id" } },
      error: null,
    });
    mockServerProfileQuery.mockResolvedValueOnce({
      data: { tier: "admin" },
      error: null,
    });
    mockAdminProfileUpdate.mockResolvedValueOnce({ error: null });
    mockAdminGetUserById.mockResolvedValueOnce({
      data: { user: { id: "target-id", user_metadata: { tier: "individual", full_name: "Ada Okafor" } } },
      error: null,
    });
    mockAdminUpdate.mockResolvedValueOnce({ error: null });

    const result = await updateUserRoleAction("target-id", "admin");
    expect(result.success).toBe(true);

    // Profile row got the new tier.
    const profileCall = mockAdminProfileUpdate.mock.calls[0][0];
    expect(profileCall.table).toBe("profiles");
    expect(profileCall.args[0]).toEqual({ tier: "admin" });

    // Metadata was spread + tier overwritten, full_name preserved.
    expect(mockAdminUpdate).toHaveBeenCalledTimes(1);
    expect(mockAdminUpdate.mock.calls[0][0]).toBe("target-id");
    const meta = mockAdminUpdate.mock.calls[0][1]?.user_metadata;
    expect(meta?.tier).toBe("admin");
    expect(meta?.full_name).toBe("Ada Okafor");
  });

  it("accepts artisan role and preserves existing session_version in metadata", async () => {
    // The session-version clobber bug: the old code wrote
    // { user_metadata: { tier } } without spreading, wiping
    // session_version. After the role change the user's next
    // request would have JWT session_version=undefined which the
    // proxy reads as 0, but the row's session_version would be
    // higher → forced sign-out.
    mockServerAuth.mockResolvedValueOnce({
      data: { user: { id: "admin-id" } },
      error: null,
    });
    mockServerProfileQuery.mockResolvedValueOnce({
      data: { tier: "admin" },
      error: null,
    });
    mockAdminProfileUpdate.mockResolvedValueOnce({ error: null });
    mockAdminGetUserById.mockResolvedValueOnce({
      data: {
        user: {
          id: "target-id",
          user_metadata: { tier: "individual", session_version: 1700000000000 },
        },
      },
      error: null,
    });
    mockAdminUpdate.mockResolvedValueOnce({ error: null });

    const result = await updateUserRoleAction("target-id", "artisan");
    expect(result.success).toBe(true);

    const meta = mockAdminUpdate.mock.calls[0][1]?.user_metadata;
    expect(meta?.tier).toBe("artisan");
    expect(meta?.session_version).toBe(1700000000000);
  });
});