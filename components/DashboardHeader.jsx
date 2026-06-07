// src/components/DashboardHeader.jsx
import React from "react";

export default function DashboardHeader({ title, subtitle }) {
  return (
    <div style={{
      marginBottom: "30px",
      display: "flex",
      flexDirection: "column",
      gap: "6px"
    }}>
      <h2 style={{
        fontSize: "28px",
        fontWeight: "700",
        color: "#111827"
      }}>{title}</h2>
      <p style={{
        fontSize: "16px",
        color: "#6b7280"
      }}>{subtitle}</p>
    </div>
  );
}