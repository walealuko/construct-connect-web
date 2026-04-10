import React, { useState, useEffect } from "react";
import API from "../api";

export default function BuyerDashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await API.get("/products");
      setProducts(res.data);
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <h2 style={{ fontSize: "1.8rem", fontWeight: "700", color: "#1e3a5f", marginBottom: "1.5rem" }}>
        Marketplace — Browse Products
      </h2>

      {loading ? (
        <p style={{ color: "#6b7280" }}>Loading products...</p>
      ) : products.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No products available yet. Check back soon!</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "16px" }}>
          {products.map((product) => (
            <div key={product._id} style={{ background: "#fff", padding: "16px", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} style={{ width: "100%", height: "140px", objectFit: "cover", borderRadius: "6px", marginBottom: "10px" }} />
              ) : (
                <div style={{ width: "100%", height: "140px", background: "#e5e7eb", borderRadius: "6px", marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>No Image</div>
              )}
              <h4 style={{ margin: "0 0 6px", color: "#1e3a5f" }}>{product.name}</h4>
              <p style={{ margin: "0 0 6px", color: "#6b7280", fontSize: "0.85rem" }}>{product.description || "No description"}</p>
              <p style={{ margin: "0 0 6px", fontWeight: "700", color: "#2563eb", fontSize: "1.1rem" }}>${product.price?.toFixed(2)}</p>
              <p style={{ margin: "0", fontSize: "0.8rem", color: "#9ca3af" }}>By {product.sellerName || "Unknown"} | {product.category}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
