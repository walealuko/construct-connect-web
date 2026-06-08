"use client";

import React from "react";
import { UserProvider } from "./UserContext";
import { CartProvider } from "./CartContext";
import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <UserProvider>
        <CartProvider>
          {children}
        </CartProvider>
      </UserProvider>
    </SessionProvider>
  );
}
