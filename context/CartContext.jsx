import React, { createContext, useContext, useState, useEffect } from "react";

// Create context
const CartContext = createContext();

// Custom hook to use cart
export const useCart = () => useContext(CartContext);

// Provider component
export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) setCart(JSON.parse(savedCart));
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  // Add item to cart
  const addToCart = (product) => {
    if (!cart.find((item) => item._id === product._id)) {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  // Remove item from cart
  const removeFromCart = (id) => {
    setCart(cart.filter((item) => item._id !== id));
  };

  // Update quantity
  const updateQuantity = (id, quantity) => {
    setCart(
      cart.map((item) =>
        item._id === id ? { ...item, quantity } : item
      )
    );
  };

  // Clear cart
  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
};