// src/components/Sidebar.jsx
import React from "react";

export default function Sidebar({ darkMode }) {
  return (
    <aside
      style={{
        width: "240px",
        backgroundColor: darkMode ? "#1f2937" : "#1f2937",
        color: "#fff",
        padding: "30px 20px",
      }}
    >
      <h2 style={{ marginBottom: "40px", fontWeight: "600" }}>
        ConstructConnect
      </h2>

      <nav style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <span style={{ opacity: 0.9 }}>Dashboard</span>
        <span style={{ opacity: 0.7 }}>Orders</span>
        <span style={{ opacity: 0.7 }}>Listings</span>
        <span style={{ opacity: 0.7 }}>Settings</span>
      </nav>
    </aside>
  );
}