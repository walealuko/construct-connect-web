// src/pages/Home.jsx

import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Welcome to ConstructHub!</h1>
      <p>Your one-stop platform for products, users, and projects.</p>
      <div style={{ marginTop: "20px" }}>
        <Link to="/login" style={{ marginRight: "10px" }}>Login</Link>
        <Link to="/signup">Sign Up</Link>
      </div>
    </div>
  );
}
