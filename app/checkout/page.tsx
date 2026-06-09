"use client";

import React, { useState, useContext } from "react";
import { useCart } from "@/components/CartContext";
import { UserContext } from "@/components/UserContext";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function Checkout() {
  const { cart, clearCart } = useCart();
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const totalPrice = cart.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);

  const handlePurchase = async () => {
    if (!user) {
      setMessage("Please sign in to complete your purchase");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // 1. Create Order in Supabase
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          buyer_id: user.id,
          total_amount: totalPrice,
          status: 'pending',
          items: cart.map((item: any) => ({
            product_id: item.id,
            quantity: item.quantity,
            price: item.price
          }))
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. (Optional) Handle Payment via Paystack/Stripe here
      // For now, we'll simulate a successful payment

      // 3. Update Product Stock
      for (const item of cart) {
        const { data: product } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.id)
          .single();

        if (product) {
          await supabase
            .from('products')
            .update({ stock: (product.stock || 0) - item.quantity })
            .eq('id', item.id);
        }
      }

      // 4. Update Order Status
      await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', order.id);

      clearCart();
      setMessage("Purchase completed successfully!");
    } catch (err: any) {
      setMessage(`Error: ${err.message || "Payment failed"}`);
    } finally {
      setLoading(false);
    }
  };

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

          {message && (
            <p style={{
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "16px",
              backgroundColor: message.includes("success") ? "#f0fdf4" : "#fef2f2",
              color: message.includes("success") ? "#16a34a" : "#dc2626",
              textAlign: "center",
              fontWeight: "500"
            }}>
              {message}
            </p>
          )}

          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px 0" }}>
            {cart.map((item: any) => (
              <li key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ color: "#4b5563" }}>{item.name} x {item.quantity || 1}</span>
                <span style={{ fontWeight: "600", color: "#1e3a5f" }}>${(item.price * (item.quantity || 1)).toFixed(2)}</span>
              </li>
            ))}
          </ul>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "16px", borderTop: "2px solid #e5e7eb" }}>
            <span style={{ fontSize: "1.2rem", fontWeight: "600", color: "#6b7280" }}>Total</span>
            <span style={{ fontSize: "1.8rem", fontWeight: "800", color: "#2563eb" }}>
              ${totalPrice.toFixed(2)}
            </span>
          </div>

          <button
            onClick={handlePurchase}
            disabled={loading}
            style={{
              width: "100%",
              marginTop: "32px",
              padding: "16px",
              background: loading ? "#93c5fd" : "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              fontSize: "1.1rem",
              fontWeight: "700",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Processing..." : "Complete Purchase"}
          </button>
        </div>
      )}
    </div>
  );
}
