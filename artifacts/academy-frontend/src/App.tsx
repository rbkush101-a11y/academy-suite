import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import DailyExpense from "@/pages/daily-expense";
import StudentFeeManagement from "@/pages/student-fee-management";

import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Dashboard from "@/pages/dashboard";
import Students from "@/pages/students";
import Courses from "@/pages/courses";
import Batches from "@/pages/batches";
import Staff from "@/pages/staff";
import Subjects from "@/pages/subjects";
import Attendance from "@/pages/attendance";
import Finance from "@/pages/finance";

import Timetable from "@/pages/timetable";
import Homework from "@/pages/homework";
import Exams from "@/pages/exams";
import ReportCard from "@/pages/report-card";
import HR from "@/pages/hr";
import Analytics from "@/pages/analytics";
import Notifications from "@/pages/notifications";
import Admissions from "@/pages/admissions";
import PTM from "@/pages/ptm";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/students"><ProtectedRoute component={Students} /></Route>
      <Route path="/courses"><ProtectedRoute component={Courses} /></Route>
      <Route path="/batches"><ProtectedRoute component={Batches} /></Route>
      <Route path="/staff"><ProtectedRoute component={Staff} /></Route>
      <Route path="/subjects"><ProtectedRoute component={Subjects} /></Route>
      <Route path="/attendance"><ProtectedRoute component={Attendance} /></Route>
      <Route path="/finance/student-fee-management">
        <ProtectedRoute component={StudentFeeManagement} />
      </Route>

      <Route path="/finance/daily-expense">
        <ProtectedRoute component={DailyExpense} />
      </Route>

      <Route path="/finance">
        <ProtectedRoute component={StudentFeeManagement} />
      </Route>
      
      <Route path="/timetable"><ProtectedRoute component={Timetable} /></Route>
      <Route path="/homework"><ProtectedRoute component={Homework} /></Route>
      <Route path="/exams"><ProtectedRoute component={Exams} /></Route>
      <Route path="/report-card"><ProtectedRoute component={ReportCard} /></Route>
      <Route path="/hr"><ProtectedRoute component={HR} /></Route>
      <Route path="/analytics"><ProtectedRoute component={Analytics} /></Route>
      <Route path="/notifications"><ProtectedRoute component={Notifications} /></Route>
      <Route path="/admissions"><ProtectedRoute component={Admissions} /></Route>
      <Route path="/ptm"><ProtectedRoute component={PTM} /></Route>
      
      <Route path="/"><ProtectedRoute component={Dashboard} /></Route>
      <Route><ProtectedRoute component={NotFound} /></Route>
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