import React, { useState, useContext } from "react";
import { UserContext } from "../context/UserContext";
import API from "../api";

export default function ReviewButton({ sellerId, sellerName }) {
  const { user } = useContext(UserContext);
  const [showModal, setShowModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!user || user.role !== "buyer") return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      await API.post("/reviews", { sellerId, rating, comment });
      setMessage("Review submitted! Thank you.");
      setComment("");
      setRating(5);
      setTimeout(() => {
        setShowModal(false);
        setMessage("");
      }, 1500);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{
          padding: "8px 16px",
          background: "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          fontSize: "0.9rem",
          fontWeight: "600",
          cursor: "pointer",
        }}
      >
        Leave a Review
      </button>

      {showModal && (
        <div style={overlayStyle} onClick={() => setShowModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: "4px", color: "#1e3a5f" }}>Review {sellerName}</h3>
            <p style={{ marginBottom: "16px", color: "#6b7280", fontSize: "0.85rem" }}>Share your experience with this seller</p>

            {message && (
              <p style={{ color: message.includes("submitted") ? "#16a34a" : "#dc2626", marginBottom: "12px", fontWeight: "500", fontSize: "0.9rem" }}>{message}</p>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", color: "#374151", fontSize: "0.9rem" }}>Rating</label>
                <div style={{ display: "flex", gap: "4px" }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "1.8rem",
                        cursor: "pointer",
                        color: star <= rating ? "#f59e0b" : "#d1d5db",
                        padding: "0",
                        lineHeight: "1",
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", color: "#374151", fontSize: "0.9rem" }}>Comment (optional)</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell others about your experience..."
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "0.95rem",
                    resize: "vertical",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: loading ? "#93c5fd" : "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "0.95rem",
                    fontWeight: "600",
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? "Submitting..." : "Submit Review"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: "10px 16px",
                    background: "#fff",
                    color: "#6b7280",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "0.95rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

const overlayStyle = {
  position: "fixed",
  top: 0, left: 0, right: 0, bottom: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 2000,
};

const modalStyle = {
  background: "#fff",
  padding: "28px",
  borderRadius: "14px",
  width: "90%",
  maxWidth: "420px",
  boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
};
