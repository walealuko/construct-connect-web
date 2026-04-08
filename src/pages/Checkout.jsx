import React from "react";
import { useCart } from "../context/CartContext"; // use hook

function Checkout() {
  const { cart } = useCart(); // replaced

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Checkout</h2>
      {cart.length === 0 ? (
        <p>Your cart is empty</p>
      ) : (
        <ul>
          {cart.map((item) => (
            <li key={item._id}>
              {item.name} - ${item.price} x {item.quantity || 1}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Checkout;
