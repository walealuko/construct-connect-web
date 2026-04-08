import React, { useEffect, useState } from "react";
import Profile from "../components/Profile";
import { fetchUsers } from "../api/users";

export default function SellerDashboard() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    async function loadUsers() {
      // For seller dashboard, you may only want to show the seller's own profile
      const allUsers = await fetchUsers();
      const sellerUsers = allUsers.filter(user => user.role === "Seller");
      setUsers(sellerUsers);
    }
    loadUsers();
  }, []);

  return (
    <div>
      <h2>Seller Dashboard</h2>
      <div
        className="profile-grid"
        style={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}
      >
        {users.map(user => (
          <Profile key={user.id} user={user} />
        ))}
      </div>
    </div>
  );
}
