"use client";

import React from "react";
import { UserProvider } from "./UserContext";
import { CartProvider } from "./CartContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <CartProvider>
        {children}
      </CartProvider>
    </UserProvider>
  );
}
