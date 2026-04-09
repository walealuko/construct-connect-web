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
        padding: "15px 30px",
        background: "#111",
        color: "#fff",
      }}
    >
      <div>
        <Link to="/" style={link}>Home</Link>
        <Link to="/marketplace" style={link}>Marketplace</Link>
      </div>

      <div>
        <Link to="/cart" style={link}>
          🛒 Cart ({totalItems})
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