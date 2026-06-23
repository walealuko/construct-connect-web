"use client";

import React from "react";
import Link from "next/link";
import type { SellerRatingSummary } from "@/lib/seller-ratings";

interface SellerChipProps {
  sellerId: string;
  sellerName: string;
  sellerLocation?: string | null;
  rating?: SellerRatingSummary;
}

/**
 * Compact "Sold by X · ★4.5 (12) · View profile" bar that sits
 * above a cart row. Pure presentation — the cart page passes the
 * already-fetched rating summary so we don't make one query per
 * row. When `rating` is undefined (seller not yet loaded, or the
 * fetch failed open), we render a neutral "View profile" link
 * with no rating instead of crashing.
 */
export default function SellerChip({
  sellerId,
  sellerName,
  sellerLocation,
  rating,
}: SellerChipProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap text-xs">
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-semibold">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-3 h-3"
          aria-hidden="true"
        >
          <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6h13M9 21a1 1 0 100-2 1 1 0 000 2zm9 0a1 1 0 100-2 1 1 0 000 2z" />
        </svg>
        <span className="text-gray-500 font-medium">Sold by</span>
        <span className="font-bold truncate max-w-[160px]">{sellerName || "Unknown seller"}</span>
      </span>

      {sellerLocation && (
        <span className="inline-flex items-center gap-1 text-gray-500">
          <span aria-hidden="true">📍</span>
          <span className="truncate max-w-[160px]">{sellerLocation}</span>
        </span>
      )}

      {rating && rating.count > 0 ? (
        <span className="inline-flex items-center gap-1 text-gray-600">
          <span className="text-amber-500" aria-hidden="true">★</span>
          <span className="font-semibold">{rating.average.toFixed(1)}</span>
          <span className="text-gray-400">({rating.count})</span>
        </span>
      ) : (
        <span className="text-gray-400">No reviews yet</span>
      )}

      <Link
        href={`/profile/${sellerId}`}
        className="ml-auto text-blue-600 font-semibold hover:text-blue-700 hover:underline transition-colors"
      >
        View profile →
      </Link>
    </div>
  );
}
