// src/components/Dashboard/DashboardLayout.jsx

import { Link } from "react-router-dom";

export default function DashboardLayout({ users }) {
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Dashboard</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: "1rem",
          marginTop: "1rem",
        }}
      >
        {users.length === 0 && <p>No users available.</p>}

        {users.map((user) => (
          <Link
            key={user.id}
            to={`/profile/${user.id}`}
            style={{
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              style={{
                border: "1px solid #ccc",
                borderRadius: "8px",
                padding: "1rem",
                transition: "box-shadow 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
            >
              <h2>{user.name}</h2>
              <p>{user.email}</p>
              {/* Add more summary fields if you want */}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
