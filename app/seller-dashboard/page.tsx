"use client";

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { UserContext } from "@/components/UserContext";
import { Product } from "@/types/database";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { ProductInventory } from "@/components/dashboard/ProductInventory";
import { toast } from "sonner";
import Link from "next/link";
import {
  createProductAction,
  deleteProductAction,
  updateProductAction,
} from "@/app/actions/products";
import { listMyOpenDisputesAction } from "@/app/actions/disputes";

import { useDashboardData } from "@/components/dashboard/useDashboardData";
import { ProfileCard } from "@/components/dashboard/ProfileCard";
import { ProfileIncompleteBanner } from "@/components/dashboard/ProfileIncompleteBanner";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { ProductFormModal } from "@/components/dashboard/ProductFormModal";
import { ConfirmDeleteModal } from "@/components/dashboard/ConfirmDeleteModal";
import { OrdersTable } from "@/components/dashboard/OrdersTable";

export default function SellerDashboard() {
  const userContext = useContext(UserContext);
  const { user, loading: authLoading } = userContext || { user: null, loading: true };

  const {
    profile,
    products,
    orders,
    stats,
    loading,
    refresh,
    updateOrderStatus,
    productPage,
    productPageCount,
    productCount,
    productPageSize,
    setProductPage,
    orderPage,
    orderPageCount,
    orderCount,
    orderPageSize,
    setOrderPage,
    setProducts,
    setProductCount,
    setStats,
    disputeOrderIds,
  } = useDashboardData();

  // The "needs human" count. Drives the disputes widget above
  // the orders table. We fetch on mount and on user change, not
  // on every refresh() — the count is a snapshot, and a buyer
  // opening a dispute from another tab is a small enough event
  // that a re-render on next dashboard visit is fine.
  const [openDisputesCount, setOpenDisputesCount] = useState<number>(0);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await listMyOpenDisputesAction();
      if (cancelled) return;
      if (result.success) {
        setOpenDisputesCount(result.count);
      } else {
        // Don't toast — the count is decorative and a backend
        // hiccup on the disputes table shouldn't bug the user
        // mid-dashboard. Just log to the console for now.
        console.error("Failed to load open disputes count:", result.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Client-side slice of the orders list for the current page.
  const pagedOrders = useMemo(() => {
    const start = (orderPage - 1) * orderPageSize;
    return orders.slice(start, start + orderPageSize);
  }, [orders, orderPage, orderPageSize]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Ref to the inventory section — used to scroll the user back to the
  // new product card after a successful create. Without this, the user
  // has to hunt for their freshly-added card in the grid.
  const inventorySectionRef = useRef<HTMLElement | null>(null);

  if (authLoading) {
    return (
      <DashboardLayout userRole="business">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  const handleCreate = async (data: {
    name: string;
    description: string;
    price: number;
    category: string;
    stock: number;
    images: string[];
  }) => {
    const result = await createProductAction(data);
    if (!result.success) {
      // Surface the failure inline instead of throwing — the modal doesn't
      // need to catch, and a thrown error here would trip the React error
      // boundary.
      toast.error(result.error || "Failed to add product");
      return;
    }
    toast.success("Product added successfully!");
    setIsAddOpen(false);

    // Belt-and-suspenders: update the local state synchronously so
    // the inventory and "Total Products" stat reflect the new row
    // THIS render, then re-fetch from the server to converge on
    // the canonical state. The optimistic update is what makes the
    // UI feel instant; the refresh() is what makes it correct.
    //
    // We only do the optimistic splice when we have the inserted
    // row back from the action AND we're on page 1 (the new
    // product is ordered by created_at desc, so it lands on page
    // 1). On other pages the count still bumps but the list does
    // not change, which is the right behavior.
    if (result.product && productPage === 1) {
      setProducts((prev) => [result.product, ...prev]);
    }
    setProductCount((prev) => prev + 1);
    setStats((s) => ({ ...s, productsCount: s.productsCount + 1 }));

    // Then converge on the server's exact view. If the optimistic
    // update raced with a concurrent delete (or our splice was
    // wrong because the page changed during the action), the
    // refresh() corrects the visible list and count.
    void refresh();
    // requestAnimationFrame defers the scroll until after the
    // DOM commit so smooth-scroll has a target to animate to.
    // The section ref is on the inventory wrapper.
    requestAnimationFrame(() => {
      inventorySectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleUpdate = async (data: {
    name: string;
    description: string;
    price: number;
    category: string;
    stock: number;
    images: string[];
  }) => {
    if (!editingProduct) return;
    const result = await updateProductAction(editingProduct.id, data);
    if (!result.success) throw new Error(result.error);
    toast.success("Product updated successfully!");
    setEditingProduct(null);
    refresh();
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      const result = await deleteProductAction(deletingId);
      if (!result.success) throw new Error(result.error);
      toast.success("Product deleted successfully");
      setDeletingId(null);
      // Optimistic: drop the card and bump counts down so the
      // UI is correct THIS render. The refresh() then converges
      // on the server's exact view. Same pattern as handleCreate.
      setProducts((prev) => prev.filter((p) => p.id !== deletingId));
      setProductCount((prev) => Math.max(0, prev - 1));
      setStats((s) => ({ ...s, productsCount: Math.max(0, s.productsCount - 1) }));
      void refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout userRole="business">
      <div className="space-y-8">
        <ProfileIncompleteBanner profile={profile} requireFields={["business_name", "location"]} />

        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900">Seller Dashboard</h2>
            <p className="text-gray-500 font-medium">Manage your inventory and sales</p>
          </div>
          <Button
            onClick={() => setIsAddOpen(true)}
            aria-label="Add new product"
            className="px-6 py-3 text-base font-bold shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            + Add New Product
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <ProfileCard profile={profile} user={user} variant="seller" />
            <StatsCards
              revenue={stats.revenue}
              ordersCount={stats.ordersCount}
              productsCount={stats.productsCount}
            />
          </div>

          <div className="lg:col-span-3 space-y-8">
            <section ref={inventorySectionRef}>
              <div className="flex justify-between items-end mb-4">
                <h3 className="text-xl font-bold text-slate-800">Product Inventory</h3>
                <Link href="/messages" className="text-sm font-bold text-blue-600 hover:underline">
                  View Messages →
                </Link>
              </div>

              <ProductInventory
                products={products}
                loading={loading}
                onEdit={setEditingProduct}
                onDelete={setDeletingId}
              />

              <Pagination
                page={productPage}
                pageCount={productPageCount}
                totalCount={productCount}
                pageSize={productPageSize}
                onPageChange={setProductPage}
                loading={loading}
              />
            </section>

            <section>
              <div className="flex justify-between items-end mb-4">
                <h3 className="text-xl font-bold text-slate-800">Needs review</h3>
                <span className="text-xs text-gray-400">Disputes awaiting your team</span>
              </div>
              <Card>
                <CardContent className="p-5 flex flex-wrap items-center gap-4">
                  {/* Big number — the "needs human right now" signal. The
                      red tint only shows when there's at least one
                      open dispute; otherwise the count is grey so the
                      widget doesn't feel alarmist on a quiet day. */}
                  <div
                    className={`text-4xl font-black ${
                      openDisputesCount > 0 ? "text-red-600" : "text-gray-400"
                    }`}
                    data-testid="open-disputes-count"
                  >
                    {openDisputesCount}
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-sm font-semibold text-slate-800">
                      {openDisputesCount === 0
                        ? "No open disputes — your queue is clear."
                        : openDisputesCount === 1
                        ? "1 order is currently in dispute."
                        : `${openDisputesCount} orders are currently in dispute.`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Disputed rows are tinted in the orders table below; the
                      status select is disabled until the dispute is resolved.
                    </p>
                  </div>
                  <Button asChild variant="secondary" className="px-4 py-2 text-sm font-bold">
                    {/* The per-seller listing is a follow-up. The
                        404 lands on a "Coming soon" page that
                        re-renders the same count. */}
                    <Link href="/seller-dashboard/disputes">View disputes →</Link>
                  </Button>
                </CardContent>
              </Card>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-800 mb-4">Recent Orders</h3>
              <OrdersTable
                orders={pagedOrders}
                loading={loading && orders.length === 0}
                onStatusChange={updateOrderStatus}
                disputeOrderIds={disputeOrderIds}
              />
              <div className="mt-2">
                <Pagination
                  page={orderPage}
                  pageCount={orderPageCount}
                  totalCount={orderCount}
                  pageSize={orderPageSize}
                  onPageChange={setOrderPage}
                />
              </div>
            </section>
          </div>
        </div>

        <ProductFormModal
          isOpen={isAddOpen}
          mode="add"
          defaultLocation={profile?.location}
          onClose={() => setIsAddOpen(false)}
          onSubmit={handleCreate}
        />

        <ProductFormModal
          isOpen={!!editingProduct}
          mode="edit"
          product={editingProduct}
          defaultLocation={profile?.location}
          onClose={() => setEditingProduct(null)}
          onSubmit={handleUpdate}
        />

        <ConfirmDeleteModal
          isOpen={!!deletingId}
          loading={deleting}
          onCancel={() => setDeletingId(null)}
          onConfirm={confirmDelete}
        />
      </div>
    </DashboardLayout>
  );
}
