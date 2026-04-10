import React, { useState, useEffect, useContext } from "react";
import API from "../api";
import { UserContext } from "../context/UserContext";

export default function SellerDashboard() {
  const { user } = useContext(UserContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "general",
    stock: "",
    imageUrl: "",
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await API.get("/products/my");
      setProducts(res.data);
    } catch (err) {
      console.error("Failed to load products:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      setMessage("Name and price are required");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      await API.post("/products", formData);
      setFormData({ name: "", description: "", price: "", category: "general", stock: "", imageUrl: "" });
      setMessage("Product added successfully!");
      loadProducts();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <h2 style={{ fontSize: "1.8rem", fontWeight: "700", color: "#1e3a5f", marginBottom: "1.5rem" }}>
        Seller Dashboard — Welcome, {user?.name}
      </h2>

      {/* Add Product Form */}
      <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.08)", marginBottom: "2rem" }}>
        <h3 style={{ marginBottom: "16px", color: "#374151" }}>Add New Product</h3>
        {message && (
          <p style={{ color: message.includes("success") ? "#16a34a" : "#dc2626", marginBottom: "12px", fontWeight: "500" }}>{message}</p>
        )}
        <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151", fontSize: "0.9rem" }}>Product Name *</label>
            <input
              placeholder="e.g. Premium Cement"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151", fontSize: "0.9rem" }}>Description</label>
            <textarea
              placeholder="Describe your product..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151", fontSize: "0.9rem" }}>Price ($) *</label>
            <input
              type="number"
              placeholder="0.00"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151", fontSize: "0.9rem" }}>Stock Qty</label>
            <input
              type="number"
              placeholder="0"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151", fontSize: "0.9rem" }}>Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              style={inputStyle}
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
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151", fontSize: "0.9rem" }}>Image URL</label>
            <input
              placeholder="https://..."
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "12px 24px",
                backgroundColor: loading ? "#93c5fd" : "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Adding..." : "Add Product"}
            </button>
          </div>
        </form>
      </div>

      {/* Products List */}
      <h3 style={{ marginBottom: "16px", color: "#374151" }}>Your Products ({products.length})</h3>
      {products.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No products yet. Add your first product above.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "16px" }}>
          {products.map((product) => (
            <div key={product._id} style={{ background: "#fff", padding: "16px", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              {product.imageUrl && (
                <img src={product.imageUrl} alt={product.name} style={{ width: "100%", height: "140px", objectFit: "cover", borderRadius: "6px", marginBottom: "10px" }} />
              )}
              <h4 style={{ margin: "0 0 6px", color: "#1e3a5f" }}>{product.name}</h4>
              <p style={{ margin: "0 0 6px", color: "#6b7280", fontSize: "0.85rem" }}>{product.description || "No description"}</p>
              <p style={{ margin: "0", fontWeight: "700", color: "#2563eb" }}>${product.price?.toFixed(2)}</p>
              <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#9ca3af" }}>Stock: {product.stock || 0} | {product.category}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "6px",
  border: "1px solid #d1d5db",
  fontSize: "0.95rem",
  boxSizing: "border-box",
};
