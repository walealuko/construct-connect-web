import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const { user } = useAuth(); // must exist in AuthContext

  if (!user) {
    return <Navigate to="/signin" />;
  }

  return children;
}
