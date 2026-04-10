import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Marketplace from "./pages/Marketplace";
import Cart from "./pages/Cart";
import Navbar from "./components/Navbar";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import BuyerDashboard from "./pages/BuyerDashboard";
import SellerDashboard from "./pages/SellerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import { CartProvider } from "./context/CartContext";
import { UserProvider } from "./context/UserContext";
import { Analytics } from "@vercel/analytics/react";

function App() {
  return (
    <UserProvider>
      <Analytics />
      <CartProvider>
        <Router>
          <Navbar />

          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/buyer-dashboard" element={<BuyerDashboard />} />
            <Route path="/seller-dashboard" element={<SellerDashboard />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </Router>
      </CartProvider>
    </UserProvider>
  );
}

export default App;
