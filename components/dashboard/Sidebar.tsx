"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface SidebarProps {
  userRole?: string;
}

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  const roleMenu: Record<string, { name: string; href: string }[]> = {
    individual: [
      { name: "My Dashboard", href: "/buyer-dashboard" },
      { name: "Marketplace", href: "/marketplace" },
      { name: "My Projects", href: "/projects/my-projects" },
      { name: "Messages", href: "/messages" },
      { name: "Profile", href: "/profile/edit" },
    ],
    business: [
      { name: "Shop Dashboard", href: "/seller-dashboard" },
      { name: "Marketplace", href: "/marketplace" },
      { name: "Messages", href: "/messages" },
      { name: "Profile", href: "/profile/edit" },
    ],
    artisan: [
      { name: "Artisan Dashboard", href: "/artisan-dashboard" },
      { name: "Browse Projects", href: "/projects" },
      { name: "Messages", href: "/messages" },
      { name: "Profile", href: "/profile/edit" },
    ],
    admin: [
      { name: "Admin Panel", href: "/admin-dashboard" },
      { name: "Marketplace", href: "/marketplace" },
      { name: "Messages", href: "/messages" },
    ],
  };

  const menuItems = roleMenu[userRole || 'individual'] || roleMenu['individual'];

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen p-6 flex flex-col transition-all duration-300">
      <div className="mb-10 px-2">
        <h2 className="text-xl font-black tracking-tight text-white">
          Construct<span className="text-blue-500">Hub</span>
        </h2>
        <p className="text-[10px] text-slate-500 uppercase font-bold mt-1 tracking-widest">
          Professional Network
        </p>
      </div>

      <nav className="flex-1 flex flex-col gap-2">
        {menuItems.map((item) => {
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

      <div className="mt-auto pt-6 border-t border-slate-800">
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800 gap-2"
          onClick={() => {
            supabase.auth.signOut().then(() => {
              window.location.href = "/";
            });
          }}
        >
          <span>Logout</span>
          <span className="text-xs opacity-50">→</span>
        </Button>
      </div>
    </aside>
  );
}
