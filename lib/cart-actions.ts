"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { capAtStock } from "@/lib/cart";
import type { CartItem } from "@/types/database";

// Note: a "use server" file can only export async functions.
// `mergeCarts` and `capAtStock` are imported here (the latter is
// used by `syncCartAction`) but not re-exported — callers needing
// the helpers should import them from "@/lib/cart" directly.

/**
 * Replace the current user's entire cart with the supplied lines.
 * Server-side; RLS ensures the user can only affect their own cart.
 *
 * Used on sign-in to write the merged cart back, and on any
 * mutation that the local cache has already applied. The CartItem
 * payload includes stock (the client has the full product data), so
 * the action can cap quantities at stock before writing — preventing
 * the cart from carrying more of a product than the seller has
 * available. Out-of-stock lines are dropped.
 *
 * Returns the final CartItem list the server ended up with, so the
 * client can reconcile its local cache if the server capped any
 * quantities or dropped any lines.
 */
export async function syncCartAction(
  lines: { id: string; quantity: number; stock: number }[],
): Promise<{ success: true; items: CartItem[] } | { success: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in" };

  // Cap at stock using the stock the client already has. The client
  // knows the stock from the marketplace; trusting it here avoids an
  // extra products round-trip on every cart mutation. The cap is a
  // sanity check — the checkout flow re-validates stock at order
  // time, which is the source of truth.
  const capped = capAtStock(lines, (id) => lines.find((l) => l.id === id)?.stock);

  if (capped.length === 0) {
    // Nothing to keep. Clear the user's cart and return empty.
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", user.id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/cart");
    return { success: true, items: [] };
  }

  // Upsert the kept lines. Upsert on the (user_id, product_id) PK
  // means the same call handles both "first time we see this row"
  // and "row exists, update quantity".
  const rows = capped.map((l) => ({
    user_id: user.id,
    product_id: l.id,
    quantity: l.quantity,
  }));
  const { error: upsertError } = await supabase
    .from("cart_items")
    .upsert(rows, { onConflict: "user_id,product_id" });
  if (upsertError) return { success: false, error: upsertError.message };

  // Drop any rows the cap removed (lines that no longer pass the
  // filter). Compare against the *original* input, not the capped
  // set, so the diff includes lines that were dropped entirely.
  const keepIds = new Set(capped.map((l) => l.id));
  const dropped = lines.filter((l) => !keepIds.has(l.id));
  if (dropped.length > 0) {
    const { error: deleteError } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", user.id)
      .in("product_id", dropped.map((d) => d.id));
    if (deleteError) return { success: false, error: deleteError.message };
  }

  // Re-read with the products joined in, so the client gets the full
  // CartItem shape it expects (price, name, images, ...). One
  // round-trip — the same query the cart page issues on render.
  const { data: items, error: readError } = await readServerCart(supabase, user.id);
  if (readError) return { success: false, error: readError };
  revalidatePath("/cart");
  return { success: true, items };
}

/**
 * Read the current user's cart joined with the products table, so
 * the client gets the full CartItem shape. Returns CartItem[].
 */
export async function fetchCartAction(): Promise<
  { success: true; items: CartItem[] } | { success: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in" };

  const { data: items, error } = await readServerCart(supabase, user.id);
  if (error) return { success: false, error };
  return { success: true, items };
}

/**
 * Clear the current user's cart. Used after a successful checkout.
 */
export async function clearCartAction(): Promise<
  { success: true } | { success: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in" };

  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("user_id", user.id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/cart");
  return { success: true };
}

/**
 * Internal: join cart_items with products. RLS still applies on
 * both tables, so the result is automatically limited to the
 * caller's own cart rows. Returns CartItem[] (the shape the client
 * uses) plus an error string on failure.
 */
type ProductJoin = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  stock: number;
  seller_id: string;
  location: string;
  created_at: string;
};

type CartItemJoin = {
  quantity: number;
  products: ProductJoin;
};

async function readServerCart(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<{ data: CartItem[]; error: string | null }> {
  const { data, error } = await supabase
    .from("cart_items")
    .select(
      // Pull the product fields the CartItem type expects. The
      // trailing `, quantity` adds the cart_items.quantity column
      // alongside the embedded product.
      `quantity, products:product_id (
        id, name, description, price, category, images, stock,
        seller_id, location, created_at
      )`,
    )
    .eq("user_id", userId);

  if (error) return { data: [], error: error.message };

  // Flatten the join. PostgREST returns the foreign-key side as an
  // object (one product per cart row). Tolerate an array too — the
  // .single() form is the standard, but if a future migration
  // changes the relationship cardinality the helper stays correct.
  const items: CartItem[] = (data ?? [])
    .map((row: CartItemJoin | { quantity: number; products: ProductJoin[] }) => {
      const product = Array.isArray((row as { products: ProductJoin | ProductJoin[] }).products)
        ? (row as { products: ProductJoin[] }).products[0]
        : (row as CartItemJoin).products;
      if (!product) return null;
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        images: product.images,
        stock: product.stock,
        seller_id: product.seller_id,
        seller_name: "", // not joined in; the cart page doesn't use it
        location: product.location,
        created_at: product.created_at,
        quantity: row.quantity,
      } satisfies CartItem;
    })
    .filter((x): x is CartItem => x !== null);

  return { data: items, error: null };
}
