import React from "react";
import { Link } from "react-router-dom";
import HeroImg from "../assets/hero-illustration.png";

const Home = () => {
  const categories = [
    { name: "Construction Materials", icon: "🏗️", desc: "Cement, steel, bricks & more" },
    { name: "Electrical", icon: "⚡", desc: "Wires, panels, switches" },
    { name: "Plumbing", icon: "🚿", desc: "Pipes, fittings, fixtures" },
    { name: "Tools", icon: "🔧", desc: "Power tools, hand tools" },
  ];

  const features = [
    { title: "Quality Guaranteed", desc: "All products verified by professionals" },
    { title: "Fast Delivery", desc: "Get materials delivered to your site" },
    { title: "Secure Payment", desc: "Escrow protection on all orders" },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section style={{
        background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)",
        color: "#fff",
        padding: "80px 20px",
        textAlign: "center",
      }}>
        <img src={HeroImg} alt="Hero" style={{ width: "300px", marginBottom: "30px" }} />
        <h1 style={{ fontSize: "3rem", marginBottom: "15px" }}>Welcome to Construct Hub</h1>
        <p style={{ fontSize: "1.25rem", marginBottom: "30px", opacity: 0.9 }}>
          Your trusted marketplace for construction materials and services
        </p>
        <Link to="/marketplace">
          <button style={{
            padding: "15px 40px",
            fontSize: "1.1rem",
            backgroundColor: "#f59e0b",
            color: "#1e3a5f",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}>
            Browse Marketplace
          </button>
        </Link>
      </section>

      {/* Categories Section */}
      <section style={{ padding: "60px 20px", background: "#f8fafc" }}>
        <h2 style={{ textAlign: "center", marginBottom: "40px", fontSize: "2rem", color: "#1e3a5f" }}>
          Shop by Category
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
          maxWidth: "1000px",
          margin: "0 auto",
        }}>
          {categories.map((cat) => (
            <div key={cat.name} style={{
              background: "#fff",
              padding: "30px",
              borderRadius: "12px",
              textAlign: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              cursor: "pointer",
            }}>
              <div style={{ fontSize: "3rem", marginBottom: "15px" }}>{cat.icon}</div>
              <h3 style={{ marginBottom: "10px", color: "#1e3a5f" }}>{cat.name}</h3>
              <p style={{ color: "#666" }}>{cat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: "60px 20px" }}>
        <h2 style={{ textAlign: "center", marginBottom: "40px", fontSize: "2rem", color: "#1e3a5f" }}>
          Why Choose Construct Hub
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "30px",
          maxWidth: "1000px",
          margin: "0 auto",
        }}>
          {features.map((feat) => (
            <div key={feat.title} style={{ textAlign: "center" }}>
              <h3 style={{ color: "#2563eb", marginBottom: "10px" }}>{feat.title}</h3>
              <p style={{ color: "#666" }}>{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        background: "#1e3a5f",
        color: "#fff",
        padding: "60px 20px",
        textAlign: "center",
      }}>
        <h2 style={{ marginBottom: "20px" }}>Ready to start your project?</h2>
        <Link to="/marketplace">
          <button style={{
            padding: "15px 40px",
            fontSize: "1.1rem",
            backgroundColor: "#f59e0b",
            color: "#1e3a5f",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}>
            Explore Products
          </button>
        </Link>
      </section>
    </div>
  );
};

export default Home;
