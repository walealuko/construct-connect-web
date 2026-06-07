// src/components/Topbar.jsx
import React, { useState, useContext } from "react";
import { UserContext } from "../context/UserContext";

export default function Topbar({ darkMode, toggleDark }) {
  const { user, logout } = useContext(UserContext);
  const [open, setOpen] = useState(false);
  const firstName = user?.name?.split(" ")[0] || user?.username || "Account";

  return (
    <div
      style={{
        height: "70px",
        backgroundColor: darkMode ? "#1f2937" : "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        padding: "0 40px",
        position: "relative",
      }}
    >
      <button
        onClick={toggleDark}
        style={{
          marginRight: "20px",
          padding: "6px 12px",
          borderRadius: "6px",
          border: "1px solid #d1d5db",
          background: "transparent",
          cursor: "pointer",
        }}
      >
        {darkMode ? "Light Mode" : "Dark Mode"}
      </button>

      <div
        onClick={() => setOpen(!open)}
        style={{
          cursor: "pointer",
          fontWeight: "500",
        }}
      >
        {firstName || "Account"}
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "70px",
            right: "40px",
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "10px",
            width: "150px",
          }}
        >
          <div
            style={{
              padding: "8px",
              cursor: "pointer",
            }}
            onClick={logout}
          >
            Logout
          </div>
        </div>
      )}
    </div>
  );
}