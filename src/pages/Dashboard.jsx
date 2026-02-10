import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import ClientDashboard from "../components/ClientDashboard";
import ContractorDashboard from "../components/ContractorDashboard";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/signin");
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Dashboard</h2>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>Role:</strong> {user?.role}</p>

        <hr />

        {user?.role === "client" && <ClientDashboard />}
        {user?.role === "contractor" && <ContractorDashboard />}

        <button onClick={handleLogout}>Logout</button>
      </div>
    </div>
  );
}
