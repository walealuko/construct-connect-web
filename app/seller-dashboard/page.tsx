"use client";

import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "@/components/UserContext";
import { supabase } from "@/lib/supabase";
import { Product, Order, Profile } from "@/types/database";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Image from "next/image";
import { toast } from "sonner";
import Link from "next/link";

export default function SellerDashboard() {
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ revenue: 0, ordersCount: 0, productsCount: 0 });
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "general",
    stock: "",
    delivery: "available",
    imageFile: null as File | null,
    imageUrl: "",
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Load Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      setProfile(profileData);

      // 2. Load Products
      const { data: productsData, error: pError } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user?.id);
      if (pError) throw pError;
      setProducts(productsData || []);

      const productIds = (productsData || []).map(p => p.id);

      // 3. Load Orders
      if (productIds.length > 0) {
        const { data: ordersData, error: oError } = await supabase
          .from('orders')
          .select('*, profiles(first_name, last_name)')
          .contains('items.product_id', productIds)
          .order('created_at', { ascending: false });

        if (oError) throw oError;
        setOrders(ordersData || []);

        const totalRev = (ordersData || [])
          .filter((o: Order) => o.status === 'completed')
          .reduce((sum: number, o: Order) => sum + o.total_price, 0);

        setStats({
          revenue: totalRev,
          ordersCount: (ordersData || []).length,
          productsCount: (productsData || []).length
        });
      } else {
        setStats({ revenue: 0, ordersCount: 0, productsCount: 0 });
      }
    } catch (err: any) {
      console.error("Failed to load dashboard data:", err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      toast.success(`Order updated to ${newStatus}`);
      loadDashboardData();
    } catch (err: any) {
      toast.error(`Failed to update order: ${err.message}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, imageFile: e.target.files[0] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    setLoading(true);
    try {
      let finalImageUrl = formData.imageUrl;

      if (formData.imageFile) {
        const fileName = `${Date.now()}-${formData.imageFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, formData.imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        finalImageUrl = publicUrl;
      }

      const { error } = await supabase
        .from('products')
        .insert({
          seller_id: user?.id,
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          category: formData.category,
          stock: parseInt(formData.stock || '0'),
          image_url: finalImageUrl,
          // Note: delivery would normally be a column in the DB,
          // assuming it's part of description or a custom field for now
          description: `${formData.description}\nDelivery: ${formData.delivery}`
        });

      if (error) throw error;

      setFormData({
        name: "",
        description: "",
        price: "",
        category: "general",
        stock: "",
        delivery: "available",
        imageFile: null,
        imageUrl: ""
      });
      setMessage("Product added successfully!");
      toast.success("Product added successfully!");
      loadDashboardData();
    } catch (err: any) {
      setMessage(err.message || "Failed to add product");
      toast.error(err.message || "Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout userRole="business">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-black text-slate-900">Seller Dashboard</h2>
          <p className="text-gray-500 font-medium">Welcome, {user?.email?.split('@')[0]}!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Seller Profile */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600">
                {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'S'}
              </div>
              <div >
                <h3 className="text-xl font-bold text-slate-900">{profile?.full_name || "Seller Profile"}</h3>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-400">Business Name</span>
                <span className="text-sm font-semibold text-slate-700">{profile?.business_name || "Not specified"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-400">Location</span>
                <span className="text-sm font-semibold text-slate-700">{profile?.location || "Not specified"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-400">Tier</span>
                <span className="text-sm font-semibold text-blue-600 uppercase">{profile?.tier}</span>
              </div>
            </div>
            <Link href="/profile/edit" className="block text-center mt-6 text-xs font-bold text-blue-600 hover:underline">
              Update Shop Details →
            </Link>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <p className="text-gray-400 text-xs font-bold uppercase">Revenue</p>
                <p className="text-2xl font-black text-slate-900">${stats.revenue.toFixed(2)}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <p className="text-gray-400 text-xs font-bold uppercase">Orders</p>
                <p className="text-2xl font-black text-slate-900">{stats.ordersCount}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <p className="text-gray-400 text-xs font-bold uppercase">Products</p>
                <p className="text-2xl font-black text-slate-900">{stats.productsCount}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800">Product Gallery</h3>
                <Link href="/messages" className="text-sm font-bold text-blue-600 hover:underline">Messages →</Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {products.map((product) => (
                  <div key={product.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex gap-4 items-center">
                    {product.image_url && (
                      <Image src={product.image_url} alt={product.name} width={60} height={60} className="w-16 h-16 object-cover rounded-lg" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 truncate text-sm">{product.name}</h4>
                      <p className="text-blue-600 font-bold text-xs">${product.price?.toFixed(2)}</p>
                      <p className="text-gray-400 text-[10px]">Stock: {product.stock}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Add Product</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <input
                  placeholder="Product Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                />
                <textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full p-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    placeholder="Price ($)"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full p-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <input
                    type="number"
                    placeholder="Stock"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full p-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Delivery Availability</label>
                  <select
                    value={formData.delivery}
                    onChange={(e) => setFormData({ ...formData, delivery: e.target.value })}
                    className="w-full p-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="available">Available</option>
                    <option value="limited">Limited</option>
                    <option value="pickup_only">Pickup Only</option>
                  </select>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-blue-300 transition-all"
                >
                  {loading ? "Adding..." : "Add Product"}
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xl font-bold text-slate-800">Recent Orders</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-gray-500 uppercase text-xs font-bold tracking-wider">
                    <th className="px-6 py-3">Buyer</th>
                    <th className="px-6 py-3">Total</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </trP>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-slate-900 font-medium">
                          {order.profiles?.first_name ? `${order.profiles.first_name} ${order.profiles.last_name}` : "Unknown Buyer"}
                        </td>
                        <td className="px-6 py-4 text-slate-900 font-bold">${order.total_price?.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                            order.status === 'completed' ? 'bg-green-100 text-green-700' :
                            order.status === 'shipped' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            className="p-1 text-xs border rounded bg-white outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
