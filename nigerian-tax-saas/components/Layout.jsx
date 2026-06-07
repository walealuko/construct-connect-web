// src/components/Layout.jsx
import React from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout({ children }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f9fafb" }}>
      <Sidebar /> {/* navigation / menu */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Topbar /> {/* top navigation / user menu */}
        <main style={{ flex: 1, padding: "24px 32px" }}>
          {children}
        </main>
      </div>
    </div>
  );
}