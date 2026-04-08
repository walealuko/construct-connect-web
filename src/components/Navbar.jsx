import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { UserContext } from "../context/UserContext";

const Navbar = () => {
  const { cart } = useCart();
  const { user, logout } = useContext(UserContext);

  return (
    <nav style={nav}>
      <h2>ConstructHub</h2>

      <div style={links}>
        <Link to="/">Home</Link>
        <Link to="/marketplace">Marketplace</Link>
        <Link to="/cart">Cart ({cart.length})</Link>

        {user ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <button onClick={logout} style={button}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/signin">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

/* ===== Styles ===== */
const nav = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "15px 30px",
  backgroundColor: "#2563eb",
  color: "#fff",
};

const links = {
  display: "flex",
  gap: "20px",
  alignItems: "center",
};

const button = {
  padding: "6px 12px",
  backgroundColor: "#fff",
  color: "#2563eb",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};