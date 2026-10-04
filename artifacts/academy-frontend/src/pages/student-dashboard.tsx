import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  GraduationCap,
  IndianRupee,
  ClipboardCheck,
  FileText,
  LogOut,
  BookOpen,
  CalendarDays,
  UserRound,
  AlertCircle,
  Home,
  ChevronRight,
  Search,
  X,
  User,
  PenTool,
  Monitor,
  MapPin,
  Clock,
  Play,
  Trophy,
  XCircle,
  Timer,
  Camera,
  Eye,
  EyeOff,
  IdCard,
  KeyRound,
  Upload,
  FileCheck2,
  ChevronDown,
  ChevronUp,
  Download,
  Printer,
  Bell,
  Menu,
  Settings,
  Users,
  ShieldCheck,
  ArrowLeft,
  School,
  BookMarked,
  LockKeyhole,
} from "lucide-react";

type StudentMe = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: "student";
  instituteId: string;
  instituteName?: string;
  enrollmentNo?: string;
  courseId?: string;
  courseName?: string;
  batchId?: string;
  batchName?: string;
  academicYear?: string;
  className?: string;
  section?: string;
  board?: string;
  boardOther?: string;
  schoolName?: string;
  photoDataUrl?: string;
  dateOfBirth?: string;
  gender?: string;
  genderOther?: string;
  bloodGroup?: string;
  aadhaarCard?: string;
  previousMarksheet?: string;
  lastClassPercentage?: string;
  lastClassMarks?: string;
  parentName?: string;
  parentPhone?: string;
  fatherName?: string;
  fatherOccupation?: string;
  fatherPhone?: string;
  fatherWhatsapp?: string;
  motherName?: string;
  motherOccupation?: string;
  motherPhone?: string;
  motherWhatsapp?: string;
  emergencyPhone?: string;
  correspondenceAddress?: string;
  correspondenceDistrict?: string;
  correspondenceState?: string;
  correspondencePin?: string;
  permanentAddress?: string;
  permanentDistrict?: string;
  permanentState?: string;
  permanentPin?: string;
  loginId?: string;
};

type Payment = {
  id: string;
  amount: number;
  totalAmount: number;
  paidAmount: number;
  lateFee: number;
  dueDate: string;
  paidDate?: string | null;
  status: "pending" | "paid" | "overdue" | "partial";
  month: string;
  monthLabel: string;
};

type Homework = {
  id: string;
  title: string;
  description: string;
  subjectName: string;
  dueDate: string;
  status: string;
};

type AttendanceSummary = {
  studentId: string;
  totalClasses: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
};

type Exam = {
  id: string;
  title: string;
  subjectName: string;
  examType: "online" | "offline";
  examDate: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  totalMarks: number;
  passingMarks?: number;
  venue?: string;
  instructions?: string;
  syllabus?: string;
  examUrl?: string;
  status?: "upcoming" | "live" | "completed" | "missed";
  marksObtained?: number | null;
  grade?: string | null;
  resultStatus?: string | null;
};

type TimetableEntry = {
  id: string;
  batchName?: string;
  subjectName?: string;
  teacherName?: string;
  day: string;
  startTime: string;
  endTime: string;
  room?: string;
};

const inr = (v: unknown) => `₹${Number(v ?? 0).toLocaleString("en-IN")}`;

const formatDate = (date?: string | null) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (time?: string) => {
  if (!time) return "-";
  try {
    const d = new Date(time);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }
    return time;
  } catch {
    return time;
  }
};

const formatClassAndSection = (className?: string, section?: string) => {
  if (!className && !section) return "-";
  const classStr = className ? `Class ${className}` : "";
  const sectionStr = section ? `Section ${section}` : "";
  if (classStr && sectionStr) return `${classStr} • ${sectionStr}`;
  return classStr || sectionStr;
};

const getCountdown = (targetTime: string) => {
  const diff = new Date(targetTime).getTime() - new Date().getTime();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
};

const deriveExamStatus = (
  exam: Exam
): "upcoming" | "live" | "completed" | "missed" => {
  if (exam.status) return exam.status;
  const now = Date.now();
  const start = new Date(exam.startTime || exam.examDate).getTime();
  const end = exam.endTime
    ? new Date(exam.endTime).getTime()
    : start + (exam.durationMinutes || 60) * 60000;
  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "live";
  if (exam.marksObtained != null) return "completed";
  if (now > end) return "completed";
  return "upcoming";
};

// Calculate Late Fee Details fixed at ₹50/day
const computeLateFeeDetails = (payment: Payment) => {
  if (!payment.lateFee || payment.lateFee <= 0) {
    return { daysLate: 0, perDayRate: 50, dueDateStr: formatDate(payment.dueDate), endDateStr: "-" };
  }
  const perDayRate = 50;
  const daysLate = Math.max(1, Math.round(payment.lateFee / perDayRate));

  return {
    daysLate,
    perDayRate,
    dueDateStr: formatDate(payment.dueDate),
    endDateStr: formatDate(payment.paidDate || new Date().toISOString()),
  };
};

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const CLASS_OPTIONS = [
  "LKG",
  "UKG",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
];
const BOARD_OPTIONS = ["CBSE", "ICSE", "State Board"];
const INDIA_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

const AppStyles = () => (
  <style>{`
    @keyframes slideUp { from { transform: translateY(100%); opacity: 0.5; } to { transform: translateY(0); opacity: 1; } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
    @keyframes livePulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.6); } 50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); } }
    .animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .animate-fadeIn { animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .animate-shake { animation: shake 0.4s ease-in-out; }
    .animate-livePulse { animation: livePulse 1.5s infinite; }
    .pb-safe { padding-bottom: env(safe-area-inset-bottom, 0px); }
    body { overscroll-behavior-y: contain; -webkit-tap-highlight-color: transparent; }
  `}</style>
);

export default function StudentDashboard() {
  const [, setLocation] = useLocation();

  const supportMode = Boolean(localStorage.getItem("academy_support_original_token"));
  const supportStudentName = localStorage.getItem("academy_support_student_name") || "Student";
  const supportExpiresAt = localStorage.getItem("academy_support_expires_at") || "";

  const [student, setStudent] = useState<StudentMe | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [report, setReport] = useState<any>(null);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [, forceTick] = useState(0);

  const [activeTab, setActiveTab] = useState<
    | "home"
    | "homework"
    | "timetable"
    | "fees"
    | "results"
    | "exams"
    | "attendance"
    | "teachers"
    | "idcard"
    | "lessons"
  >("home");
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [receiptPreviewPayment, setReceiptPreviewPayment] = useState<Payment | null>(null);
  const [showLateFeeDropdown, setShowLateFeeDropdown] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [homeworkSearch, setHomeworkSearch] = useState("");
  const [examFilter, setExamFilter] = useState<
    "all" | "upcoming" | "live" | "completed"
  >("all");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [readNotifications, setReadNotifications] = useState<string[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
    return DAYS_OF_WEEK.includes(today as any) ? today : "Monday";
  });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [fieldErrors, setFieldErrors] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [sameAddress, setSameAddress] = useState(false);
  const [editMessage, setEditMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const exitSupportMode = async () => {
    const originalToken = localStorage.getItem("academy_support_original_token") || "";
    const originalRole = localStorage.getItem("academy_support_original_role") || "";
    const supportSessionId = localStorage.getItem("academy_support_session_id") || "";
    const returnPath = localStorage.getItem("academy_support_return_path") || "/students";

    if (!originalToken) {
      localStorage.removeItem("coach_sutra_token");
      localStorage.removeItem("coach_sutra_user_role");
      window.dispatchEvent(new Event("storage"));
      setLocation("/login");
      return;
    }

    // Restore the real admin session first. The temporary support token is never used
    // to mutate data or to end its own session.
    localStorage.setItem("coach_sutra_token", originalToken);
    localStorage.setItem("coach_sutra_user_role", originalRole);

    const endpoint =
      originalRole === "super_admin"
        ? "/api/v1/platform/student-support/end"
        : "/api/student-support/end";

    if (supportSessionId) {
      try {
        await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${originalToken}`,
          },
          body: JSON.stringify({ sessionId: supportSessionId }),
        });
      } catch {
        // The support access token is short-lived and server-side read-only even if
        // the explicit end call cannot be delivered.
      }
    }

    [
      "academy_support_original_token",
      "academy_support_original_role",
      "academy_support_session_id",
      "academy_support_student_id",
      "academy_support_student_name",
      "academy_support_return_path",
      "academy_support_expires_at",
    ].forEach((key) => localStorage.removeItem(key));

    window.dispatchEvent(new Event("storage"));
    window.location.assign(returnPath || (originalRole === "super_admin" ? "/super-admin" : "/students"));
  };

  const logout = () => {
    const currentToken = localStorage.getItem("coach_sutra_token");
    if (currentToken) void fetch("/api/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${currentToken}` } }).catch(() => {});
    localStorage.removeItem("coach_sutra_token");
    localStorage.removeItem("coach_sutra_user_role");
    localStorage.removeItem("foundation_branches");
    localStorage.removeItem("foundation_institute_id");
    localStorage.removeItem("active_branch_id");
    localStorage.removeItem("active_branch_name");
    window.dispatchEvent(new Event("storage"));
    setLocation("/login");
  };

  useEffect(() => {
    const token = localStorage.getItem("coach_sutra_token") || "";
    if (!token) {
      setLocation("/login");
      return;
    }
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    const load = async () => {
      setLoading(true);
      setMessage("");
      try {
        const meRes = await fetch("/api/auth/me", {
          credentials: "include",
          headers,
        });
        const me = await meRes.json().catch(() => null);
        if (!meRes.ok || me?.role !== "student") {
          logout();
          return;
        }
        setStudent(me);
        const currentMonth = new Date().toISOString().slice(0, 7);

        const [
          feeRes,
          homeworkRes,
          reportRes,
          attendanceRes,
          timetableRes,
          examRes,
        ] = await Promise.allSettled([
          fetch("/api/finance/my-payments", { credentials: "include", headers }),
          fetch(`/api/homework?batchId=${me.batchId || ""}`, {
            credentials: "include",
            headers,
          }),
          fetch(
            `/api/report-card?studentId=${me.id}&month=${currentMonth}`,
            { credentials: "include", headers }
          ),
          fetch(
            `/api/attendance/student/summary?studentId=${me.id}&month=${currentMonth}`,
            { credentials: "include", headers }
          ),
          fetch(`/api/timetable?batchId=${me.batchId || ""}`, {
            credentials: "include",
            headers,
          }),
          fetch(`/api/exams/my-exams?studentId=${me.id}`, {
            credentials: "include",
            headers,
          }),
        ]);

        if (feeRes.status === "fulfilled") {
          const data = await feeRes.value.json().catch(() => []);
          if (feeRes.value.ok) setPayments(Array.isArray(data) ? data : []);
        }
        if (homeworkRes.status === "fulfilled") {
          const data = await homeworkRes.value.json().catch(() => []);
          if (homeworkRes.value.ok)
            setHomework(Array.isArray(data) ? data : []);
        }
        if (reportRes.status === "fulfilled") {
          const data = await reportRes.value.json().catch(() => null);
          if (reportRes.value.ok) setReport(data);
        }
        if (attendanceRes.status === "fulfilled") {
          const data = await attendanceRes.value.json().catch(() => null);
          if (attendanceRes.value.ok) setAttendance(data);
        }
        if (timetableRes.status === "fulfilled") {
          const data = await timetableRes.value.json().catch(() => []);
          if (timetableRes.value.ok) {
            const raw = Array.isArray(data) ? data : [];
            setTimetable(
              raw.map((t: any) => ({
                id: String(t.id || t._id),
                batchName:
                  typeof t.batchId === "object"
                    ? t.batchId?.name
                    : t.batchName,
                subjectName:
                  typeof t.subjectId === "object"
                    ? t.subjectId?.name
                    : t.subjectName,
                teacherName:
                  typeof t.teacherId === "object"
                    ? t.teacherId?.name
                    : t.teacherName,
                day: t.day,
                startTime: t.startTime,
                endTime: t.endTime,
                room: t.room,
              }))
            );
          }
        }
        if (examRes.status === "fulfilled") {
          const data = await examRes.value.json().catch(() => []);
          if (examRes.value.ok) {
            const list = Array.isArray(data) ? data : [];
            setExams(
              list.map((e: any) => {
                const base = {
                  id: String(e.id || e._id),
                  title: e.title || "Exam",
                  subjectName: e.subjectName || e.subject || "Subject",
                  examType: (e.examType === "online" || e.isOnline
                    ? "online"
                    : "offline") as "online" | "offline",
                  examDate: e.examDate || e.startTime || new Date().toISOString(),
                  startTime: e.startTime,
                  endTime: e.endTime,
                  durationMinutes: e.durationMinutes || e.duration || 60,
                  totalMarks: Number(e.totalMarks || 100),
                  passingMarks: Number(e.passingMarks || 33),
                  venue: e.venue,
                  instructions: e.instructions,
                  syllabus: e.syllabus,
                  examUrl: e.examUrl || e.link,
                  marksObtained:
                    e.marksObtained != null ? Number(e.marksObtained) : null,
                  grade: e.grade,
                  resultStatus: e.resultStatus,
                  status: e.status,
                };
                return { ...base, status: deriveExamStatus(base) };
              })
            );
          }
        }
      } catch {
        setMessage("Student portal load nahi ho saka.");
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const feeSummary = useMemo(() => {
    const total = payments.reduce(
      (sum, p) => sum + Number(p.totalAmount ?? p.amount ?? 0),
      0
    );
    const paid = payments.reduce(
      (sum, p) => sum + Number(p.paidAmount ?? 0),
      0
    );
    const pending = Math.max(0, total - paid);
    const nextDue = payments.find(
      (p) => p.status === "pending" || p.status === "overdue"
    );
    return { total, paid, pending, nextDue };
  }, [payments]);


  // Filter payments to display: Only show past paid fees and current month fee. Hide future pending cards!
  const displayPayments = useMemo(() => {
    const currentMonthIso = new Date().toISOString().slice(0, 7); // "YYYY-MM"

    return payments.filter((p) => {
      const itemMonth = p.month || (p.dueDate ? p.dueDate.slice(0, 7) : "");

      // 1. Show all paid payments
      if (p.status === "paid" || Number(p.paidAmount ?? 0) > 0) {
        return true;
      }
      // 2. Show current month or past months payments
      if (itemMonth && itemMonth <= currentMonthIso) {
        return true;
      }
      // 3. Hide future months' pending payments
      return false;
    });
  }, [payments]);

  const filteredHomeworks = useMemo(() => {
    if (!homeworkSearch) return homework;
    return homework.filter(
      (h) =>
        h.title.toLowerCase().includes(homeworkSearch.toLowerCase()) ||
        h.subjectName?.toLowerCase().includes(homeworkSearch.toLowerCase())
    );
  }, [homework, homeworkSearch]);

  const dayTimetable = useMemo(() => {
    return timetable
      .filter((t) => t.day?.toLowerCase() === selectedDay.toLowerCase())
      .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  }, [timetable, selectedDay]);

  const enrichedExams = useMemo(
    () => exams.map((e) => ({ ...e, status: deriveExamStatus(e) })),
    [exams]
  );

  const filteredExams = useMemo(() => {
    if (examFilter === "all") return enrichedExams;
    return enrichedExams.filter((e) => e.status === examFilter);
  }, [enrichedExams, examFilter]);

  const examSummary = useMemo(
    () => ({
      upcoming: enrichedExams.filter((e) => e.status === "upcoming").length,
      live: enrichedExams.filter((e) => e.status === "live").length,
      completed: enrichedExams.filter((e) => e.status === "completed").length,
    }),
    [enrichedExams]
  );

  const notifications = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      description: string;
      tone: "blue" | "amber" | "red" | "green";
    }> = [];

    homework.slice(0, 3).forEach((item) => {
      items.push({
        id: `homework-${item.id}`,
        title: "New homework assigned",
        description: `${item.subjectName}: ${item.title} • Due ${formatDate(item.dueDate)}`,
        tone: "amber",
      });
    });

    enrichedExams
      .filter((exam) => exam.status === "live" || exam.status === "upcoming")
      .slice(0, 3)
      .forEach((exam) => {
        items.push({
          id: `exam-${exam.id}`,
          title: exam.status === "live" ? "Exam is live now" : "Upcoming exam",
          description: `${exam.title} • ${exam.subjectName} • ${formatDate(exam.examDate)}`,
          tone: exam.status === "live" ? "red" : "blue",
        });
      });

    const nextDue = payments.find(
      (payment) => payment.status === "pending" || payment.status === "overdue"
    );
    if (nextDue) {
      items.push({
        id: `fee-${nextDue.id}`,
        title: nextDue.status === "overdue" ? "Fee payment overdue" : "Fee payment due",
        description: `${nextDue.monthLabel} • ${inr(nextDue.totalAmount)} • Due ${formatDate(nextDue.dueDate)}`,
        tone: nextDue.status === "overdue" ? "red" : "green",
      });
    }

    return items;
  }, [homework, enrichedExams, payments]);

  const unreadNotificationCount = notifications.filter(
    (notification) => !readNotifications.includes(notification.id)
  ).length;

  const latestResults = report?.examResults ?? [];

  const instituteLabel =
    student?.instituteName ||
    localStorage.getItem("foundation_institute_name") ||
    localStorage.getItem("institute_name") ||
    "Second School Classes";

  const instituteLogo = (() => {
    const studentLogo =
      (student as any)?.instituteLogoDataUrl ||
      (student as any)?.logoDataUrl ||
      "";

    if (studentLogo) return String(studentLogo);

    const savedLogo = localStorage.getItem("coach_sutra_logo") || "";
    if (savedLogo) return savedLogo;

    try {
      const raw = localStorage.getItem("coach_sutra_general_info");
      if (raw) {
        const info = JSON.parse(raw);
        return String(info?.logoUrl || info?.logoDataUrl || "");
      }
    } catch {
      // Ignore malformed cached branding and use the fallback icon below.
    }

    return "";
  })();

  const teacherNames = useMemo(
    () =>
      Array.from(
        new Set(
          timetable
            .map((item) => String(item.teacherName || "").trim())
            .filter(Boolean)
        )
      ),
    [timetable]
  );

  const lessonSubjects = useMemo(
    () =>
      Array.from(
        new Set(
          timetable
            .map((item) => String(item.subjectName || "").trim())
            .filter(Boolean)
        )
      ),
    [timetable]
  );

  const openStudentSection = (
    tab:
      | "home"
      | "homework"
      | "timetable"
      | "fees"
      | "results"
      | "exams"
      | "attendance"
      | "teachers"
      | "idcard"
      | "lessons"
  ) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
    setIsProfileOpen(false);
    setIsNotificationsOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateOwnPassword = async () => {
    if (supportMode) {
      setPasswordMessage({
        type: "error",
        text: "Support Mode read-only hai. Password change disabled hai.",
      });
      return;
    }

    const currentPassword = passwordForm.currentPassword.trim();
    const newPassword = passwordForm.newPassword.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();

    if (!currentPassword) {
      setPasswordMessage({ type: "error", text: "Current password enter karo." });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({
        type: "error",
        text: "New password minimum 6 characters ka hona chahiye.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "New password aur confirm password match nahi kar rahe.",
      });
      return;
    }

    const token = localStorage.getItem("coach_sutra_token") || "";
    setIsPasswordSaving(true);
    setPasswordMessage(null);

    try {
      const response = await fetch("/api/students/self-password", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Password update nahi ho saka.");
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordMessage({
        type: "success",
        text: data?.message || "Password successfully update ho gaya.",
      });
    } catch (error: any) {
      setPasswordMessage({
        type: "error",
        text: error?.message || "Password update nahi ho saka.",
      });
    } finally {
      setIsPasswordSaving(false);
    }
  };

  // Generate and Trigger Print Window for Receipt
  const executePrintReceipt = (payment: Payment) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to print the receipt.");
      return;
    }

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fee Receipt - ${payment.monthLabel}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Arial', sans-serif; padding: 25px; max-width: 650px; margin: 0 auto; color: #000; background: #fff; }
            .header-banner { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
            .brand-title { font-size: 32px; font-weight: 900; color: #000; margin: 0; text-transform: uppercase; letter-spacing: -0.5px; font-family: 'Impact', 'Arial Black', sans-serif; }
            .tagline { font-size: 13px; font-style: italic; font-weight: 700; text-align: right; margin: -2px 10px 10px 0; color: #111; }
            .sub-info { font-size: 11px; font-weight: 700; color: #000; border-top: 1px solid #000; padding-top: 8px; margin-top: 6px; line-height: 1.5; }
            .receipt-badge { font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; border: 2px solid #000; display: inline-block; padding: 4px 16px; margin: 15px 0 20px 0; background: #f8fafc; }
            .details-box { background: #fafafa; border: 1px solid #111; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
            .row:last-child { margin-bottom: 0; }
            .label { color: #444; font-weight: 600; }
            .value { font-weight: 800; color: #000; text-align: right; }
            .divider { height: 1px; background: #000; margin: 15px 0; }
            .total-box { display: flex; justify-content: space-between; align-items: center; background: #f0fdf4; border: 2px solid #166534; border-radius: 8px; padding: 12px 16px; color: #166534; margin-top: 15px; }
            .total-label { font-size: 14px; font-weight: 800; text-transform: uppercase; }
            .total-value { font-size: 22px; font-weight: 900; }
            .status-badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; text-transform: uppercase; background: #dcfce7; color: #166534; border: 1px solid #166534; }
            .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #666; line-height: 1.5; border-top: 1px dashed #ccc; padding-top: 15px; }
            @media print {
              body { padding: 0; margin: 0; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <div class="header-banner">
            <h1 class="brand-title">SECOND SCHOOL CLASSES</h1>
            <div class="tagline">Where True Learning Comes....</div>
            <div class="sub-info">
              Address: MIG 88, Pritam Nagar, Dhoomanganj, Prayagraj-211011 | Contact No. : +91-7844997666<br/>
              E-mail: secondschoolclasses@gmail.com | Youtube : www.youtube.com/secondschoolclasses
            </div>
          </div>

          <div style="text-align: center;">
            <span class="receipt-badge">FEES RECEIPT</span>
          </div>
          
          <div class="details-box">
            <div class="row"><span class="label">Student Name:</span> <span class="value">${student?.name || "-"}</span></div>
            <div class="row"><span class="label">Enrollment / Roll No:</span> <span class="value">${student?.enrollmentNo || "-"}</span></div>
            <div class="row"><span class="label">Class & Batch:</span> <span class="value">${student?.className || "-"} ${student?.batchName ? `(${student.batchName})` : ""}</span></div>
          </div>

          <div class="row"><span class="label">Receipt Status:</span> <span class="value"><span class="status-badge">${payment.status}</span></span></div>
          <div class="row"><span class="label">Fee Period / Month:</span> <span class="value">${payment.monthLabel}</span></div>
          <div class="row"><span class="label">Payment Date:</span> <span class="value">${payment.paidDate ? formatDate(payment.paidDate) : formatDate(new Date().toISOString())}</span></div>
          
          <div class="divider"></div>
          
          <div class="row"><span class="label">Monthly Tuition Fees:</span> <span class="value">₹${payment.amount.toLocaleString("en-IN")}</span></div>
          <div class="row"><span class="label">Late Fees Penalty:</span> <span class="value">₹${payment.lateFee.toLocaleString("en-IN")}</span></div>
          
          <div class="total-box">
            <span class="total-label">Total Paid Amount</span> 
            <span class="total-value">₹${(payment.paidAmount || payment.totalAmount).toLocaleString("en-IN")}</span>
          </div>
          
          <div class="footer">
            <p>This is a computer-generated official receipt by SECOND SCHOOL CLASSES.<br/>No physical signature is required.</p>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  const openEditModal = () => {
    if (!student) return;
    setEditForm({
      name: student.name || "",
      dateOfBirth: student.dateOfBirth
        ? String(student.dateOfBirth).substring(0, 10)
        : "",
      gender: student.gender ? String(student.gender).toLowerCase() : "",
      genderOther: student.genderOther || "",
      bloodGroup: student.bloodGroup || "",
      aadhaarCard: student.aadhaarCard || "",
      previousMarksheet: student.previousMarksheet || "",
      photoDataUrl: student.photoDataUrl || "",
      phone: student.phone || "",
      email: student.email || "",
      emergencyPhone: student.emergencyPhone || "",
      loginId: student.loginId || "",
      loginPassword: "",
      schoolName: student.schoolName || "",
      className: student.className || "",
      section: student.section || "",
      board: student.board || "",
      boardOther: student.boardOther || "",
      lastClassPercentage: student.lastClassPercentage || "",
      lastClassMarks: student.lastClassMarks || "",
      parentName: student.parentName || "",
      parentPhone: student.parentPhone || "",
      fatherName: student.fatherName || "",
      fatherOccupation: student.fatherOccupation || "",
      fatherPhone: student.fatherPhone || "",
      fatherWhatsapp: student.fatherWhatsapp || "",
      motherName: student.motherName || "",
      motherOccupation: student.motherOccupation || "",
      motherPhone: student.motherPhone || "",
      motherWhatsapp: student.motherWhatsapp || "",
      correspondenceAddress: student.correspondenceAddress || "",
      correspondenceDistrict: student.correspondenceDistrict || "",
      correspondenceState: student.correspondenceState || "",
      correspondencePin: student.correspondencePin || "",
      permanentAddress: student.permanentAddress || "",
      permanentDistrict: student.permanentDistrict || "",
      permanentState: student.permanentState || "",
      permanentPin: student.permanentPin || "",
    });
    setFieldErrors({});
    setEditMessage(null);
    setSameAddress(false);
    setIsEditOpen(true);
    setIsProfileOpen(false);
  };

  const handleSameAddressToggle = () => {
    const newSame = !sameAddress;
    setSameAddress(newSame);
    if (newSame) {
      setEditForm((prev: any) => ({
        ...prev,
        permanentAddress: prev.correspondenceAddress,
        permanentDistrict: prev.correspondenceDistrict,
        permanentState: prev.correspondenceState,
        permanentPin: prev.correspondencePin,
      }));
    }
  };

  const handlePhotoChange = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setEditMessage({ type: "error", text: "Photo size limit max 2MB" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditForm((prev: any) => ({ ...prev, photoDataUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleDocumentUpload = (key: string, file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setEditMessage({ type: "error", text: "Document size limit max 5MB" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditForm((prev: any) => ({ ...prev, [key]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const setFormValue = (key: string, value: string) => {
    setEditForm((prev: any) => ({ ...prev, [key]: value }));
  };

  const saveProfileChanges = async () => {
    setIsSaving(true);
    setEditMessage(null);
    setFieldErrors({});
    if (!editForm.name) {
      setFieldErrors({ name: "Student name is required" });
      setIsSaving(false);
      return;
    }
    const token = localStorage.getItem("coach_sutra_token") || "";
    try {
      const payload: any = { ...editForm };
      // Password changes use the dedicated current-password verification flow.
      delete payload.loginPassword;

      const res = await fetch("/api/students/self-update", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Server Error (${res.status}): ${responseText.substring(0, 100)}`
        );
      }
      if (!res.ok) {
        if (
          res.status === 400 &&
          data.error &&
          String(data.error).includes("Password")
        ) {
          setFieldErrors({ loginPassword: data.error });
        }
        throw new Error(data.details || data.error || "Profile update failed.");
      }

      setEditMessage({
        type: "success",
        text: data.message || "Updated successfully!",
      });
      setTimeout(async () => {
        const meRes = await fetch("/api/auth/me", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const me = await meRes.json().catch(() => null);
        if (meRes.ok && me) setStudent(me);
        setIsEditOpen(false);
      }, 1500);
    } catch (err: any) {
      setEditMessage({
        type: "error",
        text: err.message || "Failed to update profile.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <AppStyles />
        <div className="flex min-h-screen flex-col items-center justify-center bg-[linear-gradient(135deg,#020817_0%,#07112a_58%,#21184d_100%)] px-6 text-white">
          <div className="rounded-3xl bg-white/10 p-5 mb-4 animate-bounce">
            <GraduationCap className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-wider">STUDENT PORTAL</h1>
          <p className="mt-1 text-xs text-cyan-200 animate-pulse">
            Loading secure session...
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <AppStyles />
      <div className={`min-h-screen bg-[linear-gradient(180deg,#061b3b_0%,#03142f_52%,#02102a_100%)] pb-24 md:pb-8 select-none antialiased ${supportMode ? "pt-12" : ""}`}>
        {supportMode && (
          <div className="fixed inset-x-0 top-0 z-[100] border-b border-cyan-300/20 bg-slate-950 px-3 py-2 text-white shadow-lg">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 shrink-0 text-cyan-300" />
                  <p className="truncate text-xs font-black">Read-only Support Mode · {supportStudentName}</p>
                </div>
                <p className="mt-0.5 hidden text-[10px] text-slate-400 sm:block">
                  Student password is not exposed. Changes and payments are blocked.
                  {supportExpiresAt ? ` Session expires ${new Date(supportExpiresAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}.` : ""}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                className="h-8 shrink-0 bg-white px-3 text-[11px] font-black text-slate-950 hover:bg-cyan-50"
                onClick={() => void exitSupportMode()}
              >
                Exit Support Mode
              </Button>
            </div>
          </div>
        )}

        <header
          className={`sticky z-40 border-b border-white/10 bg-[linear-gradient(105deg,#020817_0%,#07112a_60%,#21184d_100%)] px-4 py-3 text-white shadow-[0_10px_30px_rgba(2,8,23,0.16)] ${
            supportMode ? "top-12" : "top-0"
          }`}
        >
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open menu"
                onClick={() => setIsMenuOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-100 transition active:scale-95"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-[15px] font-black tracking-tight">
                  Student Dashboard
                </h1>
                <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">
                  {instituteLabel}
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Open profile and settings"
              onClick={() => {
                setIsNotificationsOpen(false);
                setIsProfileOpen(true);
              }}
              className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/80 bg-slate-800 shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition active:scale-95"
            >
              {student?.photoDataUrl ? (
                <img
                  src={student.photoDataUrl}
                  alt={student?.name || "Student"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound className="h-5 w-5 text-cyan-200" />
              )}
              <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
            </button>
          </div>
        </header>

        {isMenuOpen && (
          <div className="fixed inset-0 z-[90]">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-slate-950/65 backdrop-blur-[2px]"
              onClick={() => setIsMenuOpen(false)}
            />
            <aside className="relative flex h-full w-[84%] max-w-[310px] flex-col overflow-y-auto border-r border-white/10 bg-[linear-gradient(180deg,#020817_0%,#07112a_58%,#0b1f3d_100%)] px-4 pb-6 pt-5 text-white shadow-2xl animate-fadeIn">
              <div className="flex items-center gap-3 border-b border-white/10 pb-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-cyan-300/40 bg-white/5">
                  {student?.photoDataUrl ? (
                    <img
                      src={student.photoDataUrl}
                      alt={student.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserRound className="h-6 w-6 text-cyan-200" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">
                    {student?.name || "Student"}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">
                    {student?.enrollmentNo || "Student ID"} ·{" "}
                    {formatClassAndSection(student?.className, student?.section)}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-1">
                <DrawerItem
                  active={activeTab === "home" && !isProfileOpen}
                  icon={<Home className="h-[18px] w-[18px]" />}
                  label="Student Dashboard"
                  onClick={() => openStudentSection("home")}
                />
                <DrawerItem
                  active={isProfileOpen}
                  icon={<User className="h-[18px] w-[18px]" />}
                  label="My Profile"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsNotificationsOpen(false);
                    setIsProfileOpen(true);
                  }}
                />
                <DrawerItem
                  active={activeTab === "lessons"}
                  icon={<FileText className="h-[18px] w-[18px]" />}
                  label="Coaching Information"
                  onClick={() => openStudentSection("lessons")}
                />
                <DrawerItem
                  active={isProfileOpen}
                  icon={<Settings className="h-[18px] w-[18px]" />}
                  label="Settings"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsNotificationsOpen(false);
                    setIsProfileOpen(true);
                  }}
                />
              </div>

              <div className="mt-auto border-t border-white/15 pt-4">
                <DrawerItem
                  icon={<LogOut className="h-[18px] w-[18px]" />}
                  label={supportMode ? "Exit Support Mode" : "Sign Out"}
                  danger
                  onClick={() =>
                    supportMode ? void exitSupportMode() : logout()
                  }
                />
              </div>
            </aside>
          </div>
        )}

        <main className="mx-auto max-w-lg px-4 py-4 space-y-4">
          {message && (
            <div className="rounded-2xl bg-red-50 p-3.5 text-xs text-red-600 flex items-center gap-2.5 border border-red-100 animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="font-semibold">{message}</span>
            </div>
          )}

          {/* HOME — reference-style student dashboard */}
          {activeTab === "home" && (
            <div className="relative min-h-[calc(100vh-150px)] space-y-4 pb-12 animate-fadeIn">
              <section className="relative overflow-hidden rounded-[22px] border border-cyan-300/40 bg-[linear-gradient(135deg,#08a8e8_0%,#0878dd_45%,#1547c8_100%)] px-5 py-5 text-white shadow-[0_20px_50px_-24px_rgba(0,141,255,0.65)]">
                <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-cyan-200/20 blur-3xl" />
                <div className="absolute right-5 top-8 h-2 w-2 rounded-full bg-cyan-100/70" />
                <div className="absolute right-14 top-14 h-1.5 w-1.5 rounded-full bg-white/70" />
                <div className="absolute right-24 top-7 h-1 w-1 rounded-full bg-cyan-100/80" />

                <div className="relative flex items-start gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/60 bg-white shadow-lg">
                    {instituteLogo ? (
                      <img
                        src={instituteLogo}
                        alt={`${instituteLabel} logo`}
                        className="h-full w-full object-contain p-1.5"
                      />
                    ) : (
                      <GraduationCap
                        className="h-9 w-9 text-blue-600"
                        strokeWidth={2.2}
                      />
                    )}
                  </div>

                  <div className="min-w-0 pt-2">
                    <p className="truncate text-sm font-black">
                      {instituteLabel}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold text-blue-100">
                      Learn Today, Build Tomorrow
                    </p>
                  </div>
                </div>

                <div className="relative mt-4 pr-[118px]">
                  <p className="text-sm font-extrabold text-white/95">Welcome</p>
                  <h2 className="mt-0.5 truncate text-[28px] font-black leading-none tracking-tight">
                    {student?.name || "Student"}
                  </h2>
                </div>

                {/* Decorative books/learning illustration */}
                <div className="pointer-events-none absolute bottom-3 right-4 h-24 w-28">
                  <div className="absolute bottom-1 right-0 h-4 w-24 rounded-md border border-white/20 bg-orange-400 shadow-lg" />
                  <div className="absolute bottom-5 right-2 h-4 w-20 rounded-md border border-white/20 bg-white shadow-lg" />
                  <div className="absolute bottom-9 right-0 h-4 w-24 rounded-md border border-white/20 bg-sky-200 shadow-lg" />
                  <div className="absolute bottom-[52px] right-4 h-4 w-20 rounded-md border border-white/20 bg-blue-900 shadow-lg" />
                  <div className="absolute bottom-[65px] right-2 h-4 w-20 rounded-md border border-white/20 bg-white shadow-lg" />
                  <div className="absolute bottom-[72px] right-0 h-7 w-7 rounded-full bg-emerald-400/90" />
                  <div className="absolute bottom-[84px] right-5 h-8 w-3 rotate-[32deg] rounded-full bg-emerald-300/90" />
                  <div className="absolute bottom-[85px] right-0 h-8 w-3 -rotate-[28deg] rounded-full bg-emerald-500/90" />
                </div>
              </section>

              {examSummary.live > 0 && (
                <button
                  type="button"
                  onClick={() => openStudentSection("exams")}
                  className="flex w-full items-center justify-between rounded-2xl border border-red-300/30 bg-red-500/10 p-3 text-left text-white backdrop-blur-sm transition active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500 text-white">
                      <Play className="h-4 w-4 fill-white" />
                    </span>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-red-300">
                        Live test
                      </p>
                      <p className="mt-0.5 text-xs font-black">
                        {examSummary.live} test{examSummary.live > 1 ? "s" : ""} ongoing
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-red-200" />
                </button>
              )}

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
                  <HomeShortcut
                    label="My Profile"
                    icon={<User className="h-5 w-5" />}
                    tone="blue"
                    onClick={() => setIsProfileOpen(true)}
                  />
                  <HomeShortcut
                    label="ID Card"
                    icon={<IdCard className="h-5 w-5" />}
                    tone="violet"
                    onClick={() => openStudentSection("idcard")}
                  />
                  <HomeShortcut
                    label="My Teachers"
                    icon={<Users className="h-5 w-5" />}
                    tone="emerald"
                    onClick={() => openStudentSection("teachers")}
                  />
                  <HomeShortcut
                    label="Time Table"
                    icon={<CalendarDays className="h-5 w-5" />}
                    tone="amber"
                    onClick={() => openStudentSection("timetable")}
                  />
                  <HomeShortcut
                    label="Results"
                    icon={<FileText className="h-5 w-5" />}
                    tone="rose"
                    onClick={() => openStudentSection("results")}
                  />
                  <HomeShortcut
                    label="Fees"
                    icon={<IndianRupee className="h-5 w-5" />}
                    tone="orange"
                    onClick={() => openStudentSection("fees")}
                  />
                  <HomeShortcut
                    label="Homework"
                    icon={<BookOpen className="h-5 w-5" />}
                    tone="violet"
                    badge={homework.length > 0 ? String(homework.length) : undefined}
                    onClick={() => openStudentSection("homework")}
                  />
                  <HomeShortcut
                    label="My Lessons"
                    icon={<BookMarked className="h-5 w-5" />}
                    tone="cyan"
                    onClick={() => openStudentSection("lessons")}
                  />
                  <HomeShortcut
                    label="Attendance"
                    icon={<ClipboardCheck className="h-5 w-5" />}
                    tone="emerald"
                    onClick={() => openStudentSection("attendance")}
                  />
                  <HomeShortcut
                    label="Test"
                    icon={<FileText className="h-5 w-5" />}
                    tone="indigo"
                    badge={examSummary.live > 0 ? "LIVE" : undefined}
                    onClick={() => openStudentSection("exams")}
                  />
                </div>
              </section>

              {/* Subtle school illustration like the reference */}
              <div className="pointer-events-none relative mt-8 h-28 overflow-hidden opacity-75">
                <div className="absolute bottom-0 left-[-18%] h-20 w-[75%] rounded-[50%] bg-blue-800/35" />
                <div className="absolute bottom-[-8px] right-[-20%] h-24 w-[85%] rounded-[50%] bg-blue-700/30" />
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-blue-500/55">
                  <School className="h-24 w-24" strokeWidth={1.35} />
                </div>
                <div className="absolute bottom-3 left-[24%] h-9 w-3 rounded-t-full bg-blue-700/35" />
                <div className="absolute bottom-3 right-[24%] h-11 w-3 rounded-t-full bg-blue-700/35" />
                <div className="absolute bottom-10 left-[21%] h-8 w-8 rounded-full bg-blue-600/30" />
                <div className="absolute bottom-12 right-[20%] h-9 w-9 rounded-full bg-blue-600/30" />
              </div>
            </div>
          )}

          {/* HOMEWORK */}
          {activeTab === "homework" && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Subject or Homework..."
                  value={homeworkSearch}
                  onChange={(e) => setHomeworkSearch(e.target.value)}
                  className="w-full rounded-2xl border-none bg-white py-3 pl-10 pr-4 text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="space-y-2.5">
                {filteredHomeworks.length ? (
                  filteredHomeworks.map((h) => (
                    <div
                      key={h.id}
                      onClick={() => setSelectedHomework(h)}
                      className="rounded-2xl bg-white p-4 shadow-sm cursor-pointer active:scale-[0.98]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="inline-flex rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700">
                          {h.subjectName || "Subject"}
                        </span>
                        <p className="text-xs font-extrabold text-slate-700">
                          {formatDate(h.dueDate)}
                        </p>
                      </div>
                      <h4 className="mt-2 text-xs font-black text-slate-800">
                        {h.title}
                      </h4>
                      <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 bg-slate-50 p-2 rounded-xl">
                        {h.description}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyText text="No matching homework records found." />
                )}
              </div>
            </div>
          )}

          {/* TIMETABLE */}
          {activeTab === "timetable" && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="flex items-center gap-2.5 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
                <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">
                    Class Timetable
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold">
                    Batch: {student?.batchName || "Assigned Batch"}
                  </p>
                </div>
              </div>

              <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected =
                    selectedDay.toLowerCase() === day.toLowerCase();
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`shrink-0 rounded-2xl px-3.5 py-2 text-[10px] font-black uppercase tracking-wider active:scale-95 ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-md"
                          : "bg-white text-slate-500 border border-slate-100"
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2.5">
                {dayTimetable.length > 0 ? (
                  dayTimetable.map((slot) => (
                    <div
                      key={slot.id}
                      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm flex items-center justify-between"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-block rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700">
                            {slot.subjectName || "Subject"}
                          </span>
                          {slot.room && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                              <MapPin className="h-3 w-3" /> {slot.room}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-extrabold text-slate-800 mt-1">
                          {slot.subjectName || "Class Lecture"}
                        </h4>
                        {slot.teacherName && (
                          <p className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                            <User className="h-3 w-3" /> {slot.teacherName}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-1 text-xs font-black text-indigo-900">
                          <Clock className="h-3.5 w-3.5 text-indigo-600" />
                          <span>{slot.startTime}</span>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                          to {slot.endTime}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyText
                    text={`No lectures scheduled for ${selectedDay}.`}
                  />
                )}
              </div>
            </div>
          )}

          {/* EXAMS / TESTS */}
          {activeTab === "exams" && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-800">
                    Online / Offline Tests
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    Apne exams yahan dekho aur live test attend karo
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("home")}
                  className="text-[10px] font-bold text-blue-600"
                >
                  ← Home
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-blue-50 p-3 border border-blue-100">
                  <p className="text-[9px] font-bold text-blue-800 uppercase">
                    Upcoming
                  </p>
                  <p className="text-xl font-black text-blue-900 mt-0.5">
                    {examSummary.upcoming}
                  </p>
                </div>
                <div className="rounded-2xl bg-red-50 p-3 border border-red-100">
                  <p className="text-[9px] font-bold text-red-800 uppercase">
                    Live Now
                  </p>
                  <p className="text-xl font-black text-red-900 mt-0.5">
                    {examSummary.live}
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-3 border border-emerald-100">
                  <p className="text-[9px] font-bold text-emerald-800 uppercase">
                    Completed
                  </p>
                  <p className="text-xl font-black text-emerald-900 mt-0.5">
                    {examSummary.completed}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {(["all", "upcoming", "live", "completed"] as const).map(
                  (f) => (
                    <button
                      key={f}
                      onClick={() => setExamFilter(f)}
                      className={`shrink-0 rounded-full px-4 py-2 text-[10px] font-extrabold uppercase tracking-wide active:scale-95 ${
                        examFilter === f
                          ? "bg-violet-600 text-white shadow-md"
                          : "bg-white text-slate-500 border border-slate-100"
                      }`}
                    >
                      {f === "all" ? "All Tests" : f}
                    </button>
                  )
                )}
              </div>

              <div className="space-y-3">
                {filteredExams.length ? (
                  filteredExams.map((exam) => (
                    <ExamCard
                      key={exam.id}
                      exam={exam}
                      onClick={() => setSelectedExam(exam)}
                    />
                  ))
                ) : (
                  <EmptyText
                    text={
                      examFilter === "all"
                        ? "Koi test schedule nahi hai abhi."
                        : `No ${examFilter} tests found.`
                    }
                  />
                )}
              </div>
            </div>
          )}

          {/* FEES TAB - SHOWS BOTH SUMMARY CARDS + SPECIFIC MONTHLY ENTRIES ONLY */}
          {activeTab === "fees" && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-3xl">
                  <span className="text-[9px] font-bold text-emerald-800 block uppercase tracking-wider">
                    Paid Amount
                  </span>
                  <span className="text-xl font-black text-emerald-900 block mt-0.5">
                    {inr(feeSummary.paid)}
                  </span>
                </div>
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-3xl">
                  <span className="text-[9px] font-bold text-rose-800 block uppercase tracking-wider">
                    Remaining Due
                  </span>
                  <span className="text-xl font-black text-rose-900 block mt-0.5">
                    {inr(feeSummary.pending)}
                  </span>
                </div>
              </div>

              {/* Display Past Paid & Current Month Fee Entries Only */}
              <div className="space-y-2.5">
                {displayPayments.length ? (
                  displayPayments.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPayment(p)}
                      className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm cursor-pointer active:scale-[0.98] border border-slate-50"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-extrabold text-xs text-slate-800 truncate">
                          {p.monthLabel}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {p.status === "paid" && p.paidDate
                            ? `Paid on: ${formatDate(p.paidDate)}`
                            : `Due Date: ${formatDate(p.dueDate)}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-black text-xs text-slate-800">
                          {inr(p.totalAmount ?? p.amount)}
                        </p>
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyText text="No fee payment records for current or previous months." />
                )}
              </div>
            </div>
          )}

          {/* RESULTS */}
          {activeTab === "results" && (
            <div className="space-y-3.5 animate-fadeIn">
              {latestResults.length ? (
                <div className="space-y-3">
                  {latestResults.map((r: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-3xl bg-white p-4 shadow-sm border border-slate-50"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <p className="font-extrabold text-xs text-slate-800">
                          {r.subject}
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase ${
                            r.resultStatus === "Pass"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {r.resultStatus || "-"}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div>
                          <span className="text-[9px] text-slate-400 block font-bold">
                            Obtained
                          </span>
                          <span className="text-xs font-black text-blue-600 block mt-0.5">
                            {r.marksObtained ?? "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block font-bold">
                            Total
                          </span>
                          <span className="text-xs font-bold text-slate-700 block mt-0.5">
                            {r.totalMarks}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block font-bold">
                            Grade
                          </span>
                          <span className="text-xs font-black text-purple-600 block mt-0.5">
                            {r.grade || "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyText text="Exam results have not been posted yet." />
              )}
            </div>
          )}

          {/* ATTENDANCE */}
          {activeTab === "attendance" && (
            <div className="space-y-4 animate-fadeIn">
              <StudentSectionHeader
                title="Attendance"
                description="Current month attendance summary"
                icon={<ClipboardCheck className="h-5 w-5" />}
                onBack={() => openStudentSection("home")}
              />

              <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="bg-[linear-gradient(105deg,#020817_0%,#07112a_58%,#21184d_100%)] p-5 text-white">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
                    Monthly attendance
                  </p>
                  <div className="mt-3 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-4xl font-black tracking-tight">
                        {attendance?.percentage ?? 0}%
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-300">
                        {attendance?.totalClasses || 0} classes marked
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <ClipboardCheck className="h-7 w-7 text-cyan-200" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100">
                  <AttendanceStat
                    label="Total"
                    value={attendance?.totalClasses || 0}
                    className="text-slate-900"
                  />
                  <AttendanceStat
                    label="Present"
                    value={attendance?.present || 0}
                    className="text-emerald-600"
                  />
                  <AttendanceStat
                    label="Absent"
                    value={attendance?.absent || 0}
                    className="text-red-500"
                  />
                  <AttendanceStat
                    label="Late"
                    value={attendance?.late || 0}
                    className="text-amber-500"
                  />
                </div>

                <div className="p-5">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600">
                      Attendance rate
                    </span>
                    <span className="font-black text-cyan-700">
                      {attendance?.percentage ?? 0}%
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#06b6d4,#2563eb)] transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, Number(attendance?.percentage || 0))
                        )}%`,
                      }}
                    />
                  </div>
                  {!attendance && (
                    <p className="mt-4 text-xs font-semibold leading-5 text-slate-400">
                      Attendance summary abhi available nahi hai.
                    </p>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* MY TEACHERS */}
          {activeTab === "teachers" && (
            <div className="space-y-4 animate-fadeIn">
              <StudentSectionHeader
                title="My Teachers"
                description="Teachers from your current timetable"
                icon={<Users className="h-5 w-5" />}
                onBack={() => openStudentSection("home")}
              />

              {teacherNames.length > 0 ? (
                <div className="space-y-3">
                  {teacherNames.map((teacherName, index) => {
                    const teacherSubjects = Array.from(
                      new Set(
                        timetable
                          .filter(
                            (item) =>
                              String(item.teacherName || "").trim() ===
                              teacherName
                          )
                          .map((item) => String(item.subjectName || "").trim())
                          .filter(Boolean)
                      )
                    );
                    return (
                      <div
                        key={teacherName}
                        className="flex items-center gap-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                          <span className="text-sm font-black">
                            {teacherName
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((part) => part[0] || "")
                              .join("")
                              .toUpperCase() || index + 1}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-slate-950">
                            {teacherName}
                          </p>
                          <p className="mt-1 text-[11px] font-semibold text-slate-500">
                            {teacherSubjects.length > 0
                              ? teacherSubjects.join(" · ")
                              : "Assigned teacher"}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyText text="Teacher information timetable me available nahi hai." />
              )}
            </div>
          )}

          {/* MY LESSONS / COACHING INFORMATION */}
          {activeTab === "lessons" && (
            <div className="space-y-4 animate-fadeIn">
              <StudentSectionHeader
                title="My Lessons"
                description="Course, batch and subjects"
                icon={<BookMarked className="h-5 w-5" />}
                onBack={() => openStudentSection("home")}
              />

              <section className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#020817_0%,#0b1735_62%,#1e3a8a_100%)] p-5 text-white shadow-lg">
                <div className="absolute -right-14 -top-16 h-40 w-40 rounded-full bg-cyan-400/15 blur-3xl" />
                <div className="relative">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                      <School className="h-6 w-6 text-cyan-200" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200">
                        Coaching information
                      </p>
                      <p className="mt-1 truncate text-base font-black">
                        {student?.courseName || "Course not assigned"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <InfoPill label="Batch" value={student?.batchName || "—"} />
                    <InfoPill
                      label="Class"
                      value={formatClassAndSection(
                        student?.className,
                        student?.section
                      )}
                    />
                    <InfoPill
                      label="Academic Year"
                      value={student?.academicYear || "—"}
                    />
                    <InfoPill
                      label="Roll No."
                      value={student?.enrollmentNo || "—"}
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Subjects in timetable
                </p>
                {lessonSubjects.length > 0 ? (
                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    {lessonSubjects.map((subject, index) => (
                      <button
                        type="button"
                        key={subject}
                        onClick={() => openStudentSection("timetable")}
                        className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left transition active:scale-[0.99]"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-cyan-700 shadow-sm">
                          <BookOpen className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[9px] font-bold text-slate-400">
                            Lesson {index + 1}
                          </span>
                          <span className="block truncate text-xs font-black text-slate-900">
                            {subject}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3">
                    <EmptyText text="Subjects timetable me available nahi hain." />
                  </div>
                )}
              </section>
            </div>
          )}

          {/* STUDENT ID CARD */}
          {activeTab === "idcard" && (
            <div className="space-y-4 animate-fadeIn">
              <StudentSectionHeader
                title="Student ID Card"
                description="Your digital student identity"
                icon={<IdCard className="h-5 w-5" />}
                onBack={() => openStudentSection("home")}
              />

              <section className="mx-auto w-full max-w-sm overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_60px_-38px_rgba(15,23,42,0.7)]">
                <div className="relative overflow-hidden bg-[linear-gradient(135deg,#020817_0%,#08204a_58%,#1d4ed8_100%)] px-5 pb-16 pt-5 text-white">
                  <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-cyan-300/20 blur-3xl" />
                  <div className="relative flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                      <GraduationCap className="h-6 w-6 text-cyan-100" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">
                        {instituteLabel}
                      </p>
                      <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-cyan-200">
                        Student identity card
                      </p>
                    </div>
                  </div>
                </div>

                <div className="-mt-11 px-5 pb-5">
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[26px] border-4 border-white bg-slate-100 shadow-lg">
                      {student?.photoDataUrl ? (
                        <img
                          src={student.photoDataUrl}
                          alt={student.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserRound className="h-10 w-10 text-slate-400" />
                      )}
                    </div>
                    <h3 className="mt-3 text-lg font-black text-slate-950">
                      {student?.name || "Student"}
                    </h3>
                    <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-700">
                      {student?.enrollmentNo || "Student ID"}
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2.5">
                    <IdInfo label="Class" value={formatClassAndSection(student?.className, student?.section)} />
                    <IdInfo label="Batch" value={student?.batchName || "—"} />
                    <IdInfo label="Course" value={student?.courseName || "—"} />
                    <IdInfo label="Session" value={student?.academicYear || "—"} />
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-950 px-4 py-3 text-center text-white">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      Portal Login ID
                    </p>
                    <p className="mt-1 truncate font-mono text-xs font-black text-cyan-200">
                      {student?.loginId || "Not available"}
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}
        </main>

        {/* HOMEWORK DRAWER */}
        {selectedHomework && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0">
            <div
              className="absolute inset-0"
              onClick={() => setSelectedHomework(null)}
            />
            <div className="relative w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl animate-slideUp">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
              <div className="flex justify-between items-start">
                <span className="inline-block rounded-xl bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                  {selectedHomework.subjectName}
                </span>
                <button
                  onClick={() => setSelectedHomework(null)}
                  className="rounded-full bg-slate-100 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-4 space-y-4">
                <h3 className="text-base font-black text-slate-800">
                  {selectedHomework.title}
                </h3>
                <p className="text-xs text-slate-500 font-bold flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" /> Due:{" "}
                  {formatDate(selectedHomework.dueDate)}
                </p>
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                  <p className="text-xs text-slate-600 font-semibold whitespace-normal break-words">
                    {selectedHomework.description}
                  </p>
                </div>
                <Button
                  onClick={() => setSelectedHomework(null)}
                  className="w-full rounded-2xl bg-blue-600 py-3 text-xs font-black"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* EXAM DRAWER */}
        {selectedExam && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0">
            <div
              className="absolute inset-0"
              onClick={() => setSelectedExam(null)}
            />
            <div className="relative w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl max-h-[85vh] overflow-y-auto animate-slideUp">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">
                    {selectedExam.examType === "online" ? (
                      <>
                        <Monitor className="h-3 w-3" /> ONLINE
                      </>
                    ) : (
                      <>
                        <PenTool className="h-3 w-3" /> OFFLINE
                      </>
                    )}
                  </span>
                  <ExamStatusBadge
                    status={selectedExam.status || "upcoming"}
                  />
                </div>
                <button
                  onClick={() => setSelectedExam(null)}
                  className="rounded-full bg-slate-100 p-1 shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-4 space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-800">
                    {selectedExam.title}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 mt-1">
                    Subject: {selectedExam.subjectName}
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  <DetailRow
                    label="Exam Date"
                    val={formatDate(selectedExam.examDate)}
                  />
                  {selectedExam.startTime && (
                    <DetailRow
                      label="Start Time"
                      val={formatTime(selectedExam.startTime)}
                    />
                  )}
                  {selectedExam.endTime && (
                    <DetailRow
                      label="End Time"
                      val={formatTime(selectedExam.endTime)}
                    />
                  )}
                  {selectedExam.durationMinutes && (
                    <DetailRow
                      label="Duration"
                      val={`${selectedExam.durationMinutes} mins`}
                    />
                  )}
                  <DetailRow
                    label="Total Marks"
                    val={String(selectedExam.totalMarks)}
                    highlight
                  />
                  {selectedExam.venue &&
                    selectedExam.examType === "offline" && (
                      <DetailRow label="Venue" val={selectedExam.venue} />
                    )}
                  {selectedExam.status === "completed" &&
                    selectedExam.marksObtained != null && (
                      <>
                        <DetailRow
                          label="Marks Obtained"
                          val={String(selectedExam.marksObtained)}
                          highlight
                        />
                        {selectedExam.grade && (
                          <DetailRow label="Grade" val={selectedExam.grade} />
                        )}
                      </>
                    )}
                </div>
                {selectedExam.syllabus && (
                  <div className="rounded-2xl bg-amber-50 p-3 border border-amber-100">
                    <p className="text-[10px] font-black text-amber-700 uppercase mb-1">
                      Syllabus
                    </p>
                    <p className="text-xs text-amber-900 font-semibold break-words">
                      {selectedExam.syllabus}
                    </p>
                  </div>
                )}
                {selectedExam.instructions && (
                  <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">
                      Instructions
                    </p>
                    <p className="text-xs text-slate-600 font-semibold break-words">
                      {selectedExam.instructions}
                    </p>
                  </div>
                )}
                {selectedExam.examType === "online" &&
                selectedExam.status === "live" &&
                selectedExam.examUrl ? (
                  <Button
                    onClick={() =>
                      window.open(selectedExam.examUrl, "_blank")
                    }
                    className="w-full rounded-2xl bg-red-600 py-3 text-xs font-black animate-livePulse"
                  >
                    <Play className="h-4 w-4 mr-2 fill-white" /> Attend Test Now
                  </Button>
                ) : selectedExam.examType === "online" &&
                  selectedExam.status === "upcoming" ? (
                  <Button
                    disabled
                    className="w-full rounded-2xl bg-slate-200 text-slate-500 py-3 text-xs font-black"
                  >
                    <Timer className="h-4 w-4 mr-2" /> Not Started Yet
                  </Button>
                ) : (
                  <Button
                    onClick={() => setSelectedExam(null)}
                    className="w-full rounded-2xl bg-blue-600 py-3 text-xs font-black"
                  >
                    Close
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* FEES DRAWER */}
        {selectedPayment && (() => {
          const lateDetails = computeLateFeeDetails(selectedPayment);
          return (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0">
              <div
                className="absolute inset-0"
                onClick={() => {
                  setSelectedPayment(null);
                  setShowLateFeeDropdown(false);
                }}
              />
              <div className="relative w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl animate-slideUp">
                <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">
                      Transaction
                    </h3>
                    <h2 className="text-base font-black text-slate-800 mt-0.5">
                      {selectedPayment.monthLabel}
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedPayment(null);
                      setShowLateFeeDropdown(false);
                    }}
                    className="rounded-full bg-slate-100 p-1 active:scale-90"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="mt-4 space-y-4">
                  <div className="divide-y divide-slate-100">
                    <DetailRow
                      label="Monthly Tuition Fees"
                      val={inr(selectedPayment.amount)}
                    />

                    {/* LATE FEES ROW WITH EXPANDABLE CALCULATION DROPDOWN */}
                    <div className="py-2.5">
                      <div
                        onClick={() =>
                          selectedPayment.lateFee > 0 &&
                          setShowLateFeeDropdown(!showLateFeeDropdown)
                        }
                        className={`flex items-center justify-between ${
                          selectedPayment.lateFee > 0
                            ? "cursor-pointer select-none"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400 font-bold">
                            Late Fees
                          </span>
                          {selectedPayment.lateFee > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              {lateDetails.daysLate} days late
                              {showLateFeeDropdown ? (
                                <ChevronUp className="h-3 w-3 ml-0.5" />
                              ) : (
                                <ChevronDown className="h-3 w-3 ml-0.5" />
                              )}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-extrabold text-slate-800 text-right">
                          {inr(selectedPayment.lateFee)}
                        </span>
                      </div>

                      {/* DROPDOWN BREAKDOWN BOX */}
                      {selectedPayment.lateFee > 0 && showLateFeeDropdown && (
                        <div className="mt-2.5 bg-amber-50/80 rounded-2xl p-3.5 border border-amber-200/80 space-y-2 animate-fadeIn text-xs">
                          <div className="flex items-center justify-between text-amber-900 font-bold pb-1.5 border-b border-amber-200/60">
                            <span className="text-[10px] uppercase tracking-wider text-amber-700">
                              Late Fee Calculation
                            </span>
                            <span className="text-[10px] bg-amber-200/60 text-amber-900 px-2 py-0.5 rounded-md font-extrabold">
                              {lateDetails.daysLate} Days Delay
                            </span>
                          </div>
                          <div className="space-y-1 text-[11px] text-amber-900">
                            <div className="flex justify-between">
                              <span className="text-amber-700 font-medium">
                                Late Fees:
                              </span>
                              <span className="font-semibold">
                                {inr(lateDetails.perDayRate)} / day
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-amber-700 font-medium">
                                Total Delay:
                              </span>
                              <span className="font-semibold">
                                {lateDetails.daysLate} Days
                              </span>
                            </div>
                          </div>
                          <div className="pt-2 border-t border-amber-200/60 flex justify-between items-center text-xs font-black text-amber-950">
                            <span>
                              Total ({lateDetails.daysLate} days ×{" "}
                              {inr(lateDetails.perDayRate)}):
                            </span>
                            <span className="text-sm font-black text-amber-900">
                              {inr(selectedPayment.lateFee)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <DetailRow
                      label="Total Amount"
                      val={inr(selectedPayment.totalAmount)}
                      highlight
                    />
                    <DetailRow
                      label="Paid"
                      val={inr(selectedPayment.paidAmount)}
                    />
                    <DetailRow
                      label="Status"
                      val={<StatusBadge status={selectedPayment.status} />}
                    />
                  </div>
                  
                  {/* Dynamic Action Buttons for Fee Receipt */}
                  <div className="flex gap-2 pt-2">
                    {selectedPayment.status === "paid" || selectedPayment.status === "partial" ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedPayment(null);
                            setShowLateFeeDropdown(false);
                          }}
                          className="flex-1 rounded-2xl border-slate-200 py-3 text-xs font-black text-slate-600"
                        >
                          Close
                        </Button>
                        <Button
                          onClick={() => {
                            setReceiptPreviewPayment(selectedPayment);
                            setSelectedPayment(null);
                            setShowLateFeeDropdown(false);
                          }}
                          className="flex-1 rounded-2xl bg-blue-600 py-3 text-xs font-black hover:bg-blue-700 shadow-sm"
                        >
                          <Download className="h-4 w-4 mr-1.5" /> Download Receipt
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => {
                          setSelectedPayment(null);
                          setShowLateFeeDropdown(false);
                        }}
                        className="w-full rounded-2xl bg-slate-200 text-slate-700 py-3 text-xs font-black hover:bg-slate-300"
                      >
                        Close
                      </Button>
                    )}
                  </div>

                </div>
              </div>
            </div>
          );
        })()}

        {/* RECEIPT LIVE PREVIEW MODAL / DRAWER */}
        {receiptPreviewPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div
              className="absolute inset-0"
              onClick={() => setReceiptPreviewPayment(null)}
            />
            <div className="relative w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl max-h-[92vh] overflow-y-auto animate-slideUp z-10 flex flex-col justify-between">
              
              {/* Receipt Visual Preview Box */}
              <div className="bg-white border-2 border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
                
                {/* Coaching Header Banner */}
                <div className="text-center border-b-2 border-slate-800 pb-3 space-y-1">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase font-mono">
                    SECOND SCHOOL CLASSES
                  </h1>
                  <p className="text-[11px] font-extrabold italic text-slate-800">
                    Where True Learning Comes....
                  </p>
                  <div className="text-[9px] font-bold text-slate-800 pt-1.5 border-t border-slate-300 leading-snug">
                    MIG 88, Pritam Nagar, Dhoomanganj, Prayagraj-211011 | Contact: +91-7844997666<br/>
                    Email: secondschoolclasses@gmail.com | Youtube: www.youtube.com/secondschoolclasses
                  </div>
                </div>

                <div className="text-center">
                  <span className="inline-block border-2 border-slate-900 bg-slate-50 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider">
                    OFFICIAL FEES RECEIPT
                  </span>
                </div>

                {/* Student Info Box */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Student Name:</span>
                    <span className="font-extrabold text-slate-900">{student?.name || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Enrollment / Roll No:</span>
                    <span className="font-bold text-slate-800">{student?.enrollmentNo || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Class & Batch:</span>
                    <span className="font-bold text-slate-800">{student?.className || "-"} {student?.batchName ? `(${student.batchName})` : ""}</span>
                  </div>
                </div>

                {/* Transaction Meta */}
                <div className="text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Fee Month:</span>
                    <span className="font-extrabold text-slate-800">{receiptPreviewPayment.monthLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Payment Date:</span>
                    <span className="font-bold text-slate-800">{receiptPreviewPayment.paidDate ? formatDate(receiptPreviewPayment.paidDate) : formatDate(new Date().toISOString())}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">Status:</span>
                    <StatusBadge status={receiptPreviewPayment.status} />
                  </div>
                </div>

                <div className="border-t border-slate-200 my-2" />

                {/* Fee Breakdown */}
                <div className="text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Monthly Tuition Fees:</span>
                    <span className="font-bold text-slate-800">{inr(receiptPreviewPayment.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Late Fees Penalty:</span>
                    <span className="font-bold text-slate-800">{inr(receiptPreviewPayment.lateFee)}</span>
                  </div>
                </div>

                {/* Total Box */}
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 flex justify-between items-center text-emerald-900">
                  <span className="text-xs font-black uppercase">Total Amount Paid</span>
                  <span className="text-lg font-black">{inr(receiptPreviewPayment.paidAmount || receiptPreviewPayment.totalAmount)}</span>
                </div>

                <p className="text-[9px] text-center text-slate-400 italic pt-1">
                  This is a computer-generated official receipt by SECOND SCHOOL CLASSES.
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setReceiptPreviewPayment(null)}
                  className="flex-1 rounded-2xl border-slate-200 py-3 text-xs font-black text-slate-600"
                >
                  Close Preview
                </Button>
                <Button
                  onClick={() => executePrintReceipt(receiptPreviewPayment)}
                  className="flex-1 rounded-2xl bg-blue-600 py-3 text-xs font-black hover:bg-blue-700 text-white shadow-md"
                >
                  <Printer className="h-4 w-4 mr-1.5" /> Print / Save as PDF
                </Button>
              </div>

            </div>
          </div>
        )}

        {/* NOTIFICATIONS */}
        {isNotificationsOpen && (
          <div className="fixed inset-0 z-[70] overflow-y-auto bg-[linear-gradient(180deg,#061b3b_0%,#03142f_58%,#02102a_100%)] text-white animate-fadeIn">
            <header className="sticky top-0 z-20 border-b border-white/10 bg-[#061b3b]/95 px-4 py-3 backdrop-blur-md">
              <div className="mx-auto flex max-w-lg items-center gap-3">
                <button
                  type="button"
                  aria-label="Back"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl text-white transition active:scale-95"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                  <h2 className="text-[15px] font-black">Notifications</h2>
                  <p className="text-[10px] font-semibold text-slate-400">
                    {unreadNotificationCount} unread
                  </p>
                </div>
                {notifications.length > 0 && unreadNotificationCount > 0 && (
                  <button
                    type="button"
                    className="ml-auto text-[10px] font-black text-cyan-300"
                    onClick={() =>
                      setReadNotifications(notifications.map((item) => item.id))
                    }
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </header>

            <main className="mx-auto max-w-lg space-y-2.5 px-4 pb-28 pt-4">
              {notifications.length === 0 ? (
                <div className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-12 text-center">
                  <Bell className="mx-auto h-8 w-8 text-slate-500" />
                  <p className="mt-3 text-sm font-black">No notifications</p>
                  <p className="mt-1 text-xs text-slate-400">
                    New updates will appear here.
                  </p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const isRead = readNotifications.includes(notification.id);
                  return (
                    <button
                      type="button"
                      key={notification.id}
                      onClick={() =>
                        setReadNotifications((current) =>
                          current.includes(notification.id)
                            ? current
                            : [...current, notification.id]
                        )
                      }
                      className={`flex w-full items-start gap-3 rounded-[22px] border p-4 text-left shadow-sm transition active:scale-[0.99] ${
                        isRead
                          ? "border-white/10 bg-white/5 text-slate-300"
                          : "border-cyan-300/20 bg-white text-slate-900"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                          isRead
                            ? "bg-white/10 text-slate-300"
                            : "bg-cyan-50 text-cyan-700"
                        }`}
                      >
                        <Bell className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-black">
                          {notification.title}
                        </span>
                        <span
                          className={`mt-1 block text-[10px] font-semibold leading-4 ${
                            isRead ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          {notification.description}
                        </span>
                      </span>
                      {!isRead && (
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                      )}
                    </button>
                  );
                })
              )}
            </main>
          </div>
        )}

        {/* PROFILE & SETTINGS */}
        {isProfileOpen && (
          <div className="fixed inset-0 z-[70] overflow-y-auto bg-[linear-gradient(180deg,#061b3b_0%,#03142f_58%,#02102a_100%)] text-white animate-fadeIn">
            <div className="min-h-screen">
              <header className="sticky top-0 z-20 border-b border-white/10 bg-[#061b3b]/95 px-4 py-3 backdrop-blur-md">
                <div className="mx-auto flex max-w-lg items-center gap-3">
                  <button
                    type="button"
                    aria-label="Back"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl text-white transition active:scale-95"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <h2 className="text-[16px] font-black tracking-tight">
                    Profile & Settings
                  </h2>
                </div>
              </header>

              <main className="mx-auto max-w-lg px-4 pb-28 pt-6">
                <div className="relative flex flex-col items-center text-center">
                  <div className="absolute -right-20 top-0 h-44 w-44 rounded-full bg-blue-600/15" />
                  <div className="absolute -left-20 top-16 h-36 w-36 rounded-full bg-blue-500/10" />

                  <div className="relative z-10">
                    <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white/80 bg-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.3)]">
                      {student?.photoDataUrl ? (
                        <img
                          src={student.photoDataUrl}
                          alt={student.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserRound className="h-12 w-12 text-cyan-100" />
                      )}
                    </div>

                    {!supportMode && (
                      <button
                        type="button"
                        onClick={openEditModal}
                        aria-label="Edit profile photo"
                        className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-[#061b3b] bg-blue-500 text-white shadow-lg transition active:scale-90"
                      >
                        <Camera className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <h3 className="relative z-10 mt-4 text-[24px] font-black tracking-tight">
                    {student?.name || "Student"}
                  </h3>
                </div>

                {supportMode && (
                  <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-3 text-xs font-semibold leading-5 text-cyan-100">
                    <div className="flex items-center gap-2 font-black">
                      <Eye className="h-4 w-4" />
                      Read-only Support Mode
                    </div>
                    <p className="mt-1 text-[11px] text-cyan-200/80">
                      Profile edit aur password change disabled hain.
                    </p>
                  </div>
                )}

                <section className="mt-5 rounded-[22px] bg-white p-3 text-slate-950 shadow-[0_16px_35px_-24px_rgba(0,0,0,0.55)]">
                  <button
                    type="button"
                    onClick={() => {
                      if (!supportMode) openEditModal();
                    }}
                    disabled={supportMode}
                    className={`flex w-full items-center gap-3 rounded-[18px] border border-blue-100 bg-white p-3 text-left transition ${
                      supportMode
                        ? "cursor-not-allowed opacity-60"
                        : "hover:bg-slate-50 active:scale-[0.99]"
                    }`}
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-blue-600">
                      <User className="h-6 w-6" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-[#071a3f]">
                        My Profile
                      </span>
                      <span className="mt-0.5 block text-[10px] font-medium text-slate-500">
                        View and edit your profile information
                      </span>
                    </span>
                    <ChevronRight className="h-5 w-5 text-blue-400" />
                  </button>
                </section>

                <section className="mt-4 rounded-[22px] bg-white p-4 text-slate-950 shadow-[0_16px_35px_-24px_rgba(0,0,0,0.55)]">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                      <LockKeyhole className="h-4 w-4" />
                    </span>
                    <h3 className="text-[17px] font-black text-[#071a3f]">
                      Change Password
                    </h3>
                  </div>

                  <div className="mt-4 space-y-3.5">
                    <PasswordField
                      label="Current Password"
                      value={passwordForm.currentPassword}
                      onChange={(value) =>
                        setPasswordForm((current) => ({
                          ...current,
                          currentPassword: value,
                        }))
                      }
                      show={showCurrentPassword}
                      onToggle={() =>
                        setShowCurrentPassword((current) => !current)
                      }
                      placeholder="Enter current password"
                      disabled={supportMode || isPasswordSaving}
                    />

                    <PasswordField
                      label="New Password"
                      value={passwordForm.newPassword}
                      onChange={(value) =>
                        setPasswordForm((current) => ({
                          ...current,
                          newPassword: value,
                        }))
                      }
                      show={showNewPassword}
                      onToggle={() => setShowNewPassword((current) => !current)}
                      placeholder="Enter new password"
                      disabled={supportMode || isPasswordSaving}
                    />

                    <PasswordField
                      label="Confirm New Password"
                      value={passwordForm.confirmPassword}
                      onChange={(value) =>
                        setPasswordForm((current) => ({
                          ...current,
                          confirmPassword: value,
                        }))
                      }
                      show={showConfirmPassword}
                      onToggle={() =>
                        setShowConfirmPassword((current) => !current)
                      }
                      placeholder="Confirm new password"
                      disabled={supportMode || isPasswordSaving}
                    />

                    {passwordMessage && (
                      <div
                        className={`rounded-xl border px-3 py-2 text-[11px] font-bold ${
                          passwordMessage.type === "success"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        {passwordMessage.text}
                      </div>
                    )}

                    <Button
                      type="button"
                      onClick={() => void updateOwnPassword()}
                      disabled={supportMode || isPasswordSaving}
                      className="h-12 w-full rounded-xl bg-[linear-gradient(90deg,#08b7e8_0%,#087ff5_55%,#1466ef_100%)] text-sm font-black text-white shadow-[0_10px_24px_-12px_rgba(8,127,245,0.75)] hover:opacity-95 disabled:opacity-50"
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      {isPasswordSaving ? "Updating..." : "Update Password"}
                    </Button>
                  </div>
                </section>
              </main>
            </div>
          </div>
        )}

        {/* EDIT FORM */}
        {isEditOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0">
            <div
              className="absolute inset-0"
              onClick={() => !isSaving && setIsEditOpen(false)}
            />
            <div className="relative w-full max-w-lg rounded-t-3xl bg-[#f6f7f9] p-0 shadow-2xl h-[95vh] overflow-hidden animate-slideUp flex flex-col">
              <div className="bg-white px-5 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 z-20 shadow-sm shrink-0">
                <div>
                  <h2 className="text-base font-black text-slate-800">
                    Student Admission Form
                  </h2>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Update your details carefully
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => !isSaving && setIsEditOpen(false)}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={saveProfileChanges}
                    disabled={isSaving}
                    className="h-8 bg-slate-950 px-4 text-xs font-bold text-white hover:bg-slate-900"
                  >
                    {isSaving ? "Saving..." : "Save Form"}
                  </Button>
                </div>
              </div>

              <div className="p-4 overflow-y-auto space-y-5 flex-1">
                {editMessage && (
                  <div
                    className={`rounded-xl p-3 text-xs font-bold ${
                      editMessage.type === "success"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {editMessage.text}
                  </div>
                )}

                {/* 1 Student Info */}
                <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white">
                  <CardContent className="p-5 space-y-4">
                    <SectionTitle icon={<GraduationCap className="h-4 w-4" />}>
                      Student's Information
                    </SectionTitle>
                    <div className="flex flex-col md:flex-row gap-5">
                      <div className="flex-1 space-y-4">
                        <FormRow>
                          <EditField
                            label="Student Name"
                            value={editForm.name}
                            onChange={(v) => setFormValue("name", v)}
                            error={fieldErrors.name}
                            disabled={isSaving}
                          />
                          <EditField
                            label="Date of Birth"
                            value={editForm.dateOfBirth}
                            onChange={(v) => setFormValue("dateOfBirth", v)}
                            type="date"
                            disabled={isSaving}
                          />
                        </FormRow>
                        <FormRow>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">
                              Gender
                            </label>
                            <select
                              value={editForm.gender}
                              onChange={(e) =>
                                setFormValue("gender", e.target.value)
                              }
                              disabled={isSaving}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
                            >
                              <option value="">Select</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">
                              Blood Group
                            </label>
                            <select
                              value={editForm.bloodGroup}
                              onChange={(e) =>
                                setFormValue("bloodGroup", e.target.value)
                              }
                              disabled={isSaving}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
                            >
                              <option value="">Select</option>
                              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                                (b) => (
                                  <option key={b} value={b}>
                                    {b}
                                  </option>
                                )
                              )}
                            </select>
                          </div>
                        </FormRow>
                      </div>
                      <div className="rounded-xl border-2 border-dashed bg-slate-50 p-3 w-full md:w-[160px] flex flex-col items-center">
                        <Label className="text-[10px] font-bold uppercase text-slate-500 mb-2">
                          Student Photo
                        </Label>
                        <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white shadow-sm bg-slate-100">
                          {editForm.photoDataUrl ? (
                            <img
                              src={editForm.photoDataUrl}
                              alt="Student"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <UserRound className="h-full w-full p-5 text-slate-300" />
                          )}
                        </div>
                        <div className="mt-3 w-full grid grid-cols-2 gap-1.5">
                          <label className="flex h-8 cursor-pointer items-center justify-center gap-1 rounded-lg border bg-white text-[10px] font-bold">
                            <Upload className="h-3 w-3" /> Files
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e: any) =>
                                handlePhotoChange(e.target.files?.[0])
                              }
                              disabled={isSaving}
                            />
                          </label>
                          <label className="flex h-8 cursor-pointer items-center justify-center gap-1 rounded-lg border bg-white text-[10px] font-bold">
                            <Camera className="h-3 w-3" /> Snap
                            <input
                              type="file"
                              accept="image/*"
                              capture="user"
                              className="hidden"
                              onChange={(e: any) =>
                                handlePhotoChange(e.target.files?.[0])
                              }
                              disabled={isSaving}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-slate-100 space-y-4">
                      <FormRow>
                        <EditField
                          label="School Name"
                          value={editForm.schoolName}
                          onChange={(v) => setFormValue("schoolName", v)}
                          disabled={isSaving}
                        />
                      </FormRow>
                      <FormRow>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">
                            Class
                          </label>
                          <select
                            value={editForm.className}
                            onChange={(e) =>
                              setFormValue("className", e.target.value)
                            }
                            disabled={isSaving}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
                          >
                            <option value="">Select</option>
                            {CLASS_OPTIONS.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                        <EditField
                          label="Section"
                          value={editForm.section}
                          onChange={(v) => setFormValue("section", v)}
                          disabled={isSaving}
                        />
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">
                            Board
                          </label>
                          <select
                            value={editForm.board}
                            onChange={(e) =>
                              setFormValue("board", e.target.value)
                            }
                            disabled={isSaving}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
                          >
                            <option value="">Select</option>
                            {BOARD_OPTIONS.map((b) => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            ))}
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </FormRow>
                      <FormRow>
                        <EditField
                          label="Last Class %"
                          value={editForm.lastClassPercentage}
                          onChange={(v) =>
                            setFormValue("lastClassPercentage", v)
                          }
                          type="number"
                          disabled={isSaving}
                        />
                        <EditField
                          label="Last Class Marks"
                          value={editForm.lastClassMarks}
                          onChange={(v) => setFormValue("lastClassMarks", v)}
                          disabled={isSaving}
                        />
                      </FormRow>
                      <div className="grid grid-cols-2 gap-3 opacity-60 pointer-events-none">
                        <EditField
                          label="Course"
                          value={student?.courseName || ""}
                          onChange={() => {}}
                          disabled
                        />
                        <EditField
                          label="Batch"
                          value={student?.batchName || ""}
                          onChange={() => {}}
                          disabled
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 2 Parents */}
                <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white">
                  <CardContent className="p-5 space-y-5">
                    <SectionTitle number={2} icon={<User className="h-4 w-4" />}>
                      Parent's Information
                    </SectionTitle>
                    <div className="rounded-xl border p-4 bg-slate-50/50 space-y-3">
                      <h3 className="text-xs font-bold text-slate-600">
                        FATHER
                      </h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        <EditField
                          label="Father's Name"
                          value={editForm.fatherName}
                          onChange={(v) => setFormValue("fatherName", v)}
                          disabled={isSaving}
                        />
                        <EditField
                          label="Occupation"
                          value={editForm.fatherOccupation}
                          onChange={(v) => setFormValue("fatherOccupation", v)}
                          disabled={isSaving}
                        />
                        <EditField
                          label="Phone"
                          value={editForm.fatherPhone}
                          onChange={(v) => setFormValue("fatherPhone", v)}
                          type="tel"
                          disabled={isSaving}
                        />
                        <EditField
                          label="WhatsApp"
                          value={editForm.fatherWhatsapp}
                          onChange={(v) => setFormValue("fatherWhatsapp", v)}
                          type="tel"
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                    <div className="rounded-xl border p-4 bg-slate-50/50 space-y-3">
                      <h3 className="text-xs font-bold text-slate-600">
                        MOTHER
                      </h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        <EditField
                          label="Mother's Name"
                          value={editForm.motherName}
                          onChange={(v) => setFormValue("motherName", v)}
                          disabled={isSaving}
                        />
                        <EditField
                          label="Occupation"
                          value={editForm.motherOccupation}
                          onChange={(v) => setFormValue("motherOccupation", v)}
                          disabled={isSaving}
                        />
                        <EditField
                          label="Phone"
                          value={editForm.motherPhone}
                          onChange={(v) => setFormValue("motherPhone", v)}
                          type="tel"
                          disabled={isSaving}
                        />
                        <EditField
                          label="WhatsApp"
                          value={editForm.motherWhatsapp}
                          onChange={(v) => setFormValue("motherWhatsapp", v)}
                          type="tel"
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <EditField
                        label="Emergency Phone"
                        value={editForm.emergencyPhone}
                        onChange={(v) => setFormValue("emergencyPhone", v)}
                        type="tel"
                        disabled={isSaving}
                      />
                      <EditField
                        label="Email"
                        value={editForm.email}
                        onChange={(v) => setFormValue("email", v)}
                        type="email"
                        disabled={isSaving}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 3 Address */}
                <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white">
                  <CardContent className="p-5 space-y-5">
                    <SectionTitle number={3} icon={<MapPin className="h-4 w-4" />}>
                      Address Details
                    </SectionTitle>
                    <div className="rounded-xl border p-4 bg-slate-50/50 space-y-3">
                      <h3 className="text-xs font-bold text-slate-600">
                        CORRESPONDENCE
                      </h3>
                      <EditField
                        label="Full Address"
                        value={editForm.correspondenceAddress}
                        onChange={(v) =>
                          setFormValue("correspondenceAddress", v)
                        }
                        textarea
                        disabled={isSaving}
                      />
                      <div className="grid gap-3 grid-cols-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">
                            State
                          </label>
                          <select
                            value={editForm.correspondenceState}
                            onChange={(e) =>
                              setFormValue(
                                "correspondenceState",
                                e.target.value
                              )
                            }
                            disabled={isSaving}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
                          >
                            <option value="">Select</option>
                            {INDIA_STATES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                        <EditField
                          label="District"
                          value={editForm.correspondenceDistrict}
                          onChange={(v) =>
                            setFormValue("correspondenceDistrict", v)
                          }
                          disabled={isSaving}
                        />
                        <EditField
                          label="PIN"
                          value={editForm.correspondencePin}
                          onChange={(v) =>
                            setFormValue("correspondencePin", v)
                          }
                          type="tel"
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                    <div className="rounded-xl border p-4 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-600">
                          PERMANENT
                        </h3>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sameAddress}
                            onChange={handleSameAddressToggle}
                            disabled={isSaving}
                            className="w-3.5 h-3.5 accent-blue-600"
                          />
                          <span className="text-[10px] font-bold text-blue-600">
                            Same as Correspondence
                          </span>
                        </label>
                      </div>
                      <EditField
                        label="Full Address"
                        value={editForm.permanentAddress}
                        onChange={(v) => setFormValue("permanentAddress", v)}
                        textarea
                        disabled={isSaving || sameAddress}
                      />
                      <div className="grid gap-3 grid-cols-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">
                            State
                          </label>
                          <select
                            value={editForm.permanentState}
                            onChange={(e) =>
                              setFormValue("permanentState", e.target.value)
                            }
                            disabled={isSaving || sameAddress}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
                          >
                            <option value="">Select</option>
                            {INDIA_STATES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                        <EditField
                          label="District"
                          value={editForm.permanentDistrict}
                          onChange={(v) =>
                            setFormValue("permanentDistrict", v)
                          }
                          disabled={isSaving || sameAddress}
                        />
                        <EditField
                          label="PIN"
                          value={editForm.permanentPin}
                          onChange={(v) => setFormValue("permanentPin", v)}
                          type="tel"
                          disabled={isSaving || sameAddress}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 4 Documents */}
                <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white">
                  <CardContent className="p-5 space-y-4">
                    <SectionTitle
                      number={4}
                      icon={<FileCheck2 className="h-4 w-4" />}
                    >
                      Documents
                    </SectionTitle>
                    <p className="text-xs text-slate-500 -mt-2">
                      Aadhaar & Marksheet (Image/PDF, Max 5MB)
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      {(["aadhaarCard", "previousMarksheet"] as const).map(
                        (key) => (
                          <div
                            key={key}
                            className="rounded-xl border p-4 bg-slate-50/50 space-y-3"
                          >
                            <Label className="text-[10px] font-bold text-slate-500 uppercase">
                              {key === "aadhaarCard"
                                ? "Aadhaar Card"
                                : "Previous Marksheet"}
                            </Label>
                            {editForm[key] ? (
                              <div className="space-y-2">
                                <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                                  ✅ Uploaded
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-8 text-[10px] font-bold"
                                    onClick={() => {
                                      if (
                                        String(editForm[key]).startsWith(
                                          "data:image"
                                        )
                                      )
                                        window.open(editForm[key], "_blank");
                                    }}
                                  >
                                    <Eye className="h-3 w-3 mr-1" /> View
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="h-8 text-[10px] font-bold text-red-600"
                                    onClick={() => setFormValue(key, "")}
                                    disabled={isSaving}
                                  >
                                    <X className="h-3 w-3 mr-1" /> Remove
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                <label className="flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg border bg-white text-[10px] font-bold">
                                  <Upload className="h-3.5 w-3.5" /> Upload
                                  <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    className="hidden"
                                    disabled={isSaving}
                                    onChange={(e: any) =>
                                      handleDocumentUpload(
                                        key,
                                        e.target.files?.[0]
                                      )
                                    }
                                  />
                                </label>
                                <label className="flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg border bg-white text-[10px] font-bold">
                                  <Camera className="h-3.5 w-3.5" /> Camera
                                  <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    disabled={isSaving}
                                    onChange={(e: any) =>
                                      handleDocumentUpload(
                                        key,
                                        e.target.files?.[0]
                                      )
                                    }
                                  />
                                </label>
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 5 Login */}
                <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white">
                  <CardContent className="p-5 space-y-5">
                    <SectionTitle
                      number={5}
                      icon={<KeyRound className="h-4 w-4" />}
                    >
                      Login Details
                    </SectionTitle>
                    <div className="rounded-xl border bg-slate-50/50 p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <EditField
                          label="Login ID"
                          value={editForm.loginId}
                          onChange={(v) =>
                            setFormValue(
                              "loginId",
                              v.toLowerCase().replace(/\s/g, "")
                            )
                          }
                          disabled={isSaving}
                          icon={
                            <IdCard className="h-3.5 w-3.5 text-slate-400" />
                          }
                        />
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">
                            Password Security
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditOpen(false);
                              setIsProfileOpen(true);
                            }}
                            className="flex w-full items-center justify-between rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-left"
                          >
                            <span className="flex items-center gap-2">
                              <LockKeyhole className="h-4 w-4 text-cyan-700" />
                              <span>
                                <span className="block text-xs font-black text-cyan-950">
                                  Change Password
                                </span>
                                <span className="mt-0.5 block text-[9px] font-semibold text-cyan-700">
                                  Current password verification required
                                </span>
                              </span>
                            </span>
                            <ChevronRight className="h-4 w-4 text-cyan-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM NAV */}
        {!isMenuOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-[90] border-t border-white/10 bg-[#03142f]/95 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.18)] backdrop-blur-md">
          <div className="mx-auto flex h-[72px] max-w-lg items-center justify-around px-3">
            <NavBtn
              active={activeTab === "home" && !isProfileOpen && !isNotificationsOpen}
              onClick={() => openStudentSection("home")}
              icon={<Home className="h-5 w-5" strokeWidth={2.2} />}
              label="Home"
            />
            <NavBtn
              active={isProfileOpen}
              onClick={() => {
                setIsNotificationsOpen(false);
                setIsProfileOpen(true);
              }}
              icon={<User className="h-5 w-5" strokeWidth={2.2} />}
              label="Profile"
            />
            <NavBtn
              active={isNotificationsOpen}
              onClick={() => {
                setIsProfileOpen(false);
                setIsNotificationsOpen((open) => !open);
              }}
              icon={
                <div className="relative">
                  <Bell className="h-5 w-5" strokeWidth={2.2} />
                  {unreadNotificationCount > 0 && (
                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                  )}
                </div>
              }
              label="Notifications"
            />
          </div>
        </div>
        )}
      </div>
    </>
  );
}


function DrawerItem({
  active = false,
  icon,
  label,
  onClick,
  danger = false,
}: {
  active?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-xs font-black transition active:scale-[0.99] ${
        danger
          ? "text-red-300 hover:bg-red-500/10"
          : active
            ? "border border-cyan-300/20 bg-cyan-400/10 text-cyan-100"
            : "text-slate-300 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          danger
            ? "bg-red-500/10 text-red-300"
            : active
              ? "bg-cyan-300/10 text-cyan-200"
              : "bg-white/5 text-slate-400"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {!danger && <ChevronRight className="h-4 w-4 text-slate-600" />}
    </button>
  );
}

function HeroMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-[11px] font-black text-white">{value}</p>
    </div>
  );
}

function HomeShortcut({
  label,
  icon,
  onClick,
  tone,
  badge,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  tone:
    | "blue"
    | "violet"
    | "emerald"
    | "amber"
    | "rose"
    | "orange"
    | "cyan"
    | "indigo";
  badge?: string;
}) {
  const tones: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    orange: "bg-orange-50 text-orange-600",
    cyan: "bg-cyan-50 text-cyan-700",
    indigo: "bg-indigo-50 text-indigo-600",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex min-h-[96px] flex-col items-center justify-center rounded-[16px] border border-white/80 bg-white px-2 py-3 text-center shadow-[0_10px_25px_-18px_rgba(0,0,0,0.7)] transition hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
    >
      {badge && (
        <span
          className={`absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[8px] font-black ${
            badge === "LIVE"
              ? "bg-red-500 text-white"
              : "bg-slate-950 text-cyan-200"
          }`}
        >
          {badge}
        </span>
      )}
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          tones[tone] || tones.blue
        }`}
      >
        {icon}
      </span>
      <span className="mt-2 text-[10.5px] font-black leading-4 text-[#071a3f]">
        {label}
      </span>
    </button>
  );
}

function SummaryTile({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-cyan-700">
        {icon}
      </div>
      <p className="mt-3 truncate text-[8px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-black text-slate-950">{value}</p>
      <p className="mt-0.5 truncate text-[9px] font-semibold text-slate-500">
        {detail}
      </p>
    </div>
  );
}

function StudentSectionHeader({
  title,
  description,
  icon,
  onBack,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm">
      <button
        type="button"
        onClick={onBack}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white transition active:scale-95"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
        {icon}
      </span>
      <div className="min-w-0">
        <h2 className="truncate text-sm font-black text-slate-950">{title}</h2>
        <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function AttendanceStat({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className="bg-white px-2 py-4 text-center">
      <p className={`text-lg font-black ${className}`}>{value}</p>
      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-[11px] font-black text-white">{value}</p>
    </div>
  );
}

function IdInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-[11px] font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder: string;
  disabled: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-[#071a3f]">
        {label}
      </label>
      <div className="relative">
        <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          autoComplete={
            label.toLowerCase().includes("current")
              ? "current-password"
              : "new-password"
          }
          placeholder={placeholder}
          className="h-12 w-full rounded-xl border border-blue-100 bg-white pl-10 pr-11 text-xs font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 disabled:bg-slate-50 disabled:text-slate-400"
        />
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function ProfileInfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-slate-50 p-3">
      <p className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-[10px] font-black text-slate-800">
        {value}
      </p>
    </div>
  );
}

function AccountRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-3 py-2.5">
      <span className="text-[10px] font-bold text-slate-500">{label}</span>
      <span className="min-w-0 truncate text-right text-[10px] font-black text-slate-900">
        {value}
      </span>
    </div>
  );
}

function NavBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`mx-1 flex h-14 flex-1 flex-col items-center justify-center rounded-2xl transition active:scale-90 ${
        active
          ? "bg-blue-900/60 text-cyan-200 shadow-inner font-extrabold"
          : "text-slate-300 font-semibold"
      }`}
    >
      {icon}
      <span className="mt-1 text-[9px] tracking-wide">{label}</span>
    </button>
  );
}

function ExamCard({
  exam,
  onClick,
}: {
  exam: Exam;
  onClick: () => void;
}) {
  const status = exam.status || "upcoming";
  const countdown =
    status === "upcoming" && exam.startTime
      ? getCountdown(exam.startTime)
      : status === "live" && exam.endTime
        ? getCountdown(exam.endTime)
        : null;
  const statusColors: Record<string, string> = {
    upcoming: "border-l-blue-500 bg-blue-50/30",
    live: "border-l-red-500 bg-red-50/30",
    completed: "border-l-emerald-500 bg-emerald-50/30",
    missed: "border-l-slate-400 bg-slate-50/50",
  };

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border-l-4 bg-white p-4 shadow-sm cursor-pointer active:scale-[0.98] ${statusColors[status]}`}
      style={{ borderLeftWidth: "4px", borderLeftStyle: "solid" }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[9px] font-black uppercase ${
              exam.examType === "online"
                ? "bg-violet-100 text-violet-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {exam.examType === "online" ? (
              <>
                <Monitor className="h-2.5 w-2.5" /> Online
              </>
            ) : (
              <>
                <PenTool className="h-2.5 w-2.5" /> Offline
              </>
            )}
          </span>
          <ExamStatusBadge status={status} />
        </div>
        <span className="text-[9px] font-extrabold text-slate-400 uppercase shrink-0">
          {exam.subjectName}
        </span>
      </div>
      <h4 className="text-xs font-black text-slate-800 break-words">
        {exam.title}
      </h4>
      <div className="mt-2.5 flex flex-wrap gap-2 text-[10px] font-bold text-slate-500">
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="h-3 w-3" />
          {formatDate(exam.examDate)}
        </span>
        {exam.startTime && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(exam.startTime)}
          </span>
        )}
        {exam.venue && exam.examType === "offline" && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {exam.venue}
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-blue-600">
          <Trophy className="h-3 w-3" />
          {exam.totalMarks} marks
        </span>
      </div>
      {countdown && (
        <div
          className={`mt-3 rounded-xl px-3 py-2 text-[10px] font-black flex items-center gap-1.5 ${
            status === "live"
              ? "bg-red-500 text-white animate-pulse"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          <Timer className="h-3 w-3" />
          {status === "live" ? "ENDS IN " : "STARTS IN "}
          {countdown.toUpperCase()}
        </div>
      )}
      {status === "completed" && exam.marksObtained != null && (
        <div className="mt-3 rounded-xl bg-emerald-100 px-3 py-2 flex justify-between">
          <span className="text-[10px] font-black text-emerald-700 uppercase">
            Score
          </span>
          <span className="text-xs font-black text-emerald-900">
            {exam.marksObtained}/{exam.totalMarks}
            {exam.grade ? ` · ${exam.grade}` : ""}
          </span>
        </div>
      )}
      {status === "missed" && (
        <div className="mt-3 rounded-xl bg-slate-200 px-3 py-2 flex items-center gap-1.5">
          <XCircle className="h-3 w-3 text-slate-600" />
          <span className="text-[10px] font-black text-slate-600 uppercase">
            Missed
          </span>
        </div>
      )}
      {status === "live" && exam.examType === "online" && (
        <div className="mt-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 px-3 py-2 flex items-center justify-center gap-1.5 text-white animate-livePulse">
          <Play className="h-3 w-3 fill-white" />
          <span className="text-[10px] font-black uppercase">
            Tap to Attend Now
          </span>
        </div>
      )}
    </div>
  );
}

function ExamStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    upcoming: { label: "Upcoming", cls: "bg-blue-100 text-blue-700" },
    live: { label: "🔴 Live", cls: "bg-red-100 text-red-700" },
    completed: {
      label: "Completed",
      cls: "bg-emerald-100 text-emerald-700",
    },
    missed: { label: "Missed", cls: "bg-slate-200 text-slate-600" },
  };
  const s = map[status] || map.upcoming;
  return (
    <span
      className={`inline-block rounded-lg px-2 py-0.5 text-[9px] font-black uppercase ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

function StatItem({
  label,
  val,
  subVal,
  icon,
  bg,
}: {
  label: string;
  val: string;
  subVal?: string;
  icon: React.ReactNode;
  bg: string;
}) {
  return (
    <div
      className={`p-3 rounded-2xl ${bg} flex flex-col justify-between min-h-[80px]`}
    >
      <div className="flex justify-between items-center">
        <span className="text-[9px] text-slate-500 font-bold uppercase truncate pr-1">
          {label}
        </span>
        {icon}
      </div>
      <div className="mt-1">
        <p className="text-xs font-black text-slate-800 leading-tight truncate">
          {val}
        </p>
        {subVal && (
          <p className="text-[9px] font-bold text-slate-500 mt-0.5 truncate">
            {subVal}
          </p>
        )}
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  icon,
}: {
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-xl bg-blue-50 p-1.5 text-blue-600">{icon}</div>
      <h3 className="text-xs font-extrabold text-slate-800">{title}</h3>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-slate-100 bg-slate-50/50 py-8 px-4 text-center">
      <p className="text-xs text-slate-400 font-bold">{text}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "paid"
      ? "bg-green-100 text-green-700"
      : status === "overdue"
        ? "bg-red-100 text-red-700"
        : status === "partial"
          ? "bg-amber-100 text-amber-700"
          : "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${cls}`}
    >
      {status}
    </span>
  );
}

function DetailRow({
  label,
  val,
  highlight = false,
}: {
  label: string;
  val: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 gap-2">
      <span className="text-xs text-slate-400 font-bold shrink-0">{label}</span>
      <span
        className={`text-xs text-right ${
          highlight
            ? "font-black text-blue-600 text-sm"
            : "font-extrabold text-slate-800"
        }`}
      >
        {val}
      </span>
    </div>
  );
}

function SectionTitle({
  number,
  icon,
  children,
}: {
  number?: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3">
      {number && (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-600">
          {number}
        </span>
      )}
      <span className="text-slate-400">{icon}</span>
      {children}
    </h3>
  );
}

function FormRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 mb-3">{children}</div>;
}

function EditField({
  label,
  value,
  onChange,
  type = "text",
  textarea = false,
  disabled = false,
  placeholder = "",
  icon = null,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  textarea?: boolean;
  disabled?: boolean;
  placeholder?: string;
  icon?: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="space-y-1 col-span-2 md:col-span-1">
      <label className="text-[10px] font-bold text-slate-500 uppercase">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 shrink-0">
            {icon}
          </div>
        )}
        {textarea ? (
          <textarea
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            rows={2}
            placeholder={placeholder}
            className={`w-full rounded-xl border ${
              error ? "border-red-400" : "border-slate-200"
            } bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50`}
          />
        ) : (
          <input
            type={type}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            className={`w-full rounded-xl border ${
              error ? "border-red-400" : "border-slate-200"
            } bg-white py-2 text-xs font-semibold disabled:opacity-50 ${
              icon ? "pl-9 pr-3" : "px-3"
            }`}
          />
        )}
      </div>
      {error && (
        <p className="text-[10px] font-bold text-red-500">{error}</p>
      )}
    </div>
  );
}
