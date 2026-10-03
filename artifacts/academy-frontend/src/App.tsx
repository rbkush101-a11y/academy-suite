import {
  Switch,
  Route,
  Router as WouterRouter,
  Redirect,
  useLocation,
} from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { getStoredRole, routeByRole } from "@/hooks/use-auth";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Profile from "@/pages/profile";
import Settings from "@/pages/settings";
import Billing from "@/pages/billing";

import Dashboard from "@/pages/dashboard";
import Students from "@/pages/students";
import OnlineAdmissionForm from "./pages/online-admission-form";
import OnlineAdmissions from "@/pages/online-admissions";
import Courses from "@/pages/courses";
import Batches from "@/pages/batches";
import Staff from "@/pages/staff";
import Subjects from "@/pages/subjects";
import Topic from "@/pages/Topic";
import Attendance from "@/pages/attendance";
import AttendanceReport from "@/pages/AttendanceReport";
import Finance from "@/pages/finance";

import StudentLogin from "@/pages/student-login";
import StudentDashboard from "@/pages/student-dashboard";
import TeacherDashboard from "@/pages/teacher-dashboard";
import AccountantDashboard from "@/pages/accountant-dashboard";
import SuperAdminDashboard from "@/pages/super-admin-dashboard";
import { SuperAdminForgotPassword, SuperAdminLogin, SuperAdminResetPassword } from "@/pages/super-admin-auth";
import { SuperAdminLoginHistory, SuperAdminSecurityHome, SuperAdminSessions } from "@/pages/super-admin-security";
import { InstituteAdminResetPassword, SuperAdminInstituteCreate, SuperAdminInstituteDetail, SuperAdminInstituteList } from "@/pages/super-admin-institutes";
import SuperAdminPlans from "@/pages/super-admin-plans";

import DailyExpense from "@/pages/daily-expense";
import StudentFeeManagement from "@/pages/student-fee-management";
import Timetable from "@/pages/timetable";
import Homework from "@/pages/homework";
import Exams from "@/pages/exams";
import ReportCard from "@/pages/report-card";
import HR from "@/pages/hr";
import Analytics from "@/pages/analytics";
import Notifications from "@/pages/notifications";
import Admissions from "@/pages/admissions";
import PTM from "@/pages/ptm";
import AcademicYears from "@/pages/academic-years";
import Foundation from "@/pages/foundation";

const queryClient = new QueryClient();

function ProtectedRoute({
  component: Component,
  roles,
  withLayout = true,
  platformOnly = false,
}: {
  component: React.ComponentType<any>;
  roles?: string[];
  withLayout?: boolean;
  platformOnly?: boolean;
}) {
  const token = localStorage.getItem("coach_sutra_token");
  const role = getStoredRole();

  if (!token) {
    return <Redirect to={platformOnly ? "/super-admin/login" : "/login"} />;
  }

  if (roles?.length && (!role || !roles.includes(role))) {
    if (platformOnly) return <Redirect to="/super-admin/login" />;
    return <Redirect to={routeByRole(role)} />;
  }

  if (!withLayout) {
    return <Component />;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function SessionKeeper() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    let active = true;
    let request: Promise<void> | null = null;
    let lastSuccessfulRefresh = 0;
    let collisionRetries = 0;
    let collisionRetryTimer: number | undefined;

    const refresh = (force = false): Promise<void> => {
      if (request) return request;
      if (!localStorage.getItem("coach_sutra_token")) return Promise.resolve();
      if (!force && Date.now() - lastSuccessfulRefresh < 8 * 60 * 1000) return Promise.resolve();
      request = (async () => {
        try {
          const response = await fetch("/api/auth/refresh", { method: "POST", credentials: "same-origin" });
          if (response.ok) {
            const body = await response.json() as { token?: string };
            if (active && typeof body.token === "string" && body.token.length > 0) {
              localStorage.setItem("coach_sutra_token", body.token);
              lastSuccessfulRefresh = Date.now();
              collisionRetries = 0;
            }
            return;
          }
          if (response.status === 409 && active && collisionRetries < 2) {
            collisionRetries += 1;
            collisionRetryTimer = window.setTimeout(() => void refresh(true), 500);
            return;
          }
          if (response.status === 401 && active) {
            const role = localStorage.getItem("coach_sutra_user_role");
            localStorage.removeItem("coach_sutra_token");
            localStorage.removeItem("coach_sutra_user_role");
            window.dispatchEvent(new Event("storage"));
            setLocation(["super_admin", "platform_admin", "support_admin", "finance_admin", "read_only_admin"].includes(role ?? "") ? "/super-admin/login" : "/login");
          }
        } catch {
          // Preserve the current access token during a transient network failure.
        } finally {
          request = null;
        }
      })();
      return request;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onStorage = () => void refresh(true);
    const timer = window.setInterval(() => void refresh(true), 10 * 60 * 1000);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("storage", onStorage);
    void refresh();

    return () => {
      active = false;
      window.clearInterval(timer);
      if (collisionRetryTimer !== undefined) window.clearTimeout(collisionRetryTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("storage", onStorage);
    };
  }, [setLocation]);

  return null;
}

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/super-admin/login" component={SuperAdminLogin} />
      <Route path="/super-admin/forgot-password" component={SuperAdminForgotPassword} />
      <Route path="/super-admin/reset-password" component={SuperAdminResetPassword} />
      <Route path="/institute-admin/reset-password" component={InstituteAdminResetPassword} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/profile">
        <ProtectedRoute component={Profile} />
      </Route>

      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>

      <Route path="/foundation">
        <ProtectedRoute component={Foundation} roles={["super_admin", "institute_admin"]} />
      </Route>

      <Route path="/billing">
        <ProtectedRoute component={Billing} />
      </Route>

      {/* Optional old student login page */}
      <Route path="/student-login">
        <Redirect to="/login" />
      </Route>

      {/* Role Dashboards */}
      <Route path="/dashboard">
        <ProtectedRoute
          component={Dashboard}
          roles={["super_admin", "institute_admin", "staff"]}
        />
      </Route>

      <Route path="/super-admin/security">
        <ProtectedRoute component={SuperAdminSecurityHome} roles={["super_admin", "platform_admin", "support_admin", "finance_admin", "read_only_admin"]} withLayout={false} platformOnly />
      </Route>
      <Route path="/super-admin/sessions">
        <ProtectedRoute component={SuperAdminSessions} roles={["super_admin", "platform_admin", "support_admin", "finance_admin", "read_only_admin"]} withLayout={false} platformOnly />
      </Route>
      <Route path="/super-admin/login-history">
        <ProtectedRoute component={SuperAdminLoginHistory} roles={["super_admin", "platform_admin", "support_admin", "finance_admin", "read_only_admin"]} withLayout={false} platformOnly />
      </Route>
      <Route path="/super-admin/institutes/new">
        <ProtectedRoute component={SuperAdminInstituteCreate} roles={["super_admin", "platform_admin"]} withLayout={false} platformOnly />
      </Route>
      <Route path="/super-admin/institutes/:id">
        <ProtectedRoute component={SuperAdminInstituteDetail} roles={["super_admin", "platform_admin", "support_admin", "finance_admin", "read_only_admin"]} withLayout={false} platformOnly />
      </Route>
      <Route path="/super-admin/institutes">
        <ProtectedRoute component={SuperAdminInstituteList} roles={["super_admin", "platform_admin", "support_admin", "finance_admin", "read_only_admin"]} withLayout={false} platformOnly />
      </Route>
      <Route path="/super-admin/plans">
        <ProtectedRoute component={SuperAdminPlans} roles={["super_admin", "platform_admin", "support_admin", "finance_admin", "read_only_admin"]} withLayout={false} platformOnly />
      </Route>
      <Route path="/super-admin">
        <ProtectedRoute component={SuperAdminDashboard} roles={["super_admin", "platform_admin", "support_admin", "finance_admin", "read_only_admin"]} withLayout={false} platformOnly />
      </Route>
      <Route path="/super-admin/:section">
        <ProtectedRoute component={SuperAdminDashboard} roles={["super_admin", "platform_admin", "support_admin", "finance_admin", "read_only_admin"]} withLayout={false} platformOnly />
      </Route>
      <Route path="/super-admin-dashboard">
        <Redirect to="/super-admin" />
      </Route>

      <Route path="/teacher-dashboard">
        <ProtectedRoute component={TeacherDashboard} roles={["teacher"]} withLayout={false} />
      </Route>

      <Route path="/accountant-dashboard">
        <ProtectedRoute
          component={AccountantDashboard}
          roles={["accountant"]}
        />
      </Route>

      <Route path="/student-dashboard">
        <ProtectedRoute
          component={StudentDashboard}
          roles={["student"]}
          withLayout={false}
        />
      </Route>

      <Route path="/academic-years">
        <ProtectedRoute
          component={AcademicYears}
          roles={["super_admin", "institute_admin", "staff"]}
        />
      </Route>

      {/* Admin / Staff */}
      <Route path="/students">
        <ProtectedRoute
          component={Students}
          roles={["super_admin", "institute_admin", "staff"]}
        />
      </Route>
      <Route path="/branches">
        <Redirect to="/foundation?tab=branches" />
      </Route>

      <Route path="/courses">
        <ProtectedRoute
          component={Courses}
          roles={["super_admin", "institute_admin", "staff"]}
        />
      </Route>

      <Route path="/batches">
        <ProtectedRoute
          component={Batches}
          roles={["super_admin", "institute_admin", "staff"]}
        />
      </Route>

      <Route path="/staff">
        <ProtectedRoute
          component={Staff}
          roles={["super_admin", "institute_admin"]}
        />
      </Route>

      <Route path="/subjects">
        <ProtectedRoute
          component={Subjects}
          roles={["super_admin", "institute_admin", "staff", "teacher"]}
        />
      </Route>

      {/* Added Topic Route */}
      <Route path="/topics">
        <ProtectedRoute
          component={Topic}
          roles={["super_admin", "institute_admin", "staff", "teacher"]}
        />
      </Route>

      <Route path="/admissions">
        <ProtectedRoute
          component={Admissions}
          roles={["super_admin", "institute_admin", "staff"]}
        />
      </Route>

      {/* Public Online Admission Form */}
      <Route path="/online-admission-form/:instituteId">
        <OnlineAdmissionForm />
      </Route>

      <Route path="/online-admission-form">
        <OnlineAdmissionForm />
      </Route>

      {/* Admin Online Admissions */}
      <Route path="/online-admissions">
        <ProtectedRoute
          component={OnlineAdmissions}
          roles={["super_admin", "institute_admin", "staff"]}
        />
      </Route>

      <Route path="/ptm">
        <ProtectedRoute
          component={PTM}
          roles={["super_admin", "institute_admin", "staff"]}
        />
      </Route>

      <Route path="/notifications">
        <ProtectedRoute
          component={Notifications}
          roles={["super_admin", "institute_admin", "staff", "teacher"]}
        />
      </Route>

      {/* Teacher/Admin Attendance Routes (Report MUST come before main Attendance) */}
      <Route path="/attendance/report">
        <ProtectedRoute
          component={AttendanceReport}
          roles={["super_admin", "institute_admin", "teacher", "staff"]}
        />
      </Route>

      <Route path="/attendance">
        <ProtectedRoute
          component={Attendance}
          roles={["super_admin", "institute_admin", "teacher", "staff"]}
        />
      </Route>

      <Route path="/timetable">
        <ProtectedRoute
          component={Timetable}
          roles={["super_admin", "institute_admin", "teacher", "staff"]}
        />
      </Route>

      <Route path="/homework">
        <ProtectedRoute
          component={Homework}
          roles={["super_admin", "institute_admin", "teacher"]}
        />
      </Route>

      <Route path="/exams">
        <ProtectedRoute
          component={Exams}
          roles={["super_admin", "institute_admin", "teacher"]}
        />
      </Route>

      <Route path="/report-card">
        <ProtectedRoute
          component={ReportCard}
          roles={["super_admin", "institute_admin", "teacher"]}
        />
      </Route>

      {/* Finance */}
      <Route path="/finance/student-fee-management">
        <ProtectedRoute
          component={StudentFeeManagement}
          roles={["super_admin", "institute_admin", "accountant"]}
        />
      </Route>

      <Route path="/finance/daily-expense">
        <ProtectedRoute
          component={DailyExpense}
          roles={["super_admin", "institute_admin", "accountant"]}
        />
      </Route>

      <Route path="/finance">
        <ProtectedRoute
          component={StudentFeeManagement}
          roles={["super_admin", "institute_admin", "accountant"]}
        />
      </Route>

      <Route path="/hr">
        <ProtectedRoute
          component={HR}
          roles={["super_admin", "institute_admin"]}
        />
      </Route>

      <Route path="/analytics">
        <ProtectedRoute
          component={Analytics}
          roles={["super_admin", "institute_admin"]}
        />
      </Route>

      {/* Root */}
      <Route path="/">
        <Redirect to={routeByRole(getStoredRole())} />
      </Route>

      {/* 404 */}
      <Route>
        <ProtectedRoute component={NotFound} />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <SessionKeeper />
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
