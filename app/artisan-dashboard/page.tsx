"use client";

import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "@/components/UserContext";
import { supabase } from "@/lib/supabase";
import { Product, Profile } from "@/types/database";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Image from "next/image";
import { toast } from "sonner";
import Link from "next/link";

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

  useEffect(() => {
    if (user) {
      loadArtisanData();
    }
  }, [user]);

  const loadArtisanData = async () => {
    try {
      // 1. Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      setProfile(profileData);

      // 2. Portfolio
      const { data: portfolioData } = await supabase
        .from('profiles')
        .select('portfolio')
        .eq('id', user?.id)
        .single();
      setPortfolio(portfolioData?.portfolio || []);

      // 3. Products
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user?.id);
      setProducts(productsData || []);
    } catch (err) {
      console.error("Error loading artisan data:", err);
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

      const { error } = await supabase.from('products').insert({
        seller_id: user?.id,
        name: productForm.name,
        price: parseFloat(productForm.price),
        description: productForm.description,
        image_url: imageUrl,
        stock: 1,
        category: 'artisan-service'
      });

      if (error) throw error;
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
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600">
                {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'A'}
              </div>
              <div >
                <h3 className="text-xl font-bold text-slate-900">{profile?.full_name || "Artisan Profile"}</h3>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-400">Location</span>
                <span className="text-sm font-semibold text-slate-700">{profile?.location || "Not specified"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-400">Specialty</span>
                <span className="text-sm font-semibold text-blue-600 uppercase">{profile?.tier}</span>
              </div>
            </div>
            <Link href="/profile/edit" className="block text-center mt-6 text-xs font-bold text-blue-600 hover:underline">
              Update My Portfolio →
            </Link>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Previous Projects Gallery */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800">Previous Projects (Gallery)</h3>
                <label className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all">
                  {loading ? "Uploading..." : "Add Project"}
                  <input type="file" accept="image/*,video/*" onChange={handlePortfolioUpload} className="hidden" />
                </label>
              </div>
              {portfolio.length === 0 ? (
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
            </div>

            {/* Products for Sale */}
            <div className="bg-white p-6 rounded-2 la-xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800">My Listed Products</h3>
                <span className="text-xs text-gray-400">{products.length} active listings</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {products.map((product) => (
                  <div key={product.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex gap-3 items-center">
                    <div className="relative w-12 h-12 flex-shrink-0">
                      {product.image_url ? <Image src={product.image_url} alt={product.name} fill className="object-cover rounded-lg" /> : <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center text-sm">🏗️</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 truncate text-xs">{product.name}</h4>
                      <p className="text-blue-600 font-bold text-xs">${product.price?.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleProductSubmit} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                <h4 className="text-sm font-bold text-slate-700 mb-2">List a New Product</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    placeholder="Product Name"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="p-2 rounded-lg border border-gray-300 text-xs outline-none"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Price ($)"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    className="p-2 rounded-lg border border-gray-300 text-xs outline-none"
                    required
                  />
                </div>
                <textarea
                  placeholder="Short description..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full p-2 rounded-lg border border-gray-300 text-xs outline-none"
                  rows={2}
                />
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProductForm({ ...productForm, imageFile: e.target.files?.[0] || null })}
                    className="text-xs text-gray-500 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="ml-auto px-6 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all"
                  >
                    {loading ? "Listing..." : "List Product"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Link href="/messages" className="px-8 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all">Messages</Link>
          <Link href="/projects" className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all">Browse Projects</Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
