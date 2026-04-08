// src/pages/BuyerDashboard.jsx
import React, { useState } from "react";

export default function BuyerDashboard() {
  const [products] = useState([
    { id: 1, name: "Cement", description: "Strong cement", price: 20 },
    { id: 2, name: "Bricks", description: "Red bricks", price: 5 },
  ]);

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Buyer Dashboard</h2>

      {products.map((product) => (
        <div key={product.id}>
          <strong>{product.name}</strong>
          <p>{product.description}</p>
          <p>${product.price}</p>
        </div>
      ))}
    </div>
  );
}