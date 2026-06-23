import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks for both Supabase clients used by admin.ts. The cookie-
// bound server client is what the new admin guard checks; the
// admin client from @supabase/supabase-js is what the rest of the
// action uses (and we want to confirm the guard short-circuits
// before that runs).
const mockServerAuth = vi.fn();
const mockServerProfileQuery = vi.fn();
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
    auth: {
      admin: {
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

  it("admits admin callers and reaches the admin client", async () => {
    mockServerAuth.mockResolvedValueOnce({
      data: { user: { id: "admin-id" } },
      error: null,
    });
    mockServerProfileQuery.mockResolvedValueOnce({
      data: { tier: "admin" },
      error: null,
    });
    mockAdminUpdate.mockResolvedValueOnce({ error: null });

    const result = await clearAllUserSessionsAction("target-id");
    expect(result).toEqual({ success: true });
    expect(mockAdminUpdate).toHaveBeenCalledTimes(1);
    // The call should target the supplied userId.
    expect(mockAdminUpdate.mock.calls[0][0]).toBe("target-id");
  });
});