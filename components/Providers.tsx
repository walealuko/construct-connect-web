"use client";

import React from "react";
import { UserProvider } from "./UserContext";
import { CartProvider } from "./CartContext";
import AuthGuard from "./AuthGuard";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <CartProvider>
        <AuthGuard>{children}</AuthGuard>
      </CartProvider>
    </UserProvider>
  );
}

