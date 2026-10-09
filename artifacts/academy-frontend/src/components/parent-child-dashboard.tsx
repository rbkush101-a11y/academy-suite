import { useEffect, useMemo, useState } from "react";
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
  ChevronLeft,
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
  IdCard,
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
  ArrowLeft,
  School,
  BookMarked,
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
  instituteLogoDataUrl?: string;
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
  percentage: number; // legacy: recorded days only
  recordedRate: number | null;
  monthlyPercentage: number | null;
  monthlyStatus: "not_verified" | "verified";
  officialCalendarAvailable: boolean;
  workingDays: number | null;
  batchRegisterDays: number;
  unmarkedBatchRegisterDays: number;
  batchRegisterDates: string[];
  unmarkedBatchRegisterDates: string[];
};

type AttendanceDay = {
  id: string;
  date: string;
  status: "present" | "absent" | "late";
  remarks: string;
};

type MonthlyAttendance = {
  month: string;
  summary: AttendanceSummary;
  records: AttendanceDay[];
};

const indiaMonth = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  return `${year}-${month}`;
};

const readableMonth = (month: string) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" })
    .format(new Date(year, monthNumber - 1, 1));
};

const moveMonth = (month: string, offset: number) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const target = new Date(year, monthNumber - 1 + offset, 1);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}`;
};


type StudentLeaveRequest = {
  id: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  adminRemark?: string;
  createdAt?: string;
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


// Keep recent child dashboard data only for this signed-in parent session.
const CHILD_OVERVIEW_CACHE_PREFIX = "academy_child_overview_cache:v2:";
const CHILD_OVERVIEW_CACHE_TTL_MS = 10 * 60 * 1000;
function childSessionCacheKey(studentId: string): string | null {
  try {
    const token = localStorage.getItem("coach_sutra_token") || "";
    const encoded = token.split(".")[1];
    if (!encoded) return null;
    const claims = JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/")));
    if (claims.role !== "parent" ||
        (typeof claims.exp === "number" && Date.now() >= claims.exp * 1000)) return null;
    const userId = String(claims.userId || claims.sub || "");
    const sessionId = String(claims.sessionId || "");
    return userId && sessionId && studentId
      ? `${CHILD_OVERVIEW_CACHE_PREFIX}${userId}:${sessionId}:${studentId}` : null;
  } catch {
    return null;
  }
}
function readCachedChildOverview(studentId: string): any | null {
  const key = childSessionCacheKey(studentId);
  if (!key) return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry?.body?.selectedChild?.id ||
        String(entry.body.selectedChild.id) !== studentId ||
        !Number.isFinite(entry.savedAt) ||
        Date.now() - entry.savedAt > CHILD_OVERVIEW_CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return entry.body;
  } catch {
    return null;
  }
}
function writeCachedChildOverview(studentId: string, body: any) {
  const key = childSessionCacheKey(studentId);
  if (!key || String(body?.selectedChild?.id || "") !== studentId) return;
  try {
    // Cache the last API result only in this tab. Cache is short-lived and
    // never replaces background validation against the live API.
    const serialized = JSON.stringify({ savedAt: Date.now(), body });
    if (serialized.length < 2_000_000) sessionStorage.setItem(key, serialized);
  } catch { /* Browser storage unavailable/full. */ }
}
function clearChildDashboardCaches() {
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = sessionStorage.key(index) || "";
      if (key.startsWith(CHILD_OVERVIEW_CACHE_PREFIX) ||
          key.startsWith("academy_parent_home_cache:v2:")) {
        sessionStorage.removeItem(key);
      }
    }
  } catch { /* Ignore disabled browser storage. */ }
}

type ParentChildDashboardProps = {
  studentId: string;
  onBackToParent: () => void;
  initialStudent?: Partial<StudentMe> & Pick<StudentMe, "id" | "name">;
};

export default function ParentChildDashboard({ studentId, onBackToParent, initialStudent }: ParentChildDashboardProps) {
  // Parent dashboard already knows the child's identity, so render it immediately.
  const [student, setStudent] = useState<StudentMe | null>(() =>
    initialStudent?.id === studentId && initialStudent.name
      ? { role: "student", instituteId: "", ...initialStudent }
      : null,
  );
  // Unified Parent + Student App: Student Dashboard is a normal full-access area.
  // There is no separate Student App and no Parent View / Support Mode banner.
  const supportMode = false;
  const parentView = false;
  const supportStudentName = student?.name || "Student";
  const supportExpiresAt = "";
  const [payments, setPayments] = useState<Payment[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [report, setReport] = useState<any>(null);
  // Attendance is rendered from the selected month's authenticated API response.
  // Do not maintain a second, unused overview summary with a divergent data shape.
  const [attendanceMonth, setAttendanceMonth] = useState(() => indiaMonth());
  const [monthlyAttendance, setMonthlyAttendance] = useState<MonthlyAttendance | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<StudentLeaveRequest[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveMessage, setLeaveMessage] = useState("");
  const [leaveForm, setLeaveForm] = useState({
    fromDate: "",
    toDate: "",
    reason: "",
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [, forceTick] = useState(0);

  const [activeTab, setActiveTab] = useState<
    | "home"
    | "homework"
    | "timetable"
    | "fees"
    | "results"
    | "exams"
    | "attendance"
    | "leave"
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
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
    return DAYS_OF_WEEK.includes(today as any) ? today : "Monday";
  });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isProfileFormEditing, setIsProfileFormEditing] = useState(false);
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
    onBackToParent();
  };

  const logout = () => {
    const currentToken = localStorage.getItem("coach_sutra_token");
    if (currentToken) {
      void fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken}` },
      }).catch(() => {});
    }
    clearChildDashboardCaches();
    localStorage.removeItem("academy_last_child_id");
    localStorage.removeItem("coach_sutra_token");
    localStorage.removeItem("coach_sutra_user_role");
    localStorage.removeItem("foundation_branches");
    localStorage.removeItem("foundation_institute_id");
    localStorage.removeItem("active_branch_id");
    localStorage.removeItem("active_branch_name");
    window.dispatchEvent(new Event("storage"));
    window.location.assign("/login");
  };

  useEffect(() => {
    const token = localStorage.getItem("coach_sutra_token") || "";
    if (!token || !studentId) {
      setMessage("Parent session or selected child is unavailable.");
      setLoading(false);
      return;
    }

    // Instantly restore the last verified overview for this exact child/session;
    // refresh from the server in the background on every visit.
    const cachedBody = readCachedChildOverview(studentId);
    const applyOverview = (body: any) => {
      const child = body?.selectedChild;
      if (!child?.id || String(child.id) !== studentId) {
        throw new Error("The selected child is not linked to this parent account.");
      }

      const me = {
        id: String(child.id),
        name: String(child.name || "Student"),
        email: String(child.email || ""),
        phone: String(child.phone || ""),
        role: "student",
        instituteId: String(body?.institute?.id || ""),
        instituteName: String(body?.institute?.name || ""),
        instituteLogoDataUrl: String(body?.institute?.logoDataUrl || ""),
        enrollmentNo: String(child.enrollmentNo || ""),
        courseId: String(child.courseId || ""),
        courseName: String(child.courseName || ""),
        batchId: String(child.batchId || ""),
        batchName: String(child.batchName || ""),
        academicYear: String(child.academicYear || body?.institute?.academicYear || ""),
        className: String(child.className || ""),
        section: String(child.section || ""),
        board: String(child.board || ""),
        boardOther: String(child.boardOther || ""),
        schoolName: String(child.schoolName || ""),
        photoDataUrl: String(child.photoDataUrl || ""),
        dateOfBirth: String(child.dateOfBirth || ""),
        gender: String(child.gender || ""),
        genderOther: String(child.genderOther || ""),
        bloodGroup: String(child.bloodGroup || ""),
        aadhaarCard: String(child.aadhaarCard || ""),
        previousMarksheet: String(child.previousMarksheet || ""),
        lastClassPercentage: String(child.lastClassPercentage || ""),
        lastClassMarks: String(child.lastClassMarks || ""),
        parentName: String(child.parentName || ""),
        parentPhone: String(child.parentPhone || ""),
        fatherName: String(child.fatherName || ""),
        fatherOccupation: String(child.fatherOccupation || ""),
        fatherPhone: String(child.fatherPhone || ""),
        fatherWhatsapp: String(child.fatherWhatsapp || ""),
        motherName: String(child.motherName || ""),
        motherOccupation: String(child.motherOccupation || ""),
        motherPhone: String(child.motherPhone || ""),
        motherWhatsapp: String(child.motherWhatsapp || ""),
        emergencyPhone: String(child.emergencyPhone || ""),
        correspondenceAddress: String(child.correspondenceAddress || ""),
        correspondenceDistrict: String(child.correspondenceDistrict || ""),
        correspondenceState: String(child.correspondenceState || ""),
        correspondencePin: String(child.correspondencePin || ""),
        permanentAddress: String(child.permanentAddress || ""),
        permanentDistrict: String(child.permanentDistrict || ""),
        permanentState: String(child.permanentState || ""),
        permanentPin: String(child.permanentPin || ""),
        loginId: String(body?.parent?.loginId || ""),
      } as StudentMe & { instituteLogoDataUrl?: string };
      setStudent(me);

      const feeRows = Array.isArray(body?.fees?.recent) ? body.fees.recent : [];
      setPayments(
        feeRows.map((p: any) => ({
          id: String(p.id || p._id || ""),
          amount: Number(
            p.amount ?? Math.max(0, Number(p.totalAmount || 0) - Number(p.lateFee || 0)),
          ),
          totalAmount: Number(p.totalAmount ?? p.amount ?? 0),
          paidAmount: Number(p.paidAmount ?? 0),
          lateFee: Number(p.lateFee ?? 0),
          dueDate: String(p.dueDate || ""),
          paidDate: p.paidDate ? String(p.paidDate) : null,
          status: ["pending", "paid", "overdue", "partial"].includes(String(p.status))
            ? p.status
            : "pending",
          month: String(p.month || ""),
          monthLabel: String(p.monthLabel || p.month || "Fee"),
        })),
      );

      const homeworkRows = Array.isArray(body?.homework) ? body.homework : [];
      setHomework(
        homeworkRows.map((h: any) => ({
          id: String(h.id || h._id || ""),
          title: String(h.title || "Homework"),
          description: String(h.description || ""),
          subjectName: String(h.subjectName || "Subject"),
          dueDate: String(h.dueDate || ""),
          status: String(h.status || "assigned"),
        })),
      );

      const timetableRows = Array.isArray(body?.timetable) ? body.timetable : [];
      setTimetable(
        timetableRows.map((t: any) => ({
          id: String(t.id || t._id || ""),
          batchName: String(t.batchName || child.batchName || ""),
          subjectName: String(t.subjectName || "Subject"),
          teacherName: String(t.teacherName || ""),
          day: String(t.day || ""),
          startTime: String(t.startTime || ""),
          endTime: String(t.endTime || ""),
          room: String(t.room || ""),
        })),
      );

      const examRows = Array.isArray(body?.exams) ? body.exams : [];
      const mappedExams: Exam[] = examRows.map((e: any) => {
        const base: Exam = {
          id: String(e.id || e._id || ""),
          title: String(e.title || e.name || "Exam"),
          subjectName: String(e.subjectName || e.subject || "Subject"),
          examType: (e.examType === "online" || e.type === "online" || e.isOnline
            ? "online"
            : "offline") as "online" | "offline",
          examDate: String(e.examDate || e.date || e.startTime || new Date().toISOString()),
          startTime: e.startTime ? String(e.startTime) : undefined,
          endTime: e.endTime ? String(e.endTime) : undefined,
          durationMinutes: Number(e.durationMinutes ?? e.duration ?? 60),
          totalMarks: Number(e.totalMarks ?? 100),
          passingMarks: Number(e.passingMarks ?? 33),
          venue: String(e.venue || e.room || ""),
          instructions: String(e.instructions || ""),
          syllabus: String(e.syllabus || ""),
          examUrl: e.examUrl ? String(e.examUrl) : undefined,
          marksObtained:
            e.marksObtained !== null && e.marksObtained !== undefined
              ? Number(e.marksObtained)
              : null,
          grade: e.grade ? String(e.grade) : null,
          resultStatus: e.resultStatus ? String(e.resultStatus) : null,
          status: e.status,
        };
        return { ...base, status: deriveExamStatus(base) };
      });
      setExams(mappedExams);

      setReport({
        examResults: mappedExams
          .filter((exam) => exam.marksObtained !== null && exam.marksObtained !== undefined)
          .map((exam) => ({
            subject: exam.subjectName,
            marksObtained: exam.marksObtained,
            totalMarks: exam.totalMarks,
            grade: exam.grade || "",
            resultStatus:
              exam.resultStatus ||
              (Number(exam.marksObtained || 0) >= Number(exam.passingMarks || 0)
                ? "Pass"
                : "Fail"),
          })),
      });

    };

    if (cachedBody) {
      try {
        applyOverview(cachedBody);
        setLoading(false);
      } catch {
        // A malformed cache is ignored; live API will repopulate it.
      }
    }

    const load = async () => {
      setLoading(!cachedBody);
      setMessage("");
      try {
        const response = await fetch(
          `/api/parent/overview?studentId=${encodeURIComponent(studentId)}`,
          {
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          const failure = new Error(body?.error || "Unable to load the Student Dashboard.") as Error & { status?: number };
          failure.status = response.status;
          throw failure;
        }

        applyOverview(body);
        writeCachedChildOverview(studentId, body);

        try {
          setLeaveLoading(true);
          const leaveResponse = await fetch(
            `/api/parent/children/${encodeURIComponent(studentId)}/leaves`,
            {
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            },
          );
          const leaveBody = await leaveResponse.json().catch(() => ({}));
          if (leaveResponse.ok) {
            const rows = Array.isArray(leaveBody?.leaves) ? leaveBody.leaves : [];
            setLeaveRequests(
              rows.map((item: any) => ({
                id: String(item.id || item._id || ""),
                fromDate: String(item.fromDate || ""),
                toDate: String(item.toDate || ""),
                reason: String(item.reason || ""),
                status: ["pending", "approved", "rejected"].includes(String(item.status))
                  ? item.status
                  : "pending",
                adminRemark: String(item.adminRemark || ""),
                createdAt: item.createdAt ? String(item.createdAt) : undefined,
              })),
            );
          } else if (leaveResponse.status !== 404) {
            throw new Error(leaveBody?.error || "Unable to load leave requests.");
          } else {
            setLeaveRequests([]);
          }
        } catch (leaveError: any) {
          console.error("Leave requests load error:", leaveError);
          setLeaveRequests([]);
        } finally {
          setLeaveLoading(false);
        }
      } catch (error: any) {
        // Never leave cached academic/fee data on screen if access is denied.
        if (error?.status === 401 || error?.status === 403) {
          const key = childSessionCacheKey(studentId);
          if (key) sessionStorage.removeItem(key);
          setStudent(null);
          setPayments([]);
          setHomework([]);
          setReport(null);
          setTimetable([]);
          setExams([]);
        }
        setMessage(error?.message || "Unable to load the Student Dashboard.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [studentId, refreshKey]);

  // Load real records for the selected child/month; do NOT reload the entire dashboard
  // on every calendar navigation. An AbortController prevents stale months/children
  // from overwriting the latest request.
  useEffect(() => {
    if (activeTab !== "attendance" || !studentId) return;

    const controller = new AbortController();
    const token = localStorage.getItem("coach_sutra_token") || "";
    setAttendanceLoading(true);
    setAttendanceError("");
    setMonthlyAttendance(null);

    if (!token) {
      setAttendanceError("Parent session expired. Please sign in again.");
      setAttendanceLoading(false);
      return;
    }

    const loadAttendance = async () => {
      try {
        const response = await fetch(
          `/api/parent/children/${encodeURIComponent(studentId)}/attendance?month=${encodeURIComponent(attendanceMonth)}`,
          {
            credentials: "include",
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
        );
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result?.error || "Unable to load attendance for this month.");
        }
        if (result?.month !== attendanceMonth || String(result?.child?.id) !== studentId) {
          throw new Error("Attendance response does not match the selected child or month.");
        }

        const rawSummary = result?.summary || {};
        const rows = Array.isArray(result?.records) ? result.records : [];
        if (!controller.signal.aborted) {
          setMonthlyAttendance({
            month: attendanceMonth,
            summary: {
              studentId,
              totalClasses: Number(rawSummary.total ?? 0),
              present: Number(rawSummary.present ?? 0),
              absent: Number(rawSummary.absent ?? 0),
              late: Number(rawSummary.late ?? 0),
              percentage: Number(rawSummary.percentage ?? 0),
              recordedRate: rawSummary.recordedRate == null
                ? rawSummary.total > 0 ? Number(rawSummary.percentage ?? 0) : null
                : Number(rawSummary.recordedRate),
              monthlyPercentage: rawSummary.monthlyPercentage == null
                ? null
                : Number(rawSummary.monthlyPercentage),
              monthlyStatus: rawSummary.monthlyStatus === "verified" ? "verified" : "not_verified",
              officialCalendarAvailable: rawSummary.officialCalendarAvailable === true,
              workingDays: rawSummary.workingDays == null ? null : Number(rawSummary.workingDays),
              batchRegisterDays: Number(rawSummary.batchRegisterDays ?? new Set(rows.map((row: any) => row?.date).filter(Boolean)).size),
              unmarkedBatchRegisterDays: Number(rawSummary.unmarkedBatchRegisterDays ?? 0),
              batchRegisterDates: Array.isArray(rawSummary.batchRegisterDates)
                ? rawSummary.batchRegisterDates.filter((date: unknown): date is string =>
                    typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date),
                  )
                : [],
              unmarkedBatchRegisterDates: Array.isArray(rawSummary.unmarkedBatchRegisterDates)
                ? rawSummary.unmarkedBatchRegisterDates.filter((date: unknown): date is string =>
                    typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date),
                  )
                : [],
            },
            records: rows
              .filter((row: any) =>
                typeof row?.date === "string" &&
                row.date.startsWith(`${attendanceMonth}-`) &&
                ["present", "absent", "late"].includes(row.status),
              )
              .map((row: any) => ({
                id: String(row.id || row._id || ""),
                date: String(row.date),
                status: row.status as AttendanceDay["status"],
                remarks: String(row.remarks || ""),
              })),
          });
        }
      } catch (cause: any) {
        if (!controller.signal.aborted) {
          setAttendanceError(cause?.message || "Unable to load attendance.");
        }
      } finally {
        if (!controller.signal.aborted) setAttendanceLoading(false);
      }
    };

    void loadAttendance();
    return () => controller.abort();
  }, [studentId, activeTab, attendanceMonth, refreshKey]);

  const attendanceCalendar = useMemo(() => {
    const [year, monthNumber] = attendanceMonth.split("-").map(Number);
    const firstWeekday = new Date(year, monthNumber - 1, 1).getDay();
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const rowsByDay = new Map<number, AttendanceDay[]>();
    if (monthlyAttendance?.month === attendanceMonth) {
      for (const row of monthlyAttendance.records) {
        const day = Number(row.date.slice(8, 10));
        if (!Number.isInteger(day) || day < 1 || day > daysInMonth) continue;
        rowsByDay.set(day, [...(rowsByDay.get(day) || []), row]);
      }
    }
    return { firstWeekday, daysInMonth, rowsByDay };
  }, [attendanceMonth, monthlyAttendance]);

  const visibleAttendance =
    monthlyAttendance?.month === attendanceMonth ? monthlyAttendance.summary : null;
  const attendanceHasRecords = (visibleAttendance?.totalClasses ?? 0) > 0;

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
      .filter((slot) =>
        selectedDay === "All Week" ||
        slot.day?.toLowerCase() === selectedDay.toLowerCase(),
      )
      .sort((a, b) => {
        if (selectedDay === "All Week") {
          const aDay = DAYS_OF_WEEK.findIndex((day) => day.toLowerCase() === a.day?.toLowerCase());
          const bDay = DAYS_OF_WEEK.findIndex((day) => day.toLowerCase() === b.day?.toLowerCase());
          if (aDay !== bDay) return aDay - bDay;
        }
        return (a.startTime || "").localeCompare(b.startTime || "");
      });
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
      | "leave"
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

  const submitLeaveRequest = async () => {
    const fromDate = leaveForm.fromDate.trim();
    const toDate = leaveForm.toDate.trim();
    const reason = leaveForm.reason.trim();

    setLeaveMessage("");

    if (!fromDate || !toDate) {
      setLeaveMessage("Please select both From Date and To Date.");
      return;
    }
    if (new Date(fromDate).getTime() > new Date(toDate).getTime()) {
      setLeaveMessage("To Date cannot be earlier than From Date.");
      return;
    }
    if (reason.length < 5) {
      setLeaveMessage("Leave reason must be at least 5 characters long.");
      return;
    }

    const token = localStorage.getItem("coach_sutra_token") || "";
    if (!token) {
      setLeaveMessage("Session expired. Please login again.");
      return;
    }

    setLeaveSubmitting(true);
    try {
      const response = await fetch(
        `/api/parent/children/${encodeURIComponent(studentId)}/leaves`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ fromDate, toDate, reason }),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || "Unable to submit the leave request.");
      }

      const created = body?.leave;
      if (created) {
        setLeaveRequests((current) => [
          {
            id: String(created.id || created._id || ""),
            fromDate: String(created.fromDate || fromDate),
            toDate: String(created.toDate || toDate),
            reason: String(created.reason || reason),
            status: ["pending", "approved", "rejected"].includes(String(created.status))
              ? created.status
              : "pending",
            adminRemark: String(created.adminRemark || ""),
            createdAt: created.createdAt ? String(created.createdAt) : new Date().toISOString(),
          },
          ...current,
        ]);
      }
      setLeaveForm({ fromDate: "", toDate: "", reason: "" });
      setLeaveMessage("Leave request submitted successfully.");
    } catch (error: any) {
      setLeaveMessage(error?.message || "Unable to submit the leave request.");
    } finally {
      setLeaveSubmitting(false);
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
    setIsProfileFormEditing(false);
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
    if (!studentId) return;
    if (!editForm.name) {
      setFieldErrors({ name: "Student name is required" });
      return;
    }

    const token = localStorage.getItem("coach_sutra_token") || "";
    if (!token) {
      setEditMessage({ type: "error", text: "Session expired. Please login again." });
      return;
    }

    setIsSaving(true);
    setEditMessage(null);
    setFieldErrors({});

    try {
      const payload: any = { ...editForm };
      // Student has no separate login account in the unified app.
      delete payload.loginId;
      delete payload.loginPassword;

      const response = await fetch(
        `/api/parent/children/${encodeURIComponent(studentId)}/profile`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.details || data?.error || "Profile update failed.");
      }

      const cacheKey = childSessionCacheKey(studentId);
      if (cacheKey) sessionStorage.removeItem(cacheKey);
      setEditMessage({
        type: "success",
        text: data?.message || "Profile updated successfully!",
      });
      setTimeout(() => {
        setIsEditOpen(false);
        setRefreshKey((current) => current + 1);
      }, 900);
    } catch (error: any) {
      setEditMessage({
        type: "error",
        text: error?.message || "Profile update failed.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <AppStyles />
      <div className="min-h-screen bg-[linear-gradient(180deg,#061b3b_0%,#03142f_52%,#02102a_100%)] pb-24 md:pb-8 select-none antialiased">
        {supportMode && (
          <div className="fixed inset-x-0 top-0 z-[100] border-b border-cyan-300/20 bg-slate-950 px-3 py-2 text-white shadow-lg">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 shrink-0 text-cyan-300" />
                  <p className="truncate text-xs font-black">{parentView ? "Parent View" : "Read-only Support Mode"} · {supportStudentName}</p>
                </div>
                <p className="mt-0.5 hidden text-[10px] text-slate-400 sm:block">
                  {parentView ? "You are viewing your linked child dashboard inside the Parent App. Changes and test attempts are blocked." : "Student password is not exposed. Changes and payments are blocked."}
                  {supportExpiresAt ? ` Session expires ${new Date(supportExpiresAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}.` : ""}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                className="h-8 shrink-0 bg-white px-3 text-[11px] font-black text-slate-950 hover:bg-cyan-50"
                onClick={() => void exitSupportMode()}
              >
                {parentView ? "Back to Parent Dashboard" : "Exit Support Mode"}
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
              aria-label="Open student profile form"
              onClick={openEditModal}
              className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/80 bg-slate-800 shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition active:scale-95"
            >
              {student?.photoDataUrl ? (
                <img
                  src={student.photoDataUrl}
                  alt={student?.name || ""}
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
                    {student?.name || ""}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">
                    {student?.enrollmentNo || "Student ID"} ·{" "}
                    {formatClassAndSection(student?.className, student?.section)}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-1">
                <DrawerItem
                  icon={<Home className="h-[18px] w-[18px]" />}
                  label="Parent/Student Dashboard"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onBackToParent();
                  }}
                />
                <DrawerItem
                  active={activeTab === "home" && !isProfileOpen && !isNotificationsOpen}
                  icon={<Users className="h-[18px] w-[18px]" />}
                  label="Student Dashboard"
                  onClick={() => openStudentSection("home")}
                />
                <DrawerItem
                  active={isProfileOpen}
                  icon={<User className="h-[18px] w-[18px]" />}
                  label="Profile"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsNotificationsOpen(false);
                    openEditModal();
                  }}
                />
                <DrawerItem
                  active={isNotificationsOpen}
                  icon={<Bell className="h-[18px] w-[18px]" />}
                  label="Notifications"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsProfileOpen(false);
                    setIsNotificationsOpen(true);
                  }}
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
                  label="Sign Out"
                  danger
                  onClick={logout}
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
            <div className="relative min-h-[calc(100vh-150px)] space-y-4 pb-3 animate-fadeIn">
              <section className="relative z-10 overflow-hidden rounded-[22px] border border-cyan-200/35 px-5 py-5 text-white shadow-[0_20px_50px_-24px_rgba(0,141,255,0.65)]">
                <img
                  src="/parent-app/welcome-card-background.png"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-center"
                />
                <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(90deg,rgba(3,31,79,.88)_0%,rgba(4,61,137,.66)_48%,rgba(5,95,177,.18)_100%)]" />

                <div className="relative z-10 flex items-start gap-3">
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

                <div className="relative z-10 mt-4 pr-[118px]">
                  <p className="text-sm font-extrabold text-white/95">Welcome</p>
                  {student?.name ? (
                    <h2 className="mt-0.5 truncate text-[28px] font-black leading-none tracking-tight">
                      {student.name}
                    </h2>
                  ) : (
                    <div aria-label="Loading student name" className="mt-2 h-7 w-36 animate-pulse rounded-lg bg-white/25" />
                  )}
                </div>

              </section>

              {examSummary.live > 0 && (
                <button
                  type="button"
                  onClick={() => openStudentSection("exams")}
                  className="relative z-10 flex w-full items-center justify-between rounded-2xl border border-red-300/30 bg-red-500/10 p-3 text-left text-white backdrop-blur-sm transition active:scale-[0.99]"
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

              <section className="relative z-10">
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
                    onClick={openEditModal}
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
                    label="My Leave"
                    icon={<CalendarDays className="h-5 w-5" />}
                    tone="blue"
                    badge={
                      leaveRequests.filter((item) => item.status === "pending").length > 0
                        ? String(leaveRequests.filter((item) => item.status === "pending").length)
                        : undefined
                    }
                    onClick={() => openStudentSection("leave")}
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

              {/* Exact-ratio school background: no crop, no zoom */}
<div
                aria-hidden="true"
                className="pointer-events-none fixed bottom-[72px] left-1/2 z-0 w-full max-w-lg -translate-x-1/2"
                style={{
                  aspectRatio: "1472 / 328",
                  backgroundImage: "url('/parent-app/bottom-school-background.png')",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "bottom center",
                  backgroundSize: "100% auto",
                }}
              />
            </div>
          )}

          {/* HOMEWORK */}
          {activeTab === "homework" && (
            <div className="space-y-3.5 animate-fadeIn">
              <StudentSectionHeader
                title="Homework"
                description="Assignments and due work"
                icon={<FileText className="h-5 w-5" />}
                onBack={() => openStudentSection("home")}
              />
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
              <StudentSectionHeader
                title="Time Table"
                description={`Batch: ${student?.batchName || "Assigned Batch"}`}
                icon={<CalendarDays className="h-5 w-5" />}
                onBack={() => openStudentSection("home")}
              />
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1" role="group" aria-label="Choose timetable day">
                <button
                  type="button"
                  aria-pressed={selectedDay === "All Week"}
                  onClick={() => setSelectedDay("All Week")}
                  className={`shrink-0 rounded-2xl px-3.5 py-2 text-[10px] font-black uppercase tracking-wider active:scale-95 ${
                    selectedDay === "All Week"
                      ? "bg-indigo-600 text-white shadow-md"
                      : "border border-slate-100 bg-white text-slate-500"
                  }`}
                >
                  All Week
                </button>
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected =
                    selectedDay.toLowerCase() === day.toLowerCase();
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={isSelected}
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
                  dayTimetable.map((slot, index) => (
                    <div key={`${slot.id}-${index}`} className="space-y-2.5">
                      {selectedDay === "All Week" &&
                        (index === 0 || slot.day?.toLowerCase() !== dayTimetable[index - 1]?.day?.toLowerCase()) && (
                          <div className="flex items-center gap-2 px-1 pt-2" role="heading" aria-level={3}>
                            <CalendarDays className="h-4 w-4 text-indigo-600" />
                            <span className="text-sm font-black text-slate-800">{slot.day}</span>
                          </div>
                        )}
                      <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="min-w-0 flex-1 space-y-1">
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
                    </div>
                  ))
                ) : (
                  <EmptyText
                    text={selectedDay === "All Week" ? "No lectures scheduled for this week." : `No lectures scheduled for ${selectedDay}.`}
                  />
                )}
              </div>
            </div>
          )}

          {/* EXAMS / TESTS */}
          {activeTab === "exams" && (
            <div className="space-y-3.5 animate-fadeIn">
              <StudentSectionHeader
                title="Tests / Exams"
                description="Online and offline tests"
                icon={<FileCheck2 className="h-5 w-5" />}
                onBack={() => openStudentSection("home")}
              />

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
                        ? "No tests are currently scheduled."
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
              <StudentSectionHeader
                title="Fees"
                description="Payments, dues and receipts"
                icon={<IndianRupee className="h-5 w-5" />}
                onBack={() => openStudentSection("home")}
              />
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
              <StudentSectionHeader
                title="Results"
                description="Marks, grades and result status"
                icon={<Trophy className="h-5 w-5" />}
                onBack={() => openStudentSection("home")}
              />
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
                description="Monthly attendance overview"
                icon={<ClipboardCheck className="h-5 w-5" />}
                onBack={() => openStudentSection("home")}
              />

              <section className="rounded-[22px] border border-slate-200 bg-white p-4 text-slate-900 shadow-sm">
                <label htmlFor="attendance-month" className="mb-2 block text-xs font-black text-slate-600">
                  Select month and year
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() => setAttendanceMonth((month) => moveMonth(month, -1))}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <input
                    id="attendance-month"
                    type="month"
                    value={attendanceMonth}
                    max={indiaMonth()}
                    onChange={(event) => {
                      const next = event.target.value;
                      if (/^\d{4}-(0[1-9]|1[0-2])$/.test(next) && next <= indiaMonth()) {
                        setAttendanceMonth(next);
                      }
                    }}
                    className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    aria-label="Next month"
                    disabled={attendanceMonth >= indiaMonth()}
                    onClick={() => setAttendanceMonth((month) => moveMonth(month, 1))}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-2 text-xs font-medium text-slate-500">
                  Showing {readableMonth(attendanceMonth)} for {student?.name || "selected student"}
                </p>
              </section>

              {attendanceError ? (
                <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
                  {attendanceError}
                  <button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="ml-2 underline">
                    Retry
                  </button>
                </div>
              ) : null}

              {attendanceLoading ? (
                <section aria-busy="true" className="animate-pulse space-y-3 rounded-[24px] border border-slate-200 bg-white p-5">
                  <div className="h-4 w-1/3 rounded bg-slate-200" />
                  <div className="h-12 w-1/4 rounded bg-slate-200" />
                  <div className="h-24 rounded-xl bg-slate-100" />
                </section>
              ) : null}

              {!attendanceLoading && !attendanceError && visibleAttendance && (
                <>
                  <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                    <div className="bg-[linear-gradient(105deg,#020817_0%,#07112a_58%,#21184d_100%)] p-5 text-white">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-200">
                        {readableMonth(attendanceMonth)} attendance
                      </p>
                      <div className="mt-3 flex items-end justify-between gap-4">
                        <div>
                          <p className="text-3xl font-black tracking-tight">
                            {visibleAttendance.monthlyPercentage == null
                              ? "Not verified"
                              : `${visibleAttendance.monthlyPercentage}%`}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-300">
                            Monthly attendance • {visibleAttendance.totalClasses} {visibleAttendance.totalClasses === 1 ? "day" : "days"} marked
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <ClipboardCheck className="h-7 w-7 text-cyan-200" />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100">
                      <AttendanceStat label="Total" value={visibleAttendance.totalClasses} className="text-slate-900" />
                      <AttendanceStat label="Present" value={visibleAttendance.present} className="text-emerald-600" />
                      <AttendanceStat label="Absent" value={visibleAttendance.absent} className="text-red-500" />
                      <AttendanceStat label="Late" value={visibleAttendance.late} className="text-amber-500" />
                    </div>
                    <div className="p-5">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-600">Recorded attendance rate</span>
                        <span className="font-black text-cyan-700">
                          {attendanceHasRecords && visibleAttendance.recordedRate !== null
                            ? `${visibleAttendance.recordedRate}%`
                            : "Not available"}
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#06b6d4,#2563eb)] transition-all"
                          style={{ width: `${attendanceHasRecords && visibleAttendance.recordedRate !== null ? Math.max(0, Math.min(100, visibleAttendance.recordedRate)) : 0}%` }}
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xl font-black text-slate-900">{visibleAttendance.batchRegisterDays}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-600">Dates with a batch attendance register</p>
                        </div>
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <p className="text-xl font-black text-amber-900">{visibleAttendance.unmarkedBatchRegisterDays}</p>
                          <p className="mt-1 text-xs font-semibold text-amber-800">Dates without this child’s entry</p>
                        </div>
                      </div>
                      {!attendanceHasRecords && (
                        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-600">
                          No attendance recorded for {readableMonth(attendanceMonth)}.
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="rounded-[24px] border border-slate-200 bg-white p-4 text-slate-900 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-base font-black text-slate-950">Attendance Calendar</h3>
                        <p className="mt-1 text-xs font-medium text-slate-500">{readableMonth(attendanceMonth)}</p>
                      </div>
                      <CalendarDays className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-black text-slate-500">
                      {(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const).map((day) => (
                        <div key={day} className="py-2">{day}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1.5">
                      {Array.from({ length: attendanceCalendar.firstWeekday }, (_, index) => (
                        <div key={`blank-${index}`} aria-hidden="true" />
                      ))}
                      {Array.from({ length: attendanceCalendar.daysInMonth }, (_, index) => {
                        const day = index + 1;
                        const rows = attendanceCalendar.rowsByDay.get(day) || [];
                        const dateKey = `${attendanceMonth}-${String(day).padStart(2, "0")}`;
                        const missingInRegister = monthlyAttendance?.summary.unmarkedBatchRegisterDates.includes(dateKey) ?? false;
                        const status = rows.length === 1 ? rows[0].status : rows.length > 1 ? "mixed" : missingInRegister ? "missing" : "unmarked";
                        const colors = {
                          present: "border-emerald-200 bg-emerald-50 text-emerald-800",
                          absent: "border-red-200 bg-red-50 text-red-800",
                          late: "border-amber-200 bg-amber-50 text-amber-800",
                          mixed: "border-indigo-200 bg-indigo-50 text-indigo-800",
                          missing: "border-amber-300 bg-amber-50 text-amber-800",
                          unmarked: "border-slate-100 bg-slate-50 text-slate-400",
                        } as const;
                        const recordLabel = rows.length === 0
                          ? missingInRegister ? "No child record; another batch attendance entry exists" : "No attendance recorded"
                          : rows.map((row) => `${row.status}${row.remarks ? `: ${row.remarks}` : ""}`).join("; ");
                        return (
                          <div
                            key={`${attendanceMonth}-${day}`}
                            title={`${day} ${readableMonth(attendanceMonth)} — ${recordLabel}`}
                            aria-label={`${day} ${readableMonth(attendanceMonth)}: ${recordLabel}`}
                            className={`flex min-h-12 flex-col items-center justify-center rounded-xl border p-1 text-center ${colors[status]}`}
                          >
                            <span className="text-sm font-black">{day}</span>
                            <span className="mt-0.5 text-[9px] font-black uppercase">
                              {status === "present" ? "P" : status === "absent" ? "A" : status === "late" ? "L" : status === "mixed" ? "Mix" : status === "missing" ? "!" : "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-slate-600">
                      <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />Present</span>
                      <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-red-500" />Absent</span>
                      <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />Late</span>
                      <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />No child entry</span>
                      <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-slate-300" />Not marked</span>
                    </div>
                  </section>

                </>
              )}
            </div>
          )}

          {/* MY LEAVE */}
          {activeTab === "leave" && (
            <div className="space-y-4 animate-fadeIn">
              <StudentSectionHeader
                title="My Leave"
                description="Apply leave and track approval status"
                icon={<CalendarDays className="h-5 w-5" />}
                onBack={() => openStudentSection("home")}
              />

              <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ecfeff_100%)] p-4">
                  <p className="text-sm font-black text-slate-950">Apply Leave</p>
                  <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                    Fill in the dates and reason, then submit the request
                  </p>
                </div>

                <div className="space-y-4 p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                        From Date
                      </Label>
                      <input
                        type="date"
                        value={leaveForm.fromDate}
                        onChange={(event) =>
                          setLeaveForm((current) => ({
                            ...current,
                            fromDate: event.target.value,
                          }))
                        }
                        className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                        To Date
                      </Label>
                      <input
                        type="date"
                        value={leaveForm.toDate}
                        min={leaveForm.fromDate || undefined}
                        onChange={(event) =>
                          setLeaveForm((current) => ({
                            ...current,
                            toDate: event.target.value,
                          }))
                        }
                        className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                      Reason
                    </Label>
                    <textarea
                      rows={4}
                      value={leaveForm.reason}
                      onChange={(event) =>
                        setLeaveForm((current) => ({
                          ...current,
                          reason: event.target.value,
                        }))
                      }
                      placeholder="Example: Fever / Family function / Out of station..."
                      className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {leaveMessage && (
                    <div
                      className={`rounded-xl border px-3 py-2.5 text-[11px] font-bold ${
                        leaveMessage.toLowerCase().includes("success")
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {leaveMessage}
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={submitLeaveRequest}
                    disabled={leaveSubmitting}
                    className="h-11 w-full rounded-xl bg-[#0b2f68] text-xs font-black text-white hover:bg-[#092758] disabled:opacity-60"
                  >
                    {leaveSubmitting ? "Submitting..." : "Submit Leave Request"}
                  </Button>
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-white">Leave History</h3>
                    <p className="mt-0.5 text-[10px] font-semibold text-slate-300">
                      Pending, approved and rejected requests
                    </p>
                  </div>
                  {leaveLoading && (
                    <span className="text-[10px] font-bold text-cyan-200">Loading...</span>
                  )}
                </div>

                {leaveRequests.length > 0 ? (
                  <div className="space-y-3">
                    {leaveRequests.map((leave) => {
                      const tone =
                        leave.status === "approved"
                          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                          : leave.status === "rejected"
                            ? "border-red-100 bg-red-50 text-red-600"
                            : "border-amber-100 bg-amber-50 text-amber-700";

                      return (
                        <div
                          key={leave.id}
                          className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-black text-slate-950">
                                {formatDate(leave.fromDate)}
                                {leave.toDate && leave.toDate !== leave.fromDate
                                  ? ` — ${formatDate(leave.toDate)}`
                                  : ""}
                              </p>
                              <p className="mt-1 text-[10px] font-semibold leading-4 text-slate-500">
                                {leave.reason}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase ${tone}`}
                            >
                              {leave.status}
                            </span>
                          </div>

                          {leave.adminRemark && (
                            <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2">
                              <p className="text-[9px] font-black uppercase tracking-[0.08em] text-slate-400">
                                Admin Remark
                              </p>
                              <p className="mt-1 text-[10px] font-semibold text-slate-600">
                                {leave.adminRemark}
                              </p>
                            </div>
                          )}

                          {leave.createdAt && (
                            <p className="mt-3 text-[9px] font-semibold text-slate-400">
                              Applied on {formatDate(leave.createdAt)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[20px] border border-dashed border-white/15 bg-white/5 px-5 py-8 text-center">
                    <CalendarDays className="mx-auto h-8 w-8 text-blue-300" />
                    <p className="mt-3 text-xs font-black text-white">No leave request yet</p>
                    <p className="mt-1 text-[10px] font-semibold text-slate-400">
                      Submit a new leave request using the form above.
                    </p>
                  </div>
                )}
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
                <EmptyText text="Teacher information is not available in the timetable." />
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
                    <EmptyText text="Subjects are not available in the timetable." />
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
                      {student?.name || ""}
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
          <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 p-0">
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
                        onClick={() => {
                          openEditModal();
                          setIsProfileFormEditing(true);
                        }}
                        aria-label="Edit profile photo"
                        className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-[#061b3b] bg-blue-500 text-white shadow-lg transition active:scale-90"
                      >
                        <Camera className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <h3 className="relative z-10 mt-4 text-[24px] font-black tracking-tight">
                    {student?.name || ""}
                  </h3>
                </div>

                {supportMode && (
                  <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-3 text-xs font-semibold leading-5 text-cyan-100">
                    <div className="flex items-center gap-2 font-black">
                      <Eye className="h-4 w-4" />
                      {parentView ? "Parent Child View · Read only" : "Read-only Support Mode"}
                    </div>
                    <p className="mt-1 text-[11px] text-cyan-200/80">
                      Profile editing and password changes are disabled.
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
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsProfileFormEditing(true);
                      setEditMessage(null);
                    }}
                    disabled={isSaving || isProfileFormEditing}
                    className="h-8 border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                  >
                    <PenTool className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => !isSaving && setIsEditOpen(false)}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={saveProfileChanges}
                    disabled={isSaving || !isProfileFormEditing}
                    className="h-8 bg-slate-950 px-4 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-45"
                  >
                    {isSaving ? "Saving..." : "Save Form"}
                  </Button>
                </div>
              </div>

              <div className="p-4 overflow-y-auto space-y-5 flex-1">
                {!isProfileFormEditing && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-700">
                    Profile view mode. Click the <span className="font-black">Edit</span> button above to make changes.
                  </div>
                )}
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

                <fieldset disabled={!isProfileFormEditing || isSaving} className="space-y-5 disabled:opacity-[0.98]">
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

                </fieldset>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM NAV */}
        {!isMenuOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-[90] border-t border-white/10 bg-[#03142f]/95 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.18)] backdrop-blur-md">
          <div className="mx-auto flex h-[72px] max-w-lg items-center justify-around px-3">
            <NavBtn
              active={false}
              onClick={onBackToParent}
              icon={<Home className="h-5 w-5" strokeWidth={2.2} />}
              label="Home"
            />
            <NavBtn
              active={isEditOpen}
              onClick={() => {
                setIsNotificationsOpen(false);
                openEditModal();
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
