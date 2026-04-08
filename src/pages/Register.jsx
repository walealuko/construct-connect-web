import React, { useState, useContext } from "react";
import { UserContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const { register } = useContext(UserContext);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) return alert("Fill all fields!");

    const success = await register(name, email, password);
    if (success) {
      alert("Registered successfully!");
      navigate("/");
    } else {
      alert("Registration failed");
    }
  };

  return (
    <div style={container}>
      <h2>Register</h2>
      <form style={form} onSubmit={handleSubmit}>
        <input type="text" placeholder="Name" style={input} value={name} onChange={(e) => setName(e.target.value)} />
        <input type="email" placeholder="Email" style={input} value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" style={input} value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" style={btn}>Register</button>
      </form>
    </div>
  );
};

export default Register;

const container = { maxWidth: 400, margin: "50px auto", padding: 20, border: "1px solid #ccc", borderRadius: 8, boxShadow: "0 4px 8px rgba(0,0,0,0.05)", textAlign: "center" };
const form = { display: "flex", flexDirection: "column", gap: 15 };
const input = { padding: 10, borderRadius: 5, border: "1px solid #ccc", fontSize: 16 };
const btn = { padding: "10px 20px", backgroundColor: "#16a34a", color: "#fff", border: "none", borderRadius: 5, cursor: "pointer" };