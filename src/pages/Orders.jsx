// src/pages/Orders.jsx
import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "../context/UserContext";
import ProfileCard from "../components/ProfileCard";

export default function Orders() {
  const { user } = useContext(UserContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchOrders();
  }, [user]);

  async function fetchOrders() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/orders", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(order) {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/orders/${order.id}/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Payment released to seller!");
        fetchOrders();
      }
    } catch (error) {
      console.error("Error releasing escrow:", error);
      alert("Failed to release escrow. Check console for details.");
    }
  }

  if (loading) return <div style={{ padding: "2rem" }}>Loading...</div>;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>My Orders</h1>
      {orders.length === 0 && <p>No orders found.</p>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        {orders.map((order) => (
          <div key={order.id} style={{ minWidth: "220px" }}>
            <ProfileCard item={order} />

            {order.status === "PAID" && order.buyerId === user?.id && (
              <button
                onClick={() => handleConfirm(order)}
                style={{
                  marginTop: "0.5rem",
                  padding: "0.5rem 1rem",
                  backgroundColor: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Confirm Delivery
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
