"use client";

import React, { useState, useEffect, useContext } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Link from "next/link";
import { UserContext } from "@/components/UserContext";
import { supabase } from "@/lib/supabase";
import { Profile, Order, Product } from "@/types/database";
import Image from "next/image";

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
      // 1. Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      setProfile(profileData);

      // 2. Fetch Orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      setOrders(ordersData || []);

      // 3. Fetch Viewed Products (Last 10)
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

  return (
    <DashboardLayout userRole="individual">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-black text-slate-900">Buyer Dashboard</h2>
          <p className="text-gray-500 font-medium">Welcome back, {user?.email?.split('@')[0]}!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Section */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600">
                {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{profile?.full_name || "User Profile"}</h3>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-400">State/Region</span>
                <span className="text-sm font-semibold text-slate-700">{profile?.state || "Not specified"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-400">Location</span>
                <span className="text-sm font-semibold text-slate-700">{profile?.location || "Not specified"}</span>
              </div>
            </div>
            <Link href="/profile/edit" className="block text-center mt-6 text-xs font-bold text-blue-600 hover:underline">
              Edit Profile Details →
            </Link>
          </div>

          {/* Order History */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Recent Orders</h3>
              {loading ? (
                <div className="py-8 text-center text-gray-400">Loading orders...</div>
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
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              order.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400">{new Date(order.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recently Viewed Products */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Recently Viewed</h3>
              {loading ? (
                <div className="py-8 text-center text-gray-400">Loading...</div>
              ) : viewedProducts.length === 0 ? (
                <div className="py-8 text-center text-gray-400">You haven't viewed any products yet.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {viewedProducts.map(product => (
                    <Link key={product.id} href={`/product/${product.id}`} className="group p-2 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all">
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
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-3 justify-center">
            <Link href="/cart" className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">My Cart</Link>
            <Link href="/checkout" className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Proceed to Payment</Link>
            <Link href="/projects/post" className="px-6 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 transition-colors">Post a Project</Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
