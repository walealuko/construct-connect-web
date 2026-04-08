import React from "react";
import { useParams } from "react-router-dom";

function ProductDetail() {
  const { id } = useParams();

  // Mock data for demo
  const product = {
    id,
    name: "Sample Product",
    price: 999,
    image: "https://via.placeholder.com/400",
    description: "Detailed description of this product."
  };

  return (
    <div className="container">
      <h2>{product.name}</h2>
      <img src={product.image} alt={product.name} style={{ maxWidth: "400px", marginBottom: "15px" }} />
      <p>{product.description}</p>
      <p><strong>Price: </strong>${product.price}</p>
      <button>Add to Cart</button>
      <button style={{ marginLeft: "10px" }}>Add to Wishlist</button>
    </div>
  );
}

export default ProductDetail;
