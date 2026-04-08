// src/components/ProfileCard.jsx

import React from "react";
import { useNavigate } from "react-router-dom";

export default function ProfileCard({ userId, product }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/profile/${userId}`);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        border: "1px solid #ccc",
        padding: "1rem",
        borderRadius: "8px",
        cursor: "pointer",
      }}
    >
      <h3>{product.name}</h3>
      <p>Category: {product.category}</p>
      <small>Seller ID: {userId}</small>
    </div>
  );
}
