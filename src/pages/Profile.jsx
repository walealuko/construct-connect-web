// src/pages/Profile.jsx

import React from "react";
import { useParams } from "react-router-dom";

export default function Profile() {
  const { id } = useParams();

  return (
    <div style={{ padding: "2rem" }}>
      <h1>User Profile</h1>
      <p>Viewing profile for user ID: {id}</p>
    </div>
  );
}
