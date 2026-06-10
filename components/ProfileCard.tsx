"use client";

import React from "react";
import Link from "next/link";
import { Product, Order } from "@/types/database";

interface ProfileCardProps {
  item: Product | Order;
}

export default function ProfileCard({ item }: ProfileCardProps) {
  if (!item) return null;

  // Handle both Product and Order types
  const isOrder = 'status' in item;
  const title = isOrder ? `Order #${(item as Order).id?.slice(-6) || 'N/A'}` : (item as Product).name;
  const price = isOrder ? (item as Order).total_price : (item as Product).price;
  const description = isOrder ? `Status: ${(item as Order).status}` : (item as Product).description;
  const imageUrl = (item as any).imageUrl || "https://via.placeholder.com/150?text=Item";

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm max-w-[300px] transition-transform cursor-pointer hover:-translate-y-1">
      <div className="flex flex-col gap-3">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-36 object-cover rounded-lg"
        />
        <div>
          <h4 className="m-0 text-slate-900 text-base font-bold">{title}</h4>
          <p className="m-0 mb-2 text-gray-500 text-sm leading-relaxed">
            {description}
          </p>
          <div className="flex justify-between items-center">
            <span className="font-bold text-blue-600 text-lg">${price?.toFixed(2)}</span>
            <Link
              href={isOrder ? `/orders/${(item as Order).id}` : `/product/${(item as Product).id}`}
              className="text-sm text-blue-600 no-underline font-semibold hover:underline"
            >
              View Details →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
