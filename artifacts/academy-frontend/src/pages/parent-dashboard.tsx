import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  BookMarked,
  BookOpen,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  Home,
  IdCard,
  IndianRupee,
  LockKeyhole,
  LogOut,
  Menu,
  RefreshCw,
  School,
  Settings,
  ShieldCheck,
  Trophy,
  User,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";

type Child = {
  id: string;
  name: string;
  enrollmentNo: string;
  photoDataUrl: string;
  className: string;
  section?: string;
  courseName: string;
  batchName: string;
};

type PortalData = {
  institute?: {
    id?: string;
    name?: string;
    logoDataUrl?: string;
    academicYear?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  parent: {
    id: string;
    name: string;
    email: string;
    phone: string;
    photoDataUrl?: string;
  };
  children: Child[];
  selectedChild: null | {
    id: string;
    name: string;
    enrollmentNo: string;
    photoDataUrl: string;
    className: string;
    section: string;
    board: string;
    schoolName: string;
    academicYear: string;
    courseName: string;
    batchName: string;
    batchSchedule: string;
  };
  attendance: {
    present: number;
    absent: number;
    late: number;
    total: number;
    percentage: number;
    recent: Array<{
      id: string;
      date: string;
      status: string;
      remarks: string;
    }>;
  };
  fees: {
    paid: number;
    pending: number;
    overdue: number;
    outstanding: number;
    collectionRate: number;
    recent: Array<any>;
  };
  homework: Array<any>;
  exams: Array<any>;
  timetable: Array<any>;
  teachers?: Array<{
    id: string;
    name: string;
    photoDataUrl?: string;
    positionTitle?: string;
    subject?: string;
  }>;
  message?: string;
};

type Screen =
  | "parent-home"
  | "student-home"
  | "profile"
  | "coaching"
  | "idcard"
  | "teachers"
  | "timetable"
  | "results"
  | "fees"
  | "homework"
  | "lessons"
  | "attendance"
  | "tests"
  | "notifications";

const rupee = (value: unknown) =>
  `₹${Number(value ?? 0).toLocaleString("en-IN")}`;

const dateLabel = (value?: string | null) => {
  if (!value) return "—";
  const parsed = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("coach_sutra_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function initials(value?: string) {
  const words = String(value || "P")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function classLabel(child?: { className?: string; section?: string } | null) {
  if (!child) return "Class not set";
  return [child.className, child.section ? `Section ${child.section}` : ""]
    .filter(Boolean)
    .join(" • ") || "Class not set";
}

function toneForStatus(status?: string) {
  switch (status) {
    case "paid":
    case "present":
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "overdue":
    case "absent":
      return "border-red-200 bg-red-50 text-red-700";
    case "partial":
    case "late":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
}

function BrandLogo({
  logo,
  name,
  className = "h-14 w-14",
}: {
  logo?: string;
  name: string;
  className?: string;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/55 bg-white shadow-lg ${className}`}
    >
      {logo ? (
        <img
          src={logo}
          alt={`${name} logo`}
          className="h-full w-full object-contain p-1.5"
        />
      ) : (
        <GraduationCap className="h-7 w-7 text-blue-600" strokeWidth={2.2} />
      )}
    </div>
  );
}

function Avatar({
  src,
  name,
  className = "h-11 w-11",
  square = false,
}: {
  src?: string;
  name?: string;
  className?: string;
  square?: boolean;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden ${square ? "rounded-[16px]" : "rounded-full"} bg-blue-100 font-black text-blue-700 ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt={name || "Profile"}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  );
}

function QuickCard({
  label,
  icon,
  tone,
  onClick,
  badge,
}: {
  label: string;
  icon: React.ReactNode;
  tone:
    | "blue"
    | "violet"
    | "emerald"
    | "amber"
    | "rose"
    | "orange"
    | "cyan"
    | "indigo";
  onClick: () => void;
  badge?: string;
}) {
  const tones = {
    blue: "bg-sky-100 text-blue-600",
    violet: "bg-violet-100 text-violet-600",
    emerald: "bg-emerald-100 text-emerald-600",
    amber: "bg-orange-100 text-orange-500",
    rose: "bg-rose-100 text-rose-500",
    orange: "bg-amber-100 text-amber-600",
    cyan: "bg-cyan-100 text-cyan-600",
    indigo: "bg-indigo-100 text-indigo-600",
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex min-h-[96px] flex-col items-center justify-center rounded-[18px] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-2.5 py-3 text-center shadow-[0_16px_32px_-24px_rgba(2,18,45,0.85)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-22px_rgba(17,94,189,0.35)] active:scale-95"
    >
      {badge && (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[8px] font-black text-white">
          {badge}
        </span>
      )}
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-[13px] shadow-inner ${tones[tone]}`}
      >
        {icon}
      </span>
      <span className="mt-2 text-[10.5px] font-black leading-4 tracking-[-0.01em] text-[#071a3f]">
        {label}
      </span>
    </button>
  );
}

function DrawerItem({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${
        active
          ? "border-l-[3px] border-cyan-300 bg-[linear-gradient(90deg,rgba(15,125,255,.34),rgba(26,75,160,.18))] text-white shadow-[0_10px_24px_-16px_rgba(12,125,255,0.85)]"
          : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      <span className={active ? "text-cyan-300" : "text-slate-400"}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function BottomNavButton({
  label,
  icon,
  active,
  onClick,
  dot,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  dot?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative mx-1 flex h-14 flex-1 flex-col items-center justify-center rounded-2xl transition active:scale-90 ${
        active
          ? "bg-[linear-gradient(180deg,rgba(20,111,230,.42),rgba(8,67,157,.28))] text-cyan-200 font-extrabold shadow-[inset_0_0_0_1px_rgba(71,188,255,.08)]"
          : "text-slate-300 font-semibold"
      }`}
    >
      <span className="relative">
        {icon}
        {dot && (
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full border border-[#03142f] bg-red-500" />
        )}
      </span>
      <span className="mt-1 text-[9px]">{label}</span>
    </button>
  );
}

function SectionShell({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-fadeIn">
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white shadow-[0_10px_22px_-18px_rgba(0,0,0,.8)] active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-lg font-black text-white">{title}</h2>
          {subtitle && <p className="text-[10px] text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function ParentDashboard() {
  const [, setLocation] = useLocation();

  const [data, setData] = useState<PortalData | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [screen, setScreen] = useState<Screen>("parent-home");
  const [lastStudentScreen, setLastStudentScreen] =
    useState<Screen>("student-home");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [profileEdit, setProfileEdit] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    photoDataUrl: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [readNotifications, setReadNotifications] = useState<string[]>([]);

  const load = async (studentId = selectedStudentId) => {
    setLoading(true);
    setError("");

    try {
      const query = studentId
        ? `?studentId=${encodeURIComponent(studentId)}`
        : "";

      const response = await fetch(`/api/parent/overview${query}`, {
        headers: authHeaders(),
        credentials: "include",
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body?.error || "Unable to load parent portal");
      }

      setData(body);

      if (body.selectedChild?.id) {
        setSelectedStudentId(body.selectedChild.id);
      }

      if (body.parent) {
        setProfileForm({
          name: body.parent.name || "",
          phone: body.parent.phone || "",
          photoDataUrl: body.parent.photoDataUrl || "",
        });
      }
    } catch (err: any) {
      setError(err?.message || "Unable to load parent portal");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = () => {
    const token = localStorage.getItem("coach_sutra_token");

    if (token) {
      void fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      }).catch(() => {});
    }

    [
      "coach_sutra_token",
      "coach_sutra_user_role",
      "coach_sutra_user",
      "foundation_branches",
      "foundation_institute_id",
      "active_branch_id",
      "active_branch_name",
    ].forEach((key) => localStorage.removeItem(key));

    window.dispatchEvent(new Event("storage"));
    setLocation("/login");
  };

  const instituteName =
    data?.institute?.name ||
    localStorage.getItem("foundation_institute_name") ||
    localStorage.getItem("institute_name") ||
    "Second School Classes";

  const instituteLogo = (() => {
    if (data?.institute?.logoDataUrl) return data.institute.logoDataUrl;

    const direct = localStorage.getItem("coach_sutra_logo") || "";
    if (direct) return direct;

    try {
      const raw = localStorage.getItem("coach_sutra_general_info");
      const parsed = raw ? JSON.parse(raw) : {};
      return String(parsed?.logoUrl || parsed?.logoDataUrl || "");
    } catch {
      return "";
    }
  })();

  const parentName = data?.parent?.name || "Parent";
  const selectedChild = data?.selectedChild || null;

  const teacherList = useMemo(() => {
    if (data?.teachers?.length) return data.teachers;

    const map = new Map<string, any>();
    (data?.timetable || []).forEach((row: any) => {
      const name = String(row.teacherName || "").trim();
      if (!name) return;
      map.set(name, {
        id: row.teacherId || name,
        name,
        photoDataUrl: row.teacherPhotoDataUrl || "",
        positionTitle: row.teacherPositionTitle || "",
        subject: row.subjectName || "",
      });
    });
    return [...map.values()];
  }, [data?.teachers, data?.timetable]);

  const lessonSubjects = useMemo(() => {
    const names = new Set<string>();
    (data?.timetable || []).forEach((row: any) => {
      if (row.subjectName) names.add(String(row.subjectName));
    });
    (data?.homework || []).forEach((row: any) => {
      if (row.subjectName) names.add(String(row.subjectName));
    });
    (data?.exams || []).forEach((row: any) => {
      if (row.subjectName) names.add(String(row.subjectName));
    });
    return [...names];
  }, [data?.timetable, data?.homework, data?.exams]);

  const gradedExams = useMemo(
    () =>
      (data?.exams || []).filter(
        (exam: any) =>
          exam.marksObtained !== null &&
          exam.marksObtained !== undefined
      ),
    [data?.exams]
  );

  const notifications = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      description: string;
      screen: Screen;
    }> = [];

    const overdue = Number(data?.fees?.overdue ?? 0);
    const outstanding = Number(data?.fees?.outstanding ?? 0);

    if (overdue > 0) {
      items.push({
        id: "fee-overdue",
        title: "Fee overdue",
        description: `${rupee(overdue)} is overdue for ${selectedChild?.name || "your child"}.`,
        screen: "fees",
      });
    } else if (outstanding > 0) {
      items.push({
        id: "fee-due",
        title: "Fee payment due",
        description: `${rupee(outstanding)} is currently outstanding.`,
        screen: "fees",
      });
    }

    (data?.homework || []).slice(0, 3).forEach((item: any) => {
      items.push({
        id: `hw-${item.id}`,
        title: item.title || "Homework",
        description: `${item.subjectName || "Subject"} • Due ${dateLabel(item.dueDate)}`,
        screen: "homework",
      });
    });

    (data?.exams || []).slice(0, 3).forEach((exam: any) => {
      items.push({
        id: `exam-${exam.id}`,
        title: exam.name || "Test",
        description: `${exam.subjectName || "Subject"} • ${dateLabel(exam.date)}`,
        screen: "tests",
      });
    });

    return items.slice(0, 8);
  }, [
    data?.fees?.overdue,
    data?.fees?.outstanding,
    data?.homework,
    data?.exams,
    selectedChild?.name,
  ]);

  const unreadCount = notifications.filter(
    (notification) => !readNotifications.includes(notification.id)
  ).length;

  const openScreen = (next: Screen) => {
    setDrawerOpen(false);
    setScreen(next);

    if (
      [
        "student-home",
        "idcard",
        "teachers",
        "timetable",
        "results",
        "fees",
        "homework",
        "lessons",
        "attendance",
        "tests",
      ].includes(next)
    ) {
      setLastStudentScreen(next);
    }
  };

  const chooseChild = async (childId: string) => {
    setSelectedStudentId(childId);
    await load(childId);
    openScreen("student-home");
  };

  const saveParentProfile = async () => {
    if (!profileForm.name.trim()) {
      setProfileMessage("Name is required.");
      return;
    }

    setProfileSaving(true);
    setProfileMessage("");

    try {
      const response = await fetch("/api/parent/self-update", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          name: profileForm.name.trim(),
          phone: profileForm.phone.trim(),
          photoDataUrl: profileForm.photoDataUrl,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || "Profile update failed.");
      }

      setProfileMessage("Profile updated successfully.");
      setProfileEdit(false);
      await load();
    } catch (err: any) {
      setProfileMessage(err?.message || "Profile update failed.");
    } finally {
      setProfileSaving(false);
    }
  };

  const updatePassword = async () => {
    setPasswordMessage("");

    if (!passwordForm.currentPassword) {
      setPasswordMessage("Current password is required.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage("New password and confirm password do not match.");
      return;
    }

    setPasswordSaving(true);

    try {
      const response = await fetch("/api/parent/self-password", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body?.error || "Unable to update password.");
      }

      setPasswordMessage("Password updated successfully.");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: any) {
      setPasswordMessage(err?.message || "Unable to update password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleParentPhoto = (file?: File) => {
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setProfileMessage("Photo size must be 2 MB or less.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfileForm((current) => ({
        ...current,
        photoDataUrl: String(reader.result || ""),
      }));
    };
    reader.readAsDataURL(file);
  };

  const screenTitle =
    screen === "parent-home"
      ? "Parent Dashboard"
      : screen === "student-home"
        ? "Student Dashboard"
        : screen === "profile"
          ? "Profile & Settings"
          : screen === "notifications"
            ? "Notifications"
            : screen === "coaching"
              ? "Coaching Information"
              : "Student Dashboard";

  if (loading && !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#03142f] px-6 text-white">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10">
          <School className="h-8 w-8 text-cyan-300" />
        </div>
        <h1 className="mt-4 text-lg font-black">PARENT PORTAL</h1>
        <p className="mt-1 text-xs text-slate-400">
          Loading family dashboard...
        </p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes parentFadeIn {
          from { opacity: 0; transform: translateY(7px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: parentFadeIn .22s ease-out both; }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 0px); }
        html, body, #root { min-height: 100%; background: #031733; }
        body { overscroll-behavior-y: contain; -webkit-tap-highlight-color: transparent; font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif; }
      `}</style>

      <div className="relative min-h-[100svh] overflow-x-hidden bg-[radial-gradient(circle_at_12%_-10%,rgba(45,126,255,.30),transparent_34%),radial-gradient(circle_at_96%_18%,rgba(32,112,224,.18),transparent_28%),linear-gradient(180deg,#0a2a59_0%,#062149_19%,#041b3d_44%,#031733_70%,#02132c_100%)] pb-24 text-white antialiased">
        <div className="pointer-events-none fixed inset-x-0 top-0 h-[38vh] bg-[linear-gradient(180deg,rgba(13,55,111,.40),transparent)]" />
        <div className="pointer-events-none fixed -left-28 top-[22vh] h-72 w-72 rounded-full bg-blue-500/[0.08] blur-3xl" />
        <div className="pointer-events-none fixed -right-28 top-[36vh] h-72 w-72 rounded-full bg-cyan-400/[0.045] blur-3xl" />
        <div className="pointer-events-none fixed inset-x-0 bottom-0 h-[34vh] bg-[radial-gradient(ellipse_at_50%_110%,rgba(10,78,170,.30),transparent_66%)]" />
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-white/[0.055] bg-[linear-gradient(180deg,rgba(7,37,78,.97),rgba(4,25,57,.95))] px-5 py-4 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-lg items-center gap-3.5">
            <button
              type="button"
              aria-label={screen === "parent-home" || screen === "student-home" ? "Open menu" : "Go back"}
              onClick={() => {
                if (screen === "parent-home" || screen === "student-home") setDrawerOpen(true);
                else openScreen(screen === "profile" || screen === "notifications" || screen === "coaching" ? "parent-home" : "student-home");
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition hover:bg-white/[0.07] active:scale-95"
            >
              {screen === "parent-home" || screen === "student-home" ? (
                <Menu className="h-[25px] w-[25px]" />
              ) : (
                <ArrowLeft className="h-[25px] w-[25px]" />
              )}
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[18px] font-black leading-tight tracking-[-0.025em]">
                {screenTitle}
              </h1>
              <p className="mt-0.5 truncate text-[11px] font-medium text-slate-300">
                {instituteName}
              </p>
            </div>

            {screen === "parent-home" || screen === "student-home" ? (
              <button
                type="button"
                aria-label="Open profile"
                onClick={() => openScreen("profile")}
                className="relative rounded-full border-2 border-white/90 bg-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.28)] transition active:scale-95"
              >
                <Avatar
                  src={data?.parent?.photoDataUrl}
                  name={parentName}
                  className="h-11 w-11"
                />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
              </button>
            ) : (
              <div className="h-11 w-11" />
            )}
          </div>
        </header>

        {/* Drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-[100]">
            <button
              type="button"
              className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
            />
            <aside className="absolute inset-y-0 left-0 flex w-[292px] flex-col border-r border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(28,111,235,.20),transparent_32%),linear-gradient(180deg,#071f49_0%,#03162f_100%)] p-4 shadow-[18px_0_50px_rgba(0,0,0,.38)]">
              <div className="flex items-center gap-3 px-2 py-2">
                <BrandLogo
                  logo={instituteLogo}
                  name={instituteName}
                  className="h-11 w-11"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{instituteName}</p>
                  <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-cyan-300">
                    Parent App
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="ml-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-1">
                <DrawerItem
                  label="Parent Dashboard"
                  icon={<Home className="h-[18px] w-[18px]" />}
                  active={screen === "parent-home"}
                  onClick={() => openScreen("parent-home")}
                />
                <DrawerItem
                  label="Student Dashboard"
                  icon={<Users className="h-[18px] w-[18px]" />}
                  active={screen === "student-home"}
                  onClick={() => openScreen("student-home")}
                />
                <DrawerItem
                  label="Coaching Information"
                  icon={<FileText className="h-[18px] w-[18px]" />}
                  active={screen === "coaching"}
                  onClick={() => openScreen("coaching")}
                />
                <DrawerItem
                  label="Settings"
                  icon={<Settings className="h-[18px] w-[18px]" />}
                  active={screen === "profile"}
                  onClick={() => openScreen("profile")}
                />
              </div>

              <div className="mt-auto border-t border-white/15 pt-4">
                <DrawerItem
                  label="Sign Out"
                  icon={<LogOut className="h-[18px] w-[18px]" />}
                  onClick={logout}
                />
              </div>
            </aside>
          </div>
        )}

        <main className="relative z-10 mx-auto max-w-lg space-y-4 px-5 py-4">
          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-300/20 bg-red-500/10 p-3 text-xs font-semibold text-red-100">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
              <button
                type="button"
                onClick={() => void load()}
                className="ml-auto rounded-lg bg-white/10 px-2 py-1 text-[10px] font-black"
              >
                Retry
              </button>
            </div>
          )}

          {/* Parent Home */}
          {screen === "parent-home" && (
            <div className="flex min-h-[calc(100svh-145px)] flex-col animate-fadeIn">
              <section className="relative min-h-[196px] overflow-hidden rounded-[24px] border border-cyan-200/45 bg-[#087fe2] px-5 py-[18px] text-white shadow-[0_24px_50px_-25px_rgba(0,129,255,.82)]">
                <img
                  src="/parent-app/welcome-card-background.png"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,92,192,.12)_0%,rgba(0,66,170,.02)_48%,rgba(0,39,128,.06)_100%)]" />

                <div className="relative z-10 flex items-center gap-3.5">
                  <BrandLogo
                    logo={instituteLogo}
                    name={instituteName}
                    className="h-[74px] w-[74px]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-black leading-tight">{instituteName}</p>
                    <p className="mt-1 text-[10.5px] font-semibold text-blue-50/95">
                      Learn Today, Build Tomorrow
                    </p>
                  </div>
                </div>

                <div className="relative z-10 mt-5 max-w-[68%]">
                  <p className="text-[15px] font-extrabold leading-none text-white/95">Welcome</p>
                  <h2 className="mt-1.5 whitespace-nowrap text-[clamp(24px,6.4vw,31px)] font-black leading-[0.98] tracking-[-0.04em]">
                    {parentName}
                  </h2>
                </div>

              </section>

              <section className="mt-[20px]">
                <div className="mb-3">
                  <h2 className="text-[24px] font-black leading-none tracking-[-0.035em]">Your Children</h2>
                  <p className="mt-1.5 text-[12.5px] font-medium text-slate-300">
                    Tap a child to open their dashboard
                  </p>
                </div>

                <div className="space-y-2.5">
                  {(data?.children || []).map((child) => (
                    <button
                      type="button"
                      key={child.id}
                      onClick={() => void chooseChild(child.id)}
                      className="group flex min-h-[84px] w-full items-center gap-3 rounded-[18px] border border-[#d9e6f7] bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] px-3 py-2.5 text-left text-slate-950 shadow-[0_11px_24px_-18px_rgba(0,0,0,.68)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_28px_-19px_rgba(25,91,174,.32)] active:scale-[0.992]"
                    >
                      <Avatar
                        src={child.photoDataUrl}
                        name={child.name}
                        square
                        className="h-[62px] w-[62px] rounded-[15px] border border-slate-200 bg-slate-100 text-sm shadow-[0_6px_16px_-11px_rgba(12,46,97,.6)]"
                      />
                      <span className="min-w-0 flex-1 py-0.5">
                        <span className="block truncate text-[14.5px] font-black leading-tight text-[#071a3f]">
                          {child.name}
                        </span>
                        <span className="mt-1.5 block truncate text-[10.5px] font-semibold text-[#526a91]">
                          {child.enrollmentNo ? `Roll No. ${child.enrollmentNo}` : "Student ID"}
                          <span className="mx-1.5 text-slate-300">•</span>
                          {child.className || child.courseName || "Student"}
                        </span>
                        <span className="mt-1.5 inline-flex items-center gap-0.5 text-[9.5px] font-black text-[#1474f5]">
                          Open Dashboard
                          <ChevronRight className="h-3 w-3" />
                        </span>
                      </span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-[#4d7ebd] transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}

                  {(data?.children || []).length === 0 && (
                    <div className="rounded-[20px] border border-white/10 bg-white/5 p-6 text-center">
                      <Users className="mx-auto h-7 w-7 text-slate-500" />
                      <p className="mt-2 text-sm font-black">No child linked yet</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Ask the institute admin to link a student to this parent account.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <div className="mt-auto pt-8"><SchoolLandscape /></div>
            </div>
          )}

          {/* Student Dashboard inside Parent App */}
          {screen === "student-home" && (
            <div className="space-y-4 animate-fadeIn">
              {selectedChild ? (
                <>
                  <section className="relative overflow-hidden rounded-[26px] border border-cyan-200/35 bg-[linear-gradient(135deg,#0bb7e7_0%,#0878df_43%,#1749c9_100%)] px-5 py-5 shadow-[0_26px_58px_-30px_rgba(0,137,255,0.88)]">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={selectedChild.photoDataUrl}
                        name={selectedChild.name}
                        square className="h-16 w-16 border-2 border-white/75 shadow-[0_10px_22px_-12px_rgba(0,0,0,.45)]"
                      />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-100">
                          Student Dashboard
                        </p>
                        <h2 className="mt-1 truncate text-xl font-black">
                          {selectedChild.name}
                        </h2>
                        <p className="mt-1 truncate text-[10px] text-blue-100">
                          {classLabel(selectedChild)} •{" "}
                          {selectedChild.batchName || selectedChild.courseName || "Batch"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <MiniMetric
                        label="Attendance"
                        value={`${data?.attendance?.percentage || 0}%`}
                      />
                      <MiniMetric
                        label="Outstanding"
                        value={rupee(data?.fees?.outstanding || 0)}
                      />
                      <MiniMetric
                        label="Tests"
                        value={String(data?.exams?.length || 0)}
                      />
                    </div>
                  </section>

                  <div className="flex items-center justify-between gap-3 rounded-[18px] border border-white/10 bg-white/[0.055] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,.035)]">
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                        Viewing child
                      </p>
                      <p className="truncate text-xs font-black">
                        {selectedChild.name}
                      </p>
                    </div>
                    <select
                      value={selectedStudentId}
                      onChange={(event) => void chooseChild(event.target.value)}
                      className="max-w-[180px] rounded-xl border border-white/10 bg-[#061b3b] px-3 py-2 text-[10px] font-bold text-white outline-none ring-0 focus:border-cyan-300/40"
                    >
                      {(data?.children || []).map((child) => (
                        <option key={child.id} value={child.id}>
                          {child.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <QuickAccessGrid
                    data={data}
                    openScreen={openScreen}
                    homeworkCount={data?.homework?.length || 0}
                    showProfileAsStudent
                  />

                  <SchoolLandscape />
                </>
              ) : (
                <NoSelectedChild onBack={() => openScreen("parent-home")} />
              )}
            </div>
          )}

          {/* Profile & Settings */}
          {screen === "profile" && (
            <div className="animate-fadeIn pb-3">
              <div className="relative flex flex-col items-center pb-4 pt-2 text-center">
                <div className="pointer-events-none absolute -left-16 -top-10 h-36 w-36 rounded-full bg-blue-400/[0.08]" />
                <div className="pointer-events-none absolute -right-20 top-0 h-36 w-36 rounded-full border border-blue-300/[0.07] bg-blue-400/[0.03]" />
                <div className="relative">
                  <Avatar
                    src={profileForm.photoDataUrl || data?.parent?.photoDataUrl}
                    name={profileForm.name || parentName}
                    className="h-[124px] w-[124px] border-[4px] border-white/95 shadow-[0_18px_42px_rgba(0,0,0,.34)]"
                  />
                  <label className="absolute bottom-1 right-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-[3px] border-white bg-[#1684ff] text-white shadow-lg">
                    <Camera className="h-[18px] w-[18px]" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handleParentPhoto(event.target.files?.[0])}
                    />
                  </label>
                </div>
                <h2 className="mt-4 text-[28px] font-black leading-tight tracking-[-0.03em]">
                  {data?.parent?.name || "Parent"}
                </h2>
              </div>

              <section className="mt-1 rounded-[19px] bg-white p-3 text-slate-950 shadow-[0_16px_34px_-21px_rgba(0,0,0,.62)]">
                {!profileEdit ? (
                  <button
                    type="button"
                    onClick={() => setProfileEdit(true)}
                    className="flex w-full items-center gap-3 rounded-[15px] border border-[#d9e7f9] bg-[#fbfdff] px-3 py-3 text-left"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-[#dff3ff] text-[#087df3]">
                      <User className="h-7 w-7" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[16px] font-black text-[#071a3f]">My Profile</span>
                      <span className="mt-0.5 block text-[11px] font-medium text-[#7183a3]">
                        View and edit your profile information
                      </span>
                    </span>
                    <ChevronRight className="h-5 w-5 text-[#5c7ca9]" />
                  </button>
                ) : (
                  <div className="space-y-3 p-1">
                    <ProfileInput label="Name" value={profileForm.name} onChange={(value) => setProfileForm((current) => ({ ...current, name: value }))} />
                    <ProfileInput label="Phone" value={profileForm.phone} onChange={(value) => setProfileForm((current) => ({ ...current, phone: value }))} />
                    <div>
                      <p className="text-[10px] font-bold text-slate-500">Email</p>
                      <p className="mt-1 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-600">
                        {data?.parent?.email || "—"}
                      </p>
                    </div>
                    {profileMessage && <p className="rounded-xl bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-600">{profileMessage}</p>}
                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={() => { setProfileEdit(false); setProfileMessage(""); setProfileForm({ name: data?.parent?.name || "", phone: data?.parent?.phone || "", photoDataUrl: data?.parent?.photoDataUrl || "" }); }} className="h-10 flex-1 rounded-xl border border-slate-200 text-xs font-black text-slate-600">Cancel</button>
                      <button type="button" disabled={profileSaving} onClick={() => void saveParentProfile()} className="h-10 flex-1 rounded-xl bg-[#071a3f] text-xs font-black text-white disabled:opacity-50">{profileSaving ? "Saving..." : "Save Profile"}</button>
                    </div>
                  </div>
                )}
              </section>

              <section className="mt-4 rounded-[19px] bg-white p-4 text-slate-950 shadow-[0_16px_34px_-21px_rgba(0,0,0,.62)]">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#e5efff] text-[#1474f5]">
                    <LockKeyhole className="h-5 w-5" />
                  </span>
                  <h3 className="text-[18px] font-black text-[#071a3f]">Change Password</h3>
                </div>

                <div className="mt-4 space-y-3.5">
                  <PasswordField label="Current Password" placeholder="Enter current password" value={passwordForm.currentPassword} show={showCurrent} onToggle={() => setShowCurrent((current) => !current)} onChange={(value) => setPasswordForm((current) => ({ ...current, currentPassword: value }))} />
                  <PasswordField label="New Password" placeholder="Enter new password" value={passwordForm.newPassword} show={showNew} onToggle={() => setShowNew((current) => !current)} onChange={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))} />
                  <PasswordField label="Confirm New Password" placeholder="Confirm new password" value={passwordForm.confirmPassword} show={showConfirm} onToggle={() => setShowConfirm((current) => !current)} onChange={(value) => setPasswordForm((current) => ({ ...current, confirmPassword: value }))} />

                  {passwordMessage && <p className="rounded-xl bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-600">{passwordMessage}</p>}

                  <button
                    type="button"
                    disabled={passwordSaving}
                    onClick={() => void updatePassword()}
                    className="flex h-[54px] w-full items-center justify-center rounded-[13px] bg-[linear-gradient(90deg,#12b9eb_0%,#087ff5_52%,#1264ee_100%)] text-[15px] font-black text-white shadow-[0_12px_24px_-12px_rgba(8,127,245,.9)] transition active:scale-[0.99] disabled:opacity-50"
                  >
                    <ShieldCheck className="mr-2 h-5 w-5" />
                    {passwordSaving ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* Coaching Info */}
          {screen === "coaching" && (
            <SectionShell
              title="Coaching Information"
              subtitle={instituteName}
              onBack={() => openScreen("parent-home")}
            >
              <div className="rounded-[24px] bg-white p-5 text-slate-950 shadow-lg">
                <div className="flex items-center gap-4">
                  <BrandLogo
                    logo={instituteLogo}
                    name={instituteName}
                    className="h-16 w-16 border-slate-200"
                  />
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-black text-[#071a3f]">
                      {instituteName}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Learn Today, Build Tomorrow
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  <InfoLine
                    label="Academic Year"
                    value={
                      data?.institute?.academicYear ||
                      selectedChild?.academicYear ||
                      "—"
                    }
                  />
                  <InfoLine
                    label="Course"
                    value={selectedChild?.courseName || "—"}
                  />
                  <InfoLine
                    label="Batch"
                    value={selectedChild?.batchName || "—"}
                  />
                  <InfoLine
                    label="Batch Schedule"
                    value={selectedChild?.batchSchedule || "—"}
                  />
                  <InfoLine
                    label="Phone"
                    value={data?.institute?.phone || "—"}
                  />
                  <InfoLine
                    label="Email"
                    value={data?.institute?.email || "—"}
                  />
                </div>
              </div>
            </SectionShell>
          )}

          {/* ID Card */}
          {screen === "idcard" && (
            <SectionShell
              title="ID Card"
              subtitle={selectedChild?.name}
              onBack={() => openScreen(lastStudentScreen === "idcard" ? "student-home" : lastStudentScreen)}
            >
              {selectedChild ? (
                <div className="overflow-hidden rounded-[26px] bg-white text-slate-950 shadow-2xl">
                  <div className="bg-[linear-gradient(135deg,#08a8e8,#1547c8)] p-5 text-white">
                    <div className="flex items-center gap-3">
                      <BrandLogo
                        logo={instituteLogo}
                        name={instituteName}
                        className="h-14 w-14"
                      />
                      <div>
                        <p className="text-sm font-black">{instituteName}</p>
                        <p className="text-[9px] text-blue-100">
                          Student Identity Card
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 text-center">
                    <Avatar
                      src={selectedChild.photoDataUrl}
                      name={selectedChild.name}
                      className="mx-auto h-24 w-24 border-4 border-blue-100"
                    />
                    <h3 className="mt-3 text-xl font-black text-[#071a3f]">
                      {selectedChild.name}
                    </h3>
                    <p className="mt-1 font-mono text-xs font-bold text-blue-600">
                      {selectedChild.enrollmentNo || selectedChild.id}
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-2 text-left">
                      <IdInfo label="Class" value={classLabel(selectedChild)} />
                      <IdInfo label="Batch" value={selectedChild.batchName || "—"} />
                      <IdInfo label="Course" value={selectedChild.courseName || "—"} />
                      <IdInfo label="Academic Year" value={selectedChild.academicYear || "—"} />
                    </div>
                  </div>
                </div>
              ) : (
                <NoSelectedChild onBack={() => openScreen("parent-home")} />
              )}
            </SectionShell>
          )}

          {/* Teachers */}
          {screen === "teachers" && (
            <SectionShell
              title="My Teachers"
              subtitle={selectedChild?.name}
              onBack={() => openScreen("student-home")}
            >
              <div className="space-y-2.5">
                {teacherList.length ? (
                  teacherList.map((teacher: any) => (
                    <div
                      key={teacher.id || teacher.name}
                      className="flex items-center gap-3 rounded-[18px] bg-white p-3 text-slate-950 shadow-lg"
                    >
                      <Avatar
                        src={teacher.photoDataUrl}
                        name={teacher.name}
                        className="h-12 w-12"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[#071a3f]">
                          {teacher.name}
                        </p>
                        <p className="mt-1 truncate text-[10px] font-semibold text-slate-500">
                          {teacher.positionTitle ||
                            teacher.subject ||
                            "Faculty"}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyCard text="Teacher details are not available yet." />
                )}
              </div>
            </SectionShell>
          )}

          {/* Timetable */}
          {screen === "timetable" && (
            <SectionShell
              title="Time Table"
              subtitle={selectedChild?.name}
              onBack={() => openScreen("student-home")}
            >
              <div className="space-y-2.5">
                {(data?.timetable || []).length ? (
                  (data?.timetable || []).map((row: any) => (
                    <div
                      key={row.id}
                      className="rounded-[18px] bg-white p-4 text-slate-950 shadow-lg"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-500">
                            {row.day}
                          </p>
                          <p className="mt-1 text-sm font-black text-[#071a3f]">
                            {row.subjectName || "Subject"}
                          </p>
                        </div>
                        <span className="rounded-xl bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">
                          {row.startTime} – {row.endTime}
                        </span>
                      </div>
                      <p className="mt-2 text-[10px] font-semibold text-slate-500">
                        {row.teacherName ? `${row.teacherName} • ` : ""}
                        {row.room || "Classroom"}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyCard text="Timetable has not been published yet." />
                )}
              </div>
            </SectionShell>
          )}

          {/* Results */}
          {screen === "results" && (
            <SectionShell
              title="Results"
              subtitle={selectedChild?.name}
              onBack={() => openScreen("student-home")}
            >
              <div className="space-y-2.5">
                {gradedExams.length ? (
                  gradedExams.map((exam: any) => {
                    const score = Number(exam.marksObtained || 0);
                    const total = Math.max(1, Number(exam.totalMarks || 0));
                    const percent = Math.round((score / total) * 100);

                    return (
                      <div
                        key={exam.id}
                        className="rounded-[18px] bg-white p-4 text-slate-950 shadow-lg"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-[#071a3f]">
                              {exam.name || "Test Result"}
                            </p>
                            <p className="mt-1 text-[10px] font-semibold text-slate-500">
                              {exam.subjectName || "Subject"} •{" "}
                              {dateLabel(exam.date)}
                            </p>
                          </div>
                          <span className="text-xl font-black text-blue-600">
                            {percent}%
                          </span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${Math.min(100, percent)}%` }}
                          />
                        </div>
                        <p className="mt-2 text-[10px] font-bold text-slate-500">
                          {score}/{total} marks
                          {exam.grade ? ` • Grade ${exam.grade}` : ""}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <EmptyCard text="No published results yet." />
                )}
              </div>
            </SectionShell>
          )}

          {/* Fees */}
          {screen === "fees" && (
            <SectionShell
              title="Fees"
              subtitle={selectedChild?.name}
              onBack={() => openScreen("student-home")}
            >
              <div className="grid grid-cols-2 gap-2.5">
                <SummaryCard label="Paid" value={rupee(data?.fees?.paid)} tone="green" />
                <SummaryCard
                  label="Outstanding"
                  value={rupee(data?.fees?.outstanding)}
                  tone="amber"
                />
                <SummaryCard
                  label="Overdue"
                  value={rupee(data?.fees?.overdue)}
                  tone="red"
                />
                <SummaryCard
                  label="Collection"
                  value={`${data?.fees?.collectionRate || 0}%`}
                  tone="blue"
                />
              </div>

              <div className="mt-4 space-y-2.5">
                {(data?.fees?.recent || []).length ? (
                  data!.fees.recent.map((payment: any) => (
                    <div
                      key={payment.id}
                      className="rounded-[18px] bg-white p-4 text-slate-950 shadow-lg"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-[#071a3f]">
                            {payment.monthLabel || payment.month || "Fee"}
                          </p>
                          <p className="mt-1 text-[10px] text-slate-500">
                            Due {dateLabel(payment.dueDate)}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[9px] font-black capitalize ${toneForStatus(payment.status)}`}
                        >
                          {payment.status}
                        </span>
                      </div>
                      <div className="mt-3 flex items-end justify-between gap-3">
                        <p className="text-lg font-black">
                          {rupee(payment.totalAmount)}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500">
                          Paid {rupee(payment.paidAmount)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyCard text="No fee records available." />
                )}
              </div>
            </SectionShell>
          )}

          {/* Homework */}
          {screen === "homework" && (
            <SectionShell
              title="Homework"
              subtitle={selectedChild?.name}
              onBack={() => openScreen("student-home")}
            >
              <div className="space-y-2.5">
                {(data?.homework || []).length ? (
                  data!.homework.map((item: any) => (
                    <div
                      key={item.id}
                      className="rounded-[18px] bg-white p-4 text-slate-950 shadow-lg"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                          <BookOpen className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-[#071a3f]">
                            {item.title}
                          </p>
                          <p className="mt-1 text-[10px] font-semibold text-slate-500">
                            {item.subjectName || "Subject"} • Due{" "}
                            {dateLabel(item.dueDate)}
                          </p>
                          {item.description && (
                            <p className="mt-2 text-[11px] leading-5 text-slate-600">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyCard text="No homework available." />
                )}
              </div>
            </SectionShell>
          )}

          {/* Lessons */}
          {screen === "lessons" && (
            <SectionShell
              title="My Lessons"
              subtitle={selectedChild?.name}
              onBack={() => openScreen("student-home")}
            >
              <div className="grid grid-cols-2 gap-2.5">
                {lessonSubjects.length ? (
                  lessonSubjects.map((subject) => (
                    <div
                      key={subject}
                      className="rounded-[18px] bg-white p-4 text-slate-950 shadow-lg"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600">
                        <BookMarked className="h-5 w-5" />
                      </span>
                      <p className="mt-3 text-sm font-black text-[#071a3f]">
                        {subject}
                      </p>
                      <p className="mt-1 text-[9px] font-semibold text-slate-500">
                        Course lesson
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2">
                    <EmptyCard text="Lesson subjects are not available yet." />
                  </div>
                )}
              </div>
            </SectionShell>
          )}

          {/* Attendance */}
          {screen === "attendance" && (
            <SectionShell
              title="Attendance"
              subtitle={selectedChild?.name}
              onBack={() => openScreen("student-home")}
            >
              <div className="rounded-[24px] bg-[linear-gradient(135deg,#08a8e8,#1547c8)] p-5 shadow-lg">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-100">
                  This month
                </p>
                <p className="mt-2 text-4xl font-black">
                  {data?.attendance?.percentage || 0}%
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <MiniMetric
                    label="Present"
                    value={String(data?.attendance?.present || 0)}
                  />
                  <MiniMetric
                    label="Absent"
                    value={String(data?.attendance?.absent || 0)}
                  />
                  <MiniMetric
                    label="Late"
                    value={String(data?.attendance?.late || 0)}
                  />
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {(data?.attendance?.recent || []).length ? (
                  data!.attendance.recent.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between rounded-[16px] bg-white p-3 text-slate-950 shadow-lg"
                    >
                      <div>
                        <p className="text-xs font-black text-[#071a3f]">
                          {dateLabel(row.date)}
                        </p>
                        {row.remarks && (
                          <p className="mt-1 text-[9px] text-slate-500">
                            {row.remarks}
                          </p>
                        )}
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[9px] font-black capitalize ${toneForStatus(row.status)}`}
                      >
                        {row.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <EmptyCard text="Attendance has not been marked yet." />
                )}
              </div>
            </SectionShell>
          )}

          {/* Tests */}
          {screen === "tests" && (
            <SectionShell
              title="Test"
              subtitle={selectedChild?.name}
              onBack={() => openScreen("student-home")}
            >
              <div className="space-y-2.5">
                {(data?.exams || []).length ? (
                  data!.exams.map((exam: any) => (
                    <div
                      key={exam.id}
                      className="rounded-[18px] bg-white p-4 text-slate-950 shadow-lg"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                          <FileText className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-[#071a3f]">
                            {exam.name || "Test"}
                          </p>
                          <p className="mt-1 text-[10px] font-semibold text-slate-500">
                            {exam.subjectName || "Subject"} •{" "}
                            {dateLabel(exam.date)}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[9px] font-black capitalize ${toneForStatus(exam.status)}`}
                        >
                          {exam.status || "scheduled"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyCard text="No tests are available yet." />
                )}
              </div>
            </SectionShell>
          )}

          {/* Notifications */}
          {screen === "notifications" && (
            <SectionShell
              title="Notifications"
              subtitle={`${unreadCount} unread`}
              onBack={() => openScreen("parent-home")}
            >
              <div className="space-y-2.5">
                {notifications.length ? (
                  notifications.map((notification) => {
                    const isRead = readNotifications.includes(notification.id);

                    return (
                      <button
                        type="button"
                        key={notification.id}
                        onClick={() => {
                          setReadNotifications((current) =>
                            current.includes(notification.id)
                              ? current
                              : [...current, notification.id]
                          );
                          openScreen(notification.screen);
                        }}
                        className={`flex w-full items-start gap-3 rounded-[18px] border p-4 text-left shadow-lg ${
                          isRead
                            ? "border-white/10 bg-white/5 text-white"
                            : "border-white bg-white text-slate-950"
                        }`}
                      >
                        <Bell
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            isRead ? "text-slate-400" : "text-blue-600"
                          }`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-black">
                            {notification.title}
                          </span>
                          <span
                            className={`mt-1 block text-[10px] leading-4 ${
                              isRead ? "text-slate-400" : "text-slate-500"
                            }`}
                          >
                            {notification.description}
                          </span>
                        </span>
                        {!isRead && (
                          <span className="mt-1.5 h-2 w-2 rounded-full bg-red-500" />
                        )}
                      </button>
                    );
                  })
                ) : (
                  <EmptyCard text="No notifications right now." />
                )}
              </div>
            </SectionShell>
          )}
        </main>

        {/* Bottom Navigation */}
        {!drawerOpen && (
          <div className="fixed bottom-0 left-0 right-0 z-[90] border-t border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,25,58,.92),rgba(2,16,42,.98))] pb-safe shadow-[0_-14px_34px_rgba(0,0,0,0.24)] backdrop-blur-xl">
            <div className="mx-auto flex h-[76px] max-w-lg items-center justify-around px-3.5">
              <BottomNavButton
                label="Home"
                icon={<Home className="h-5 w-5" />}
                active={screen === "parent-home" || screen === "student-home"}
                onClick={() => openScreen("parent-home")}
              />
              <BottomNavButton
                label="Profile"
                icon={<User className="h-5 w-5" />}
                active={screen === "profile"}
                onClick={() => openScreen("profile")}
              />
              <BottomNavButton
                label="Notifications"
                icon={<Bell className="h-5 w-5" />}
                active={screen === "notifications"}
                dot={unreadCount > 0}
                onClick={() => openScreen("notifications")}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function QuickAccessGrid({
  data,
  openScreen,
  homeworkCount,
  showProfileAsStudent = false,
}: {
  data: PortalData | null;
  openScreen: (screen: Screen) => void;
  homeworkCount: number;
  showProfileAsStudent?: boolean;
}) {
  return (
    <section>
      <div className="mb-3">
        <h3 className="text-xl font-black tracking-tight text-white">
          Quick Access
        </h3>
        <p className="mt-0.5 text-xs font-medium text-slate-300">
          Tap a section to open
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <QuickCard
          label="My Profile"
          icon={<User className="h-5 w-5" />}
          tone="blue"
          onClick={() =>
            openScreen(showProfileAsStudent ? "idcard" : "profile")
          }
        />
        <QuickCard
          label="ID Card"
          icon={<IdCard className="h-5 w-5" />}
          tone="violet"
          onClick={() => openScreen("idcard")}
        />
        <QuickCard
          label="My Teachers"
          icon={<Users className="h-5 w-5" />}
          tone="emerald"
          onClick={() => openScreen("teachers")}
        />
        <QuickCard
          label="Time Table"
          icon={<CalendarDays className="h-5 w-5" />}
          tone="amber"
          onClick={() => openScreen("timetable")}
        />
        <QuickCard
          label="Results"
          icon={<Trophy className="h-5 w-5" />}
          tone="rose"
          onClick={() => openScreen("results")}
        />
        <QuickCard
          label="Fees"
          icon={<IndianRupee className="h-5 w-5" />}
          tone="orange"
          onClick={() => openScreen("fees")}
        />
        <QuickCard
          label="Homework"
          icon={<BookOpen className="h-5 w-5" />}
          tone="violet"
          badge={homeworkCount > 0 ? String(homeworkCount) : undefined}
          onClick={() => openScreen("homework")}
        />
        <QuickCard
          label="My Lessons"
          icon={<BookMarked className="h-5 w-5" />}
          tone="cyan"
          onClick={() => openScreen("lessons")}
        />
        <QuickCard
          label="Attendance"
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone="emerald"
          onClick={() => openScreen("attendance")}
        />
        <QuickCard
          label="Test"
          icon={<FileText className="h-5 w-5" />}
          tone="indigo"
          badge={(data?.exams?.length || 0) > 0 ? String(data?.exams?.length) : undefined}
          onClick={() => openScreen("tests")}
        />
      </div>
    </section>
  );
}

function SchoolLandscape() {
  return (
    <div className="pointer-events-none relative h-[132px] w-full overflow-hidden sm:h-[145px]">
      <img
        src="/parent-app/bottom-school-background.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 px-2 py-2 text-center">
      <p className="truncate text-[8px] font-bold uppercase tracking-[0.1em] text-blue-100">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-black text-white">{value}</p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "amber" | "red" | "blue";
}) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700",
  } as const;

  return (
    <div className={`rounded-[18px] p-4 shadow-lg ${tones[tone]}`}>
      <p className="text-[9px] font-black uppercase tracking-[0.12em] opacity-70">
        {label}
      </p>
      <p className="mt-2 truncate text-lg font-black">{value}</p>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/5 p-6 text-center text-xs font-semibold text-slate-400">
      {text}
    </div>
  );
}

function NoSelectedChild({ onBack }: { onBack: () => void }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/5 p-7 text-center">
      <Users className="mx-auto h-8 w-8 text-slate-500" />
      <p className="mt-3 text-sm font-black">Select a child first</p>
      <button
        type="button"
        onClick={onBack}
        className="mt-4 rounded-xl bg-white px-4 py-2 text-xs font-black text-[#071a3f]"
      >
        Open Parent Dashboard
      </button>
    </div>
  );
}

function ProfileInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10"
      />
    </label>
  );
}

function PasswordField({
  label,
  placeholder,
  value,
  show,
  onToggle,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  show: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-[#071a3f]">{label}</span>
      <span className="relative mt-1 block">
        <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-300" />
        <input
          type={show ? "text" : "password"}
          autoComplete={
            label === "Current Password" ? "current-password" : "new-password"
          }
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-12 w-full rounded-xl border border-blue-100 bg-white pl-10 pr-11 text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
    </label>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span className="text-[10px] font-bold text-slate-400">{label}</span>
      <span className="max-w-[65%] text-right text-xs font-black text-slate-800">
        {value}
      </span>
    </div>
  );
}

function IdInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-[10px] font-black text-slate-700">{value}</p>
    </div>
  );
}
