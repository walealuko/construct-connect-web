"use client";

import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from "react";
import { Product, CartItem } from "@/types/database";
import { UserContext } from "@/components/UserContext";
import { fetchCartAction, syncCartAction, clearCartAction } from "@/lib/cart-actions";
import { mergeCarts } from "@/lib/cart";
import { log } from "@/lib/logger";

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

const STORAGE_KEY = "cart";

export const CartContext = createContext<CartContextType | null>(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
};

/**
 * Read the guest cart from localStorage. The cart is kept in
 * localStorage so it survives page refreshes; the server-side cart
 * is a parallel mirror that survives sign-in / cross-device.
 */
function readGuestCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeGuestCart(cart: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    /* localStorage may be unavailable (private mode, quota) */
  }
}

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  // UserContext may be null if a component using useCart sits above
  // the UserProvider in the tree (rare, but possible — e.g. a
  // pre-rendered shell during SSR before providers hydrate). Fall
  // back to a no-user state, which is the guest-mode behavior.
  const userContext = useContext(UserContext);
  const user = userContext?.user ?? null;
  const [cart, setCart] = useState<CartItem[]>([]);
  // Tracks which user the cart is currently synced for. When this
  // changes, we re-fetch from the server (and merge with the local
  // guest cart if the user just signed in).
  const lastSyncedUserId = useRef<string | null>(null);
  // Tracks the in-flight sign-in merge so two concurrent auth events
  // don't both try to write the merged result.
  const mergingRef = useRef<boolean>(false);

  // ----- Hydration & sync with the server -----

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Always start with the localStorage cart so the UI has something
    // to render before the server round-trip resolves.
    setCart(readGuestCart());
  }, []);

  useEffect(() => {
    // No user → no server sync. localStorage is the source of truth.
    if (!user) {
      lastSyncedUserId.current = null;
      return;
    }
    // Same user we already synced for — nothing to do.
    if (lastSyncedUserId.current === user.id) return;
    lastSyncedUserId.current = user.id;

    let cancelled = false;
    (async () => {
      try {
        mergingRef.current = true;
        // 1. Read the local guest cart (may be empty if the user just
        //    signed in on a fresh device).
        const guest = readGuestCart();
        // 2. Read the server cart for this user.
        const serverRes = await fetchCartAction();
        const server = serverRes.success ? serverRes.items : [];

        if (cancelled) return;

        // 3. If there's nothing in the guest cart and nothing on the
        //    server, just leave the local state empty.
        if (guest.length === 0 && server.length === 0) {
          setCart([]);
          return;
        }

        // 4. If there's a guest cart and no server cart, the guest
        //    cart IS the new server cart. Persist it.
        if (server.length === 0) {
          const res = await syncCartAction(
            guest.map((g) => ({ id: g.id, quantity: g.quantity, stock: g.stock })),
          );
          if (cancelled) return;
          if (res.success) {
            // The server may have capped or dropped lines. Use the
            // returned items as the new local state.
            setCart(res.items);
            // Persist the post-cap state to localStorage so a
            // sign-out restores the same view.
            writeGuestCart(res.items);
          } else {
            // Sync failed — leave the local cart as-is so the user
            // doesn't lose their work. Log the failure.
            log.error("cart_sync_failed_on_signin", { error: res.error });
          }
          return;
        }

        // 5. Both guest and server have items — merge. The pure
        //    helper in lib/cart.ts owns the math (sum quantities
        //    for the same product id, union disjoint ids). After
        //    merging, we write the result back through syncCartAction
        //    so the server's stock-cap and the post-cap item shape
        //    come back as the canonical local state.
        const merged = mergeCarts(guest, server);

        // Persist the merged state.
        const res = await syncCartAction(
          merged.map((m) => ({ id: m.id, quantity: m.quantity, stock: m.stock })),
        );
        if (cancelled) return;
        if (res.success) {
          setCart(res.items);
          writeGuestCart(res.items);
        } else {
          // Sync failed but the user is signed in — show the server
          // cart locally, leave the guest cart alone in localStorage
          // so a retry (e.g. refresh) can re-attempt the merge.
          setCart(server);
          const guestOnlyCount = guest.filter(
            (g) => !server.some((s) => s.id === g.id),
          ).length;
          log.error("cart_sync_failed_on_signin", { error: res.error, guestOnlyCount });
        }
      } finally {
        mergingRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // ----- Write-through: when signed in, every mutation hits the server -----

  const persistToServer = useCallback(async (next: CartItem[]) => {
    if (!user) return;
    try {
      const res = await syncCartAction(
        next.map((n) => ({ id: n.id, quantity: n.quantity, stock: n.stock })),
      );
      if (!res.success) {
        log.error("cart_persist_failed", { error: res.error });
        return;
      }
      // The server may have capped quantities or dropped lines. Update
      // local state to match. This is the source of truth — we trust
      // the server's view over what the client just sent.
      setCart(res.items);
      writeGuestCart(res.items);
    } catch (e) {
      log.error("cart_persist_threw", { message: e instanceof Error ? e.message : String(e) });
    }
  }, [user]);

  // Always keep localStorage in sync with local state, regardless of
  // auth state. The same key is used for both modes; the value
  // happens to be the local view of whatever the canonical source is.
  useEffect(() => {
    if (typeof window === "undefined") return;
    // While a sign-in merge is in flight, the local state is the
    // pre-merge guest cart; writing it back would clobber the
    // pre-merge state with the pre-merge state (no-op), but skipping
    // the write avoids a pointless disk hit.
    if (mergingRef.current) return;
    writeGuestCart(cart);
  }, [cart]);

  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      const next = existingItem
        ? prevCart.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        : [...prevCart, { ...product, quantity: 1 }];
      // Fire-and-forget the server write when signed in. We don't
      // await — the local state already updated optimistically.
      void persistToServer(next);
      return next;
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prevCart) => {
      const next = prevCart.filter((item) => item.id !== id);
      void persistToServer(next);
      return next;
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    setCart((prevCart) => {
      const next = prevCart.map((item) => (item.id === id ? { ...item, quantity } : item));
      void persistToServer(next);
      return next;
    });
  };

  const clearCart = () => {
    setCart([]);
    // When signed in, also clear the server cart.
    if (user) {
      void (async () => {
        try {
          const res = await clearCartAction();
          if (!res.success) log.error("cart_clear_failed", { error: res.error });
        } catch (e) {
          log.error("cart_clear_threw", { message: e instanceof Error ? e.message : String(e) });
        }
      })();
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
