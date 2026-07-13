"use client";

import React, { useContext, useMemo, useRef, useState } from "react";
import { UserContext } from "@/components/UserContext";
import { Product } from "@/types/database";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Pagination } from "@/components/ui/Pagination";
import { ProductInventory } from "@/components/dashboard/ProductInventory";
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
    addPortfolioItems,
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
  // Ref to the inventory section — used to scroll the user back to
  // the new product card after a successful create. Without this,
  // the user has to hunt for their freshly-added card in the grid.
  const inventorySectionRef = useRef<HTMLElement | null>(null);
  // Local data: URL previews for portfolio files that are still
  // uploading. The gallery renders these alongside the existing
  // storage items so the user gets instant feedback. Each entry
  // carries a stable id keyed on the file's identity so we can
  // drop the right preview as each upload resolves. We only
  // generate previews for image/* — videos (also accepted by the
  // picker) would base64-encode to 26MB+ for a 20MB file and
  // wouldn't be playable inline anyway.
  const [pendingPortfolio, setPendingPortfolio] = useState<
    { id: string; src: string }[]
  >([]);
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
    // Wait for the new list to land so the user can see their new
    // card at the top of the inventory section. requestAnimationFrame
    // defers the scroll until after the DOM commit so smooth-scroll
    // has a target to animate to.
    await refresh();
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
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  const handlePortfolioSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    // Always reset so re-picking the same files fires onChange again.
    e.target.value = "";
    if (files.length === 0) return;

    // Per-file validation: type and size. We collect the failures so
    // the user sees them all in one toast batch instead of having to
    // retry the whole selection one error at a time.
    const MAX_BYTES = 20 * 1024 * 1024;
    const rejected: string[] = [];
    const accepted: File[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        rejected.push(`${file.name}: not an image or video`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        rejected.push(`${file.name}: larger than 20MB`);
        continue;
      }
      accepted.push(file);
    }
    if (rejected.length > 0) {
      toast.error(rejected.slice(0, 3).join("; ") + (rejected.length > 3 ? ` (+${rejected.length - 3} more)` : ""));
    }
    if (accepted.length === 0) return;

    // Build data: URL previews for image/* files only. Videos skip
    // this — a 20MB video base64-encodes to ~26.7MB and browsers
    // can't play data: URLs that size reliably, so videos keep the
    // old "upload then render" behavior. The id is stable across
    // re-renders and unique per file in this batch.
    const previewById = new Map<string, { id: string; src: string }>();
    for (const file of accepted) {
      if (!file.type.startsWith("image/")) continue;
      const id = `${file.name}-${file.size}-${file.lastModified}`;
      if (previewById.has(id)) continue;
      const src = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
        reader.onerror = () => resolve("");
        reader.readAsDataURL(file);
      });
      if (!src) continue;
      previewById.set(id, { id, src });
    }
    // Map every accepted file to its preview id (or undefined for
    // video files) so the upload loop can drop the right preview.
    const idByFile: (string | undefined)[] = accepted.map((file) => {
      if (!file.type.startsWith("image/")) return undefined;
      return `${file.name}-${file.size}-${file.lastModified}`;
    });
    if (previewById.size > 0) {
      setPendingPortfolio((prev) => [...prev, ...Array.from(previewById.values())]);
    }

    setUploadingPortfolio(true);
    // Sequential uploads — keeps per-file error reporting simple and
    // avoids hammering the bucket. We only persist to the profile on
    // success of *every* file so a partial failure doesn't leave the
    // portfolio array referencing ghost paths.
    const uploaded: string[] = [];
    const uploadErrors: string[] = [];
    for (let i = 0; i < accepted.length; i++) {
      const file = accepted[i];
      const previewId = idByFile[i];
      const fileName = `portfolio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("artisan-portfolio")
        .upload(fileName, file, { upsert: true });
      if (uploadError) {
        const hint = uploadError.message?.includes("row-level security")
          ? " Check the RLS policies on the artisan-portfolio bucket."
          : "";
        uploadErrors.push(`${file.name}: ${uploadError.message}${hint}`);
        // Drop the matching preview on failure (videos never had one).
        if (previewId) {
          setPendingPortfolio((prev) => prev.filter((p) => p.id !== previewId));
        }
        continue;
      }
      uploaded.push(fileName);
      // Drop the preview now that the real URL is about to land
      // in `portfolio` via the addPortfolioItems call below.
      if (previewId) {
        setPendingPortfolio((prev) => prev.filter((p) => p.id !== previewId));
      }
    }

    if (uploaded.length > 0) {
      try {
        await addPortfolioItems(uploaded);
        toast.success(
          uploaded.length === 1
            ? "Portfolio item uploaded!"
            : `${uploaded.length} portfolio items uploaded!`
        );
      } catch (err: any) {
        // The DB upsert failed after files already landed in storage.
        // The files are still in the bucket but not linked to the
        // profile — surface this clearly so the user can refresh and
        // retry the DB write without re-uploading.
        toast.error(`Files uploaded but profile save failed: ${err.message || err}`);
      }
    }
    if (uploadErrors.length > 0) {
      toast.error(uploadErrors.slice(0, 3).join("; ") + (uploadErrors.length > 3 ? ` (+${uploadErrors.length - 3} more)` : ""));
    }
    setUploadingPortfolio(false);
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
                <h3 className="text-xl font-bold text-slate-800">Portfolio Gallery</h3>
                <span className="text-xs text-gray-400">{portfolio.length} item(s)</span>
              </div>
              <PortfolioGallery
                items={portfolio}
                loading={loading}
                pendingPreviews={pendingPortfolio}
                onRemovePending={(id) =>
                  setPendingPortfolio((prev) => prev.filter((p) => p.id !== id))
                }
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
                multiple
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
