import { useLocation } from "wouter";

const routeByRole = (role?: string) => {
  if (role === "student") return "/student-dashboard";
  if (role === "teacher") return "/teacher-dashboard";
  if (role === "accountant") return "/accountant-dashboard";
  if (role === "super_admin") return "/dashboard";
  return "/dashboard";
};

export function useAuth() {
  const [, setLocation] = useLocation();

  const token = localStorage.getItem("coach_sutra_token");

  const login = (newToken: string, role?: string) => {
    localStorage.setItem("coach_sutra_token", newToken);

    if (role) {
      localStorage.setItem("coach_sutra_user_role", role);
    }

    window.dispatchEvent(new Event("storage"));
    setLocation(routeByRole(role));
  };

  const logout = () => {
    localStorage.removeItem("coach_sutra_token");
    localStorage.removeItem("coach_sutra_user_role");
    window.dispatchEvent(new Event("storage"));
    setLocation("/login");
  };

  return { isAuthenticated: !!token, login, logout };
}