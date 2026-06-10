"use client";

import { useContext } from "react";
import { UserContext } from "@/components/UserContext";
import { redirect } from "next/navigation";

export default function DashboardDispatcher() {
  const userContext = useContext(UserContext);
  const user = userContext?.user;

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
      redirect("/buyer-dashboard");
      break;
  }

  return null;
}
