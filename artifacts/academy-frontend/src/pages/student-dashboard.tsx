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
  Phone,
  Mail,
  User,
  Building,
  Award,
  PenTool,
  Monitor,
  MapPin,
  Clock,
  Play,
  Trophy,
  XCircle,
  Timer,
  Pencil,
  Save,
  Camera,
  Loader2,
  Eye,
  EyeOff,
  IdCard,
  KeyRound,
  Upload,
  CheckSquare,
  Square,
  FileCheck2,
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
      return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
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

const CLASS_OPTIONS = ["LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const BOARD_OPTIONS = ["CBSE", "ICSE", "State Board"];
const INDIA_STATES = ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"];

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
  const [exams, setExams] = useState<Exam[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [, forceTick] = useState(0);

  // Tabs navigation
  const [activeTab, setActiveTab] = useState<"home" | "homework" | "exams" | "fees" | "results">("home");
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [homeworkSearch, setHomeworkSearch] = useState("");
  const [examFilter, setExamFilter] = useState<"all" | "upcoming" | "live" | "completed">("all");

  // Edit form state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [fieldErrors, setFieldErrors] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [sameAddress, setSameAddress] = useState(false);
  const [editMessage, setEditMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

    const load = async () => {
      setLoading(true);
      setMessage("");

      try {
        const meRes = await fetch("/api/auth/me", { credentials: "include", headers });
        const me = await meRes.json().catch(() => null);

        if (!meRes.ok || me?.role !== "student") {
          logout();
          return;
        }

        setStudent(me);
        const currentMonth = new Date().toISOString().slice(0, 7);

        const [feeRes, homeworkRes, reportRes, attendanceRes, examRes] =
          await Promise.allSettled([
            fetch("/api/finance/my-payments", { credentials: "include", headers }),
            fetch(`/api/homework?batchId=${me.batchId || ""}`, { credentials: "include", headers }),
            fetch(`/api/report-card?studentId=${me.id}&month=${currentMonth}`, { credentials: "include", headers }),
            fetch(`/api/attendance/student/summary?studentId=${me.id}&month=${currentMonth}`, { credentials: "include", headers }),
            fetch(`/api/exams/my-exams?studentId=${me.id}`, { credentials: "include", headers }),
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
        if (examRes.status === "fulfilled") {
          const data = await examRes.value.json().catch(() => []);
          if (examRes.value.ok) setExams(Array.isArray(data) ? data : []);
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

  const filteredHomeworks = useMemo(() => {
    if (!homeworkSearch) return homework;
    return homework.filter(
      (h) =>
        h.title.toLowerCase().includes(homeworkSearch.toLowerCase()) ||
        h.subjectName?.toLowerCase().includes(homeworkSearch.toLowerCase())
    );
  }, [homework, homeworkSearch]);

  const filteredExams = useMemo(() => {
    if (examFilter === "all") return exams;
    return exams.filter((e) => e.status === examFilter);
  }, [exams, examFilter]);

  const examSummary = useMemo(() => {
    return {
      upcoming: exams.filter((e) => e.status === "upcoming").length,
      live: exams.filter((e) => e.status === "live").length,
      completed: exams.filter((e) => e.status === "completed").length,
    };
  }, [exams]);

  const latestPayments = payments.slice(0, 8);
  const latestResults = report?.examResults ?? [];

  // Edit logic (Pre-fill full form)
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
      if (!payload.loginPassword) {
        delete payload.loginPassword;
      }

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
        throw new Error(`Server Error (${res.status}): ${responseText.substring(0, 100)}`);
      }

      if (!res.ok) {
        if (res.status === 400 && data.error && data.error.includes("Password")) {
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
          <div className="relative flex flex-col items-center">
            <div className="rounded-3xl bg-white/10 p-5 mb-4 animate-bounce">
              <GraduationCap className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-wider">STUDENT PORTAL</h1>
            <p className="text-xs text-blue-200 mt-1 animate-pulse">Loading secure session...</p>
            <div className="mt-12 flex space-x-2">
              <div className="h-2 w-2 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="h-2 w-2 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="h-2 w-2 bg-white rounded-full animate-bounce"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppStyles />
      <div className="min-h-screen bg-slate-50 pb-24 md:pb-8 select-none antialiased">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-100/80 px-4 py-3.5 backdrop-blur-md bg-white/90">
          <div className="mx-auto flex max-w-lg items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                onClick={() => setIsProfileOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-blue-500/20 active:scale-95 transition-transform cursor-pointer"
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
                <h1 className="text-sm font-bold text-slate-800 leading-none truncate max-w-[150px] sm:max-w-[200px]">
                  {student?.name}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setIsProfileOpen(true)} className="rounded-xl bg-slate-100 p-2 text-slate-600 active:scale-90 transition-all">
                <User className="h-4 w-4" />
              </button>
              <button onClick={logout} className="rounded-xl bg-red-50 p-2 text-red-500 active:scale-90 transition-all">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-lg px-4 py-4 space-y-4">
          {message && (
            <div className="rounded-2xl bg-red-50 p-3.5 text-xs text-red-600 flex items-center gap-2.5 border border-red-100 animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span className="font-semibold">{message}</span>
            </div>
          )}

          {/* HOME TAB */}
          {activeTab === "home" && (
            <div className="space-y-4 animate-fadeIn">
              <div onClick={() => setIsProfileOpen(true)} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-5 text-white shadow-xl shadow-blue-500/10 active:scale-[0.99] transition-all cursor-pointer">
                <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
                  <GraduationCap className="h-40 w-40" />
                </div>
                <div className="space-y-3 relative">
                  <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-[9px] font-bold tracking-wide uppercase">
                    Class Details
                  </span>
                  <div>
                    <h3 className="text-lg font-black whitespace-normal break-words leading-tight">
                      {formatClassAndSection(student?.className, student?.section)}
                    </h3>
                    <p className="text-xs text-blue-100/90 font-medium break-words mt-1 whitespace-normal">
                      {student?.courseName || "No Course"} • {student?.batchName || "No Batch"}
                    </p>
                  </div>
                  <div className="flex justify-between items-center pt-2.5 border-t border-white/10 text-[10px] text-blue-100 font-bold">
                    <span>Enrollment: {student?.enrollmentNo || "-"}</span>
                    <span className="flex items-center gap-1">Full Profile <ChevronRight className="h-3 w-3" /></span>
                  </div>
                </div>
              </div>

              {/* Live Exam alert */}
              {examSummary.live > 0 && (
                <div onClick={() => setActiveTab("exams")} className="rounded-3xl bg-gradient-to-r from-red-500 to-rose-600 p-4 text-white shadow-lg shadow-red-500/20 cursor-pointer active:scale-[0.99] transition-all animate-livePulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-white/20 p-2">
                        <Play className="h-5 w-5 fill-white" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/90">Live Now</p>
                        <p className="text-sm font-black">{examSummary.live} Exam{examSummary.live > 1 ? "s" : ""} Ongoing</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </div>
              )}

              {/* Attendance + Actions */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Card className="rounded-3xl border-none bg-white p-4 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance</p>
                    <p className="text-xl font-black text-slate-800">{attendance?.percentage ?? 0}%</p>
                    <p className="text-[10px] text-green-600 font-semibold">{attendance?.present || 0} Days Present</p>
                  </div>
                  <div className="relative h-16 w-16 shrink-0">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                      <path className="text-slate-100" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="text-blue-600 transition-all duration-700" strokeLinecap="round" strokeDasharray={`${attendance?.percentage ?? 0}, 100`} strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ClipboardCheck className="h-5 w-5 text-blue-500" />
                    </div>
                  </div>
                </Card>

                <div className="grid grid-cols-2 gap-3">
                  <div onClick={() => setActiveTab("homework")} className="rounded-2xl border-none bg-amber-50 p-3.5 flex flex-col justify-between active:scale-95 transition-transform cursor-pointer">
                    <div className="rounded-xl bg-amber-100 text-amber-700 p-2 w-fit"><BookOpen className="h-4 w-4" /></div>
                    <div className="mt-4">
                      <p className="text-xs font-extrabold text-amber-900">Homework</p>
                      <p className="text-[10px] text-amber-700/80 mt-0.5">{homework.length} pending</p>
                    </div>
                  </div>
                  <div onClick={() => setActiveTab("exams")} className="rounded-2xl border-none bg-violet-50 p-3.5 flex flex-col justify-between active:scale-95 transition-transform cursor-pointer">
                    <div className="rounded-xl bg-violet-100 text-violet-700 p-2 w-fit"><PenTool className="h-4 w-4" /></div>
                    <div className="mt-4">
                      <p className="text-xs font-extrabold text-violet-900">Exams</p>
                      <p className="text-[10px] text-violet-700/80 mt-0.5">{examSummary.upcoming} upcoming</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2.5">
                <StatItem label="Paid Amount" val={inr(feeSummary.paid)} icon={<CheckCircle2 className="h-4 w-4 text-green-600" />} bg="bg-green-50" />
                <StatItem label="Next Due" val={feeSummary.nextDue ? formatDate(feeSummary.nextDue.dueDate) : "-"} icon={<CalendarDays className="h-4 w-4 text-purple-600" />} bg="bg-purple-50" />
                <StatItem label="Grade Avg" val={latestResults[0]?.grade || "N/A"} icon={<Award className="h-4 w-4 text-indigo-600" />} bg="bg-indigo-50" />
              </div>

              {/* Quick Tasks */}
              <Card className="rounded-3xl border-none bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <SectionHeader icon={<BookOpen className="h-4 w-4" />} title="Pending Tasks" />
                  <span onClick={() => setActiveTab("homework")} className="text-[10px] font-bold text-blue-600 active:scale-95 transition-all cursor-pointer">See All</span>
                </div>
                <div className="space-y-2.5">
                  {homework.slice(0, 2).map((hw) => (
                    <div key={hw.id} onClick={() => setSelectedHomework(hw)} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 hover:bg-slate-100/70 transition-all cursor-pointer active:scale-[0.98]">
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="text-[9px] font-bold text-blue-700 uppercase tracking-wider">{hw.subjectName}</span>
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
                <input type="text" placeholder="Search Subject or Homework..." value={homeworkSearch} onChange={(e) => setHomeworkSearch(e.target.value)} className="w-full rounded-2xl border-none bg-white py-3 pl-10 pr-4 text-xs font-semibold text-slate-800 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div className="space-y-2.5">
                {filteredHomeworks.length ? filteredHomeworks.map((h) => (
                  <div key={h.id} onClick={() => setSelectedHomework(h)} className="relative overflow-hidden rounded-2xl border-none bg-white p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer">
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700">{h.subjectName || "Subject"}</span>
                      <div className="text-right">
                        <p className="text-[9px] text-slate-400 font-semibold uppercase">Last Date</p>
                        <p className="text-xs font-extrabold text-slate-700">{formatDate(h.dueDate)}</p>
                      </div>
                    </div>
                    <h4 className="mt-2 text-xs font-black text-slate-800 leading-snug">{h.title}</h4>
                    <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed bg-slate-50/70 p-2 rounded-xl">{h.description}</p>
                  </div>
                )) : <EmptyText text="No matching homework records found." />}
              </div>
            </div>
          )}

          {/* EXAMS TAB */}
          {activeTab === "exams" && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-blue-50 p-3 border border-blue-100">
                  <p className="text-[9px] font-bold text-blue-800 uppercase">Upcoming</p>
                  <p className="text-xl font-black text-blue-900 mt-0.5">{examSummary.upcoming}</p>
                </div>
                <div className="rounded-2xl bg-red-50 p-3 border border-red-100">
                  <p className="text-[9px] font-bold text-red-800 uppercase">Live Now</p>
                  <p className="text-xl font-black text-red-900 mt-0.5">{examSummary.live}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-3 border border-emerald-100">
                  <p className="text-[9px] font-bold text-emerald-800 uppercase">Completed</p>
                  <p className="text-xl font-black text-emerald-900 mt-0.5">{examSummary.completed}</p>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {(["all", "upcoming", "live", "completed"] as const).map((f) => (
                  <button key={f} onClick={() => setExamFilter(f)} className={`shrink-0 rounded-full px-4 py-2 text-[10px] font-extrabold uppercase tracking-wide transition-all active:scale-95 ${examFilter === f ? "bg-blue-600 text-white shadow-md" : "bg-white text-slate-500 border border-slate-100"}`}>
                    {f === "all" ? "All Exams" : f}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {filteredExams.length ? filteredExams.map((exam) => (
                  <ExamCard key={exam.id} exam={exam} onClick={() => setSelectedExam(exam)} />
                )) : <EmptyText text={examFilter === "all" ? "Koi exam schedule nahi hai abhi." : `No ${examFilter} exams found.`} />}
              </div>
            </div>
          )}

          {/* FEES TAB */}
          {activeTab === "fees" && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-3xl">
                  <span className="text-[9px] font-bold text-emerald-800 block uppercase tracking-wider">Paid amount</span>
                  <span className="text-xl font-black text-emerald-900 block mt-0.5">{inr(feeSummary.paid)}</span>
                </div>
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-3xl">
                  <span className="text-[9px] font-bold text-rose-800 block uppercase tracking-wider">Remaining Due</span>
                  <span className="text-xl font-black text-rose-900 block mt-0.5">{inr(feeSummary.pending)}</span>
                </div>
              </div>
              <div className="space-y-2.5">
                {latestPayments.length ? latestPayments.map((p) => (
                  <div key={p.id} onClick={() => setSelectedPayment(p)} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer">
                    <div className="min-w-0 pr-2">
                      <p className="font-extrabold text-xs text-slate-800 truncate">{p.monthLabel}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Due Date: {formatDate(p.dueDate)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-xs text-slate-800">{inr(p.totalAmount)}</p>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                )) : <EmptyText text="No fee payment records." />}
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
                          <span className="text-[9px] text-slate-400 block font-bold">Total Marks</span>
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
              ) : <EmptyText text="Exam or test results have not been posted yet." />}
            </div>
          )}
        </main>

        {/* HOMEWORK DRAWER */}
        {selectedHomework && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0">
            <div className="absolute inset-0" onClick={() => setSelectedHomework(null)} />
            <div className="relative w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl animate-slideUp">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
              <div className="flex justify-between items-start">
                <span className="inline-block rounded-xl bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{selectedHomework.subjectName}</span>
                <button onClick={() => setSelectedHomework(null)} className="rounded-full bg-slate-100 p-1 text-slate-500 active:scale-90"><X className="h-5 w-5" /></button>
              </div>
              <div className="mt-4 space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-800">{selectedHomework.title}</h3>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                    <CalendarDays className="h-4 w-4" />
                    <span className="font-bold text-slate-500">Submit before: {formatDate(selectedHomework.dueDate)}</span>
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description / Instructions</p>
                  <p className="text-xs text-slate-600 leading-relaxed break-words whitespace-normal font-semibold">{selectedHomework.description}</p>
                </div>
                <Button onClick={() => setSelectedHomework(null)} className="w-full rounded-2xl bg-blue-600 py-3 text-xs font-black hover:bg-blue-700">Got it, Close</Button>
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
                <button onClick={() => setSelectedExam(null)} className="rounded-full bg-slate-100 p-1 text-slate-500 active:scale-90 shrink-0"><X className="h-5 w-5" /></button>
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
                  {selectedExam.passingMarks && <DetailRow label="Passing Marks" val={String(selectedExam.passingMarks)} />}
                  {selectedExam.venue && selectedExam.examType === "offline" && <DetailRow label="Venue" val={selectedExam.venue} />}
                  {selectedExam.status === "completed" && selectedExam.marksObtained != null && (
                    <>
                      <DetailRow label="Marks Obtained" val={String(selectedExam.marksObtained)} highlight />
                      {selectedExam.grade && <DetailRow label="Grade" val={selectedExam.grade} />}
                      {selectedExam.resultStatus && <DetailRow label="Result" val={<span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${selectedExam.resultStatus === "Pass" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{selectedExam.resultStatus}</span>} />}
                    </>
                  )}
                </div>
                {selectedExam.syllabus && (
                  <div className="rounded-2xl bg-amber-50 p-3 border border-amber-100">
                    <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider mb-1">Syllabus</p>
                    <p className="text-xs text-amber-900 font-semibold leading-relaxed whitespace-normal break-words">{selectedExam.syllabus}</p>
                  </div>
                )}
                {selectedExam.instructions && (
                  <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Instructions</p>
                    <p className="text-xs text-slate-600 font-semibold leading-relaxed whitespace-normal break-words">{selectedExam.instructions}</p>
                  </div>
                )}
                {selectedExam.examType === "online" && selectedExam.status === "live" && selectedExam.examUrl ? (
                  <Button onClick={() => window.open(selectedExam.examUrl, "_blank")} className="w-full rounded-2xl bg-red-600 py-3 text-xs font-black hover:bg-red-700 animate-livePulse">
                    <Play className="h-4 w-4 mr-2 fill-white" /> Attend Exam Now
                  </Button>
                ) : selectedExam.examType === "online" && selectedExam.status === "upcoming" ? (
                  <Button disabled className="w-full rounded-2xl bg-slate-200 text-slate-500 py-3 text-xs font-black cursor-not-allowed">
                    <Timer className="h-4 w-4 mr-2" /> Not Started Yet
                  </Button>
                ) : (
                  <Button onClick={() => setSelectedExam(null)} className="w-full rounded-2xl bg-blue-600 py-3 text-xs font-black hover:bg-blue-700">Close</Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* FEES DRAWER */}
        {selectedPayment && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0">
            <div className="absolute inset-0" onClick={() => setSelectedPayment(null)} />
            <div className="relative w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl animate-slideUp">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Transaction details</h3>
                  <h2 className="text-base font-black text-slate-800 mt-0.5">{selectedPayment.monthLabel}</h2>
                </div>
                <button onClick={() => setSelectedPayment(null)} className="rounded-full bg-slate-100 p-1 text-slate-500 active:scale-90"><X className="h-5 w-5" /></button>
              </div>
              <div className="mt-4 space-y-4">
                <div className="divide-y divide-slate-100">
                  <DetailRow label="Monthly Fees" val={inr(selectedPayment.amount)} />
                  <DetailRow label="Late Fees / Surcharge" val={inr(selectedPayment.lateFee)} />
                  <DetailRow label="Total Amount" val={inr(selectedPayment.totalAmount)} highlight />
                  <DetailRow label="Paid Till Date" val={inr(selectedPayment.paidAmount)} />
                  <DetailRow label="Last Payment Due Date" val={formatDate(selectedPayment.dueDate)} />
                  <DetailRow label="Receipt Status" val={<StatusBadge status={selectedPayment.status} />} />
                </div>
                <Button onClick={() => setSelectedPayment(null)} className="w-full rounded-2xl bg-blue-600 py-3 text-xs font-black hover:bg-blue-700">Close Receipt</Button>
              </div>
            </div>
          </div>
        )}

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

        {/* FULL STUDENT FORM REPLICA DRAWER (WITH DOCUMENTS & CAMERA) */}
        {isEditOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0">
            <div className="absolute inset-0" onClick={() => !isSaving && setIsEditOpen(false)} />
            <div className="relative w-full max-w-lg rounded-t-3xl bg-[#f6f7f9] p-0 shadow-2xl h-[95vh] overflow-hidden animate-slideUp flex flex-col">
              
              {/* Sticky Top Header inside Drawer */}
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

              {/* Scrollable Form Body */}
              <div className="p-4 md:p-5 overflow-y-auto space-y-5 flex-1">
                
                {editMessage && (
                  <div className={`rounded-xl p-3 text-xs font-bold ${editMessage.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                    {editMessage.text}
                  </div>
                )}

                {/* 1. STUDENT INFO */}
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

                      {/* Photo Box with Camera Option */}
                      <div className="rounded-xl border-2 border-dashed bg-slate-50 p-3 shrink-0 w-full md:w-[160px] flex flex-col items-center justify-center">
                        <Label className="block text-center text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Student Photo</Label>
                        <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-white shadow-sm ring-1 ring-slate-200">
                          {editForm.photoDataUrl ? (
                            <img src={editForm.photoDataUrl} alt="Student" className="h-full w-full object-cover" />
                          ) : (
                            <UserRound className="h-full w-full p-5 text-slate-300 bg-slate-100" />
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

                {/* 2. PARENT'S INFO */}
                <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white">
                  <CardContent className="p-5 space-y-5">
                    <SectionTitle number={2} icon={<User className="h-4 w-4" />}>Parent's Information</SectionTitle>
                    
                    <div className="rounded-xl border border-slate-100 p-4 bg-slate-50/50">
                      <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-600 tracking-wider"><span className="h-2 w-2 rounded-full bg-blue-500" /> FATHER'S DETAILS</h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        <EditField label="Father's Name" value={editForm.fatherName} onChange={(v) => setFormValue("fatherName", v)} disabled={isSaving} />
                        <EditField label="Occupation" value={editForm.fatherOccupation} onChange={(v) => setFormValue("fatherOccupation", v)} disabled={isSaving} />
                        <EditField label="Contact Number" value={editForm.fatherPhone} onChange={(v) => setFormValue("fatherPhone", v)} type="tel" disabled={isSaving} />
                        <EditField label="WhatsApp Number" value={editForm.fatherWhatsapp} onChange={(v) => setFormValue("fatherWhatsapp", v)} type="tel" disabled={isSaving} />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 p-4 bg-slate-50/50">
                      <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-600 tracking-wider"><span className="h-2 w-2 rounded-full bg-pink-500" /> MOTHER'S DETAILS</h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        <EditField label="Mother's Name" value={editForm.motherName} onChange={(v) => setFormValue("motherName", v)} disabled={isSaving} />
                        <EditField label="Occupation" value={editForm.motherOccupation} onChange={(v) => setFormValue("motherOccupation", v)} disabled={isSaving} />
                        <EditField label="Contact Number" value={editForm.motherPhone} onChange={(v) => setFormValue("motherPhone", v)} type="tel" disabled={isSaving} />
                        <EditField label="WhatsApp Number" value={editForm.motherWhatsapp} onChange={(v) => setFormValue("motherWhatsapp", v)} type="tel" disabled={isSaving} />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 pt-2">
                      <EditField label="Emergency Contact No." value={editForm.emergencyPhone} onChange={(v) => setFormValue("emergencyPhone", v)} type="tel" disabled={isSaving} />
                      <EditField label="Student/Parent Email ID" value={editForm.email} onChange={(v) => setFormValue("email", v)} type="email" disabled={isSaving} />
                    </div>
                  </CardContent>
                </Card>

                {/* 3. ADDRESS DETAILS */}
                <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white">
                  <CardContent className="p-5 space-y-5">
                    <SectionTitle number={3} icon={<MapPin className="h-4 w-4" />}>Address Details</SectionTitle>
                    
                    <div className="rounded-xl border border-slate-100 p-4 bg-slate-50/50">
                      <h3 className="mb-3 text-xs font-bold text-slate-600 tracking-wider">CORRESPONDENCE ADDRESS</h3>
                      <div className="space-y-3">
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
                    </div>

                    <div className="rounded-xl border border-slate-100 p-4 bg-slate-50/50">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-slate-600 tracking-wider">PERMANENT ADDRESS</h3>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={sameAddress} onChange={handleSameAddressToggle} disabled={isSaving} className="w-3.5 h-3.5 accent-blue-600" />
                          <span className="text-[10px] font-bold text-blue-600">Same as Correspondence</span>
                        </label>
                      </div>
                      <div className="space-y-3">
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
                    </div>
                  </CardContent>
                </Card>

                {/* 4. DOCUMENTS UPLOAD */}
                <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white">
                  <CardContent className="p-5 space-y-4">
                    <SectionTitle number={4} icon={<FileCheck2 className="h-4 w-4" />}>
                      Documents
                    </SectionTitle>
                    <p className="text-xs text-slate-500 -mt-2">
                      Upload Aadhaar Card and Previous Class Marksheet (Image/PDF, Max 5MB)
                    </p>

                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Aadhaar Card */}
                      <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase">
                          Aadhaar Card
                        </Label>

                        {editForm.aadhaarCard ? (
                          <div className="space-y-2">
                            <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
                              ✅ Aadhaar uploaded
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="h-8 text-[10px] font-bold"
                                onClick={() => {
                                  // optional: open preview if image
                                  if (String(editForm.aadhaarCard).startsWith("data:image")) {
                                    window.open(editForm.aadhaarCard, "_blank");
                                  }
                                }}
                              >
                                <Eye className="h-3 w-3 mr-1" /> View
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-8 text-[10px] font-bold text-red-600 hover:bg-red-50"
                                onClick={() => setFormValue("aadhaarCard", "")}
                                disabled={isSaving}
                              >
                                <X className="h-3 w-3 mr-1" /> Remove
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <label className="flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-700 hover:bg-slate-50 shadow-sm">
                              <Upload className="h-3.5 w-3.5" /> Upload
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="hidden"
                                disabled={isSaving}
                                onChange={(e: any) =>
                                  handleDocumentUpload("aadhaarCard", e.target.files?.[0])
                                }
                              />
                            </label>
                            <label className="flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-700 hover:bg-slate-50 shadow-sm">
                              <Camera className="h-3.5 w-3.5" /> Camera
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                disabled={isSaving}
                                onChange={(e: any) =>
                                  handleDocumentUpload("aadhaarCard", e.target.files?.[0])
                                }
                              />
                            </label>
                          </div>
                        )}
                        <p className="text-[9px] text-slate-400 font-medium text-center">
                          Image or PDF · Max 5MB
                        </p>
                      </div>

                      {/* Previous Class Marksheet */}
                      <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase">
                          Previous Class Marksheet
                        </Label>

                        {editForm.previousMarksheet ? (
                          <div className="space-y-2">
                            <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
                              ✅ Marksheet uploaded
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="h-8 text-[10px] font-bold"
                                onClick={() => {
                                  if (String(editForm.previousMarksheet).startsWith("data:image")) {
                                    window.open(editForm.previousMarksheet, "_blank");
                                  }
                                }}
                              >
                                <Eye className="h-3 w-3 mr-1" /> View
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-8 text-[10px] font-bold text-red-600 hover:bg-red-50"
                                onClick={() => setFormValue("previousMarksheet", "")}
                                disabled={isSaving}
                              >
                                <X className="h-3 w-3 mr-1" /> Remove
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <label className="flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-700 hover:bg-slate-50 shadow-sm">
                              <Upload className="h-3.5 w-3.5" /> Upload
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="hidden"
                                disabled={isSaving}
                                onChange={(e: any) =>
                                  handleDocumentUpload("previousMarksheet", e.target.files?.[0])
                                }
                              />
                            </label>
                            <label className="flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-700 hover:bg-slate-50 shadow-sm">
                              <Camera className="h-3.5 w-3.5" /> Camera
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                disabled={isSaving}
                                onChange={(e: any) =>
                                  handleDocumentUpload("previousMarksheet", e.target.files?.[0])
                                }
                              />
                            </label>
                          </div>
                        )}
                        <p className="text-[9px] text-slate-400 font-medium text-center">
                          Image or PDF · Max 5MB
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 5. STUDENT LOGIN */}
                <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white">
                  <CardContent className="p-5 space-y-5">
                    <SectionTitle number={5} icon={<KeyRound className="h-4 w-4" />}>Student Login Details</SectionTitle>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                      <p className="mb-4 text-[10px] font-medium text-slate-500">Login ID is required to login to portal. Passwords change instantly.</p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <EditField label="Login ID / Username" value={editForm.loginId} onChange={(v) => setFormValue("loginId", v.toLowerCase().replace(/\s/g, ""))} disabled={isSaving} icon={<IdCard className="h-3.5 w-3.5 text-slate-400" />} />
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Update Password</label>
                          <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                              type={showPassword ? "text" : "password"}
                              value={editForm.loginPassword || ""}
                              onChange={(e) => setFormValue("loginPassword", e.target.value)}
                              disabled={isSaving}
                              placeholder="Blank = No change (Min 6 char)"
                              className={`w-full rounded-xl border ${fieldErrors.loginPassword ? "border-red-400 focus:ring-red-500/20" : "border-slate-200 focus:ring-blue-500/20"} bg-white py-2 pl-9 pr-10 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 disabled:opacity-50`}
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 active:scale-90 p-1">
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

        {/* BOTTOM NAVIGATION BAR */}
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-100 bg-white/95 pb-safe shadow-lg backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-1">
            <NavBtn active={activeTab === "home"} onClick={() => setActiveTab("home")} icon={<Home className="h-5 w-5" strokeWidth={2.2} />} label="Home" />
            <NavBtn active={activeTab === "homework"} onClick={() => setActiveTab("homework")} icon={<div className="relative"><BookOpen className="h-5 w-5" strokeWidth={2.2} />{homework.length > 0 && (<span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />)}</div>} label="Homework" />
            <NavBtn active={activeTab === "exams"} onClick={() => setActiveTab("exams")} icon={<div className="relative"><PenTool className="h-5 w-5" strokeWidth={2.2} />{examSummary.live > 0 && (<span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />)}</div>} label="Exams" />
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
  const statusColors = { upcoming: "border-l-blue-500 bg-blue-50/30", live: "border-l-red-500 bg-red-50/30", completed: "border-l-emerald-500 bg-emerald-50/30", missed: "border-l-slate-400 bg-slate-50/50" };

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
        <div className="mt-3 rounded-xl bg-emerald-100 px-3 py-2 flex items-center justify-between">
          <span className="text-[10px] font-black text-emerald-700 uppercase">Your Score</span>
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

function StatItem({ label, val, icon, bg }: { label: string; val: string; icon: React.ReactNode; bg: string; }) {
  return (
    <div className={`p-3 rounded-2xl ${bg} flex flex-col justify-between min-h-[75px]`}>
      <div className="flex justify-between items-center"><span className="text-[9px] text-slate-500 font-bold uppercase leading-none">{label}</span>{icon}</div>
      <p className="text-xs font-black text-slate-800 leading-tight mt-2 truncate">{val}</p>
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
  return (
    <div className="rounded-3xl border-2 border-dashed border-slate-100 bg-slate-50/50 py-8 px-4 text-center"><p className="text-xs text-slate-400 font-bold">{text}</p></div>
  );
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

function SectionTitle({ number, icon, children }: { number?: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3">
      {number && <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-600">{number}</span>}
      <span className="text-slate-400">{icon}</span>
      {children}
    </h3>
  );
}

function FormRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 mb-3">{children}</div>;
}

function EditField({
  label, value, onChange, type = "text", textarea = false, disabled = false, placeholder = "", icon = null, error
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; textarea?: boolean; disabled?: boolean; placeholder?: string; icon?: React.ReactNode; error?: string;
}) {
  return (
    <div className="space-y-1 col-span-2 md:col-span-1">
      <label className="text-[10px] font-bold text-slate-500 uppercase">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 shrink-0">{icon}</div>}
        {textarea ? (
          <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} rows={2} placeholder={placeholder} className={`w-full rounded-xl border ${error ? "border-red-400 focus:ring-red-500/20" : "border-slate-200 focus:ring-blue-500/20"} bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 disabled:opacity-50`} />
        ) : (
          <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} placeholder={placeholder} className={`w-full rounded-xl border ${error ? "border-red-400 focus:ring-red-500/20" : "border-slate-200 focus:ring-blue-500/20"} bg-white py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 disabled:opacity-50 ${icon ? "pl-9 pr-3" : "px-3"}`} />
        )}
      </div>
      {error && <p className="text-[10px] font-bold text-red-500">{error}</p>}
    </div>
  );
}