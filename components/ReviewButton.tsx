"use client";

import React, { useState, useContext } from "react";
import { UserContext } from "./UserContext";
import { submitReviewAction } from "@/app/actions/reviews";

interface ReviewButtonProps {
  sellerId: string;
  sellerName: string;
}

export default function ReviewButton({ sellerId, sellerName }: ReviewButtonProps) {
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const [showModal, setShowModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!user || user.role !== "buyer") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const result = await submitReviewAction({
        sellerId,
        rating,
        comment,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      setMessage("Review submitted! Thank you.");
      setComment("");
      setRating(5);
      setTimeout(() => {
        setShowModal(false);
        setMessage("");
      }, 1500);
    } catch (err: any) {
      setMessage(err.message || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors active:scale-95"
      >
        Leave a Review
      </button>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white p-7 rounded-2xl w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-slate-900 mb-1">Review {sellerName}</h3>
            <p className="text-gray-500 text-sm mb-4">Share your experience with this seller</p>

            {message && (
              <p className={`mb-3 font-medium text-sm ${message.includes("submitted") ? "text-green-600" : "text-red-600"}`}>
                {message}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-3xl leading-none cursor-pointer transition-colors ${
                        star <= rating ? "text-amber-500" : "text-gray-300"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Comment (optional)</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell others about your experience..."
                  rows={3}
                  className="w-full p-3 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed active:scale-95"
                >
                  {loading ? "Submitting..." : "Submit Review"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-white text-gray-600 border border-gray-300 font-medium rounded-lg hover:bg-gray-50 transition-colors active:scale-95"
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
