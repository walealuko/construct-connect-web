import React, { useEffect, useState } from "react";
import Profile from "../components/Profile";
import { fetchUsers } from "../api/users";

export default function BuyerDashboard() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    async function loadUsers() {
      // For buyers, you might want to show all sellers to browse
      const allUsers = await fetchUsers();
      const sellers = allUsers.filter(user => user.role === "Seller");
      setUsers(sellers);
    }
    loadUsers();
  }, []);

  return (
    <div>
      <h2>Buyer Dashboard</h2>
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
