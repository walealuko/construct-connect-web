import React from "react";
import { Link } from "react-router-dom";
import heroImage from "../assets/hero-illustration.png"; // make sure this exists
import logo from "../assets/logo.svg";

export default function Home() {
  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      {/* Hero Section */}
      <section style={heroSection}>
        <div style={heroContent}>
          <h1>Welcome to ConstructHub</h1>
          <p>Your one-stop solution to buy, sell, and track construction materials.</p>
          <div style={{ marginTop: 20 }}>
            <Link to="/marketplace" style={heroButton}>Marketplace</Link>
            <Link to="/signin" style={{ ...heroButton, marginLeft: 15 }}>Sign In</Link>
            <Link to="/register" style={{ ...heroButton, marginLeft: 15 }}>Register</Link>
          </div>
        </div>
        <img src={heroImage} alt="Happy Seller & Buyer" style={heroImg} />
      </section>

      {/* Features Section */}
      <section style={featuresSection}>
        <h2 style={{ textAlign: "center", marginBottom: 40 }}>What You Can Do</h2>
        <div style={featuresGrid}>
          <div style={featureCard}>
            <img src="https://img.icons8.com/color/96/000000/shopping-cart--v2.png" alt="Marketplace" />
            <h3>Buy Construction Materials</h3>
            <p>Browse, compare, and purchase the best materials directly from trusted sellers.</p>
            <Link to="/marketplace" style={featureLink}>Go to Marketplace</Link>
          </div>

          <div style={featureCard}>
            <img src="https://img.icons8.com/color/96/000000/sell.png" alt="Sell Products" />
            <h3>Sell Your Products</h3>
            <p>List your products and reach hundreds of buyers with an easy-to-use dashboard.</p>
            <Link to="/register" style={featureLink}>Start Selling</Link>
          </div>

          <div style={featureCard}>
            <img src="https://img.icons8.com/color/96/000000/task.png" alt="Track Orders" />
            <h3>Track Orders & Dashboard</h3>
            <p>Monitor your orders, sales, and deliveries all in one convenient place.</p>
            <Link to="/dashboard" style={featureLink}>Go to Dashboard</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ===== React-compliant styles ===== */
const heroSection = {
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "50px 10%",
  backgroundColor: "#f9fafb",
  flexWrap: "wrap",
};

const heroContent = {
  maxWidth: 500,
};

const heroButton = {
  display: "inline-block",
  padding: "12px 30px",
  backgroundColor: "#2563eb",
  color: "#fff",
  borderRadius: 5,
  textDecoration: "none",
  fontWeight: "bold",
  transition: "background-color 0.2s ease",
};

const heroImg = {
  maxWidth: 400,
  marginTop: 20,
};

const featuresSection = {
  padding: "60px 10%",
  backgroundColor: "#ffffff",
};

const featuresGrid = {
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
  flexWrap: "wrap",
};

const featureCard = {
  flex: "1 1 300px",
  padding: 30,
  backgroundColor: "#f3f4f6",
  borderRadius: 10,
  textAlign: "center",
  boxShadow: "0 4px 8px rgba(0,0,0,0.05)",
};

const featureLink = {
  display: "inline-block",
  marginTop: 15,
  padding: "8px 20px",
  backgroundColor: "#2563eb",
  color: "#fff",
  borderRadius: 5,
  textDecoration: "none",
};