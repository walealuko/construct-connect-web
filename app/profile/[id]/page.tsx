"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function PublicProfile() {
  const params = useParams();
  const id = params.id;
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPublicProfile = async () => {
      try {
        const { data, error: supabaseError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();

        if (supabaseError) throw supabaseError;
        setUser(data);
      } catch (err: any) {
        console.error("Error fetching public profile:", err);
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPublicProfile();
    }
  }, [id]);

  if (loading) return (
    <div style={{ textAlign: "center", padding: "4rem", color: "#6b7280" }}>
      Loading profile...
    </div>
  );

  if (error) return (
    <div style={{ textAlign: "center", padding: "4rem" }}>
      <p style={{ color: "#dc2626", fontSize: "1.2rem", marginBottom: "16px" }}>{error}</p>
      <Link href="/marketplace" style={{ color: "#2563eb", fontWeight: "600" }}>
        Back to Marketplace
      </Link>
    </div>
  );

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      <Link href="/marketplace" style={{ color: "#6b7280", textDecoration: "none", fontSize: "0.9rem", display: "inline-flex", alignItems: "center", gap: "4px", marginBottom: "24px" }}>
        ← Back to Marketplace
      </Link>

      <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e5e7eb", padding: "40px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "32px" }}>
          <div style={{ width: "100px", height: "100px", background: "#e5e7eb", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem" }}>
            👤
          </div>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: "800", color: "#1e3a5f", margin: 0 }}>
              {`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User'}
            </h1>
            <p style={{ color: "#6b7280", fontSize: "1.1rem", margin: "4px 0 0" }}>
              {user.tier === "business" ? "Verified Seller" : "Member"}
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          <div style={{ background: "#f9fafb", padding: "20px", borderRadius: "12px", border: "1px solid #f3f4f6" }}>
            <h3 style={{ fontSize: "0.9rem", color: "#9ca3af", textTransform: "uppercase", fontWeight: "700", marginBottom: "8px" }}>About</h3>
            <p style={{ color: "#374151", lineHeight: "1.6", margin: 0 }}>
              {user.bio || "No bio provided."}
            </p>
          </div>

          <div style={{ background: "#f9fafb", padding: "20px", borderRadius: "12px", border: "1px solid #f3f4f6" }}>
            <h3 style={{ fontSize: "0.9rem", color: "#9ca3af", textTransform: "uppercase", fontWeight: "700", marginBottom: "8px" }}>Details</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <p style={{ margin: 0, color: "#374151" }}>
                <strong style={{ color: "#6b7280" }}>Business:</strong> {user.business_name || "N/A"}
              </p>
              <p style={{ margin: 0, color: "#374151" }}>
                <strong style={{ color: "#6b7280" }}>Location:</strong> {user.location || "Not specified"}
              </p>
              <p style={{ margin: 0, color: "#374151" }}>
                <strong style={{ color: "#6b7280" }}>Joined:</strong> {user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
