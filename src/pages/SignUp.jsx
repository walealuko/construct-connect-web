import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";

function SignUp() {
  const { register } = useContext(UserContext);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const success = await register(name, email, password);
      if (success) {
        alert("Sign-up successful!");
        navigate("/");
      } else {
        setError("Sign-up failed");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Sign-up failed");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "2rem auto", padding: "2rem", border: "1px solid #ccc", borderRadius: "10px" }}>
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <label>
          Name:
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ width: "100%", padding: "0.5rem", borderRadius: "5px" }}
          />
        </label>

        <label>
          Email:
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: "0.5rem", borderRadius: "5px" }}
          />
        </label>

        <label>
          Password:
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: "0.5rem", borderRadius: "5px" }}
          />
        </label>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button type="submit" style={{ padding: "0.75rem", borderRadius: "5px", backgroundColor: "#1E1E2F", color: "white", cursor: "pointer" }}>
          Sign Up
        </button>
      </form>
    </div>
  );
}

export default SignUp;
