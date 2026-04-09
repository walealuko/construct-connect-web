import React from "react";
import { Link } from "react-router-dom";
import HeroImg from "../assets/hero-illustration.png";

const Home = () => {
  const stats = [
    { value: "10,000+", label: "Products" },
    { value: "5,000+", label: "Customers" },
    { value: "500+", label: "Sellers" },
    { value: "4.9/5", label: "Rating" },
  ];

  const categories = [
    { name: "Construction Materials", icon: "🏗️", items: "2,500+ products" },
    { name: "Electrical", icon: "⚡", items: "1,200+ products" },
    { name: "Plumbing", icon: "🚿", items: "800+ products" },
    { name: "Tools & Equipment", icon: "🔧", items: "1,500+ products" },
    { name: "Safety Gear", icon: "🦺", items: "400+ products" },
    { name: "Paint & Finishes", icon: "🎨", items: "600+ products" },
  ];

  const featuredProducts = [
    { name: "Premium Cement", price: "$85", original: "$100", badge: "20% OFF" },
    { name: "Industrial Steel", price: "$320", original: "", badge: "Best Seller" },
    { name: "Power Drill Pro", price: "$150", original: "$200", badge: "Hot Deal" },
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: "#1f2937" }}>
      {/* Hero Section */}
      <section style={{
        background: "linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)",
        color: "#fff",
        padding: "100px 40px 80px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
            <img src="/logo.png" alt="Construct Hub" style={{ height: "60px" }} />
          </div>
          <h1 style={{ fontSize: "3.5rem", fontWeight: "800", marginBottom: "20px", lineHeight: "1.2" }}>
            Build Your Vision with<br />
            <span style={{ color: "#f59e0b" }}>Construct Hub</span>
          </h1>
          <p style={{ fontSize: "1.25rem", marginBottom: "40px", opacity: 0.9, maxWidth: "600px", margin: "0 auto 40px" }}>
            Nigeria's leading marketplace for quality construction materials, tools, and professional services.
          </p>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/marketplace">
              <button style={{
                padding: "16px 36px",
                fontSize: "1.1rem",
                backgroundColor: "#f59e0b",
                color: "#1e3a5f",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "700",
              }}>
                Browse Marketplace
              </button>
            </Link>
            <Link to="/signup">
              <button style={{
                padding: "16px 36px",
                fontSize: "1.1rem",
                backgroundColor: "transparent",
                color: "#fff",
                border: "2px solid #fff",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
              }}>
                Create Account
              </button>
            </Link>
          </div>
        </div>
        {/* Stats */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: "60px",
          marginTop: "60px",
          flexWrap: "wrap",
        }}>
          {stats.map((stat) => (
            <div key={stat.label}>
              <div style={{ fontSize: "2.5rem", fontWeight: "800", color: "#f59e0b" }}>{stat.value}</div>
              <div style={{ opacity: 0.8 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories Section */}
      <section style={{ padding: "80px 40px", background: "#f8fafc" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "50px" }}>
            <h2 style={{ fontSize: "2.5rem", fontWeight: "700", color: "#1e3a5f", marginBottom: "12px" }}>
              Shop by Category
            </h2>
            <p style={{ color: "#6b7280", fontSize: "1.1rem" }}>Find exactly what you need for your project</p>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "24px",
          }}>
            {categories.map((cat) => (
              <div key={cat.name} style={{
                background: "#fff",
                padding: "32px 24px",
                borderRadius: "16px",
                textAlign: "center",
                boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.12)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.06)"; }}
              >
                <div style={{ fontSize: "3rem", marginBottom: "16px" }}>{cat.icon}</div>
                <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "#1e3a5f", marginBottom: "6px" }}>{cat.name}</h3>
                <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>{cat.items}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section style={{ padding: "80px 40px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <h2 style={{ fontSize: "2rem", fontWeight: "700", color: "#1e3a5f" }}>Featured Products</h2>
              <p style={{ color: "#6b7280" }}>Top picks for your next project</p>
            </div>
            <Link to="/marketplace" style={{ color: "#2563eb", textDecoration: "none", fontWeight: "600" }}>
              View All →
            </Link>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "30px",
          }}>
            {featuredProducts.map((product) => (
              <div key={product.name} style={{
                background: "#fff",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                border: "1px solid #e5e7eb",
              }}>
                <div style={{
                  height: "180px",
                  background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "4rem",
                }}>
                  🏗️
                </div>
                <div style={{ padding: "20px" }}>
                  <span style={{
                    background: "#dbeafe",
                    color: "#1e40af",
                    padding: "4px 10px",
                    borderRadius: "20px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                  }}>
                    {product.badge}
                  </span>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "600", margin: "12px 0 8px", color: "#1e3a5f" }}>{product.name}</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "1.25rem", fontWeight: "700", color: "#2563eb" }}>{product.price}</span>
                    {product.original && (
                      <span style={{ color: "#9ca3af", textDecoration: "line-through", fontSize: "0.9rem" }}>{product.original}</span>
                    )}
                  </div>
                  <Link to="/marketplace">
                    <button style={{
                      width: "100%",
                      marginTop: "16px",
                      padding: "12px",
                      background: "#1e3a5f",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}>
                      View Product
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        background: "linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)",
        padding: "80px 40px",
        textAlign: "center",
        color: "#fff",
      }}>
        <h2 style={{ fontSize: "2.5rem", fontWeight: "700", marginBottom: "16px" }}>Ready to Start Your Project?</h2>
        <p style={{ fontSize: "1.1rem", opacity: 0.9, marginBottom: "32px", maxWidth: "500px", margin: "0 auto 32px" }}>
          Join thousands of contractors and builders who trust Construct Hub for their materials.
        </p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/signup">
            <button style={{
              padding: "16px 36px",
              fontSize: "1rem",
              backgroundColor: "#f59e0b",
              color: "#1e3a5f",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "700",
            }}>
              Get Started Free
            </button>
          </Link>
          <Link to="/marketplace">
            <button style={{
              padding: "16px 36px",
              fontSize: "1rem",
              backgroundColor: "transparent",
              color: "#fff",
              border: "2px solid rgba(255,255,255,0.3)",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
            }}>
              Browse Products
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "#111827", color: "#9ca3af", padding: "50px 40px 30px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "40px", marginBottom: "40px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <img src="/logo.png" alt="Construct Hub" style={{ height: "35px" }} />
              <span style={{ color: "#fff", fontSize: "1.2rem", fontWeight: "700" }}>Construct Hub</span>
            </div>
            <p style={{ fontSize: "0.9rem", lineHeight: "1.6" }}>Nigeria's leading marketplace for construction materials and services.</p>
          </div>
          <div>
            <h4 style={{ color: "#fff", marginBottom: "16px", fontSize: "1rem" }}>Quick Links</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Link to="/" style={{ color: "#9ca3af", textDecoration: "none", fontSize: "0.9rem" }}>Home</Link>
              <Link to="/marketplace" style={{ color: "#9ca3af", textDecoration: "none", fontSize: "0.9rem" }}>Marketplace</Link>
              <Link to="/signin" style={{ color: "#9ca3af", textDecoration: "none", fontSize: "0.9rem" }}>Sign In</Link>
              <Link to="/signup" style={{ color: "#9ca3af", textDecoration: "none", fontSize: "0.9rem" }}>Register</Link>
            </div>
          </div>
          <div>
            <h4 style={{ color: "#fff", marginBottom: "16px", fontSize: "1rem" }}>Support</h4>
            <p style={{ fontSize: "0.9rem" }}>help@constructhub.com</p>
            <p style={{ fontSize: "0.9rem" }}>+234 800 123 4567</p>
          </div>
        </div>
        <div style={{ textAlign: "center", paddingTop: "20px", borderTop: "1px solid #374151", fontSize: "0.85rem" }}>
          © 2024 Construct Hub. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Home;
