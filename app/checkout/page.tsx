"use client";

import React from "react";
import { useCart } from "@/components/CartContext";
import Link from "next/link";

export default function Checkout() {
  const { cart } = useCart();

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto", fontFamily: "Inter, system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "800", color: "#1e3a5f", marginBottom: "2rem" }}>Checkout</h1>

      {cart.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", background: "#f9fafb", borderRadius: "12px", border: "1px dashed #d1d5db" }}>
          <p style={{ color: "#6b7280", marginBottom: "16px" }}>Your cart is empty</p>
          <Link href="/marketplace" style={{ color: "#2563eb", fontWeight: "600" }}>
            Go to Marketplace
          </Link>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e5e7eb", padding: "2rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: "700", color: "#374151", marginBottom: "16px" }}>Order Summary</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px 0" }}>
            {cart.map((item: any) => (
              <li key={item._id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ color: "#4b5563" }}>{item.name} x {item.quantity || 1}</span>
                <span style={{ fontWeight: "600", color: "#1e3a5f" }}>${(item.price * (item.quantity || 1)).toFixed(2)}</span>
              </li>
            ))}
          </ul>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "16px", borderTop: "2px solid #e5e7eb" }}>
            <span style={{ fontSize: "1.2rem", fontWeight: "600", color: "#6b7280" }}>Total</span>
            <span style={{ fontSize: "1.8rem", fontWeight: "800", color: "#2563eb" }}>
              ${cart.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0).toFixed(2)}
            </span>
          </div>

          <button
            style={{
              width: "100%",
              marginTop: "32px",
              padding: "16px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              fontSize: "1.1rem",
              fontWeight: "700",
              cursor: "pointer"
            }}
            onClick={() => alert("Payment gateway integration coming soon!")}
          >
            Complete Purchase
          </button>
        </div>
      )}
    </div>
  );
}

