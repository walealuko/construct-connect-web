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

  // Mutators
  refresh: () => Promise<void>;
  updateOrderStatus: (orderId: string, newStatus: string) => Promise<void>;
  addPortfolioItem: (path: string) => Promise<void>;
  removePortfolioItem: (path: string) => Promise<void>;
}

/**
 * Single source of truth for both seller and artisan dashboards.
 *
 * Real revenue: computed from order_items.price_at_purchase * quantity for
 * orders that contain any of the user's products and are in 'completed' status.
 *
 * Order status updates are applied locally first (optimistic) and rolled
 * back on error — no full reload required.
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

      // 2. Portfolio: only present for artisans, but the column is on every
      //    profile row (default '{}'). Read once, keep in state.
      if (profileData && Array.isArray((profileData as Profile).portfolio)) {
        setPortfolio(((profileData as Profile).portfolio as string[]) ?? []);
      } else {
        setPortfolio([]);
      }

      // 3. Products owned by this user.
      const { data: productsData, error: pError } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", user.id);
      if (pError) throw pError;
      const productList = (productsData || []) as Product[];
      setProducts(productList);

      // 4. Orders: join via order_items, embed buyer profile, dedupe.
      const productIds = productList.map((p) => p.id);
      if (productIds.length === 0) {
        setOrders([]);
        setStats({ revenue: 0, ordersCount: 0, productsCount: productList.length });
        return;
      }

      const { data: rows, error: oError } = await supabase
        .from("order_items")
        .select(
          "order_id, price_at_purchase, quantity, orders!inner(id, buyer_id, status, created_at, profiles:buyer_id(first_name, last_name))"
        )
        .in("product_id", productIds)
        .order("created_at", { ascending: false, referencedTable: "orders" });

      if (oError) {
        console.error("Error fetching orders:", oError);
        setOrders([]);
        setStats({ revenue: 0, ordersCount: 0, productsCount: productList.length });
        return;
      }

      // Dedupe by order id, normalise embedded shape.
      const seen = new Set<string>();
      const ordersData: Order[] = [];
      // Track which rows are completed and on which order, so we can sum
      // revenue on the same pass without a second round-trip.
      const revenueByOrder = new Map<string, number>();
      for (const r of (rows || []) as any[]) {
        const raw = r.orders;
        const orderObj = Array.isArray(raw) ? raw[0] : raw;
        if (!orderObj) continue;
        if (!seen.has(orderObj.id)) {
          seen.add(orderObj.id);
          ordersData.push(orderObj as Order);
        }
        // Always add to the per-order total — completed orders will
        // sum it; non-completed will ignore it.
        if (orderObj.status === "completed") {
          const lineTotal = Number(r.price_at_purchase || 0) * Number(r.quantity || 0);
          revenueByOrder.set(orderObj.id, (revenueByOrder.get(orderObj.id) || 0) + lineTotal);
        }
      }
      setOrders(ordersData);
      const revenue = Array.from(revenueByOrder.values()).reduce((a, b) => a + b, 0);
      setStats({
        revenue,
        ordersCount: ordersData.length,
        productsCount: productList.length,
      });
    } catch (err) {
      console.error("Dashboard load error:", err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) load();
  }, [user?.id, load]);

  const updateOrderStatus = useCallback(
    async (orderId: string, newStatus: string) => {
      // Optimistic update — apply locally first, rollback on error.
      const previous = orders;
      const previousStatusById = new Map(orders.map((o) => [o.id, o.status]));
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus as Order["status"] } : o))
      );

      // If the order moves INTO or OUT OF completed, recompute revenue.
      const movingToCompleted = newStatus === "completed";
      const wasCompleted = previousStatusById.get(orderId) === "completed";
      if (movingToCompleted !== wasCompleted) {
        // Fetch the line items for this order to add/remove its contribution.
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
        // Rollback.
        setOrders(previous);
        toast.error(`Failed to update order: ${error.message}`);
        // Reload to recover correct revenue.
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
      setPortfolio(next); // optimistic
      const { error } = await supabase
        .from("profiles")
        .update({ portfolio: next })
        .eq("id", user.id);
      if (error) {
        setPortfolio(portfolio); // rollback
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
      setPortfolio(next); // optimistic
      const { error } = await supabase
        .from("profiles")
        .update({ portfolio: next })
        .eq("id", user.id);
      if (error) {
        setPortfolio(previous); // rollback
        throw error;
      }
    },
    [portfolio, user?.id]
  );

  return {
    profile,
    products,
    orders,
    portfolio,
    stats,
    loading,
    initialLoadDone,
    refresh: load,
    updateOrderStatus,
    addPortfolioItem,
    removePortfolioItem,
  };
}
