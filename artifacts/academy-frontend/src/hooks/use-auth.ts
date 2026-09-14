import { useLocation } from "wouter";

export const routeByRole = (role?: string | null) => {
  if (role === "student") return "/student-dashboard";
  if (role === "teacher") return "/teacher-dashboard";
  if (role === "accountant") return "/accountant-dashboard";
  return "/dashboard";
};

export const getStoredRole = () => {
  return localStorage.getItem("coach_sutra_user_role");
};

export function useAuth() {
  const [, setLocation] = useLocation();

  const token = localStorage.getItem("coach_sutra_token");
  const role = getStoredRole();

  const login = (newToken: string, newRole?: string) => {
    localStorage.setItem("coach_sutra_token", newToken);
    if (newRole) localStorage.setItem("coach_sutra_user_role", newRole);

    window.dispatchEvent(new Event("storage"));
    setLocation(routeByRole(newRole));
  };

  const logout = () => {
    localStorage.removeItem("coach_sutra_token");
    localStorage.removeItem("coach_sutra_user_role");
    window.dispatchEvent(new Event("storage"));
    setLocation("/login");
  };

  return { isAuthenticated: !!token, token, role, login, logout };
}