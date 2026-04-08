// src/components/Navbar.jsx

import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav style={styles.nav}>
      <h2 style={styles.logo}>ConstructHub</h2>
      <div style={styles.links}>
        <Link to="/dashboard" style={styles.link}>Dashboard</Link>
        <Link to="/products" style={styles.link}>Products</Link>
        <Link to="/users" style={styles.link}>Users</Link>
        <Link to="/orders" style={styles.link}>Orders</Link>
        {user && <span style={styles.user}>Hi, {user.username}</span>}
        <button onClick={handleLogout} style={styles.button}>Logout</button>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.5rem 2rem",
    backgroundColor: "#2E86C1",
    color: "#fff",
  },
  logo: { margin: 0 },
  links: { display: "flex", gap: "1rem", alignItems: "center" },
  link: { color: "#fff", textDecoration: "none" },
  button: { padding: "0.25rem 0.5rem", cursor: "pointer" },
  user: { marginLeft: "1rem" },
};
