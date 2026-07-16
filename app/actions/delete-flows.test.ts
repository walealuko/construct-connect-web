// Mock revalidatePath — same as the auth test. The hide and
// delete actions call revalidatePath on the success path but
// we don't care about the cache side-effect in unit tests.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks for the cookie-bound server client. hideConversationAction
// uses:
//   - auth.getUser()         (auth check)
//   - from('conversations').select().eq().maybeSingle()
//   - from('conversation_hides').upsert()
//
// deleteOrderAction uses:
//   - auth.getUser()
//   - from('orders').update().eq()
const mockGetUser = vi.fn();
const mockConvSelect = vi.fn();
const mockHideUpsert = vi.fn();
const mockOrderUpdate = vi.fn();

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: () => mockGetUser() },
    from: (table: string) => {
      if (table === "conversations") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => mockConvSelect(),
            }),
          }),
        };
      }
      if (table === "conversation_hides") {
        return {
          upsert: (...args: unknown[]) => Promise.resolve(mockHideUpsert(args)),
        };
      }
      if (table === "orders") {
        return {
          update: (...args: unknown[]) => {
            const captured = { args };
            return {
              eq: () => Promise.resolve(mockOrderUpdate(captured)),
            };
          },
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  })),
}));

import { hideConversationAction } from "./chat";
import { deleteOrderAction } from "./orders";

describe("hideConversationAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "a@b.c" } },
      error: null,
    });
    mockConvSelect.mockResolvedValue({
      data: { participant_ids: ["user-1", "user-2"] },
      error: null,
    });
    mockHideUpsert.mockResolvedValue({ error: null });
  });

  it("refuses unauthenticated callers", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const result = await hideConversationAction("conv-1");
    expect(result.success).toBe(false);
    expect(mockHideUpsert).not.toHaveBeenCalled();
  });

  it("rejects non-participants", async () => {
    // The caller is user-1 but the conversation is between
    // user-3 and user-4. The action's pre-check should refuse
    // before writing the hide row.
    mockConvSelect.mockResolvedValueOnce({
      data: { participant_ids: ["user-3", "user-4"] },
      error: null,
    });
    const result = await hideConversationAction("conv-1");
    expect(result.success).toBe(false);
    expect(mockHideUpsert).not.toHaveBeenCalled();
  });

  it("writes a hide row for the calling user only", async () => {
    // The conversation has both user-1 and user-2. The hide
    // row is keyed on (conversation_id, user_id) where user_id
    // is the caller (user-1), not the other participant.
    const result = await hideConversationAction("conv-1");
    expect(result.success).toBe(true);
    const call = mockHideUpsert.mock.calls[0][0];
    expect(call[0]).toMatchObject({
      conversation_id: "conv-1",
      user_id: "user-1",
    });
  });
});

describe("deleteOrderAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "buyer-1", email: "a@b.c" } },
      error: null,
    });
    mockOrderUpdate.mockResolvedValue({ error: null });
  });

  it("refuses unauthenticated callers", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const result = await deleteOrderAction("order-1");
    expect(result.success).toBe(false);
    expect(mockOrderUpdate).not.toHaveBeenCalled();
  });

  it("sets deleted_at on the order row", async () => {
    const result = await deleteOrderAction("order-1");
    expect(result.success).toBe(true);
    // RLS does the membership check; the action layer just
    // stamps the timestamp. We assert the column we wrote.
    const captured = mockOrderUpdate.mock.calls[0][0];
    expect(captured.args[0]).toHaveProperty("deleted_at");
    expect(typeof captured.args[0].deleted_at).toBe("string");
  });

  it("surfaces the underlying supabase error", async () => {
    mockOrderUpdate.mockResolvedValueOnce({
      error: { message: "row-level security violation" },
    });
    const result = await deleteOrderAction("order-1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/row-level security/i);
    }
  });
});
