"use client";

import React, { useState, useEffect, useContext } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Link from "next/link";
import { UserContext } from "@/components/UserContext";
import { supabase } from "@/lib/supabase";
import { Profile, Order, Product } from "@/types/database";
import Image from "next/image";
import { removeProductViewAction } from "@/app/actions/products";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";

export default function BuyerDashboard() {
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [viewedProducts, setViewedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadBuyerData();
    }
  }, [user]);

  const loadBuyerData = async () => {
    setLoading(true);
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      setProfile(profileData);

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      setOrders(ordersData || []);

      const { data: viewedData } = await supabase
        .from('viewed_products')
        .select('product_id')
        .eq('user_id', user?.id)
        .order('viewed_at', { ascending: false })
        .limit(10);

      if (viewedData) {
        const productIds = viewedData.map(v => v.product_id);
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .in('id', productIds);
        setViewedProducts(products || []);
      }
    } catch (err) {
      console.error("Error loading buyer data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveView = async (productId: string) => {
    try {
      const result = await removeProductViewAction(productId);
      if (result.success) {
        toast.success("Removed from history");
        loadBuyerData();
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error("Failed to remove product");
    }
  };

  return (
    <DashboardLayout userRole="individual">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-slate-900">Buyer Dashboard</h2>
            <p className="text-gray-500 font-medium">Welcome, {user?.email?.split('@')[0]}!</p>
          </div>
          <Link href="/marketplace" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-md">
            Go to Marketplace →
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Profile */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="h-fit overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-gray-100">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-lg">
                    {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="mt-2">
                    <h3 className="text-lg font-bold text-slate-900">{profile?.full_name || "User Profile"}</h3>
                    <p className="text-xs text-gray-500 truncate max-w-[150px]">{user?.email}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-gray-400">State/Region</span>
                  <span className="font-semibold text-slate-700">{profile?.state || "Not specified"}</span>
                </div>
                <div className="flex justify-between py-2 text-sm border-t border-gray-50">
                  <span className="text-gray-400">Location</span>
                  <span className="font-semibold text-slate-700">{profile?.location || "Not specified"}</span>
                </div>
                <div className="flex justify-between py-2 text-sm border-t border-gray-50">
                  <span className="text-gray-400">Account Tier</span>
                  <Badge variant="info">{profile?.tier || "individual"}</Badge>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 border-t border-gray-100 p-3">
                <Link href="/profile/edit" className="w-full text-center text-xs font-bold text-blue-600 hover:underline">
                  Update Profile Details →
                </Link>
              </CardFooter>
            </Card>

            <div className="grid grid-cols-1 gap-4">
              <Card className="p-4 bg-gradient-to-br from-blue-600 to-blue-700 text-white border-none shadow-md">
                <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">Total Orders</p>
                <p className="text-3xl font-black">{orders.length}</p>
              </Card>
              <Card className="p-4">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Recent Views</p>
                <p className="text-3xl font-black text-slate-900">{viewedProducts.length}</p>
              </Card>
            </div>
          </div>

          {/* Right Column: Orders & Views */}
          <div className="lg:col-span-3 space-y-8">
            <section>
              <div className="flex justify-between items-end mb-4">
                <h3 className="text-xl font-bold text-slate-800">Your Order History</h3>
                <Link href="/checkout" className="text-sm font-bold text-blue-600 hover:underline">View All Orders →</Link>
              </div>

              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-4 bg-slate-50 border-b border-gray-100 text-gray-500 uppercase text-xs font-bold tracking-wider">
                    <div className="px-6 py-4">Order ID</div>
                    <div className="px-6 py-4">Total</div>
                    <div className="px-6 py-4">Status</div>
                    <div className="px-6 py-4 text-right">Date</div>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {loading && orders.length === 0 ? (
                      <div className="p-6 text-center text-gray-400">Loading orders...</div>
                    ) : orders.length === 0 ? (
                      <div className="p-6 text-center text-gray-400">No orders found. Start shopping!</div>
                    ) : (
                      orders.map(order => (
                        <div key={order.id} className="grid grid-cols-4 hover:bg-slate-50 transition-colors text-sm items-center">
                          <div className="px-6 py-4 text-slate-900 font-medium">#{order.id.slice(-6)}</div>
                          <div className="px-6 py-4 text-slate-900 font-bold">${order.total_price?.toFixed(2)}</div>
                          <div className="px-6 py-4">
                            <Badge
                              variant={order.status === 'completed' ? 'success' : order.status === 'shipped' ? 'info' : 'warning'}
                            >
                              {order.status}
                            </Badge>
                          </div>
                          <div className="px-6 py-4 text-right text-gray-400">
                            {new Date(order.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </Card>
            </section>

            <section>
              <div className="flex justify-between items-end mb-4">
                <h3 className="text-xl font-bold text-slate-800">Recently Viewed Products</h3>
                <span className="text-xs text-gray-400">{viewedProducts.length} items in history</span>
              </div>
              <Card>
                <CardContent className="p-6">
                  {loading && viewedProducts.length === 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="aspect-square w-full rounded-xl" />
                      ))}
                    </div>
                  ) : viewedProducts.length === 0 ? (
                    <div className="py-12 text-center space-y-3">
                      <div className="text-4xl">🛍️</div>
                      <p className="text-gray-400 text-sm">You haven't viewed any products yet. Start exploring!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {viewedProducts.map(product => (
                        <div key={product.id} className="relative group p-3 bg-white rounded-xl border border-gray-100 hover:border-blue-300 transition-all shadow-sm">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 bg-white/80 backdrop-blur-sm text-red-500 p-1 rounded-full hover:bg-red-50 transition-all shadow-sm"
                            onClick={() => handleRemoveView(product.id)}
                            title="Remove from history"
                          >
                            <span className="text-xs font-bold">✕</span>
                          </Button>
                          <Link href={`/product/${product.id}`} className="block space-y-2">
                            <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                              {product.image_url ? (
                                <Image src={product.image_url} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">🏗️</div>
                              )}
                            </div>
                            <p className="text-xs font-bold text-slate-900 truncate">{product.name}</p>
                            <p className="text-xs text-blue-600 font-semibold">${product.price?.toFixed(2)}</p>
                          </Link>
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
            <p className="text-gray-500 text-sm">Buy high-quality construction materials.</p>
            <div className="mt-4 text-blue-600 font-bold text-xs uppercase tracking-wider">Shop Now →</div>
          </Link>
          <Link href="/artisans" className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🛠️</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Find Artisans</h3>
            <p className="text-gray-500 text-sm">Hire professional experts for your project.</p>
            <div className="mt-4 text-blue-600 font-bold text-xs uppercase tracking-wider">Explore Experts →</div>
          </Link>
          <Link href="/messages" className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">💬</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Messages</h3>
            <p className="text-gray-500 text-sm">Chat with your sellers and artisans.</p>
            <div className="mt-4 text-blue-600 font-bold text-xs uppercase tracking-wider">Open Chat →</div>
          </Link>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-4 justify-center">
            <Button asChild variant="secondary" className="px-6">
              <Link href="/cart">My Cart</Link>
            </Button>
            <Button asChild className="px-6">
              <Link href="/checkout">Proceed to Payment</Link>
            </Button>
            <Button asChild variant="secondary" className="px-6 bg-indigo-100 text-indigo-700 hover:bg-indigo-200">
              <Link href="/projects/post">Post a Project</Link>
            </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
