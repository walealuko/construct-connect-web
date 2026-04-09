import React, { createContext, useState, useEffect } from "react";
import API from "../api";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const storedUser = JSON.parse(localStorage.getItem("user") || "null");
  const [user, setUser] = useState(storedUser);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("user") || "null");
    setUser(stored);
  }, []);

  const login = async (email, password) => {
    try {
      const res = await API.post("/auth/login", { email, password });
      const userData = res.data.user;
      const token = res.data.token;

      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("token", token);
      return true;
    } catch (err) {
      console.error("Login error:", err);
      return false;
    }
  };

  const register = async (name, email, password) => {
    try {
      const res = await API.post("/auth/register", { name, email, password });
      const userData = res.data.user;
      const token = res.data.token;

      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("token", token);
      return true;
    } catch (err) {
      console.error("Registration error:", err);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  return (
    <UserContext.Provider value={{ user, login, register, logout }}>
      {children}
    </UserContext.Provider>
  );
};