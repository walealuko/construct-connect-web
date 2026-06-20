"use client";

import React, { useContext, useMemo, useRef, useState } from "react";
import { UserContext } from "@/components/UserContext";
import { Product } from "@/types/database";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Pagination } from "@/components/ui/Pagination";
import { toast } from "sonner";
import Link from "next/link";
import {
  createProductAction,
  deleteProductAction,
  updateProductAction,
} from "@/app/actions/products";
import { supabase } from "@/lib/supabase";

import { useDashboardData } from "@/components/dashboard/useDashboardData";
import { ProfileCard } from "@/components/dashboard/ProfileCard";
import { ProfileIncompleteBanner } from "@/components/dashboard/ProfileIncompleteBanner";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { ProductCard } from "@/components/dashboard/ProductCard";
import { ProductFormModal } from "@/components/dashboard/ProductFormModal";
import { ConfirmDeleteModal } from "@/components/dashboard/ConfirmDeleteModal";
import { OrdersTable } from "@/components/dashboard/OrdersTable";
import { PortfolioGallery } from "@/components/dashboard/PortfolioGallery";

export default function ArtisanDashboard() {
  const userContext = useContext(UserContext);
  const { user, loading: authLoading } = userContext || { user: null, loading: true };

  const {
    profile,
    products,
    orders,
    portfolio,
    stats,
    loading,
    refresh,
    updateOrderStatus,
    addPortfolioItem,
    removePortfolioItem,
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
  } = useDashboardData();

  const pagedOrders = useMemo(() => {
    const start = (orderPage - 1) * orderPageSize;
    return orders.slice(start, start + orderPageSize);
  }, [orders, orderPage, orderPageSize]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const portfolioInputRef = useRef<HTMLInputElement>(null);

  if (authLoading) {
    return (
      <DashboardLayout userRole="artisan">
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
      // boundary. Always jump to page 1 so the new product is visible.
      toast.error(result.error || "Failed to add product");
      return;
    }
    toast.success("Product added successfully!");
    setIsAddOpen(false);
    if (productPage !== 1) setProductPage(1);
    refresh();
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
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  const handlePortfolioSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error("Please upload an image or video file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be less than 10MB");
      return;
    }
    setUploadingPortfolio(true);
    try {
      const fileName = `portfolio-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("artisan-portfolio")
        .upload(fileName, file, { upsert: true });
      if (uploadError) {
        const hint = uploadError.message?.includes("row-level security")
          ? " Check the RLS policies on the artisan-portfolio bucket."
          : "";
        throw new Error(`Upload failed: ${uploadError.message}${hint}`);
      }
      await addPortfolioItem(fileName);
      toast.success("Portfolio project uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingPortfolio(false);
    }
  };

  return (
    <DashboardLayout userRole="artisan">
      <div className="space-y-8">
        <ProfileIncompleteBanner profile={profile} requireFields={["location"]} />

        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900">Artisan Dashboard</h2>
            <p className="text-gray-500 font-medium">Showcase your skill and services</p>
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
            <ProfileCard profile={profile} user={user} variant="artisan" />
            <StatsCards
              revenue={stats.revenue}
              ordersCount={stats.ordersCount}
              productsCount={stats.productsCount}
              productsLabel="Active Listings"
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
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {products.map((product) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            onEdit={setEditingProduct}
                            onDelete={setDeletingId}
                          />
                        ))}
                      </div>
                      <Pagination
                        page={productPage}
                        pageCount={productPageCount}
                        totalCount={productCount}
                        pageSize={productPageSize}
                        onPageChange={setProductPage}
                        loading={loading}
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            </section>

            <section>
              <div className="flex justify-between items-end mb-4">
                <h3 className="text-xl font-bold text-slate-800">Portfolio Gallery</h3>
                <span className="text-xs text-gray-400">{portfolio.length} item(s)</span>
              </div>
              <PortfolioGallery
                items={portfolio}
                loading={loading}
                onAdd={() => portfolioInputRef.current?.click()}
                onRemove={async (path) => {
                  if (!user?.id) return;
                  try {
                    await removePortfolioItem(path);
                    await supabase.storage.from("artisan-portfolio").remove([path]);
                    toast.success("Removed");
                  } catch (err: any) {
                    toast.error(err.message || "Failed to remove");
                  }
                }}
                addLabel="Add Project Image"
              />
              <input
                ref={portfolioInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handlePortfolioSelected}
                className="hidden"
              />
              {uploadingPortfolio && (
                <p className="text-xs text-blue-600 mt-2">Uploading…</p>
              )}
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-800 mb-4">Recent Orders</h3>
              <OrdersTable
                orders={pagedOrders}
                loading={loading && orders.length === 0}
                onStatusChange={updateOrderStatus}
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
          fixedCategory="artisan-service"
          defaultLocation={profile?.location}
          onClose={() => setIsAddOpen(false)}
          onSubmit={handleCreate}
        />

        <ProductFormModal
          isOpen={!!editingProduct}
          mode="edit"
          product={editingProduct}
          fixedCategory="artisan-service"
          defaultLocation={profile?.location}
          onClose={() => setEditingProduct(null)}
          onSubmit={handleUpdate}
          submitLabel="Update Listing"
        />

        <ConfirmDeleteModal
          isOpen={!!deletingId}
          loading={deleting}
          onCancel={() => setDeletingId(null)}
          onConfirm={confirmDelete}
          title="Delete Listing"
          message="Are you sure you want to delete this listing? This action cannot be undone."
          confirmLabel="Delete Listing"
        />
      </div>
    </DashboardLayout>
  );
}
