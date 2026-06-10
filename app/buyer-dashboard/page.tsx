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
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
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
          <h2 className="text-3xl font-black text-slate-900">Buyer Dashboard</h2>
          <p className="text-gray-500 font-medium">Welcome back, {user?.email?.split('@')[0]}!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Section */}
          <Card className="h-fit">
            <CardHeader className="flex flex-col items-start gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600">
                  {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div >
                  <h3 className="text-xl font-bold text-slate-900">{profile?.full_name || "User Profile"}</h3>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
              </div>
              <div className="w-full space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-400">State/Region</span>
                  <span className="text-sm font-semibold text-slate-700">{profile?.state || "Not specified"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-400">Location</span>
                  <span className="text-sm font-semibold text-slate-700">{profile?.location || "Not specified"}</span>
                </div>
              </div>
            </CardHeader>
            <div className="p-6 pt-0">
              <Link href="/profile/edit" className="block text-center text-xs font-bold text-blue-600 hover:underline">
                Edit Profile Details →
              </Link>
            </div>
          </Card>

          {/* Order History */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-bold text-slate-800">Recent Orders</h3>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : orders.length === 0 ? (
                  <div className="py-8 text-center text-gray-400">No orders found. Start shopping!</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold">
                        <tr>
                          <th className="px-4 py-3">Order ID</th>
                          <th className="px-4 py-3">Total</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {orders.map(order => (
                          <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-900">#{order.id.slice(-6)}</td>
                            <td className="px-4 py-3 font-bold text-blue-600">${order.total_price.toFixed(2)}</td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={order.status === 'completed' ? 'success' : 'warning'}
                              >
                                {order.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-gray-400">{new Date(order.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recently Viewed Products */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-bold text-slate-800">Recently Viewed</h3>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="aspect-square w-full" />
                    ))}
                  </div>
                ) : viewedProducts.length === 0 ? (
                  <div className="py-8 text-center text-gray-400">You haven't viewed any products yet.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {viewedProducts.map(product => (
                      <div key={product.id} className="relative group p-2 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 bg-white/80 backdrop-blur-sm text-red-500 p-1 rounded-full hover:bg-red-50 transition-all shadow-sm"
                          onClick={() => handleRemoveView(product.id)}
                          title="Remove from history"
                        >
                          <span className="text-xs font-bold">✕</span>
                        </Button>
                        <Link href={`/product/${product.id}`} className="block">
                          <div className="relative aspect-square mb-2">
                            {product.image_url ? (
                              <Image src={product.image_url} alt={product.name} fill className="object-cover rounded-lg" />
                            ) : (
                              <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center text-2xl">🏗️</div>
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
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:col-span-3">
            <Link href="/marketplace" className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🏗️</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Marketplace</h3>
              <p className="text-gray-500 text-sm">Buy high-quality materials.</p>
              <div className="mt-4 text-blue-600 font-bold text-xs uppercase tracking-wider">Shop Now →</div>
            </Link>
            <Link href="/artisans" className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🛠️</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Find Artisans</h3>
              <p className="text-gray-500 text-sm">Hire professional experts.</p>
              <div className="mt-4 text-blue-600 font-bold text-xs uppercase tracking-wider">Explore Experts →</div>
            </Link>
            <Link href="/messages" className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">💬</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Messages</h3>
              <p className="text-gray-500 text-sm">Chat with your sellers.</p>
              <div className="mt-4 text-blue-600 font-bold text-xs uppercase tracking-wider">Open Chat →</div>
            </Link>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-3 justify-center lg:col-span-3">
              <Button asChild variant="secondary">
                <Link href="/cart">My Cart</Link>
              </Button>
              <Button asChild>
                <Link href="/checkout">Proceed to Payment</Link>
              </Button>
              <Button asChild variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">
                <Link href="/projects/post">Post a Project</Link>
              </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
