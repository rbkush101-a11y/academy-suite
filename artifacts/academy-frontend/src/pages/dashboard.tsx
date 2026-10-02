import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  BadgeIndianRupee,
  BarChart3,
  BellRing,
  BookOpenCheck,
  CalendarCheck2,
  CalendarClock,
  CakeSlice,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileText,
  GraduationCap,
  IndianRupee,
  Megaphone,
  Plus,
  ReceiptIndianRupee,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserPlus2,
  Users2,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Skeleton } from "@/components/ui/skeleton";

type PipelineKey = "new" | "contacted" | "visited" | "enrolled" | "dropped";

type DashboardOverview = {
  institute: {
    name: string;
    academicYear: string;
  };
  summary: {
    totalStudents: number;
    totalStaff: number;
    totalBatches: number;
    totalCourses: number;
    todayClasses: number;
    upcomingTests: number;
    openEnquiries: number;
  };
  fees: {
    collectedThisMonth: number;
    expectedThisMonth: number;
    outstandingThisMonth: number;
    outstandingTotal: number;
    overdueAmount: number;
    overdueCount: number;
    todayCollection: number;
    collectionRate: number;
    trend: Array<{
      month: string;
      collected: number;
      outstanding: number;
    }>;
  };
  admissions: {
    pipeline: Record<PipelineKey, number>;
    openEnquiries: number;
    todayFollowUps: number;
    overdueFollowUps: number;
    conversionRate: number;
  };
  attendance: {
    present: number;
    absent: number;
    late: number;
    unmarked: number;
    percentage: number;
    lowAttendanceCount: number;
    trend: Array<{
      date: string;
      label: string;
      percentage: number;
    }>;
  };
  faculty: {
    total: number;
    present: number;
    absent: number;
    leave: number;
    unmarked: number;
  };
  classesToday: Array<{
    id: string;
    batch: string;
    subject: string;
    teacher: string;
    startTime: string;
    endTime: string;
    room: string;
  }>;
  upcomingTests: Array<{
    id: string;
    name: string;
    batch: string;
    subject: string;
    date: string;
    startTime: string;
    totalMarks: number;
  }>;
  attention: {
    overdueFees: number;
    overdueFeeAmount: number;
    overdueFollowUps: number;
    lowAttendanceStudents: number;
    attendanceNotMarked: number;
    facultyOnLeave: number;
    upcomingTests: number;
  };
  birthdays: {
    students: Array<{ id: string; name: string; detail: string }>;
    staff: Array<{ id: string; name: string; detail: string }>;
    total: number;
  };
  recentActivity: Array<{
    id: string;
    type: "student" | "payment" | "admission";
    title: string;
    detail: string;
    amount?: number;
    createdAt: string;
    href: string;
  }>;
};

const emptyOverview: DashboardOverview = {
  institute: { name: "Coaching Institute", academicYear: "" },
  summary: {
    totalStudents: 0,
    totalStaff: 0,
    totalBatches: 0,
    totalCourses: 0,
    todayClasses: 0,
    upcomingTests: 0,
    openEnquiries: 0,
  },
  fees: {
    collectedThisMonth: 0,
    expectedThisMonth: 0,
    outstandingThisMonth: 0,
    outstandingTotal: 0,
    overdueAmount: 0,
    overdueCount: 0,
    todayCollection: 0,
    collectionRate: 0,
    trend: [],
  },
  admissions: {
    pipeline: { new: 0, contacted: 0, visited: 0, enrolled: 0, dropped: 0 },
    openEnquiries: 0,
    todayFollowUps: 0,
    overdueFollowUps: 0,
    conversionRate: 0,
  },
  attendance: {
    present: 0,
    absent: 0,
    late: 0,
    unmarked: 0,
    percentage: 0,
    lowAttendanceCount: 0,
    trend: [],
  },
  faculty: { total: 0, present: 0, absent: 0, leave: 0, unmarked: 0 },
  classesToday: [],
  upcomingTests: [],
  attention: {
    overdueFees: 0,
    overdueFeeAmount: 0,
    overdueFollowUps: 0,
    lowAttendanceStudents: 0,
    attendanceNotMarked: 0,
    facultyOnLeave: 0,
    upcomingTests: 0,
  },
  birthdays: { students: [], staff: [], total: 0 },
  recentActivity: [],
};

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem("coach_sutra_token");

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function getDashboardOverview(): Promise<DashboardOverview> {
  const response = await fetch("/api/dashboard/overview", {
    headers: authHeaders(),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error || "Unable to load dashboard");
  }

  return response.json();
}

function getStoredAdminName() {
  try {
    const raw = localStorage.getItem("coach_sutra_user") || localStorage.getItem("user");
    if (!raw) return "Admin";
    const user = JSON.parse(raw);
    return user?.name || user?.fullName || user?.ownerName || "Admin";
  } catch {
    return "Admin";
  }
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatCompactMoney(value: number) {
  const amount = Number(value || 0);
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(amount >= 100_000_000 ? 0 : 1)}Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(amount >= 1_000_000 ? 0 : 1)}L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(amount >= 10_000 ? 0 : 1)}K`;
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function percentage(value: number) {
  return `${Math.round(Number(value || 0))}%`;
}

function safeDateLabel(dateValue: string, pattern = "dd MMM") {
  try {
    return format(new Date(`${dateValue}T00:00:00`), pattern);
  } catch {
    return dateValue || "—";
  }
}


function safeRelativeTime(dateValue: string) {
  try {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "";
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "";
  }
}

function timeToMinutes(value: string) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function classStatus(startTime: string, endTime: string) {
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (start === null || end === null) return "Scheduled";
  if (current < start) return "Upcoming";
  if (current <= end) return "Running";
  return "Completed";
}

export default function Dashboard() {
  const { data = emptyOverview, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["coaching-admin-dashboard-overview"],
    queryFn: getDashboardOverview,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
    staleTime: 60_000,
  });

  const adminName = getStoredAdminName();
  const todayLabel = format(new Date(), "EEEE, dd MMMM yyyy");
  const instituteName =
    (!isLoading ? data.institute.name : "") ||
    localStorage.getItem("coaching_name") ||
    "Coaching Institute";
  const hasPipelineData = Object.values(data.admissions.pipeline).some((value) => Number(value || 0) > 0);

  const attentionItems = [
    {
      count: data.attention.overdueFees,
      title: "Fee accounts are overdue",
      detail: `${formatMoney(data.attention.overdueFeeAmount)} needs follow-up`,
      href: "/finance/student-fee-management",
      icon: ReceiptIndianRupee,
      tone: "red" as const,
    },
    {
      count: data.attention.overdueFollowUps,
      title: "Admission follow-ups overdue",
      detail: "Counselling team needs to contact these leads",
      href: "/admissions",
      icon: BellRing,
      tone: "amber" as const,
    },
    {
      count: data.attention.lowAttendanceStudents,
      title: "Students below 75% attendance",
      detail: "Review attendance and contact students if needed",
      href: "/attendance/report",
      icon: AlertTriangle,
      tone: "amber" as const,
    },
    {
      count: data.attention.attendanceNotMarked,
      title: "Student attendance not marked",
      detail: "Complete today's attendance entries",
      href: "/attendance",
      icon: CalendarCheck2,
      tone: "blue" as const,
    },
    {
      count: data.attention.facultyOnLeave,
      title: "Faculty on leave today",
      detail: "Check timetable for substitute requirements",
      href: "/staff",
      icon: Users2,
      tone: "blue" as const,
    },
  ].filter((item) => item.count > 0);

  if (isError) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="max-w-md w-full rounded-[28px] border border-red-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Dashboard couldn't load</h2>
          <p className="mt-2 text-sm text-slate-500">
            {error instanceof Error ? error.message : "Please try again."}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-5 rounded-xl bg-[#0a2e5a] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#123d70]"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mx-auto w-full max-w-[1700px] space-y-4 pb-8 sm:space-y-5"
      aria-busy={isLoading || isFetching}
    >
      {/* HERO */}
      <section className="relative overflow-hidden rounded-[30px] bg-[#0a2e5a] px-5 py-6 text-white shadow-[0_14px_40px_rgba(10,46,90,0.16)] sm:px-7 lg:px-8 lg:py-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#8aa000]/20 blur-2xl" />
        <div className="pointer-events-none absolute bottom-[-120px] right-[20%] h-64 w-64 rounded-full bg-sky-400/10 blur-2xl" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
              <span>Coaching Command Center</span>
              <span className="h-1 w-1 rounded-full bg-white/40" />
              <span>{todayLabel}</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-[36px]">
              {getGreeting()}, {adminName.split(" ")[0]}
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/70">
              {instituteName}
              {data.institute.academicYear ? ` • Session ${data.institute.academicYear}` : ""} — admissions, classes,
              attendance and collections at a glance.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <HeroPill icon={GraduationCap} text={`${data.summary.totalCourses} courses`} loading={isLoading} />
              <HeroPill icon={Users2} text={`${data.summary.totalBatches} active batches`} loading={isLoading} />
              <HeroPill icon={CalendarClock} text={`${data.summary.todayClasses} classes today`} loading={isLoading} />
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-2.5 sm:flex sm:w-auto sm:flex-wrap">
            <Link href="/admissions">
              <div className="flex min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-white/15 sm:px-4">
                <UserPlus2 className="h-4 w-4" /> New Enquiry
              </div>
            </Link>
            <Link href="/students?admit=true">
              <div className="flex min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#829600] px-3 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-black/10 transition hover:bg-[#738500] sm:px-4">
                <Plus className="h-4 w-4" /> Add Student
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* KPI GRID */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        <KpiCard
          title="Active Students"
          value={data.summary.totalStudents.toLocaleString("en-IN")}
          subtext={`${data.summary.totalBatches} active batches`}
          icon={Users2}
          href="/students"
          tone="navy"
          loading={isLoading}
        />
        <KpiCard
          title="Today Attendance"
          value={percentage(data.attendance.percentage)}
          subtext={`${data.attendance.present} present • ${data.attendance.absent} absent`}
          icon={UserCheck}
          href="/attendance"
          tone="green"
          loading={isLoading}
        />
        <KpiCard
          title="Month Collection"
          value={formatCompactMoney(data.fees.collectedThisMonth)}
          subtext={`${percentage(data.fees.collectionRate)} of expected`}
          icon={IndianRupee}
          href="/finance/student-fee-management"
          tone="green"
          loading={isLoading}
        />
        <KpiCard
          title="Pending Fees"
          value={formatCompactMoney(data.fees.outstandingTotal)}
          subtext={`${data.fees.overdueCount} overdue accounts`}
          icon={WalletCards}
          href="/finance/student-fee-management"
          tone="amber"
          loading={isLoading}
        />
        <KpiCard
          title="Open Enquiries"
          value={data.admissions.openEnquiries.toLocaleString("en-IN")}
          subtext={`${data.admissions.todayFollowUps} follow-ups today`}
          icon={UserPlus2}
          href="/admissions"
          tone="purple"
          loading={isLoading}
        />
        <KpiCard
          title="Conversion"
          value={percentage(data.admissions.conversionRate)}
          subtext={`${data.admissions.pipeline.enrolled} enrolled leads`}
          icon={TrendingUp}
          href="/admissions"
          tone="blue"
          loading={isLoading}
        />
        <KpiCard
          title="Today Classes"
          value={data.summary.todayClasses.toLocaleString("en-IN")}
          subtext={`${data.summary.totalStaff} active faculty/staff`}
          icon={BookOpenCheck}
          href="/timetable"
          tone="blue"
          loading={isLoading}
        />
        <KpiCard
          title="Upcoming Tests"
          value={data.summary.upcomingTests.toLocaleString("en-IN")}
          subtext="Next scheduled assessments"
          icon={FileText}
          href="/exams"
          tone="navy"
          loading={isLoading}
        />
      </section>

      {/* CRM + QUICK ACTIONS + FEES */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <Panel className="lg:col-span-7">
          <PanelHeader
            eyebrow="ADMISSIONS"
            title="CRM pipeline"
            description={`${data.admissions.todayFollowUps} follow-ups today • ${data.admissions.overdueFollowUps} overdue`}
            action={{ label: "Open CRM", href: "/admissions" }}
          />

          <div className="space-y-5 px-5 pb-6 lg:px-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-12 w-full rounded-xl" />)}
              </div>
            ) : !hasPipelineData ? (
              <EmptyState
                icon={UserPlus2}
                title="No enquiries yet"
                text="New coaching enquiries and follow-ups will appear here."
                action={{ label: "Add enquiry", href: "/admissions" }}
              />
            ) : (
              <PipelineList pipeline={data.admissions.pipeline} />
            )}

            <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">
              <div className="rounded-2xl bg-[#f5f7ed] p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Conversion</p>
                {isLoading ? (
                  <Skeleton className="mt-2 h-7 w-16" />
                ) : (
                  <p className="mt-1 text-2xl font-black text-[#5f7000]">{percentage(data.admissions.conversionRate)}</p>
                )}
              </div>
              <div className={`rounded-2xl p-4 ${data.admissions.overdueFollowUps > 0 ? "bg-amber-50" : "bg-emerald-50"}`}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Overdue follow-ups</p>
                {isLoading ? (
                  <Skeleton className="mt-2 h-7 w-10" />
                ) : (
                  <p className={`mt-1 text-2xl font-black ${data.admissions.overdueFollowUps > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                    {data.admissions.overdueFollowUps}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="lg:col-span-5">
          <PanelHeader
            eyebrow="SHORTCUTS"
            title="Quick actions"
            description="Frequent coaching operations in one click"
          />
          <div className="grid grid-cols-2 gap-3 px-5 pb-5 sm:grid-cols-4 lg:grid-cols-2 2xl:grid-cols-4">
            <QuickAction href="/students?admit=true" icon={UserPlus2} label="Add Student" />
            <QuickAction href="/admissions" icon={Plus} label="New Enquiry" />
            <QuickAction href="/finance/student-fee-management" icon={BadgeIndianRupee} label="Collect Fee" />
            <QuickAction href="/attendance" icon={CalendarCheck2} label="Attendance" />
            <QuickAction href="/timetable" icon={CalendarClock} label="Schedule Class" />
            <QuickAction href="/exams" icon={FileText} label="Create Test" />
            <QuickAction href="/notifications" icon={Megaphone} label="Announcement" />
            <QuickAction href="/analytics" icon={BarChart3} label="Reports" />
          </div>
        </Panel>
        <Panel className="lg:col-span-12">
          <PanelHeader
            eyebrow="FINANCE"
            title="Fee collection"
            description="Six-month collection and outstanding trend"
            action={{ label: "Open fee desk", href: "/finance/student-fee-management" }}
          />

          <div className="grid grid-cols-2 gap-4 border-b border-slate-100 px-5 pb-5 pt-1 sm:grid-cols-4 lg:px-6">
            <MiniStat label="Collected" value={formatMoney(data.fees.collectedThisMonth)} tone="green" loading={isLoading} />
            <MiniStat label="Expected" value={formatMoney(data.fees.expectedThisMonth)} tone="navy" loading={isLoading} />
            <MiniStat label="Outstanding" value={formatMoney(data.fees.outstandingThisMonth)} tone="amber" loading={isLoading} />
            <MiniStat label="Collected today" value={formatMoney(data.fees.todayCollection)} tone="blue" loading={isLoading} />
          </div>

          <div className="h-[230px] min-w-0 px-1 pb-3 pt-5 sm:h-[280px] sm:px-4">
            {isLoading ? (
              <Skeleton className="h-full w-full rounded-2xl" />
            ) : data.fees.trend.length === 0 ? (
              <EmptyChart text="Fee collection trend will appear once fee records are available." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.fees.trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="collectedFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6b7d00" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#6b7d00" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="outstandingFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.20} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e9edf3" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    tickFormatter={(value) => formatCompactMoney(Number(value))}
                  />
                  <Tooltip
                    formatter={(value: number | string, name: string) => [formatMoney(Number(value)), name === "collected" ? "Collected" : "Outstanding"]}
                    contentStyle={{ borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 12px 30px rgba(15,23,42,.08)" }}
                  />
                  <Area type="monotone" dataKey="outstanding" stroke="#f59e0b" strokeWidth={2} fill="url(#outstandingFill)" />
                  <Area type="monotone" dataKey="collected" stroke="#6b7d00" strokeWidth={2.5} fill="url(#collectedFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

      </section>

      {/* CLASSES + ATTENTION */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <Panel className="lg:col-span-7">
          <PanelHeader
            eyebrow="TODAY"
            title="Today's classes"
            description="Live view of today's batch schedule"
            action={{ label: "Full timetable", href: "/timetable" }}
          />

          <div className="px-4 pb-5 sm:px-5">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-[70px] w-full rounded-2xl" />)}
              </div>
            ) : data.classesToday.length === 0 ? (
              <EmptyState icon={CalendarClock} title="No classes scheduled today" text="Add class schedules from the timetable module." />
            ) : (
              <div className="divide-y divide-slate-100">
                {data.classesToday.map((item) => {
                  const status = classStatus(item.startTime, item.endTime);
                  return (
                    <div key={item.id} className="flex flex-col gap-3 py-3.5 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="w-[78px] shrink-0 rounded-xl bg-slate-50 px-2 py-2 text-center">
                          <p className="text-[11px] font-extrabold text-[#0a2e5a]">{item.startTime || "—"}</p>
                          <p className="mt-0.5 text-[9px] font-semibold text-slate-400">{item.endTime || ""}</p>
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="truncate text-sm font-extrabold text-slate-900">{item.batch}</h4>
                            <StatusBadge status={status} />
                          </div>
                          <p className="mt-1 truncate text-xs font-medium text-slate-500">
                            {item.subject} • {item.teacher}{item.room ? ` • ${item.room}` : ""}
                          </p>
                        </div>
                      </div>
                      <Link href="/attendance">
                        <div className="flex cursor-pointer items-center gap-1 text-xs font-bold text-[#6b7d00] hover:text-[#526100]">
                          Attendance <ChevronRight className="h-3.5 w-3.5" />
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Panel>

        <Panel className="lg:col-span-5">
          <PanelHeader
            eyebrow="ACTION CENTER"
            title="Needs your attention"
            description="Only items that need admin action"
          />

          <div className="px-4 pb-5 sm:px-5">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-16 w-full rounded-2xl" />)}
              </div>
            ) : attentionItems.length === 0 ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
                <h4 className="mt-2 text-sm font-extrabold text-emerald-900">You're all caught up</h4>
                <p className="mt-1 text-xs font-medium text-emerald-700/80">No urgent admin actions are pending right now.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {attentionItems.slice(0, 5).map((item) => (
                  <AttentionRow key={item.title} {...item} />
                ))}
              </div>
            )}
          </div>
        </Panel>
      </section>

      {/* ATTENDANCE */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <Panel className="xl:col-span-12">
          <PanelHeader
            eyebrow="ATTENDANCE"
            title="Student attendance pulse"
            description="Today snapshot with the last 7 marked days"
            action={{ label: "Attendance report", href: "/attendance/report" }}
          />

          <div className="grid gap-4 px-4 pb-5 sm:px-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-5 lg:px-6">
            <div className="rounded-2xl bg-[#f7f8fa] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Today attendance</p>
              {isLoading ? (
                <Skeleton className="mt-3 h-10 w-24" />
              ) : (
                <p className="mt-2 text-4xl font-black tracking-tight text-[#0a2e5a]">{percentage(data.attendance.percentage)}</p>
              )}
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-[#6b7d00]" style={{ width: `${Math.min(100, Math.max(0, data.attendance.percentage))}%` }} />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                <AttendanceCount label="Present" value={data.attendance.present} className="text-emerald-600" />
                <AttendanceCount label="Absent" value={data.attendance.absent} className="text-red-600" />
                <AttendanceCount label="Late" value={data.attendance.late} className="text-amber-600" />
                <AttendanceCount label="Unmarked" value={data.attendance.unmarked} className="text-slate-500" />
              </div>
            </div>

            <div className="h-[210px] min-w-0 sm:h-[220px]">
              {isLoading ? (
                <Skeleton className="h-full w-full rounded-2xl" />
              ) : data.attendance.trend.length === 0 ? (
                <EmptyChart text="Attendance trend will appear after attendance is marked." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.attendance.trend} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0a2e5a" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#0a2e5a" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#edf0f4" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(value: number | string) => [`${Math.round(Number(value))}%`, "Attendance"]} contentStyle={{ borderRadius: 14, border: "1px solid #e2e8f0" }} />
                    <Area type="monotone" dataKey="percentage" stroke="#0a2e5a" strokeWidth={2.5} fill="url(#attendanceFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </Panel>
      </section>

      {/* BIRTHDAYS */}
      <section>
        <Panel>
          <PanelHeader
            eyebrow="CELEBRATIONS"
            title="Today's birthdays"
            description="Active students and active faculty/staff celebrating today"
          />

          <div className="grid gap-4 px-4 pb-5 sm:px-5 md:grid-cols-2 lg:px-6">
            <BirthdayGroup
              title="Students"
              href="/students"
              items={data.birthdays.students}
              loading={isLoading}
              emptyText="No active student birthdays today."
            />
            <BirthdayGroup
              title="Faculty & staff"
              href="/staff"
              items={data.birthdays.staff}
              loading={isLoading}
              emptyText="No active faculty/staff birthdays today."
            />
          </div>
        </Panel>
      </section>

      {/* TESTS + FACULTY + ACTIVITY */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12 xl:gap-5">
        <Panel className="xl:col-span-4">
          <PanelHeader eyebrow="ASSESSMENTS" title="Upcoming tests" action={{ label: "All tests", href: "/exams" }} />
          <div className="px-5 pb-5">
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-16 w-full rounded-xl" />)}</div>
            ) : data.upcomingTests.length === 0 ? (
              <EmptyState icon={FileText} title="No upcoming tests" text="Schedule the next test from Exams." />
            ) : (
              <div className="space-y-2.5">
                {data.upcomingTests.slice(0, 4).map((test) => (
                  <Link key={test.id} href="/exams">
                    <div className="group cursor-pointer rounded-2xl border border-slate-100 p-3.5 transition hover:border-slate-200 hover:bg-slate-50/70">
                      <div className="flex items-start gap-3">
                        <div className="min-w-[52px] rounded-xl bg-[#eef2f8] px-2 py-2 text-center">
                          <p className="text-[10px] font-extrabold uppercase text-slate-400">{safeDateLabel(test.date, "MMM")}</p>
                          <p className="text-lg font-black leading-none text-[#0a2e5a]">{safeDateLabel(test.date, "dd")}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-sm font-extrabold text-slate-900">{test.name}</h4>
                          <p className="mt-1 truncate text-[11px] font-medium text-slate-500">{test.batch} • {test.subject}</p>
                          <p className="mt-1 text-[10px] font-bold text-[#6b7d00]">{test.startTime || "Time not set"} • {test.totalMarks} marks</p>
                        </div>
                        <ChevronRight className="mt-1 h-4 w-4 text-slate-300 transition group-hover:text-slate-500" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Panel>

        <Panel className="xl:col-span-3">
          <PanelHeader eyebrow="FACULTY" title="Faculty today" action={{ label: "Staff", href: "/staff" }} />
          <div className="px-5 pb-5">
            {isLoading ? (
              <Skeleton className="h-52 w-full rounded-2xl" />
            ) : data.faculty.total === 0 ? (
              <EmptyState
                icon={Users2}
                title="No faculty added yet"
                text="Add faculty members to see today's staffing and attendance snapshot."
                action={{ label: "Open staff", href: "/staff" }}
              />
            ) : (
              <>
                <div className="rounded-2xl bg-[#0a2e5a] p-5 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/55">Active faculty/staff</p>
                  <p className="mt-2 text-4xl font-black">{data.faculty.total}</p>
                  <p className="mt-1 text-xs font-medium text-white/65">Today's attendance status</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <FacultyStat label="Present" value={data.faculty.present} tone="green" />
                  <FacultyStat label="On leave" value={data.faculty.leave} tone="amber" />
                  <FacultyStat label="Absent" value={data.faculty.absent} tone="red" />
                  <FacultyStat label="Unmarked" value={data.faculty.unmarked} tone="slate" />
                </div>
              </>
            )}
          </div>
        </Panel>

        <Panel className="md:col-span-2 xl:col-span-5">
          <PanelHeader eyebrow="ACTIVITY" title="Recent activity" description="Latest admissions, students and payments" />
          <div className="px-5 pb-5">
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-14 w-full rounded-xl" />)}</div>
            ) : data.recentActivity.length === 0 ? (
              <EmptyState icon={Sparkles} title="No recent activity" text="New activity will appear here automatically." />
            ) : (
              <div className="divide-y divide-slate-100">
                {data.recentActivity.slice(0, 6).map((activity) => (
                  <Link key={activity.id} href={activity.href}>
                    <div className="group flex cursor-pointer items-center gap-3 py-3 first:pt-0">
                      <ActivityIcon type={activity.type} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-xs font-extrabold text-slate-800">{activity.title}</p>
                          {activity.amount ? <span className="shrink-0 text-xs font-extrabold text-emerald-700">+{formatCompactMoney(activity.amount)}</span> : null}
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-3">
                          <p className="truncate text-[11px] font-medium text-slate-500">{activity.detail}</p>
                          <p className="hidden shrink-0 text-[10px] font-semibold text-slate-400 sm:block">
                            {safeRelativeTime(activity.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Panel>
      </section>

      {isFetching && !isLoading ? (
        <div className="pointer-events-none fixed bottom-5 right-5 z-50 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-500 shadow-lg">
          Refreshing dashboard…
        </div>
      ) : null}
    </div>
  );
}

function HeroPill({ icon: Icon, text, loading }: { icon: LucideIcon; text: string; loading: boolean }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-[11px] font-bold text-white/85">
      <Icon className="h-3.5 w-3.5 text-[#c7d95c]" />
      {loading ? <Skeleton className="h-3 w-16 bg-white/20" /> : text}
    </div>
  );
}

const kpiTone = {
  navy: { icon: "bg-[#edf2f8] text-[#0a2e5a]", accent: "bg-[#0a2e5a]" },
  green: { icon: "bg-[#f0f4dc] text-[#667800]", accent: "bg-[#7d9100]" },
  amber: { icon: "bg-amber-50 text-amber-600", accent: "bg-amber-500" },
  purple: { icon: "bg-violet-50 text-violet-600", accent: "bg-violet-500" },
  blue: { icon: "bg-sky-50 text-sky-600", accent: "bg-sky-500" },
} as const;

function KpiCard({
  title,
  value,
  subtext,
  icon: Icon,
  href,
  tone,
  loading,
}: {
  title: string;
  value: string;
  subtext: string;
  icon: LucideIcon;
  href: string;
  tone: keyof typeof kpiTone;
  loading: boolean;
}) {
  const palette = kpiTone[tone];
  return (
    <Link href={href}>
      <div className="group relative min-h-[142px] cursor-pointer overflow-hidden rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_6px_22px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        <div className={`absolute left-0 top-0 h-full w-1 ${palette.accent}`} />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-extrabold uppercase tracking-[0.13em] text-slate-400">{title}</p>
            {loading ? <Skeleton className="mt-3 h-8 w-20" /> : <p className="mt-2 text-[28px] font-black tracking-tight text-slate-900">{value}</p>}
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${palette.icon}`}>
            <Icon className="h-[19px] w-[19px]" />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          {loading ? <Skeleton className="h-3 w-24" /> : <p className="line-clamp-1 text-[10.5px] font-semibold text-slate-500">{subtext}</p>}
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
        </div>
      </div>
    </Link>
  );
}

function BirthdayGroup({
  title,
  href,
  items,
  loading,
  emptyText,
}: {
  title: string;
  href: string;
  items: Array<{ id: string; name: string; detail: string }>;
  loading: boolean;
  emptyText: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2f5df] text-[#6b7d00]">
            <CakeSlice className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-900">{title}</p>
            <p className="text-[10px] font-semibold text-slate-400">{loading ? "Checking birthdays…" : `${items.length} today`}</p>
          </div>
        </div>
        <Link href={href}>
          <div className="cursor-pointer text-[10px] font-extrabold text-[#657500] hover:text-[#506000]">View all</div>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((item) => <Skeleton key={item} className="h-12 w-full rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-5 text-center">
          <CakeSlice className="mx-auto h-5 w-5 text-slate-300" />
          <p className="mt-2 text-[11px] font-semibold text-slate-500">{emptyText}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 5).map((item) => (
            <Link key={item.id} href={href}>
              <div className="group flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-2.5 transition hover:shadow-sm">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0a2e5a] text-xs font-black text-white">
                  {item.name.trim().charAt(0).toUpperCase() || "•"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-extrabold text-slate-800">{item.name}</p>
                  <p className="mt-0.5 truncate text-[10px] font-medium text-slate-500">{item.detail}</p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[9px] font-extrabold text-amber-700">Birthday 🎉</span>
              </div>
            </Link>
          ))}
          {items.length > 5 ? (
            <p className="pt-1 text-center text-[10px] font-semibold text-slate-400">+{items.length - 5} more birthdays today</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_6px_24px_rgba(15,23,42,0.035)] ${className}`}>
      {children}
    </div>
  );
}

function PanelHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-3 px-4 py-4 sm:flex-row sm:gap-4 sm:px-5 sm:py-5 lg:px-6">
      <div className="min-w-0">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#7a8d00]">{eyebrow}</p>
        <h2 className="mt-1 text-[17px] font-black tracking-tight text-[#0f172a]">{title}</h2>
        {description ? <p className="mt-1 text-[11px] font-medium text-slate-500">{description}</p> : null}
      </div>
      {action ? (
        <Link href={action.href}>
          <div className="flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg px-0 py-1 text-[10.5px] font-extrabold text-[#657500] transition hover:text-[#506000] sm:px-2 sm:hover:bg-[#f4f6e9]">
            {action.label} <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </Link>
      ) : null}
    </div>
  );
}

const miniStatTone = {
  green: "text-emerald-700",
  navy: "text-[#0a2e5a]",
  amber: "text-amber-700",
  blue: "text-sky-700",
} as const;

function MiniStat({ label, value, tone, loading }: { label: string; value: string; tone: keyof typeof miniStatTone; loading: boolean }) {
  return (
    <div>
      <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      {loading ? <Skeleton className="mt-2 h-6 w-20" /> : <p className={`mt-1 text-base font-black ${miniStatTone[tone]}`}>{value}</p>}
    </div>
  );
}

function PipelineList({ pipeline }: { pipeline: Record<PipelineKey, number> }) {
  const rows: Array<{ key: PipelineKey; label: string; color: string }> = [
    { key: "new", label: "New enquiries", color: "bg-sky-500" },
    { key: "contacted", label: "Contacted", color: "bg-violet-500" },
    { key: "visited", label: "Demo / Visited", color: "bg-amber-500" },
    { key: "enrolled", label: "Enrolled", color: "bg-[#7d9100]" },
  ];
  const max = Math.max(1, ...rows.map((row) => pipeline[row.key] || 0));

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.key}>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-600">{row.label}</span>
            <span className="font-black text-slate-900">{pipeline[row.key] || 0}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${row.color}`} style={{ width: `${Math.max(4, ((pipeline[row.key] || 0) / max) * 100)}%` }} />
          </div>
        </div>
      ))}
      {pipeline.dropped > 0 ? <p className="text-[10px] font-semibold text-slate-400">{pipeline.dropped} dropped / lost leads</p> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes =
    status === "Running"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : status === "Completed"
        ? "bg-slate-50 text-slate-500 border-slate-100"
        : "bg-sky-50 text-sky-700 border-sky-100";
  return <span className={`rounded-full border px-2 py-0.5 text-[9px] font-extrabold ${classes}`}>{status}</span>;
}

const attentionTone = {
  red: "bg-red-50 text-red-600 border-red-100",
  amber: "bg-amber-50 text-amber-600 border-amber-100",
  blue: "bg-sky-50 text-sky-600 border-sky-100",
} as const;

function AttentionRow({
  count,
  title,
  detail,
  href,
  icon: Icon,
  tone,
}: {
  count: number;
  title: string;
  detail: string;
  href: string;
  icon: LucideIcon;
  tone: keyof typeof attentionTone;
}) {
  return (
    <Link href={href}>
      <div className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-100 p-3 transition hover:bg-slate-50/80">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${attentionTone[tone]}`}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-slate-900">{count}</span>
            <p className="truncate text-xs font-extrabold text-slate-700">{title}</p>
          </div>
          <p className="mt-0.5 line-clamp-2 text-[10.5px] font-medium leading-4 text-slate-500 sm:line-clamp-1">{detail}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-slate-500" />
      </div>
    </Link>
  );
}

function AttendanceCount({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div>
      <p className="font-medium text-slate-400">{label}</p>
      <p className={`mt-0.5 text-base font-black ${className}`}>{value}</p>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link href={href}>
      <div className="group flex min-h-[88px] cursor-pointer flex-col items-start justify-between rounded-2xl border border-slate-100 bg-[#fafbfc] p-3.5 transition hover:-translate-y-0.5 hover:border-[#d9dfad] hover:bg-[#f8f9f2]">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#0a2e5a] shadow-sm ring-1 ring-slate-100 transition group-hover:text-[#6b7d00]">
          <Icon className="h-[17px] w-[17px]" />
        </div>
        <p className="text-[11px] font-extrabold text-slate-700">{label}</p>
      </div>
    </Link>
  );
}

const facultyTone = {
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  slate: "bg-slate-50 text-slate-600",
} as const;

function FacultyStat({ label, value, tone }: { label: string; value: number; tone: keyof typeof facultyTone }) {
  return (
    <div className={`rounded-xl p-3 ${facultyTone[tone]}`}>
      <p className="text-lg font-black">{value}</p>
      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider opacity-75">{label}</p>
    </div>
  );
}

function ActivityIcon({ type }: { type: "student" | "payment" | "admission" }) {
  if (type === "payment") {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
        <CircleDollarSign className="h-[17px] w-[17px]" />
      </div>
    );
  }
  if (type === "admission") {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
        <UserPlus2 className="h-[17px] w-[17px]" />
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
      <GraduationCap className="h-[17px] w-[17px]" />
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center">
      <p className="max-w-sm text-xs font-semibold text-slate-400">{text}</p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-7 text-center">
      <Icon className="mx-auto h-7 w-7 text-slate-300" />
      <p className="mt-2 text-xs font-extrabold text-slate-600">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-[10.5px] font-medium leading-4 text-slate-400">{text}</p>
      {action ? (
        <Link href={action.href}>
          <span className="mt-3 inline-flex cursor-pointer items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-[10.5px] font-extrabold text-[#657500] shadow-sm ring-1 ring-slate-200 transition hover:bg-[#f7f8ef]">
            {action.label} <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      ) : null}
    </div>
  );
}
