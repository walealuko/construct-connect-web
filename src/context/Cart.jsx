import React, { useContext } from "react";
import { CartContext } from "../context/CartContext";

export default function Cart() {
  const { cart, removeFromCart, clearCart } = useContext(CartContext);

  if (cart.length === 0) return <div style={{ padding: "40px" }}>Your cart is empty.</div>;

  return (
    <div style={{ padding: "40px" }}>
      <h2>Your Cart</h2>
      {cart.map((item) => (
        <div key={item.id} style={{ marginBottom: "10px" }}>
          {item.name} — ₦{item.price}
          <button onClick={() => removeFromCart(item.id)} style={{ marginLeft: "10px" }}>Remove</button>
        </div>
      ))}
      <button onClick={clearCart} style={{ marginTop: "20px" }}>Clear Cart</button>
    </div>
  );
}
