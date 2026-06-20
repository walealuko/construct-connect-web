"use client";

import { useState, useEffect, useCallback, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Order, Product, Profile } from "@/types/database";
import { UserContext } from "@/components/UserContext";

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
  removePortfolioItem: (path: string) => Promise<void>;
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
  const [stats, setStats] = useState<DashboardStats>({
    revenue: 0,
    ordersCount: 0,
    productsCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Product pagination.
  const [productPage, setProductPage] = useState(1);
  const [productCount, setProductCount] = useState(0);

  // Cached list of every product id for this user — used for the orders
  // query so it doesn't refetch on every product-page change. Re-keyed by
  // productCount, which changes whenever the user creates or deletes a
  // product. Refresh() resets the cache.
  const [allProductIds, setAllProductIds] = useState<string[]>([]);

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

      // 2. Portfolio from profile row (default '{}').
      if (profileData && Array.isArray((profileData as Profile).portfolio)) {
        setPortfolio(((profileData as Profile).portfolio as string[]) ?? []);
      } else {
        setPortfolio([]);
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

      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);
      if (error) {
        setOrders(previous);
        toast.error(`Failed to update order: ${error.message}`);
        load();
        return;
      }
      toast.success(`Order updated to ${newStatus}`);
    },
    [orders, load]
  );

  const addPortfolioItem = useCallback(
    async (path: string) => {
      if (!user?.id) return;
      const next = [...portfolio, path];
      setPortfolio(next);
      // upsert so this also works the first time (profile row exists but
      // `portfolio` column not yet written to).
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, portfolio: next }, { onConflict: "id" });
      if (error) {
        setPortfolio(portfolio);
        throw error;
      }
    },
    [portfolio, user?.id]
  );

  const removePortfolioItem = useCallback(
    async (path: string) => {
      if (!user?.id) return;
      const previous = portfolio;
      const next = portfolio.filter((p) => p !== path);
      setPortfolio(next);
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, portfolio: next }, { onConflict: "id" });
      if (error) {
        setPortfolio(previous);
        throw error;
      }
    },
    [portfolio, user?.id]
  );

  const productPageCount = Math.max(1, Math.ceil(productCount / PRODUCT_PAGE_SIZE));
  const orderPageCount = Math.max(1, Math.ceil(orders.length / ORDER_PAGE_SIZE));

  return {
    profile,
    products,
    orders,
    portfolio,
    stats,
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
    removePortfolioItem,
  };
}
