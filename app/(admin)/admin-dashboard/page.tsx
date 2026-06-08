"use client";

import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "@/components/UserContext";
import { supabase } from "@/lib/supabase";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "users", label: "Users" },
  { key: "products", label: "Products" },
  { key: "reviews", label: "Reviews" },
];

export default function AdminDashboard() {
  const { user } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({ users: 0, sellers: 0, buyers: 0, products: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const [usersRes, productsRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('products').select('*'),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (productsRes.error) throw productsRes.error;

      const allUsers = usersRes.data || [];
      setUsers(allUsers);
      setProducts(productsRes.data || []);
      setStats({
        users: allUsers.length,
        sellers: allUsers.filter((u: any) => u.tier === 'business').length,
        buyers: allUsers.filter((u: any) => u.tier === 'individual').length,
        products: productsRes.data?.length || 0,
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
      const tier = newRole === 'seller' ? 'business' : 'individual';
      const { error } = await supabase
        .from('profiles')
        .update({ tier })
        .eq('id', userId);

      if (error) throw error;
      setUsers(users.map((u: any) => (u.id === userId ? { ...u, tier: tier } : u)));
      setMessage("User role updated.");
    } catch (err: any) {
      setMessage("Failed to update role.");
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
      setUsers(users.filter((u: any) => u.id !== userId));
      setStats((s: any) => ({ ...s, users: s.users - 1 }));
      setMessage("User profile deleted.");
    } catch (err) {
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
      setProducts(products.filter((p: any) => p.id !== productId));
      setStats((s: any) => ({ ...s, products: s.products - 1 }));
      setMessage("Product deleted.");
    } catch (err) {
      setMessage("Failed to delete product.");
    }
  };

  if (user && user.role !== "admin") {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <p style={{ color: "#dc2626", fontSize: "1.2rem" }}>Access denied. Admins only.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
        <h2 style={{ fontSize: "1.8rem", fontWeight: "700", color: "#1e3a5f" }}>Admin Dashboard</h2>
        {message && (
          <p style={{ color: message.includes("Fail") ? "#dc2626" : "#16a34a", fontWeight: "600", fontSize: "0.9rem" }}>{message}</p>
        )}
      </div>

      <div style={{ display: "flex", gap: "4px", marginBottom: "24px", borderBottom: "2px solid #e5e7eb" }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => switchTab(tab.key)}
            style={{
              padding: "10px 20px",
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.key ? "3px solid #2563eb" : "3px solid transparent",
              color: activeTab === tab.key ? "#2563eb" : "#6b7280",
              fontWeight: activeTab === tab.key ? "700" : "500",
              fontSize: "0.95rem",
              cursor: "pointer",
              marginBottom: "-2px",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          {[
            { label: "Total Users", value: stats.users, color: "#1e3a5f" },
            { label: "Sellers", value: stats.sellers, color: "#2563eb" },
            { label: "Buyers", value: stats.buyers, color: "#16a34a" },
            { label: "Products", value: stats.products, color: "#ca8a04" },
          ].map((stat) => (
            <div key={stat.label} style={{ background: "#fff", padding: "24px", borderRadius: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", fontWeight: "800", color: stat.color }}>{stat.value}</div>
              <div style={{ color: "#6b7280", fontSize: "0.9rem", marginTop: "4px" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "users" && (
        <div style={{ overflowX: "auto" }}>
          {loading ? (
            <p style={{ color: "#6b7280" }}>Loading...</p>
          ) : users.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No users found.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <thead style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <tr>
                  {["Name", "Email", "Role", "Business", "Location", "Joined", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.8rem", fontWeight: "700", color: "#6b7280", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ margin: 0 }}>
                {users.map((u: any) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "12px 16px", fontSize: "0.9rem", color: "#1f2937" }}>{`${u.first_name || ''} ${u.last_name || ''}`.trim() || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: "0.85rem", color: "#6b7280" }}>{u.email}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <select
                        value={u.tier}
                        onChange={(e) => updateUserRole(u.id, e.target.value === 'business' ? 'seller' : 'buyer')}
                        style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.85rem", cursor: "pointer" }}
                      >
                        <option value="individual">Buyer</option>
                        <option value="business">Seller</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "0.85rem", color: "#6b7280" }}>{u.business_name || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: "0.85rem", color: "#6b7280" }}>{u.location || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: "0.8rem", color: "#9ca3af" }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <button
                        onClick={() => deleteUser(u.id)}
                        style={{ padding: "4px 12px", background: "#fee2e2", color: "#dc2 la l", border: "none", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer" }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "products" && (
        <div style={{ overflowX: "auto" }}>
          {loading ? (
            <p style={{ color: "#6b7280" }}>Loading...</p>
          ) : products.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No products found.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <thead style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <tr>
                  {["Product", "Seller", "Price", "Category", "Stock", "Listed", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.8rem", fontWeight: "700", color: "#6b7280", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ margin: 0 }}>
                {products.map((p: any) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "12px 16px", fontSize: "0.9rem", color: "#1f2937", maxWidth: "200px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} style={{ width: "36px", height: "36px", objectFit: "cover", borderRadius: "4px" }} />
                        ) : (
                          <div style={{ width: "36px", height: "36px", background: "#e5e7eb", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>🏗️</div>
                        )}
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "0.85rem", color: "#6b7280" }}>{p.seller_name || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: "0.9rem", fontWeight: "700", color: "#2563eb" }}>${p.price?.toFixed(2)}</td>
                    <td style={{ padding: "12px 16px", fontSize: "0.8rem", color: "#6b7280", textTransform: "capitalize" }}>{p.category}</td>
                    <td style={{ padding: "12px 16px", fontSize: "0.85rem", color: p.stock > 0 ? "#16a34a" : "#dc2626" }}>{p.stock}</td>
                    <td style={{ padding: "12px 16px", fontSize: "0.8rem", color: "#9ca3af" }}>{p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <button
                        onClick={() => deleteProduct(p.id)}
                        style={{ padding: "4px 12px", background: "#fee2e2", color: "#dc262 la l", border: "none", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer" }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "reviews" && (
        <div>
          {loading ? (
            <p style={{ color: "#6b7280" }}>Loading...</p>
          ) : reviews.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No reviews found.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {reviews.map((review: any) => (
                <div key={review.id} style={{ background: "#fff", padding: "16px", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: "700", color: "#1e3a5f", fontSize: "0.95rem" }}>{review.reviewerName} reviewed {review.sellerName}</p>
                      <div style={{ display: "flex", gap: "2px", marginTop: "4px" }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} style={{ fontSize: "0.9rem", color: star <= review.rating ? "#f59e0b" : "#d1d5db" }}>★</span>
                        ))}
                      </div>
                    </div>
                    <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>{review.created_at ? new Date(review.created_at).toLocaleDateString() : "—"}</span>
                  </div>
                  {review.comment && <p style={{ margin: 0, color: "#4b5563", fontSize: "0.9rem" }}>{review.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
