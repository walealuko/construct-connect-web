"use client";

import React, { useEffect, useState } from "react";
import API from "@/lib/api";
import { getUserActivities } from "@/lib/services/activityService";

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await API.get("/users/profile");
        setUser(res.data);
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };

    const fetchActivities = async () => {
      try {
        const data = await getUserActivities("current-user");
        setActivities(data);
      } catch (err) {
        console.error("Error fetching activities:", err);
      } finally {
        setLoadingActivities(false);
      }
    };

    fetchProfile();
    fetchActivities();
  }, []);

  if (!user) return <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Loading profile...</div>;

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", padding: "2rem", marginBottom: "2rem", border: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "24px" }}>
          <div style={{ width: "80px", height: "80px", background: "#2563eb", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "2rem", fontWeight: "700" }}>
            {user.name?.charAt(0) || "U"}
          </div>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "800", color: "#1e3a5f", margin: 0 }}>{user.name}</h1>
            <p style={{ color: "#6b7280", margin: "4px 0 0" }}>{user.email}</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", borderTop: "1px solid #f3f4f6", paddingTop: "20px" }}>
          <div>
            <p style={{ fontSize: "0.75rem", color: "#9ca3af", textTransform: "uppercase", fontWeight: "600", marginBottom: "4px" }}>Member Since</p>
            <p style={{ fontWeight: "500", color: "#374151" }}>January 2024</p>
          </div>
          <div>
            <p style={{ fontSize: "0.75rem", color: "#9ca3af", textTransform: "uppercase", fontWeight: "600", marginBottom: "4px" }}>Account Type</p>
            <p style={{ fontWeight: "500", color: "#374151" }}>Buyer / Client</p>
          </div>
          <div>
            <p style={{ fontSize: "0.75rem", color: "#9ca3af", textTransform: "uppercase", fontWeight: "600", marginBottom: "4px" }}>Orders Placed</p>
            <p style={{ fontWeight: "500", color: "#374151" }}>12 Items</p>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#1e3a5f", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "8px" }}>
        🕒 Activity History
      </h2>

      {loadingActivities ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>Loading activities...</div>
      ) : activities.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", background: "#f9fafb", borderRadius: "12px", border: "1px dashed #d1d5db" }}>
          <p style={{ color: "#9ca3af" }}>No recent activities found.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {activities.map((act: any) => (
            <div
              key={act.id}
              style={{
                background: "#fff",
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                transition: "transform 0.2s, boxShadow 0.2s",
                cursor: "default"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateX(4px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateX(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{
                width: "44px",
                height: "44px",
                background: "#eff6ff",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem"
              }}>
                {act.icon}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: "600", color: "#1e3a5f", fontSize: "0.95rem" }}>{act.description}</p>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#9ca3af" }}>
                  {new Date(act.date).toLocaleDateString()} • {act.status}
                </p>
              </div>
              <div style={{
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "0.7rem",
                fontWeight: "700",
                textTransform: "uppercase",
                background: act.status === "Success" || act.status === "Completed" ? "#dcfce7" : "#f3f4f6",
                color: act.status === "Success" || act.status === "Completed" ? "#16a34a" : "#6b7280"
              }}>
                {act.status}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

