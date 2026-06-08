"use client";

import React, { createContext, useState, useEffect } from "react";

export const UserContext = createContext<any>(null);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("user") || "null");
    setUser(stored);
  }, []);

  const login = async (email: string, password: string) => {
    // Logic is now handled primarily by Supabase Auth,
    // but we keep this for compatibility with migrated components
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  return (
    <UserContext.Provider value={{ user, setUser, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};
