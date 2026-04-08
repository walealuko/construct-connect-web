import React from "react";
import { useCart } from "../context/CartContext";

const Cart = () => {
  const { cart, removeFromCart, clearCart } = useCart();

  const total = cart.reduce(
    (sum, item) => sum + item.price * (item.quantity || 1),
    0
  );

  if (cart.length === 0) {
    return (
      <div style={container}>
        <h2>Your Cart</h2>
        <p>No items in cart.</p>
      </div>
    );
  }

  return (
    <div style={container}>
      <h2>Your Cart</h2>

      {cart.map((item) => (
        <div key={item._id} style={itemCard}>
          <img
            src={item.image}
            alt={item.name}
            style={image}
          />

          <div style={{ flex: 1 }}>
            <h3>{item.name}</h3>
            <p>${item.price}</p>
          </div>

          <button
            onClick={() => removeFromCart(item._id)}
            style={removeBtn}
          >
            Remove
          </button>
        </div>
      ))}

      <h3 style={{ marginTop: "20px" }}>
        Total: ${total.toFixed(2)}
      </h3>

      <button onClick={clearCart} style={clearBtn}>
        Clear Cart
      </button>
    </div>
  );
};

export default Cart;

/* ===== Styles ===== */
const container = {
  padding: "30px",
};

const itemCard = {
  display: "flex",
  alignItems: "center",
  gap: "20px",
  borderBottom: "1px solid #ddd",
  padding: "15px 0",
};

const image = {
  width: "80px",
  height: "80px",
  objectFit: "cover",
  borderRadius: "6px",
};

const removeBtn = {
  padding: "8px 12px",
  backgroundColor: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};

const clearBtn = {
  marginTop: "15px",
  padding: "10px 15px",
  backgroundColor: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};