"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getArtisans } from "@/lib/services/artisanService";
import SellerRating from "@/components/SellerRating";
import ReviewButton from "@/components/ReviewButton";
import MessageSellerButton from "@/components/MessageSellerButton";
import { Artisan } from "@/types/database";

const ARTISAN_CATEGORIES = [
  "All",
  "Electricians",
  "Plumbers",
  "Carpenters",
  "Masons/Bricklayers",
  "Painters",
  "Tilers",
  "General",
];

export default function Artisans() {
  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    const loadArtisans = async () => {
      try {
        const data = await getArtisans();
        setArtisans(data);
      } catch (err) {
        console.error("Error loading artisans:", err);
      } finally {
        setLoading(false);
      }
    };
    loadArtisans();
  }, []);

  const filteredArtisans = useMemo(() => {
    return artisans.filter((artisan) => {
      const matchesCategory = activeCategory === "All" || artisan.category === activeCategory;
      const matchesSearch =
        artisan.name.toLowerCase().includes(search.toLowerCase()) ||
        artisan.skills.some((skill: string) => skill.toLowerCase().includes(search.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [artisans, search, activeCategory]);

  if (loading) return (
    <div className="p-16 text-center text-gray-500">
      Loading professional artisans...
    </div>
  );

  return (
    <div className="p-8 max-w-[1200px] mx-auto font-sans">
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/buyer-dashboard"
          className="text-gray-500 text-sm inline-flex items-center gap-1 hover:text-blue-600 transition-colors"
        >
          ← Back to Hub
        </Link>
        <div className="text-center flex-1 -ml-10">
          <h1 className="text-4xl font-black text-slate-900 mb-2">
            Artisan Marketplace
          </h1>
          <p className="text-gray-500 text-lg">
            Find and hire verified professional artisans for your construction projects.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6 mb-10">
        <div className="flex justify-center gap-3 flex-wrap">
          {ARTISAN_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all border ${
                activeCategory === cat
                ? "bg-blue-600 border-blue-600 text-white shadow-md"
                : "bg-white border-gray-200 text-gray-500 hover:border-blue-600 hover:text-blue-600"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="max-w-lg mx-auto relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Search by skill (e.g. 'solar', 'tiling')..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-base shadow-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredArtisans.map((artisan) => (
          <div
            key={artisan.id}
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:-translate-y-1 transition-transform duration-200 flex flex-col"
          >
            <div className="h-48 bg-gray-100 relative">
              <img
                src={artisan.image}
                alt={artisan.name}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/300x200?text=Artisan"; }}
              />
              <div className="absolute top-3 right-3 bg-white px-3 py-1 rounded-lg text-xs font-bold text-blue-600 shadow-sm">
                {artisan.rate}
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold text-slate-900 m-0">{artisan.name}</h3>
                <span className="text-[10px] px-2 py-1 bg-blue-50 text-blue-600 rounded-md font-bold uppercase tracking-wider">
                  {artisan.category}
                </span>
              </div>

              <p className="text-sm text-gray-500 mb-4 line-clamp-2 leading-relaxed">
                {artisan.bio}
              </p>

              <div className="mb-6">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Specialized Skills</p>
                <div className="flex flex-wrap gap-2">
                  {artisan.skills.map((skill: string) => (
                    <span key={skill} className="text-[10px] px-2 py-1 bg-gray-50 text-gray-600 rounded-md border border-gray-100 font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-gray-50 flex flex-col gap-3">
                <SellerRating sellerId={artisan.id} sellerName={artisan.name} />
                <ReviewButton sellerId={artisan.id} sellerName={artisan.name} />
                <MessageSellerButton sellerId={artisan.id} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredArtisans.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <p className="text-xl font-medium mb-2">No artisans found matching your search.</p>
          <p>Try adjusting your filters or searching for a different skill.</p>
        </div>
      )}
    </div>
  );
}

