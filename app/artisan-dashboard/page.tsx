"use client";

import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "@/components/UserContext";
import { supabase } from "@/lib/supabase";
import { Product, Profile } from "@/types/database";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Image from "next/image";
import { toast } from "sonner";
import Link from "next/link";
import { deleteProductAction, createProductAction } from "@/app/actions/products";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";

export default function ArtisanDashboard() {
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [portfolio, setPortfolio] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [productForm, setProductForm] = useState({
    name: "",
    price: "",
    description: "",
    imageFile: null as File | null,
  });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, productId: "" });

  useEffect(() => {
    if (user) {
      loadArtisanData();
    }
  }, [user]);

  const loadArtisanData = async () => {
    setLoading(true);
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      setProfile(profileData);

      const { data: portfolioData } = await supabase
        .from('profiles')
        .select('portfolio')
        .eq('id', user?.id)
        .single();
      setPortfolio(portfolioData?.portfolio || []);

      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user?.id);
      setProducts(productsData || []);
    } catch (err) {
      console.error("Error loading artisan data:", err);
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteProduct = async () => {
    if (!deleteModal.productId) return;
    setLoading(true);
    setDeleteModal({ ...deleteModal, isOpen: false });
    try {
      const result = await deleteProductAction(deleteModal.productId);
      if (result.success) {
        toast.success("Product deleted successfully");
        loadArtisanData();
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete product");
    } finally {
      setLoading(false);
    }
  };

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setLoading(true);
    try {
      const file = e.target.files[0];
      const fileName = `portfolio-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('artisan-portfolio').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('artisan-portfolio').getPublicUrl(fileName);
      const currentPortfolio = [...portfolio, publicUrl];
      await supabase.from('profiles').update({ portfolio: currentPortfolio }).eq('id', user?.id);
      setPortfolio(currentPortfolio);
      toast.success("Portfolio project uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let imageUrl = "";
      if (productForm.imageFile) {
        const fileName = `artisan-prod-${Date.now()}-${productForm.imageFile.name}`;
        const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, productForm.imageFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
        imageUrl = publicUrl;
      }

      const result = await createProductAction({
        name: productForm.name,
        description: productForm.description,
        price: parseFloat(productForm.price),
        category: 'artisan-service',
        stock: 1,
        image_url: imageUrl,
      });

      if (!result.success) throw new Error(result.error);

      setProductForm({ name: "", price: "", description: "", imageFile: null });
      toast.success("Product listed!");
      loadArtisanData();
    } catch (err: any) {
      toast.error(err.message || "Failed to list product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout userRole="artisan">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-black text-slate-900">Artisan Dashboard</h2>
          <p className="text-gray-500 font-medium">Welcome, {user?.email?.split('@')[0]}!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Section */}
          <Card className="h-fit">
            <CardHeader className="flex flex-col items-start gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600">
                  {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'A'}
                </div>
                <div >
                  <h3 className="text-xl font-bold text-slate-900">{profile?.full_name || "Artisan Profile"}</h3>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
              </div>
              <div className="w-full space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-400">Location</span>
                  <span className="text-sm font-semibold text-slate-700">{profile?.location || "Not specified"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-400">Specialty</span>
                  <Badge variant="info">{profile?.tier}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardFooter>
              <Link href="/profile/edit" className="text-xs font-bold text-blue-600 hover:underline">
                Update My Portfolio →
              </Link>
            </CardFooter>
          </Card>

          <div className="lg:col-span-2 space-y-8">
            {/* Previous Projects Gallery */}
            <Card>
              <CardHeader className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">Previous Projects (Gallery)</h3>
                <div className="relative">
                  <Button
                    size="sm"
                    disabled={loading}
                    isLoading={loading}
                    onClick={() => document.getElementById('portfolio-upload')?.click()}
                  >
                    Add Project
                  </Button>
                  <input
                    id="portfolio-upload"
                    type="file"
                    accept="image/*,video/*"
                    onChange={handlePortfolioUpload}
                    className="hidden"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {loading && portfolio.length === 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="aspect-square w-full" />
                    ))}
                  </div>
                ) : portfolio.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
                    No project photos yet. Show off your best work!
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {portfolio.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                        <Image src={url} alt="Work" fill className="object-cover group-hover:scale-110 transition-transform" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Products for Sale */}
            <Card>
              <CardHeader className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">My Listed Products</h3>
                <span className="text-xs text-gray-400">{products.length} active listings</span>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {products.map((product) => (
                    <div key={product.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex gap-3 items-center">
                      <div className="relative w-12 h-12 flex-shrink-0">
                        {product.image_url ? <Image src={product.image_url} alt={product.name} fill className="object-cover rounded-lg" /> : <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center text-sm">🏗️</div>}
                      </div>
                      <div className="flex-1 min-w-0 flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-slate-900 truncate text-xs">{product.name}</h4>
                          <p className="text-blue-600 font-bold text-xs">${product.price?.toFixed(2)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteModal({ isOpen: true, productId: product.id })}
                          title="Delete Product"
                        >
                          🗑️
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleProductSubmit} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                  <h4 className="text-sm font-bold text-slate-700 mb-2">List a New Product</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      placeholder="Product Name"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      required
                    />
                    <Input
                      type="number"
                      placeholder="Price ($)"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Description</label>
                    <textarea
                      placeholder="Short description..."
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      className="w-full p-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Product Image</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setProductForm({ ...productForm, imageFile: e.target.files?.[0] || null })}
                        className="w-full text-xs text-gray-500 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="mt-6"
                      disabled={loading}
                      isLoading={loading}
                    >
                      List Product
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Button asChild variant="secondary" className="px-8 py-6 rounded-xl">
            <Link href="/messages">Messages</Link>
          </Button>
          <Button asChild variant="primary" className="px-8 py-6 rounded-xl">
            <Link href="/projects">Browse Projects</Link>
          </Button>
        </div>

        <Modal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, productId: "" })}
          title="Delete Product"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete this product? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setDeleteModal({ isOpen: false, productId: "" })}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={confirmDeleteProduct} disabled={loading} isLoading={loading}>
                Delete Product
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
