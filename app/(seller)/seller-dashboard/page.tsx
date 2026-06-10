"use client";

import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "@/components/UserContext";
import { supabase } from "@/lib/supabase";
import { productSchema } from "@/lib/validations";
import { toast } from "sonner";
import Image from "next/image";

export default function SellerDashboard() {
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({ revenue: 0, ordersCount: 0, productsCount: 0 });
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "general",
    stock: "",
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
      const { data: productsData, error: pError } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user?.id);
      if (pError) throw pError;
      setProducts(productsData || []);

      const productIds = (productsData || []).map(p => p.id);

      if (productIds.length > 0) {
        const { data: ordersData, error: oError } = await supabase
          .from('orders')
          .select('*, profiles(first_name, last_name)')
          .contains('items.product_id', productIds)
          .order('created_at', { ascending: false });

        if (oError) throw oError;
        setOrders(ordersData || []);

        const totalRev = (ordersData || [])
          .filter((o: any) => o.status === 'completed')
          .reduce((sum: number, o: any) => sum + o.total_amount, 0);

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

    const validation = productSchema.safeParse({
      ...formData,
      price: formData.price,
      stock: formData.stock,
    });

    if (!validation.success) {
      const firstError = validation.error.issues[0].message;
      setMessage(firstError);
      toast.error(firstError);
      return;
    }

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
        });

      if (error) throw error;

      setFormData({
        name: "",
        description: "",
        price: "",
        category: "general",
        stock: "",
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
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-extrabold text-slate-900">
          Seller Dashboard <span className="text-blue-600">— Welcome, {user?.email?.split('@')[0] || 'Seller'}</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">Total Revenue</p>
          <p className="text-3xl font-black text-slate-900">${stats.revenue.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">Total Orders</p>
          <p className="text-3xl font-black text-slate-900">{stats.ordersCount}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">Active Products</p>
          <p className="text-3xl font-black text-slate-900">{stats.productsCount}</p>
        </div>
      </div

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Add New Product</h3>
          {message && (
            <p className={`mb-4 p-3 rounded-lg text-sm font-medium ${message.includes("success") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {message}
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Product Name *</label>
              <input
                placeholder="e.g. Premium Cement"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
              <textarea
                placeholder="Describe your product..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full p-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price ($) *</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full p-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stock Qty</label>
                <input
                  type="number"
                  placeholder="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="w-full p-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div
            </div
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full p-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
              >
                <option value="general">General</option>
                <option value="cement">Cement</option>
                <option value="bricks">Bricks</option>
                <option value="timber">Timber</option>
                <option value="tools">Tools</option>
                <option value="electrical">Electrical</option>
                <option value="plumbing">Plumbing</option>
                <option value="paint">Paint</option>
                <option value="roofing">Roofing</option>
                <option value="flooring">Flooring</option>
              </select>
            </div
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Product Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-blue-300 transition-all active:scale-95"
            >
              {loading ? "Adding..." : "Add Product"}
            </button
          </form>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-bold text-slate-800">Your Active Listings ({products.length})</h3>
          {products.length === 0 ? (
            <div className="bg-gray-50 p-12 rounded-2xl text-center text-gray-500 border border-dashed border-gray-300">
              No products yet. Start listing your materials above!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {products.map((product: any) => (
                <div key={product.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4 group">
                  {product.image_url && (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      width={80}
                      height={80}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 truncate">{product.name}</h4>
                    <p className="text-blue-600 font-bold text-sm">${product.price?.toFixed(2)}</p>
                    <p className="text-gray-400 text-xs">Stock: {product.stock} | {product.category}</p>
                  </div
                </div
              ))}
            </div
          )}
        </div
      </div

      <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-800">Recent Orders</h3>
        {orders.length === 0 ? (
          <div className="bg-gray-50 p-12 rounded-2xl text-center text-gray-500 border border-dashed border-gray-300">
            No orders yet.
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 font-bold text-gray-600 uppercase text-xs tracking-wider">Buyer</th>
                  <th className="px-6 py-3 font-bold text-gray-600 uppercase text-xs tracking-wider">Total</th>
                  <th className="px-6 py-3 font-bold text-gray-600 uppercase text-xs tracking-wider">Status</th>
                  <th className="px-6 py-3 font-bold text-gray-600 uppercase text-xs tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-slate-900 font-medium">
                      {order.profiles?.first_name ? `${order.profiles.first_name} ${order.profiles.last_name}` : "Unknown Buyer"}
                    </td>
                    <td className="px-6 py-4 text-slate-900 font-bold">${order.total_amount?.toFixed(2)}</td>
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
        )}
      </div
    </div>
  );
}
