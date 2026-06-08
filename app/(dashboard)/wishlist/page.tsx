"use client";

import React from "react";
import { useCart } from "@/components/CartContext";
import Link from "next/link";

export default function Wishlist() {
  // Wishlist is currently a stub. In a real app, this would be a separate context or DB collection.
  const wishlistItems: any[] = [];

  return (
    <div style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "800", color: "#1e3a5f", marginBottom: "2rem" }}>❤️ My Wishlist</h1>

      {wishlistItems.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", background: "#f9fafb", borderRadius: "16px", border: "1px dashed #d1d5db" }}>
          <p style={{ color: "#6b7280", fontSize: "1.1rem", marginBottom: "24px" }}>Your wishlist is empty.</p>
          <Link href="/marketplace" style={{ color: "#2563eb", fontWeight: "600", textDecoration: "none", background: "#eff6ff", padding: "12px 24px", borderRadius: "8px" }}>
            Explore Marketplace
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "20px" }}>
          {wishlistItems.map((item: any) => (
            <div key={item.id} style={{ background: "#fff", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb" }}>
              <h4 style={{ margin: "0 0 8px", color: "#1e3a5f" }}>{item.name}</h4>
              <p style={{ fontWeight: "700", color: "#2563eb", margin: "0 0 16px" }}>${item.price}</p>
              <Link href="/cart" style={{ textAlign: "center", display: "block", padding: "8px", background: "#1e3a5f", color: "#fff", textDecoration: "none", borderRadius: "6px", fontSize: "0.85rem", fontWeight: "600" }}>
                Add to Cart
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
