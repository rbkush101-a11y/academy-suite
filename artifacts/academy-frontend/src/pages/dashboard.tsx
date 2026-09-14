import { type ReactNode } from "react";
import { useGetDashboardStats } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  AlertTriangle,
  BarChart3,
  Cake,
  Calendar,
  CalendarCheck2,
  FileSpreadsheet,
  FileText,
  Megaphone,
  PieChart,
  UserPlus2,
  Users2,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

// 🟢 SMART DOB MATCHING HELPER
function isBirthdayToday(dobStr?: string | null): boolean {
  if (!dobStr) return false;
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  const isoMatch = String(dobStr).match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (m === currentMonth && d === currentDay) return true;
  }

  const indianMatch = String(dobStr).match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (indianMatch) {
    const d = parseInt(indianMatch[1], 10);
    const m = parseInt(indianMatch[2], 10);
    if (m === currentMonth && d === currentDay) return true;
  }

  try {
    const d = new Date(dobStr);
    if (!isNaN(d.getTime())) {
      return d.getMonth() + 1 === currentMonth && d.getDate() === currentDay;
    }
  } catch {}

  return false;
}

export default function Dashboard() {
  // 🔴 1. REAL Dashboard Stats API Hook
  const { data: stats, isLoading: isLoadingStats } = useGetDashboardStats();

  // 🔴 2. Real Calculations for Metric Cards
  const monthlyRev = stats?.monthlyRevenue ?? 0;
  const pendingFees = stats?.pendingFees ?? 0;
  const totalDemand = monthlyRev + pendingFees;
  
  // Real Fee Collection Percentage Calculation
  const feeCollectionPct = totalDemand > 0 
    ? ((monthlyRev / totalDemand) * 100).toFixed(1) + "%" 
    : "0.0%";

  // Real At-Risk Count (Absent students today needing attention)
  const totalStud = stats?.totalStudents ?? 0;
  const presentTod = stats?.presentToday ?? 0;
  const atRiskCount = Math.max(0, totalStud - presentTod);

  // 🔴 3. Fetch Students Real Data for DOB Matching
  const { data: studentsList = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ["all-students-for-birthdays"],
    queryFn: async () => {
      const token = localStorage.getItem("coach_sutra_token");
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const endpoints = ["/api/students", "/api/academic/students", "/api/students/all"];
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, { headers });
          if (res.ok) {
            const data = await res.json();
            const arr = Array.isArray(data) ? data : data.data || data.students || [];
            if (arr.length > 0) return arr;
          }
        } catch {}
      }
      return [];
    },
  });

  // 🔴 4. Fetch Staff Real Data for DOB Matching
  const { data: staffList = [], isLoading: isLoadingStaff } = useQuery({
    queryKey: ["all-staff-for-birthdays"],
    queryFn: async () => {
      const token = localStorage.getItem("coach_sutra_token");
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const endpoints = ["/api/staff", "/api/academic/staff", "/api/staff/all"];
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, { headers });
          if (res.ok) {
            const data = await res.json();
            const arr = Array.isArray(data) ? data : data.data || data.staff || [];
            if (arr.length > 0) return arr;
          }
        } catch {}
      }
      return [];
    },
  });

  const todayLabel = format(new Date(), "EEEE, dd MMMM yyyy");
  const coachingName = localStorage.getItem("coaching_name") || "Second School Classes";

  // Filter Today's Student Birthdays
  const studentBirthdays = studentsList
    .filter((s: any) => isBirthdayToday(s.dob || s.dateOfBirth || s.birthDate || s.birth_date))
    .map((s: any) => ({
      id: s.id || String(s._id),
      name: s.name || s.fullName || s.studentName || "Student",
      detail: s.batchName || s.batch || s.courseName || s.course || s.category || "Student",
      avatar: s.avatar || s.photo || s.profileImage || "",
      phone: s.phone || s.mobile || s.parentPhone || s.contactNumber || "",
    }));

  // Filter Today's Staff Birthdays
  const staffBirthdays = staffList
    .filter((s: any) => isBirthdayToday(s.dob || s.dateOfBirth || s.birthDate || s.birth_date))
    .map((s: any) => ({
      id: s.id || String(s._id),
      name: s.name || s.fullName || s.staffName || "Staff Member",
      detail: s.designation || s.department || s.role || s.subject || "Faculty",
      avatar: s.avatar || s.photo || s.profileImage || "",
      phone: s.phone || s.mobile || s.contactNumber || "",
    }));

  const isLoadingBirthdays = isLoadingStudents || isLoadingStaff;

  return (
    <div className="space-y-6">
      
      {/* ================= 1. TOP HERO + REAL METRICS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* HERO BANNER */}
        <div className="lg:col-span-6 bg-[#024a53] rounded-[28px] p-7 md:p-8 relative overflow-hidden flex flex-col justify-between shadow-sm min-h-[300px]">
          <div className="relative z-10 max-w-[60%] flex flex-col justify-between h-full">
            <div>
              <h1 className="text-3xl md:text-[34px] font-extrabold text-white leading-tight tracking-tight">
                {coachingName}
              </h1>
              <div className="flex items-center text-white/90 text-sm font-semibold mt-3 gap-2">
                <Calendar className="w-4 h-4 text-white" />
                <span>{todayLabel}</span>
              </div>
              <p className="text-white/60 text-xs font-medium mt-2">
                - Powered by CoachSutra AI
              </p>
            </div>

            <div className="flex flex-col gap-2.5 mt-8">
              <div className="inline-flex items-center gap-2.5 bg-[#00373f] border border-[#01636f] px-4 py-2 rounded-full text-white text-xs font-bold w-fit shadow-inner">
                <Users2 className="w-4 h-4 text-white/90" />
                {isLoadingStats ? (
                  <Skeleton className="h-4 w-16 bg-white/20" />
                ) : (
                  <span>{stats?.totalStudents ?? 0} Students</span>
                )}
              </div>

              <div className="inline-flex items-center gap-2.5 bg-[#00373f] border border-[#01636f] px-4 py-2 rounded-full text-white text-xs font-bold w-fit shadow-inner">
                <Wallet className="w-4 h-4 text-emerald-400" />
                {isLoadingStats ? (
                  <Skeleton className="h-4 w-20 bg-white/20" />
                ) : (
                  <span>
                    ₹{monthlyRev.toLocaleString("en-IN")} This Month
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="absolute right-2 bottom-2 w-[48%] h-[90%] pointer-events-none flex items-center justify-center">
            <img
              src="https://cdn-icons-png.flaticon.com/512/3281/3281323.png"
              alt="3D Dashboard Illustration"
              className="w-full h-full object-contain drop-shadow-xl"
            />
          </div>
        </div>

        {/* 4 REAL METRIC CARDS */}
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Card 1: STUDENTS */}
          <MetricCard
            href="/students"
            title="STUDENTS"
            value={stats?.totalStudents ?? 0}
            isLoading={isLoadingStats}
            topBarColor="bg-[#024a53]"
            valueColor="text-[#024a53]"
            icon={Users2}
            iconBg="bg-slate-100 text-slate-400"
            subtext={`+${stats?.admissionEnquiries ?? 0} enquiries`}
            subtextColor="text-emerald-500 font-semibold"
            waveColor="#024a53"
          />

          {/* Card 2: REVENUE (MONTH) - REAL CONNECTED */}
          <MetricCard
            href="/finance/student-fee-management"
            title="REVENUE (MONTH)"
            value={`₹${monthlyRev.toLocaleString("en-IN")}`}
            isLoading={isLoadingStats}
            topBarColor="bg-emerald-400"
            valueColor="text-emerald-500"
            icon={Wallet}
            iconBg="bg-emerald-50 text-emerald-400"
            subtext={`₹${pendingFees.toLocaleString("en-IN")} pending`}
            subtextColor="text-amber-500 font-semibold"
            waveColor="#10b981"
          />

          {/* Card 3: AT-RISK STUDENTS - REAL CONNECTED 
          <MetricCard
            href="/attendance"
            title="AT-RISK STUDENTS"
            value={atRiskCount}
            isLoading={isLoadingStats}
            topBarColor="bg-red-400"
            valueColor="text-red-500"
            icon={AlertTriangle}
            iconBg="bg-red-50 text-red-400"
            subtext={atRiskCount > 0 ? "Absent today · Needs attention" : "All students present"}
            subtextColor="text-emerald-500 font-semibold"
            waveColor="#ef4444"
          />
          */}

          {/* Card 4: FEE COLLECTION - REAL CONNECTED */}
          <MetricCard
            href="/analytics"
            title="FEE COLLECTION"
            value={feeCollectionPct}
            isLoading={isLoadingStats}
            topBarColor="bg-sky-400"
            valueColor="text-sky-500"
            icon={PieChart}
            iconBg="bg-sky-50 text-sky-400"
            subtext={`${stats?.totalStaff ?? 0} faculty · ${stats?.totalBatches ?? 0} batches`}
            subtextColor="text-slate-400 font-medium"
            waveColor="#0284c7"
          />

        </div>
      </div>

      {/* ================= 2. QUICK ACTIONS (MIDDLE) ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3.5 pt-2">
        <ActionButton href="/students?admit=true" label="Add Student">
          <UserPlus2 className="w-7 h-7 text-teal-600" />
        </ActionButton>

        <ActionButton href="/exams" label="New Exam">
          <FileText className="w-7 h-7 text-cyan-500" />
        </ActionButton>

        <ActionButton href="/attendance" label="Attendance">
          <CalendarCheck2 className="w-7 h-7 text-emerald-500" />
        </ActionButton>

        <ActionButton href="/finance" label="Fees">
          <Wallet className="w-7 h-7 text-amber-500" />
        </ActionButton>

        <ActionButton href="/notifications" label="Broadcast">
          <Megaphone className="w-7 h-7 text-red-500" />
        </ActionButton>

        <ActionButton href="/homework" label="Homework">
          <FileSpreadsheet className="w-7 h-7 text-blue-500" />
        </ActionButton>

        <ActionButton href="/admissions" label="Lead CRM">
          <Users2 className="w-7 h-7 text-purple-600" />
        </ActionButton>

        <ActionButton href="/analytics" label="Reports">
          <BarChart3 className="w-7 h-7 text-pink-500" />
        </ActionButton>
      </div>

      {/* ================= 3. BIRTHDAYS SECTION (BOTTOM) ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
        <BirthdayCard
          title="Today's Student Birthdays"
          emptyText="No student birthdays today"
          topBarColor="bg-sky-500"
          iconColor="text-pink-500"
          items={studentBirthdays}
          isLoading={isLoadingBirthdays}
        />

        <BirthdayCard
          title="Today's Staff Birthdays"
          emptyText="No staff birthdays today"
          topBarColor="bg-teal-600"
          iconColor="text-teal-600"
          items={staffBirthdays}
          isLoading={isLoadingBirthdays}
        />
      </div>

    </div>
  );
}

/* ================= REUSABLE COMPONENTS ================= */

function MetricCard({
  title,
  value,
  isLoading,
  topBarColor,
  valueColor,
  icon: Icon,
  iconBg,
  subtext,
  subtextColor,
  waveColor,
  href,
}: {
  title: string;
  value: ReactNode;
  isLoading: boolean;
  topBarColor: string;
  valueColor: string;
  icon: LucideIcon;
  iconBg: string;
  subtext: string;
  subtextColor: string;
  waveColor: string;
  href?: string;
}) {
  const cardContent = (
    <>
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${topBarColor}`} />
      <div className="relative z-10 flex justify-between items-start">
        <div>
          {isLoading ? (
            <Skeleton className="h-9 w-24 mb-1" />
          ) : (
            <div className={`text-3xl md:text-[32px] font-extrabold tracking-tight ${valueColor}`}>
              {value}
            </div>
          )}
          <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mt-1">
            {title}
          </div>
        </div>

        <div className={`p-2.5 rounded-xl ${iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className={`relative z-10 text-xs ${subtextColor} mt-3`}>
        {isLoading ? <Skeleton className="h-3.5 w-28" /> : subtext}
      </div>

      <svg
        className="absolute bottom-0 right-0 w-32 h-12 opacity-15 pointer-events-none"
        viewBox="0 0 100 40"
        fill="none"
      >
        <path
          d="M0 30 Q 30 10, 60 25 T 100 5 L 100 40 L 0 40 Z"
          fill={waveColor}
        />
      </svg>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full w-full transition-all duration-200 hover:-translate-y-1 hover:shadow-lg cursor-pointer">
        <div className="bg-white rounded-[22px] p-5 relative overflow-hidden flex flex-col justify-between shadow-sm border border-slate-100 min-h-[135px] h-full">
          {cardContent}
        </div>
      </Link>
    );
  }

  return (
    <div className="bg-white rounded-[22px] p-5 relative overflow-hidden flex flex-col justify-between shadow-sm border border-slate-100 min-h-[135px]">
      {cardContent}
    </div>
  );
}

function BirthdayCard({
  title,
  emptyText,
  topBarColor,
  iconColor,
  items = [],
  isLoading = false,
}: {
  title: string;
  emptyText: string;
  topBarColor: string;
  iconColor: string;
  items?: Array<{ id?: string; name: string; detail?: string; avatar?: string; phone?: string }>;
  isLoading?: boolean;
}) {
  const dateFormatted = format(new Date(), "dd MMMM yyyy");

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
      <div className={`h-1.5 w-full ${topBarColor}`} />

      <div className="bg-[#e8f2f6] px-5 py-3.5 flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <Cake className={`w-5 h-5 ${iconColor}`} />
          <h3 className="text-base font-extrabold text-[#0f172a]">{title}</h3>
        </div>
        <span className="text-xs font-semibold text-slate-500">{dateFormatted}</span>
      </div>

      <div className="min-h-[160px] flex flex-col justify-center">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-slate-400">
            <Cake className="w-10 h-10 mb-2 text-slate-300" />
            <p className="text-xs font-medium text-slate-400">{emptyText}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto p-2">
            {items.map((person, idx) => (
              <div
                key={person.id || idx}
                className="p-3 flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  {person.avatar ? (
                    <img
                      src={person.avatar}
                      alt={person.name}
                      className="w-10 h-10 rounded-full object-cover border border-amber-200 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-extrabold text-sm border border-amber-200 shrink-0">
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      {person.name}
                      <span className="text-xs">🎉</span>
                    </h4>
                    <p className="text-xs text-slate-500">{person.detail || "Wishing a great day!"}</p>
                  </div>
                </div>

                {person.phone ? (
                  <a
                    href={`https://wa.me/${person.phone}?text=Happy%20Birthday%20${encodeURIComponent(
                      person.name
                    )}!%20Wishing%20you%20a%20wonderful%20year%20ahead.`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1 shrink-0"
                  >
                    Wish 🎂
                  </a>
                ) : (
                  <span className="px-3 py-1 rounded-lg bg-pink-50 text-pink-600 text-xs font-bold border border-pink-100">
                    Birthday Today 🎉
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <Link href={href}>
      <div className="bg-white rounded-[22px] p-4 flex flex-col items-center justify-center gap-3 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-28 text-center group">
        <div className="group-hover:scale-110 transition-transform duration-200">
          {children}
        </div>
        <span className="text-xs font-bold text-slate-700 tracking-tight">
          {label}
        </span>
      </div>
    </Link>
  );
}