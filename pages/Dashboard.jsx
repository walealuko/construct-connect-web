import React, { useContext, useEffect, useState } from "react";
import { UserContext } from "../context/UserContext";
import API from "../api";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!user) {
      navigate("/signin");
      return;
    }

    const fetchOrders = async () => {
      try {
        const res = await API.get("/orders"); // fetch orders for logged-in user
        setOrders(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchOrders();
  }, [user, navigate]);

  return (
    <div style={{ padding: 20 }}>
      <h2>Dashboard</h2>
      {orders.length === 0 ? (
        <p>You have no orders yet.</p>
      ) : (
        orders.map((order) => (
          <div key={order._id} style={orderCardStyle}>
            <h3>Order ID: {order._id}</h3>
            <p>Status: {order.status}</p>
            <p>Total: ${order.total}</p>
            <div style={{ marginTop: 10 }}>
              <h4>Items:</h4>
              {order.items.map((item) => (
                <div key={item.productId} style={orderItemStyle}>
                  <span>{item.name || "Product"}</span>
                  <span>Qty: {item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default Dashboard;

/* ===== Styles ===== */
const orderCardStyle = {
  border: "1px solid #ccc",
  borderRadius: 8,
  padding: 15,
  marginBottom: 15,
  boxShadow: "0 4px 8px rgba(0,0,0,0.05)",
};

const orderItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  padding: "5px 0",
};