import React from "react";
import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside
      style={{
        width: "220px",
        backgroundColor: "#2C2C3E",
        color: "white",
        minHeight: "100vh",
        padding: "2rem 1rem",
      }}
    >
      <h2 style={{ marginBottom: "2rem" }}>Menu</h2>
      <nav style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <NavLink
          to="/profile"
          style={({ isActive }) => ({
            color: isActive ? "#4CAF50" : "white",
            textDecoration: "none",
          })}
        >
          Profile
        </NavLink>
        <NavLink
          to="/orders"
          style={({ isActive }) => ({
            color: isActive ? "#4CAF50" : "white",
            textDecoration: "none",
          })}
        >
          Orders
        </NavLink>
        <NavLink
          to="/products"
          style={({ isActive }) => ({
            color: isActive ? "#4CAF50" : "white",
            textDecoration: "none",
          })}
        >
          Products
        </NavLink>
      </nav>
    </aside>
  );
}
