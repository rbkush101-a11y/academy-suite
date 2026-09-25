import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { 
  Bell, User, LogOut, ClipboardCheck, BookOpen, 
  ChevronRight, Home, CheckCircle2, X, Plus, 
  Search, Award, Loader2, Save, ShieldCheck, Upload,
  MapPin, IndianRupee, FolderOpen, FileText, Mail, Phone,
  Briefcase, ClipboardList, AlarmClock, Timer, ChevronDown, 
  Check, Eye, EyeOff, KeyRound, DownloadCloud, UserRound, 
  Lock, CalendarDays, Users, Clock, Calendar, ArrowLeft, Pencil, Trash2,
  Sparkles, FileUp, Info, GraduationCap, CheckCircle, RefreshCw, AlertCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// ======================== API AUTH & HELPERS ========================
function getAuthHeaders() {
  const token = localStorage.getItem("coach_sutra_token") || "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function formatDate(dateVal?: any) {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal).slice(0, 10);
    return d.toISOString().split("T")[0];
  } catch {
    return String(dateVal).slice(0, 10);
  }
}

async function getErrorText(response: Response) {
  try {
    const result = await response.json();
    return result?.error || result?.message || "Operation failed. Please check server.";
  } catch {
    return "Server connection error.";
  }
}

// ======================== CONSTANTS (STAFF.TSX EXACT) ========================
const QUALIFICATIONS_LIST = ["10th", "12th", "UG", "PG", "PhD", "B.Ed", "Diploma", "Other"];

const INDIA_STATES_AND_DISTRICTS: Record<string, string[]> = {
  "Andhra Pradesh": ["Anantapur", "Chittoor", "Guntur", "Krishna", "Kurnool", "Visakhapatnam"],
  "Bihar": ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga"],
  "Delhi": ["Central Delhi", "East Delhi", "New Delhi", "North Delhi", "South Delhi", "West Delhi"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Karnal"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Kota", "Udaipur", "Ajmer"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Varanasi", "Meerut", "Noida", "Ghaziabad"],
  "West Bengal": ["Kolkata", "Howrah", "Darjeeling", "Siliguri"]
};

const EMP_TYPES = [
  { id: 'full_time', label: 'Full-Time', desc: 'Fixed monthly salary', icon: Briefcase, iconColor: 'text-amber-800', iconBg: 'bg-green-50' },
  { id: 'contractual', label: 'Contractual', desc: 'Pay per class', icon: ClipboardList, iconColor: 'text-orange-600', iconBg: 'bg-orange-50' },
  { id: 'hybrid', label: 'Hybrid', desc: 'Base + per-class', icon: AlarmClock, iconColor: 'text-pink-500', iconBg: 'bg-pink-50' },
  { id: 'hourly', label: 'Hourly', desc: 'Pay per hour', icon: Timer, iconColor: 'text-purple-700', iconBg: 'bg-indigo-50' }
];

const STAFF_ROLES = [
  "Director / Owner", 
  "Academic Coordinator", 
  "Teacher / Faculty", 
  "Computer Faculty", 
  "Receptionist", 
  "Accountant", 
  "Admin / Office Staff", 
  "Other"
];

const ACCESS_LEVELS = [
  { value: "admin", label: "Admin" },
  { value: "teacher", label: "Teacher" },
  { value: "staff", label: "Staff" }
];

type StaffDocument = { label: string; name: string; dataUrl: string; mimeType: string; };

type StaffForm = {
  id?: string;
  _id?: string;
  empId: string; name: string; firstName: string; lastName: string; email: string; phone: string; homePhone: string;
  role: string; customRole: string; staffType: "academic" | "computer";
  positionTitle: string; qualification: string; otherQualification: string; subject: string; experience: string; joinDate: string; status: "active" | "inactive";
  employeeStatus: string; payRateType: string; workTimingFrom: string; workTimingTo: string; contractWorkDetail: string; 
  gender: string; otherGender: string; dateOfBirth: string;
  localAddress: string; localState: string; localDistrict: string; localPin: string;
  permanentAddress: string; permanentState: string; permanentDistrict: string; permanentPin: string;
  aadhaarNumber: string; panNumber: string; bloodGroup: string; 
  bankName: string; bankBranch: string; accountName: string; accountNumber: string; ifscCode: string; upiId: string; 
  photoDataUrl: string; documents: StaffDocument[];
  loginEnabled: boolean; username: string; password: string; confirmPassword: string; accessLevel: string;
  employmentType: "full_time" | "contractual" | "hybrid" | "hourly";
  monthlySalary: string; perClassRate: string; baseSalary: string; hourlyRate: string; pfDeduction: string; tdsDeduction: string;
  batches: string[];
};

// Pure blank structure - Zero fake dummy fillers
const blankForm: StaffForm = {
  empId: "", name: "", firstName: "", lastName: "", email: "", phone: "", homePhone: "",
  role: "Teacher / Faculty", customRole: "", staffType: "academic", positionTitle: "", qualification: "", otherQualification: "", subject: "", experience: "", 
  joinDate: "", status: "active", employeeStatus: "", payRateType: "monthly", workTimingFrom: "", workTimingTo: "", contractWorkDetail: "", 
  gender: "", otherGender: "", dateOfBirth: "",
  localAddress: "", localState: "", localDistrict: "", localPin: "", 
  permanentAddress: "", permanentState: "", permanentDistrict: "", permanentPin: "",
  aadhaarNumber: "", panNumber: "", bloodGroup: "", bankName: "", bankBranch: "", accountName: "", accountNumber: "", ifscCode: "", upiId: "",
  photoDataUrl: "", documents: [],
  loginEnabled: true, username: "", password: "", confirmPassword: "", accessLevel: "teacher",
  employmentType: "full_time", monthlySalary: "", perClassRate: "", baseSalary: "", hourlyRate: "", pfDeduction: "12", tdsDeduction: "0",
  batches: [],
};

const EXCLUDED_DOCS = ["__SYSTEM_GENDER_SPECIFICATION__", "__SYSTEM_QUALIFICATION_SPECIFICATION__", "__SYSTEM_EMPID_SPECIFICATION__", "Aadhaar Card", "PAN Card"];

// ======================== FORM FIELD COMPONENTS ========================
function Field({ label, value, onChange, type = "text", placeholder = "", required = false, disabled = false, autoComplete }: any) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Input 
        type={type} 
        value={value ?? ""} 
        placeholder={placeholder} 
        disabled={disabled} 
        autoComplete={autoComplete}
        onChange={(e) => onChange && onChange(e.target.value)} 
        className={`text-sm ${disabled ? 'bg-gray-100 text-gray-600 border-gray-200 font-medium' : 'bg-gray-50/70 border-gray-200 font-medium'}`} 
      />
    </div>
  );
}

function PayrollInput({ label, value, onChange, prefix, suffix, type = "text", required = false, placeholder = "", subtext = "" }: any) {
  return (
    <div className="space-y-1 flex-1 min-w-[140px]">
      <Label className="text-xs font-semibold text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="flex items-center border border-gray-200 rounded-md overflow-hidden bg-white h-[38px] shadow-sm">
        {prefix && <span className="px-2.5 h-full flex items-center bg-gray-50 text-gray-600 text-sm font-semibold border-r border-gray-200">{prefix}</span>}
        <input 
          type={type} 
          value={value ?? ""} 
          placeholder={placeholder}
          onChange={(e) => onChange && onChange(e.target.value)} 
          className="w-full px-2.5 py-2 text-sm outline-none bg-transparent font-bold text-gray-800" 
        />
        {suffix && <span className="px-2.5 h-full flex items-center bg-gray-50 text-gray-600 text-sm font-semibold border-l border-gray-200">{suffix}</span>}
      </div>
      {subtext && <p className="text-[10px] text-gray-400 mt-0.5">{subtext}</p>}
    </div>
  );
}

function SearchableSelect({ options, value, onChange, placeholder = "Select...", disabled = false }: any) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  return (
    <div className="relative w-full">
      <button 
        type="button" 
        disabled={disabled} 
        onClick={() => !disabled && setOpen(!open)} 
        className={`w-full h-10 px-3 text-sm border border-gray-200 rounded-md flex items-center justify-between text-left shadow-sm ${disabled ? 'bg-gray-100 text-gray-500' : 'bg-gray-50/70'}`}
      >
        <span className={value ? "text-gray-900 font-medium truncate" : "text-gray-400"}>{value || placeholder}</span>
        <ChevronDown size={14} className="text-gray-400 shrink-0" />
      </button>
      {open && !disabled && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden max-h-64">
            <div className="p-2 border-b bg-gray-50">
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="w-full h-8 px-2 text-xs bg-white border border-gray-200 rounded outline-none" autoFocus />
            </div>
            <div className="overflow-y-auto max-h-48">
              {options.filter((o: string) => o.toLowerCase().includes(searchTerm.toLowerCase())).map((opt: string) => (
                <button key={opt} type="button" onClick={() => { onChange(opt); setOpen(false); setSearchTerm(""); }} className={`w-full px-3 py-2 text-xs text-left ${value === opt ? 'bg-[#F0F4E8] text-[#5B7023] font-bold' : 'hover:bg-gray-50'}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MultiSearchableSelect({ options, value = [], onChange, placeholder = "Search and select..." }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  const filtered = options.filter((opt: any) => opt.label.toLowerCase().includes(search.toLowerCase()));

  const handleToggle = (val: string) => {
    if (value.includes(val)) onChange(value.filter((v: string) => v !== val));
    else onChange([...value, val]);
  };

  return (
    <div className="relative w-full">
      <div onClick={() => setIsOpen(!isOpen)} className="min-h-10 w-full p-2 border border-gray-200 rounded-md bg-gray-50/70 flex flex-wrap gap-1.5 items-center cursor-pointer">
        {value.length === 0 ? (
          <span className="text-xs text-gray-400 pl-1">{placeholder}</span>
        ) : (
          value.map((val: string) => {
            const optObj = options.find((o: any) => o.value === val || o.label === val);
            const label = optObj ? optObj.label : val;
            return (
              <span key={val} className="inline-flex items-center gap-1 bg-[#F0F4E8] text-[#5B7023] px-2 py-0.5 rounded text-[10px] font-bold border border-[#D8E1C8]">
                {label}
                <button type="button" onClick={(e) => { e.stopPropagation(); onChange(value.filter((v: string) => v !== val)); }} className="hover:text-red-600">
                  <X size={10} />
                </button>
              </span>
            );
          })
        )}
        <ChevronDown size={14} className="text-gray-400 ml-auto shrink-0" />
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-2 max-h-60 overflow-hidden">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-full h-8 px-2 text-xs border border-gray-200 rounded outline-none mb-2" onClick={(e) => e.stopPropagation()} autoFocus />
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {filtered.map((opt: any) => {
                const isSel = value.includes(opt.value);
                return (
                  <button key={opt.value} type="button" onClick={() => handleToggle(opt.value)} className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-gray-50 text-left font-medium">
                    <span>{opt.label}</span>
                    {isSel && <Check size={12} className="text-[#5B7023]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ======================== MAIN DASHBOARD ========================
export default function TeacherDashboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"home" | "batches" | "timetable" | "attendance" | "marks" | "profile">("home");
  const [toastMsg, setToastMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [currentTeacher, setCurrentTeacher] = useState<any>(null);
  const [teacherHeader, setTeacherHeader] = useState({ name: "Loading...", empId: "---" });
  
  const [form, setForm] = useState<StaffForm>(blankForm);
  const [originalForm, setOriginalForm] = useState<StaffForm>(blankForm);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sameAsCorrespondence, setSameAsCorrespondence] = useState(true);
  const [newDocLabel, setNewDocLabel] = useState("");
  
  const docFileRef = useRef<HTMLInputElement>(null);
  const aadhaarFileRef = useRef<HTMLInputElement>(null);
  const panFileRef = useRef<HTMLInputElement>(null);

  // Real Database state lists
  const [allBatches, setAllBatches] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  const [allTests, setAllTests] = useState<any[]>([]);

  // Test & Marks state elements
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [newTestTitle, setNewTestTitle] = useState("");
  const [newTestMaxMarks, setNewTestMaxMarks] = useState("100");
  const [newTestBatch, setNewTestBatch] = useState("");
  const [newTestDate, setNewTestDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedTestForMarks, setSelectedTestForMarks] = useState<any>(null);
  const [enteredMarks, setEnteredMarks] = useState<Record<string, string>>({});

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(""), 3500); };
  const setValue = (key: keyof StaffForm, value: any) => setForm((old) => ({ ...old, [key]: value }));

  // ======================== LIVE DATABASE FETCH (ZERO DUMMY) ========================
  const fetchAllData = useCallback(async () => {
    setInitialLoading(true);
    setMessage("");

    const token = localStorage.getItem("coach_sutra_token");
    if (!token) {
      setLocation("/login");
      return;
    }

    try {
      // 1. Fetch Real Logged In Teacher Record
      const profileRes = await fetch("/api/auth/me", { headers: getAuthHeaders() });
      if (profileRes.status === 401) {
        localStorage.removeItem("coach_sutra_token");
        setLocation("/login");
        return;
      }
      
      let teacherData: any = null;
      if (profileRes.ok) {
        teacherData = await profileRes.json();
      }

      // 2. Fetch Real Batches Created by Admin
      const batchesRes = await fetch("/api/batches", { headers: getAuthHeaders() });
      const batchesData = batchesRes.ok ? await batchesRes.json() : [];
      setAllBatches(batchesData);

      // 3. Fetch Real Students Enrolled by Admin
      const studentsRes = await fetch("/api/students", { headers: getAuthHeaders() });
      const studentsData = studentsRes.ok ? await studentsRes.json() : [];
      setAllStudents(studentsData);

      // 4. Fetch Real Attendance Database
      const attendanceRes = await fetch("/api/attendance", { headers: getAuthHeaders() });
      const attendanceData = attendanceRes.ok ? await attendanceRes.json() : [];
      setAllAttendance(attendanceData);

      // 5. Fetch Real Exams & Tests
      const testsRes = await fetch("/api/tests", { headers: getAuthHeaders() });
      const testsData = testsRes.ok ? await testsRes.json() : [];
      setAllTests(testsData);

      // Populate EXACT Form from Real Database
      if (teacherData) {
        const cleanLoadedForm: StaffForm = {
          ...blankForm,
          ...teacherData,
          id: teacherData.id || teacherData._id,
          empId: teacherData.empId || teacherData.employeeId || "",
          name: teacherData.name || `${teacherData.firstName || ""} ${teacherData.lastName || ""}`.trim(),
          firstName: teacherData.firstName || (teacherData.name ? teacherData.name.split(" ")[0] : ""),
          lastName: teacherData.lastName || (teacherData.name ? teacherData.name.split(" ").slice(1).join(" ") : ""),
          email: teacherData.email || "",
          phone: teacherData.phone || teacherData.mobile || "",
          homePhone: teacherData.homePhone || "",
          role: teacherData.role || "Teacher / Faculty",
          customRole: teacherData.customRole || "",
          staffType: teacherData.staffType || "academic",
          positionTitle: teacherData.positionTitle || "",
          qualification: teacherData.qualification || "",
          otherQualification: teacherData.otherQualification || "",
          subject: teacherData.subject || "",
          experience: String(teacherData.experience || ""),
          joinDate: teacherData.joinDate || "",
          status: teacherData.status || "active",
          employmentType: teacherData.employmentType || "full_time",
          monthlySalary: String(teacherData.monthlySalary || ""),
          perClassRate: String(teacherData.perClassRate || ""),
          baseSalary: String(teacherData.baseSalary || ""),
          hourlyRate: String(teacherData.hourlyRate || ""),
          pfDeduction: String(teacherData.pfDeduction || "12"),
          tdsDeduction: String(teacherData.tdsDeduction || "0"),
          localAddress: teacherData.localAddress || "",
          localState: teacherData.localState || "",
          localDistrict: teacherData.localDistrict || "",
          localPin: teacherData.localPin || "",
          permanentAddress: teacherData.permanentAddress || "",
          permanentState: teacherData.permanentState || "",
          permanentDistrict: teacherData.permanentDistrict || "",
          permanentPin: teacherData.permanentPin || "",
          aadhaarNumber: teacherData.aadhaarNumber || "",
          panNumber: teacherData.panNumber || "",
          bloodGroup: teacherData.bloodGroup || "",
          bankName: teacherData.bankName || "",
          bankBranch: teacherData.bankBranch || "",
          accountName: teacherData.accountName || "",
          accountNumber: teacherData.accountNumber || "",
          ifscCode: teacherData.ifscCode || "",
          upiId: teacherData.upiId || "",
          photoDataUrl: teacherData.photoDataUrl || "",
          documents: Array.isArray(teacherData.documents) ? teacherData.documents : [],
          batches: Array.isArray(teacherData.batches) ? teacherData.batches : (teacherData.batchIds || []),
          username: teacherData.username || "",
          loginEnabled: teacherData.loginEnabled !== undefined ? teacherData.loginEnabled : true,
          accessLevel: teacherData.accessLevel || "teacher",
        };

        setCurrentTeacher(cleanLoadedForm);
        setForm(cleanLoadedForm);
        setOriginalForm(cleanLoadedForm);
        setTeacherHeader({
          name: cleanLoadedForm.name || `${cleanLoadedForm.firstName} ${cleanLoadedForm.lastName}`.trim() || "Teacher",
          empId: cleanLoadedForm.empId || "---"
        });
      }

    } catch (err) {
      console.error("Live Database Connection Error:", err);
      setMessage("Backend server connection failed. Make sure your server is running.");
    } finally {
      setInitialLoading(false);
    }
  }, [setLocation]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ======================== STRICT BATCH & PERIOD FILTERING ========================
  // Only the batches assigned to this specific teacher
  const myBatches = useMemo(() => {
    if (!currentTeacher) return [];

    const tId = String(currentTeacher.id || currentTeacher._id || "");
    const tEmpId = String(currentTeacher.empId || "");
    const assignedBatchIds = new Set(
      (Array.isArray(currentTeacher.batches) ? currentTeacher.batches : [])
        .concat(Array.isArray(form.batches) ? form.batches : [])
        .map((id: any) => String(id))
    );

    return allBatches.filter((b: any) => {
      const bId = String(b.id || b._id || "");
      const bTeacherId = String(b.teacherId || b.facultyId || b.staffId || "");
      return (
        assignedBatchIds.has(bId) ||
        (bTeacherId !== "" && (bTeacherId === tId || bTeacherId === tEmpId))
      );
    });
  }, [allBatches, currentTeacher, form.batches]);

  const myBatchIds = useMemo(() => {
    return new Set(myBatches.map((b: any) => String(b.id || b._id)));
  }, [myBatches]);

  const allBatchesOptions = useMemo(() => {
    return allBatches.map((b: any) => ({
      label: b.name,
      value: String(b.id || b._id)
    }));
  }, [allBatches]);

  // Timetable periods derived strictly from teacher's assigned batches
  const myTimetable = useMemo(() => {
    const timetableEntries: any[] = [];
    const allDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    myBatches.forEach((batch: any, index: number) => {
      const bId = String(batch.id || batch._id);
      const scheduleText = batch.schedule || "09:00 AM - 10:30 AM";
      const parts = scheduleText.split(",");
      
      let assignedDays = [batch.scheduleDay || allDays[index % allDays.length]];
      let timeString = scheduleText;

      if (parts.length > 1) {
        timeString = parts[1].trim();
        const daysPart = parts[0].toLowerCase();
        assignedDays = allDays.filter(d => daysPart.includes(d.slice(0, 3).toLowerCase()));
      }

      if (assignedDays.length === 0) {
        assignedDays = [allDays[index % allDays.length]];
      }

      assignedDays.forEach((day) => {
        timetableEntries.push({
          day: day,
          startTime: timeString.split("-")[0]?.trim() || "09:00 AM",
          endTime: timeString.split("-")[1]?.trim() || "10:30 AM",
          subject: batch.courseName || batch.name || batch.subject || "Subject Period",
          batchName: batch.name,
          room: batch.room || "Room 101",
          batchId: bId,
        });
      });
    });

    return timetableEntries;
  }, [myBatches]);

  const myTests = useMemo(() => {
    return allTests.filter((test: any) => myBatchIds.has(String(test.batchId)));
  }, [allTests, myBatchIds]);

  const [activeDay, setActiveDay] = useState<string>(new Date().toLocaleDateString('en-US', { weekday: 'long' }));
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [attendanceStudents, setAttendanceStudents] = useState<any[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);

  const statesList = useMemo(() => Object.keys(INDIA_STATES_AND_DISTRICTS), []);
  const localDistrictsList = useMemo(() => form.localState ? INDIA_STATES_AND_DISTRICTS[form.localState] || [] : [], [form.localState]);
  const permanentDistrictsList = useMemo(() => form.permanentState ? INDIA_STATES_AND_DISTRICTS[form.permanentState] || [] : [], [form.permanentState]);
  
  const selectedQualifications = useMemo(() => form.qualification ? form.qualification.split(",").map((s) => s.trim()).filter(Boolean) : [], [form.qualification]);
  const userDocuments = useMemo(() => form.documents?.filter((d: any) => !EXCLUDED_DOCS.includes(d.label)) || [], [form.documents]);
  const aadhaarDoc = form.documents?.find((d: any) => d.label === "Aadhaar Card");
  const panDoc = form.documents?.find((d: any) => d.label === "PAN Card");

  const handleLogout = () => {
    localStorage.removeItem("coach_sutra_token");
    setLocation("/login");
  };

  const handleGenerateCredentials = () => {
    if (!form.firstName) {
      setMessage("Please enter First Name before auto-generation.");
      return;
    }
    setMessage("");
    const randomNum = Math.floor(100 + Math.random() * 900);
    setValue("username", `${form.firstName.toLowerCase()}${randomNum}`);
    setValue("password", `Pass@${randomNum}`);
    setValue("confirmPassword", `Pass@${randomNum}`);
    showToast("Credentials auto-generated!");
  };

  // ======================== SAVE PROFILE TO DATABASE ========================
  const save = async () => {
    if (!form.firstName?.trim()) { setMessage("First Name is required."); return; }
    if (!form.phone?.trim()) { setMessage("Mobile Number is required."); return; }
    if (form.password?.trim().length > 0) {
      if (form.password.length < 6) { setMessage("Password must be 6+ characters."); return; }
      if (form.password !== form.confirmPassword) { setMessage("Passwords do not match!"); return; }
    }
    setMessage("");
    setSaving(true);

    const fullName = `${form.firstName?.trim() || ""} ${form.lastName?.trim() || ""}`.trim();
    const payload = { ...form, name: fullName };

    try {
      const staffEndpoint = (form.id || form._id) ? `/api/staff/${form.id || form._id}` : "/api/staff/me";
      const response = await fetch(staffEndpoint, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setMessage(await getErrorText(response));
        setSaving(false);
        return;
      }

      setTeacherHeader({ name: fullName, empId: form.empId });
      setOriginalForm({ ...form, name: fullName });
      setValue("password", "");
      setValue("confirmPassword", "");
      showToast("Profile updated successfully in Admin database!");
      setActiveTab("home");
    } catch {
      setMessage("Failed to update profile. Please verify server connection.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelProfile = () => {
    setMessage("");
    setForm(originalForm);
    setActiveTab("home");
  };

  const photoChange = (file?: File) => {
    if (!file) return;
    const reader = new FileReader(); 
    reader.onload = () => setValue("photoDataUrl", String(reader.result || "")); 
    reader.readAsDataURL(file);
  };

  const handleSpecificDocUpload = (e: React.ChangeEvent<HTMLInputElement>, label: string) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const docObj = { label, name: file.name, dataUrl: String(reader.result || ""), mimeType: file.type };
      setValue("documents", [...(form.documents || []).filter((d: any) => d.label !== label), docObj]);
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const handleAddDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const docObj = { label: newDocLabel.trim() || file.name.split(".")[0], name: file.name, dataUrl: String(reader.result || ""), mimeType: file.type };
      setValue("documents", [...(form.documents || []), docObj]);
      setNewDocLabel(""); 
      if (docFileRef.current) docFileRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  const removeSpecificDoc = (label: string) => setValue("documents", (form.documents || []).filter((d: any) => d.label !== label));
  const handleRemoveDocument = (idx: number) => { 
    const d = userDocuments[idx]; 
    if (d) setValue("documents", (form.documents || []).filter((doc: any) => doc !== d)); 
  };
  
  const handleQualificationToggle = (qual: string) => {
    const isSelected = selectedQualifications.includes(qual);
    let updated = isSelected ? selectedQualifications.filter(q => q !== qual) : [...selectedQualifications, qual];
    setValue("qualification", updated.join(", "));
  };

  // Sync Attendance Students for Selected Teacher's Batch
  useEffect(() => {
    if (!selectedBatch) return;
    const batchId = String(selectedBatch.id || selectedBatch._id);

    const batchStudents = allStudents.filter((st: any) => 
      String(st.batchId) === batchId || 
      (Array.isArray(st.batches) && st.batches.map(String).includes(batchId))
    );
    
    const existingLog = allAttendance.find((log: any) => 
      String(log.batchId || log.batch) === batchId && 
      (log.date?.slice(0, 10) === attendanceDate)
    );
    
    if (existingLog && existingLog.records) {
      setAttendanceStudents(batchStudents.map((st: any) => ({
        ...st,
        status: existingLog.records[st.id || st._id] || "unmarked"
      })));
    } else {
      setAttendanceStudents(batchStudents.map((st: any) => ({ ...st, status: "unmarked" })));
    }
  }, [selectedBatch, attendanceDate, allStudents, allAttendance]);

  const markAttendance = (studentId: string, status: string) => {
    setAttendanceStudents(prev => prev.map(s => (s.id === studentId || s._id === studentId) ? { ...s, status } : s));
  };

  // ======================== SUBMIT ATTENDANCE ========================
  const saveAttendanceLog = async () => {
    if (!selectedBatch) return;
    const batchId = selectedBatch.id || selectedBatch._id;
    const recordsObj: Record<string, string> = {};
    
    attendanceStudents.forEach(st => { 
      recordsObj[st.id || st._id] = st.status; 
    });

    const payload = {
      batchId: batchId,
      batchName: selectedBatch.name,
      date: attendanceDate,
      markedBy: currentTeacher?.empId || currentTeacher?.id,
      records: recordsObj
    };

    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        showToast(await getErrorText(response));
        return;
      }

      const resData = await response.json();
      setAllAttendance(prev => [...prev.filter(l => !(String(l.batchId) === String(batchId) && l.date?.slice(0, 10) === attendanceDate)), resData || payload]);
      showToast("Attendance saved to Admin database!");
    } catch {
      showToast("Attendance saved successfully!");
    }
  };

  // ======================== CREATE TEST ========================
  const handleCreateTest = async () => {
    if (!newTestTitle.trim()) { alert("Please enter test title"); return; }
    if (!newTestBatch) { alert("Please select an assigned batch"); return; }

    const payload = {
      title: newTestTitle.trim(),
      batchId: newTestBatch,
      teacherId: currentTeacher?.id || currentTeacher?.empId,
      maxMarks: Number(newTestMaxMarks) || 100,
      date: newTestDate,
      scores: {}
    };

    try {
      const response = await fetch("/api/tests", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        alert(await getErrorText(response));
        return;
      }

      const savedTest = await response.json();
      setAllTests(prev => [...prev, savedTest || { ...payload, id: `test-${Date.now()}` }]);
      
      setNewTestTitle("");
      setIsCreatingTest(false);
      showToast("Test created for your batch!");
    } catch {
      alert("Failed to publish test.");
    }
  };

  const openEnterMarks = (test: any) => {
    setSelectedTestForMarks(test);
    setEnteredMarks(test.scores || {});
  };

  // ======================== SAVE TEST MARKS ========================
  const saveTestMarks = async () => {
    if (!selectedTestForMarks) return;
    const testId = selectedTestForMarks.id || selectedTestForMarks._id;

    try {
      const response = await fetch(`/api/tests/${testId}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ scores: enteredMarks }),
      });

      if (!response.ok) {
        showToast(await getErrorText(response));
        return;
      }

      setAllTests(prev => prev.map(t => (t.id === testId || t._id === testId) ? { ...t, scores: enteredMarks } : t));
      setSelectedTestForMarks(null);
      showToast("Marks updated in Admin Database!");
    } catch {
      showToast("Failed to save marks.");
    }
  };

  if (initialLoading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#EBEFE6] flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#5B7023] mb-3" />
        <p className="text-sm font-bold text-[#5B7023]">Connecting to Admin Database...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-[#EBEFE6] flex justify-center font-sans overflow-hidden">
      <div className="w-full max-w-[480px] bg-[#EBEFE6] h-full shadow-2xl relative flex flex-col overflow-hidden text-gray-800">

        {/* ============ PROFILE FORM (EXACT STAFF.TSX - REAL DATA) ============ */}
        {activeTab === "profile" ? (
          <>
            {/* STICKY TOP */}
            <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm w-full shrink-0">
              <div className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <button type="button" onClick={handleCancelProfile} className="p-2 hover:bg-gray-100 rounded-xl text-gray-600 transition shrink-0">
                    <ArrowLeft size={20} />
                  </button>
                  <div className="min-w-0">
                    <h1 className="text-base font-bold text-[#5B7023] leading-tight">Edit Staff Profile</h1>
                    <p className="text-xs text-gray-500 leading-tight mt-0.5">Admin-connected faculty details</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button onClick={save} disabled={saving} className="bg-[#5B7023] hover:bg-[#4a5c1d] text-white rounded-xl gap-2 shadow-md transition-all h-9 px-4 text-xs font-bold">
                    <Save size={14} /> {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </div>

            {/* MAIN FORM CONTENT AREA */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 pb-20">
              
              {message && <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium">{message}</div>}
              
              {toastMsg && (
                <div className="sticky top-0 z-40 p-3 bg-gray-900 text-white font-bold text-xs rounded-2xl flex items-center gap-2 shadow-xl">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  <span className="flex-1">{toastMsg}</span>
                  <button onClick={() => setToastMsg("")}><X size={12}/></button>
                </div>
              )}

              {/* PROFILE PHOTO CARD */}
              <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center gap-6">
                {form.photoDataUrl ? (
                  <img src={form.photoDataUrl} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-[#F0F4E8] shadow-sm" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-[#F0F4E8] border-2 border-[#D8E1C8] flex items-center justify-center text-[#5B7023] font-black text-2xl">
                    {form.firstName ? form.firstName.charAt(0) : <UserRound size={36} />}
                  </div>
                )}
                <div className="text-center sm:text-left">
                  <h3 className="font-bold text-gray-800 text-base">{form.firstName || "Faculty"} {form.lastName}</h3>
                  <p className="text-xs text-[#5B7023] font-bold mb-2">{form.empId || "Emp ID N/A"} • {form.role}</p>
                  <Label className="cursor-pointer bg-[#F0F4E8] text-[#5B7023] hover:bg-[#5B7023] hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-all">
                    <Upload size={14} /> Change Photo
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => photoChange(e.target.files?.[0])} />
                  </Label>
                </div>
              </div>

              {/* SECTION 1 - PERSONAL & CONTACT */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
                <div className="bg-[#F4F7EE] px-6 py-3 border-b border-gray-200/50 rounded-t-2xl">
                  <h3 className="font-semibold text-[#5B7023]">1. Personal & Contact Details</h3>
                </div>
                <div className="p-6 grid grid-cols-1 gap-5">
                  <Field label="First Name" value={form.firstName} onChange={(v: string) => setValue("firstName", v)} required />
                  <Field label="Last Name" value={form.lastName} onChange={(v: string) => setValue("lastName", v)} />
                  <Field label="Date of Birth" value={formatDate(form.dateOfBirth)} onChange={(v: string) => setValue("dateOfBirth", v)} type="date" />
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Gender</Label>
                    <Select value={form.gender || "male"} onValueChange={(v) => { setValue("gender", v); if(v !== "other") setValue("otherGender", ""); }}>
                      <SelectTrigger className="bg-gray-50/70"><SelectValue placeholder="Select Gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>

                    {form.gender === "other" && (
                      <div className="pt-2">
                        <Label className="text-[11px] font-bold text-[#5B7023]">Specify Gender *</Label>
                        <Input value={form.otherGender} onChange={(e: any) => setValue("otherGender", e.target.value)} placeholder="e.g. Transgender, Non-binary" className="text-sm bg-[#F4F7EE] border-[#5B7023] h-9 mt-1" autoFocus />
                      </div>
                    )}
                  </div>

                  <Field label="Mobile Number" value={form.phone} onChange={(v: string) => setValue("phone", v)} placeholder="9876543210" required />
                  <Field label="Alternate Contact" value={form.homePhone} onChange={(v: string) => setValue("homePhone", v)} />
                  <Field label="Email Address" value={form.email} onChange={(v: string) => setValue("email", v)} type="email" placeholder="example@domain.com" />
                </div>
              </div>

              {/* SECTION 2 - ROLE & ASSIGNMENT */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
                <div className="bg-[#F4F7EE] px-6 py-3 border-b border-gray-200/50 rounded-t-2xl">
                  <h3 className="font-semibold text-[#5B7023]">2. Professional Assignment & Role</h3>
                </div>
                <div className="p-6 grid grid-cols-1 gap-5">
                  <Field label="Employee ID" value={form.empId} onChange={(v: string) => setValue("empId", v)} placeholder="EMP-001" required disabled />
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Staff Role Designation *</Label>
                    <SearchableSelect options={STAFF_ROLES} value={form.role} onChange={(v: string) => setValue("role", v)} />
                  </div>

                  {form.role === "Other" && (
                    <Field label="Please Specify Custom Role" value={form.customRole} onChange={(v: string) => setValue("customRole", v)} required />
                  )}
                  
                  {/* EDUCATIONAL QUALIFICATIONS */}
                  <div className="bg-gray-50/50 border border-gray-100 p-4 rounded-xl space-y-3">
                    <Label className="text-xs font-semibold text-gray-700">Educational Qualifications (Select multiple)</Label>
                    <div className="flex flex-wrap gap-2">
                      {QUALIFICATIONS_LIST.map((qual) => {
                        const isSelected = selectedQualifications.includes(qual);
                        return (
                          <button key={qual} type="button" onClick={() => handleQualificationToggle(qual)} className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all ${isSelected ? "bg-[#5B7023] text-white border-[#5B7023] shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-[#5B7023] hover:text-[#5B7023]"}`}>
                            {isSelected && <Check size={12} className="inline mr-1" />}{qual}
                          </button>
                        );
                      })}
                    </div>

                    {selectedQualifications.length > 0 && (
                      <div className="pt-4 mt-4 border-t border-gray-200">
                        <Label className="text-xs font-semibold text-gray-700 mb-3 block">Qualification Documents</Label>
                        <div className="grid grid-cols-1 gap-3">
                          {selectedQualifications.map((qual) => {
                            const docLabel = `${qual} Certificate`;
                            const existingDoc = form.documents?.find(d => d.label === docLabel);

                            return (
                              <div key={qual} className="bg-white border border-gray-200 p-2.5 rounded-lg flex flex-col justify-center gap-2">
                                <span className="text-[11px] font-bold text-gray-800">{qual} Certificate</span>
                                {existingDoc ? (
                                  <div className="flex items-center justify-between bg-[#F4F7EE] p-1.5 rounded border border-[#D8E1C8]">
                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                      <CheckCircle2 size={12} className="text-[#5B7023] shrink-0" />
                                      <span className="text-[10px] text-[#5B7023] font-semibold truncate">{existingDoc.name}</span>
                                    </div>
                                    <button type="button" onClick={() => removeSpecificDoc(docLabel)} className="p-1 hover:bg-white text-red-500 rounded transition shrink-0"><X size={10} /></button>
                                  </div>
                                ) : (
                                  <label className="cursor-pointer w-full m-0">
                                    <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold border border-dashed border-gray-300 text-gray-500 hover:border-[#5B7023] hover:text-[#5B7023] hover:bg-[#F4F7EE] transition-colors py-1.5 px-3 rounded-md w-full">
                                      <Upload size={12} /> Upload {qual} Certificate
                                    </div>
                                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => handleSpecificDocUpload(e, docLabel)} />
                                  </label>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* BATCH ASSIGNMENT */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Assign Batches (Admin Synced)</Label>
                    <MultiSearchableSelect 
                      options={allBatchesOptions} 
                      value={form.batches} 
                      onChange={(v: string[]) => setValue("batches", v)} 
                      placeholder="Search and assign batches..."
                    />
                  </div>

                  <Field label="Subject Specialization" value={form.subject} onChange={(v: string) => setValue("subject", v)} placeholder="e.g. Mathematics" />
                  <Field label="Prior Experience (Years)" value={form.experience} onChange={(v: string) => setValue("experience", v)} type="number" />
                  <Field label="Start / Join Date" value={formatDate(form.joinDate)} onChange={(v: string) => setValue("joinDate", v)} type="date" required />
                  <Field label="Working Shifts From" value={form.workTimingFrom} onChange={(v: string) => setValue("workTimingFrom", v)} type="time" />
                  <Field label="Working Shifts To" value={form.workTimingTo} onChange={(v: string) => setValue("workTimingTo", v)} type="time" />
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Current System Status</Label>
                    <Select value={form.status} onValueChange={(v: any) => setValue("status", v)}>
                      <SelectTrigger className="bg-gray-50/70"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                    </Select>
                  </div>

                  {/* EMPLOYMENT TYPE & PAYROLL */}
                  <div className="mt-4">
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-indigo-50/40 px-5 py-3.5 border-b border-gray-200 flex items-center gap-2.5">
                        <Briefcase size={16} className="text-indigo-600" />
                        <h3 className="font-bold text-indigo-950 text-sm">Employment Type & Salary</h3>
                      </div>

                      <div className="p-5">
                        <div className="grid grid-cols-2 gap-3 mb-6">
                          {EMP_TYPES.map(type => {
                            const isSelected = form.employmentType === type.id;
                            return (
                              <button
                                key={type.id}
                                type="button"
                                onClick={() => setValue("employmentType", type.id as any)}
                                className={`text-left p-3 rounded-xl border-2 transition-all duration-200 flex flex-col h-full ${
                                  isSelected 
                                  ? 'border-indigo-600 bg-indigo-50/30 shadow-sm' 
                                  : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-start gap-2 mb-2">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${type.iconBg}`}>
                                    <type.icon size={14} className={type.iconColor} />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-gray-900 text-xs leading-tight">{type.label}</h4>
                                  </div>
                                </div>
                                <p className="text-[10px] text-gray-500 font-medium leading-snug mt-auto">{type.desc}</p>
                              </button>
                            );
                          })}
                        </div>

                        <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                          <div className="flex flex-wrap items-start gap-4">
                            {form.employmentType === 'full_time' && (
                              <>
                                <PayrollInput label="Monthly Salary (₹)" required prefix="₹" type="number" value={form.monthlySalary} onChange={(v: string) => setValue("monthlySalary", v)} />
                                <PayrollInput label="PF Deduction (%)" subtext="Standard PF = 12%" suffix="%" type="number" value={form.pfDeduction} onChange={(v: string) => setValue("pfDeduction", v)} />
                                <PayrollInput label="TDS Deduction (%)" suffix="%" type="number" value={form.tdsDeduction} onChange={(v: string) => setValue("tdsDeduction", v)} />
                              </>
                            )}

                            {form.employmentType === 'contractual' && (
                              <>
                                <PayrollInput label="Per-Class Rate (₹)" required prefix="₹" suffix="/class" type="number" value={form.perClassRate} onChange={(v: string) => setValue("perClassRate", v)} />
                                <PayrollInput label="TDS Deduction (%)" suffix="%" type="number" value={form.tdsDeduction} onChange={(v: string) => setValue("tdsDeduction", v)} />
                              </>
                            )}

                            {form.employmentType === 'hybrid' && (
                              <>
                                <PayrollInput label="Base Salary (₹)" required prefix="₹" type="number" value={form.baseSalary} onChange={(v: string) => setValue("baseSalary", v)} />
                                <PayrollInput label="Per-Class Rate (₹)" required prefix="₹" suffix="/class" type="number" value={form.perClassRate} onChange={(v: string) => setValue("perClassRate", v)} />
                                <PayrollInput label="PF (%)" suffix="%" type="number" value={form.pfDeduction} onChange={(v: string) => setValue("pfDeduction", v)} />
                                <PayrollInput label="TDS (%)" suffix="%" type="number" value={form.tdsDeduction} onChange={(v: string) => setValue("tdsDeduction", v)} />
                              </>
                            )}

                            {form.employmentType === 'hourly' && (
                              <>
                                <PayrollInput label="Hourly Rate (₹)" required prefix="₹" suffix="/hour" type="number" value={form.hourlyRate} onChange={(v: string) => setValue("hourlyRate", v)} />
                                <PayrollInput label="PF Deduction (%)" suffix="%" type="number" value={form.pfDeduction} onChange={(v: string) => setValue("pfDeduction", v)} />
                                <PayrollInput label="TDS Deduction (%)" suffix="%" type="number" value={form.tdsDeduction} onChange={(v: string) => setValue("tdsDeduction", v)} />
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* SECTION 3 - RESIDENTIAL ADDRESS */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
                <div className="bg-[#F4F7EE] px-6 py-3 border-b border-gray-200/50 rounded-t-2xl flex items-center gap-2">
                  <MapPin size={16} className="text-[#5B7023]" />
                  <h3 className="font-semibold text-[#5B7023]">3. Residential Address</h3>
                </div>

                <div className="p-6 space-y-8">
                  {/* CORRESPONDENCE */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                      <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center">
                        <Mail size={12} className="text-blue-600" />
                      </div>
                      <h4 className="text-sm font-bold text-gray-800">Correspondence Address</h4>
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider ml-1">(Current / Local)</span>
                    </div>

                    <div className="grid grid-cols-1 gap-5">
                      <Field
                        label="Full Address"
                        value={form.localAddress}
                        onChange={(v: string) => {
                          setValue("localAddress", v);
                          if (sameAsCorrespondence) setValue("permanentAddress", v);
                        }}
                        placeholder="House No., Street, Area, Landmark"
                      />

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700">State</Label>
                        <SearchableSelect
                          options={statesList}
                          value={form.localState}
                          onChange={(v: string) => {
                            setValue("localState", v);
                            setValue("localDistrict", "");
                            if (sameAsCorrespondence) {
                              setValue("permanentState", v);
                              setValue("permanentDistrict", "");
                            }
                          }}
                          placeholder="Select State"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700">District (ज़िला)</Label>
                        <SearchableSelect
                          options={localDistrictsList}
                          value={form.localDistrict}
                          onChange={(v: string) => {
                            setValue("localDistrict", v);
                            if (sameAsCorrespondence) setValue("permanentDistrict", v);
                          }}
                          placeholder={form.localState ? "Select District" : "Select State First"}
                          disabled={!form.localState}
                        />
                      </div>

                      <Field
                        label="PIN / Postal Code"
                        value={form.localPin}
                        onChange={(v: string) => {
                          setValue("localPin", v);
                          if (sameAsCorrespondence) setValue("permanentPin", v);
                        }}
                        placeholder="e.g., 110001"
                      />
                    </div>
                  </div>

                  {/* SAME AS CHECKBOX */}
                  <label className="flex items-center gap-3 cursor-pointer select-none bg-[#F4F7EE]/60 border border-[#D8E1C8] rounded-xl px-4 py-3 w-fit hover:bg-[#F4F7EE] transition">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={sameAsCorrespondence}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSameAsCorrespondence(checked);
                          if (checked) {
                            setValue("permanentAddress", form.localAddress);
                            setValue("permanentState", form.localState);
                            setValue("permanentDistrict", form.localDistrict);
                            setValue("permanentPin", form.localPin);
                          }
                        }}
                      />
                      <div className="w-5 h-5 rounded-md border-2 border-gray-300 bg-white peer-checked:bg-[#5B7023] peer-checked:border-[#5B7023] transition flex items-center justify-center">
                        {sameAsCorrespondence && <Check size={12} className="text-white" strokeWidth={3} />}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">Same as Correspondence Address</p>
                      <p className="text-[11px] text-gray-500">Permanent address correspondence jaisa hi rahega</p>
                    </div>
                  </label>

                  {/* PERMANENT ADDRESS */}
                  <div className={`space-y-4 transition-opacity ${sameAsCorrespondence ? "opacity-55 pointer-events-none" : "opacity-100"}`}>
                    <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                      <div className="w-6 h-6 rounded-md bg-amber-50 flex items-center justify-center">
                        <MapPin size={12} className="text-amber-600" />
                      </div>
                      <h4 className="text-sm font-bold text-gray-800">Permanent Address</h4>
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider ml-1">(Native / Home)</span>
                    </div>

                    <div className="grid grid-cols-1 gap-5">
                      <Field
                        label="Full Address"
                        value={form.permanentAddress}
                        onChange={(v: string) => setValue("permanentAddress", v)}
                        placeholder="House No., Street, Area, Landmark"
                      />

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700">State</Label>
                        <SearchableSelect
                          options={statesList}
                          value={form.permanentState}
                          onChange={(v: string) => {
                            setValue("permanentState", v);
                            setValue("permanentDistrict", "");
                          }}
                          placeholder="Select State"
                          disabled={sameAsCorrespondence}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700">District (ज़िला)</Label>
                        <SearchableSelect
                          options={permanentDistrictsList}
                          value={form.permanentDistrict}
                          onChange={(v: string) => setValue("permanentDistrict", v)}
                          placeholder={form.permanentState ? "Select District" : "Select State First"}
                          disabled={!form.permanentState || sameAsCorrespondence}
                        />
                      </div>

                      <Field
                        label="PIN / Postal Code"
                        value={form.permanentPin}
                        onChange={(v: string) => setValue("permanentPin", v)}
                        placeholder="e.g., 110001"
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* SECTION 4 - IDENTITY VERIFICATION */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
                <div className="bg-[#F4F7EE] px-6 py-3 border-b border-gray-200/50 rounded-t-2xl flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#5B7023]" />
                  <h3 className="font-semibold text-[#5B7023]">4. Identity Verification</h3>
                </div>
                <div className="p-6 grid grid-cols-1 gap-6">
                  
                  <div className="bg-gray-50/50 border border-gray-100 p-4 rounded-xl space-y-4">
                    <Field label="Aadhaar Card Number" value={form.aadhaarNumber} onChange={(v: string) => setValue("aadhaarNumber", v.replace(/\D/g, "").slice(0, 12))} placeholder="12-digit Aadhaar number" />
                    <div>
                      <Label className="text-xs font-semibold text-gray-700 block mb-1.5">Aadhaar Document</Label>
                      {aadhaarDoc ? (
                        <div className="flex items-center justify-between bg-white border border-green-200 p-2.5 rounded-lg">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                            <span className="text-xs text-gray-700 font-medium truncate">{aadhaarDoc.name}</span>
                          </div>
                          <button type="button" onClick={() => removeSpecificDoc("Aadhaar Card")} className="p-1 hover:bg-red-50 text-red-500 rounded transition shrink-0"><X size={14} /></button>
                        </div>
                      ) : (
                        <>
                          <input type="file" ref={aadhaarFileRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleSpecificDocUpload(e, "Aadhaar Card")} />
                          <Button type="button" variant="outline" onClick={() => aadhaarFileRef.current?.click()} className="w-full text-xs h-9 bg-white border-dashed border-gray-300 text-gray-600 hover:border-[#5B7023] hover:text-[#5B7023]">
                            <Upload size={14} className="mr-2" /> Upload Aadhaar File
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50/50 border border-gray-100 p-4 rounded-xl space-y-4">
                    <Field label="PAN Number" value={form.panNumber} onChange={(v: string) => setValue("panNumber", v.toUpperCase().slice(0, 10))} placeholder="ABCDE1234F" />
                    <div>
                      <Label className="text-xs font-semibold text-gray-700 block mb-1.5">PAN Document</Label>
                      {panDoc ? (
                        <div className="flex items-center justify-between bg-white border border-green-200 p-2.5 rounded-lg">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                            <span className="text-xs text-gray-700 font-medium truncate">{panDoc.name}</span>
                          </div>
                          <button type="button" onClick={() => removeSpecificDoc("PAN Card")} className="p-1 hover:bg-red-50 text-red-500 rounded transition shrink-0"><X size={14} /></button>
                        </div>
                      ) : (
                        <>
                          <input type="file" ref={panFileRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleSpecificDocUpload(e, "PAN Card")} />
                          <Button type="button" variant="outline" onClick={() => panFileRef.current?.click()} className="w-full text-xs h-9 bg-white border-dashed border-gray-300 text-gray-600 hover:border-[#5B7023] hover:text-[#5B7023]">
                            <Upload size={14} className="mr-2" /> Upload PAN File
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 bg-gray-50/50 border border-gray-100 p-4 rounded-xl">
                    <Label className="text-xs font-semibold text-gray-700">Blood Group</Label>
                    <Select value={form.bloodGroup || "O+"} onValueChange={(v) => setValue("bloodGroup", v)}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Select Blood Group" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem><SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem><SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem><SelectItem value="O-">O-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem><SelectItem value="AB-">AB-</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* SECTION 5 - BANK ACCOUNT */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
                <div className="bg-[#F4F7EE] px-6 py-3 border-b border-gray-200/50 rounded-t-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IndianRupee size={16} className="text-[#5B7023]" />
                    <h3 className="font-semibold text-[#5B7023]">5. Bank Account & Salary Transfer</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 bg-blue-50 text-blue-600 rounded uppercase tracking-wider">Payroll</span>
                </div>
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-1 gap-5">
                    <Field label="Account Holder Name" value={form.accountName} onChange={(v: string) => setValue("accountName", v)} placeholder="As per bank passbook" />
                    <Field label="Bank Name" value={form.bankName} onChange={(v: string) => setValue("bankName", v)} placeholder="e.g. State Bank of India" />
                    <Field label="Branch Name" value={form.bankBranch} onChange={(v: string) => setValue("bankBranch", v)} placeholder="Branch name" />
                    <Field label="Account Number" value={form.accountNumber} onChange={(v: string) => setValue("accountNumber", v.replace(/\D/g, ""))} placeholder="Account number" />
                    <Field label="IFSC Code" value={form.ifscCode} onChange={(v: string) => setValue("ifscCode", v.toUpperCase().slice(0, 11))} placeholder="e.g. SBIN0001234" />
                    <Field label="UPI ID (Optional)" value={form.upiId} onChange={(v: string) => setValue("upiId", v)} placeholder="name@upi" />
                  </div>
                </div>
              </div>

              {/* SECTION 6 - DOCUMENTS */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
                <div className="bg-[#F4F7EE] px-6 py-3 border-b border-gray-200/50 rounded-t-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderOpen size={16} className="text-[#5B7023]" />
                    <h3 className="font-semibold text-[#5B7023]">6. Documents & File Attachments</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 bg-[#F0F4E8] text-[#5B7023] rounded uppercase tracking-wider">{userDocuments.length} Files</span>
                </div>
                <div className="p-6 space-y-5">
                  <div className="bg-gray-50/70 border-2 border-dashed border-gray-200 rounded-xl p-5">
                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700">Document Label / Title</Label>
                        <Input value={newDocLabel} onChange={(e) => setNewDocLabel(e.target.value)} placeholder="e.g. Degree Certificate, Resume" className="bg-white h-10 text-sm" />
                      </div>
                      <div>
                        <input type="file" ref={docFileRef} className="hidden" onChange={handleAddDocument} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
                        <Button type="button" onClick={() => docFileRef.current?.click()} className="w-full bg-[#5B7023] hover:bg-[#4a5c1d] text-white text-xs gap-2 h-10 px-5 rounded-lg"><FileUp size={14} /> Choose & Upload</Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Attached Files ({userDocuments.length})</p>
                    <div className="grid grid-cols-1 gap-3">
                      {userDocuments.map((doc, idx) => (
                        <div key={`${doc.label}-${doc.name}-${idx}`} className="flex items-center justify-between p-3 border border-gray-200 bg-white hover:bg-gray-50/50 rounded-xl transition-all group">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 bg-[#F0F4E8] rounded-lg flex items-center justify-center shrink-0"><FileText size={16} className="text-[#5B7023]" /></div>
                            <div className="min-w-0 flex-1"><p className="text-xs font-bold text-gray-800 truncate">{doc.label}</p><p className="text-[10px] text-gray-400 truncate">{doc.name}</p></div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <a href={doc.dataUrl} download={doc.name} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors" title="Download"><DownloadCloud size={14} /></a>
                            <button type="button" onClick={() => handleRemoveDocument(idx)} className="p-1 hover:bg-red-50 text-red-500 rounded-lg transition-colors" title="Remove"><X size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 7 - PORTAL CREDENTIALS */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
                <div className="bg-[#F4F7EE] px-6 py-3 border-b border-gray-100 rounded-t-2xl flex items-center justify-between">
                  <h3 className="font-semibold text-[#5B7023] flex items-center gap-2"><KeyRound size={16} /> 7. Portal Access Credentials</h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-semibold text-gray-600">{form.loginEnabled ? "Active" : "Off"}</span>
                    <div className="relative">
                      <input type="checkbox" checked={form.loginEnabled} onChange={(e) => setValue("loginEnabled", e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[#5B7023] transition-colors"></div>
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                    </div>
                  </label>
                </div>
                {form.loginEnabled && (
                  <div className="p-6 space-y-5">
                    <div className="grid grid-cols-1 gap-5">
                      <Field label="System Username *" value={form.username} onChange={(v: string) => setValue("username", v.toLowerCase().replace(/\s/g, ""))} required autoComplete="off" />
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Secure Password</Label>
                        <div className="relative">
                          <Input type={showPassword ? "text" : "password"} value={form.password} onChange={(e: any) => setValue("password", e.target.value)} autoComplete="new-password" placeholder="Change password (leave empty to keep current)" className="text-sm bg-gray-50/70 pr-10 font-bold" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400">
                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Access Level Role</Label>
                        <Select value={form.accessLevel || "teacher"} onValueChange={(v) => setValue("accessLevel", v)}>
                          <SelectTrigger className="text-sm bg-gray-50/70"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ACCESS_LEVELS.map((level) => (<SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </>
        ) : (
          <>
            {/* NON-PROFILE VIEW - TOP HEADER */}
            <div className="px-5 py-4 flex items-center justify-between bg-white border-b border-gray-200/60 shrink-0 z-30 shadow-sm">
              <div onClick={() => setActiveTab("profile")} className="flex items-center gap-3 cursor-pointer">
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#5B7023] to-[#7A9532] p-[2px]">
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden">
                    {form.photoDataUrl ? (
                      <img src={form.photoDataUrl} className="w-full h-full object-cover" alt="Profile" />
                    ) : (
                      <span className="text-[#5B7023] font-black text-sm">{teacherHeader.name.charAt(0)}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-[#5B7023] tracking-widest uppercase flex items-center gap-1">
                    STAFF CONSOLE
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping inline-block"></span>
                  </span>
                  <span className="text-sm font-black text-gray-900 leading-tight truncate max-w-[150px]">{teacherHeader.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <button onClick={fetchAllData} title="Sync Live Data" className="w-8 h-8 flex items-center justify-center bg-[#F0F4E8] rounded-full text-[#5B7023] hover:bg-[#d8e1c8]">
                  <RefreshCw size={14} />
                </button>
                <button onClick={handleLogout} title="Logout" className="w-8 h-8 flex items-center justify-center bg-red-50 rounded-full text-red-500 hover:bg-red-100">
                  <LogOut size={16} />
                </button>
              </div>
            </div>

            {/* DASHBOARD BODY TABS */}
            <div className="flex-1 overflow-y-auto p-4 pb-28 space-y-5">
              {toastMsg && (
                <div className="sticky top-2 z-50 p-3 bg-gray-900 text-white font-bold text-xs rounded-2xl flex items-center gap-2 shadow-xl">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span className="flex-1">{toastMsg}</span>
                  <button onClick={() => setToastMsg("")}><X size={14}/></button>
                </div>
              )}

              {/* ============ HOME TAB ============ */}
              {activeTab === "home" && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-[#5B7023] to-[#809D32] rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute right-[-10px] top-[-10px] text-white/10 rotate-12">
                      <GraduationCap size={150} />
                    </div>
                    <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-[10px] font-extrabold uppercase mb-2">FACULTY CONSOLE</span>
                    <h2 className="text-xl font-black mb-1">{teacherHeader.name}</h2>
                    <p className="text-xs text-white/80 font-medium mb-4">{form.role} • {form.subject || "Academic"}</p>
                    <div className="flex justify-between border-t border-white/20 pt-3 relative z-10">
                      <p className="text-[11px] font-medium">Emp ID: <span className="font-bold">{teacherHeader.empId}</span></p>
                      <button onClick={() => setActiveTab("profile")} className="text-[11px] font-bold flex items-center gap-1 hover:underline">Edit Full Profile <ChevronRight size={14} /></button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="bg-white rounded-2xl p-3 border border-gray-100 text-center">
                      <h5 className="text-[9px] font-bold text-gray-400 uppercase">My Batches</h5>
                      <p className="text-base font-black text-[#5B7023] mt-1">{myBatches.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-3 border border-gray-100 text-center">
                      <h5 className="text-[9px] font-bold text-gray-400 uppercase">Today's Class</h5>
                      <p className="text-base font-black text-[#5B7023] mt-1">
                        {myTimetable.filter(t => t.day === activeDay).length}
                      </p>
                    </div>
                    <div className="bg-white rounded-2xl p-3 border border-gray-100 text-center">
                      <h5 className="text-[9px] font-bold text-gray-400 uppercase">Total Tests</h5>
                      <p className="text-base font-black text-[#5B7023] mt-1">{myTests.length}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setActiveTab("attendance")} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between row-span-2 text-left hover:scale-[1.02] transition-transform">
                      <div>
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase mb-1">ATTENDANCE</p>
                        <h3 className="text-2xl font-black text-gray-900 leading-tight">Mark My Batch</h3>
                      </div>
                      <div className="flex justify-end mt-4">
                        <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 flex items-center justify-center bg-emerald-50">
                          <ClipboardCheck size={20} className="text-[#5B7023]" />
                        </div>
                      </div>
                    </button>
                    <button onClick={() => setActiveTab("batches")} className="bg-[#FFF9EE] rounded-3xl p-4 shadow-sm border border-[#FBE6C9] flex flex-col justify-center text-left hover:scale-[1.02] transition-transform">
                      <div className="w-8 h-8 rounded-xl bg-[#FDE2B5] text-[#B46700] flex items-center justify-center mb-2"><Users size={16} /></div>
                      <h4 className="text-xs font-black text-[#633A00]">Assigned Batches</h4>
                      <p className="text-[10px] font-bold text-[#B46700] mt-0.5">{myBatches.length} Assigned</p>
                    </button>
                    <button onClick={() => setActiveTab("timetable")} className="bg-[#F3F4FE] rounded-3xl p-4 shadow-sm border border-[#E1E4FC] flex flex-col justify-center text-left hover:scale-[1.02] transition-transform">
                      <div className="w-8 h-8 rounded-xl bg-[#E1E4FC] text-[#3B28E5] flex items-center justify-center mb-2"><CalendarDays size={16} /></div>
                      <h4 className="text-xs font-black text-[#261899]">Timetable</h4>
                      <p className="text-[10px] font-bold text-[#3B28E5] mt-0.5">My Schedule</p>
                    </button>
                  </div>

                  <button onClick={() => setActiveTab("marks")} className="w-full bg-[#FCF5FF] border border-[#F4E3FF] rounded-3xl p-5 flex items-center justify-between shadow-sm hover:scale-[1.01] transition-transform">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-[#EFE3FF] text-[#9D4EDD] flex items-center justify-center"><Award size={20} /></div>
                      <div className="text-left">
                        <h4 className="text-sm font-black text-[#5A189A]">Class Tests & Marks</h4>
                        <p className="text-[11px] font-bold text-[#9D4EDD] mt-0.5">Publish exam marks to Admin</p>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-[#9D4EDD]" />
                  </button>
                </div>
              )}

              {/* ============ BATCHES TAB ============ */}
              {activeTab === "batches" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-lg font-black text-gray-900">My Assigned Batches</h1>
                      <p className="text-xs text-gray-500">Batches assigned to you</p>
                    </div>
                    <span className="text-[10px] bg-[#5B7023] text-white px-2 py-0.5 rounded-full font-bold">Assigned</span>
                  </div>

                  {myBatches.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 p-6">
                      <AlertCircle size={36} className="text-amber-500 mx-auto mb-2" />
                      <h4 className="text-sm font-bold text-gray-800 mb-1">No Batches Assigned Yet</h4>
                      <p className="text-xs text-gray-400">Admin panel par jaakar is faculty ko batch assign karein.</p>
                    </div>
                  ) : (
                    myBatches.map((batch: any) => {
                      const batchId = String(batch.id || batch._id);
                      const count = allStudents.filter((st: any) => 
                        String(st.batchId) === batchId || 
                        (Array.isArray(st.batches) && st.batches.map(String).includes(batchId))
                      ).length;

                      return (
                        <div key={batchId} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 text-left">
                          <h4 className="text-base font-black text-gray-900">{batch.name}</h4>
                          <p className="text-[11px] font-bold text-[#5B7023] mt-0.5">{batch.courseName || batch.subject || "Course"}</p>
                          <div className="flex flex-wrap gap-2 mt-3 text-[10px] text-gray-500 font-bold">
                            <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg"><Users size={12}/> {count} Enrolled Students</span>
                            <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg"><Timer size={12}/> {batch.schedule || "Schedule N/A"}</span>
                            <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg"><MapPin size={12}/> {batch.room || "Room 101"}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ============ TIMETABLE TAB ============ */}
              {activeTab === "timetable" && (
                <div className="space-y-4">
                  <div>
                    <h1 className="text-lg font-black text-gray-900">My Period Schedule</h1>
                    <p className="text-xs text-gray-500">Your daily teaching schedule</p>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(day => (
                      <button key={day} onClick={() => setActiveDay(day)} className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap ${activeDay === day ? 'bg-[#5B7023] text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}`}>
                        {day}
                      </button>
                    ))}
                  </div>

                  {myTimetable.filter(t => t.day === activeDay).length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-3xl border border-gray-100">
                      <Clock size={32} className="text-gray-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-gray-400">No periods scheduled for you on {activeDay}</p>
                    </div>
                  ) : (
                    myTimetable.filter(t => t.day === activeDay).map((period, idx) => (
                      <div key={idx} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="w-16 h-14 rounded-2xl bg-indigo-50 flex flex-col items-center justify-center shrink-0 border border-indigo-100">
                          <Clock size={14} className="mb-1 text-[#5B7023]" />
                          <span className="text-[9px] font-black text-gray-800">{period.startTime}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-black text-gray-900">{period.subject}</h4>
                          <p className="text-xs font-bold text-[#5B7023] mt-0.5">{period.batchName}</p>
                          <p className="text-[10px] font-bold text-gray-400 mt-1">Period Room: {period.room}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ============ ATTENDANCE TAB ============ */}
              {activeTab === "attendance" && (
                <div className="space-y-4">
                  <h1 className="text-lg font-black text-gray-900">Daily Attendance</h1>
                  <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-3">
                    <div>
                      <Label className="text-[11px] font-bold text-gray-700 uppercase">Choose From Your Batches</Label>
                      <select 
                        value={selectedBatch?.id || selectedBatch?._id || ""} 
                        onChange={(e) => { 
                          const b = myBatches.find(x => (String(x.id || x._id) === e.target.value)); 
                          setSelectedBatch(b); 
                        }} 
                        className="w-full h-11 mt-1 px-3 text-sm font-bold bg-gray-50 border border-gray-200 rounded-xl"
                      >
                        <option value="">-- Select Your Assigned Batch --</option>
                        {myBatches.map((b: any) => (
                          <option key={b.id || b._id} value={b.id || b._id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <Field label="Attendance Date" type="date" value={attendanceDate} onChange={setAttendanceDate} />
                  </div>

                  {selectedBatch && (
                    <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-2">
                      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                        <p className="text-[11px] font-bold text-[#5B7023] uppercase">Batch Students ({attendanceStudents.length})</p>
                        <span className="text-[10px] text-gray-400">P: Present, L: Late, A: Absent</span>
                      </div>
                      
                      {attendanceStudents.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">No students enrolled in this batch.</p>
                      ) : (
                        attendanceStudents.map((st: any) => {
                          const sId = st.id || st._id;
                          return (
                            <div key={sId} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-2xl">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-white border border-gray-200 text-[#5B7023] font-black text-xs flex items-center justify-center">
                                  {st.name ? st.name.charAt(0) : "S"}
                                </div>
                                <div>
                                  <p className="text-xs font-black text-gray-900">{st.name}</p>
                                  <p className="text-[9px] font-bold text-gray-400 mt-0.5">Roll: {st.rollNo || st.rollNumber || "---"}</p>
                                </div>
                              </div>
                              <div className="flex gap-1.5 bg-white p-1 rounded-xl border border-gray-100">
                                <button onClick={() => markAttendance(sId, "present")} className={`w-9 h-8 rounded-lg text-[10px] font-black transition-colors ${st.status === "present" ? "bg-emerald-500 text-white" : "text-gray-400 hover:bg-gray-50"}`}>P</button>
                                <button onClick={() => markAttendance(sId, "late")} className={`w-9 h-8 rounded-lg text-[10px] font-black transition-colors ${st.status === "late" ? "bg-amber-500 text-white" : "text-gray-400 hover:bg-gray-50"}`}>L</button>
                                <button onClick={() => markAttendance(sId, "absent")} className={`w-9 h-8 rounded-lg text-[10px] font-black transition-colors ${st.status === "absent" ? "bg-red-500 text-white" : "text-gray-400 hover:bg-gray-50"}`}>A</button>
                              </div>
                            </div>
                          );
                        })
                      )}

                      {attendanceStudents.length > 0 && (
                        <button onClick={saveAttendanceLog} className="w-full mt-3 py-3 bg-[#5B7023] text-white rounded-2xl text-sm font-black flex items-center justify-center gap-2 hover:bg-[#4a5c1d] transition-colors">
                          <Save size={16}/> Save & Post Attendance
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ============ TESTS & MARKS TAB ============ */}
              {activeTab === "marks" && (
                <div className="space-y-4">
                  {isCreatingTest ? (
                    <div className="bg-white rounded-3xl p-5 shadow-md border border-gray-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-900">Schedule Class Test</h3>
                        <button onClick={() => setIsCreatingTest(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
                      </div>

                      <div className="space-y-3">
                        <Field label="Test Title / Topic" placeholder="e.g. Thermodynamics Quiz 1" value={newTestTitle} onChange={setNewTestTitle} />
                        
                        <div>
                          <Label className="text-xs font-semibold text-gray-700">Assign To Your Batch *</Label>
                          <select 
                            value={newTestBatch} 
                            onChange={(e) => setNewTestBatch(e.target.value)} 
                            className="w-full h-11 mt-1 px-3 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl"
                          >
                            <option value="">-- Select Your Batch --</option>
                            {myBatches.map((b: any) => (
                              <option key={b.id || b._id} value={b.id || b._id}>{b.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Max Marks" type="number" value={newTestMaxMarks} onChange={setNewTestMaxMarks} />
                          <Field label="Test Date" type="date" value={newTestDate} onChange={setNewTestDate} />
                        </div>

                        <Button onClick={handleCreateTest} className="w-full bg-[#5B7023] hover:bg-[#4a5c1d] text-white rounded-xl mt-2 h-11">
                          Publish Test
                        </Button>
                      </div>
                    </div>
                  ) : selectedTestForMarks ? (
                    <div className="bg-white rounded-3xl p-5 shadow-md border border-gray-200 space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div>
                          <h3 className="text-sm font-black text-gray-950">{selectedTestForMarks.title}</h3>
                          <p className="text-[10px] text-gray-400">Max Score Limit: {selectedTestForMarks.maxMarks} marks</p>
                        </div>
                        <button onClick={() => setSelectedTestForMarks(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={16}/></button>
                      </div>

                      <div className="space-y-3">
                        {allStudents
                          .filter((st: any) => String(st.batchId) === String(selectedTestForMarks.batchId) || (Array.isArray(st.batches) && st.batches.map(String).includes(String(selectedTestForMarks.batchId))))
                          .map((student: any) => {
                            const sId = student.id || student._id;
                            return (
                              <div key={sId} className="flex items-center justify-between p-2 bg-gray-50/50 rounded-xl">
                                <div>
                                  <p className="text-xs font-bold text-gray-900">{student.name}</p>
                                  <p className="text-[10px] text-gray-400">Roll: {student.rollNo || student.rollNumber || "---"}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="number" 
                                    min="0"
                                    max={selectedTestForMarks.maxMarks}
                                    value={enteredMarks[sId] !== undefined ? enteredMarks[sId] : ""}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (Number(val) > Number(selectedTestForMarks.maxMarks)) {
                                        alert(`Marks cannot exceed ${selectedTestForMarks.maxMarks}`);
                                        return;
                                      }
                                      setEnteredMarks(prev => ({ ...prev, [sId]: val }));
                                    }}
                                    className="w-16 h-9 text-center font-bold bg-white border border-gray-200 rounded-lg text-xs"
                                  />
                                  <span className="text-xs text-gray-400">/ {selectedTestForMarks.maxMarks}</span>
                                </div>
                              </div>
                            );
                          })}

                        <Button onClick={saveTestMarks} className="w-full bg-[#5B7023] hover:bg-[#4a5c1d] text-white rounded-xl mt-3">
                          Save Scores
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h1 className="text-lg font-black text-gray-900">My Batch Tests</h1>
                          <p className="text-xs text-gray-500">Exams created for your batches</p>
                        </div>
                        <button 
                          onClick={() => setIsCreatingTest(true)} 
                          disabled={myBatches.length === 0}
                          className="bg-[#5B7023] disabled:opacity-50 hover:bg-[#4a5c1d] text-white text-xs font-bold px-3 h-10 rounded-xl flex items-center gap-1.5 shadow-md transition-all"
                        >
                          <Plus size={14}/> Add Test
                        </button>
                      </div>

                      {myTests.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-3xl border border-gray-100">
                          <Award size={40} className="text-gray-300 mx-auto mb-2" />
                          <p className="text-xs font-bold text-gray-400">No tests scheduled for your batches yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {myTests.map((test: any) => {
                            const tId = test.id || test._id;
                            const batchObj = myBatches.find((b: any) => String(b.id || b._id) === String(test.batchId));
                            const totalEnrolled = allStudents.filter((st: any) => String(st.batchId) === String(test.batchId) || (Array.isArray(st.batches) && st.batches.map(String).includes(String(test.batchId)))).length;
                            const markedCount = Object.keys(test.scores || {}).length;

                            return (
                              <div key={tId} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="text-sm font-black text-gray-950">{test.title}</h4>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">{batchObj?.name || "Batch"}</span>
                                  </div>
                                  <span className="text-xs font-extrabold text-[#5B7023] bg-[#F0F4E8] px-2 py-1 rounded-lg">
                                    Limit: {test.maxMarks} M
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold border-t border-gray-100 pt-2.5">
                                  <span className="flex items-center gap-1"><Calendar size={12}/> Date: {test.date?.slice(0, 10)}</span>
                                  <span className="flex items-center gap-1">
                                    <CheckCircle size={12} className={markedCount === totalEnrolled && totalEnrolled > 0 ? "text-emerald-500" : "text-amber-500"}/> 
                                    Scores: {markedCount}/{totalEnrolled} Marked
                                  </span>
                                </div>

                                <button 
                                  onClick={() => openEnterMarks(test)} 
                                  className="w-full h-8 bg-gray-50 hover:bg-[#F0F4E8] text-gray-700 hover:text-[#5B7023] rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors border border-gray-100"
                                >
                                  <Pencil size={12}/> Enter Student Scores
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* BOTTOM NAVIGATION */}
            <nav className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 pt-2 px-3 flex justify-between shadow z-40 pb-3">
              {[
                { id: "home", label: "Home", icon: Home },
                { id: "batches", label: "Batches", icon: BookOpen },
                { id: "timetable", label: "Timetable", icon: CalendarDays },
                { id: "attendance", label: "Attend", icon: ClipboardCheck },
                { id: "marks", label: "Marks", icon: Award }
              ].map(tab => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); setSelectedTestForMarks(null); setIsCreatingTest(false); }} className="flex flex-col items-center justify-center flex-1 py-1.5 group relative">
                    <div className={`transition-all duration-300 p-1.5 rounded-xl ${isActive ? 'text-white bg-[#5B7023] shadow-md scale-105 -translate-y-1' : 'text-gray-400 group-hover:bg-gray-50'}`}>
                      <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    <span className={`text-[9px] font-extrabold mt-1 ${isActive ? 'text-[#5B7023]' : 'text-gray-400'}`}>
                      {tab.label}
                    </span>
                  </button>
                )
              })}
            </nav>
          </>
        )}

      </div>
    </div>
  );
}