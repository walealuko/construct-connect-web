"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getArtisans } from "@/lib/services/artisanService";
import SellerRating from "@/components/SellerRating";
import ReviewButton from "@/components/ReviewButton";
import MessageSellerButton from "@/components/MessageSellerButton";

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
  const [artisans, setArtisans] = useState<any[]>([]);
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
    <div style={{ padding: "4rem", textAlign: "center", color: "#6b7280" }}>
      Loading professional artisans...
    </div>
  );

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ marginBottom: "32px", textAlign: "center" }}>
        <h1 style={{ fontSize: "2.2rem", fontWeight: "800", color: "#1e3a5f", marginBottom: "8px" }}>
          Artisan Marketplace
        </h1>
        <p style={{ color: "#6b7280", fontSize: "1.1rem" }}>
          Find and hire verified professional artisans for your construction projects.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginBottom: "40px" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
          {ARTISAN_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: "10px 20px",
                borderRadius: "20px",
                fontSize: "0.9rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s",
                border: "1px solid",
                borderColor: activeCategory === cat ? "#2563eb" : "#d1d5db",
                background: activeCategory === cat ? "#2563eb" : "#fff",
                color: activeCategory === cat ? "#fff" : "#6b7280",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div style={{ maxWidth: "500px", margin: "0 auto", position: "relative" }}>
          <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>🔍</span>
          <input
            type="text"
            placeholder="Search by skill (e.g. 'solar', 'tiling')..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "14px 14px 14px 44px",
              borderRadius: "12px",
              border: "1px solid #d1d5db",
              fontSize: "1rem",
              boxSizing: "border-box",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              outline: "none"
            }}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px" }}>
        {filteredArtisans.map((artisan) => (
          <div
            key={artisan.id}
            style={{
              background: "#fff",
              borderRadius: "16px",
              border: "1px solid #e5e7eb",
              overflow: "hidden",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              display: "flex",
              flexDirection: "column",
              transition: "transform 0.2s",
              cursor: "default"
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            <div style={{ height: "200px", background: "#f3f4f6", position: "relative" }}>
              <img
                src={artisan.image}
                alt={artisan.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/300x200?text=Artisan"; }}
              />
              <div style={{ position: "absolute", top: "12px", right: "12px", background: "#fff", padding: "4px 10px", borderRadius: "8px", fontSize: "0.8rem", fontWeight: "700", color: "#2563eb", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                {artisan.rate}
              </div>
            </div>

            <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "700", color: "#1e3a5f", margin: 0 }}>{artisan.name}</h3>
                <span style={{ fontSize: "0.75rem", padding: "4px 8px", background: "#eff6ff", color: "#2563eb", borderRadius: "6px", fontWeight: "600" }}>
                  {artisan.category}
                </span>
              </div>

              <p style={{ fontSize: "0.9rem", color: "#6b7280", marginBottom: "16px", lineHeight: "1.5" }}>
                {artisan.bio}
              </p>

              <div style={{ marginBottom: "20px" }}>
                <p style={{ fontSize: "0.8rem", fontWeight: "600", color: "#9ca3af", textTransform: "uppercase", marginBottom: "8px" }}>Specialized Skills</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {artisan.skills.map((skill: string) => (
                    <span key={skill} style={{ fontSize: "0.75rem", padding: "4px 8px", background: "#f3f4f6", color: "#4b5563", borderRadius: "4px", border: "1px solid #e5e7eb" }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: "auto", paddingTop: "20px", borderTop: "1px solid #f3f4f6", display: "flex", flexDirection: "column", gap: "12px" }}>
                <SellerRating sellerId={artisan.id} sellerName={artisan.name} />
                <ReviewButton sellerId={artisan.id} sellerName={artisan.name} />
                <MessageSellerButton sellerId={artisan.id} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredArtisans.length === 0 && (
        <div style={{ textAlign: "center", padding: "4rem", color: "#6b7280" }}>
          <p style={{ fontSize: "1.2rem" }}>No artisans found matching your search.</p>
          <p>Try adjusting your filters or searching for a different skill.</p>
        </div>
      )}
    </div>
  );
}

