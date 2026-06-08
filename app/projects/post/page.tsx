"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import API from "@/lib/api";

export default function PostProject() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    budget: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      setMessage("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      await API.post("/projects", formData);
      setMessage("Project posted successfully!");
      setTimeout(() => {
        router.push("/marketplace");
      }, 2000);
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Failed to post project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h2 style={styles.title}>Post a New Project</h2>

        {message && (
          <p style={{
            color: message.includes("success") ? "#16a34a" : "#dc2626",
            textAlign: "center",
            fontSize: "0.9rem",
            marginBottom: "12px"
          }}>
            {message}
          </p>
        )}

        <div style={styles.formGroup}>
          <label style={styles.label}>Project Title *</label>
          <input
            type="text"
            placeholder="e.g. Build a 3-bedroom bungalow"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            style={styles.input}
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Description *</label>
          <textarea
            placeholder="Describe the project requirements, materials needed, and timeline..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            style={{ ...styles.input, height: "120px", resize: "vertical" }}
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Budget (Optional)</label>
          <input
            type="number"
            placeholder="Estimated budget in $"
            value={formData.budget}
            onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
            style={styles.input}
          />
        </div>

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? "Posting..." : "Post Project"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    padding: "40px 20px",
    minHeight: "80vh",
  },
  card: {
    display: "flex",
    flexDirection: "column" as "column",
    width: "100%",
    maxWidth: "500px",
    padding: "32px",
    background: "#fff",
    borderRadius: "16px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    border: "1px solid #e5e7eb",
    gap: "20px",
  },
  title: {
    textAlign: "center" as "center",
    fontSize: "1.8rem",
    fontWeight: "700",
    color: "#1e3a5f",
    marginBottom: "8px",
  },
  formGroup: {
    display: "flex" as "flex",
    flexDirection: "column" as "column",
    gap: "6px",
  },
  label: {
    fontSize: "0.9rem",
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    fontSize: "1rem",
    width: "100%",
    boxSizing: "border-box" as "border-box",
  },
  button: {
    padding: "14px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#2563eb",
    color: "#fff",
    fontSize: "1.1rem",
    fontWeight: "700",
    cursor: "pointer",
    marginTop: "10px",
    transition: "background 0.2s",
  },
};
