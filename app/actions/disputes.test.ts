import { beforeEach, describe, expect, it, vi } from "vitest";

// openDisputeAction: cookie-bound server client. The chain shape
// it issues is:
//   auth.getUser()
//   from("orders").select("id, buyer_id, status, order_items(...)").eq("id", id).maybeSingle()
//   from("disputes").select("id, status").eq("order_id", id).maybeSingle()
//   from("disputes").insert({...}).select("id").single()
//   from("orders").update({ status }).eq("id", id)
//
// listMyOpenDisputesAction: products → order_items → disputes.
//
// The mock dispatches by table; the second selector in the chain
// (`maybeSingle` vs `single` vs `eq(...).in(...)`) tells us which
// call we're on.
const mockGetUser = vi.fn();
const mockOrdersSelect = vi.fn();
const mockDisputesSelectExisting = vi.fn();
const mockDisputesInsert = vi.fn();
const mockOrdersUpdate = vi.fn();
const mockProductsList = vi.fn();
const mockOrderItemsList = vi.fn();
const mockDisputesCount = vi.fn();

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: () => mockGetUser() },
    from: (table: string) => {
      if (table === "orders") {
        return {
          // openDisputeAction: .select("...").eq("id", id).maybeSingle()
          select: () => ({
            eq: () => ({
              maybeSingle: () => mockOrdersSelect(),
            }),
          }),
          // openDisputeAction: .update({ status: "disputed" }).eq("id", id)
          update: (...args: unknown[]) => {
            const captured = { table, args };
            return {
              eq: () => Promise.resolve(mockOrdersUpdate(captured)),
            };
          },
        };
      }
      if (table === "disputes") {
        return {
          // openDisputeAction: .select("id, status").eq("order_id", id).maybeSingle()
          // listMyOpenDisputesAction: .select("id", { count: "exact", head: true })
          //   .eq("status", "open").in("order_id", orderIds)
          //
          // We dispatch on whether `.select()` was called with a
          // `head: true` options bag (the count query) or with
          // just a column string (the existing-check query).
          select: (_cols: string, opts?: { head?: boolean }) => {
            if (opts?.head) {
              return {
                eq: () => ({
                  in: () => Promise.resolve(mockDisputesCount()),
                }),
              };
            }
            return {
              eq: () => ({
                maybeSingle: () => mockDisputesSelectExisting(),
              }),
            };
          },
          // openDisputeAction: .insert({...}).select("id").single()
          insert: (...args: unknown[]) => {
            const captured = { table, args };
            return {
              select: () => ({
                single: () => Promise.resolve(mockDisputesInsert(captured)),
              }),
            };
          },
        };
      }
      if (table === "products") {
        return {
          // listMyOpenDisputesAction: .select("id").eq("seller_id", user.id)
          select: () => ({
            eq: () => Promise.resolve(mockProductsList()),
          }),
        };
      }
      if (table === "order_items") {
        return {
          // listMyOpenDisputesAction: .select("order_id").in("product_id", productIds)
          select: () => ({
            in: () => Promise.resolve(mockOrderItemsList()),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  })),
}));

// listMyOpenDisputesAction needs a separate mock for products +
// order_items + the count query. We override @/utils/supabase/server
// entirely here, so we add a per-call toggle by using a function
// for `from`.

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { openDisputeAction, listMyOpenDisputesAction } from "./disputes";

describe("openDisputeAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    // Default happy-path: user-1 is the buyer on the order, no
    // existing dispute, insert returns a fresh id, status flip
    // succeeds.
    mockOrdersSelect.mockResolvedValue({
      data: {
        id: "11111111-1111-4111-8111-111111111111",
        buyer_id: "user-1",
        status: "completed",
        order_items: [],
      },
      error: null,
    });
    mockDisputesSelectExisting.mockResolvedValue({ data: null, error: null });
    mockDisputesInsert.mockResolvedValue({ data: { id: "d-1" }, error: null });
    mockOrdersUpdate.mockResolvedValue({ error: null });
  });

  it("rejects unauthenticated callers", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const result = await openDisputeAction({
      orderId: "11111111-1111-4111-8111-111111111111",
      reason: "Wrong item shipped",
    });
    expect(result).toEqual({ success: false, error: "Not signed in" });
  });

  it("rejects an invalid order id", async () => {
    const result = await openDisputeAction({ orderId: "not-a-uuid", reason: "x" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/order id/i);
  });

  it("rejects an empty reason", async () => {
    const result = await openDisputeAction({
      orderId: "11111111-1111-4111-8111-111111111111",
      reason: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/reason/i);
  });

  it("rejects when the caller is not a party on the order", async () => {
    // order.buyer_id is user-2, order_items is empty (no
    // seller-side match). The caller is user-1. Action should
    // refuse with a 404-style message rather than touching the
    // DB.
    mockOrdersSelect.mockResolvedValueOnce({
      data: {
        id: "11111111-1111-4111-8111-111111111111",
        buyer_id: "user-2",
        status: "completed",
        order_items: [],
      },
      error: null,
    });
    const result = await openDisputeAction({
      orderId: "11111111-1111-4111-8111-111111111111",
      reason: "x",
    });
    expect(result).toEqual({ success: false, error: "Order not found" });
    expect(mockDisputesInsert).not.toHaveBeenCalled();
    expect(mockOrdersUpdate).not.toHaveBeenCalled();
  });

  it("rejects when a dispute is already open on the order", async () => {
    mockDisputesSelectExisting.mockResolvedValueOnce({
      data: { id: "d-old", status: "open" },
      error: null,
    });
    const result = await openDisputeAction({
      orderId: "11111111-1111-4111-8111-111111111111",
      reason: "Wrong item shipped",
    });
    expect(result).toEqual({
      success: false,
      error: "A dispute is already open on this order",
    });
    expect(mockDisputesInsert).not.toHaveBeenCalled();
  });

  it("inserts the dispute and flips the order status to 'disputed' on the happy path", async () => {
    const result = await openDisputeAction({
      orderId: "11111111-1111-4111-8111-111111111111",
      reason: "Wrong item shipped — got cement, expected sand.",
    });
    expect(result).toEqual({ success: true, disputeId: "d-1" });

    // The insert must carry the canonical shape: order_id from
    // input, opened_by from the session, reason from input,
    // status pinned to 'open'.
    const insertCall = mockDisputesInsert.mock.calls[0][0];
    expect(insertCall.table).toBe("disputes");
    expect(insertCall.args[0]).toEqual({
      order_id: "11111111-1111-4111-8111-111111111111",
      opened_by: "user-1",
      reason: "Wrong item shipped — got cement, expected sand.",
      status: "open",
    });

    // The status flip must be exactly { status: "disputed" }.
    const updateCall = mockOrdersUpdate.mock.calls[0][0];
    expect(updateCall.table).toBe("orders");
    expect(updateCall.args[0]).toEqual({ status: "disputed" });
  });

  it("also accepts a seller-on-the-order relationship", async () => {
    // Same user-1 caller, but the order is owned by another
    // buyer and user-1 appears as the seller of one of the line
    // items. The action should accept and write the dispute.
    mockOrdersSelect.mockResolvedValueOnce({
      data: {
        id: "11111111-1111-4111-8111-111111111111",
        buyer_id: "user-2",
        status: "shipped",
        order_items: [
          { product_id: "p-1", products: { seller_id: "user-1" } },
        ],
      },
      error: null,
    });
    const result = await openDisputeAction({
      orderId: "11111111-1111-4111-8111-111111111111",
      reason: "Buyer claims non-delivery, I have proof of shipping.",
    });
    expect(result).toEqual({ success: true, disputeId: "d-1" });
    // opened_by is the seller (user-1), not the buyer.
    const insertCall = mockDisputesInsert.mock.calls[0][0];
    expect(insertCall.args[0].opened_by).toBe("user-1");
  });

  it("returns the insert error when the dispute row fails to write", async () => {
    mockDisputesInsert.mockResolvedValueOnce({
      data: null,
      error: { message: "RLS denied" },
    });
    const result = await openDisputeAction({
      orderId: "11111111-1111-4111-8111-111111111111",
      reason: "Anything",
    });
    expect(result).toEqual({ success: false, error: "RLS denied" });
    // Status flip should NOT have run.
    expect(mockOrdersUpdate).not.toHaveBeenCalled();
  });
});

describe("listMyOpenDisputesAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
  });

  it("rejects unauthenticated callers", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const result = await listMyOpenDisputesAction();
    expect(result).toEqual({ success: false, error: "Not signed in" });
  });

  it("returns zero for a seller with no products", async () => {
    mockProductsList.mockResolvedValueOnce({ data: [], error: null });
    const result = await listMyOpenDisputesAction();
    expect(result).toEqual({ success: true, count: 0 });
    // No order_items query should run when the seller has no products.
    expect(mockOrderItemsList).not.toHaveBeenCalled();
  });

  it("counts the caller's open disputes across their products", async () => {
    mockProductsList.mockResolvedValueOnce({
      data: [{ id: "p-1" }, { id: "p-2" }],
      error: null,
    });
    mockOrderItemsList.mockResolvedValueOnce({
      data: [
        { order_id: "o-1" },
        { order_id: "o-2" },
        { order_id: "o-1" }, // duplicate — deduped by the action
      ],
      error: null,
    });
    mockDisputesCount.mockResolvedValueOnce({ count: 3, error: null });
    const result = await listMyOpenDisputesAction();
    expect(result).toEqual({ success: true, count: 3 });
  });

  it("returns zero when no orders contain the caller's products", async () => {
    mockProductsList.mockResolvedValueOnce({
      data: [{ id: "p-1" }],
      error: null,
    });
    mockOrderItemsList.mockResolvedValueOnce({ data: [], error: null });
    const result = await listMyOpenDisputesAction();
    expect(result).toEqual({ success: true, count: 0 });
    // No disputes query should run.
    expect(mockDisputesCount).not.toHaveBeenCalled();
  });
});
