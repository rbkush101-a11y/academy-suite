import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { 
  Bell, User, LogOut, ClipboardCheck, BookOpen, 
  ChevronRight, Home, CheckCircle2, X, Plus, 
  Search, Award, Loader2, Save, ShieldCheck, Upload,
  MapPin, IndianRupee, FolderOpen, FileText, Mail, Phone,
  Briefcase, ClipboardList, AlarmClock, Timer, ChevronDown, 
  Check, Eye, EyeOff, KeyRound, DownloadCloud, UserRound, 
  Lock, CalendarDays, Users, Clock, Calendar, ArrowLeft, Pencil, Trash2,
  Sparkles, FileUp, Info, GraduationCap, CheckCircle, HelpCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// ======================== DATA CONSTANTS ========================
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

const AVAILABLE_BATCHES = [
  { label: "Class 10 - Mathematics", value: "class-10-maths" },
  { label: "Class 12 - Physics", value: "class-12-physics" },
  { label: "JEE Main Batch 2025", value: "jee-2025" },
  { label: "NEET Foundation", value: "neet-foundation" },
  { label: "Class 9 - Science", value: "class-9-science" },
];

// Seed Mock Students Data
const MOCK_STUDENTS = [
  { id: "st-1", name: "Aarav Sharma", rollNo: "101", batches: ["class-10-maths", "class-9-science"] },
  { id: "st-2", name: "Ananya Iyer", rollNo: "102", batches: ["class-10-maths", "jee-2025"] },
  { id: "st-3", name: "Kabir Mehta", rollNo: "103", batches: ["class-10-maths", "neet-foundation"] },
  { id: "st-4", name: "Riya Verma", rollNo: "104", batches: ["class-12-physics", "jee-2025"] },
  { id: "st-5", name: "Dev Patel", rollNo: "105", batches: ["class-12-physics", "neet-foundation"] },
];

type StaffDocument = { label: string; name: string; dataUrl: string; mimeType: string; };

type StaffForm = {
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

// ======================== FIELD COMPONENTS ========================
function Field({ label, value, onChange, type = "text", placeholder = "", required = false, disabled = false, autoComplete }: any) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Input 
        type={type} 
        value={value || ""} 
        placeholder={placeholder} 
        disabled={disabled} 
        autoComplete={autoComplete}
        onChange={(e) => onChange && onChange(e.target.value)} 
        className={`text-sm ${disabled ? 'bg-gray-100 text-gray-500 border-transparent' : 'bg-gray-50/50'}`} 
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
          value={value || ""} 
          placeholder={placeholder}
          onChange={(e) => onChange && onChange(e.target.value)} 
          className="w-full px-2.5 py-2 text-sm outline-none bg-transparent font-medium text-gray-800" 
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
        className={`w-full h-10 px-3 text-sm border border-gray-200 rounded-md flex items-center justify-between text-left shadow-sm ${disabled ? 'bg-gray-100 text-gray-400' : 'bg-gray-50/50'}`}
      >
        <span className={value ? "text-gray-900 truncate" : "text-gray-400"}>{value || placeholder}</span>
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
      <div onClick={() => setIsOpen(!isOpen)} className="min-h-10 w-full p-2 border border-gray-200 rounded-md bg-gray-50/50 flex flex-wrap gap-1.5 items-center cursor-pointer">
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

// ======================== MAIN COMPONENT ========================
export default function TeacherDashboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"home" | "batches" | "timetable" | "attendance" | "marks" | "profile">("home");
  const [toastMsg, setToastMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [teacherHeader, setTeacherHeader] = useState({ name: "Siddharth Verma", empId: "TCH-2024-089" });
  
  const [form, setForm] = useState<StaffForm>({
    ...blankForm,
    firstName: "Siddharth",
    lastName: "Verma",
    email: "siddharth@academy.in",
    phone: "9876543210",
    role: "Teacher / Faculty",
    subject: "Mathematics",
    qualification: "PG, B.Ed",
    experience: "5",
    joinDate: "2023-08-15",
    workTimingFrom: "08:30",
    workTimingTo: "16:30",
    status: "active",
    employmentType: "full_time",
    monthlySalary: "52000",
    empId: "TCH-2024-089",
    username: "siddharth_faculty",
    localAddress: "12/A, Tech Park Residency",
    localState: "Delhi",
    localDistrict: "New Delhi",
    localPin: "110001",
    permanentAddress: "12/A, Tech Park Residency",
    permanentState: "Delhi",
    permanentDistrict: "New Delhi",
    permanentPin: "110001",
    bloodGroup: "O+",
    batches: ["class-10-maths", "class-12-physics"],
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sameAsCorrespondence, setSameAsCorrespondence] = useState(true);
  const [newDocLabel, setNewDocLabel] = useState("");
  
  const docFileRef = useRef<HTMLInputElement>(null);
  const aadhaarFileRef = useRef<HTMLInputElement>(null);
  const panFileRef = useRef<HTMLInputElement>(null);

  const setValue = (key: keyof StaffForm, value: any) => setForm((old) => ({ ...old, [key]: value }));

  // Dynamic state databases loaded from/synced to LocalStorage
  const [globalBatches, setGlobalBatches] = useState<any[]>([]);
  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  const [testRecords, setTestRecords] = useState<any[]>([]);

  // State elements for Marks & Test creation flow
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [newTestTitle, setNewTestTitle] = useState("");
  const [newTestMaxMarks, setNewTestMaxMarks] = useState("100");
  const [newTestBatch, setNewTestBatch] = useState("");
  const [newTestDate, setNewTestDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedTestForMarks, setSelectedTestForMarks] = useState<any>(null);
  const [enteredMarks, setEnteredMarks] = useState<Record<string, string>>({});

  // Initial Load Database Setup Simulation (Admin Sync Layer)
  useEffect(() => {
    // Sync Staff profiles
    const savedStaff = localStorage.getItem("admin_staff_members");
    if (savedStaff) {
      const parsed = JSON.parse(savedStaff);
      const matched = parsed.find((s: any) => s.empId === form.empId || s.username === form.username);
      if (matched) {
        setForm(matched);
        setTeacherHeader({ name: `${matched.firstName} ${matched.lastName}`, empId: matched.empId });
      } else {
        parsed.push(form);
        localStorage.setItem("admin_staff_members", JSON.stringify(parsed));
      }
    } else {
      localStorage.setItem("admin_staff_members", JSON.stringify([form]));
    }

    // Sync Batches
    const savedBatches = localStorage.getItem("admin_batches");
    const defaultBatches = [
      { id: "class-10-maths", name: "Class 10 - Mathematics", subject: "Mathematics", timing: "09:00 AM - 10:00 AM", room: "Room 102", teacherId: "TCH-2024-089" },
      { id: "class-12-physics", name: "Class 12 - Physics Booster", subject: "Physics", timing: "11:00 AM - 12:30 PM", room: "Lab A", teacherId: "TCH-2024-089" },
      { id: "jee-2025", name: "JEE Main Batch 2025", subject: "Mathematics", timing: "02:00 PM - 04:00 PM", room: "Hall B", teacherId: "TCH-2024-089" }
    ];
    if (savedBatches) {
      setGlobalBatches(JSON.parse(savedBatches));
    } else {
      localStorage.setItem("admin_batches", JSON.stringify(defaultBatches));
      setGlobalBatches(defaultBatches);
    }

    // Sync Attendance
    const savedAttendance = localStorage.getItem("admin_attendance_records");
    if (savedAttendance) {
      setAllAttendance(JSON.parse(savedAttendance));
    } else {
      localStorage.setItem("admin_attendance_records", JSON.stringify([]));
    }

    // Sync Test Records & Marks
    const savedTests = localStorage.getItem("admin_test_records");
    const initialTests = [
      { id: "test-1", title: "Algebra Unit Test 1", batchId: "class-10-maths", maxMarks: "50", date: "2024-09-12", scores: { "st-1": "45", "st-2": "42", "st-3": "38" } }
    ];
    if (savedTests) {
      setTestRecords(JSON.parse(savedTests));
    } else {
      localStorage.setItem("admin_test_records", JSON.stringify(initialTests));
      setTestRecords(initialTests);
    }
  }, []);

  // Filter batches assigned to this specific teacher
  const myBatches = useMemo(() => {
    return globalBatches.filter(b => form.batches?.includes(b.id));
  }, [globalBatches, form.batches]);

  // Timetable computation
  const myTimetable = useMemo(() => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return myBatches.map((b, index) => ({
      day: days[index % days.length],
      startTime: b.timing.split(" - ")[0],
      endTime: b.timing.split(" - ")[1],
      subject: b.subject,
      batchName: b.name,
      room: b.room,
      batchId: b.id
    }));
  }, [myBatches]);

  const [activeDay, setActiveDay] = useState<string>(new Date().toLocaleDateString('en-US', { weekday: 'long' }));
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [attendanceStudents, setAttendanceStudents] = useState<any[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(""), 3000); };

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

  // Save changes back to LocalStorage
  const save = async () => {
    if (!form.firstName?.trim()) { setMessage("First Name is required."); return; }
    if (!form.phone?.trim()) { setMessage("Mobile Number is required."); return; }
    if (form.password?.trim().length > 0) {
      if (form.password.length < 6) { setMessage("Password must be 6+ characters."); return; }
      if (form.password !== form.confirmPassword) { setMessage("Passwords do not match!"); return; }
    }
    setMessage("");
    setSaving(true);
    setTimeout(() => {
      const fullName = `${form.firstName?.trim() || ""} ${form.lastName?.trim() || ""}`.trim();
      setTeacherHeader({ name: fullName, empId: form.empId });
      setValue("password", ""); 
      setValue("confirmPassword", "");

      const savedStaff = localStorage.getItem("admin_staff_members");
      let list = savedStaff ? JSON.parse(savedStaff) : [];
      list = list.map((s: any) => s.empId === form.empId ? { ...form, name: fullName } : s);
      localStorage.setItem("admin_staff_members", JSON.stringify(list));

      showToast("Profile updated and Synced to Admin Panel!");
      setActiveTab("home");
      setSaving(false);
    }, 800);
  };

  // FIX 1: Cancel function to reset dirty form state
  const handleCancelProfile = () => {
    setMessage("");
    const savedStaff = localStorage.getItem("admin_staff_members");
    if (savedStaff) {
      const parsed = JSON.parse(savedStaff);
      const matched = parsed.find((s: any) => s.empId === form.empId || s.username === form.username);
      if (matched) {
        setForm(matched);
      }
    }
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

  // Get active student records for selected batch
  useEffect(() => {
    if (!selectedBatch) return;
    const batchStudents = MOCK_STUDENTS.filter(st => st.batches.includes(selectedBatch.id));
    
    const existingLog = allAttendance.find(log => log.batchId === selectedBatch.id && log.date === attendanceDate);
    
    if (existingLog) {
      setAttendanceStudents(batchStudents.map(st => ({
        ...st,
        status: existingLog.records[st.id] || "unmarked"
      })));
    } else {
      setAttendanceStudents(batchStudents.map(st => ({ ...st, status: "unmarked" })));
    }
  }, [selectedBatch, attendanceDate, allAttendance]);

  const markAttendance = (studentId: string, status: string) => {
    setAttendanceStudents(attendanceStudents.map(s => s.id === studentId ? { ...s, status } : s));
  };

  // Save attendance
  const saveAttendanceLog = () => {
    if (!selectedBatch) return;
    const recordsObj: Record<string, string> = {};
    attendanceStudents.forEach(st => { recordsObj[st.id] = st.status; });

    const newLog = {
      id: `att-${Date.now()}`,
      batchId: selectedBatch.id,
      batchName: selectedBatch.name,
      date: attendanceDate,
      markedBy: form.empId,
      records: recordsObj
    };

    const updatedLogs = allAttendance.filter(log => !(log.batchId === selectedBatch.id && log.date === attendanceDate));
    const finalList = [...updatedLogs, newLog];

    setAllAttendance(finalList);
    localStorage.setItem("admin_attendance_records", JSON.stringify(finalList));
    showToast(`Attendance synced with Admin successfully!`);
  };

  // Create Test Flow
  const handleCreateTest = () => {
    if (!newTestTitle.trim()) { alert("Please enter test title"); return; }
    if (!newTestBatch) { alert("Please select batch"); return; }

    const newTest = {
      id: `test-${Date.now()}`,
      title: newTestTitle,
      batchId: newTestBatch,
      maxMarks: newTestMaxMarks,
      date: newTestDate,
      scores: {}
    };

    const updatedTests = [...testRecords, newTest];
    setTestRecords(updatedTests);
    localStorage.setItem("admin_test_records", JSON.stringify(updatedTests));
    
    setNewTestTitle("");
    setIsCreatingTest(false);
    showToast("New Test published to Admin Board!");
  };

  const openEnterMarks = (test: any) => {
    setSelectedTestForMarks(test);
    setEnteredMarks(test.scores || {});
  };

  const saveTestMarks = () => {
    if (!selectedTestForMarks) return;

    const updatedTests = testRecords.map(t => {
      if (t.id === selectedTestForMarks.id) {
        return { ...t, scores: enteredMarks };
      }
      return t;
    });

    setTestRecords(updatedTests);
    localStorage.setItem("admin_test_records", JSON.stringify(updatedTests));
    setSelectedTestForMarks(null);
    showToast("Marks updated & synced with Admin database!");
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#EBEFE6] flex justify-center font-sans overflow-hidden">
      <div className="w-full max-w-[480px] bg-[#EBEFE6] h-full shadow-2xl relative flex flex-col overflow-hidden text-gray-800">

        {/* ============ PROFILE FORM ============ */}
        {activeTab === "profile" ? (
          <>
            {/* STICKY TOP */}
            <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm w-full shrink-0">
              <div className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* FIX 1: Used handleCancelProfile instead of backToList */}
                  <button type="button" onClick={handleCancelProfile} className="p-2 hover:bg-gray-100 rounded-xl text-gray-600 transition shrink-0">
                    <ArrowLeft size={20} />
                  </button>
                  <div className="min-w-0">
                    <h1 className="text-base font-bold text-[#5B7023] leading-tight">Edit Staff Profile</h1>
                    <p className="text-xs text-gray-500 leading-tight mt-0.5">Personal, profile, and system settings</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button onClick={save} disabled={saving} className="bg-[#5B7023] hover:bg-[#4a5c1d] text-white rounded-xl gap-2 shadow-md transition-all h-9 px-4 text-xs">
                    <Save size={14} /> {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </div>

            {/* MAIN CONTENT AREA */}
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
                  <div className="w-24 h-24 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400"><UserRound size={40} /></div>
                )}
                <div className="text-center sm:text-left">
                  <h3 className="font-bold text-gray-800 text-base">Profile Photo</h3>
                  <p className="text-sm text-gray-500 mb-3">Allowed: JPEG or PNG under 1.5MB</p>
                  <Label className="cursor-pointer bg-[#F0F4E8] text-[#5B7023] hover:bg-[#5B7023] hover:text-white px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-all">
                    <Upload size={14} /> Choose Image File
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => photoChange(e.target.files?.[0])} />
                  </Label>
                </div>
              </div>

              {/* SECTION 1 */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
                <div className="bg-[#F4F7EE] px-6 py-3 border-b border-gray-200/50 rounded-t-2xl">
                  <h3 className="font-semibold text-[#5B7023]">1. Personal & Contact Details</h3>
                </div>
                <div className="p-6 grid grid-cols-1 gap-5">
                  <Field label="First Name" value={form.firstName} onChange={(v: string) => setValue("firstName", v)} required />
                  <Field label="Last Name" value={form.lastName} onChange={(v: string) => setValue("lastName", v)} />
                  <Field label="Date of Birth" value={form.dateOfBirth} onChange={(v: string) => setValue("dateOfBirth", v)} type="date" />
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Gender</Label>
                    <Select value={form.gender} onValueChange={(v) => { setValue("gender", v); if(v !== "other") setValue("otherGender", ""); }}>
                      <SelectTrigger className="bg-gray-50/50"><SelectValue placeholder="Select Gender" /></SelectTrigger>
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

              {/* SECTION 2 */}
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
                  
                  {/* EDUCATIONAL QUALIFICATIONS BLOCK */}
                  <div className="bg-gray-50/50 border border-gray-100 p-4 rounded-xl space-y-3">
                    <Label className="text-xs font-semibold text-gray-700">Educational Qualifications (Select multiple if applicable)</Label>
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
                    {selectedQualifications.includes("Other") && (
                      <div className="pt-2">
                        <Label className="text-xs font-semibold text-[#5B7023] mb-1 block">Please specify other qualification *</Label>
                        <Input value={form.otherQualification} onChange={(e) => setValue("otherQualification", e.target.value)} placeholder="e.g. M.Phil, CA, CS, Certificate..." className="text-sm bg-[#F4F7EE] border-[#5B7023] h-9" />
                      </div>
                    )}

                    {selectedQualifications.length > 0 && (
                      <div className="pt-4 mt-4 border-t border-gray-200">
                        <Label className="text-xs font-semibold text-gray-700 mb-3 block">Upload Qualification Documents (Optional)</Label>
                        <div className="grid grid-cols-1 gap-3">
                          {selectedQualifications.map((qual) => {
                            const docLabel = qual === "Other" ? (form.otherQualification.trim() ? `${form.otherQualification.trim()} Certificate` : "Other Qualification Certificate") : `${qual} Certificate`;
                            const existingDoc = form.documents.find(d => d.label === docLabel);

                            return (
                              <div key={qual} className="bg-white border border-gray-200 p-2.5 rounded-lg flex flex-col justify-center gap-2">
                                <span className="text-[11px] font-bold text-gray-800">{qual === "Other" ? (form.otherQualification || "Other") : qual} Certificate</span>
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
                                      <Upload size={12} /> Upload File
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

                  {/* BATCH ASSIGNMENT MULTI-SELECT */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Assign Batches (Optional)</Label>
                    <MultiSearchableSelect 
                      options={AVAILABLE_BATCHES} 
                      value={form.batches} 
                      onChange={(v: string[]) => setValue("batches", v)} 
                      placeholder="Search and assign batches..."
                    />
                  </div>

                  <Field label="Subject Specialization" value={form.subject} onChange={(v: string) => setValue("subject", v)} placeholder="e.g. Mathematics" />
                  <Field label="Prior Experience (Years)" value={form.experience} onChange={(v: string) => setValue("experience", v)} type="number" />
                  <Field label="Start / Join Date" value={form.joinDate} onChange={(v: string) => setValue("joinDate", v)} type="date" required />
                  <Field label="Working Shifts From" value={form.workTimingFrom} onChange={(v: string) => setValue("workTimingFrom", v)} type="time" />
                  <Field label="Working Shifts To" value={form.workTimingTo} onChange={(v: string) => setValue("workTimingTo", v)} type="time" />
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Current System Status</Label>
                    <Select value={form.status} onValueChange={(v: any) => setValue("status", v)}>
                      <SelectTrigger className="bg-gray-50/50"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                    </Select>
                  </div>

                  {/* EMPLOYMENT TYPE & PAYROLL */}
                  <div className="mt-4">
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-indigo-50/40 px-5 py-3.5 border-b border-gray-200 flex items-center gap-2.5">
                        <Briefcase size={16} className="text-indigo-600" />
                        <h3 className="font-bold text-indigo-950 text-sm">Employment Type <span className="text-red-500">*</span></h3>
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
                          <div className="mb-4 flex items-start gap-2 bg-indigo-50/60 p-3 rounded-lg border border-indigo-100/60">
                            <Info size={14} className="text-indigo-600 mt-0.5 shrink-0" />
                            <p className="text-[11px] text-indigo-900 leading-tight">
                              {form.employmentType === 'full_time' && "Payroll = Monthly Salary × (Present Days ÷ Working Days). PF & TDS deducted on gross."}
                              {form.employmentType === 'contractual' && "Payroll = Per-Class Rate × Total Classes Taken. No base salary."}
                              {form.employmentType === 'hybrid' && "Payroll = (Base × 50% attendance) + (Per-Class Rate × Classes). Both components apply."}
                              {form.employmentType === 'hourly' && "Payroll = Hourly Rate × Total Hours Worked. Hours computed from attendance start & end times."}
                            </p>
                          </div>

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
                                <PayrollInput label="TDS Deduction (%)" subtext="Contractual TDS typically 10%" suffix="%" type="number" value={form.tdsDeduction} onChange={(v: string) => setValue("tdsDeduction", v)} />
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

                  {/* CORRESPONDENCE ADDRESS */}
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
                    <Field label="PAN Number (Optional)" value={form.panNumber} onChange={(v: string) => setValue("panNumber", v.toUpperCase().slice(0, 10))} placeholder="ABCDE1234F" />
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
                    <Label className="text-xs font-semibold text-gray-700">Blood Group (Optional)</Label>
                    <Select value={form.bloodGroup} onValueChange={(v) => setValue("bloodGroup", v)}>
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
                  <span className="text-[10px] font-bold px-2 py-1 bg-blue-50 text-blue-600 rounded uppercase tracking-wider">Payroll Info</span>
                </div>
                <div className="p-6 space-y-5">
                  <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-xl flex items-start gap-2">
                    <ShieldCheck size={14} className="text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-blue-800 leading-relaxed">Ye details salary transfer ke liye use hongi. Please double-check karein ki account details sahi hain.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-5">
                    <Field label="Account Holder Name" value={form.accountName} onChange={(v: string) => setValue("accountName", v)} placeholder="As per bank passbook" />
                    <Field label="Bank Name" value={form.bankName} onChange={(v: string) => setValue("bankName", v)} placeholder="e.g. State Bank of India" />
                    <Field label="Branch Name" value={form.bankBranch} onChange={(v: string) => setValue("bankBranch", v)} placeholder="e.g. Connaught Place Branch" />
                    <Field label="Account Number" value={form.accountNumber} onChange={(v: string) => setValue("accountNumber", v.replace(/\D/g, ""))} placeholder="Bank account number" />
                    <Field label="IFSC Code" value={form.ifscCode} onChange={(v: string) => setValue("ifscCode", v.toUpperCase().slice(0, 11))} placeholder="e.g. SBIN0001234" />
                    <Field label="UPI ID (Optional)" value={form.upiId} onChange={(v: string) => setValue("upiId", v)} placeholder="e.g. name@upi" />
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
                  <span className="text-[10px] font-bold px-2 py-1 bg-[#F0F4E8] text-[#5B7023] rounded uppercase tracking-wider">{userDocuments.length} {userDocuments.length === 1 ? "File" : "Files"}</span>
                </div>
                <div className="p-6 space-y-5">
                  <div className="bg-amber-50/50 border border-amber-100 p-3 rounded-xl flex items-start gap-2">
                    <FileText size={14} className="text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-amber-800 leading-relaxed">Degree, Experience Letter, Resume, etc. upload karein. Max file size: 5MB per file.</p>
                  </div>
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
                  {userDocuments.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl bg-gray-50/30">
                      <FolderOpen size={32} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-xs font-semibold text-gray-500">No documents attached yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Attached Files ({userDocuments.length})</p>
                      <div className="grid grid-cols-1 gap-3">
                        {/* FIX 2: Stable unique key for document rendering */}
                        {userDocuments.map((doc, idx) => (
                          <div key={`${doc.label}-${doc.name}-${idx}`} className="flex items-center justify-between p-3 border border-gray-200 bg-white hover:bg-gray-50/50 rounded-xl transition-all group">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-9 h-9 bg-[#F0F4E8] rounded-lg flex items-center justify-center shrink-0"><FileText size={16} className="text-[#5B7023]" /></div>
                              <div className="min-w-0 flex-1"><p className="text-xs font-bold text-gray-800 truncate">{doc.label}</p><p className="text-[10px] text-gray-400 truncate">{doc.name}</p></div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              <a href={doc.dataUrl} download={doc.name} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors" title="Download"><DownloadCloud size={14} /></a>
                              <button type="button" onClick={() => handleRemoveDocument(idx)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors" title="Remove"><X size={14} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 7 - PORTAL CREDENTIALS */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
                <div className="bg-[#F4F7EE] px-6 py-3 border-b border-gray-100 rounded-t-2xl flex items-center justify-between">
                  <h3 className="font-semibold text-[#5B7023] flex items-center gap-2"><KeyRound size={16} /> 7. Portal Access Credentials</h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-semibold text-gray-600">{form.loginEnabled ? "System Portal Active" : "Portal Off"}</span>
                    <div className="relative">
                      <input type="checkbox" checked={form.loginEnabled} onChange={(e) => setValue("loginEnabled", e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[#5B7023] transition-colors"></div>
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                    </div>
                  </label>
                </div>
                {form.loginEnabled ? (
                  <div className="p-6 space-y-5">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex flex-col gap-4">
                      <div className="flex items-start gap-3">
                        <ShieldCheck size={18} className="text-blue-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-blue-800 leading-relaxed">Assigned credentials allow portal access. Ensure the pass is complex and minimum 6 character strings are entered.</p>
                      </div>
                      <Button type="button" onClick={handleGenerateCredentials} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 shrink-0 shadow-md transition self-start">
                        <Sparkles size={14} /> Auto-Generate
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-5">
                      <Field label="System Username *" value={form.username} onChange={(v: string) => setValue("username", v.toLowerCase().replace(/\s/g, ""))} required autoComplete="off" />
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Secure Password *</Label>
                        <div className="relative">
                          <Input type={showPassword ? "text" : "password"} value={form.password} onChange={(e: any) => setValue("password", e.target.value)} autoComplete="new-password" className="text-sm bg-gray-50/50 pr-10" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400">
                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Verify Password *</Label>
                        <div className="relative">
                          <Input type={showConfirmPassword ? "text" : "password"} value={form.confirmPassword} onChange={(e: any) => setValue("confirmPassword", e.target.value)} autoComplete="new-password" className="text-sm bg-gray-50/50 pr-10" />
                          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400">
                            {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                        {form.confirmPassword && form.password !== form.confirmPassword && <p className="text-[10px] font-semibold text-red-500 mt-1">❌ Passwords do not match</p>}
                        {form.confirmPassword && form.password === form.confirmPassword && <p className="text-[10px] font-semibold text-green-600 mt-1">✓ Credentials align</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Access Level Permission Role</Label>
                        <Select value={form.accessLevel} onValueChange={(v) => setValue("accessLevel", v)}>
                          <SelectTrigger className="text-sm bg-gray-50/50"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ACCESS_LEVELS.map((level) => (<SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-gray-50/20"><Lock size={28} className="mx-auto text-gray-300 mb-2" /><p className="text-xs text-gray-400 font-medium">Self service portal deactivated for this user.</p></div>
                )}
              </div>

            </div>
          </>
        ) : (
          <>
            {/* NON-PROFILE VIEW - Dashboard header */}
            <div onClick={() => setActiveTab("profile")} className="px-5 py-4 flex items-center justify-between bg-white border-b border-gray-200/60 shrink-0 z-30 shadow-sm cursor-pointer hover:bg-gray-50/80 transition">
              <div className="flex items-center gap-3">
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
                <div className="hidden xs:flex items-center gap-1 bg-[#F0F4E8] px-2.5 py-1 rounded-full border border-[#D8E1C8]">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  <span className="text-[9px] font-bold text-[#5B7023]">Sync Active</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleLogout(); }} className="w-8 h-8 flex items-center justify-center bg-red-50 rounded-full text-red-500 hover:bg-red-100"><LogOut size={16} /></button>
              </div>
            </div>

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
                    <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-[10px] font-extrabold uppercase mb-2">FACULTY STATUS</span>
                    <h2 className="text-xl font-black mb-1">{teacherHeader.name}</h2>
                    <p className="text-xs text-white/80 font-medium mb-4">{form.role || "Senior Faculty"}</p>
                    <div className="flex justify-between border-t border-white/20 pt-3 relative z-10">
                      <p className="text-[11px] font-medium">Emp ID: <span className="font-bold">{teacherHeader.empId}</span></p>
                      <button onClick={() => setActiveTab("profile")} className="text-[11px] font-bold flex items-center gap-1 hover:underline">Edit Profile <ChevronRight size={14} /></button>
                    </div>
                  </div>

                  {/* Dynamic Summary Row */}
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
                      <p className="text-base font-black text-[#5B7023] mt-1">{testRecords.length}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setActiveTab("attendance")} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between row-span-2 text-left hover:scale-[1.02] transition-transform">
                      <div>
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase mb-1">ATTENDANCE</p>
                        <h3 className="text-2xl font-black text-gray-900 leading-tight">Mark Log</h3>
                      </div>
                      <div className="flex justify-end mt-4">
                        <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 flex items-center justify-center bg-emerald-50">
                          <ClipboardCheck size={20} className="text-[#5B7023]" />
                        </div>
                      </div>
                    </button>
                    <button onClick={() => setActiveTab("batches")} className="bg-[#FFF9EE] rounded-3xl p-4 shadow-sm border border-[#FBE6C9] flex flex-col justify-center text-left hover:scale-[1.02] transition-transform">
                      <div className="w-8 h-8 rounded-xl bg-[#FDE2B5] text-[#B46700] flex items-center justify-center mb-2"><Users size={16} /></div>
                      <h4 className="text-xs font-black text-[#633A00]">My Batches</h4>
                      <p className="text-[10px] font-bold text-[#B46700] mt-0.5">{myBatches.length} Assigned</p>
                    </button>
                    <button onClick={() => setActiveTab("timetable")} className="bg-[#F3F4FE] rounded-3xl p-4 shadow-sm border border-[#E1E4FC] flex flex-col justify-center text-left hover:scale-[1.02] transition-transform">
                      <div className="w-8 h-8 rounded-xl bg-[#E1E4FC] text-[#3B28E5] flex items-center justify-center mb-2"><CalendarDays size={16} /></div>
                      <h4 className="text-xs font-black text-[#261899]">Timetable</h4>
                      <p className="text-[10px] font-bold text-[#3B28E5] mt-0.5">Regular Schedule</p>
                    </button>
                  </div>

                  <button onClick={() => setActiveTab("marks")} className="w-full bg-[#FCF5FF] border border-[#F4E3FF] rounded-3xl p-5 flex items-center justify-between shadow-sm hover:scale-[1.01] transition-transform">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-[#EFE3FF] text-[#9D4EDD] flex items-center justify-center"><Award size={20} /></div>
                      <div className="text-left">
                        <h4 className="text-sm font-black text-[#5A189A]">Class Tests & Marks</h4>
                        <p className="text-[11px] font-bold text-[#9D4EDD] mt-0.5">Schedule & publish marks</p>
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
                    <h1 className="text-lg font-black text-gray-900">My Assigned Batches</h1>
                    <span className="text-[10px] bg-[#5B7023] text-white px-2 py-0.5 rounded-full font-bold">Admin Synced</span>
                  </div>
                  {myBatches.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-3xl border border-gray-100">
                      <Users size={32} className="text-gray-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-gray-400">No batches assigned by Admin yet.</p>
                    </div>
                  ) : (
                    myBatches.map((batch) => {
                      const count = MOCK_STUDENTS.filter(st => st.batches.includes(batch.id)).length;
                      return (
                        <div key={batch.id} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 text-left">
                          <h4 className="text-base font-black text-gray-900">{batch.name}</h4>
                          <p className="text-[11px] font-bold text-[#5B7023] mt-0.5">{batch.subject}</p>
                          <div className="flex flex-wrap gap-2 mt-3 text-[10px] text-gray-500 font-bold">
                            <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg"><Users size={12}/> {count} Enrolled Students</span>
                            <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg"><Timer size={12}/> {batch.timing}</span>
                            <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg"><MapPin size={12}/> {batch.room}</span>
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
                  <h1 className="text-lg font-black text-gray-900">Class Schedule</h1>
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
                      <p className="text-xs font-bold text-gray-400">No classes scheduled on {activeDay}</p>
                    </div>
                  ) : (
                    myTimetable.filter(t => t.day === activeDay).map((period, idx) => (
                      <div key={idx} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex flex-col items-center justify-center shrink-0 border border-indigo-100">
                          <Clock size={14} className="mb-1 text-[#5B7023]" />
                          <span className="text-[9px] font-black text-gray-800">{period.startTime}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-black text-gray-900">{period.subject}</h4>
                          <p className="text-xs font-bold text-[#5B7023] mt-0.5">{period.batchName}</p>
                          <p className="text-[10px] font-bold text-gray-400 mt-1">Room: {period.room}</p>
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
                      <Label className="text-[11px] font-bold text-gray-700 uppercase">Select Batch</Label>
                      <select 
                        value={selectedBatch?.id || ""} 
                        onChange={(e) => { 
                          const b = myBatches.find(x => x.id === e.target.value); 
                          setSelectedBatch(b); 
                        }} 
                        className="w-full h-11 mt-1 px-3 text-sm font-bold bg-gray-50 border border-gray-200 rounded-xl"
                      >
                        <option value="">-- Choose Assigned Batch --</option>
                        {myBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <Field label="Date" type="date" value={attendanceDate} onChange={setAttendanceDate} />
                  </div>

                  {selectedBatch && (
                    <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-2">
                      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                        <p className="text-[11px] font-bold text-[#5B7023] uppercase">Students list ({attendanceStudents.length})</p>
                        <span className="text-[10px] text-gray-400">P: Present, L: Late, A: Absent</span>
                      </div>
                      
                      {attendanceStudents.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">No students enrolled in this batch.</p>
                      ) : (
                        attendanceStudents.map(st => (
                          <div key={st.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-2xl">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-white border border-gray-200 text-[#5B7023] font-black text-xs flex items-center justify-center">{st.name.charAt(0)}</div>
                              <div>
                                <p className="text-xs font-black text-gray-900">{st.name}</p>
                                <p className="text-[9px] font-bold text-gray-400 mt-0.5">Roll: {st.rollNo}</p>
                              </div>
                            </div>
                            <div className="flex gap-1.5 bg-white p-1 rounded-xl border border-gray-100">
                              <button onClick={() => markAttendance(st.id, "present")} className={`w-9 h-8 rounded-lg text-[10px] font-black transition-colors ${st.status === "present" ? "bg-emerald-500 text-white" : "text-gray-400 hover:bg-gray-50"}`}>P</button>
                              <button onClick={() => markAttendance(st.id, "late")} className={`w-9 h-8 rounded-lg text-[10px] font-black transition-colors ${st.status === "late" ? "bg-amber-500 text-white" : "text-gray-400 hover:bg-gray-50"}`}>L</button>
                              <button onClick={() => markAttendance(st.id, "absent")} className={`w-9 h-8 rounded-lg text-[10px] font-black transition-colors ${st.status === "absent" ? "bg-red-500 text-white" : "text-gray-400 hover:bg-gray-50"}`}>A</button>
                            </div>
                          </div>
                        ))
                      )}

                      {attendanceStudents.length > 0 && (
                        <button onClick={saveAttendanceLog} className="w-full mt-3 py-3 bg-[#5B7023] text-white rounded-2xl text-sm font-black flex items-center justify-center gap-2 hover:bg-[#4a5c1d] transition-colors">
                          <Save size={16}/> Submit & Sync to Admin
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
                        <h3 className="text-sm font-bold text-gray-900">Schedule New Exam Test</h3>
                        <button onClick={() => setIsCreatingTest(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
                      </div>

                      <div className="space-y-3">
                        <Field label="Test / Exam Title" placeholder="e.g. Algebra Quiz 1" value={newTestTitle} onChange={setNewTestTitle} />
                        
                        <div>
                          <Label className="text-xs font-semibold text-gray-700">Assign Batch *</Label>
                          <select 
                            value={newTestBatch} 
                            onChange={(e) => setNewTestBatch(e.target.value)} 
                            className="w-full h-11 mt-1 px-3 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl"
                          >
                            <option value="">-- Choose Batch --</option>
                            {myBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Max Marks" type="number" value={newTestMaxMarks} onChange={setNewTestMaxMarks} />
                          <Field label="Test Date" type="date" value={newTestDate} onChange={setNewTestDate} />
                        </div>

                        <Button onClick={handleCreateTest} className="w-full bg-[#5B7023] hover:bg-[#4a5c1d] text-white rounded-xl mt-2 h-11">
                          Publish Exam Details
                        </Button>
                      </div>
                    </div>
                  ) : selectedTestForMarks ? (
                    // ENTER STUDENT TEST MARKS INTERACTION SCREEN
                    <div className="bg-white rounded-3xl p-5 shadow-md border border-gray-200 space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div>
                          <h3 className="text-sm font-black text-gray-950">{selectedTestForMarks.title}</h3>
                          <p className="text-[10px] text-gray-400">Max Score Limit: {selectedTestForMarks.maxMarks} marks</p>
                        </div>
                        <button onClick={() => setSelectedTestForMarks(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={16}/></button>
                      </div>

                      <div className="space-y-3">
                        {MOCK_STUDENTS.filter(st => st.batches.includes(selectedTestForMarks.batchId)).map(student => (
                          <div key={student.id} className="flex items-center justify-between p-2 bg-gray-50/50 rounded-xl">
                            <div>
                              <p className="text-xs font-bold text-gray-900">{student.name}</p>
                              <p className="text-[10px] text-gray-400">Roll: {student.rollNo}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* FIX 3: Handling 0 marks correctly */}
                              <input 
                                type="number" 
                                min="0"
                                max={selectedTestForMarks.maxMarks}
                                value={enteredMarks[student.id] !== undefined ? enteredMarks[student.id] : ""}
                                placeholder="0"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (Number(val) > Number(selectedTestForMarks.maxMarks)) {
                                    alert(`Score cannot exceed Max Limit of ${selectedTestForMarks.maxMarks}`);
                                    return;
                                  }
                                  setEnteredMarks(prev => ({ ...prev, [student.id]: val }));
                                }}
                                className="w-16 h-9 text-center font-bold bg-white border border-gray-200 rounded-lg text-xs"
                              />
                              <span className="text-xs text-gray-400">/ {selectedTestForMarks.maxMarks}</span>
                            </div>
                          </div>
                        ))}

                        <Button onClick={saveTestMarks} className="w-full bg-[#5B7023] hover:bg-[#4a5c1d] text-white rounded-xl mt-3">
                          Save Scores & Send to Admin
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // TEST LIST VIEW
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h1 className="text-lg font-black text-gray-900">Class Tests</h1>
                        <button 
                          onClick={() => setIsCreatingTest(true)} 
                          className="bg-[#5B7023] hover:bg-[#4a5c1d] text-white text-xs font-bold px-3 h-10 rounded-xl flex items-center gap-1.5 shadow-md transition-all"
                        >
                          <Plus size={14}/> Add Test
                        </button>
                      </div>

                      {testRecords.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-3xl border border-gray-100">
                          <Award size={40} className="text-gray-300 mx-auto mb-2" />
                          <p className="text-xs font-bold text-gray-400">No scheduled exams / tests configured yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {testRecords.map((test) => {
                            const batchObj = globalBatches.find(b => b.id === test.batchId);
                            const totalEnrolled = MOCK_STUDENTS.filter(st => st.batches.includes(test.batchId)).length;
                            const markedCount = Object.keys(test.scores || {}).length;

                            return (
                              <div key={test.id} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="text-sm font-black text-gray-950">{test.title}</h4>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">{batchObj?.name || "Global"}</span>
                                  </div>
                                  <span className="text-xs font-extrabold text-[#5B7023] bg-[#F0F4E8] px-2 py-1 rounded-lg">
                                    Limit: {test.maxMarks} M
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold border-t border-gray-100 pt-2.5">
                                  <span className="flex items-center gap-1"><Calendar size={12}/> Date: {test.date}</span>
                                  <span className="flex items-center gap-1">
                                    <CheckCircle size={12} className={markedCount === totalEnrolled ? "text-emerald-500" : "text-amber-500"}/> 
                                    Scores: {markedCount}/{totalEnrolled} Marked
                                  </span>
                                </div>

                                <button 
                                  onClick={() => openEnterMarks(test)} 
                                  className="w-full h-8 bg-gray-50 hover:bg-[#F0F4E8] text-gray-700 hover:text-[#5B7023] rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors border border-gray-100"
                                >
                                  <Pencil size={12}/> Enter & Update Student Scores
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

            {/* APP FOOTER NAVIGATION BAR */}
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