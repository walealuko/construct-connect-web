import React from "react";
import { useCart } from "../context/CartContext";

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, clearCart } = useCart();

  const totalPrice = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (cart.length === 0) {
    return <h2 style={{ textAlign: "center" }}>🛒 Cart is empty</h2>;
  }

  return (
    <div style={{ padding: "40px" }}>
      <h1>🛒 Your Cart</h1>

      {cart.map((item) => (
        <div key={item._id} style={card}>
          <img src={item.image} alt={item.name} style={image} />

          <div>
            <h3>{item.name}</h3>
            <p>${item.price}</p>

            <input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) =>
                updateQuantity(item._id, Number(e.target.value))
              }
              style={{ width: "60px" }}
            />

            <button onClick={() => removeFromCart(item._id)} style={removeBtn}>
              Remove
            </button>
          </div>
        </div>
      ))}

      <h2>Total: ${totalPrice.toFixed(2)}</h2>

      <button onClick={clearCart} style={clearBtn}>
        Clear Cart
      </button>
    </div>
  );
};

const card = {
  display: "flex",
  gap: "20px",
  marginBottom: "20px",
  borderBottom: "1px solid #ccc",
  paddingBottom: "10px",
};

const image = {
  width: "100px",
  height: "100px",
  objectFit: "cover",
};

const removeBtn = {
  marginLeft: "10px",
  background: "red",
  color: "#fff",
  border: "none",
  padding: "5px",
};

const clearBtn = {
  background: "#000",
  color: "#fff",
  padding: "10px",
  border: "none",
};

export default Cart;