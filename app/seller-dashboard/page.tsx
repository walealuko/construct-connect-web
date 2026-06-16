"use client";

import React, { useState, useEffect, useContext, useId } from "react";
import { UserContext } from "@/components/UserContext";
import { supabase } from "@/lib/supabase";
import { Product, Order, Profile } from "@/types/database";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Image from "next/image";
import SafeImage from "@/components/ui/SafeImage";
import { toast } from "sonner";
import Link from "next/link";
import { deleteProductAction, createProductAction, updateProductAction } from "@/app/actions/products";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";

const PRODUCT_CATEGORIES = [
  "General",
  "Tools & Equipment",
  "Building Materials",
  "Heavy Machinery",
  "Electrical & Plumbing",
  "Architectural Services",
  "Interior Design",
  "HVAC",
  "Painting & Finishing"
];

export default function SellerDashboard() {
  const userContext = useContext(UserContext);
  const { user, loading: authLoading } = userContext || { user: null, loading: true };

  console.log("--- Seller Dashboard Auth Check ---");
  console.log("User:", user);
  console.log("Auth Loading:", authLoading);
  console.log("-----------------------------------");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ revenue: 0, ordersCount: 0, productsCount: 0 });
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, productId: "" });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const descId = useId();
  const catId = useId();
  const imgId = useId();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: PRODUCT_CATEGORIES[0],
    stock: "",
    imageFile: null as File | null,
    imagePreview: "",
  });

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

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

      console.log("sellerId:", user?.id);
      console.log("Query seller:", user?.id);
      console.log("Products returned:", productsData?.length);
      console.log(productsData);

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

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setLoading(true);
    try {
      const result = await updateProductAction(editingProduct.id, formData);
      if (result.success) {
        toast.success("Product updated successfully!");
        setIsEditModalOpen(false);
        loadDashboardData();
      } else {
        toast.error(result.error);
      }
    } catch (err: any) {
      toast.error("Failed to update product");
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      category: product.category,
      stock: product.stock.toString(),
      imageFile: null,
      imagePreview: product.image_url,
    });
    setIsEditModalOpen(true);
  };

  if (authLoading) {
    return (
      <DashboardLayout userRole="business">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setIsAddModalOpen(false);

    try {
      let finalImageUrl = "";

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
      } else {
        throw new Error("Product image is required");
      }

      const result = await createProductAction({
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        stock: parseInt(formData.stock || '0'),
        image_url: finalImageUrl,
      });

      if (!result.success) throw new Error(result.error);

      toast.success("Product added successfully!");
      setFormData({
        name: "",
        description: "",
        price: "",
        category: PRODUCT_CATEGORIES[0],
        stock: "",
        imageFile: null,
        imagePreview: "",
      });
      loadDashboardData();
    } catch (err: any) {
      toast.error(err.message || "Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout userRole="business">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-slate-900">Seller Dashboard</h2>
            <p className="text-gray-500 font-medium">Manage your inventory and sales</p>
          </div>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="px-6 py-6 text-base font-bold"
          >
            + Add New Product
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Stats & Profile */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="h-fit overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-gray-100">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-lg">
                    {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'S'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{profile?.full_name || "Seller Profile"}</h3>
                    <p className="text-xs text-gray-500 truncate max-w-[150px]">{user?.email}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-gray-400">Business Name</span>
                  <span className="font-semibold text-slate-700">{profile?.business_name || "Not specified"}</span>
                </div>
                <div className="flex justify-between py-2 text-sm border-t border-gray-50">
                  <span className="text-gray-400">Location</span>
                  <span className="font-semibold text-slate-700">{profile?.location || "Not specified"}</span>
                </div>
                <div className="flex justify-between py-2 text-sm border-t border-gray-50">
                  <span className="text-gray-400">Tier</span>
                  <Badge variant="info">{profile?.tier}</Badge>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 border-t border-gray-100 p-3">
                <Link href="/profile/edit" className="w-full text-center text-xs font-bold text-blue-600 hover:underline">
                  Update Shop Details →
                </Link>
              </CardFooter>
            </Card>

            <div className="grid grid-cols-1 gap-4">
              <Card className="p-4 bg-gradient-to-br from-blue-600 to-blue-700 text-white border-none shadow-md">
                <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">Total Revenue</p>
                <p className="text-3xl font-black">${stats.revenue.toFixed(2)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Active Orders</p>
                <p className="text-3xl font-black text-slate-900">{stats.ordersCount}</p>
              </Card>
              <Card className="p-4">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Products</p>
                <p className="text-3xl font-black text-slate-900">{stats.productsCount}</p>
              </Card>
            </div>
          </div>

          {/* Right Column: Products & Orders */}
          <div className="lg:col-span-3 space-y-8">
            <section>
              <div className="flex justify-between items-end mb-4">
                <h3 className="text-xl font-bold text-slate-800">Product Inventory</h3>
                <Link href="/messages" className="text-sm font-bold text-blue-600 hover:underline">View Messages →</Link>
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
                      <p className="text-gray-400 text-sm">No products listed yet. Start by adding your first product!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {products.map((product) => (
                        <div key={product.id} className="bg-white p-4 rounded-xl border border-gray-200 flex gap-4 items-center group hover:border-blue-300 transition-all shadow-sm">
                          {product.image_url ? (
                            <SafeImage src={product.image_url} alt={product.name} width={80} height={80} className="w-20 h-20 object-cover rounded-lg shadow-sm" />
                          ) : (
                            <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">No Image</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-900 truncate text-sm">{product.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-blue-600 font-bold text-xs">${product.price?.toFixed(2)}</p>
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5">{product.category}</Badge>
                            </div>
                            <p className="text-gray-400 text-[10px] mt-1">Stock: {product.stock}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              onClick={() => openEditModal(product)}
                              title="Edit Product"
                            >
                              ✏️
                            </Button>
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

            <section>
              <h3 className="text-xl font-bold text-slate-800 mb-4">Recent Orders</h3>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-4 bg-slate-50 border-b border-gray-100 text-gray-500 uppercase text-xs font-bold tracking-wider">
                    <div className="px-6 py-4">Buyer</div>
                    <div className="px-6 py-4">Total</div>
                    <div className="px-6 py-4">Status</div>
                    <div className="px-6 py-4 text-right">Action</div>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {loading && orders.length === 0 ? (
                      <div className="p-6 text-center text-gray-400">Loading orders...</div>
                    ) : orders.length === 0 ? (
                      <div className="p-6 text-center text-gray-400">No orders found yet.</div>
                    ) : (
                      orders.map((order) => (
                        <div key={order.id} className="grid grid-cols-4 hover:bg-slate-50 transition-colors text-sm items-center">
                          <div className="px-6 py-4 text-slate-900 font-medium">
                            {
                              order.profiles?.first_name
                                ? `${order.profiles.first_name} ${order.profiles.last_name}`
                                : "Unknown Buyer"
                            }
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
            </section>
          </div>
        </div>

        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Add New Product"
        >
          <form onSubmit={handleSubmit} className="space-y-5 py-2">
            <div className="space-y-4">
              <Input
                label="Product Name"
                placeholder="e.g., Industrial Concrete Mixer"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <div className="space-y-1.5">
                <label htmlFor={descId} className="text-xs font-bold text-gray-400 uppercase tracking-wider">Description</label>
                <textarea
                  id={descId}
                  name="description"
                  placeholder="Describe the features, specifications, and condition..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full p-3 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Price ($)"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
                <Input
                  label="Stock Quantity"
                  type="number"
                  placeholder="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor={catId} className="text-xs font-bold text-gray-400 uppercase tracking-wider">Category</label>
                <select
                  id={catId}
                  name="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-3 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                  required
                >
                  {PRODUCT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor={imgId} className="text-xs font-bold text-gray-400 uppercase tracking-wider">Product Image</label>
                <div className="flex flex-col gap-3">
                  <input
                    id={imgId}
                    name="image"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    required
                  />
                  {formData.imagePreview && (
                    <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-blue-100">
                      <Image
                        src={formData.imagePreview}
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
                Save Product
              </Button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Product"
        >
          <form onSubmit={handleUpdateProduct} className="space-y-5 py-2">
            <div className="space-y-4">
              <Input
                label="Product Name"
                placeholder="e.g., Industrial Concrete Mixer"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <div className="space-y-1.5">
                <label htmlFor={descId} className="text-xs font-bold text-gray-400 uppercase tracking-wider">Description</label>
                <textarea
                  id={descId}
                  name="description"
                  placeholder="Describe the features, specifications, and condition..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full p-3 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Price ($)"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
                <Input
                  label="Stock Quantity"
                  type="number"
                  placeholder="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor={catId} className="text-xs font-bold text-gray-400 uppercase tracking-wider">Category</label>
                <select
                  id={catId}
                  name="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-3 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                  required
                >
                  {PRODUCT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor={imgId} className="text-xs font-bold text-gray-400 uppercase tracking-wider">Product Image</label>
                <div className="flex flex-col gap-3">
                  <input
                    id={imgId}
                    name="image"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    required
                  />
                  {formData.imagePreview && (
                    <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-blue-100">
                      <Image
                        src={formData.imagePreview}
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
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                isLoading={loading}
                className="px-8"
              >
                Update Product
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}

