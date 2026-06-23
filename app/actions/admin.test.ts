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
import { clearAllUserSessionsAction } from "./admin";

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