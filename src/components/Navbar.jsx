import React, { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { UserContext } from "../context/UserContext";

const Navbar = () => {
  const { cart } = useCart();
  const { user, logout } = useContext(UserContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/");
  };

  const getDashboardLink = () => {
    if (!user) return "/";
    switch (user.role) {
      case "seller": return "/seller-dashboard";
      case "admin": return "/admin-dashboard";
      default: return "/buyer-dashboard";
    }
  };

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
        <img src="/logo.png" alt="Construct Hub" style={{ height: "52px" }} />
      </Link>

      {/* Navigation Links */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Link to="/" style={navLink}>Home</Link>
        <Link to="/marketplace" style={navLink}>Marketplace</Link>
        <Link to="/cart" style={{ ...navLink, background: "#1e3a5f", color: "#fff" }}>
          Cart ({totalItems})
        </Link>

        {user ? (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ ...navBtnOutline, display: "flex", alignItems: "center", gap: "8px" }}
            >
              <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>Hi, {user.name || user.email}</span>
              <span style={{ fontSize: "0.7rem" }}>{menuOpen ? "▲" : "▼"}</span>
            </button>

            {menuOpen && (
              <div style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: "4px",
                background: "#fff",
                borderRadius: "8px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                minWidth: "180px",
                overflow: "hidden",
                zIndex: 1001,
              }}>
                <Link
                  to={getDashboardLink()}
                  onClick={() => setMenuOpen(false)}
                  style={{ ...dropdownItem, borderBottom: "1px solid #e5e7eb" }}
                >
                  Dashboard
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  style={{ ...dropdownItem, borderBottom: "1px solid #e5e7eb" }}
                >
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  style={{ ...dropdownItem, background: "none", border: "none", textAlign: "left", cursor: "pointer", color: "#dc2626" }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link to="/signin" style={{ ...navLink, color: "#2563eb", fontWeight: "600" }}>Sign In</Link>
            <Link to="/signup" style={navBtn}>Register</Link>
          </>
        )}
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

const navBtnOutline = {
  color: "#374151",
  textDecoration: "none",
  fontWeight: "500",
  fontSize: "0.9rem",
  padding: "8px 16px",
  borderRadius: "6px",
  border: "1px solid #d1d5db",
  background: "transparent",
  cursor: "pointer",
  marginLeft: "8px",
};

const dropdownItem = {
  display: "block",
  padding: "12px 16px",
  color: "#374151",
  textDecoration: "none",
  fontSize: "0.9rem",
  fontWeight: "500",
};

export default Navbar;
