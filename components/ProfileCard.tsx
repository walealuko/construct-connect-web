"use client";

import React from "react";
import Link from "next/link";

interface ProfileCardProps {
  item: any;
}

export default function ProfileCard({ item }: ProfileCardProps) {
  if (!item) return null;

  // Handle both Product and Order types
  const isOrder = !!item.status;
  const title = isOrder ? `Order #${item.id?.slice(-6) || 'N/A'}` : item.name;
  const price = item.price || (item.totalAmount || 0);
  const description = isOrder ? `Status: ${item.status}` : item.description;
  const imageUrl = item.imageUrl || "https://via.placeholder.com/150?text=Item";

  return (
    <div style={{
      background: "#fff",
      padding: "16px",
      borderRadius: "12px",
      border: "1px solid #e5e7eb",
      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      maxWidth: "300px",
      transition: "transform 0.2s",
      cursor: "pointer"
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <img
          src={imageUrl}
          alt={title}
          style={{ width: "100%", height: "150px", objectFit: "cover", borderRadius: "8px" }}
        />
        <div>
          <h4 style={{ margin: "0 0 4px", color: "#1e3a5f", fontSize: "1rem", fontWeight: "700" }}>{title}</h4>
          <p style={{ margin: "0 0 8px", color: "#6b7280", fontSize: "0.85rem", lineHeight: "1.4" }}>
            {description}
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: "700", color: "#2563eb", fontSize: "1.1rem" }}>${price?.toFixed(2)}</span>
            <Link
              href={isOrder ? `/orders/${item.id}` : `/product/${item._id || item.id}`}
              style={{ fontSize: "0.85rem", color: "#2563eb", textDecoration: "none", fontWeight: "600" }}
            >
              View Details →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
