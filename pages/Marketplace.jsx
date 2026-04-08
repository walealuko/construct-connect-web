import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import API from "../api";

const Marketplace = () => {
  const { addToCart, cart } = useCart();

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await API.get("/products");
        setProducts(res.data);
        setFilteredProducts(res.data);
      } catch (err) {
        console.error(err);
        setError("Could not load products.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Search filter
  useEffect(() => {
    const filtered = products.filter((p) =>
      p.name?.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [search, products]);

  const isInCart = (id) => cart.some((item) => item._id === id);

  if (loading) {
    return (
      <div style={center}>
        <h2>Loading products...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={center}>
        <h2 style={{ color: "red" }}>{error}</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px" }}>
      <h1>Marketplace</h1>

      {/* Search */}
      <input
        type="text"
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={searchInput}
      />

      {filteredProducts.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <div style={grid}>
          {filteredProducts.map((product) => (
            <div key={product._id} style={card}>
              <Link
                to={`/product/${product._id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <img
                  src={product.image}
                  alt={product.name}
                  style={image}
                />
                <h3>{product.name}</h3>
              </Link>

              <p style={price}>${product.price}</p>

              {/* Optional rating */}
              {product.rating && (
                <p>
                  {"⭐".repeat(Math.round(product.rating))} (
                  {product.rating.toFixed(1)})
                </p>
              )}

              <button
                onClick={() => addToCart(product)}
                disabled={isInCart(product._id)}
                style={{
                  ...button,
                  backgroundColor: isInCart(product._id)
                    ? "#999"
                    : "#2563eb",
                  cursor: isInCart(product._id)
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {isInCart(product._id) ? "In Cart" : "Add to Cart"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Marketplace;

/* ===== Styles ===== */

const center = {
  padding: "60px",
  textAlign: "center",
};

const searchInput = {
  padding: "10px",
  width: "100%",
  maxWidth: "400px",
  margin: "20px 0",
  borderRadius: "6px",
  border: "1px solid #ccc",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
  gap: "25px",
};

const card = {
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "20px",
  backgroundColor: "#fff",
  boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
};

const image = {
  width: "100%",
  height: "200px",
  objectFit: "cover",
  borderRadius: "8px",
  marginBottom: "10px",
};

const price = {
  fontWeight: "bold",
  fontSize: "18px",
};

const button = {
  width: "100%",
  padding: "10px",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  fontWeight: "600",
};