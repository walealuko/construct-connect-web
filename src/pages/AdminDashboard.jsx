import React from "react";
import Profile from "../components/Profile";
import { fetchUsers } from "../api/users";

export default function AdminDashboard() {
  const [users, setUsers] = React.useState([]);

  React.useEffect(() => {
    async function loadUsers() {
      const data = await fetchUsers();
      setUsers(data);
    }
    loadUsers();
  }, []);

  return (
    <div>
      <h2>Admin Dashboard</h2>
      <div className="profile-grid" style={{ display: "flex", flexWrap: "wrap" }}>
        {users.map((user) => (
          <Profile key={user.id} user={user} />
        ))}
      </div>
    </div>
  );
}
