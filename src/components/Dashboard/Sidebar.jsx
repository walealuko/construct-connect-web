import React from "react";
import "./Dashboard.css";

export default function Sidebar() {
  return (
    <div className="sidebar">
      <h2>ConstructHub</h2>
      <ul>
        <li>Home</li>
        <li>Profiles</li>
        <li>Products</li>
        <li>Orders</li>
        <li>Settings</li>
      </ul>
    </div>
  );
}
