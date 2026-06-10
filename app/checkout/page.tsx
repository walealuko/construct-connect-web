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

      const paymentRes = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          amount: totalPrice,
          orderId: order.id,
        }),
      });

      const paymentData = await paymentRes.json();

      if (!paymentRes.ok || !paymentData.url) {
        throw new Error(paymentData.error || "Payment initialization failed");
      }

      window.location.href = paymentData.url;
    } catch (err: any) {
      setMessage(`Error: ${err.message || "Payment failed"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-[800px] mx-auto font-sans">
      <h1 className="text-4xl font-extrabold text-slate-900 mb-8">Checkout</h1>

      {cart.length === 0 ? (
        <div className="text-center p-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
          <p className="text-gray-500 mb-4">Your cart is empty</p>
          <Link href="/marketplace" className="text-blue-600 font-semibold hover:underline">
            Go to Marketplace
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Order Summary</h2>

          {message && (
            <div className={`p-3 rounded-lg mb-4 text-center font-medium text-sm ${
              message.includes("success") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}>
              {message}
            </div>
          )}

          <ul className="divide-y divide-gray-100 mb-6">
            {cart.map((item: any) => (
              <li key={item.id} className="flex justify-between py-3">
                <span className="text-gray-600">{item.name} x {item.quantity || 1}</span>
                <span className="font-semibold text-slate-900">${(item.price * (item.quantity || 1)).toFixed(2)}</span>
              </li>
            ))}
          </ul>

          <div className="flex justify-between items-center pt-4 border-t-2 border-gray-100">
            <span className="text-lg font-medium text-gray-500">Total</span>
            <span className="text-3xl font-black text-blue-600">
              ${totalPrice.toFixed(2)}
            </span>
          </div>

          <button
            onClick={handlePurchase}
            disabled={loading}
            className={`w-full mt-8 py-4 rounded-xl text-white font-bold text-lg transition-all active:scale-95 ${
              loading ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Processing..." : "Complete Purchase"}
          </button>
        </div>
      )}
    </div>
  );
}
