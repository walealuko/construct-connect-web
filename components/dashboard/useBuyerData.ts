"use client";

import { useState, useEffect, useCallback, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Order, Product, Profile } from "@/types/database";
import { UserContext } from "@/components/UserContext";
import {
  removeProductViewAction,
} from "@/app/actions/products";
import { deleteOrderAction } from "@/app/actions/orders";
import type { Conversation, Profile as ChatProfile } from "@/types/chat";

/**
 * The order type the buyer-dashboard table renders. Each row carries
 * the order itself plus a denormalized `total_price` projected from
 * `total_amount` so the page can read it without a per-row join.
 */
type BuyerOrder = Order & { total_price: number };

interface UseBuyerDataResult {
  // State
  profile: Profile | null;
  orders: BuyerOrder[];
  viewedProducts: Product[];
  conversations: Conversation[];
  loading: boolean;
  initialLoadDone: boolean;

  // Mutators
  refresh: () => Promise<void>;
  removeViewedProduct: (productId: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
}

/**
 * Single source of truth for the buyer dashboard.
 *
 * Owns: profile row, the buyer's own orders (with `total_price`
 * projected from `total_amount`), the buyer's recently-viewed
 * products (capped at 10 server-side), and a small inbox preview
 * (5 most recent non-hidden conversations, with other-participant
 * profiles joined).
 *
 * Also mounts a Realtime channel that mirrors `orders` UPDATEs
 * (the seller's status flip) into the local list so the buyer sees
 * the status change without a refresh. The channel is filtered to
 * `buyer_id=eq.<self>` server-side; we re-filter client-side as
 * belt-and-braces.
 *
 * Does NOT own: confirm-dialog state, "currently deleting" state,
 * navigation. Those are UI concerns that belong to the page.
 */
export function useBuyerData(): UseBuyerDataResult {
  const userContext = useContext(UserContext);
  const user = userContext?.user ?? null;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [viewedProducts, setViewedProducts] = useState<Product[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      setProfile((profileData as Profile | null) ?? null);

      // The orders schema has a separate `order_items` table. The
      // canonical total lives on the orders row itself in
      // `total_amount` (set at checkout from the cart total), so we
      // don't need to re-sum line items here — just read the
      // snapshot. This is also what the API verify route compares
      // against the Paystack amount, so the two stay in lockstep.
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });
      const ordersList = ordersData || [];
      setOrders(
        ordersList.map((o) => ({
          ...o,
          total_price: Number((o as { total_amount?: number }).total_amount ?? 0),
        })),
      );

      const { data: viewedData } = await supabase
        .from("viewed_products")
        .select("product_id")
        .eq("user_id", user.id)
        .order("viewed_at", { ascending: false })
        .limit(10);

      if (viewedData) {
        const productIds = viewedData.map((v) => v.product_id);
        const { data: products } = await supabase
          .from("products")
          .select("*")
          .in("id", productIds);
        setViewedProducts(products || []);
      } else {
        setViewedProducts([]);
      }

      // Recent conversations the buyer is part of. The conversations
      // table has a uuid[] `participant_ids` column that PostgREST
      // can't auto-embed, so we use the array-overlap operator and
      // then fetch participant profiles in a second query.
      //
      // We also filter out conversations the user has hidden from
      // their inbox (per-user hide rows in `conversation_hides`,
      // RLS-gated to user_id = auth.uid()). Otherwise the "Messages"
      // widget on this dashboard would re-show conversations the
      // user already hid from /messages.
      const { data: hides } = await supabase
        .from("conversation_hides")
        .select("conversation_id");
      const hiddenIds = new Set<string>(
        (hides || []).map((h) => h.conversation_id),
      );

      const { data: convs } = await supabase
        .from("conversations")
        .select("*")
        .overlaps("participant_ids", [user.id])
        .order("last_message_at", { ascending: false })
        .limit(5);

      const visibleConvs = (convs || []).filter((c) => !hiddenIds.has(c.id));

      if (visibleConvs.length > 0) {
        const idSet = new Set<string>();
        for (const c of visibleConvs) {
          for (const pid of c.participant_ids || []) idSet.add(pid);
        }
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, avatar_url")
          .in("id", Array.from(idSet));
        const byId: Record<string, ChatProfile> = {};
        for (const p of profiles || []) byId[p.id] = p as ChatProfile;
        const enriched = visibleConvs.map((c) => ({
          ...c,
          profiles: (c.participant_ids || [])
            .map((pid: string) => byId[pid])
            .filter(Boolean),
        }));
        setConversations(enriched as Conversation[]);
      } else {
        setConversations([]);
      }
    } catch (err) {
      console.error("Error loading buyer data:", err);
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) load();
  }, [user?.id, load]);

  // Realtime: a seller can mark one of the buyer's orders as
  // "shipped" / "delivered" / "completed" from their own
  // dashboard. The buyer-dashboard's local `orders` state is the
  // single source of truth for the Order History table, so we
  // mirror the seller's UPDATE into it so the badge flips in
  // real time without a refresh. RLS scopes the channel to the
  // buyer's own rows; we still filter on the client as a
  // belt-and-braces measure in case RLS changes.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`buyer-orders-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `buyer_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as BuyerOrder;
          if (!updated?.id) return;
          setOrders((prev) => {
            const idx = prev.findIndex((o) => o.id === updated.id);
            if (idx < 0) return prev;
            const next = prev.slice();
            // Preserve the computed `total_price` mirror (loaded
            // from `total_amount` at fetch time). The realtime
            // payload doesn't carry that projection, so re-apply
            // it from the existing row.
            const previous = prev[idx];
            next[idx] = {
              ...previous,
              ...updated,
              total_price: previous.total_price,
            };
            // Toast the status change so the user notices even if
            // they're scrolled past the table.
            if (previous.status !== updated.status) {
              toast.info(`Order ${updated.id.slice(0, 8)}: now ${updated.status}`);
            }
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const removeViewedProduct = useCallback(
    async (productId: string) => {
      try {
        const result = await removeProductViewAction(productId);
        if (result.success) {
          toast.success("Removed from history");
          await load();
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("Failed to remove product");
      }
    },
    [load],
  );

  // Soft-delete: flip deleted_at on the orders row, then splice
  // it out of local state. The buyer-side RLS (from migration
  // 0015) filters `deleted_at IS NULL` so the row disappears
  // from any future read. The seller-side RLS is unchanged, so the
  // seller's view of the order is unaffected.
  //
  // The caller (the page) is responsible for the confirm dialog
  // and the "currently deleting" button state. We just own the
  // optimistic splice + rollback + server action.
  const deleteOrder = useCallback(
    async (orderId: string) => {
      const previous = orders;
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      try {
        const result = await deleteOrderAction(orderId);
        if (!result.success) {
          setOrders(previous);
          toast.error(result.error || "Failed to remove order");
          return;
        }
        toast.success("Order removed from your history");
      } catch (err: unknown) {
        setOrders(previous);
        toast.error(
          err instanceof Error ? err.message : "Failed to remove order",
        );
      }
    },
    [orders],
  );

  return {
    profile,
    orders,
    viewedProducts,
    conversations,
    loading,
    initialLoadDone,
    refresh: load,
    removeViewedProduct,
    deleteOrder,
  };
}
