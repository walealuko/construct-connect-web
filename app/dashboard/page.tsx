"use client";

import { useContext } from "react";
import { UserContext } from "@/components/UserContext";
import { redirect } from "next/navigation";
import { Skeleton } from "@/components/ui/Skeleton";

export default function DashboardDispatcher() {
  const userContext = useContext(UserContext);

  if (!userContext) {
    return null;
  }

  const { user, loading } = userContext;

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center p-8">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    redirect("/login");
  }

  switch (user.role) {
    case "admin":
      redirect("/admin-dashboard");
      break;
    case "business":
      redirect("/seller-dashboard");
      break;
    case "artisan":
      redirect("/artisan-dashboard");
      break;
    case "individual":
    default:
      redirect("/");
      break;
  }

  return null;
}

