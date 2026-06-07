import React, { useState, useEffect } from "react";
import API from "../api";

export default function SellerRating({ sellerId, sellerName }) {
  const [rating, setRating] = useState({ average: 0, count: 0 });
  const [reviews, setReviews] = useState([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!sellerId) return;
    loadRating();
    loadReviews();
  }, [sellerId]);

  const loadRating = async () => {
    try {
      const res = await API.get(`/reviews/seller/${sellerId}/rating`);
      setRating(res.data);
    } catch (err) {
      console.error("Failed to load rating:", err);
    }
  };

  const loadReviews = async () => {
    try {
      const res = await API.get(`/reviews/seller/${sellerId}`);
      setReviews(res.data);
    } catch (err) {
      console.error("Failed to load reviews:", err);
    }
  };

  return (
    <div style={{ marginTop: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <div style={{ display: "flex", gap: "2px" }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} style={{ fontSize: "1.1rem", color: star <= Math.round(rating.average) ? "#f59e0b" : "#d1d5db" }}>★</span>
          ))}
        </div>
        <span style={{ fontSize: "0.9rem", color: "#6b7280" }}>
          {rating.average > 0 ? `${rating.average} (${rating.count} ${rating.count === 1 ? "review" : "reviews"})` : "No reviews yet"}
        </span>
      </div>

      {reviews.length > 0 && (
        <div>
          {showAll ? (
            <>
              {reviews.slice(0, 10).map((review) => (
                <div key={review._id} style={{ background: "#f9fafb", padding: "12px", borderRadius: "8px", marginBottom: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontWeight: "600", color: "#374151", fontSize: "0.9rem" }}>{review.reviewerName}</span>
                    <div style={{ display: "flex", gap: "1px" }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} style={{ fontSize: "0.85rem", color: star <= review.rating ? "#f59e0b" : "#d1d5db" }}>★</span>
                      ))}
                    </div>
                  </div>
                  {review.comment && <p style={{ margin: 0, color: "#6b7280", fontSize: "0.85rem" }}>{review.comment}</p>}
                  <p style={{ margin: "4px 0 0", color: "#9ca3af", fontSize: "0.75rem" }}>{new Date(review.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
              {reviews.length > 10 && (
                <button onClick={() => setShowAll(false)} style={showLessBtn}>Show Less</button>
              )}
            </>
          ) : (
            <div style={{ background: "#f9fafb", padding: "12px", borderRadius: "8px", marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontWeight: "600", color: "#374151", fontSize: "0.9rem" }}>{reviews[0].reviewerName}</span>
                <div style={{ display: "flex", gap: "1px" }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} style={{ fontSize: "0.85rem", color: star <= reviews[0].rating ? "#f59e0b" : "#d1d5db" }}>★</span>
                  ))}
                </div>
              </div>
              {reviews[0].comment && <p style={{ margin: 0, color: "#6b7280", fontSize: "0.85rem" }}>{reviews[0].comment}</p>}
              <p style={{ margin: "4px 0 0", color: "#9ca3af", fontSize: "0.75rem" }}>{new Date(reviews[0].createdAt).toLocaleDateString()}</p>
            </div>
          )}
          {reviews.length > 1 && !showAll && (
            <button onClick={() => setShowAll(true)} style={showAllBtn}>Show All {reviews.length} Reviews</button>
          )}
        </div>
      )}
    </div>
  );
}

const showAllBtn = {
  background: "none",
  border: "none",
  color: "#2563eb",
  fontSize: "0.85rem",
  fontWeight: "600",
  cursor: "pointer",
  padding: "4px 0",
};

const showLessBtn = {
  background: "none",
  border: "none",
  color: "#6b7280",
  fontSize: "0.85rem",
  cursor: "pointer",
  padding: "4px 0",
};
