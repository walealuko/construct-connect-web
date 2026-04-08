import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { CartContext } from "../context/CartContext";

function Marketplace() {
  const { addToCart, addToWishlist } = useContext(CartContext);
  const products = [
    { id: "1", name: "Cement Bag", price: 500, image: "https://via.placeholder.com/200" },
    { id: "2", name: "Steel Rods", price: 1200, image: "https://via.placeholder.com/200" },
    { id: "3", name: "Bricks Pack", price: 300, image: "https://via.placeholder.com/200" },
  ];

  return (
    <div style={{ padding: "40px" }}>
      <h2>Marketplace</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "20px", marginTop: "20px" }}>
        {products.map((product) => (
          <div key={product.id} style={{ border: "1px solid #ddd", borderRadius: "10px", padding: "15px", textAlign: "center" }}>
            <Link to={`/product/${product.id}`}>
              <img src={product.image} alt={product.name} style={{ width: "100%", borderRadius: "10px" }} />
              <h3>{product.name}</h3>
            </Link>
            <p>${product.price}</p>
            <button onClick={() => addToCart(product)}>Add to Cart</button>
            <button onClick={() => addToWishlist(product)}>Add to Wishlist</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Marketplace;
