import React from "react";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div style={{ textAlign: "center", padding: "100px" }}>
      <h1>Welcome to Construct Connect</h1>
      <p>Your marketplace for construction materials</p>

      <Link to="/marketplace">
        <button
          style={{
            padding: "12px 20px",
            backgroundColor: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Go to Marketplace
        </button>
      </Link>
    </div>
  );
};

export default Home;