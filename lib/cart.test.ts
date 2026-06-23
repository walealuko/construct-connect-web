import { describe, expect, it } from "vitest";
import { capAtStock, mergeCarts, toCartLine } from "./cart";
import type { CartItem } from "@/types/database";

const line = (id: string, quantity: number, stock = 99): { id: string; quantity: number; stock: number } => ({
  id,
  quantity,
  stock,
});

describe("mergeCarts", () => {
  it("returns [] when both carts are empty", () => {
    expect(mergeCarts([], [])).toEqual([]);
  });

  it("returns the guest cart when the server cart is empty", () => {
    const guest = [line("A", 2)];
    const server: typeof guest = [];
    expect(mergeCarts(guest, server)).toEqual([{ id: "A", quantity: 2, stock: 99 }]);
  });

  it("returns the server cart when the guest cart is empty", () => {
    const guest: { id: string; quantity: number; stock: number }[] = [];
    const server = [line("A", 3)];
    expect(mergeCarts(guest, server)).toEqual([{ id: "A", quantity: 3, stock: 99 }]);
  });

  it("sums quantities for the same product id", () => {
    const guest = [line("A", 2)];
    const server = [line("A", 1)];
    expect(mergeCarts(guest, server)).toEqual([{ id: "A", quantity: 3, stock: 99 }]);
  });

  it("unions disjoint products and sums overlaps", () => {
    const guest = [line("A", 1), line("B", 2)];
    const server = [line("A", 5), line("C", 1)];
    const merged = mergeCarts(guest, server);
    // The result is a Map, so order is insertion order: A from
    // server first, then B (new from guest), then C (already in
    // server). Use a Set comparison to be order-agnostic.
    expect(merged).toHaveLength(3);
    const byId = new Map(merged.map((m) => [m.id, m.quantity]));
    expect(byId.get("A")).toBe(6);
    expect(byId.get("B")).toBe(2);
    expect(byId.get("C")).toBe(1);
  });

  it("does not mutate the input arrays", () => {
    const guest = [line("A", 1)];
    const server = [line("A", 1)];
    mergeCarts(guest, server);
    expect(guest).toEqual([line("A", 1)]);
    expect(server).toEqual([line("A", 1)]);
  });
});

describe("capAtStock", () => {
  const lookup = (stock: Record<string, number>) => (id: string) => stock[id];

  it("drops lines whose product is sold out (stock 0)", () => {
    const out = capAtStock([line("A", 1, 0)], lookup({ A: 0 }));
    expect(out).toEqual([]);
  });

  it("drops lines whose stock is unknown (lookup returns null)", () => {
    const out = capAtStock([line("A", 1)], () => null);
    expect(out).toEqual([]);
  });

  it("drops lines whose stock is negative (defensive)", () => {
    const out = capAtStock([line("A", 1, -3)], lookup({ A: -3 }));
    expect(out).toEqual([]);
  });

  it("caps a line that exceeds stock", () => {
    const out = capAtStock([line("A", 5)], lookup({ A: 2 }));
    expect(out).toEqual([{ id: "A", quantity: 2, stock: 2 }]);
  });

  it("passes through a line that is at or below stock", () => {
    const out = capAtStock([line("A", 2)], lookup({ A: 5 }));
    expect(out).toEqual([{ id: "A", quantity: 2, stock: 5 }]);
  });

  it("handles a mixed list with several products", () => {
    const lines = [line("A", 1, 0), line("B", 10), line("C", 3), line("D", 7)];
    const out = capAtStock(lines, lookup({ A: 0, B: 10, C: 5, D: 5 }));
    // A dropped (stock 0). B kept as-is. C capped to 5. D capped to 5.
    expect(out).toEqual([
      { id: "B", quantity: 10, stock: 10 },
      { id: "C", quantity: 3, stock: 5 },
      { id: "D", quantity: 5, stock: 5 },
    ]);
  });
});

describe("toCartLine", () => {
  it("strips a CartItem down to id, quantity, stock", () => {
    const item: CartItem = {
      id: "X",
      name: "Widget",
      description: "A widget",
      price: 100,
      category: "tools",
      images: ["img/widget.jpg"],
      stock: 7,
      seller_id: "seller-1",
      seller_name: "Acme",
      location: "Lagos",
      created_at: "2026-01-01T00:00:00Z",
      quantity: 3,
    };
    expect(toCartLine(item)).toEqual({ id: "X", quantity: 3, stock: 7 });
  });
});
