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
  CheckCircle2,
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
  Pencil,
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
  Bell,
  MessageSquare,
} from "lucide-react";

type StudentMe = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: "student";
  instituteId: string;
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

type AppNotification = {
  id: string;
  title: string;
  message: string;
  type?: string;
  isRead?: boolean;
  createdAt: string;
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

  const [student, setStudent] = useState<StudentMe | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [report, setReport] = useState<any>(null);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [, forceTick] = useState(0);

  const [activeTab, setActiveTab] = useState<
    "home" | "homework" | "timetable" | "fees" | "results" | "exams"
  >("home");
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showLateFeeDropdown, setShowLateFeeDropdown] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [homeworkSearch, setHomeworkSearch] = useState("");
  const [examFilter, setExamFilter] = useState<
    "all" | "upcoming" | "live" | "completed"
  >("all");

  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
    return DAYS_OF_WEEK.includes(today as any) ? today : "Monday";
  });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [fieldErrors, setFieldErrors] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [sameAddress, setSameAddress] = useState(false);
  const [editMessage, setEditMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const logout = () => {
    localStorage.removeItem("coach_sutra_token");
    localStorage.removeItem("coach_sutra_user_role");
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
          notifRes,
        ] = await Promise.allSettled([
          fetch("/api/finance/my-payments", { credentials: "include", headers }),
          fetch(`/api/homework?batchId=${me.batchId || ""}`, { credentials: "include", headers }),
          fetch(`/api/report-card?studentId=${me.id}&month=${currentMonth}`, { credentials: "include", headers }),
          fetch(`/api/attendance/student/summary?studentId=${me.id}&month=${currentMonth}`, { credentials: "include", headers }),
          fetch(`/api/timetable?batchId=${me.batchId || ""}`, { credentials: "include", headers }),
          fetch(`/api/exams/my-exams?studentId=${me.id}`, { credentials: "include", headers }),
          fetch(`/api/notifications`, { credentials: "include", headers }),
        ]);

        if (feeRes.status === "fulfilled") {
          const data = await feeRes.value.json().catch(() => []);
          if (feeRes.value.ok) setPayments(Array.isArray(data) ? data : []);
        }
        if (homeworkRes.status === "fulfilled") {
          const data = await homeworkRes.value.json().catch(() => []);
          if (homeworkRes.value.ok) setHomework(Array.isArray(data) ? data : []);
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
                batchName: typeof t.batchId === "object" ? t.batchId?.name : t.batchName,
                subjectName: typeof t.subjectId === "object" ? t.subjectId?.name : t.subjectName,
                teacherName: typeof t.teacherId === "object" ? t.teacherId?.name : t.teacherName,
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
                  examType: (e.examType === "online" || e.isOnline ? "online" : "offline") as "online" | "offline",
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
                  marksObtained: e.marksObtained != null ? Number(e.marksObtained) : null,
                  grade: e.grade,
                  resultStatus: e.resultStatus,
                  status: e.status,
                };
                return { ...base, status: deriveExamStatus(base) };
              })
            );
          }
        }
        if (notifRes.status === "fulfilled") {
          const data = await notifRes.value.json().catch(() => []);
          if (notifRes.value.ok) {
            const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
            setNotifications(list.map((n: any) => ({
              id: String(n.id || n._id),
              title: n.title || "Notification",
              message: n.message || n.body || "",
              type: n.type,
              isRead: n.isRead || false,
              createdAt: n.createdAt || new Date().toISOString()
            })));
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
    const total = payments.reduce((sum, p) => sum + Number(p.totalAmount ?? p.amount ?? 0), 0);
    const paid = payments.reduce((sum, p) => sum + Number(p.paidAmount ?? 0), 0);
    const pending = Math.max(0, total - paid);
    const nextDue = payments.find((p) => p.status === "pending" || p.status === "overdue");
    return { total, paid, pending, nextDue };
  }, [payments]);

  const prevMonthFee = useMemo(() => {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    const prevMonthIso = now.toISOString().slice(0, 7);

    let pm = payments.find((p) => p.month === prevMonthIso);
    if (!pm) pm = payments.find((p) => p.status === "paid" || p.paidAmount > 0);

    if (pm) {
      return {
        amount: inr(pm.paidAmount > 0 ? pm.paidAmount : pm.totalAmount),
        date: pm.paidDate ? formatDate(pm.paidDate) : formatDate(pm.dueDate),
        label: pm.monthLabel || "Prev Month",
      };
    }
    return { amount: "₹0", date: "-", label: "" };
  }, [payments]);

  const displayPayments = useMemo(() => {
    const currentMonthIso = new Date().toISOString().slice(0, 7);
    return payments.filter((p) => {
      const itemMonth = p.month || (p.dueDate ? p.dueDate.slice(0, 7) : "");
      if (p.status === "paid" || Number(p.paidAmount ?? 0) > 0) return true;
      if (itemMonth && itemMonth <= currentMonthIso) return true;
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

  const enrichedExams = useMemo(() => exams.map((e) => ({ ...e, status: deriveExamStatus(e) })), [exams]);

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

  const latestResults = report?.examResults ?? [];

  // Notifications logic
  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);
  
  const markNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

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
            @media print { body { padding: 0; margin: 0; } @page { margin: 1cm; } }
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
          <script>window.onload = function() { window.print(); }</script>
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
      dateOfBirth: student.dateOfBirth ? String(student.dateOfBirth).substring(0, 10) : "",
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
    setShowPassword(false);
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
    reader.onloadend = () => setEditForm((prev: any) => ({ ...prev, photoDataUrl: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleDocumentUpload = (key: string, file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setEditMessage({ type: "error", text: "Document size limit max 5MB" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setEditForm((prev: any) => ({ ...prev, [key]: reader.result }));
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
      if (!payload.loginPassword) delete payload.loginPassword;

      const res = await fetch("/api/students/self-update", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();
      let data: any = {};
      try { data = JSON.parse(responseText); } catch { throw new Error(`Server Error (${res.status})`); }

      if (!res.ok) {
        if (res.status === 400 && data.error && String(data.error).includes("Password")) {
          setFieldErrors({ loginPassword: data.error });
        }
        throw new Error(data.details || data.error || "Profile update failed.");
      }

      setEditMessage({ type: "success", text: data.message || "Updated successfully!" });
      setTimeout(async () => {
        const meRes = await fetch("/api/auth/me", {
          credentials: "include",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        const me = await meRes.json().catch(() => null);
        if (meRes.ok && me) setStudent(me);
        setIsEditOpen(false);
      }, 1500);
    } catch (err: any) {
      setEditMessage({ type: "error", text: err.message || "Failed to update profile." });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <AppStyles />
        <div className="flex min-h-screen flex-col items-center justify-center bg-blue-900 text-white px-6">
          <div className="rounded-3xl bg-white/10 p-5 mb-4 animate-bounce">
            <GraduationCap className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-wider">STUDENT PORTAL</h1>
          <p className="text-xs text-blue-200 mt-1 animate-pulse">Loading secure session...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <AppStyles />
      <div className="min-h-screen bg-slate-50 pb-24 md:pb-8 select-none antialiased">
        
        {/* TOP HEADER — NOTIFICATION BELL REPLACES LOGOUT */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-100/80 px-4 py-3.5 backdrop-blur-md bg-white/90">
          <div className="mx-auto flex max-w-lg items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                onClick={() => setIsProfileOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-blue-500/20 active:scale-95 cursor-pointer"
              >
                {student?.photoDataUrl ? (
                  <img src={student.photoDataUrl} alt={student.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-blue-100 flex items-center justify-center">
                    <UserRound className="h-5 w-5 text-blue-600" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Namaste 🙏</p>
                <h1 className="text-sm font-bold text-slate-800 leading-none truncate max-w-[150px]">
                  {student?.name}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* NOTIFICATION BELL BUTTON */}
              <button
                onClick={() => {
                  setIsNotifOpen(true);
                  markNotificationsAsRead();
                }}
                className="relative rounded-xl bg-slate-100 p-2 text-slate-600 active:scale-90"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* PROFILE BUTTON */}
              <button
                onClick={() => setIsProfileOpen(true)}
                className="rounded-xl bg-slate-100 p-2 text-slate-600 active:scale-90"
              >
                <User className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-lg px-4 py-4 space-y-4">
          {message && (
            <div className="rounded-2xl bg-red-50 p-3.5 text-xs text-red-600 flex items-center gap-2.5 border border-red-100 animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="font-semibold">{message}</span>
            </div>
          )}

          {/* HOME */}
          {activeTab === "home" && (
            <div className="space-y-4 animate-fadeIn">
              <div
                onClick={() => setIsProfileOpen(true)}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-5 text-white shadow-xl cursor-pointer active:scale-[0.99]"
              >
                <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
                  <GraduationCap className="h-40 w-40" />
                </div>
                <div className="space-y-3 relative">
                  <span className="inline-flex rounded-full bg-white/20 px-2.5 py-0.5 text-[9px] font-bold uppercase">
                    Class Details
                  </span>
                  <div>
                    <h3 className="text-lg font-black">
                      {formatClassAndSection(student?.className, student?.section)}
                    </h3>
                    <p className="text-xs text-blue-100/90 mt-1">
                      {student?.courseName || "No Course"} • {student?.batchName || "No Batch"}
                    </p>
                  </div>
                  <div className="flex justify-between items-center pt-2.5 border-t border-white/10 text-[10px] text-blue-100 font-bold">
                    <span>Enrollment: {student?.enrollmentNo || "-"}</span>
                    <span className="flex items-center gap-1">Full Profile <ChevronRight className="h-3 w-3" /></span>
                  </div>
                </div>
              </div>

              {examSummary.live > 0 && (
                <div
                  onClick={() => setActiveTab("exams")}
                  className="rounded-3xl bg-gradient-to-r from-red-500 to-rose-600 p-4 text-white shadow-lg cursor-pointer active:scale-[0.99] animate-livePulse"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-white/20 p-2">
                        <Play className="h-5 w-5 fill-white" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-white/90">Live Now</p>
                        <p className="text-sm font-black">{examSummary.live} Test{examSummary.live > 1 ? "s" : ""} Ongoing</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Card className="rounded-3xl border-none bg-white p-4 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Attendance</p>
                    <p className="text-xl font-black text-slate-800">{attendance?.percentage ?? 0}%</p>
                    <p className="text-[10px] text-green-600 font-semibold">{attendance?.present || 0} Days Present</p>
                  </div>
                  <div className="relative h-16 w-16 shrink-0">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                      <path className="text-slate-100" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="text-blue-600" strokeLinecap="round" strokeDasharray={`${attendance?.percentage ?? 0}, 100`} strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center"><ClipboardCheck className="h-5 w-5 text-blue-500" /></div>
                  </div>
                </Card>

                <div className="grid grid-cols-2 gap-3">
                  <div onClick={() => setActiveTab("homework")} className="rounded-2xl bg-amber-50 p-3.5 flex flex-col justify-between active:scale-95 cursor-pointer">
                    <div className="rounded-xl bg-amber-100 text-amber-700 p-2 w-fit"><BookOpen className="h-4 w-4" /></div>
                    <div className="mt-4"><p className="text-xs font-extrabold text-amber-900">Homework</p><p className="text-[10px] text-amber-700/80 mt-0.5">{homework.length} pending</p></div>
                  </div>
                  <div onClick={() => setActiveTab("timetable")} className="rounded-2xl bg-indigo-50 p-3.5 flex flex-col justify-between active:scale-95 cursor-pointer">
                    <div className="rounded-xl bg-indigo-100 text-indigo-700 p-2 w-fit"><CalendarDays className="h-4 w-4" /></div>
                    <div className="mt-4"><p className="text-xs font-extrabold text-indigo-900">Timetable</p><p className="text-[10px] text-indigo-700/80 mt-0.5">Class schedule</p></div>
                  </div>
                </div>
              </div>

              {/* TESTS CARD */}
              <div onClick={() => setActiveTab("exams")} className="rounded-2xl bg-violet-50 border border-violet-100 p-4 flex items-center justify-between active:scale-[0.99] cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-violet-100 text-violet-700 p-2.5"><PenTool className="h-5 w-5" /></div>
                  <div>
                    <p className="text-sm font-extrabold text-violet-900">Online / Offline Tests</p>
                    <p className="text-[10px] text-violet-700/80 mt-0.5 font-semibold">{examSummary.live} live · {examSummary.upcoming} upcoming · {examSummary.completed} done</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-violet-600" />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <StatItem label="Prev Month Fee" val={prevMonthFee.amount} subVal={prevMonthFee.date !== "-" ? `Date: ${prevMonthFee.date}` : "-"} icon={<CheckCircle2 className="h-4 w-4 text-green-600" />} bg="bg-green-50" />
                <StatItem label="Next Due Date" val={feeSummary.nextDue ? formatDate(feeSummary.nextDue.dueDate) : "-"} subVal={feeSummary.nextDue ? inr(feeSummary.nextDue.totalAmount) : ""} icon={<CalendarDays className="h-4 w-4 text-purple-600" />} bg="bg-purple-50" />
              </div>

              <Card className="rounded-3xl border-none bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <SectionHeader icon={<BookOpen className="h-4 w-4" />} title="Pending Tasks" />
                  <span onClick={() => setActiveTab("homework")} className="text-[10px] font-bold text-blue-600 cursor-pointer">See All</span>
                </div>
                <div className="space-y-2.5">
                  {homework.slice(0, 2).map((hw) => (
                    <div key={hw.id} onClick={() => setSelectedHomework(hw)} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 cursor-pointer active:scale-[0.98]">
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="text-[9px] font-bold text-blue-700 uppercase">{hw.subjectName}</span>
                        <h4 className="text-xs font-bold text-slate-800 truncate">{hw.title}</h4>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[9px] text-slate-400 font-bold">Due Date</p>
                        <p className="text-[10px] font-bold text-slate-600">{formatDate(hw.dueDate)}</p>
                      </div>
                    </div>
                  ))}
                  {homework.length === 0 && <EmptyText text="No homework assigned recently." />}
                </div>
              </Card>
            </div>
          )}

          {/* HOMEWORK TAB */}
          {activeTab === "homework" && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search Subject or Homework..." value={homeworkSearch} onChange={(e) => setHomeworkSearch(e.target.value)} className="w-full rounded-2xl border-none bg-white py-3 pl-10 pr-4 text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div className="space-y-2.5">
                {filteredHomeworks.length ? filteredHomeworks.map((h) => (
                  <div key={h.id} onClick={() => setSelectedHomework(h)} className="rounded-2xl bg-white p-4 shadow-sm cursor-pointer active:scale-[0.98]">
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700">{h.subjectName || "Subject"}</span>
                      <p className="text-xs font-extrabold text-slate-700">{formatDate(h.dueDate)}</p>
                    </div>
                    <h4 className="mt-2 text-xs font-black text-slate-800">{h.title}</h4>
                    <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 bg-slate-50 p-2 rounded-xl">{h.description}</p>
                  </div>
                )) : <EmptyText text="No matching homework records found." />}
              </div>
            </div>
          )}

          {/* TIMETABLE TAB */}
          {activeTab === "timetable" && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="flex items-center gap-2.5 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
                <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600"><CalendarDays className="h-5 w-5" /></div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Class Timetable</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Batch: {student?.batchName || "Assigned Batch"}</p>
                </div>
              </div>

              <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = selectedDay.toLowerCase() === day.toLowerCase();
                  return (
                    <button key={day} onClick={() => setSelectedDay(day)} className={`shrink-0 rounded-2xl px-3.5 py-2 text-[10px] font-black uppercase tracking-wider active:scale-95 ${isSelected ? "bg-indigo-600 text-white shadow-md" : "bg-white text-slate-500 border border-slate-100"}`}>
                      {day.slice(0, 3)}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2.5">
                {dayTimetable.length > 0 ? dayTimetable.map((slot) => (
                  <div key={slot.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm flex items-center justify-between">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-block rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700">{slot.subjectName || "Subject"}</span>
                        {slot.room && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400"><MapPin className="h-3 w-3" /> {slot.room}</span>}
                      </div>
                      <h4 className="text-xs font-extrabold text-slate-800 mt-1">{slot.subjectName || "Class Lecture"}</h4>
                      {slot.teacherName && <p className="text-[10px] font-semibold text-slate-400 flex items-center gap-1"><User className="h-3 w-3" /> {slot.teacherName}</p>}
                    </div>
                    <div className="text-right shrink-0 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1 text-xs font-black text-indigo-900"><Clock className="h-3.5 w-3.5 text-indigo-600" /><span>{slot.startTime}</span></div>
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5">to {slot.endTime}</p>
                    </div>
                  </div>
                )) : <EmptyText text={`No lectures scheduled for ${selectedDay}.`} />}
              </div>
            </div>
          )}

          {/* EXAMS TAB */}
          {activeTab === "exams" && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-800">Online / Offline Tests</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">Apne exams yahan dekho aur live test attend karo</p>
                </div>
                <button onClick={() => setActiveTab("home")} className="text-[10px] font-bold text-blue-600">← Home</button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-blue-50 p-3 border border-blue-100"><p className="text-[9px] font-bold text-blue-800 uppercase">Upcoming</p><p className="text-xl font-black text-blue-900 mt-0.5">{examSummary.upcoming}</p></div>
                <div className="rounded-2xl bg-red-50 p-3 border border-red-100"><p className="text-[9px] font-bold text-red-800 uppercase">Live Now</p><p className="text-xl font-black text-red-900 mt-0.5">{examSummary.live}</p></div>
                <div className="rounded-2xl bg-emerald-50 p-3 border border-emerald-100"><p className="text-[9px] font-bold text-emerald-800 uppercase">Completed</p><p className="text-xl font-black text-emerald-900 mt-0.5">{examSummary.completed}</p></div>
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {(["all", "upcoming", "live", "completed"] as const).map((f) => (
                  <button key={f} onClick={() => setExamFilter(f)} className={`shrink-0 rounded-full px-4 py-2 text-[10px] font-extrabold uppercase tracking-wide active:scale-95 ${examFilter === f ? "bg-violet-600 text-white shadow-md" : "bg-white text-slate-500 border border-slate-100"}`}>{f === "all" ? "All Tests" : f}</button>
                ))}
              </div>

              <div className="space-y-3">
                {filteredExams.length ? filteredExams.map((exam) => (
                  <ExamCard key={exam.id} exam={exam} onClick={() => setSelectedExam(exam)} />
                )) : <EmptyText text={examFilter === "all" ? "Koi test schedule nahi hai abhi." : `No ${examFilter} tests found.`} />}
              </div>
            </div>
          )}

          {/* FEES TAB */}
          {activeTab === "fees" && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-3xl">
                  <span className="text-[9px] font-bold text-emerald-800 block uppercase tracking-wider">Paid Amount</span>
                  <span className="text-xl font-black text-emerald-900 block mt-0.5">{inr(feeSummary.paid)}</span>
                </div>
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-3xl">
                  <span className="text-[9px] font-bold text-rose-800 block uppercase tracking-wider">Remaining Due</span>
                  <span className="text-xl font-black text-rose-900 block mt-0.5">{inr(feeSummary.pending)}</span>
                </div>
              </div>

              <div className="space-y-2.5">
                {displayPayments.length ? displayPayments.map((p) => (
                  <div key={p.id} onClick={() => setSelectedPayment(p)} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm cursor-pointer active:scale-[0.98] border border-slate-50">
                    <div className="min-w-0 pr-2">
                      <p className="font-extrabold text-xs text-slate-800 truncate">{p.monthLabel}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{p.status === "paid" && p.paidDate ? `Paid on: ${formatDate(p.paidDate)}` : `Due Date: ${formatDate(p.dueDate)}`}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-xs text-slate-800">{inr(p.totalAmount ?? p.amount)}</p>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                )) : <EmptyText text="No fee payment records for current or previous months." />}
              </div>
            </div>
          )}

          {/* RESULTS TAB */}
          {activeTab === "results" && (
            <div className="space-y-3.5 animate-fadeIn">
              {latestResults.length ? (
                <div className="space-y-3">
                  {latestResults.map((r: any, idx: number) => (
                    <div key={idx} className="rounded-3xl bg-white p-4 shadow-sm border border-slate-50">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <p className="font-extrabold text-xs text-slate-800">{r.subject}</p>
                        <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase ${r.resultStatus === "Pass" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                          {r.resultStatus || "-"}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div>
                          <span className="text-[9px] text-slate-400 block font-bold">Obtained</span>
                          <span className="text-xs font-black text-blue-600 block mt-0.5">{r.marksObtained ?? "-"}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block font-bold">Total</span>
                          <span className="text-xs font-bold text-slate-700 block mt-0.5">{r.totalMarks}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block font-bold">Grade</span>
                          <span className="text-xs font-black text-purple-600 block mt-0.5">{r.grade || "-"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <EmptyText text="Exam results have not been posted yet." />}
            </div>
          )}
        </main>

        {/* NOTIFICATIONS DRAWER */}
        {isNotifOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0">
            <div className="absolute inset-0" onClick={() => setIsNotifOpen(false)} />
            <div className="relative w-full max-w-lg rounded-t-3xl bg-[#f6f7f9] p-0 shadow-2xl h-[85vh] overflow-hidden animate-slideUp flex flex-col">
              <div className="bg-white px-5 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 z-20 shadow-sm shrink-0">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-800">Notifications</h2>
                    <p className="text-[10px] text-slate-500 font-medium">Updates and messages from Admin</p>
                  </div>
                </div>
                <button onClick={() => setIsNotifOpen(false)} className="rounded-full bg-slate-100 p-2 text-slate-500 active:scale-90">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-3 flex-1">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div key={notif.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative">
                      {!notif.isRead && (
                        <span className="absolute top-4 right-4 h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                      )}
                      <div className="flex gap-3">
                        <div className="bg-blue-50 p-2.5 rounded-full text-blue-600 h-fit shrink-0">
                          <MessageSquare className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 pr-4 leading-tight">{notif.title}</h4>
                          <p className="text-[11px] text-slate-500 mt-1 whitespace-pre-wrap leading-relaxed">{notif.message}</p>
                          <p className="text-[9px] font-bold text-slate-400 mt-2 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {new Date(notif.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20">
                    <Bell className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-500">No new notifications</p>
                    <p className="text-xs text-slate-400 mt-1">You're all caught up!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* HOMEWORK DRAWER */}
        {selectedHomework && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0">
            <div className="absolute inset-0" onClick={() => setSelectedHomework(null)} />
            <div className="relative w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl animate-slideUp">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
              <div className="flex justify-between items-start">
                <span className="inline-block rounded-xl bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{selectedHomework.subjectName}</span>
                <button onClick={() => setSelectedHomework(null)} className="rounded-full bg-slate-100 p-1"><X className="h-5 w-5" /></button>
              </div>
              <div className="mt-4 space-y-4">
                <h3 className="text-base font-black text-slate-800">{selectedHomework.title}</h3>
                <p className="text-xs text-slate-500 font-bold flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Due: {formatDate(selectedHomework.dueDate)}</p>
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                  <p className="text-xs text-slate-600 font-semibold whitespace-normal break-words">{selectedHomework.description}</p>
                </div>
                <Button onClick={() => setSelectedHomework(null)} className="w-full rounded-2xl bg-blue-600 py-3 text-xs font-black">Close</Button>
              </div>
            </div>
          </div>
        )}

        {/* EXAM DRAWER */}
        {selectedExam && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0">
            <div className="absolute inset-0" onClick={() => setSelectedExam(null)} />
            <div className="relative w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl max-h-[85vh] overflow-y-auto animate-slideUp">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">
                    {selectedExam.examType === "online" ? <><Monitor className="h-3 w-3" /> ONLINE</> : <><PenTool className="h-3 w-3" /> OFFLINE</>}
                  </span>
                  <ExamStatusBadge status={selectedExam.status || "upcoming"} />
                </div>
                <button onClick={() => setSelectedExam(null)} className="rounded-full bg-slate-100 p-1 shrink-0"><X className="h-5 w-5" /></button>
              </div>
              <div className="mt-4 space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-800 leading-tight">{selectedExam.title}</h3>
                  <p className="text-xs font-bold text-slate-500 mt-1">Subject: {selectedExam.subjectName}</p>
                </div>
                <div className="divide-y divide-slate-100">
                  <DetailRow label="Exam Date" val={formatDate(selectedExam.examDate)} />
                  {selectedExam.startTime && <DetailRow label="Start Time" val={formatTime(selectedExam.startTime)} />}
                  {selectedExam.endTime && <DetailRow label="End Time" val={formatTime(selectedExam.endTime)} />}
                  {selectedExam.durationMinutes && <DetailRow label="Duration" val={`${selectedExam.durationMinutes} mins`} />}
                  <DetailRow label="Total Marks" val={String(selectedExam.totalMarks)} highlight />
                  {selectedExam.venue && selectedExam.examType === "offline" && <DetailRow label="Venue" val={selectedExam.venue} />}
                  {selectedExam.status === "completed" && selectedExam.marksObtained != null && (
                    <>
                      <DetailRow label="Marks Obtained" val={String(selectedExam.marksObtained)} highlight />
                      {selectedExam.grade && <DetailRow label="Grade" val={selectedExam.grade} />}
                    </>
                  )}
                </div>
                {selectedExam.syllabus && (
                  <div className="rounded-2xl bg-amber-50 p-3 border border-amber-100">
                    <p className="text-[10px] font-black text-amber-700 uppercase mb-1">Syllabus</p>
                    <p className="text-xs text-amber-900 font-semibold break-words">{selectedExam.syllabus}</p>
                  </div>
                )}
                {selectedExam.instructions && (
                  <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Instructions</p>
                    <p className="text-xs text-slate-600 font-semibold break-words">{selectedExam.instructions}</p>
                  </div>
                )}
                {selectedExam.examType === "online" && selectedExam.status === "live" && selectedExam.examUrl ? (
                  <Button onClick={() => window.open(selectedExam.examUrl, "_blank")} className="w-full rounded-2xl bg-red-600 py-3 text-xs font-black animate-livePulse">
                    <Play className="h-4 w-4 mr-2 fill-white" /> Attend Test Now
                  </Button>
                ) : selectedExam.examType === "online" && selectedExam.status === "upcoming" ? (
                  <Button disabled className="w-full rounded-2xl bg-slate-200 text-slate-500 py-3 text-xs font-black cursor-not-allowed">
                    <Timer className="h-4 w-4 mr-2" /> Not Started Yet
                  </Button>
                ) : (
                  <Button onClick={() => setSelectedExam(null)} className="w-full rounded-2xl bg-blue-600 py-3 text-xs font-black">Close</Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* FEES DRAWER WITH LATE FEE DETAILS AND RECEIPT DOWNLOAD */}
        {selectedPayment && (() => {
          const lateDetails = computeLateFeeDetails(selectedPayment);
          return (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0">
              <div className="absolute inset-0" onClick={() => { setSelectedPayment(null); setShowLateFeeDropdown(false); }} />
              <div className="relative w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl animate-slideUp">
                <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Transaction</h3>
                    <h2 className="text-base font-black text-slate-800 mt-0.5">{selectedPayment.monthLabel}</h2>
                  </div>
                  <button onClick={() => { setSelectedPayment(null); setShowLateFeeDropdown(false); }} className="rounded-full bg-slate-100 p-1 active:scale-90"><X className="h-5 w-5" /></button>
                </div>
                <div className="mt-4 space-y-4">
                  <div className="divide-y divide-slate-100">
                    <DetailRow label="Monthly Tuition Fees" val={inr(selectedPayment.amount)} />
                    <div className="py-2.5">
                      <div onClick={() => selectedPayment.lateFee > 0 && setShowLateFeeDropdown(!showLateFeeDropdown)} className={`flex items-center justify-between ${selectedPayment.lateFee > 0 ? "cursor-pointer select-none" : ""}`}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400 font-bold">Late Fees</span>
                          {selectedPayment.lateFee > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              {lateDetails.daysLate} days late
                              {showLateFeeDropdown ? <ChevronUp className="h-3 w-3 ml-0.5" /> : <ChevronDown className="h-3 w-3 ml-0.5" />}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-extrabold text-slate-800 text-right">{inr(selectedPayment.lateFee)}</span>
                      </div>
                      {selectedPayment.lateFee > 0 && showLateFeeDropdown && (
                        <div className="mt-2.5 bg-amber-50/80 rounded-2xl p-3.5 border border-amber-200/80 space-y-2 animate-fadeIn text-xs">
                          <div className="flex items-center justify-between text-amber-900 font-bold pb-1.5 border-b border-amber-200/60">
                            <span className="text-[10px] uppercase tracking-wider text-amber-700">Late Fee Calculation</span>
                            <span className="text-[10px] bg-amber-200/60 text-amber-900 px-2 py-0.5 rounded-md font-extrabold">{lateDetails.daysLate} Days Delay</span>
                          </div>
                          <div className="space-y-1 text-[11px] text-amber-900">
                            <div className="flex justify-between"><span className="text-amber-700 font-medium">Late Fees Rate:</span><span className="font-semibold">{inr(lateDetails.perDayRate)} / day</span></div>
                            <div className="flex justify-between"><span className="text-amber-700 font-medium">Total Delay:</span><span className="font-semibold">{lateDetails.daysLate} Days</span></div>
                          </div>
                          <div className="pt-2 border-t border-amber-200/60 flex justify-between items-center text-xs font-black text-amber-950">
                            <span>Total ({lateDetails.daysLate} days × {inr(lateDetails.perDayRate)}):</span>
                            <span className="text-sm font-black text-amber-900">{inr(selectedPayment.lateFee)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <DetailRow label="Total Amount" val={inr(selectedPayment.totalAmount)} highlight />
                    <DetailRow label="Paid" val={inr(selectedPayment.paidAmount)} />
                    <DetailRow label="Status" val={<StatusBadge status={selectedPayment.status} />} />
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    {selectedPayment.status === "paid" || selectedPayment.status === "partial" ? (
                      <>
                        <Button variant="outline" onClick={() => { setSelectedPayment(null); setShowLateFeeDropdown(false); }} className="flex-1 rounded-2xl border-slate-200 py-3 text-xs font-black text-slate-600">Close</Button>
                        <Button onClick={() => executePrintReceipt(selectedPayment)} className="flex-1 rounded-2xl bg-blue-600 py-3 text-xs font-black hover:bg-blue-700 shadow-sm"><Download className="h-4 w-4 mr-1.5" /> Download Receipt</Button>
                      </>
                    ) : (
                      <Button onClick={() => { setSelectedPayment(null); setShowLateFeeDropdown(false); }} className="w-full rounded-2xl bg-slate-200 text-slate-700 py-3 text-xs font-black hover:bg-slate-300">Close</Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* PROFILE SUMMARY DRAWER */}
        {isProfileOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0">
            <div className="absolute inset-0" onClick={() => setIsProfileOpen(false)} />
            <div className="relative w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl max-h-[85vh] overflow-y-auto animate-slideUp">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 shrink-0" />
              <div className="flex justify-between items-start">
                <h2 className="text-base font-black text-slate-800">Student Profile Summary</h2>
                <button onClick={() => setIsProfileOpen(false)} className="rounded-full bg-slate-100 p-1 text-slate-500 active:scale-90"><X className="h-5 w-5" /></button>
              </div>

              <div className="mt-4 space-y-4 pb-6">
                <div className="flex flex-col items-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="h-16 w-16 overflow-hidden rounded-full ring-4 ring-blue-500/10 mb-2">
                    {student?.photoDataUrl ? (
                      <img src={student.photoDataUrl} alt={student.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-blue-100 flex items-center justify-center">
                        <UserRound className="h-8 w-8 text-blue-600" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-black text-slate-800">{student?.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">Roll No: {student?.enrollmentNo || "-"}</p>
                </div>

                <Button onClick={openEditModal} className="w-full rounded-2xl bg-[#4d7c0f] hover:bg-[#3f660c] text-white py-3.5 text-xs font-black mt-1 shadow-sm">
                  <Pencil className="h-4 w-4 mr-2" /> View & Edit Full Admission Form
                </Button>

                <div className="pt-2">
                  <Button onClick={logout} className="w-full rounded-2xl bg-red-50 text-red-600 py-3 text-xs font-black hover:bg-red-100">
                    <LogOut className="h-4 w-4 mr-2" /> Log Out Student Portal
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FULL STUDENT EDIT FORM REPLICA DRAWER */}
        {isEditOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0">
            <div className="absolute inset-0" onClick={() => !isSaving && setIsEditOpen(false)} />
            <div className="relative w-full max-w-lg rounded-t-3xl bg-[#f6f7f9] p-0 shadow-2xl h-[95vh] overflow-hidden animate-slideUp flex flex-col">
              <div className="bg-white px-5 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 z-20 shadow-sm shrink-0">
                <div>
                  <h2 className="text-base md:text-lg font-black text-slate-800 tracking-tight leading-tight">Student Admission Form</h2>
                  <p className="text-[10px] text-slate-500 font-medium">Update your details carefully</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => !isSaving && setIsEditOpen(false)} className="h-8 text-xs bg-white">Cancel</Button>
                  <Button onClick={saveProfileChanges} disabled={isSaving} className="h-8 text-xs bg-[#4d7c0f] hover:bg-[#3f660c] text-white font-medium px-4 shadow-sm">
                    {isSaving ? "Saving..." : "Save Form"}
                  </Button>
                </div>
              </div>

              <div className="p-4 overflow-y-auto space-y-5 flex-1">
                {editMessage && (
                  <div className={`rounded-xl p-3 text-xs font-bold ${editMessage.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                    {editMessage.text}
                  </div>
                )}

                {/* 1 Student Info */}
                <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white">
                  <CardContent className="p-5 space-y-4">
                    <SectionTitle icon={<GraduationCap className="h-4 w-4" />}>Student's Information</SectionTitle>

                    <div className="flex flex-col md:flex-row gap-5">
                      <div className="flex-1 space-y-4">
                        <FormRow>
                          <EditField label="Student Name" value={editForm.name} onChange={(v) => setFormValue("name", v)} error={fieldErrors.name} disabled={isSaving} />
                          <EditField label="Date of Birth" value={editForm.dateOfBirth} onChange={(v) => setFormValue("dateOfBirth", v)} type="date" disabled={isSaving} />
                        </FormRow>

                        <FormRow>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Gender</label>
                            <select value={editForm.gender} onChange={(e) => setFormValue("gender", e.target.value)} disabled={isSaving} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500">
                              <option value="">Select gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Blood Group</label>
                            <select value={editForm.bloodGroup} onChange={(e) => setFormValue("bloodGroup", e.target.value)} disabled={isSaving} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500">
                              <option value="">Select blood group</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option><option value="AB-">AB-</option><option value="O+">O+</option><option value="O-">O-</option>
                            </select>
                          </div>
                        </FormRow>
                      </div>

                      <div className="rounded-xl border-2 border-dashed bg-slate-50 p-3 shrink-0 w-full md:w-[160px] flex flex-col items-center justify-center">
                        <Label className="block text-center text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Student Photo</Label>
                        <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-white shadow-md ring-1 ring-slate-200">
                          {editForm.photoDataUrl ? (
                            <img src={editForm.photoDataUrl} alt="Student" className="h-full w-full object-cover" />
                          ) : (
                            <UserRound className="h-full w-full p-6 text-slate-300 bg-slate-100" />
                          )}
                        </div>
                        <div className="mt-3 w-full grid grid-cols-2 gap-1.5">
                          <label className="flex h-8 cursor-pointer items-center justify-center gap-1 rounded-lg border bg-white text-[10px] font-bold shadow-sm hover:bg-slate-50 text-slate-700">
                            <Upload className="h-3 w-3" /> Files
                            <input type="file" accept="image/*" className="hidden" onChange={(e: any) => handlePhotoChange(e.target.files?.[0])} disabled={isSaving} />
                          </label>
                          <label className="flex h-8 cursor-pointer items-center justify-center gap-1 rounded-lg border bg-white text-[10px] font-bold shadow-sm hover:bg-slate-50 text-slate-700">
                            <Camera className="h-3 w-3" /> Snap
                            <input type="file" accept="image/*" capture="user" className="hidden" onChange={(e: any) => handlePhotoChange(e.target.files?.[0])} disabled={isSaving} />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 space-y-4">
                      <FormRow>
                        <EditField label="School Name" value={editForm.schoolName} onChange={(v) => setFormValue("schoolName", v)} disabled={isSaving} />
                      </FormRow>
                      <FormRow>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Class</label>
                          <select value={editForm.className} onChange={(e) => setFormValue("className", e.target.value)} disabled={isSaving} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="">Select class</option>
                            {CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <EditField label="Section" value={editForm.section} onChange={(v) => setFormValue("section", v)} placeholder="E.g. A" disabled={isSaving} />
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Board</label>
                          <select value={editForm.board} onChange={(e) => setFormValue("board", e.target.value)} disabled={isSaving} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="">Select board</option>
                            {BOARD_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </FormRow>
                      <FormRow>
                        <EditField label="Last Class Percentage (%)" value={editForm.lastClassPercentage} onChange={(v) => setFormValue("lastClassPercentage", v)} type="number" disabled={isSaving} />
                        <EditField label="Last Class Marks" value={editForm.lastClassMarks} onChange={(v) => setFormValue("lastClassMarks", v)} placeholder="E.g. 410/500" disabled={isSaving} />
                      </FormRow>

                      <div className="grid grid-cols-2 gap-3 opacity-60 pointer-events-none mt-2">
                        <EditField label="Course" value={student?.courseName || ""} onChange={() => {}} disabled />
                        <EditField label="Batch" value={student?.batchName || ""} onChange={() => {}} disabled />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 2 Parents */}
                <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white">
                  <CardContent className="p-5 space-y-5">
                    <SectionTitle number={2} icon={<User className="h-4 w-4" />}>Parent's Information</SectionTitle>
                    <div className="rounded-xl border p-4 bg-slate-50/50 space-y-3">
                      <h3 className="text-xs font-bold text-slate-600">FATHER</h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        <EditField label="Father's Name" value={editForm.fatherName} onChange={(v) => setFormValue("fatherName", v)} disabled={isSaving} />
                        <EditField label="Occupation" value={editForm.fatherOccupation} onChange={(v) => setFormValue("fatherOccupation", v)} disabled={isSaving} />
                        <EditField label="Phone" value={editForm.fatherPhone} onChange={(v) => setFormValue("fatherPhone", v)} type="tel" disabled={isSaving} />
                        <EditField label="WhatsApp" value={editForm.fatherWhatsapp} onChange={(v) => setFormValue("fatherWhatsapp", v)} type="tel" disabled={isSaving} />
                      </div>
                    </div>
                    <div className="rounded-xl border p-4 bg-slate-50/50 space-y-3">
                      <h3 className="text-xs font-bold text-slate-600">MOTHER</h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        <EditField label="Mother's Name" value={editForm.motherName} onChange={(v) => setFormValue("motherName", v)} disabled={isSaving} />
                        <EditField label="Occupation" value={editForm.motherOccupation} onChange={(v) => setFormValue("motherOccupation", v)} disabled={isSaving} />
                        <EditField label="Phone" value={editForm.motherPhone} onChange={(v) => setFormValue("motherPhone", v)} type="tel" disabled={isSaving} />
                        <EditField label="WhatsApp" value={editForm.motherWhatsapp} onChange={(v) => setFormValue("motherWhatsapp", v)} type="tel" disabled={isSaving} />
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <EditField label="Emergency Phone" value={editForm.emergencyPhone} onChange={(v) => setFormValue("emergencyPhone", v)} type="tel" disabled={isSaving} />
                      <EditField label="Email" value={editForm.email} onChange={(v) => setFormValue("email", v)} type="email" disabled={isSaving} />
                    </div>
                  </CardContent>
                </Card>

                {/* 3 Address */}
                <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white">
                  <CardContent className="p-5 space-y-5">
                    <SectionTitle number={3} icon={<MapPin className="h-4 w-4" />}>Address Details</SectionTitle>
                    <div className="rounded-xl border p-4 bg-slate-50/50 space-y-3">
                      <h3 className="text-xs font-bold text-slate-600">CORRESPONDENCE</h3>
                      <EditField label="Full Address" value={editForm.correspondenceAddress} onChange={(v) => setFormValue("correspondenceAddress", v)} textarea disabled={isSaving} />
                      <div className="grid gap-3 grid-cols-3">
                        <div className="space-y-1 col-span-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">State</label>
                          <select value={editForm.correspondenceState} onChange={(e) => setFormValue("correspondenceState", e.target.value)} disabled={isSaving} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="">Select state</option>
                            {INDIA_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <EditField label="District" value={editForm.correspondenceDistrict} onChange={(v) => setFormValue("correspondenceDistrict", v)} disabled={isSaving} />
                        <EditField label="PIN Code" value={editForm.correspondencePin} onChange={(v) => setFormValue("correspondencePin", v)} type="tel" disabled={isSaving} />
                      </div>
                    </div>
                    <div className="rounded-xl border p-4 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-600">PERMANENT</h3>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={sameAddress} onChange={handleSameAddressToggle} disabled={isSaving} className="w-3.5 h-3.5 accent-blue-600" />
                          <span className="text-[10px] font-bold text-blue-600">Same as Correspondence</span>
                        </label>
                      </div>
                      <EditField label="Full Address" value={editForm.permanentAddress} onChange={(v) => setFormValue("permanentAddress", v)} textarea disabled={isSaving || sameAddress} />
                      <div className="grid gap-3 grid-cols-3">
                        <div className="space-y-1 col-span-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">State</label>
                          <select value={editForm.permanentState} onChange={(e) => setFormValue("permanentState", e.target.value)} disabled={isSaving || sameAddress} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="">Select state</option>
                            {INDIA_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <EditField label="District" value={editForm.permanentDistrict} onChange={(v) => setFormValue("permanentDistrict", v)} disabled={isSaving || sameAddress} />
                        <EditField label="PIN Code" value={editForm.permanentPin} onChange={(v) => setFormValue("permanentPin", v)} type="tel" disabled={isSaving || sameAddress} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 4 Documents */}
                <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white">
                  <CardContent className="p-5 space-y-4">
                    <SectionTitle number={4} icon={<FileCheck2 className="h-4 w-4" />}>Documents</SectionTitle>
                    <p className="text-xs text-slate-500 -mt-2">Aadhaar & Marksheet (Image/PDF, Max 5MB)</p>
                    <div className="grid gap-4 md:grid-cols-2">
                      {(["aadhaarCard", "previousMarksheet"] as const).map((key) => (
                        <div key={key} className="rounded-xl border p-4 bg-slate-50/50 space-y-3">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase">{key === "aadhaarCard" ? "Aadhaar Card" : "Previous Marksheet"}</Label>
                          {editForm[key] ? (
                            <div className="space-y-2">
                              <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">✅ Uploaded</div>
                              <div className="grid grid-cols-2 gap-2">
                                <Button type="button" variant="outline" className="h-8 text-[10px] font-bold bg-white" onClick={() => { if (String(editForm[key]).startsWith("data:image")) window.open(editForm[key], "_blank"); }}>
                                  <Eye className="h-3 w-3 mr-1" /> View
                                </Button>
                                <Button type="button" variant="ghost" className="h-8 text-[10px] font-bold text-red-600 hover:bg-red-50 bg-white" onClick={() => setFormValue(key, "")} disabled={isSaving}>
                                  <X className="h-3 w-3 mr-1" /> Remove
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              <label className="flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-700 hover:bg-slate-50 shadow-sm">
                                <Upload className="h-3.5 w-3.5" /> Upload
                                <input type="file" accept="image/*,application/pdf" className="hidden" disabled={isSaving} onChange={(e: any) => handleDocumentUpload(key, e.target.files?.[0])} />
                              </label>
                              <label className="flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-700 hover:bg-slate-50 shadow-sm">
                                <Camera className="h-3.5 w-3.5" /> Camera
                                <input type="file" accept="image/*" capture="environment" className="hidden" disabled={isSaving} onChange={(e: any) => handleDocumentUpload(key, e.target.files?.[0])} />
                              </label>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* 5 Login */}
                <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white">
                  <CardContent className="p-5 space-y-5">
                    <SectionTitle number={5} icon={<KeyRound className="h-4 w-4" />}>Login Details</SectionTitle>
                    <div className="rounded-xl border bg-slate-50/50 p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <EditField label="Login ID / Username" value={editForm.loginId} onChange={(v) => setFormValue("loginId", v.toLowerCase().replace(/\s/g, ""))} disabled={isSaving} icon={<IdCard className="h-3.5 w-3.5 text-slate-400" />} />
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Update Password</label>
                          <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input type={showPassword ? "text" : "password"} value={editForm.loginPassword || ""} onChange={(e) => setFormValue("loginPassword", e.target.value)} disabled={isSaving} placeholder="Blank = no change (Min 6 char)" className={`w-full rounded-xl border ${fieldErrors.loginPassword ? "border-red-400 focus:ring-red-500/20" : "border-slate-200 focus:ring-blue-500/20"} bg-white py-2 pl-9 pr-10 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 disabled:opacity-50`} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400">
                              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                          {fieldErrors.loginPassword && <p className="text-[10px] font-bold text-red-500 mt-1">{fieldErrors.loginPassword}</p>}
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
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-100 bg-white/95 pb-safe shadow-lg backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-1">
            <NavBtn active={activeTab === "home"} onClick={() => setActiveTab("home")} icon={<Home className="h-5 w-5" strokeWidth={2.2} />} label="Home" />
            <NavBtn active={activeTab === "homework"} onClick={() => setActiveTab("homework")} icon={<div className="relative"><BookOpen className="h-5 w-5" strokeWidth={2.2} />{homework.length > 0 && (<span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />)}</div>} label="Homework" />
            <NavBtn active={activeTab === "timetable"} onClick={() => setActiveTab("timetable")} icon={<CalendarDays className="h-5 w-5" strokeWidth={2.2} />} label="Timetable" />
            <NavBtn active={activeTab === "fees"} onClick={() => setActiveTab("fees")} icon={<IndianRupee className="h-5 w-5" strokeWidth={2.2} />} label="Fees" />
            <NavBtn active={activeTab === "results"} onClick={() => setActiveTab("results")} icon={<FileText className="h-5 w-5" strokeWidth={2.2} />} label="Results" />
          </div>
        </div>
      </div>
    </>
  );
}

// -------------------- SUB COMPONENTS --------------------

function NavBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center flex-1 h-12 rounded-2xl transition-all active:scale-90 ${active ? "text-[#4d7c0f] font-extrabold" : "text-slate-400 font-medium"}`}>
      {icon}
      <span className="text-[9px] mt-1 tracking-wide">{label}</span>
    </button>
  );
}

function ExamCard({ exam, onClick }: { exam: Exam; onClick: () => void; }) {
  const status = exam.status || "upcoming";
  const countdown = status === "upcoming" && exam.startTime ? getCountdown(exam.startTime) : status === "live" && exam.endTime ? getCountdown(exam.endTime) : null;
  const statusColors: Record<string, string> = { upcoming: "border-l-blue-500 bg-blue-50/30", live: "border-l-red-500 bg-red-50/30", completed: "border-l-emerald-500 bg-emerald-50/30", missed: "border-l-slate-400 bg-slate-50/50" };

  return (
    <div onClick={onClick} className={`relative overflow-hidden rounded-2xl border-none border-l-4 bg-white p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer ${statusColors[status]}`} style={{ borderLeftWidth: "4px", borderLeftStyle: "solid" }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[9px] font-black uppercase ${exam.examType === "online" ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-700"}`}>
            {exam.examType === "online" ? <><Monitor className="h-2.5 w-2.5" /> Online</> : <><PenTool className="h-2.5 w-2.5" /> Offline</>}
          </span>
          <ExamStatusBadge status={status} />
        </div>
        <span className="text-[9px] font-extrabold text-slate-400 uppercase shrink-0">{exam.subjectName}</span>
      </div>
      <h4 className="text-xs font-black text-slate-800 leading-snug break-words">{exam.title}</h4>
      <div className="mt-2.5 flex flex-wrap gap-2 text-[10px] font-bold text-slate-500">
        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{formatDate(exam.examDate)}</span>
        {exam.startTime && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(exam.startTime)}</span>}
        {exam.venue && exam.examType === "offline" && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{exam.venue}</span>}
        <span className="inline-flex items-center gap-1 text-blue-600"><Trophy className="h-3 w-3" />{exam.totalMarks} marks</span>
      </div>
      {countdown && (
        <div className={`mt-3 rounded-xl px-3 py-2 text-[10px] font-black flex items-center gap-1.5 ${status === "live" ? "bg-red-500 text-white animate-pulse" : "bg-blue-100 text-blue-700"}`}>
          <Timer className="h-3 w-3" />{status === "live" ? "ENDS IN " : "STARTS IN "}{countdown.toUpperCase()}
        </div>
      )}
      {status === "completed" && exam.marksObtained != null && (
        <div className="mt-3 rounded-xl bg-emerald-100 px-3 py-2 flex justify-between">
          <span className="text-[10px] font-black text-emerald-700 uppercase">Score</span>
          <span className="text-xs font-black text-emerald-900">{exam.marksObtained} / {exam.totalMarks}{exam.grade ? ` • ${exam.grade}` : ""}</span>
        </div>
      )}
      {status === "missed" && (
        <div className="mt-3 rounded-xl bg-slate-200 px-3 py-2 flex items-center gap-1.5"><XCircle className="h-3 w-3 text-slate-600" /><span className="text-[10px] font-black text-slate-600 uppercase">Exam Missed</span></div>
      )}
      {status === "live" && exam.examType === "online" && (
        <div className="mt-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 px-3 py-2 flex items-center justify-center gap-1.5 text-white animate-livePulse">
          <Play className="h-3 w-3 fill-white" /><span className="text-[10px] font-black uppercase tracking-wider">Tap to Attend Now</span>
        </div>
      )}
    </div>
  );
}

function ExamStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    upcoming: { label: "Upcoming", cls: "bg-blue-100 text-blue-700" },
    live: { label: "🔴 Live", cls: "bg-red-100 text-red-700" },
    completed: { label: "Completed", cls: "bg-emerald-100 text-emerald-700" },
    missed: { label: "Missed", cls: "bg-slate-200 text-slate-600" },
  };
  const s = map[status] || map.upcoming;
  return <span className={`inline-block rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${s.cls}`}>{s.label}</span>;
}

function StatItem({ label, val, subVal, icon, bg }: { label: string; val: string; subVal?: string; icon: React.ReactNode; bg: string; }) {
  return (
    <div className={`p-3 rounded-2xl ${bg} flex flex-col justify-between min-h-[80px]`}>
      <div className="flex justify-between items-center"><span className="text-[9px] text-slate-500 font-bold uppercase truncate pr-1">{label}</span>{icon}</div>
      <div className="mt-1"><p className="text-xs font-black text-slate-800 leading-tight truncate">{val}</p>{subVal && <p className="text-[9px] font-bold text-slate-500 mt-0.5 truncate">{subVal}</p>}</div>
    </div>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode; }) {
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-xl bg-blue-50 p-1.5 text-blue-600">{icon}</div><h3 className="text-xs font-extrabold text-slate-800 tracking-tight">{title}</h3>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <div className="rounded-3xl border-2 border-dashed border-slate-100 bg-slate-50/50 py-8 px-4 text-center"><p className="text-xs text-slate-400 font-bold">{text}</p></div>;
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === "paid" ? "bg-green-100 text-green-700" : status === "overdue" ? "bg-red-100 text-red-700" : status === "partial" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600";
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${cls}`}>{status}</span>;
}

function DetailRow({ label, val, highlight = false }: { label: string; val: React.ReactNode; highlight?: boolean; }) {
  return (
    <div className="flex items-center justify-between py-2.5 gap-2">
      <span className="text-xs text-slate-400 font-bold shrink-0">{label}</span>
      <span className={`text-xs text-right ${highlight ? "font-black text-blue-600 text-sm" : "font-extrabold text-slate-800"}`}>{val}</span>
    </div>
  );
}

// -------------------- EDIT FORM SUB-COMPONENTS --------------------

function SectionTitle({ number, icon, children }: { number?: number; icon: React.ReactNode; children: React.ReactNode; }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3">
      {number && <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-600">{number}</span>}
      <span className="text-slate-400">{icon}</span>{children}
    </h3>
  );
}

function FormRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 mb-3">{children}</div>;
}

function EditField({ label, value, onChange, type = "text", textarea = false, disabled = false, placeholder = "", icon = null, error }: { label: string; value: string; onChange: (v: string) => void; type?: string; textarea?: boolean; disabled?: boolean; placeholder?: string; icon?: React.ReactNode; error?: string; }) {
  return (
    <div className="space-y-1 col-span-2 md:col-span-1">
      <label className="text-[10px] font-bold text-slate-500 uppercase">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 shrink-0">{icon}</div>}
        {textarea ? (
          <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} rows={2} placeholder={placeholder} className={`w-full rounded-xl border ${error ? "border-red-400" : "border-slate-200"} bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 disabled:opacity-50`} />
        ) : (
          <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} placeholder={placeholder} className={`w-full rounded-xl border ${error ? "border-red-400" : "border-slate-200"} bg-white py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 disabled:opacity-50 ${icon ? "pl-9 pr-3" : "px-3"}`} />
        )}
      </div>
      {error && <p className="text-[10px] font-bold text-red-500">{error}</p>}
    </div>
  );
}