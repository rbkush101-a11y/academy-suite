import { Link, useLocation, Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGetMe } from "@workspace/api-client-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Clock,
  ClipboardCheck,
  BookMarked,
  FileText,
  FileSpreadsheet,
  IndianRupee,
  Briefcase,
  TrendingUp,
  Bell,
  UserPlus,
  MessageSquare,
  LogOut,
} from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout } = useAuth();
  const { data: user } = useGetMe({ query: { enabled: isAuthenticated } });
  const [location] = useLocation();

  if (!isAuthenticated) return <Redirect to="/login" />;

  const navItems = [
    { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { title: "Admissions", icon: UserPlus, href: "/admissions" },
    { title: "Students", icon: Users, href: "/students" },
    { title: "Staff", icon: Briefcase, href: "/staff" },
    { title: "Courses", icon: GraduationCap, href: "/courses" },
    { title: "Subjects", icon: BookOpen, href: "/subjects" },
    { title: "Batches", icon: Calendar, href: "/batches" },
    { title: "Timetable", icon: Clock, href: "/timetable" },
    { title: "Attendance", icon: ClipboardCheck, href: "/attendance" },
    { title: "Homework", icon: BookMarked, href: "/homework" },
    { title: "Exams", icon: FileText, href: "/exams" },
    { title: "Report Cards", icon: FileSpreadsheet, href: "/report-card" },
    { title: "Finance", icon: IndianRupee, href: "/finance" },
    { title: "HR", icon: Briefcase, href: "/hr" },
    { title: "Analytics", icon: TrendingUp, href: "/analytics" },
    { title: "Notifications", icon: Bell, href: "/notifications" },
    { title: "PTM", icon: MessageSquare, href: "/ptm" },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-slate-50 dark:bg-slate-950">
        <Sidebar variant="inset">
          <SidebarHeader className="h-16 flex items-center px-4">
            <div className="flex items-center gap-2 font-bold text-lg text-primary">
              <GraduationCap className="h-6 w-6" />
              <span>Coach Sutra</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.href || location.startsWith(`${item.href}/`)}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user?.name || "User"}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                  {user?.email}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={logout} title="Logout">
                <LogOut className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 border-b bg-white dark:bg-slate-900 flex items-center px-4 shrink-0">
            <SidebarTrigger />
            <div className="ml-4 font-semibold text-lg">
              {navItems.find((n) => location.startsWith(n.href))?.title || "Overview"}
            </div>
          </header>
          <div className="flex-1 overflow-auto p-6">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}