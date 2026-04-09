import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

const Navbar = () => {
  const { cart } = useCart();

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "0 40px",
      height: "70px",
      background: "#ffffff",
      boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
      position: "sticky",
      top: 0,
      zIndex: 1000,
    }}>
      {/* Logo */}
      <Link to="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
        <img src="/logo.png" alt="Construct Hub" style={{ height: "45px" }} />
        <span style={{ fontSize: "1.4rem", fontWeight: "700", color: "#1e3a5f" }}>Construct Hub</span>
      </Link>

      {/* Navigation Links */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Link to="/" style={navLink}>Home</Link>
        <Link to="/marketplace" style={navLink}>Marketplace</Link>
        <Link to="/cart" style={{ ...navLink, background: "#1e3a5f" }}>
          Cart ({totalItems})
        </Link>
        <Link to="/signin" style={{ ...navLink, color: "#2563eb", fontWeight: "600" }}>Sign In</Link>
        <Link to="/signup" style={{ ...navBtn }}>Register</Link>
      </div>
    </nav>
  );
};

const navLink = {
  color: "#374151",
  textDecoration: "none",
  fontWeight: "500",
  fontSize: "0.95rem",
  padding: "8px 16px",
  borderRadius: "6px",
  transition: "all 0.2s",
};

const navBtn = {
  color: "#fff",
  textDecoration: "none",
  fontWeight: "600",
  fontSize: "0.95rem",
  padding: "10px 20px",
  borderRadius: "6px",
  background: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
  marginLeft: "8px",
};

export default Navbar;
