"use client";

import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "@/components/UserContext";
import { supabase } from "@/lib/supabase";
import { Product, Order, Profile } from "@/types/database";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Image from "next/image";
import { toast } from "sonner";
import Link from "next/link";
import { deleteProductAction } from "@/app/actions/products";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";

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
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, productId: "" });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      setProfile(profileData);

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

  const confirmDeleteProduct = async () => {
    if (!deleteModal.productId) return;
    setLoading(true);
    setDeleteModal({ ...deleteModal, isOpen: false });
    try {
      const result = await deleteProductAction(deleteModal.productId);
      if (result.success) {
        toast.success("Product deleted successfully");
        loadDashboardData();
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete product");
    } finally {
      setLoading(false);
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
          price: parseFloat(formData.price),
          category: formData.category,
          stock: parseInt(formData.stock || '0'),
          image_url: finalImageUrl,
          description: `${formData.description}\\nDelivery: ${formData.delivery}`
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
          <Card className="h-fit">
            <CardHeader className="flex flex-col items-start gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600">
                  {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'S'}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{profile?.full_name || "Seller Profile"}</h3>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
              </div>
              <div className="w-full space-y-3">
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
                  <Badge variant="info">{profile?.tier}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardFooter>
              <Link href="/profile/edit" className="text-xs font-bold text-blue-600 hover:underline">
                Update Shop Details →
              </Link>
            </CardFooter>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <p className="text-gray-400 text-xs font-bold uppercase">Revenue</p>
                <p className="text-2xl font-black text-slate-900">${stats.revenue.toFixed(2)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-gray-400 text-xs font-bold uppercase">Orders</p>
                <p className="text-2xl font-black text-slate-900">{stats.ordersCount}</p>
              </Card>
              <Card className="p-4">
                <p className="text-gray-400 text-xs font-bold uppercase">Products</p>
                <p className="text-2xl font-black text-slate-900">{stats.productsCount}</p>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800">Product Gallery</h3>
                <Link href="/messages" className="text-sm font-bold text-blue-600 hover:underline">Messages →</Link>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {products.map((product) => (
                      <div key={product.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex gap-4 items-center">
                        {product.image_url && (
                          <Image src={product.image_url} alt={product.name} width={60} height={60} className="w-16 h-16 object-cover rounded-lg" />
                        )}
                        <div className="flex-1 min-w-0 flex justify-between items-center">
                          <div>
                            <h4 className="font-bold text-slate-900 truncate text-sm">{product.name}</h4>
                            <p className="text-blue-600 font-bold text-xs">${product.price?.toFixed(2)}</p>
                            <p className="text-gray-400 text-[10px]">Stock: {product.stock}</p>
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
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <h3 className="text-lg font-bold text-slate-800">Add Product</h3>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  placeholder="Product Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Description</label>
                  <textarea
                    placeholder="Product description..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full p-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="number"
                    placeholder="Price ($)"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                  <Input
                    type="number"
                    placeholder="Stock"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Delivery Availability</label>
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
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Product Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                  isLoading={loading}
                >
                  Add Product
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xl font-bold text-slate-800">Recent Orders</h3>
            <Card>
              <div className="overflow-x-auto">
                <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-xs font-bold tracking-wider">
                  <div className="px-6 py-3">Buyer</div>
                  <div className="px-6 py-3">Total</div>
                  <div className="px-6 py-3">Status</div>
                  <div className="px-6 py-3 text-right">Action</div>
                </div>
                <div className="divide-y divide-gray-100">
                  {loading ? (
                    <div className="p-6 text-center text-gray-400">Loading orders...</div>
                  ) : orders.length === 0 ? (
                    <div className="p-6 text-center text-gray-400">No orders found yet.</div>
                  ) : (
                    orders.map((order) => (
                      <div key={order.id} className="grid grid-cols-4 hover:bg-gray-50 transition-colors text-sm">
                        <div className="px-6 py-4 text-slate-900 font-medium">
                          {order.profiles?.first_name ? `${order.profiles.first_name} ${order.profiles.last_name}` : "Unknown Buyer"}
                        </div>
                        <div className="px-6 py-4 text-slate-900 font-bold">${order.total_price?.toFixed(2)}</div>
                        <div className="px-6 py-4">
                          <Badge
                            variant={
                              order.status === 'completed' ? 'success' :
                              order.status === 'shipped' ? 'info' : 'warning'
                            }
                          >
                            {order.status}
                          </Badge>
                        </div>
                        <div className="px-6 py-4 text-right">
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
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>
          </div>
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
