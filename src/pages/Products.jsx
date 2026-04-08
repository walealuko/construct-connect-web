// src/pages/Products.jsx

import React, { useState, useEffect } from "react";
import ProfileCard from "../components/ProfileCard"; // will create next

// Example placeholder products
const dummyProducts = [
  { id: 1, name: "Cement Bag", category: "Material", sellerId: 101 },
  { id: 2, name: "Electric Welder", category: "Tool", sellerId: 102 },
  { id: 3, name: "Steel Rods", category: "Material", sellerId: 103 },
  { id: 4, name: "Plumbing Service", category: "Service", sellerId: 104 },
];

export default function Products() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Replace this with API fetch later
    setProducts(dummyProducts);
  }, []);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Products</h1>
      <input
        type="text"
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ padding: "0.5rem", width: "100%", marginBottom: "1rem" }}
      />

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))" }}>
        {filteredProducts.map((product) => (
          <ProfileCard key={product.id} userId={product.sellerId} product={product} />
        ))}
      </div>
    </div>
  );
}
