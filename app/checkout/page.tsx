"use client";

import React, { useState, useContext } from "react";
import { useCart } from "@/components/CartContext";
import { UserContext } from "@/components/UserContext";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { CartItem } from "@/types/database";
import { verifyStockAction } from "@/app/actions/products";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function Checkout() {
  const { cart, clearCart } = useCart();
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const totalPrice = cart.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0);

  const handlePurchase = async () => {
    if (!user) {
      setMessage("Please sign in to complete your purchase");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // 1. Server-side stock validation
      const stockCheck = await verifyStockAction(
        cart.map((item: CartItem) => ({
          productId: item.id,
          quantity: item.quantity || 1,
        }))
      );

      if (!stockCheck.success) {
        throw new Error(stockCheck.error);
      }

      // 2. Create Pending Order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          buyer_id: user.id,
          total_price: totalPrice,
          status: 'pending',
          items: cart.map((item: CartItem) => ({
            product_id: item.id,
            quantity: item.quantity,
            price: item.price
          }))
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 3. Initialize Payment
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
    <div className="p-8 max-w-[800px] mx-auto space-y-8">
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/buyer-dashboard"
          className="text-gray-500 text-sm inline-flex items-center gap-1 hover:text-blue-600 transition-colors"
        >
          ← Back to Hub
        </Link>
        <div className="flex-1 text-right">
          <h1 className="text-4xl font-black text-slate-900 inline-block">Checkout</h1>
          <p className="text-gray-500 font-medium text-right">Review your order and complete the payment.</p>
        </div>
      </div>

      {cart.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2">
          <div className="py-8 space-y-4">
            <div className="text-4xl">🛒</div>
            <p className="text-gray-500 font-medium">Your cart is empty</p>
            <Button asChild variant="primary">
              <Link href="/marketplace">Go to Marketplace</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-800">Order Summary</h2>
          </CardHeader>
          <CardContent className="space-y-6">
            {message && (
              <div className={`p-3 rounded-lg text-center font-medium text-sm ${
                message.includes("success") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              }`}>
                {message}
              </div>
            )}

            <ul className="divide-y divide-gray-100">
              {cart.map((item: CartItem) => (
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

            <Button
              onClick={handlePurchase}
              disabled={loading}
              isLoading={loading}
              className="w-full py-6 text-lg"
            >
              Complete Purchase
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
