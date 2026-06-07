// src/components/ActivityTable.jsx
import React from "react";

export default function ActivityTable() {
  return (
    <div
      style={{
        marginTop: "40px",
        backgroundColor: "#ffffff",
        borderRadius: "10px",
        border: "1px solid #e5e7eb",
        overflow: "hidden",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ backgroundColor: "#f9fafb" }}>
          <tr>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Activity</th>
            <th style={thStyle}>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdStyle}>Feb 21</td>
            <td style={tdStyle}>Order #1024 placed</td>
            <td style={tdStyle}>Completed</td>
          </tr>
          <tr>
            <td style={tdStyle}>Feb 19</td>
            <td style={tdStyle}>Listing updated</td>
            <td style={tdStyle}>Success</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "15px",
  fontSize: "13px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const tdStyle = {
  padding: "15px",
  borderTop: "1px solid #e5e7eb",
  fontSize: "14px",
};