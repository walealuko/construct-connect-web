import React, { useState, useEffect, useContext } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import API from "../api";
import { useCart } from "../context/CartContext";
import { UserContext } from "../context/UserContext";
import SellerRating from "../components/SellerRating";
import ReviewButton from "../components/ReviewButton";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, cart } = useCart();
  const { user } = useContext(UserContext);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const res = await API.get(`/products/${id}`);
      setProduct(res.data);
    } catch (err) {
      setError("Failed to load product.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    addToCart(product);
    setAdded(true);
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: "4rem", color: "#6b7280" }}>
      Loading product...
    </div>
  );

  if (error) return (
    <div style={{ textAlign: "center", padding: "4rem" }}>
      <p style={{ color: "#dc2626", fontSize: "1.2rem" }}>{error}</p>
      <Link to="/marketplace" style={{ color: "#2563eb" }}>Back to Marketplace</Link>
    </div>
  );

  return (
    <div style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
      <Link to="/marketplace" style={{ color: "#6b7280", textDecoration: "none", fontSize: "0.9rem", display: "inline-flex", alignItems: "center", gap: "4px", marginBottom: "24px" }}>
        ← Back to Marketplace
      </Link>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", alignItems: "start" }}>
        {/* Left: Image */}
        <div>
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              style={{ width: "100%", maxHeight: "420px", objectFit: "cover", borderRadius: "14px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
            />
          ) : (
            <div style={{ width: "100%", height: "360px", background: "#e5e7eb", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "4rem" }}>
              🏗️
            </div>
          )}

          {/* Seller Info Card */}
          <div style={{ marginTop: "20px", background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.08)" }}>
            <p style={{ fontSize: "0.8rem", color: "#9ca3af", marginBottom: "8px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.05em" }}>Sold By</p>
            <p style={{ fontSize: "1.1rem", fontWeight: "700", color: "#1e3a5f", marginBottom: "4px" }}>{product.sellerName || "Unknown Seller"}</p>
            {product.sellerLocation && (
              <p style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "12px" }}>📍 {product.sellerLocation}</p>
            )}
            <SellerRating sellerId={product.sellerId} sellerName={product.sellerName} />
            <div style={{ marginTop: "10px" }}>
              <ReviewButton sellerId={product.sellerId} sellerName={product.sellerName} />
            </div>
          </div>
        </div>

        {/* Right: Details */}
        <div>
          <span style={{ background: "#eff6ff", color: "#2563eb", fontSize: "0.75rem", padding: "4px 12px", borderRadius: "20px", fontWeight: "600", textTransform: "capitalize" }}>
            {product.category}
          </span>
          <h1 style={{ fontSize: "2rem", fontWeight: "800", color: "#1e3a5f", margin: "12px 0 8px", lineHeight: "1.2" }}>{product.name}</h1>
          <p style={{ fontSize: "2.2rem", fontWeight: "800", color: "#2563eb", marginBottom: "16px" }}>${product.price?.toFixed(2)}</p>

          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
            <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>
              Stock: <strong style={{ color: product.stock > 0 ? "#16a34a" : "#dc2626" }}>{product.stock > 0 ? `${product.stock} available` : "Out of stock"}</strong>
            </span>
          </div>

          <p style={{ fontSize: "1rem", color: "#4b5563", lineHeight: "1.7", marginBottom: "28px" }}>
            {product.description || "No description provided for this product."}
          </p>

          {/* Actions */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {product.stock > 0 ? (
              <button
                onClick={handleAddToCart}
                disabled={added}
                style={{
                  padding: "14px 32px",
                  fontSize: "1rem",
                  fontWeight: "700",
                  background: added ? "#16a34a" : "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  cursor: added ? "default" : "pointer",
                }}
              >
                {added ? "✓ Added to Cart" : "Add to Cart"}
              </button>
            ) : (
              <button disabled style={{ padding: "14px 32px", fontSize: "1rem", fontWeight: "700", background: "#d1d5db", color: "#6b7280", border: "none", borderRadius: "10px", cursor: "not-allowed" }}>
                Out of Stock
              </button>
            )}

            {user?.role === "seller" && (
              <Link to="/seller-dashboard">
                <button style={{ padding: "14px 24px", fontSize: "1rem", fontWeight: "600", background: "#fff", color: "#1e3a5f", border: "2px solid #1e3a5f", borderRadius: "10px", cursor: "pointer" }}>
                  Manage Products
                </button>
              </Link>
            )}
          </div>

          {/* Meta info */}
          <div style={{ marginTop: "28px", padding: "16px", background: "#f9fafb", borderRadius: "10px" }}>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>📦 Ships from: {product.sellerLocation || "Seller's location"}</span>
              <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>🏷️ Category: <span style={{ textTransform: "capitalize" }}>{product.category}</span></span>
              <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>🕐 Listed: {new Date(product.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
