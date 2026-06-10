"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface SellerRatingProps {
  sellerId: string;
  sellerName?: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  reviewer_name: string | null;
  created_at: string;
}

export default function SellerRating({ sellerId }: SellerRatingProps) {
  const [rating, setRating] = useState({ average: 0, count: 0 });
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!sellerId) return;
    loadRatingAndReviews();
  }, [sellerId]);

  const loadRatingAndReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const reviewsData = data as Review[] || [];
      setReviews(reviewsData);

      if (reviewsData.length > 0) {
        const sum = reviewsData.reduce((acc, curr) => acc + curr.rating, 0);
        setRating({
          average: sum / reviewsData.length,
          count: reviewsData.length
        });
      }
    } catch (err) {
      console.error("Failed to load rating and reviews:", err);
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} className="text-lg" style={{ color: star <= Math.round(rating.average) ? "#f59e0b" : "#d1d5db" }}>★</span>
          ))}
        </div>
        <span className="text-sm text-gray-500">
          {rating.average > 0 ? `${rating.average.toFixed(1)} (${rating.count} ${rating.count === 1 ? "review" : "reviews"})` : "No reviews yet"}
        </span>
      </div>

      {reviews.length > 0 && (
        <div className={showAll ? "block" : "hidden"}>
          {showAll ? (
            <div className="space-y-2">
              {reviews.slice(0, 10).map((review) => (
                <div key={review.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-800 text-sm">{review.reviewer_name || 'Unknown'}</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className="text-xs" style={{ color: star <= review.rating ? "#f59e0b" : "#d1d5db" }}>★</span>
                      ))}
                    </div>
                  </div>
                  {review.comment && <p className="text-gray-600 text-xs leading-relaxed">{review.comment}</p>}
                  <p className="text-gray-400 text-[10px] mt-1">{review.created_at ? new Date(review.created_at).toLocaleDateString() : "—"}</p>
                </div>
              ))}
              {reviews.length > 10 && (
                <button
                  onClick={() => setShowAll(false)}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium py-1"
                >
                  Show Less
                </button>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-800 text-sm">{reviews[0].reviewer_name || 'Unknown'}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className="text-xs" style={{ color: star <= reviews[0].rating ? "#f59e0b" : "#d1d5db" }}>★</span>
                  ))}
                </div>
              </div>
              {reviews[0].comment && <p className="text-gray-600 text-xs leading-relaxed">{reviews[0].comment}</p>}
              <p className="text-gray-400 text-[10px] mt-1">{reviews[0].created_at ? new Date(reviews[0].created_at).toLocaleDateString() : "—"}</p>
            </div>
          )}
          {reviews.length > 1 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold py-1"
            >
              Show All {reviews.length} Reviews
            </button>
          )}
        </div>
      )}
    </div>
  );
}
