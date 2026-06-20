"use client";

import React from "react";
import Sidebar from "./Sidebar";
import Breadcrumbs from "@/components/Breadcrumbs";
import { ScrollToTop } from "@/components/ui/ScrollToTop";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole?: string;
}

const DashboardLayout = ({ children, userRole }: DashboardLayoutProps) => {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar userRole={userRole} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="p-6 flex-1 overflow-auto relative">
          <div className="max-w-7xl mx-auto">
            <Breadcrumbs />
            {children}
          </div>
          <ScrollToTop />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

