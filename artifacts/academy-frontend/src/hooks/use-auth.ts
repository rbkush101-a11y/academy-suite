import { useLocation } from "wouter";

export const routeByRole = (role?: string | null) => {
  if (["super_admin", "platform_admin", "support_admin", "finance_admin", "read_only_admin"].includes(role ?? "")) return "/super-admin";
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
    const currentToken = localStorage.getItem("coach_sutra_token");
    if (currentToken) {
      void fetch("/api/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${currentToken}` } }).catch(() => {});
    }
    localStorage.removeItem("coach_sutra_token");
    localStorage.removeItem("coach_sutra_user_role");
    localStorage.removeItem("foundation_branches");
    localStorage.removeItem("foundation_institute_id");
    localStorage.removeItem("active_branch_id");
    localStorage.removeItem("active_branch_name");
    window.dispatchEvent(new Event("storage"));
    setLocation("/login");
  };

  return { isAuthenticated: !!token, token, role, login, logout };
}
