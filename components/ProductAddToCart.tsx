"use client";

import React, { useState } from "react";
import { Product } from "@/types/database";
import { useCart } from "@/components/CartContext";

interface ProductAddToCartProps {
  product: Product;
}

export default function ProductAddToCart({ product }: ProductAddToCartProps) {
  const { addToCart, cart } = useCart();
  const [added, setAdded] = useState(false);
  const inCart = cart.some((item) => item.id === product.id);

  const handleAddToCart = () => {
    addToCart(product);
    setAdded(true);
  };

  return (
    <div className="flex gap-3 flex-wrap">
      {product.stock > 0 ? (
        <button
          onClick={handleAddToCart}
          disabled={added || inCart}
          className={`px-8 py-3.5 text-base font-bold rounded-xl transition-all ${
            added || inCart
              ? "bg-green-600 text-white cursor-default"
              : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
          }`}
        >
          {added || inCart ? "✓ Added to Cart" : "Add to Cart"}
        </button>
      ) : (
        <button
          disabled
          className="px-8 py-3.5 text-base font-bold bg-gray-200 text-gray-500 rounded-xl cursor-not-allowed"
        >
          Out of Stock
        </button>
      )}
    </div>
  );
}
