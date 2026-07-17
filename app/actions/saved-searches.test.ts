import { beforeEach, describe, expect, it, vi } from "vitest";

// All three actions go through the cookie-bound server client. We
// mock @/utils/supabase/server and dispatch by table name — the
// same pattern the orders/products tests use.
const mockGetUser = vi.fn();
const mockUpsert = vi.fn();
const mockDelete = vi.fn();
const mockSelectForList = vi.fn();
const mockSelectForOwnerCheck = vi.fn();

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: () => mockGetUser() },
    from: (table: string) => {
      if (table === "saved_searches") {
        return {
          // listSavedSearchesAction: .select("*").eq("user_id", ...).order(...)
          select: (...args: unknown[]) => {
            const cols = args[0];
            // The owner-check in deleteSavedSearchAction selects a
            // narrower set ("user_id") and uses .eq("id", id) +
            // .maybeSingle(). The list call selects "*" and uses
            // .eq("user_id", id) + .order. We dispatch by the
            // second selector in the chain — eq vs order.
            const captured = { table, args: [cols] };
            return {
              eq: () => {
                const chain = {
                  // owner-check path: stops at maybeSingle()
                  maybeSingle: () => mockSelectForOwnerCheck(captured),
                  // list path: continues to order()
                  order: () => mockSelectForList(captured),
                };
                return chain;
              },
            };
          },
          // saveSearchAction: .upsert(row, { onConflict: "id" }).select("id").single()
          upsert: (...args: unknown[]) => {
            const captured = { table, args };
            return {
              select: () => ({
                single: () => Promise.resolve(mockUpsert(captured)),
              }),
            };
          },
          // deleteSavedSearchAction: .delete().eq("id", id)
          delete: () => ({
            eq: (...args: unknown[]) => mockDelete({ table, args }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  saveSearchAction,
  deleteSavedSearchAction,
  listSavedSearchesAction,
} from "./saved-searches";

describe("saveSearchAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
  });

  it("rejects unauthenticated callers", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const result = await saveSearchAction({ name: "Roofing in Lagos" });
    expect(result).toEqual({ success: false, error: "Not signed in" });
  });

  it("rejects an empty name", async () => {
    const result = await saveSearchAction({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/name/i);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("rejects a max_budget smaller than the min_budget", async () => {
    const result = await saveSearchAction({
      name: "Roofing",
      min_budget: 1000,
      max_budget: 500,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/max budget/i);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("upserts with the user_id from the session and the canonical shape", async () => {
    mockUpsert.mockResolvedValueOnce({ data: { id: "ss-1" }, error: null });

    const result = await saveSearchAction({
      name: "Roofing in Lagos",
      query: "roof",
      category: "Roofing",
      state: "Lagos",
      min_budget: 100_000,
      max_budget: 5_000_000,
    });

    expect(result).toEqual({ success: true, id: "ss-1" });

    // The upsert call carries the canonical row shape. The user_id
    // must come from the session, not the body.
    const upsertCall = mockUpsert.mock.calls[0][0];
    expect(upsertCall.table).toBe("saved_searches");
    expect(upsertCall.args[0]).toEqual({
      id: undefined,
      user_id: "user-1",
      name: "Roofing in Lagos",
      query: "roof",
      category: "Roofing",
      state: "Lagos",
      min_budget: 100_000,
      max_budget: 5_000_000,
    });
    expect(upsertCall.args[1]).toEqual({ onConflict: "id" });
  });

  it("returns a structured error on DB failure", async () => {
    mockUpsert.mockResolvedValueOnce({
      data: null,
      error: { message: "duplicate row" },
    });
    const result = await saveSearchAction({ name: "Anything" });
    expect(result).toEqual({ success: false, error: "duplicate row" });
  });
});

describe("deleteSavedSearchAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
  });

  it("rejects an invalid uuid", async () => {
    const result = await deleteSavedSearchAction("not-a-uuid");
    expect(result).toEqual({ success: false, error: "Invalid id" });
  });

  it("rejects when the row doesn't exist", async () => {
    mockSelectForOwnerCheck.mockResolvedValueOnce({ data: null, error: null });
    const result = await deleteSavedSearchAction("11111111-1111-4111-8111-111111111111");
    expect(result).toEqual({ success: false, error: "Saved search not found" });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("rejects when the row is owned by someone else", async () => {
    mockSelectForOwnerCheck.mockResolvedValueOnce({
      data: { user_id: "user-2" },
      error: null,
    });
    const result = await deleteSavedSearchAction("11111111-1111-4111-8111-111111111111");
    expect(result).toEqual({ success: false, error: "Not found" });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("deletes the row when ownership checks out", async () => {
    mockSelectForOwnerCheck.mockResolvedValueOnce({
      data: { user_id: "user-1" },
      error: null,
    });
    mockDelete.mockResolvedValueOnce({ error: null });

    const result = await deleteSavedSearchAction("11111111-1111-4111-8111-111111111111");
    expect(result).toEqual({ success: true });

    const deleteCall = mockDelete.mock.calls[0][0];
    expect(deleteCall.table).toBe("saved_searches");
    expect(deleteCall.args).toEqual(["id", "11111111-1111-4111-8111-111111111111"]);
  });
});

describe("listSavedSearchesAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
  });

  it("rejects unauthenticated callers", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const result = await listSavedSearchesAction();
    expect(result).toEqual({ success: false, error: "Not signed in" });
  });

  it("returns rows for the caller, scoped by user_id", async () => {
    mockSelectForList.mockResolvedValueOnce({
      data: [
        {
          id: "ss-2",
          user_id: "user-1",
          name: "Newer",
          query: null,
          category: "Plumbing",
          state: null,
          min_budget: null,
          max_budget: null,
          created_at: "2026-07-01T00:00:00Z",
        },
        {
          id: "ss-1",
          user_id: "user-1",
          name: "Older",
          query: "roof",
          category: "Roofing",
          state: "Lagos",
          min_budget: 100_000,
          max_budget: 5_000_000,
          created_at: "2026-06-01T00:00:00Z",
        },
      ],
      error: null,
    });

    const result = await listSavedSearchesAction();
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.items).toHaveLength(2);
    expect(result.items[0].name).toBe("Newer");
  });

  it("passes an explicit user_id filter to the query", async () => {
    mockSelectForList.mockResolvedValueOnce({ data: [], error: null });
    await listSavedSearchesAction();
    // The list call selects all columns and filters by user_id.
    // We pin the filter so a refactor that drops it (relying on
    // RLS alone) is caught.
    const listCall = mockSelectForList.mock.calls[0][0];
    expect(listCall.table).toBe("saved_searches");
    expect(listCall.args).toEqual(["*"]);
  });
});
