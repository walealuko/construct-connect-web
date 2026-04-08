import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import { getCurrentUser } from "aws-amplify/auth";

import Profile from "./components/Profile";
import Marketplace from "./pages/Marketplace";
import PublicProfile from "./pages/PublicProfile";
import AddProduct from "./pages/AddProduct";

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Marketplace />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/add-product" element={<ProtectedRoute><AddProduct /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/profile/:id" element={<PublicProfile />} />
      </Routes>
    </Router>
  );
}

function Navbar() {
  return (
    <nav style={styles.nav}>
      <h2 style={{ margin: 0 }}>ConstructHub</h2>
      <div>
        <Link to="/marketplace" style={styles.link}>Marketplace</Link>
        <Link to="/add-product" style={styles.link}>Add Product</Link>
        <Link to="/profile" style={styles.link}>My Profile</Link>
      </div>
    </nav>
  );
}

// 🔐 Protect private routes
function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = React.useState(null);

  React.useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      await getCurrentUser();
      setIsAuthenticated(true);
    } catch {
      setIsAuthenticated(false);
    }
  };

  if (isAuthenticated === null) {
    return <div style={{ padding: "40px" }}>Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/" />;
}

const styles = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px 40px",
    backgroundColor: "#111",
    color: "#fff",
  },
  link: {
    color: "#fff",
    marginLeft: "20px",
    textDecoration: "none",
  },
};

export default App;
