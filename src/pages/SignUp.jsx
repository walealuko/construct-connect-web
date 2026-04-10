import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";

const SignUp = () => {
  const { register } = useContext(UserContext);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("buyer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const success = await register(name, email, password, role);
      setLoading(false);
      if (success) {
        navigate("/");
      } else {
        setError("Registration failed. Email may already be in use.");
      }
    } catch (err) {
      setLoading(false);
      setError("An error occurred. Please try again.");
    }
  };

  return (
    <div style={{
      minHeight: "calc(100vh - 70px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
      padding: "40px 20px",
    }}>
      <div style={{
        background: "#fff",
        padding: "48px",
        borderRadius: "16px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
        width: "100%",
        maxWidth: "420px",
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <img src="/logo.png" alt="Construct Hub" style={{ height: "50px", marginBottom: "16px" }} />
          <h2 style={{ fontSize: "1.8rem", fontWeight: "700", color: "#1e3a5f", marginBottom: "8px" }}>Create Account</h2>
          <p style={{ color: "#6b7280" }}>Join Construct Hub today</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", color: "#374151" }}>Full Name</label>
            <input
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                fontSize: "1rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", color: "#374151" }}>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                fontSize: "1rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", color: "#374151" }}>I am a</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                fontSize: "1rem",
                boxSizing: "border-box",
                background: "#fff",
              }}
            >
              <option value="buyer">Buyer / Client</option>
              <option value="seller">Seller / Artisan</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", color: "#374151" }}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                fontSize: "1rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <p style={{ color: "#dc2626", fontSize: "0.9rem", margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "14px",
              backgroundColor: loading ? "#93c5fd" : "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: "8px",
            }}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "24px", color: "#6b7280" }}>
          Already have an account?{" "}
          <Link to="/signin" style={{ color: "#2563eb", fontWeight: "600", textDecoration: "none" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
