"use client";

import React, { useState, useEffect, useContext } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Link from "next/link";
import { UserContext } from "@/components/UserContext";
import { supabase } from "@/lib/supabase";
import { Profile, Order, Product } from "@/types/database";
import Image from "next/image";
import SafeImage from "@/components/ui/SafeImage";
import { removeProductViewAction } from "@/app/actions/products";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { resolveImageUrl } from "@/lib/storage";

export default function BuyerDashboard() {
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<(Order & { total_price?: number })[]>([]);
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

      // The orders schema has a separate `order_items` table, so totals
      // have to be computed by joining — fetch the orders and their items
      // in two steps and stitch the totals on.
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('buyer_id', user?.id)
        .order('created_at', { ascending: false });
      const ordersList = ordersData || [];
      if (ordersList.length > 0) {
        const orderIds = ordersList.map((o) => o.id);
        const { data: items } = await supabase
          .from('order_items')
          .select('order_id, price_at_purchase, quantity')
          .in('order_id', orderIds);
        const totals = new Map<string, number>();
        for (const it of items || []) {
          totals.set(
            it.order_id,
            (totals.get(it.order_id) || 0) +
              Number(it.price_at_purchase || 0) * Number(it.quantity || 0)
          );
        }
        setOrders(
          ordersList.map((o) => ({ ...o, total_price: totals.get(o.id) ?? 0 }))
        );
      } else {
        setOrders([]);
      }

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
      <div className="space-y-10">
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Buyer Hub</h2>
            <p className="text-gray-500 font-medium">Manage your orders and account details</p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="secondary" className="px-4 py-2 text-sm font-bold">
              <Link href="/cart">My Cart</Link>
            </Button>
            <Button asChild className="px-4 py-2 text-sm font-bold">
              <Link href="/checkout">My Orders</Link>
            </Button>
          </div>
        </div>

        {/* Supporting Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Widget */}
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
                <span className="text-gray-400">Location</span>
                <span className="font-semibold text-slate-700">{profile?.location || "Not specified"}</span>
              </div>
              <div className="flex justify-between py-2 text-sm border-t border-gray-50">
                <span className="text-gray-400">Tier</span>
                <Badge variant="info">{profile?.tier || "individual"}</Badge>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t border-gray-100 p-3">
              <Link href="/profile/edit" className="w-full text-center text-xs font-bold text-blue-600 hover:underline">
                Edit Profile Details →
              </Link>
            </CardFooter>
          </Card>

          {/* Order History Widget */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">Recent Orders</h3>
                <Link href="/checkout" className="text-xs font-bold text-blue-600 hover:underline">View All →</Link>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-lg" />
                    ))}
                  </div>
                ) : orders.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-sm">No orders found. Start shopping!</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Order</th>
                          <th className="px-4 py-3">Total</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {orders.slice(0, 5).map(order => (
                          <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-900">#{order.id.slice(-6)}</td>
                            <td className="px-4 py-3 font-bold text-blue-600">${order.total_price?.toFixed(2)}</td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={order.status === 'completed' ? 'success' : order.status === 'shipped' ? 'info' : 'warning'}
                              >
                                {order.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-400 text-xs">
                              {new Date(order.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recently Viewed Widget */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <h3 className="text-xl font-bold text-slate-800">Recently Viewed</h3>
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
                            <SafeImage src={resolveImageUrl(product.image_url, 'product-images')} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform" />
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

        {/* Quick Access Bottom Bar */}
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

