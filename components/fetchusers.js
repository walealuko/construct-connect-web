import { useEffect, useState } from "react";
import API from "../api";

function Users() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    API.get("/users")
      .then(res => setUsers(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      {users.map(user => (
        <p key={user._id}>{user.name}</p>
      ))}
    </div>
  );
}

export default Users;