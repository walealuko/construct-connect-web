import React, { useContext } from "react";
import { CartContext } from "../context/CartContext";

export default function Wishlist() {
  const { wishlist, removeFromWishlist } = useContext(CartContext);

  if (wishlist.length === 0) return <div style={{ padding: "40px" }}>Your wishlist is empty.</div>;

  return (
    <div style={{ padding: "40px" }}>
      <h2>Your Wishlist</h2>
      {wishlist.map((item) => (
        <div key={item.id} style={{ marginBottom: "10px" }}>
          {item.name} — ₦{item.price}
          <button onClick={() => removeFromWishlist(item.id)} style={{ marginLeft: "10px" }}>Remove</button>
        </div>
      ))}
    </div>
  );
}
