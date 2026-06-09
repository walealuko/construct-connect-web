"use client";

import React from "react";

export default function ProductSkeleton() {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 animate-pulse">
      <div className="w-full h-36 bg-gray-200 rounded-lg mb-3" />
      <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-3" />
      <div className="flex items-center gap-2">
        <div className="h-5 bg-gray-200 rounded-full w-16" />
        <div className="h-8 bg-gray-200 rounded-lg w-24 ml-auto" />
      </div>
    </div>
  );
}
