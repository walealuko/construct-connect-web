// Mock revalidatePath — same as the other action tests.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks for the cookie-bound server client (data cleanup) and
// the service-role admin client (final auth.admin.deleteUser).
// deleteAccountAction uses the cookie-bound client for every
// data-table delete and the admin client for the auth drop.
const mockGetUser = vi.fn();
const mockSignOut = vi.fn();
const mockAdminDeleteUser = vi.fn();

// Per-table call recorders. The action issues 9 distinct
// delete calls (products, profile, orders, hides, reads,
// messages, viewed, cart, then a storage remove on the
// product-images bucket) plus the final admin auth delete.
// We need to drive each one from the test.
const mockProductsSelect = vi.fn();
const mockProductsDelete = vi.fn();
const mockStorageRemove = vi.fn();
const mockProfileDelete = vi.fn();
const mockOrdersDelete = vi.fn();
const mockHidesDelete = vi.fn();
const mockReadsDelete = vi.fn();
const mockMessagesDelete = vi.fn();
const mockViewedDelete = vi.fn();
const mockCartDelete = vi.fn();

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: () => mockGetUser(),
      signOut: () => mockSignOut(),
    },
    storage: {
      from: (bucket: string) => {
        if (bucket !== "product-images") {
          throw new Error(`unexpected bucket: ${bucket}`);
        }
        return { remove: (...args: unknown[]) => Promise.resolve(mockStorageRemove(args)) };
      },
    },
    from: (table: string) => {
      if (table === "products") {
        return {
          select: () => ({
            eq: () => Promise.resolve(mockProductsSelect()),
          }),
          delete: () => ({
            eq: () => Promise.resolve(mockProductsDelete()),
          }),
        };
      }
      if (table === "profiles") {
        return { delete: () => ({ eq: () => Promise.resolve(mockProfileDelete()) }) };
      }
      if (table === "orders") {
        return { delete: () => ({ eq: () => Promise.resolve(mockOrdersDelete()) }) };
      }
      if (table === "conversation_hides") {
        return { delete: () => ({ eq: () => Promise.resolve(mockHidesDelete()) }) };
      }
      if (table === "conversation_reads") {
        return { delete: () => ({ eq: () => Promise.resolve(mockReadsDelete()) }) };
      }
      if (table === "messages") {
        return { delete: () => ({ eq: () => Promise.resolve(mockMessagesDelete()) }) };
      }
      if (table === "viewed_products") {
        return { delete: () => ({ eq: () => Promise.resolve(mockViewedDelete()) }) };
      }
      if (table === "cart_items") {
        return { delete: () => ({ eq: () => Promise.resolve(mockCartDelete()) }) };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  })),
}));

const mockAdminClient = {
  auth: { admin: { deleteUser: (...args: unknown[]) => Promise.resolve(mockAdminDeleteUser(args)) } },
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockAdminClient),
}));

import { deleteAccountAction } from "./user";

describe("deleteAccountAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "a@b.c" } },
      error: null,
    });
    mockProductsSelect.mockResolvedValue({ data: [], error: null });
    mockProductsDelete.mockResolvedValue({ error: null });
    mockStorageRemove.mockResolvedValue({ error: null });
    mockProfileDelete.mockResolvedValue({ error: null });
    mockOrdersDelete.mockResolvedValue({ error: null });
    mockHidesDelete.mockResolvedValue({ error: null });
    mockReadsDelete.mockResolvedValue({ error: null });
    mockMessagesDelete.mockResolvedValue({ error: null });
    mockViewedDelete.mockResolvedValue({ error: null });
    mockCartDelete.mockResolvedValue({ error: null });
    mockAdminDeleteUser.mockResolvedValue({ data: {}, error: null });
  });

  it("refuses unauthenticated callers", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const result = await deleteAccountAction("a@b.c");
    expect(result.success).toBe(false);
    expect(mockAdminDeleteUser).not.toHaveBeenCalled();
  });

  it("accepts the user's email case-insensitively and trims whitespace", async () => {
    // The confirmation gate lowercases the input and trims it
    // before comparing to the session email, so a value typed
    // with a different case or surrounding whitespace still
    // counts as a match. Important UX: a buyer who toggles
    // caps lock shouldn't have to retype.
    const result = await deleteAccountAction("  A@B.C  ");
    expect(result.success).toBe(true);
    expect(mockAdminDeleteUser).toHaveBeenCalledTimes(1);
  });

  it("rejects when the confirmation email does not match", async () => {
    const result = await deleteAccountAction("wrong@email.com");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/does not match/i);
    }
    expect(mockAdminDeleteUser).not.toHaveBeenCalled();
  });

  it("issues every cleanup delete and the final auth drop on the success path", async () => {
    // The user owns one product with two images. The action
    // should: read the products, remove the storage paths,
    // delete the products row, then every other table, then
    // finally auth.admin.deleteUser.
    mockProductsSelect.mockResolvedValueOnce({
      data: [{ id: "p1", images: ["a.jpg", "b.jpg"] }],
      error: null,
    });

    const result = await deleteAccountAction("a@b.c");
    expect(result.success).toBe(true);

    // Storage cleanup ran with both paths in one call.
    expect(mockStorageRemove).toHaveBeenCalledTimes(1);
    expect(mockStorageRemove.mock.calls[0][0][0]).toEqual(["a.jpg", "b.jpg"]);

    // Each per-table delete fired at least once.
    expect(mockProductsDelete).toHaveBeenCalledTimes(1);
    expect(mockProfileDelete).toHaveBeenCalledTimes(1);
    expect(mockOrdersDelete).toHaveBeenCalledTimes(1);
    expect(mockHidesDelete).toHaveBeenCalledTimes(1);
    expect(mockReadsDelete).toHaveBeenCalledTimes(1);
    expect(mockMessagesDelete).toHaveBeenCalledTimes(1);
    expect(mockViewedDelete).toHaveBeenCalledTimes(1);
    expect(mockCartDelete).toHaveBeenCalledTimes(1);

    // Final auth delete ran with the caller's id.
    expect(mockAdminDeleteUser).toHaveBeenCalledTimes(1);
    expect(mockAdminDeleteUser.mock.calls[0][0][0]).toBe("user-1");
  });

  it("returns a clean error when the auth delete fails", async () => {
    mockAdminDeleteUser.mockResolvedValueOnce({
      data: null,
      error: { message: "auth user not found" },
    });
    const result = await deleteAccountAction("a@b.c");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/auth user not found/i);
    }
  });
});
