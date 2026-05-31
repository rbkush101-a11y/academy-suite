import { useEffect } from "react";
import { useLocation } from "wouter";

export function useAuth() {
  const [, setLocation] = useLocation();

  const token = localStorage.getItem("coach_sutra_token");
  
  useEffect(() => {
    if (!token) {
      setLocation("/login");
    }
  }, [token, setLocation]);

  const login = (newToken: string) => {
    localStorage.setItem("coach_sutra_token", newToken);
    window.dispatchEvent(new Event("storage"));
    setLocation("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("coach_sutra_token");
    window.dispatchEvent(new Event("storage"));
    setLocation("/login");
  };

  return { isAuthenticated: !!token, login, logout };
}