import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("br_token") || sessionStorage.getItem("br_token");
    if (!token) { setUser(false); setLoading(false); return; }
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const loginSuccess = (token, userData, remember) => {
    localStorage.removeItem("br_token");
    sessionStorage.removeItem("br_token");
    (remember ? localStorage : sessionStorage).setItem("br_token", token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("br_token");
    sessionStorage.removeItem("br_token");
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginSuccess, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
