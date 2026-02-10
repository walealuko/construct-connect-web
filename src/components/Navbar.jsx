import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/" className="brand">Constructhub</Link>

      <div className="nav-links">
        <Link to="/">Home</Link>

        {!user && (
          <>
            <Link to="/signin">Sign In</Link>
            <Link to="/signup">Sign Up</Link>
          </>
        )}

        {user && (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <button onClick={logout} className="nav-btn">Logout</button>
          </>
        )}
      </div>
    </nav>
  );
}
