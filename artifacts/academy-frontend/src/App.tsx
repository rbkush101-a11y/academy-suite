import {
  Switch,
  Route,
  Router as WouterRouter,
  Redirect,
} from "wouter";
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
import Courses from "@/pages/courses";
import Batches from "@/pages/batches";
import Staff from "@/pages/staff";
import Branches from "@/pages/branches";
import Subjects from "@/pages/subjects";
import Attendance from "@/pages/attendance";
import AttendanceReport from "@/pages/AttendanceReport";
import Finance from "@/pages/finance";

import StudentLogin from "@/pages/student-login";
import StudentDashboard from "@/pages/student-dashboard";
import TeacherDashboard from "@/pages/teacher-dashboard";
import AccountantDashboard from "@/pages/accountant-dashboard";
import SuperAdminDashboard from "@/pages/super-admin-dashboard";

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

const queryClient = new QueryClient();

function ProtectedRoute({
  component: Component,
  roles,
  withLayout = true,
}: {
  component: React.ComponentType<any>;
  roles?: string[];
  withLayout?: boolean;
}) {
  const token = localStorage.getItem("coach_sutra_token");
  const role = getStoredRole();

  if (!token) {
    return <Redirect to="/login" />;
  }

  if (roles?.length && (!role || !roles.includes(role))) {
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

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/profile">
        <ProtectedRoute component={Profile} />
      </Route>

      <Route path="/settings">
        <ProtectedRoute component={Settings} />
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

      <Route path="/super-admin-dashboard">
        <ProtectedRoute
          component={SuperAdminDashboard}
          roles={["super_admin"]}
        />
      </Route>

      <Route path="/teacher-dashboard">
        <ProtectedRoute component={TeacherDashboard} roles={["teacher"]} />
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
        <ProtectedRoute component={Branches} roles={["super_admin", "institute_admin"]} />
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

      <Route path="/admissions">
        <ProtectedRoute
          component={Admissions}
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
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;