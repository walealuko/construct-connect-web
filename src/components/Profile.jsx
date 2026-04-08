// src/components/ProfileCard.jsx
import React from "react";

export default function ProfileCard({ user, onClick }) {
  return (
    <div
      className="border rounded-lg p-4 shadow cursor-pointer hover:shadow-lg transition"
      onClick={() => onClick(user)}
    >
      <img
        src={user.profileImage || "https://via.placeholder.com/150"}
        alt={user.name}
        className="w-24 h-24 rounded-full mx-auto"
      />
      <h3 className="text-center text-lg font-semibold mt-2">{user.name}</h3>
      <p className="text-center text-sm text-gray-500">{user.email}</p>
      <p className="text-center text-sm text-gray-400">{user.role}</p>
    </div>
  );
}
