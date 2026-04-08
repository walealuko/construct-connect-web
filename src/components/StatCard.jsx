// src/components/StatCard.jsx
import React from "react";

export default function StatCard({ title, value }) {
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "10px",
        padding: "30px",
        border: "1px solid #e5e7eb",
      }}
    >
      <p
        style={{
          fontSize: "13px",
          color: "#6b7280",
          marginBottom: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {title}
      </p>

      <h2
        style={{
          fontSize: "28px",
          fontWeight: "600",
          color: "#111827",
        }}
      >
        {value}
      </h2>
    </div>
  );
}