import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../api";

const PublicProfile = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchPublicProfile = async () => {
      try {
        const res = await API.get(`/users/${id}`);
        setUser(res.data);
      } catch (err) {
        console.error("Error fetching public profile:", err);
      }
    };

    fetchPublicProfile();
  }, [id]);

  if (!user) return <div>Loading...</div>;

  return (
    <div>
      <h1>Public Profile</h1>
      <p><strong>Name:</strong> {user.name}</p>
      <p><strong>Bio:</strong> {user.bio}</p>
    </div>
  );
};

export default PublicProfile;