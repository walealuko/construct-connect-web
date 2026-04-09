import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

const Navbar = () => {
  const { cart } = useCart();

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "15px 30px",
        background: "#1e3a5f",
        color: "#fff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <img src="/logo.png" alt="Construct Hub" style={{ height: "40px" }} />
        <span style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Construct Hub</span>
      </div>

      <div>
        <Link to="/" style={link}>Home</Link>
        <Link to="/marketplace" style={link}>Marketplace</Link>
        <Link to="/cart" style={{ ...link, background: "#2563eb", padding: "8px 16px", borderRadius: "6px" }}>
          Cart ({totalItems})
        </Link>
      </div>
    </nav>
  );
};

const link = {
  color: "#fff",
  marginRight: "15px",
  textDecoration: "none",
  fontWeight: "bold",
};

export default Navbar;
