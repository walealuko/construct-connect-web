// src/pages/SellerDashboard.jsx
import React, { useState } from "react";

export default function SellerDashboard() {
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
  });

  function handleSubmit(e) {
    e.preventDefault();

    const newProduct = {
      id: Date.now(),
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
    };

    setProducts([...products, newProduct]);
    setFormData({ name: "", description: "", price: "" });
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Seller Dashboard</h2>

      <form onSubmit={handleSubmit}>
        <input
          placeholder="Product Name"
          value={formData.name}
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
        />
        <br />

        <input
          placeholder="Description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
        <br />

        <input
          type="number"
          placeholder="Price"
          value={formData.price}
          onChange={(e) =>
            setFormData({ ...formData, price: e.target.value })
          }
        />
        <br />

        <button type="submit">Add Product</button>
      </form>

      <hr />

      <h3>Your Products</h3>
      {products.length === 0 && <p>No products yet.</p>}

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