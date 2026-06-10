"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  userRole?: string;
}

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    { name: "Profile", href: "/profile" },
    { name: "Orders", href: "/orders" },
    { name: "Products", href: "/products" },
  ];

  // Filter menu items based on role if necessary
  const filteredItems = menuItems.filter(item => {
    if (userRole === "buyer") return true;
    if (userRole === "seller" && item.href !== "/products") return true; // example
    return true;
  });

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen p-6 flex flex-col">
      <h2 className="text-xl font-bold mb-8 px-2">Menu</h2>
      <nav className="flex flex-col gap-2">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
