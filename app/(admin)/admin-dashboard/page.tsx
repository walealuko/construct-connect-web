"use client";

import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "@/components/UserContext";
import { supabase } from "@/lib/supabase";
import SafeImage from "@/components/ui/SafeImage";
import { Profile, Product, primaryImage } from "@/types/database";
import { updateUserRoleAction } from "@/app/actions/admin";
import { toast } from "sonner";
import { resolveImageUrl } from "@/lib/storage";
import { formatNaira } from "@/lib/format";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  seller_id: string;
  reviewer_id: string;
  reviewer_name: string | null;
  created_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  };
  reviewerName?: string;
  sellerName?: string;
}

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "users", label: "Users" },
  { key: "products", label: "Products" },
  { key: "reviews", label: "Reviews" },
];

export default function AdminDashboard() {
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({ users: 0, sellers: 0, buyers: 0, products: 0, revenue: 0 });
  const [users, setUsers] = useState<Profile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const [usersRes, productsRes, ordersRes, itemsRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('products').select('*'),
        // Only need the id+status; we join via order_items to get prices.
        supabase.from('orders').select('id, status'),
        supabase.from('order_items').select('order_id, price_at_purchase, quantity'),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (productsRes.error) throw productsRes.error;
      if (ordersRes.error) throw ordersRes.error;
      if (itemsRes.error) throw itemsRes.error;

      const allUsers = usersRes.data || [];
      setUsers(allUsers);
      setProducts(productsRes.data || []);

      // Sum revenue for orders marked completed. Price lives on order_items,
      // not orders, so we compute it here instead of trusting a denormalised
      // column that doesn't exist in this schema.
      const completedOrderIds = new Set(
        (ordersRes.data || [])
          .filter((o) => o.status === 'completed')
          .map((o) => o.id)
      );
      const totalRevenue = (itemsRes.data || [])
        .filter((it) => completedOrderIds.has(it.order_id))
        .reduce(
          (sum: number, it: any) =>
            sum + Number(it.price_at_purchase || 0) * Number(it.quantity || 0),
          0
        );

      setStats({
        users: allUsers.length,
        sellers: allUsers.filter((u) => u.tier === 'business' || u.tier === 'artisan').length,
        buyers: allUsers.filter((u) => u.tier === 'individual').length,
        products: productsRes.data?.length || 0,
        revenue: totalRevenue,
      });
    } catch (err: any) {
      console.error("Failed to load overview:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, profiles(first_name, last_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedReviews = (data || []).map(r => ({
        ...r,
        reviewerName: `${r.profiles?.first_name || ''} ${r.profiles?.last_name || ''}`.trim() || 'Unknown',
        sellerName: r.seller_name || 'Unknown'
      }));

      setReviews(formattedReviews);
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  const switchTab = async (tab: string) => {
    setActiveTab(tab);
    setMessage("");
    if (tab === "reviews") {
      await loadReviews();
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      setLoading(true);
      const result = await updateUserRoleAction(userId, newRole);

      if (!result.success) {
        throw new Error(result.error || "Failed to update role");
      }

      setUsers(users.map((u) => (u.id === userId ? { ...u, tier: newRole as Profile['tier'] } : u)));
      setMessage("User role successfully updated!");
      toast.success("Role updated successfully");
    } catch (err: any) {
      setMessage(err.message || "Failed to update role.");
      toast.error(err.message || "Failed to update role");
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!window.confirm("Delete this user profile? (Auth user will remain)")) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      setUsers(users.filter((u) => u.id !== userId));
      setStats((s) => ({ ...s, users: s.users - 1 }));
      setMessage("User profile deleted.");
    } catch {
      setMessage("Failed to delete user.");
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      setProducts(products.filter((p) => p.id !== productId));
      setStats((s) => ({ ...s, products: s.products - 1 }));
      setMessage("Product deleted.");
    } catch {
      setMessage("Failed to delete product.");
    }
  };

  if (user && user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600 text-xl font-bold">Access denied. Admins only.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-extrabold text-slate-900">Admin Dashboard</h2>
        {message && (
          <p className={`font-semibold text-sm ${message.includes("Fail") ? "text-red-600" : "text-green-600"}`}>{message}</p>
        )}
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => switchTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: "Total Users", value: stats.users, color: "text-slate-900" },
            { label: "Sellers", value: stats.sellers, color: "text-blue-600" },
            { label: "Buyers", value: stats.buyers, color: "text-green-600" },
            { label: "Products", value: stats.products, color: "text-amber-600" },
            { label: "Total Revenue", value: formatNaira(stats.revenue), color: "text-indigo-600" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
              <div className={`text-3xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-gray-500 text-xs uppercase font-bold tracking-wider mt-2">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "users" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-gray-500 uppercase text-xs font-bold tracking-wider">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Business</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-slate-900 font-medium">{`${u.first_name || ''} ${u.last_name || ''}`.trim() || "—"}</td>
                  <td className="px-6 py-4 text-gray-500">{u.email}</td>
                  <td className="px-6 py-4">
                    <select
                      // Pass the tier value through unchanged. The
                      // action accepts individual / business / artisan /
                      // admin directly. The previous handler
                      // (`e.target.value === 'business' ? 'seller' : 'buyer'`)
                      // sent a non-tier string AND silently demoted
                      // anyone selecting Admin to "buyer" (individual),
                      // because Admin fell into the `else` branch.
                      value={u.tier}
                      onChange={(e) => updateUserRole(u.id, e.target.value)}
                      className="p-1 text-xs border rounded bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="individual">Buyer</option>
                      <option value="business">Seller</option>
                      <option value="artisan">Artisan</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{u.business_name || "—"}</td>
                  <td className="px-6 py-4 text-gray-500">{u.location || "—"}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "products" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-gray-500 uppercase text-xs font-bold tracking-wider">
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">Seller</th>
                <th className="px-6 py-3">Price</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Stock</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {primaryImage(p) && (
                        <SafeImage src={resolveImageUrl(primaryImage(p), 'product-images')} alt={p.name} width={32} height={32} className="rounded-md" />
                      )}
                      <span className="text-slate-900 font-medium truncate max-w-[150px]">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{p.seller_name || "—"}</td>
                  <td className="px-6 py-4 text-blue-600 font-bold">{formatNaira(p.price)}</td>
                  <td className="px-6 py-4 text-gray-500 capitalize">{p.category}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{p.stock}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => deleteProduct(p.id)}
                      className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "reviews" && (
        <div className="space-y-4">
          {loading ? (
            <p className="text-center text-gray-500">Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <p className="text-center text-gray-500">No reviews found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-slate-900 font-bold">{review.reviewerName}</p>
                      <p className="text-xs text-gray-500">reviewed {review.sellerName}</p>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={`text-sm ${star <= review.rating ? 'text-amber-500' : 'text-gray-200'}`}>★</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm italic">"{review.comment}"</p>
                  <div className="mt-4 text-right text-[10px] text-gray-400 uppercase font-bold">
                    {review.created_at ? new Date(review.created_at).toLocaleDateString() : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

