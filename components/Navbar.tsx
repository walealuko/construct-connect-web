"use client";

import React, { useContext, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "./CartContext";
import { UserContext } from "./UserContext";
import { CartItem } from "@/types/database";

const Navbar = () => {
  const { cart } = useCart();
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const logout = userContext?.logout;
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const totalItems = cart.reduce((sum: number, item: CartItem) => sum + (item.quantity || 1), 0);

  const handleLogout = () => {
    if (logout) {
      logout();
    }
    setMenuOpen(false);
    router.push("/");
  };

  const getDashboardLink = () => {
    if (!user) return "/";
    switch (user.role) {
      case "seller": return "/seller-dashboard";
      case "admin": return "/admin-dashboard";
      default: return "/marketplace";
    }
  };

  return (
    <nav className="flex justify-between items-center px-6 md:px-10 h-[70px] bg-white shadow-sm sticky top-0 z-[1000]">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3">
        <img src="/logo.png" alt="Construct Hub" className="h-12" />
      </Link>

      {/* Navigation Links */}
      <div className="flex items-center gap-2">
        <Link href="/" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors rounded-lg">
          Home
        </Link>
        <Link href="/marketplace" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors rounded-lg">
          Marketplace
        </Link>
        <Link href="/artisans" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors rounded-lg">
          Artisans
        </Link>

        <Link
          href="/dashboard"
          className="px-4 py-2 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 transition-all rounded-lg"
        >
          Dashboard
        </Link>

        {user ? (
          <div className="relative ml-2">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-gray-500">Hi, {user?.email?.split('@')[0] || 'User'}</span>
              <span className="text-[10px]">{menuOpen ? "▲" : "▼"}</span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl py-2 z-[1001] overflow-hidden">
                <Link
                  href="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href={`/profile/${user.id}`}
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                >
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 ml-2">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all rounded-lg shadow-sm"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
