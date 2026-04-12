import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import { UserContext } from "../context/UserContext";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "users", label: "Users" },
  { key: "products", label: "Products" },
  { key: "reviews", label: "Reviews" },
];

export default function AdminDashboard() {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({ users: 0, sellers: 0, buyers: 0, products: 0 });
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/");
    }
    loadOverview();
  }, []);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const [usersRes, productsRes] = await Promise.all([
        API.get("/auth/users"),
        API.get("/products"),
      ]);
      const allUsers = usersRes.data;
      setUsers(allUsers);
      setProducts(productsRes.data);
      setStats({
        users: allUsers.length,
        sellers: allUsers.filter((u) => u.role === "seller").length,
        buyers: allUsers.filter((u) => u.role === "buyer").length,
        products: productsRes.data.length,
      });
    } catch (err) {
      console.error("Failed to load overview:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    setLoading(true);
    try {
      // Load reviews from all sellers
      const sellers = users.filter((u) => u.role === "seller");
      let allReviews = [];
      for (const seller of sellers) {
        try {
          const res = await API.get(`/reviews/seller/${seller._id || seller.id}`);
          allReviews = [...allReviews, ...res.data.map((r) => ({ ...r, sellerName: seller.name || seller.businessName }))];
        } catch {}
      }
      setReviews(allReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  const switchTab = async (tab) => {
    setActiveTab(tab);
    setMessage("");
    if (tab === "reviews") {
      await loadReviews();
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      await API.put(`/auth/users/${userId}/role`, { role: newRole });
      setUsers(users.map((u) => (u._id === userId || u.id === userId ? { ...u, role: newRole } : u)));
      setMessage("User role updated.");
    } catch (err) {
      setMessage("Failed to update role.");
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await API.delete(`/auth/users/${userId}`);
      setUsers(users.filter((u) => u._id !== userId && u.id !== userId));
      setStats((s) => ({ ...s, users: s.users - 1 }));
      setMessage("User deleted.");
    } catch (err) {
      setMessage("Failed to delete user.");
    }
  };

  const deleteProduct = async (productId) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await API.delete(`/products/${productId}`);
      setProducts(products.filter((p) => p._id !== productId));
      setStats((s) => ({ ...s, products: s.products - 1 }));
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

      {/* Tabs */}
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

      {/* Overview */}
      {activeTab === "overview" && (
        <div>
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
        </div>
      )}

      {/* Users */}
      {activeTab === "users" && (
        <div style={{ overflowX: "auto" }}>
          {loading ? (
            <p style={{ color: "#6b7280" }}>Loading...</p>
          ) : users.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No users found.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  {["Name", "Email", "Role", "Business", "Location", "Joined", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.8rem", fontWeight: "700", color: "#6b7280", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id || u.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "12px 16px", fontSize: "0.9rem", color: "#1f2937" }}>{u.name || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: "0.85rem", color: "#6b7280" }}>{u.email}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <select
                        value={u.role}
                        onChange={(e) => updateUserRole(u._id || u.id, e.target.value)}
                        style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.85rem", cursor: "pointer" }}
                      >
                        <option value="buyer">Buyer</option>
                        <option value="seller">Seller</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "0.85rem", color: "#6b7280" }}>{u.businessName || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: "0.85rem", color: "#6b7280" }}>{u.location || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: "0.8rem", color: "#9ca3af" }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <button
                        onClick={() => deleteUser(u._id || u.id)}
                        style={{ padding: "4px 12px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer" }}
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

      {/* Products */}
      {activeTab === "products" && (
        <div style={{ overflowX: "auto" }}>
          {loading ? (
            <p style={{ color: "#6b7280" }}>Loading...</p>
          ) : products.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No products found.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  {["Product", "Seller", "Price", "Category", "Stock", "Listed", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.8rem", fontWeight: "700", color: "#6b7280", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "12px 16px", fontSize: "0.9rem", color: "#1f2937", maxWidth: "200px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} style={{ width: "36px", height: "36px", objectFit: "cover", borderRadius: "4px" }} />
                        ) : (
                          <div style={{ width: "36px", height: "36px", background: "#e5e7eb", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>🏗️</div>
                        )}
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "0.85rem", color: "#6b7280" }}>{p.sellerName || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: "0.9rem", fontWeight: "700", color: "#2563eb" }}>${p.price?.toFixed(2)}</td>
                    <td style={{ padding: "12px 16px", fontSize: "0.8rem", color: "#6b7280", textTransform: "capitalize" }}>{p.category}</td>
                    <td style={{ padding: "12px 16px", fontSize: "0.85rem", color: p.stock > 0 ? "#16a34a" : "#dc2626" }}>{p.stock}</td>
                    <td style={{ padding: "12px 16px", fontSize: "0.8rem", color: "#9ca3af" }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <button
                        onClick={() => deleteProduct(p._id)}
                        style={{ padding: "4px 12px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer" }}
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

      {/* Reviews */}
      {activeTab === "reviews" && (
        <div>
          {loading ? (
            <p style={{ color: "#6b7280" }}>Loading...</p>
          ) : reviews.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No reviews found.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {reviews.map((review) => (
                <div key={review._id} style={{ background: "#fff", padding: "16px", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: "700", color: "#1e3a5f", fontSize: "0.95rem" }}>{review.reviewerName} reviewed {review.sellerName}</p>
                      <div style={{ display: "flex", gap: "2px", marginTop: "4px" }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} style={{ fontSize: "0.9rem", color: star <= review.rating ? "#f59e0b" : "#d1d5db" }}>★</span>
                        ))}
                      </div>
                    </div>
                    <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>{new Date(review.createdAt).toLocaleDateString()}</span>
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
