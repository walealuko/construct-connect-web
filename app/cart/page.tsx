"use client";

import React from "react";
import { useCart } from "@/components/CartContext";
import Link from "next/link";

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, clearCart } = useCart();

  const totalPrice = cart.reduce(
    (sum: number, item: any) => sum + item.price * item.quantity,
    0
  );

  if (cart.length === 0) {
    return (
      <div style={{ padding: "4rem", textAlign: "center" }}>
        <h2 style={{ color: "#6b7280" }}>🛒 Your cart is empty</h2>
        <Link href="/marketplace" style={{ color: "#2563eb", textDecoration: "none", fontWeight: "600" }}>
          Go Shopping
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto", fontFamily: "Inter, system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "800", color: "#1e3a5f", marginBottom: "2rem" }}>🛒 Your Cart</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {cart.map((item: any) => (
          <div key={item._id} style={cardStyle}>
            <img src={item.image} alt={item.name} style={imageStyle} />

            <div style={{ flex: 1 }}>
              <h3 style={{ margin: "0 0 4px", color: "#1e3a5f", fontSize: "1.1rem" }}>{item.name}</h3>
              <p style={{ color: "#2563eb", fontWeight: "700", margin: "0 0 12px" }}>${item.price}</p>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <label style={{ fontSize: "0.85rem", color: "#6b7280" }}>Quantity:</label>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateQuantity(item._id, Number(e.target.value))}
                  style={inputStyle}
                />
                <button onClick={() => removeFromCart(item._id)} style={removeBtnStyle}>
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "32px", padding: "24px", background: "#f9fafb", borderRadius: "12px", border: "1px solid #e5e7eb", textAlign: "right" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <span style={{ fontSize: "1.1rem", color: "#6b7280" }}>Total Amount:</span>
          <span style={{ fontSize: "1.8rem", fontWeight: "800", color: "#1e3a5f" }}>${totalPrice.toFixed(2)}</span>
        </div>
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button onClick={clearCart} style={clearBtnStyle}>
            Clear Cart
          </button>
          <Link href="/checkout">
            <button style={checkoutBtnStyle}>
              Proceed to Checkout
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

const cardStyle = {
  display: "flex",
  gap: "20px",
  background: "#fff",
  padding: "16px",
  borderRadius: "12px",
  border: "1px solid #e5e7eb",
  alignItems: "center",
};

const imageStyle = {
  width: "100px",
  height: "100px",
  objectFit: "cover",
  borderRadius: "8px",
};

const inputStyle = {
  width: "60px",
  padding: "4px 8px",
  borderRadius: "4px",
  border: "1px solid #d1d5db",
  fontSize: "0.9rem",
};

const removeBtnStyle = {
  background: "#fee2e2",
  color: "#dc2626",
  border: "none",
  padding: "6px 12px",
  borderRadius: "6px",
  fontSize: "0.8rem",
  fontWeight: "600",
  cursor: "pointer",
};

const clearBtnStyle = {
  background: "#fff",
  color: "#6b7280",
  border: "1px solid #d1d5db",
  padding: "12px 20px",
  borderRadius: "8px",
  fontSize: "0.9rem",
  cursor: "pointer",
};

const checkoutBtnStyle = {
  background: "#2563eb",
  color: "#fff",
  padding: "12px 24px",
  borderRadius: "8px",
  fontSize: "0.9rem",
  fontWeight: "600",
  border: "none",
  cursor: "pointer",
};

export default Cart;
