import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useCart } from "../context/CartContext";
import API from "../api";

export default function ProductDetail() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);

  useEffect(() => {
    API.get(`/products/${id}`)
      .then(res => setProduct(res.data))
      .catch(err => console.error(err));
  }, [id]);

  if (!product) return <h2 style={{ padding: "40px" }}>Loading...</h2>;

  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "auto" }}>
      <img src={product.image} alt={product.name} width="100%" />
      <h1>{product.name}</h1>
      <h3>${product.price}</h3>
      <p>{product.description}</p>

      <button
        onClick={() => addToCart(product)}
        style={{
          padding: "12px 30px",
          background: "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer"
        }}
      >
        Add to Cart
      </button>
    </div>
  );
}