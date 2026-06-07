// src/pages/SignIn.jsx
import React from "react"; // only once at the top
import { useNavigate } from "react-router-dom";

export default function SignIn() {
  const navigate = useNavigate();

  const handleLogin = () => {
    // Example: log in as buyer
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", role: "buyer" })
    );
    navigate("/buyer-dashboard");
  };

  return (
    <div style={{ padding: "50px", textAlign: "center" }}>
      <h1>Sign In</h1>
      <button onClick={handleLogin}>Sign in as Buyer</button>
    </div>
  );
}
