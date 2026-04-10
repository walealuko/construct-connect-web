import React, { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";

const SignUp = () => {
  const { register, user } = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("buyer");
  const [businessName, setBusinessName] = useState("");
  const [cacRegNo, setCacRegNo] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (role === "seller" && (!businessName || !location)) {
      setError("Business name and location are required for sellers");
      return;
    }

    setLoading(true);
    try {
      const success = await register(name, email, password, role, { businessName, cacRegNo, location, phone });
      setLoading(false);
      if (success) {
        if (role === "seller") {
          navigate("/seller-dashboard");
        } else {
          navigate("/marketplace");
        }
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
        maxWidth: "480px",
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <img src="/logo.png" alt="Construct Hub" style={{ height: "50px", marginBottom: "16px" }} />
          <h2 style={{ fontSize: "1.8rem", fontWeight: "700", color: "#1e3a5f", marginBottom: "8px" }}>Create Account</h2>
          <p style={{ color: "#6b7280" }}>Join Construct Hub today</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151", fontSize: "0.9rem" }}>Full Name *</label>
            <input type="text" placeholder="John Doe" value={name}
              onChange={(e) => setName(e.target.value)} required style={inputStyle} />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151", fontSize: "0.9rem" }}>Email *</label>
            <input type="email" placeholder="you@example.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151", fontSize: "0.9rem" }}>I am a *</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
              <option value="buyer">Buyer / Client</option>
              <option value="seller">Seller / Artisan</option>
            </select>
          </div>

          {role === "seller" && (
            <>
              <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "16px", marginTop: "4px" }}>
                <h4 style={{ color: "#1e3a5f", marginBottom: "12px", fontSize: "0.95rem" }}>Business Information</h4>

                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151", fontSize: "0.85rem" }}>Business Name *</label>
                  <input type="text" placeholder="ABC Construction Ltd" value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)} required style={inputStyle} />
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151", fontSize: "0.85rem" }}>CAC Registration No.</label>
                  <input type="text" placeholder="e.g. RC-123456" value={cacRegNo}
                    onChange={(e) => setCacRegNo(e.target.value)} style={inputStyle} />
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151", fontSize: "0.85rem" }}>Location / Address *</label>
                  <input type="text" placeholder="e.g. Lagos, Nigeria" value={location}
                    onChange={(e) => setLocation(e.target.value)} required={role === "seller"} style={inputStyle} />
                </div>

                <div style={{ marginBottom: "4px" }}>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151", fontSize: "0.85rem" }}>Phone Number</label>
                  <input type="tel" placeholder="e.g. +2348012345678" value={phone}
                    onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
                </div>
              </div>
            </>
          )}

          <div style={{ marginTop: "4px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151", fontSize: "0.9rem" }}>Password *</label>
            <input type="password" placeholder="Min. 6 characters" value={password}
              onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
          </div>

          {error && (
            <p style={{ color: "#dc2626", fontSize: "0.85rem", margin: 0 }}>{error}</p>
          )}

          <button type="submit" disabled={loading} style={{
            padding: "14px",
            backgroundColor: loading ? "#93c5fd" : "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "1rem",
            fontWeight: "600",
            cursor: loading ? "not-allowed" : "pointer",
            marginTop: "4px",
          }}>
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

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "0.95rem",
  boxSizing: "border-box",
};

export default SignUp;
