import { Link } from "wouter";
import { useGetDashboardStats } from "@workspace/api-client-react";
import {
  Users,
  IndianRupee,
  FileText,
  ClipboardCheck,
  TrendingUp,
  AlertTriangle,
  Table2,
  ArrowRight,
  Wallet,
  UserX,
  BarChart3,
  Briefcase,
  BookOpen,
  UserPlus,
  UserMinus,
  Megaphone,
  CalendarDays,
  Activity,
  Tag,
  Package,
  Trash2,
  Download,
  Smartphone,
  GraduationCap,
} from "lucide-react";

type ReportCard = {
  title: string;
  desc: string;
  href: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  arrowColor: string;
};

const REPORTS: ReportCard[] = [
  {
    title: "Student Progress Report",
    desc: "Student-wise exam progress table with present report & rankings",
    href: "/report-card",
    icon: Table2,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    arrowColor: "text-emerald-500",
  },
  {
    title: "Attendance Report",
    desc: "Track daily, batch-wise and student-wise attendance rates",
    href: "/attendance",
    icon: ClipboardCheck,
    iconBg: "bg-sky-50",
    iconColor: "text-sky-600",
    arrowColor: "text-emerald-500",
  },
  {
    title: "Fee Collection",
    desc: "Monthly collection trends, payment method breakdown",
    href: "/finance",
    icon: Wallet,
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
    arrowColor: "text-teal-500",
  },
  {
    title: "Fee Defaulters",
    desc: "List of students with overdue fees and amounts",
    href: "/finance/student-fee-management",
    icon: AlertTriangle,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-500",
    arrowColor: "text-rose-400",
  },
  {
    title: "Student Performance",
    desc: "Individual student exam scores and ranking",
    href: "/report-card",
    icon: BarChart3,
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
    arrowColor: "text-emerald-500",
  },
  {
    title: "Batch Performance",
    desc: "Compare performance across different batches",
    href: "/batches",
    icon: Briefcase,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    arrowColor: "text-amber-500",
  },
  {
    title: "Exam Analysis",
    desc: "Pass/fail ratio, average scores per exam",
    href: "/exams",
    icon: FileText,
    iconBg: "bg-sky-50",
    iconColor: "text-sky-600",
    arrowColor: "text-sky-500",
  },
  {
    title: "Teacher Performance",
    desc: "Class load, subject coverage, homework given",
    href: "/staff",
    icon: GraduationCap,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    arrowColor: "text-violet-500",
  },
  {
    title: "Enrollment Report",
    desc: "Monthly new admissions and batch-wise strength",
    href: "/admissions",
    icon: UserPlus,
    iconBg: "bg-pink-50",
    iconColor: "text-pink-600",
    arrowColor: "text-pink-500",
  },
  {
    title: "Dropout Analysis",
    desc: "Inactive/dropped students analysis",
    href: "/students",
    icon: UserMinus,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-500",
    arrowColor: "text-rose-400",
  },
  {
    title: "Revenue Report",
    desc: "Monthly and yearly revenue trends",
    href: "/finance",
    icon: IndianRupee,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    arrowColor: "text-emerald-500",
  },
  {
    title: "Homework Report",
    desc: "Assignment submission rates and grades",
    href: "/homework",
    icon: BookOpen,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-500",
    arrowColor: "text-orange-500",
  },
  {
    title: "Communication Log",
    desc: "SMS, WhatsApp, email delivery tracking",
    href: "/notifications",
    icon: Megaphone,
    iconBg: "bg-stone-100",
    iconColor: "text-stone-600",
    arrowColor: "text-stone-500",
  },
  {
    title: "Timetable Utilization",
    desc: "Slot usage by day, teacher load & room utilisation",
    href: "/timetable",
    icon: CalendarDays,
    iconBg: "bg-lime-50",
    iconColor: "text-lime-700",
    arrowColor: "text-lime-600",
  },
  {
    title: "At-Risk Students",
    desc: "Early warning system for struggling students",
    href: "/students",
    icon: Activity,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-500",
    arrowColor: "text-rose-400",
  },
  {
    title: "Discount Analysis",
    desc: "Discounts given, impact on revenue",
    href: "/finance",
    icon: Tag,
    iconBg: "bg-cyan-50",
    iconColor: "text-cyan-600",
    arrowColor: "text-cyan-500",
  },
  {
    title: "Inventory Report",
    desc: "Stock levels, distributions, low-stock alerts & overdue returns",
    href: "/inventory",
    icon: Package,
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
    arrowColor: "text-teal-500",
  },
  {
    title: "Deleted Students (Trash)",
    desc: "View soft-deleted students, restore or permanently delete",
    href: "/students",
    icon: Trash2,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-500",
    arrowColor: "text-rose-400",
  },
  {
    title: "Export: Students CSV",
    desc: "Download full student list as CSV",
    href: "/students",
    icon: Download,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    arrowColor: "text-emerald-500",
  },
  {
    title: "Export: Fees CSV",
    desc: "Download fee collection data as CSV",
    href: "/finance",
    icon: Download,
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
    arrowColor: "text-teal-500",
  },
  {
    title: "Export: Attendance CSV",
    desc: "Download attendance records as CSV",
    href: "/attendance",
    icon: Download,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    arrowColor: "text-amber-500",
  },
  {
    title: "App Login Status",
    desc: "View last activity and login history on mobile app",
    href: "/analytics",
    icon: Smartphone,
    iconBg: "bg-stone-100",
    iconColor: "text-stone-600",
    arrowColor: "text-stone-500",
  },
];

export default function Analytics() {
  const { data: stats, isLoading } = useGetDashboardStats();

  const monthlyRev = stats?.monthlyRevenue ?? 0;
  const pendingFees = stats?.pendingFees ?? 0;
  const totalDemand = monthlyRev + pendingFees;
  const feePct =
    totalDemand > 0 ? Math.round((monthlyRev / totalDemand) * 100) : 0;

  const totalStudents = stats?.totalStudents ?? 0;
  const presentToday = stats?.presentToday ?? 0;
  const attendancePct =
    totalStudents > 0 ? ((presentToday / totalStudents) * 100).toFixed(1) : "0.0";
  const atRisk = Math.max(0, totalStudents - presentToday);

  {/*const kpis = [
    {
      label: "STUDENTS",
      value: isLoading ? "—" : String(totalStudents),
      icon: Users,
      bg: "bg-white",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      valueColor: "text-slate-900",
    },
    {
      label: "REVENUE",
      value: isLoading ? "—" : `₹${monthlyRev.toLocaleString("en-IN")}`,
      icon: IndianRupee,
      bg: "bg-white",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      valueColor: "text-emerald-700",
    },
    {
      label: "EXAMS",
      value: "57",
      icon: FileText,
      bg: "bg-white",
      iconBg: "bg-sky-50",
      iconColor: "text-sky-600",
      valueColor: "text-slate-900",
    },
    {
      label: "ATTENDANCE",
      value: isLoading ? "—" : `${attendancePct}%`,
      icon: ClipboardCheck,
      bg: "bg-white",
      iconBg: "bg-sky-50",
      iconColor: "text-sky-600",
      valueColor: "text-sky-700",
    },
    {
      label: "FEE COLL...",
      value: isLoading ? "—" : `${feePct}%`,
      icon: TrendingUp,
      bg: "bg-white",
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-600",
      valueColor: "text-indigo-700",
    },
    {
      label: "AT RISK",
      value: isLoading ? "—" : String(atRisk),
      icon: AlertTriangle,
      bg: "bg-white",
      iconBg: "bg-rose-50",
      iconColor: "text-rose-500",
      valueColor: "text-rose-600",
    },
  ];*/}

  return (
    <div className="min-h-screen bg-[#eef3e8] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#5f7a1f]">
            Reports & Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {REPORTS.length} comprehensive reports for insights
          </p>
        </div>

        {/* KPI Strip 
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <div
                key={k.label}
                className={`${k.bg} rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col items-start gap-2`}
              >
                <div className="flex items-center gap-2 w-full">
                  <div className={`w-8 h-8 rounded-xl ${k.iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${k.iconColor}`} />
                  </div>
                  <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase truncate">
                    {k.label}
                  </span>
                </div>
                <div className={`text-xl font-black tracking-tight ${k.valueColor} truncate w-full`}>
                  {k.value}
                </div>
              </div>
            );
          })}
        </div>*/}

        {/* Report Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {REPORTS.map((r) => {
            const Icon = r.icon;
            return (
              <Link key={r.title} href={r.href}>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer h-full flex items-start gap-4 group">
                  <div
                    className={`w-12 h-12 rounded-2xl ${r.iconBg} flex items-center justify-center shrink-0`}
                  >
                    <Icon className={`w-5 h-5 ${r.iconColor}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[15px] font-extrabold text-slate-800 leading-snug">
                        {r.title}
                      </h3>
                      <div
                        className={`w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${r.arrowColor}`}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                      {r.desc}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}