import React, { useState, useContext } from "react";
import { UserContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";

const SignIn = () => {
  const { login } = useContext(UserContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return alert("Fill all fields!");

    const success = await login(email, password);
    if (success) {
      alert("Logged in successfully!");
      navigate("/");
    } else {
      alert("Invalid credentials");
    }
  };

  return (
    <div style={container}>
      <h2>Sign In</h2>
      <form style={form} onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" style={input} value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" style={input} value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" style={btn}>Sign In</button>
      </form>
    </div>
  );
};

export default SignIn;

const container = { maxWidth: 400, margin: "50px auto", padding: 20, border: "1px solid #ccc", borderRadius: 8, boxShadow: "0 4px 8px rgba(0,0,0,0.05)", textAlign: "center" };
const form = { display: "flex", flexDirection: "column", gap: 15 };
const input = { padding: 10, borderRadius: 5, border: "1px solid #ccc", fontSize: 16 };
const btn = { padding: "10px 20px", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: 5, cursor: "pointer" };