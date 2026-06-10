"use client";

import React from "react";
import { useCart } from "@/components/CartContext";
import Link from "next/link";
import Image from "next/image";
import { CartItem } from "@/types/database";

export default function Cart() {
  const { cart, removeFromCart, updateQuantity, clearCart } = useCart();

  const totalPrice = cart.reduce(
    (sum: number, item: CartItem) => sum + item.price * item.quantity,
    0
  );

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-8">Looks like you haven't added any materials yet.</p>
        <Link
          href="/marketplace"
          className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all active:scale-95"
        >
          Go Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto font-sans">
      <h1 className="text-3xl font-extrabold text-slate-900 mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item: CartItem) => (
            <div
              key={item.id}
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4 items-center hover:shadow-md transition-shadow"
            >
              <div className="relative w-24 h-24 flex-shrink-0">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    fill
                    className="object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center text-2xl">🏗️</div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900 truncate">{item.name}</h3>
                <p className="text-blue-600 font-bold">${item.price?.toFixed(2)}</p>

                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                    <button
                      onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                      className="px-3 py-1 hover:bg-gray-200 transition-colors text-gray-600 font-bold"
                    >
                      -
                    </button>
                    <span className="px-3 py-1 text-sm font-semibold text-slate-700">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="px-3 py-1 hover:bg-gray-200 transition-colors text-gray-600 font-bold"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors uppercase tracking-wider"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="text-right min-w-fit">
                <p className="text-sm text-gray-400">Subtotal</p>
                <p className="text-lg font-black text-slate-900">${(item.price * item.quantity).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit sticky top-24">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Order Summary</h2>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-slate-900 font-medium">${totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Shipping</span>
              <span className="text-green-600 font-medium">Free</span>
            </div>
            <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
              <span className="text-lg font-bold text-slate-900">Total</span>
              <span className="text-2xl font-black text-blue-600">${totalPrice.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={clearCart}
              className="w-full py-3 text-sm font-semibold text-gray-500 hover:text-red-600 transition-colors"
            >
              Clear Cart
            </button>
            <Link href="/checkout">
              <button className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-200">
                Proceed to Checkout
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
