"use client";

import React, { useContext, useState } from "react";
import { UserContext } from "@/components/UserContext";
import { Product } from "@/types/database";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";
import Link from "next/link";
import {
  createProductAction,
  deleteProductAction,
  updateProductAction,
} from "@/app/actions/products";

import { useDashboardData } from "@/components/dashboard/useDashboardData";
import { ProfileCard } from "@/components/dashboard/ProfileCard";
import { ProfileIncompleteBanner } from "@/components/dashboard/ProfileIncompleteBanner";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { ProductCard } from "@/components/dashboard/ProductCard";
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
  } = useDashboardData();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    image_url: string;
  }) => {
    const result = await createProductAction(data);
    if (!result.success) throw new Error(result.error);
    toast.success("Product added successfully!");
    setIsAddOpen(false);
    refresh();
  };

  const handleUpdate = async (data: {
    name: string;
    description: string;
    price: number;
    category: string;
    stock: number;
    image_url: string;
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
      refresh();
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
            <section>
              <div className="flex justify-between items-end mb-4">
                <h3 className="text-xl font-bold text-slate-800">Product Inventory</h3>
                <Link href="/messages" className="text-sm font-bold text-blue-600 hover:underline">
                  View Messages →
                </Link>
              </div>

              <Card>
                <CardContent className="p-6">
                  {loading && products.length === 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-xl" />
                      ))}
                    </div>
                  ) : products.length === 0 ? (
                    <div className="py-12 text-center space-y-3">
                      <div className="text-4xl">📦</div>
                      <p className="text-gray-400 text-sm">
                        No products listed yet. Start by adding your first product!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {products.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onEdit={setEditingProduct}
                          onDelete={setDeletingId}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-800 mb-4">Recent Orders</h3>
              <OrdersTable
                orders={orders}
                loading={loading}
                onStatusChange={updateOrderStatus}
              />
            </section>
          </div>
        </div>

        <ProductFormModal
          isOpen={isAddOpen}
          mode="add"
          onClose={() => setIsAddOpen(false)}
          onSubmit={handleCreate}
        />

        <ProductFormModal
          isOpen={!!editingProduct}
          mode="edit"
          product={editingProduct}
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
