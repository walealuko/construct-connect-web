import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

const Marketplace = () => {
  const { addToCart, cart } = useCart();

  const products = [
    {
      _id: "1",
      name: "Awesome T-Shirt",
      price: 25,
      image: "/images/tshirt.jpg",
      rating: 4.5,
    },
    {
      _id: "2",
      name: "Stylish Jeans",
      price: 75,
      image: "/images/jeans.jpg",
      rating: 4.0,
    },
  ];

  return (
    <div style={{ padding: "60px", textAlign: "center" }}>
      <h1>Marketplace</h1>

      {products.map((product) => {
        const inCart = cart.some((item) => item._id === product._id);

        return (
          <div key={product._id} style={{ marginBottom: "20px" }}>
            <Link to={`/product/${product._id}`}>
              <img
                src={product.image}
                alt={product.name}
                style={{
                  width: "200px",
                  height: "200px",
                  objectFit: "cover",
                }}
              />
            </Link>

            <h3>{product.name}</h3>
            <p>${product.price}</p>

            {product.rating && (
              <p>
                {"⭐".repeat(Math.round(product.rating))} (
                {product.rating})
              </p>
            )}

            <button
              onClick={() => addToCart(product)}
              disabled={inCart}
              style={{
                padding: "10px",
                backgroundColor: inCart ? "#999" : "#2563eb",
                color: "#fff",
                border: "none",
                cursor: inCart ? "not-allowed" : "pointer",
              }}
            >
              {inCart ? "In Cart" : "Add to Cart"}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default Marketplace;