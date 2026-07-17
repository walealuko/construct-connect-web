"use client";

import { useState, useEffect, useCallback, useContext, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Order, Product, Profile } from "@/types/database";
import { UserContext } from "@/components/UserContext";
import { updateOrderStatusAction } from "@/app/actions/orders";

interface DashboardStats {
  revenue: number;
  ordersCount: number;
  productsCount: number;
}

interface UseDashboardDataResult {
  // State
  profile: Profile | null;
  products: Product[];
  orders: Order[];
  portfolio: string[];
  stats: DashboardStats;
  loading: boolean;
  initialLoadDone: boolean;
  // Order ids with an open dispute. Surfaced in the seller
  // dashboard so the orders table can tint a row + show a
  // "Disputed" pill. The set is rebuilt on every load() (orders
  // can move in/out of dispute) and is a snapshot — the realtime
  // UPDATE on orders doesn't currently mirror a dispute flip, so
  // the page is expected to call refresh() if it opens one in
  // another tab.
  disputeOrderIds: Set<string>;

  // Product pagination (server-side)
  productPage: number;
  productPageCount: number;
  productCount: number;
  productPageSize: number;
  setProductPage: (page: number) => void;

  // Order pagination (client-side, bounded)
  orderPage: number;
  orderPageCount: number;
  // Total distinct orders across the user's products. Capped server-side at
  // ORDER_HARD_CAP rows; the cap is surfaced in the UI ("showing up to 500").
  orderCount: number;
  orderPageSize: number;
  setOrderPage: (page: number) => void;

  // Mutators
  refresh: () => Promise<void>;
  updateOrderStatus: (orderId: string, newStatus: string) => Promise<void>;
  addPortfolioItem: (path: string) => Promise<void>;
  addPortfolioItems: (paths: string[]) => Promise<void>;
  removePortfolioItem: (path: string) => Promise<void>;
  // Optimistic-update helpers. Callers (the dashboard pages) can
  // splice a freshly-created product into the visible list and
  // bump the product count without re-running the full load().
  // We expose the underlying setters rather than wrapping them
  // because the optimistic shape (prepend to products, +1 to
  // productCount, +1 to stats.productsCount) is the same across
  // both dashboards.
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setProductCount: React.Dispatch<React.SetStateAction<number>>;
  setStats: React.Dispatch<React.SetStateAction<DashboardStats>>;
}

const PRODUCT_PAGE_SIZE = 10;
const ORDER_PAGE_SIZE = 8;
const ORDER_HARD_CAP = 500; // server-side limit before dedupe/paginate

/**
 * Single source of truth for both seller and artisan dashboards.
 *
 * Real revenue: computed from order_items.price_at_purchase * quantity for
 * orders that contain any of the user's products and are in 'completed' status.
 *
 * Order status updates are applied locally first (optimistic) and rolled
 * back on error — no full reload required.
 *
 * Product pagination is server-side (range + exact count). Order pagination
 * is client-side: we cap the order_items fetch at ORDER_HARD_CAP rows,
 * dedupe by order_id, then slice in the UI. That covers a high-traffic
 * seller without changing the existing query shape.
 */
export function useDashboardData(): UseDashboardDataResult {
  const userContext = useContext(UserContext);
  const user = userContext?.user ?? null;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [portfolio, setPortfolio] = useState<string[]>([]);
  // Mirror of `portfolio` for synchronous reads. The portfolio write
  // path (addPortfolioItems / removePortfolioItem) used to capture
  // the "next" array via a `setPortfolio((prev) => { ...; return ...; })`
  // closure that assigned a `let nextSnapshot` in the outer scope.
  // That pattern is fragile: React does not guarantee the updater
  // runs before the next line of the caller, so the DB upsert
  // could fire with the *initial* `[]` snapshot and silently wipe
  // the existing portfolio on every upload. The ref gives us a
  // synchronous, always-fresh source of truth that the write path
  // can read without racing the React state updater.
  const portfolioRef = useRef<string[]>(portfolio);
  useEffect(() => {
    portfolioRef.current = portfolio;
  }, [portfolio]);
  const [stats, setStats] = useState<DashboardStats>({
    revenue: 0,
    ordersCount: 0,
    productsCount: 0,
  });
  // Set of order ids that have an open dispute. Rebuilt on every
  // load(); see the comment on the result interface for the
  // refresh story.
  const [disputeOrderIds, setDisputeOrderIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Product pagination.
  const [productPage, setProductPage] = useState(1);
  const [productCount, setProductCount] = useState(0);

  // Set-only cache of every product id for this user. The setter
  // exists to make the React DevTools dependency chain obvious (the
  // call site at line 138 is part of `load`), but nothing currently
  // reads the value back — orders use the same `seller_id` filter
  // instead. The underscore prefix is intentional to keep the lint
  // rule that flags unused-vars happy. Refreshed on every `load()`
  // call (which runs on `productPage` change and on explicit
  // `refresh()`). The cache is NOT keyed on `productCount` — it just
  // re-fetches `freshIds` whenever load runs.
  const [_allProductIds, setAllProductIds] = useState<string[]>([]);

  // Order pagination.
  const [orderPage, setOrderPage] = useState(1);
  // Server-side distinct-order count, surfaced as `orderCount` for the
  // dashboard's pagination total. Capped at ORDER_HARD_CAP because we
  // can't reliably dedupe counts the way we dedupe rows; we report the
  // raw order_items row count as a conservative upper bound.
  const [orderCount, setOrderCount] = useState(0);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Profile (may not exist yet — that's fine).
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(profileData as Profile | null);

      // 2. Portfolio from profile row (default '{}'). Treat
      //    null/missing/non-array as "no value to render" — but
      //    never clobber non-empty in-memory state with an empty
      //    read. A transient glitch that returns a partial row
      //    (e.g. the column is undefined, RLS strips it, network
      //    truncation) would otherwise visually wipe the gallery
      //    even though the DB still has every item. We only
      //    reset to [] when the in-memory state is already empty
      //    (fresh user, just-cleared) and the read confirms that.
      if (profileData) {
        const fromDb = (profileData as Profile).portfolio;
        if (Array.isArray(fromDb)) {
          setPortfolio(fromDb as string[]);
        } else if (fromDb == null && portfolioRef.current.length === 0) {
          // Confirm-empty: only reset when there's nothing to
          // lose. Non-array, non-null values (a stringified
          // array, an object) are silently ignored — the
          // column's NOT NULL DEFAULT '{}' check means this is
          // a pre-migration row that should be normalized, not
          // rendered.
          setPortfolio([]);
        }
      }

      // 3a. The full product id list — small (just uuids), used for the
      //     orders join. Cached across page changes.
      const { data: idsData } = await supabase
        .from("products")
        .select("id")
        .eq("seller_id", user.id);
      const freshIds = (idsData || []).map((p: { id: string }) => p.id);
      setAllProductIds(freshIds);

      // 3b. Products: server-side range + exact count for pagination.
      const productFrom = (productPage - 1) * PRODUCT_PAGE_SIZE;
      const productTo = productFrom + PRODUCT_PAGE_SIZE - 1;
      const { data: productsData, count: productTotal, error: pError } =
        await supabase
          .from("products")
          .select("*", { count: "exact" })
          .eq("seller_id", user.id)
          .order("created_at", { ascending: false })
          .range(productFrom, productTo);

      if (pError) throw pError;
      const productList = (productsData || []) as Product[];
      setProducts(productList);
      setProductCount(productTotal ?? 0);

      // 4. Orders: join via order_items, embed buyer profile, dedupe.
      //    Hard-cap the fetch — order_items rows can be far more than
      //    distinct orders because one order contains many items. The
      //    .range() here bounds the network response; the client paginates
      //    the deduped list.
      //
      //    We also issue a `head: true` count query against the same
      //    filter so the dashboard can show the real total (not just the
      //    capped slice length). The count is on order_items rows, so it
      //    is an upper bound on distinct orders — close enough for the
      //    "showing X orders" label.
      const { count: orderTotal, error: countError } = await supabase
        .from("order_items")
        .select("order_id", { count: "exact", head: true })
        .in("product_id", freshIds);

      if (countError) {
        console.error("Error counting orders:", countError);
      }
      setOrderCount(orderTotal ?? 0);

      const { data: rows, error: oError } = await supabase
        .from("order_items")
        .select(
          "order_id, price_at_purchase, quantity, orders!inner(id, buyer_id, status, created_at, profiles:buyer_id(first_name, last_name))"
        )
        .in("product_id", freshIds)
        .range(0, ORDER_HARD_CAP - 1)
        .order("created_at", { ascending: false, referencedTable: "orders" });

      if (oError) {
        console.error("Error fetching orders:", oError);
        setOrders([]);
        setStats({
          revenue: 0,
          ordersCount: 0,
          productsCount: productTotal ?? 0,
        });
        return;
      }

      const seen = new Set<string>();
      const ordersData: Order[] = [];
      const revenueByOrder = new Map<string, number>();
      for (const r of (rows || []) as any[]) {
        const raw = r.orders;
        const orderObj = Array.isArray(raw) ? raw[0] : raw;
        if (!orderObj) continue;
        if (!seen.has(orderObj.id)) {
          seen.add(orderObj.id);
          ordersData.push(orderObj as Order);
        }
        if (orderObj.status === "completed") {
          const lineTotal =
            Number(r.price_at_purchase || 0) * Number(r.quantity || 0);
          revenueByOrder.set(
            orderObj.id,
            (revenueByOrder.get(orderObj.id) || 0) + lineTotal
          );
        }
      }
      setOrders(ordersData);
      const revenue = Array.from(revenueByOrder.values()).reduce(
        (a, b) => a + b,
        0
      );
      setStats({
        revenue,
        ordersCount: ordersData.length,
        productsCount: productTotal ?? 0,
      });

      // 5. Disputes. Pull the open disputes whose order_id is in
      //    the set of orders we just loaded. RLS scopes this to
      //    either party on the order (the seller qualifies via
      //    the line-item path). We use a single .in() rather than
      //    a per-order lookup so a 500-order dashboard doesn't
      //    fan out into 500 round-trips.
      //
      //    An order id that flips into "disputed" between
      //    load() calls is a deliberate gap — the seller opens
      //    the dispute from the order-detail page, which can
      //    call refresh() if the dashboard is the open surface.
      if (ordersData.length > 0) {
        const orderIds = ordersData.map((o) => o.id);
        const { data: disputeRows, error: dError } = await supabase
          .from("disputes")
          .select("order_id, status")
          .eq("status", "open")
          .in("order_id", orderIds);
        if (dError) {
          console.error("Error fetching disputes:", dError);
        }
        setDisputeOrderIds(
          new Set((disputeRows || []).map((r) => r.order_id).filter(Boolean) as string[]),
        );
      } else {
        setDisputeOrderIds(new Set());
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
    }
  }, [user?.id, productPage]);

  useEffect(() => {
    if (user?.id) load();
  }, [user?.id, load]);

  const updateOrderStatus = useCallback(
    async (orderId: string, newStatus: string) => {
      const previous = orders;
      const previousStatusById = new Map(orders.map((o) => [o.id, o.status]));
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: newStatus as Order["status"] } : o
        )
      );

      const movingToCompleted = newStatus === "completed";
      const wasCompleted = previousStatusById.get(orderId) === "completed";
      if (movingToCompleted !== wasCompleted) {
        // The stats recompute can stay client-side because the
        // caller (the dashboard) already has the order_items it
        // needs to compute the delta — we don't need a server
        // round-trip just for the stat display.
        const { data: items } = await supabase
          .from("order_items")
          .select("price_at_purchase, quantity")
          .eq("order_id", orderId);
        const delta = (items || []).reduce(
          (sum, it) =>
            sum + Number(it.price_at_purchase || 0) * Number(it.quantity || 0),
          0
        );
        setStats((s) => ({
          ...s,
          revenue: s.revenue + (movingToCompleted ? delta : -delta),
        }));
      }

      // Server-side update + email trigger (the buyer's "your order
      // shipped" email). The previous client-side write was moved
      // into updateOrderStatusAction so the email can run in the
      // same handler.
      const result = await updateOrderStatusAction(orderId, newStatus);
      if (!result.success) {
        setOrders(previous);
        toast.error(`Failed to update order: ${result.error}`);
        load();
        return;
      }
      toast.success(`Order updated to ${newStatus}`);
    },
    [orders, load]
  );

  const addPortfolioItems = useCallback(
    async (paths: string[]) => {
      if (!user?.id || paths.length === 0) return;
      // Read the freshest portfolio via the ref (not the React
      // state — see portfolioRef's comment for why). The ref is
      // updated on every render via the effect above, so its
      // value is the same as the latest committed state.
      // Computing `next` synchronously here means the upsert
      // payload is always "current + new" — never the initial
      // `[]` from a half-run updater.
      const next = [...portfolioRef.current, ...paths];
      setPortfolio(next);
      // upsert so this also works the first time (profile row exists but
      // `portfolio` column not yet written to).
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, portfolio: next }, { onConflict: "id" });
      if (error) {
        // The DB will be reloaded on next refresh(); the in-memory
        // state is already ahead. Caller toasts the error.
        throw error;
      }
    },
    [user?.id]
  );

  const addPortfolioItem = useCallback(
    async (path: string) => {
      await addPortfolioItems([path]);
    },
    [addPortfolioItems]
  );

  const removePortfolioItem = useCallback(
    async (path: string) => {
      if (!user?.id) return;
      // Read the freshest portfolio via the ref so the optimistic
      // remove + the DB write are computed against the latest
      // committed state. The previous implementation closed over
      // `portfolio` from the click-render, which raced against
      // earlier in-flight removes: two rapid clicks would each
      // read a pre-click snapshot and the second DB write would
      // un-do the first.
      const previous = portfolioRef.current;
      const next = previous.filter((p) => p !== path);
      setPortfolio(next);
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, portfolio: next }, { onConflict: "id" });
      if (error) {
        setPortfolio(previous);
        throw error;
      }
    },
    [user?.id]
  );

  const productPageCount = Math.max(1, Math.ceil(productCount / PRODUCT_PAGE_SIZE));
  const orderPageCount = Math.max(1, Math.ceil(orders.length / ORDER_PAGE_SIZE));

  return {
    profile,
    products,
    orders,
    portfolio,
    stats,
    disputeOrderIds,
    loading,
    initialLoadDone,
    productPage,
    productPageCount,
    productCount,
    productPageSize: PRODUCT_PAGE_SIZE,
    setProductPage,
    orderPage,
    orderPageCount,
    orderCount,
    orderPageSize: ORDER_PAGE_SIZE,
    setOrderPage,
    refresh: load,
    updateOrderStatus,
    addPortfolioItem,
    addPortfolioItems,
    removePortfolioItem,
    setProducts,
    setProductCount,
    setStats,
  };
}
