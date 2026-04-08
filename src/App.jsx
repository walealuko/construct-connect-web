import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages
import Profile from "./pages/Profile";
import Marketplace from "./pages/Marketplace";
import Dashboard from "./pages/Dashboard";
import ProductDetail from "./pages/ProductDetail";
import AddProduct from "./pages/AddProduct";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Marketplace />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/add-product" element={<AddProduct />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;