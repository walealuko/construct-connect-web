// Pure helpers for the persistent cart. Kept separate from
// cart-actions.ts so they're testable without mocking Supabase.

import type { CartItem } from "@/types/database";

/**
 * Minimal shape the merge and stock-cap helpers need. Anything
 * more (description, images, etc.) is irrelevant to the math.
 */
export interface CartLine {
  id: string;
  quantity: number;
  stock: number;
}

/**
 * Merge two carts by product id, summing quantities. Sum rather
 * than max: a user with 2 of product X on phone and 1 of X on
 * laptop gets 3 of X after signing in. Matches Amazon, Shopify,
 * Etsy.
 *
 * The result is not capped at stock — that's a separate step. This
 * function is pure and unit-testable.
 */
export function mergeCarts<T extends CartLine>(
  guest: T[],
  server: T[],
): T[] {
  const byProduct = new Map<string, T>();
  for (const item of server) byProduct.set(item.id, item);
  for (const item of guest) {
    const existing = byProduct.get(item.id);
    if (existing) {
      byProduct.set(item.id, { ...existing, quantity: existing.quantity + item.quantity });
    } else {
      byProduct.set(item.id, item);
    }
  }
  return [...byProduct.values()];
}

/**
 * Cap each line at its product's available stock. Lines that
 * exceed stock are clamped; lines at or below stock pass through.
 * Lines whose stock is 0 (or negative) are dropped — there's no
 * point in keeping a cart line for a sold-out product.
 *
 * The function does not call back to a database. Callers pass a
 * stock lookup so tests can drive the helper without I/O. The
 * looked-up value is the source of truth — it overrides the
 * line's `stock` field on the way out, so a stale `stock` value
 * on the line doesn't survive into the persisted result.
 */
export function capAtStock<T extends CartLine>(
  lines: T[],
  stockLookup: (id: string) => number | null | undefined,
): T[] {
  const out: T[] = [];
  for (const line of lines) {
    const stock = stockLookup(line.id);
    if (stock == null || stock <= 0) continue; // drop — sold out or unknown
    out.push({ ...line, quantity: Math.min(line.quantity, stock), stock });
  }
  return out;
}

/**
 * Convert a guest cart from the CartItem shape the client uses
 * (full Product + quantity) to the minimal CartLine shape. We do
 * this on the client before calling the server action so the
 * payload stays small.
 */
export function toCartLine(item: CartItem): CartLine {
  return { id: item.id, quantity: item.quantity, stock: item.stock };
}
