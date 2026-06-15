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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, productId: "" });

  const [productForm, setProductForm] = useState<{
    name: string;
    price: string;
    description: string;
    stock: string;
    imageFile: File | null;
    imagePreview: string;
  }>({
    name: "",
    price: "",
    description: "",
    stock: "",
    imageFile: null,
    imagePreview: "",
  });

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
    setIsAddModalOpen(false);
    try {
      let imageUrl = "";
      if (productForm.imageFile) {
        const fileName = `artisan-prod-${Date.now()}-${productForm.imageFile.name}`;
        const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, productForm.imageFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
        imageUrl = publicUrl;
      } else {
        throw new Error("Product image is required");
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

      setProductForm({ name: "", price: "", description: "", imageFile: null, imagePreview: "" });
      toast.success("Product listed!");
      loadArtisanData();
    } catch (err: any) {
      toast.error(err.message || "Failed to list product");
    } finally {
      setLoading(false);
    }
  };

  const handleProductFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProductForm({
        ...productForm,
        imageFile: file,
        imagePreview: URL.createObjectURL(file)
      });
    }
  };

  return (
    <DashboardLayout userRole="artisan">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-slate-900">Artisan Dashboard</h2>
            <p className="text-gray-500 font-medium">Showcase your skill and services</p>
          </div>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="px-6 py-3 text-base font-bold"
          >
            + List a Product
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Profile & Quick Stats */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="h-fit overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-gray-100">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-lg">
                    {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'A'}
                  </div>
                  <div className="mt-2">
                    <h3 className="text-lg font-bold text-slate-900">{profile?.full_name || "Artisan Profile"}</h3>
                    <p className="text-xs text-gray-500 truncate max-w-[150px]">{user?.email}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-gray-400">Location</span>
                  <span className="font-semibold text-slate-700">{profile?.location || "Not specified"}</span>
                </div>
                <div className="flex justify-between py-2 text-sm border-t border-gray-50">
                  <span className="text-gray-400">Role</span>
                  <Badge variant="info">{profile?.tier || "artisan"}</Badge>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 border-t border-gray-100 p-3">
                <Link href="/profile/edit" className="w-full text-center text-xs font-bold text-blue-600 hover:underline">
                  Update Portfolio Details →
                </Link>
              </CardFooter>
            </Card>

            <div className="grid grid-cols-1 gap-4">
              <Card className="p-4 bg-gradient-to-br from-blue-600 to-blue-700 text-white border-none shadow-md">
                <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">Active Listings</p>
                <p className="text-3xl font-black">{products.length}</p>
              </Card>
              <Card className="p-4">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Portfolio Projects</p>
                <p className="text-3xl font-black text-slate-900">{portfolio.length}</p>
              </Card>
            </div>
          </div>

          {/* Right Column: Portfolio & Products */}
          <div className="lg:col-span-3 space-y-8">
            <section>
              <div className="flex justify-between items-end mb-4">
                <h3 className="text-xl font-bold text-slate-800">My Portfolio Gallery</h3>
                <div className="relative">
                  <Button
                    size="sm"
                    disabled={loading}
                    isLoading={loading}
                    onClick={() => document.getElementById('portfolio-upload')?.click()}
                  >
                    Add Project Image
                  </Button>
                  <input
                    id="portfolio-upload"
                    type="file"
                    accept="image/*,video/*"
                    onChange={handlePortfolioUpload}
                    className="hidden"
                  />
                </div>
              </div>

              <Card>
                <CardContent className="p-6">
                  {loading && portfolio.length === 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="aspect-square w-full rounded-xl" />
                      ))}
                    </div>
                  ) : portfolio.length === 0 ? (
                    <div className="py-12 text-center space-y-3">
                      <div className="text-4xl">🎨</div>
                      <p className="text-gray-400 text-sm">No project photos yet. Upload images to showcase your expertise!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {portfolio.map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden group border border-gray-100 shadow-sm">
                          <Image src={url} alt="Work" fill className="object-cover group-hover:scale-110 transition-transform" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            <section>
              <div className="flex justify-between items-end mb-4">
                <h3 className="text-xl font-bold text-slate-800">Active Product Listings</h3>
                <span className="text-xs text-gray-400">{products.length} listing(s)</span>
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
                      <p className="text-gray-400 text-sm">No products listed yet. Start selling your services!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {products.map((product) => (
                        <div key={product.id} className="bg-white p-4 rounded-xl border border-gray-200 flex gap-4 items-center group hover:border-blue-300 transition-all shadow-sm">
                          {product.image_url ? (
                            <Image src={product.image_url} alt={product.name} width={80} height={80} className="w-20 h-20 object-cover rounded-lg shadow-sm" />
                          ) : (
                            <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">No Image</div>
                          )}
                          <div className="flex-1 min-w-0 flex justify-between items-center">
                            <div className="truncate">
                              <h4 className="font-bold text-slate-900 truncate text-sm">{product.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-blue-600 font-bold text-xs">${product.price?.toFixed(2)}</p>
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5">{product.category}</Badge>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                              onClick={() => setDeleteModal({ isOpen: true, productId: product.id })}
                              title="Delete Product"
                            >
                              🗑️
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/marketplace" className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🏗️</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Marketplace</h3>
            <p className="text-gray-500 text-sm">See how your products look to buyers.</p>
            <div className="mt-4 text-blue-600 font-bold text-xs uppercase tracking-wider">Visit Market →</div>
          </Link>
          <Link href="/projects" className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🛠️</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Browse Projects</h3>
            <p className="text-gray-500 text-sm">Find new construction projects to bid on.</p>
            <div className="mt-4 text-blue-600 font-bold text-xs uppercase tracking-wider">Explore Projects →</div>
          </Link>
          <Link href="/messages" className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">💬</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Messages</h3>
            <p className="text-gray-500 text-sm">Reply to interested clients.</p>
            <div className="mt-4 text-blue-600 font-bold text-xs uppercase tracking-wider">Open Chat →</div>
          </Link>
        </div>

        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="List a New Product/Service"
        >
          <form onSubmit={handleProductSubmit} className="space-y-5 py-2">
            <div className="space-y-4">
              <Input
                label="Service/Product Name"
                placeholder="e.g., Expert Roof Installation"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                required
              />

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Description</label>
                <textarea
                  placeholder="Detail your expertise, materials used, and what is included..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  rows={4}
                  className="w-full p-3 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Base Price ($)"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  required
                />
                <Input
                  label="Stock/Availability"
                  type="number"
                  placeholder="1"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Listing Image</label>
                <div className="flex flex-col gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProductFileChange}
                    className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    required
                  />
                  {productForm.imagePreview && (
                    <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-blue-100">
                      <Image
                        src={productForm.imagePreview}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                isLoading={loading}
                className="px-8"
              >
                List Product
              </Button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, productId: "" })}
          title="Delete Product"
        >
          <div className="space-y-4 py-2">
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
