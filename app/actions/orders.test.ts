import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the cookie-bound server client. placeOrderAction uses:
//   - auth.getUser()  (auth check)
//   - from('products').select().in()  (price + stock re-fetch)
//   - from('orders').insert().select().single()  (order row create)
//   - from('order_items').insert()  (line items create)
//   - from('orders').update().eq()  (cleanup on items-insert failure)
const mockGetUser = vi.fn();
const mockProductsIn = vi.fn();
const mockOrdersInsert = vi.fn();
const mockOrderItemsInsert = vi.fn();
const mockOrdersCleanupUpdate = vi.fn();

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: () => mockGetUser() },
    from: (table: string) => {
      if (table === "products") {
        return {
          select: () => ({
            in: (...args: unknown[]) => mockProductsIn(table, ...args),
          }),
        };
      }
      if (table === "orders") {
        return {
          insert: (...args: unknown[]) => {
            const captured = { table, args };
            const chain = {
              select: () => ({
                single: () => Promise.resolve(mockOrdersInsert(captured)),
              }),
            };
            return chain;
          },
          update: (...args: unknown[]) => {
            const captured = { table, args };
            const chain = {
              eq: () => Promise.resolve(mockOrdersCleanupUpdate(captured)),
            };
            return chain;
          },
        };
      }
      if (table === "order_items") {
        return {
          insert: (...args: unknown[]) => {
            const captured = { table, args };
            return Promise.resolve(mockOrderItemsInsert(captured));
          },
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  })),
}));

import { placeOrderAction } from "./orders";

describe("placeOrderAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "buyer-1" } },
      error: null,
    });
  });

  it("refuses unauthenticated callers", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const result = await placeOrderAction([{ productId: "p-1", quantity: 1 }]);
    expect(result).toEqual({ success: false, error: "Not signed in" });
  });

  it("refuses an empty cart", async () => {
    const result = await placeOrderAction([]);
    expect(result).toEqual({ success: false, error: "Cart is empty" });
  });

  it("refuses a single product id with no quantity", async () => {
    // No server call should reach products — the validation
    // happens before the round-trip.
    const result = await placeOrderAction([
      { productId: "p-1", quantity: 0 },
    ]);
    expect(result).toEqual({ success: false, error: "Invalid cart item" });
    expect(mockProductsIn).not.toHaveBeenCalled();
  });

  it("refuses non-finite quantity", async () => {
    const result = await placeOrderAction([
      { productId: "p-1", quantity: Number.POSITIVE_INFINITY },
    ]);
    expect(result).toEqual({ success: false, error: "Invalid cart item" });
  });

  it("ignores the client-supplied price and recomputes from the database", async () => {
    // The buyer's cart claims a price of 1 naira; the database
    // says 100. The order must use 100. This is the price-trust
    // fix — a tampered localStorage cart can't make the buyer
    // pay a different amount.
    mockProductsIn.mockResolvedValueOnce({
      data: [{ id: "p-1", price: 100, stock: 5, name: "Cement" }],
      error: null,
    });
    mockOrdersInsert.mockResolvedValueOnce({
      data: { id: "order-1" },
      error: null,
    });
    mockOrderItemsInsert.mockResolvedValueOnce({ error: null });

    const result = await placeOrderAction([{ productId: "p-1", quantity: 2 }]);
    expect(result).toEqual({
      success: true,
      orderId: "order-1",
      totalAmount: 200, // 100 × 2, server-canonical
    });

    // The orders.insert call should carry the server-computed
    // total_amount, not anything derived from the client.
    const ordersInsertCall = mockOrdersInsert.mock.calls[0][0];
    expect(ordersInsertCall.table).toBe("orders");
    expect(ordersInsertCall.args[0]).toMatchObject({
      buyer_id: "buyer-1",
      total_amount: 200,
      status: "pending",
    });

    // The line items should also carry the server-computed price.
    const itemsInsertCall = mockOrderItemsInsert.mock.calls[0][0];
    expect(itemsInsertCall.table).toBe("order_items");
    expect(itemsInsertCall.args[0]).toEqual([
      {
        product_id: "p-1",
        order_id: "order-1",
        quantity: 2,
        price_at_purchase: 100,
      },
    ]);
  });

  it("coalesces duplicate product ids in the cart", async () => {
    // Two entries for the same product should produce one line
    // item with the summed quantity. This is the "two browser
    // tabs added the same product" case.
    mockProductsIn.mockResolvedValueOnce({
      data: [{ id: "p-1", price: 50, stock: 10, name: "Sand" }],
      error: null,
    });
    mockOrdersInsert.mockResolvedValueOnce({
      data: { id: "order-1" },
      error: null,
    });
    mockOrderItemsInsert.mockResolvedValueOnce({ error: null });

    const result = await placeOrderAction([
      { productId: "p-1", quantity: 2 },
      { productId: "p-1", quantity: 3 },
    ]);
    expect(result).toEqual({
      success: true,
      orderId: "order-1",
      totalAmount: 250, // 50 × 5
    });

    const itemsInsertCall = mockOrderItemsInsert.mock.calls[0][0];
    expect(itemsInsertCall.args[0]).toEqual([
      {
        product_id: "p-1",
        order_id: "order-1",
        quantity: 5,
        price_at_purchase: 50,
      },
    ]);
  });

  it("rejects an order when the line items insert fails", async () => {
    // If the order row exists but the line items didn't, we
    // cancel the order and return an error. Without this, the
    // buyer would see a "pending" order with no contents.
    mockProductsIn.mockResolvedValueOnce({
      data: [{ id: "p-1", price: 100, stock: 5, name: "Cement" }],
      error: null,
    });
    mockOrdersInsert.mockResolvedValueOnce({
      data: { id: "order-1" },
      error: null,
    });
    mockOrderItemsInsert.mockResolvedValueOnce({
      error: { message: "insert failed" },
    });
    mockOrdersCleanupUpdate.mockResolvedValueOnce({ error: null });

    const result = await placeOrderAction([{ productId: "p-1", quantity: 1 }]);
    expect(result).toEqual({ success: false, error: "Failed to record order items" });

    // The cleanup update should have run with status='cancelled'.
    const cleanupCall = mockOrdersCleanupUpdate.mock.calls[0][0];
    expect(cleanupCall.table).toBe("orders");
    expect(cleanupCall.args[0]).toEqual({ status: "cancelled" });
  });

  it("rejects when any product in the cart has insufficient stock", async () => {
    // The DB says 2 in stock; the buyer wants 3. Reject before
    // we create an order row.
    mockProductsIn.mockResolvedValueOnce({
      data: [{ id: "p-1", price: 100, stock: 2, name: "Cement" }],
      error: null,
    });

    const result = await placeOrderAction([{ productId: "p-1", quantity: 3 }]);
    expect(result).toEqual({
      success: false,
      error: "Insufficient stock for Cement. Only 2 left.",
    });
    // The order must not be created.
    expect(mockOrdersInsert).not.toHaveBeenCalled();
  });

  it("rejects when the product list from the DB doesn't match the cart", async () => {
    // The cart asked for p-1, p-2, p-3; the DB only returned p-1
    // (p-2 was deleted, p-3 is hidden by RLS). The mismatched
    // length triggers the "no longer available" error rather
    // than silently ordering whatever the DB did return.
    mockProductsIn.mockResolvedValueOnce({
      data: [{ id: "p-1", price: 100, stock: 5, name: "Cement" }],
      error: null,
    });

    const result = await placeOrderAction([
      { productId: "p-1", quantity: 1 },
      { productId: "p-2", quantity: 1 },
      { productId: "p-3", quantity: 1 },
    ]);
    expect(result).toEqual({
      success: false,
      error: "One or more products are no longer available",
    });
  });

  it("rejects when a product price is non-numeric", async () => {
    // A hand-edited row or a CSV import gone wrong could leave
    // `price` as a string. We refuse to do math on a string —
    // the alternative is a silent NaN propagating into the
    // total and a 0-naira Paystack init.
    mockProductsIn.mockResolvedValueOnce({
      data: [{ id: "p-1", price: "free", stock: 5, name: "Cement" }],
      error: null,
    });

    const result = await placeOrderAction([{ productId: "p-1", quantity: 1 }]);
    expect(result).toEqual({
      success: false,
      error: "Invalid price for Cement",
    });
    expect(mockOrdersInsert).not.toHaveBeenCalled();
  });
});
