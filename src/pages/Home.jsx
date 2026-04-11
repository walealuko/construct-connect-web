import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api";

const CATEGORIES = [
  { name: "Cement", icon: "🏗️", color: "#1e3a5f" },
  { name: "Bricks", icon: "🧱", color: "#b91c1c" },
  { name: "Timber", icon: "🪵", color: "#15803d" },
  { name: "Tools", icon: "🔧", color: "#ca8a04" },
  { name: "Electrical", icon: "⚡", color: "#f59e0b" },
  { name: "Plumbing", icon: "🚿", color: "#0284c7" },
  { name: "Paint", icon: "🎨", color: "#7c3aed" },
  { name: "Roofing", icon: "🏠", color: "#475569" },
];

const STEPS = [
  { num: "01", title: "Create an Account", desc: "Sign up as a buyer or seller in seconds." },
  { num: "02", title: "Browse or List Products", desc: "Sellers list materials; buyers browse and compare." },
  { num: "03", title: "Order & Connect", desc: "Buyers order directly; chat with verified sellers." },
];

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentProducts();
  }, []);

  const loadRecentProducts = async () => {
    try {
      const res = await API.get("/products");
      setProducts(res.data.slice(0, 6));
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: "#1f2937" }}>
      {/* Hero */}
      <section style={{
        background: "linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)",
        color: "#fff",
        padding: "80px 40px 60px",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "2.8rem", fontWeight: "800", marginBottom: "16px", lineHeight: "1.2" }}>
            Your Marketplace for<br />
            <span style={{ color: "#f59e0b" }}>Construction Materials</span>
          </h1>
          <p style={{ fontSize: "1.1rem", marginBottom: "32px", opacity: 0.9, maxWidth: "540px", margin: "0 auto 32px" }}>
            Connect with verified sellers, browse quality materials, and manage your construction projects in one place.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/marketplace">
              <button style={btnPrimary}>Browse Marketplace</button>
            </Link>
            <Link to="/signup">
              <button style={btnOutline}>Start Selling</button>
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section style={{ padding: "50px 40px", background: "#f8fafc" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <h2 style={{ fontSize: "1.6rem", fontWeight: "700", color: "#1e3a5f" }}>Browse by Category</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "12px" }}>
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.name}
                to={`/marketplace?category=${cat.name.toLowerCase()}`}
                style={{ textDecoration: "none" }}
              >
                <div style={{
                  background: "#fff",
                  padding: "20px 12px",
                  borderRadius: "12px",
                  textAlign: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  transition: "transform 0.15s, box-shadow 0.15s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "8px" }}>{cat.icon}</div>
                  <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#374151" }}>{cat.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Products */}
      <section style={{ padding: "50px 40px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
            <h2 style={{ fontSize: "1.6rem", fontWeight: "700", color: "#1e3a5f" }}>Recent Listings</h2>
            <Link to="/marketplace" style={{ color: "#2563eb", textDecoration: "none", fontWeight: "600", fontSize: "0.9rem" }}>
              View All →
            </Link>
          </div>

          {loading ? (
            <p style={{ color: "#6b7280", textAlign: "center", padding: "2rem" }}>Loading...</p>
          ) : products.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2.5rem", background: "#f9fafb", borderRadius: "12px" }}>
              <p style={{ fontSize: "1.5rem", margin: "0 0 8px" }}>🏗️</p>
              <p style={{ color: "#6b7280", margin: 0 }}>No products listed yet. <Link to="/signup" style={{ color: "#2563eb" }}>Be the first to sell!</Link></p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px" }}>
              {products.map((product) => (
                <div key={product._id} style={{ background: "#fff", padding: "14px", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "6px", marginBottom: "10px" }} />
                  ) : (
                    <div style={{ width: "100%", height: "120px", background: "#e5e7eb", borderRadius: "6px", marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>🏗️</div>
                  )}
                  <h4 style={{ margin: "0 0 4px", color: "#1e3a5f", fontSize: "0.95rem", fontWeight: "600" }}>{product.name}</h4>
                  <p style={{ margin: "0 0 4px", fontSize: "0.8rem", color: "#9ca3af" }}>{product.sellerName}</p>
                  <p style={{ margin: "0", fontWeight: "700", color: "#2563eb", fontSize: "1rem" }}>${product.price?.toFixed(2)}</p>
                  <Link to="/marketplace">
                    <button style={{ width: "100%", marginTop: "10px", padding: "8px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}>
                      View Product
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section style={{ padding: "50px 40px", background: "#f8fafc" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "36px" }}>
            <h2 style={{ fontSize: "1.6rem", fontWeight: "700", color: "#1e3a5f" }}>How It Works</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "24px" }}>
            {STEPS.map((step) => (
              <div key={step.num} style={{ textAlign: "center", padding: "24px 16px" }}>
                <div style={{ fontSize: "2rem", fontWeight: "800", color: "#2563eb", marginBottom: "12px" }}>{step.num}</div>
                <h4 style={{ margin: "0 0 8px", color: "#1e3a5f", fontSize: "1rem", fontWeight: "700" }}>{step.title}</h4>
                <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "#111827", color: "#9ca3af", padding: "32px 40px 24px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img src="/logo.png" alt="Construct Hub" style={{ height: "30px" }} />
            <span style={{ color: "#fff", fontWeight: "700" }}>Construct Hub</span>
          </div>
          <div style={{ display: "flex", gap: "24px" }}>
            <Link to="/" style={{ color: "#9ca3af", textDecoration: "none", fontSize: "0.9rem" }}>Home</Link>
            <Link to="/marketplace" style={{ color: "#9ca3af", textDecoration: "none", fontSize: "0.9rem" }}>Marketplace</Link>
            <Link to="/signup" style={{ color: "#9ca3af", textDecoration: "none", fontSize: "0.9rem" }}>Register</Link>
          </div>
          <p style={{ margin: 0, fontSize: "0.85rem" }}>© {new Date().getFullYear()} Construct Hub</p>
        </div>
      </footer>
    </div>
  );
};

const btnPrimary = {
  padding: "13px 28px",
  fontSize: "1rem",
  backgroundColor: "#f59e0b",
  color: "#1e3a5f",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "700",
  textDecoration: "none",
};

const btnOutline = {
  padding: "13px 28px",
  fontSize: "1rem",
  backgroundColor: "transparent",
  color: "#fff",
  border: "2px solid rgba(255,255,255,0.4)",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
  textDecoration: "none",
};

export default Home;
