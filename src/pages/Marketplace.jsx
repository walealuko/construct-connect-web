import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../api";
import { useCart } from "../context/CartContext";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "cement", label: "Cement" },
  { value: "bricks", label: "Bricks" },
  { value: "timber", label: "Timber" },
  { value: "tools", label: "Tools" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "paint", label: "Paint" },
  { value: "roofing", label: "Roofing" },
  { value: "flooring", label: "Flooring" },
  { value: "general", label: "General" },
];

const Marketplace = () => {
  const { addToCart, cart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    loadProducts();
  }, [category]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category && category !== "all") params.append("category", category);
      if (search) params.append("search", search);
      const res = await API.get(`/products?${params.toString()}`);
      setProducts(res.data);
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [search, category]);

  return (
    <div style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
      <h2 style={{ fontSize: "1.8rem", fontWeight: "700", color: "#1e3a5f", marginBottom: "1.5rem" }}>
        Marketplace
      </h2>

      {/* Search and Filter Bar */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{ flex: "2", minWidth: "200px", position: "relative" }}>
          <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: "1.1rem" }}>🔍</span>
          <input
            type="text"
            placeholder="Search by product name, type, or location..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px 12px 40px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              fontSize: "0.95rem",
              boxSizing: "border-box",
            }}
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            flex: "1",
            minWidth: "160px",
            padding: "12px 14px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            fontSize: "0.95rem",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      {!loading && (
        <p style={{ color: "#6b7280", marginBottom: "16px", fontSize: "0.9rem" }}>
          {products.length} {products.length === 1 ? "product" : "products"} found
          {search && ` for "${search}"`}
          {category !== "all" && ` in ${CATEGORIES.find(c => c.value === category)?.label}`}
        </p>
      )}

      {loading ? (
        <p style={{ color: "#6b7280" }}>Searching...</p>
      ) : products.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", background: "#f9fafb", borderRadius: "12px" }}>
          <p style={{ fontSize: "2rem", margin: "0 0 8px" }}>🔍</p>
          <p style={{ color: "#6b7280", margin: 0 }}>No products found. Try adjusting your search or category.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "16px" }}>
          {products.map((product) => {
            const inCart = cart.some((item) => item._id === product._id);
            return (
              <div key={product._id} style={{ background: "#fff", padding: "16px", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                <Link to={`/product/${product._id}`} style={{ textDecoration: "none" }}>
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} style={{ width: "100%", height: "140px", objectFit: "cover", borderRadius: "6px", marginBottom: "10px" }} />
                  ) : (
                    <div style={{ width: "100%", height: "140px", background: "#e5e7eb", borderRadius: "6px", marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>🏗️</div>
                  )}
                  <h4 style={{ margin: "0 0 6px", color: "#1e3a5f" }}>{product.name}</h4>
                </Link>
                <p style={{ margin: "0 0 6px", color: "#6b7280", fontSize: "0.85rem" }}>{product.description || "No description"}</p>
                <p style={{ margin: "0 0 4px", fontWeight: "700", color: "#2563eb", fontSize: "1.1rem" }}>${product.price?.toFixed(2)}</p>
                <p style={{ margin: "0", fontSize: "0.8rem", color: "#9ca3af" }}>
                  {product.sellerName || "Unknown"}
                  {product.sellerLocation && ` • ${product.sellerLocation}`}
                </p>
                <span style={{ display: "inline-block", background: "#eff6ff", color: "#2563eb", fontSize: "0.75rem", padding: "2px 8px", borderRadius: "12px", marginTop: "6px", marginRight: "6px" }}>
                  {product.category}
                </span>
                <button
                  onClick={() => addToCart(product)}
                  disabled={inCart}
                  style={{
                    display: "inline-block",
                    marginTop: "6px",
                    padding: "8px 16px",
                    backgroundColor: inCart ? "#93c5fd" : "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    cursor: inCart ? "not-allowed" : "pointer",
                  }}
                >
                  {inCart ? "In Cart ✓" : "Add to Cart"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Marketplace;
