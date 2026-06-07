// src/components/ProfileCard.jsx
import React from "react";

export default function ProfileCard({ item }) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "1rem",
        width: "220px",
        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
      }}
    >
      {item.imageURL && (
        <img
          src={item.imageURL}
          alt={item.name}
          style={{ width: "100%", borderRadius: "8px" }}
        />
      )}

      {item.name && <h3 style={{ margin: "0.5rem 0" }}>{item.name}</h3>}
      {item.price && <p>Price: ₦{item.price}</p>}
      {item.amount && <p>Amount: ₦{item.amount}</p>}
      {item.description && <p>{item.description}</p>}
      {item.status && <p>Status: {item.status}</p>}
    </div>
  );
}
