import {
  useListStudents,
  useCreateStudent,
  useUpdateStudent,
  useDeleteStudent,
  useListBatches,
  useListCourses,
  getListStudentsQueryKey,
} from "@workspace/api-client-react";
import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Plus, Pencil, Trash2, Upload, UserRound, Download, FileText,
  Eye, EyeOff, X, Camera, GraduationCap, Users, MapPin, KeyRound, IdCard,
  Check, Edit, UploadCloud, UserPlus, UserCheck, UserMinus, FilterIcon,
  FileSpreadsheet, ShieldCheck, AlertTriangle, Info, ArrowLeft, RefreshCw, 
  Ban, CalendarDays, Wallet, BarChart3, ClipboardList, FolderOpen, Mail, Phone, User,
  LayoutGrid, List
} from "lucide-react";
import { CameraCapture } from "@/components/camera-capture";
import { INDIA_STATES, getDistricts } from "@/lib/india-locations";
import {
  FormRow, FormInput, FormSelect, FormFooter,
  SectionTitle, DateInput,
} from "@/components/form-fields";
import { FormProgress } from "@/components/form-progress";

// ---------------------------------------------------------------------------
// TYPES & CONSTANTS
// ---------------------------------------------------------------------------

type StudentDocument = {
  label: string;
  name: string;
  dataUrl: string;
  mimeType: string;
};

type StudentForm = {
  name: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  genderOther: string,
  bloodGroup: "",
  aadhaarCard: "",
  previousMarksheet: "",
  schoolName: string;
  className: string;
  section: string;
  board: string;
  boardOther?: string;
  lastClassPercentage: string;
  lastClassMarks: string;
  photoDataUrl: string;
  documents: StudentDocument[];
  courseId: string;
  batchId: string;
  academicYear: string;
  motherName: string;
  motherOccupation: string;
  motherPhone: string;
  motherPhoneCode: string;
  motherWhatsapp: string;
  motherWhatsappCode: string;
  fatherName: string;
  fatherOccupation: string;
  fatherPhone: string;
  fatherPhoneCode: string;
  fatherWhatsapp: string;
  fatherWhatsappCode: string;
  emergencyPhone: string;
  emergencyPhoneCode: string;
  correspondenceAddress: string;
  correspondenceDistrict: string;
  correspondenceState: string;
  correspondencePin: string;
  permanentAddress: string;
  permanentDistrict: string;
  permanentState: string;
  permanentPin: string;
  loginId: string;
  loginPassword: string;
  status: "active" | "inactive";
};

const blankForm: StudentForm = {
  name: "",
  phone: "",
  email: "",
  dateOfBirth: "",
  gender: "",
  genderOther: "",
  bloodGroup: "",
  aadhaarCard: "",
  previousMarksheet: "",
  schoolName: "",
  className: "",
  section: "", board: "",
  boardOther: "",
  lastClassPercentage: "",
  lastClassMarks: "",
  photoDataUrl: "",
  documents: [],
  courseId: "",
  batchId: "",
  academicYear: "2026-2027",
  motherName: "",
  motherOccupation: "",
  motherPhone: "",
  motherPhoneCode: "+91",
  motherWhatsapp: "",
  motherWhatsappCode: "+91",
  fatherName: "",
  fatherOccupation: "",
  fatherPhone: "",
  fatherPhoneCode: "+91",
  fatherWhatsapp: "",
  fatherWhatsappCode: "+91",
  emergencyPhone: "",
  emergencyPhoneCode: "+91",
  correspondenceAddress: "",
  correspondenceDistrict: "",
  correspondenceState: "",
  correspondencePin: "",
  permanentAddress: "",
  permanentDistrict: "",
  permanentState: "",
  permanentPin: "",
  loginId: "",
  loginPassword: "",
  status: "active",
};

const CLASS_OPTIONS = ["NURSERY", "L.K.G", "U.K.G", ...Array.from({ length: 12 }, (_, index) => [`${index + 1}`]).flat()];
const BOARD_OPTIONS = ["CBSE", "ICSE", "UP Board", "Other"];
const BLOOD_GROUP_OPTIONS = [
  { label: "A+", value: "A+" },
  { label: "A-", value: "A-" },
  { label: "B+", value: "B+" },
  { label: "B-", value: "B-" },
  { label: "AB+", value: "AB+" },
  { label: "AB-", value: "AB-" },
  { label: "O+", value: "O+" },
  { label: "O-", value: "O-" },
];

const COUNTRY_CODES = [
  { code: "+91", iso: "in", name: "India" }, { code: "+1", iso: "us", name: "USA" }, { code: "+44", iso: "gb", name: "UK" }, { code: "+971", iso: "ae", name: "UAE" }, { code: "+966", iso: "sa", name: "Saudi" }, { code: "+974", iso: "qa", name: "Qatar" }, { code: "+965", iso: "kw", name: "Kuwait" }, { code: "+968", iso: "om", name: "Oman" }, { code: "+973", iso: "bh", name: "Bahrain" }, { code: "+92", iso: "pk", name: "Pakistan" }, { code: "+880", iso: "bd", name: "Bangladesh" }, { code: "+977", iso: "np", name: "Nepal" }, { code: "+94", iso: "lk", name: "Sri Lanka" }, { code: "+61", iso: "au", name: "Australia" }, { code: "+65", iso: "sg", name: "Singapore" }, { code: "+60", iso: "my", name: "Malaysia" }, { code: "+49", iso: "de", name: "Germany" }, { code: "+33", iso: "fr", name: "France" }, { code: "+81", iso: "jp", name: "Japan" }, { code: "+86", iso: "cn", name: "China" },
];

// ---------------------------------------------------------------------------
// HELPER FUNCTIONS & COMPONENTS
// ---------------------------------------------------------------------------

function getStudentFeeInfo(student: any) {
  const total = Number(student?.totalFee ?? student?.totalBilled ?? student?.feeAmount ?? student?.courseFee ?? student?.fee ?? 0);
  const paid = Number(student?.feesPaid ?? student?.paidAmount ?? student?.paidFee ?? 0);
  
  let due = 0;
  if (student?.pendingFees !== undefined && student?.pendingFees !== null) {
    due = Number(student.pendingFees);
  } else if (student?.dueFee !== undefined && student?.dueFee !== null) {
    due = Number(student.dueFee);
  } else if (total > 0) {
    due = Math.max(0, total - paid);
  }

  const isNoDue = (total > 0 && due === 0) || (paid > 0 && due === 0) || (total === 0 && due === 0);

  return {
    total,
    paid,
    due,
    isNoDue,
    statusText: isNoDue ? "No Due" : `₹${due.toLocaleString("en-IN")} Due`
  };
}

function Flag({ iso }: { iso: string }) {
  return <img src={`https://flagcdn.com/w40/${iso}.png`} srcSet={`https://flagcdn.com/w80/${iso}.png 2x`} alt="" className="h-4 w-5 rounded-[2px] object-cover" loading="lazy" />;
}

function PhoneField({ label, value, onChange, code = "+91", onCodeChange, required = false }: any) {
  const selected = COUNTRY_CODES.find((c) => c.code === code) ?? COUNTRY_CODES[0];
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-600">
        {label} {required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      <div className="flex h-9 overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        <div className="relative flex shrink-0 items-center gap-1 border-r border-slate-200 bg-white px-2.5">
          <Flag iso={selected.iso} />
          <svg className="h-3 w-3 text-slate-500" viewBox="0 0 20 20" fill="currentColor"><path d="M5.25 7.5L10 12.25L14.75 7.5H5.25Z" /></svg>
          <span className="text-sm font-medium text-slate-800">{code}</span>
          <select value={code} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onCodeChange?.(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0">
            {COUNTRY_CODES.map((c) => (<option key={c.code} value={c.code}>{c.name} ({c.code})</option>))}
          </select>
        </div>
        <input inputMode="numeric" placeholder="Mobile number" value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value.replace(/\D/g, "").slice(0, 15))} className="h-full w-full border-0 bg-transparent px-3 text-sm outline-none" />
      </div>
    </div>
  );
}

function WhatsappField({ value, contact, onChange, code = "+91", onCodeChange, contactCode = "+91" }: any) {
  const same = Boolean(contact) && value === contact && code === contactCode;
  const selected = COUNTRY_CODES.find((c) => c.code === code) ?? COUNTRY_CODES[0];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">WhatsApp Number</Label>
        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
          <input type="checkbox" className="h-3.5 w-3.5 accent-green-600" checked={same} disabled={!contact} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.checked) { onChange(contact); onCodeChange?.(contactCode); } else { onChange(""); } }} />
          Same as contact
        </label>
      </div>
      <div className="flex h-9 overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500">
        <div className="relative flex shrink-0 items-center gap-1 border-r border-slate-200 bg-white px-2.5">
          <Flag iso={selected.iso} />
          <svg className="h-3 w-3 text-slate-500" viewBox="0 0 20 20" fill="currentColor"><path d="M5.25 7.5L10 12.25L14.75 7.5H5.25Z" /></svg>
          <span className="text-sm font-medium text-slate-800">{code}</span>
          <select value={code} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onCodeChange?.(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0">
            {COUNTRY_CODES.map((c) => (<option key={c.code} value={c.code}>{c.name} ({c.code})</option>))}
          </select>
        </div>
        <input inputMode="numeric" placeholder="WhatsApp number" value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value.replace(/\D/g, "").slice(0, 15))} className="h-full w-full border-0 bg-transparent px-3 text-sm outline-none" />
      </div>
    </div>
  );
}

function PercentField({ value, onChange, error }: any) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-600">Percentage of Last Class</Label>
      <div className="relative">
        <Input inputMode="decimal" placeholder="82" value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const clean = e.target.value.replace(/[^\d.]/g, ""); if (clean !== "" && Number(clean) > 100) return; onChange(clean); }} className={`pr-8 h-9 text-sm shadow-sm ${error ? "border-red-500" : ""}`} />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">%</span>
      </div>
      {error && <p className="text-[11px] font-medium text-red-500">{error}</p>}
    </div>
  );
}

function EmailField({ value, onChange }: any) {
  const suggest = value.trim() && !value.includes("@");
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-600">E-mail ID</Label>
      <Input value={value} placeholder="name@gmail.com" onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value.trim())} onBlur={() => { if (suggest) onChange(`${value.trim()}@gmail.com`); }} className="h-9 text-sm shadow-sm" />
      {suggest && <button type="button" onClick={() => onChange(`${value.trim()}@gmail.com`)} className="text-xs text-primary hover:underline">+ @gmail.com lagao → <b>{value}@gmail.com</b></button>}
    </div>
  );
}

function SearchableDropdown({ label, value, options, placeholder, onChange }: any) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);
  useEffect(() =>  { setText(value); }, [value]);
  const [highlight, setHighlight] = useState(0);

  const filtered = text.trim() ? options.filter((o: string) => o.toLowerCase().includes(text.toLowerCase())) : options;
  const noMatch = text.trim() && filtered.length === 0;

  const choose = (option: string) => { onChange(option); setText(option); setHighlight(0); setOpen(false); };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setOpen(true); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (open && filtered[highlight]) choose(filtered[highlight]); else setOpen(true); }
    else if (e.key === "Escape") { e.preventDefault(); setText(value); setHighlight(0); setOpen(false); }
  };

  return (
    <div className="relative space-y-1.5">
      <Label className="text-xs font-medium text-slate-600">{label}</Label>
      <div className="relative">
        <Input value={text} placeholder={placeholder} onFocus={() => { setText(""); setOpen(true); setHighlight(0); }} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setText(e.target.value); setOpen(true); setHighlight(0); }} onKeyDown={handleKey} onBlur={() => setTimeout(() => { setText(value); setHighlight(0); setOpen(false); }, 150)} className="h-9 border-slate-300 bg-white pr-9 text-sm shadow-sm focus-visible:border-blue-500 focus-visible:ring-1" />
        <button type="button" tabIndex={-1} onClick={() => { if (open) { setText(value); setOpen(false); } else { setText(""); setOpen(true); } }} className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:bg-slate-100"><span className="text-xs">▼</span></button>
        {open && (
          <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
            {noMatch ? <div className="px-3 py-3 text-center text-xs italic text-slate-400">No record found</div> :
              filtered.map((option: string, index: number) => (
                <button key={option} type="button" onMouseDown={(e) => { e.preventDefault(); choose(option); }} onMouseEnter={() => setHighlight(index)} className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm ${index === highlight ? "bg-blue-100 text-blue-900" : option === value ? "bg-blue-50 font-medium" : "hover:bg-slate-50"}`}>
                  <span>{option}</span>{option === value && <span className="text-blue-600">✓</span>}
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchableFilterDropdown({ value, options, onChange, placeholder, className }: any) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = options.find((o: any) => o.value === value);
  const displayValue = selected ? selected.label : placeholder;
  const filtered = options.filter((o: any) => o.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button type="button" className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-300 transition-colors" onClick={() => { if (!open) setSearch(""); setOpen(!open); }}>
        <span className="truncate">{displayValue}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 opacity-50 shrink-0 ml-1"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      
      {open && (
        <div className="absolute z-50 mt-1 max-h-64 left-0 min-w-full w-max max-w-[340px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          <div className="sticky top-0 bg-white pb-1.5 z-10">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input autoFocus type="text" className="w-full rounded-md border border-slate-200 pl-8 pr-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" placeholder="Search..." value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="mt-1 flex flex-col gap-0.5">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-sm text-slate-500 text-center">No results found</div>
            ) : (
              filtered.map((option: any) => (
                <button key={option.value} type="button" className={`flex w-full items-center justify-between text-left px-2.5 py-2 text-sm rounded-md transition-colors gap-2 ${option.value === value ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-slate-100 text-slate-700'}`} onClick={() => { onChange(option.value); setOpen(false); }}>
                  <span className="whitespace-normal leading-snug">{option.label}</span>
                  {option.value === value && <Check className="h-3.5 w-3.5 shrink-0 text-blue-600" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------------------------

export default function Students() {
  const [location] = useLocation();
  const studentCategory = new URLSearchParams(location.split("?")[1] ?? window.location.search).get("category");
  const pageTitle = studentCategory === "academic" ? "Academic Students" : studentCategory === "computer" ? "Computer Students" : "Students";

  const queryClient = useQueryClient();
  const { data: students, isLoading } = useListStudents();
  const { data: courses } = useListCourses();
  const { data: batches } = useListBatches();
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();

  // Filters State
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("admission-asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  
  // Profile View State
  const [viewingStudent, setViewingStudent] = useState<any>(null);
  const [profileTab, setProfileTab] = useState<"attendance" | "fees" | "results" | "exams" | "info" | "documents">("attendance");

    // 👁️ TOP HEADER SEARCH BAR INTEGRATION (ROBUST AUTO OPEN STUDENT PROFILE)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewId = params.get("view");
    if (!viewId) return;

    // 1. स्टूडेंट लिस्ट को सुरक्षित एरे में बदलें
    const studentsArray = (() => {
      if (!students) return [];
      if (Array.isArray(students)) return students;
      if (Array.isArray((students as any).data)) return (students as any).data;
      return [];
    })();

    // 2. जब तक स्टूडेंट्स लोड नहीं हो जाते, तब तक वेट करें
    if (studentsArray.length === 0) return;

    // 3. लिस्ट में से सही स्टूडेंट ढूँढें
    const targetStudent = studentsArray.find(
      (s: any) => String(s.id || s._id) === String(viewId)
    );

    if (targetStudent) {
      // 4. प्रोफाइल ओपन करें
      setViewingStudent(targetStudent);
      setProfileTab("info");

      // 5. साफ़ करें
      localStorage.removeItem("active_student_id");
      localStorage.removeItem("view_student_data");

      const cleanSearch = window.location.search
        .replace(/[?&]view=[^&]+/, "")
        .replace(/[?&]action=[^&]+/, "");
      const cleanUrl = window.location.pathname + (cleanSearch.startsWith("&") ? "?" + cleanSearch.substring(1) : cleanSearch);
      window.history.replaceState(null, "", cleanUrl);
    }
  }, [students, location]);

  // Reset Password Modal State
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetParentPwd, setResetParentPwd] = useState(false);

  // Full-Page Form State (NEW - Replaced dialogOpen)
  const [formPageOpen, setFormPageOpen] = useState(false);
  
  // Other Dialogs State
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [bulkUpdateDialogOpen, setBulkUpdateDialogOpen] = useState(false);

  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [form, setForm] = useState<StudentForm>(blankForm);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [docCameraLabel, setDocCameraLabel] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isPhotoRemoved, setIsPhotoRemoved] = useState(false);

    // 🟢 Dashboard se "Add Student" pr click krne pr form apne aap open ho jaega
  useEffect(() => {
  const params = new URLSearchParams(window.location.search);
    if (params.get("admit") === "true") {
      setEditingStudent(null); // old data clear
      setForm(blankForm);      // form ko khali kare
      setFormPageOpen(true);   // "Admit Student" form open kare
    }
  }, [location]);

  

  // Bulk Update State
  const [bulkUpdateFile, setBulkUpdateFile] = useState<File | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [autoGenPassword, setAutoGenPassword] = useState(true);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [dobInvalid, setDobInvalid] = useState(false);

  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string; } | null>(null);
  const notify = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const setValue = (key: keyof StudentForm, value: string) => {
    setForm((old) => ({ ...old, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((old) => { const copy = { ...old }; delete copy[key]; return copy; });
    }
  };

  const visibleCourses = useMemo(() => {
    return (courses ?? []).filter((course: any) => {
      if (studentCategory !== "academic" && studentCategory !== "computer") return true;
      return (course.courseType ?? "academic") === studentCategory;
    });
  }, [courses, studentCategory]);

  const filteredBatches = useMemo(() => {
    return (batches ?? []).filter((batch: any) => {
      const linkedCourse = (courses ?? []).find((course: any) => course.id === batch.courseId) as any;
      const isCorrectCategory = studentCategory !== "academic" && studentCategory !== "computer" ? true : (linkedCourse?.courseType ?? "academic") === studentCategory;
      const isSelectedCourse = !form.courseId || batch.courseId === form.courseId;
      return isCorrectCategory && isSelectedCourse;
    });
  }, [batches, courses, form.courseId, studentCategory]);

  // Filtering Logic
  const filteredStudents = (students ?? []).filter((student: any) => {
    const linkedCourse = (courses ?? []).find((course: any) => course.id === student.courseId) as any;
    const isCorrectCategory = studentCategory !== "academic" && studentCategory !== "computer" ? true : (linkedCourse?.courseType ?? "academic") === studentCategory;
    if (!isCorrectCategory) return false;
    if (batchFilter !== "all" && student.batchId !== batchFilter) return false;
    const studentStatus = student.status === "inactive" ? "inactive" : "active";
    if (statusFilter !== "all") {
      if (statusFilter === "active" && studentStatus !== "active") return false;
      if (statusFilter === "inactive" && studentStatus !== "inactive") return false;
      if (statusFilter === "dropped" && studentStatus !== "inactive") return false;
      if (statusFilter === "graduated") return false;
    }
    const query = search.toLowerCase();
    return (
      String(student.name ?? "").toLowerCase().includes(query) ||
      String(student.enrollmentNo ?? "").toLowerCase().includes(query) ||
      String(student.email ?? "").toLowerCase().includes(query) ||
      String(student.phone ?? "").toLowerCase().includes(query)
    );
  });

  const classSerialNumber = (className: unknown) => {
    const value = String(className ?? "").trim().toUpperCase();
    if (value === "NURSERY") return 1;
    if (value === "L.K.G" || value === "LKG" || value === "L.K.G.") return 2;
    if (value === "U.K.G" || value === "UKG" || value === "U.K.G.") return 3;
    const numberMatch = value.match(/(?:CLASS\s*)?(\d{1,2})/);
    if (!numberMatch) return 9999;
    const classNumber = Number(numberMatch[1]);
    const boardNumber = value.includes("CBSE") ? 0 : value.includes("ICSE") ? 1 : 2;
    return 100 + classNumber * 10 + boardNumber;
  };

  const classWiseStudents = [...filteredStudents].sort((first: any, second: any) => {
    if (sortBy === "admission-asc") return String(first.enrollmentNo || "").localeCompare(String(second.enrollmentNo || ""), undefined, { numeric: true });
    if (sortBy === "admission-desc") return String(second.enrollmentNo || "").localeCompare(String(first.enrollmentNo || ""), undefined, { numeric: true });
    if (sortBy === "name-asc") return String(first.name || "").localeCompare(String(second.name || ""));
    if (sortBy === "name-desc") return String(second.name || "").localeCompare(String(first.name || ""));
    
    const classDifference = classSerialNumber(first.className) - classSerialNumber(second.className);
    if (classDifference !== 0) return classDifference;
    const firstBoard = String(first.board ?? "").toUpperCase();
    const secondBoard = String(second.board ?? "").toUpperCase();
    const boardDifference = (firstBoard === "CBSE" ? 0 : firstBoard === "ICSE" ? 1 : 2) - (secondBoard === "CBSE" ? 0 : secondBoard === "ICSE" ? 1 : 2);
    if (boardDifference !== 0) return boardDifference;
    return String(first.name ?? "").localeCompare(String(second.name ?? ""));
  });

  const handleExport = () => {
    if (classWiseStudents.length === 0) return notify("error", "No student data to export!");
    const headers = ["admission_number", "name", "email", "phone", "gender", "date_of_birth", "father_name", "guardian_phone", "address", "batch_code", "status"];
    const csvRows = classWiseStudents.map((s: any) => [
      s.enrollmentNo || s.id, s.name, s.email, s.phone, s.gender, s.dateOfBirth, s.fatherName || s.parentName, s.fatherPhone || s.parentPhone, s.correspondenceAddress || s.address, s.batchName, s.status
    ].map(val => `"${String(val || "").replace(/"/g, '""')}"`).join(","));
    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `students_export_${new Date().getTime()}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    notify("success", "Students CSV exported successfully!");
  };

  const handleBulkDownloadTemplate = () => handleExport();

  const handleDownloadImportTemplate = () => {
    const headers = ["name", "email", "phone", "batch_code", "date_of_birth", "father_name", "guardian_phone", "address", "admission_number", "password"];
    const sampleRow = ["Arjun Mehta", "arjun@gmail.com", "9876543210", "JEE-XI-A", "2007-04-15", "Rajiv Mehta", "9876500001", "42 Tonk Road, Jaipur", "", "Pass@123"];
    const csvContent = [headers.join(","), sampleRow.map(v => `"${v}"`).join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `student_import_template.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    notify("success", "Import template downloaded!");
  };

  const handleBulkUpdateApply = async () => {
    if (!bulkUpdateFile) return notify("error", "Please upload an edited CSV file first!");
    setIsBulkUpdating(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim() !== "");
      if (lines.length <= 1) { setIsBulkUpdating(false); return notify("error", "Uploaded CSV file is empty!"); }
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
      let successCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
        const rowData: any = {};
        headers.forEach((header, idx) => { if (row[idx]) rowData[header] = row[idx]; });
        const admissionNo = rowData.admission_number;
        if (admissionNo) {
          const matchedStudent = (students ?? []).find((s: any) => String(s.enrollmentNo) === String(admissionNo) || String(s.id) === String(admissionNo));
          if (matchedStudent) {
            try {
              const updatePayload: any = {};
              if (rowData.name) updatePayload.name = rowData.name;
              if (rowData.email) updatePayload.email = rowData.email;
              if (rowData.phone) updatePayload.phone = rowData.phone;
              if (rowData.gender) updatePayload.gender = rowData.gender;
              if (rowData.status) updatePayload.status = rowData.status;
              if (rowData.father_name) updatePayload.parentName = rowData.father_name; 
              if (rowData.address) updatePayload.correspondenceAddress = rowData.address;
              await updateStudent.mutateAsync({ id: matchedStudent.id, data: updatePayload as any });
              successCount++;
            } catch (err) {}
          }
        }
      }
      setIsBulkUpdating(false); setBulkUpdateDialogOpen(false); setBulkUpdateFile(null);
      queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
      notify("success", `Updated ${successCount} students successfully!`);
    };
    reader.readAsText(bulkUpdateFile);
  };

  const handleImportSubmit = async () => {
    if (!importFile) return notify("error", "Please select a CSV file!");
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim() !== "");
      if (lines.length <= 1) { setIsImporting(false); return notify("error", "File is empty or missing data!"); }
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
      let successCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
        const rowData: any = {};
        headers.forEach((header, index) => { if (row[index]) rowData[header] = row[index]; });
        if (rowData.name) {
          try {
            await createStudent.mutateAsync({
              data: {
                ...blankForm, name: rowData.name, email: rowData.email || undefined, phone: rowData.phone || "",
                parentName: rowData.father_name || undefined, parentPhone: rowData.guardian_phone || undefined,
                correspondenceAddress: rowData.address || "", dateOfBirth: rowData.date_of_birth || "",
                academicYear: "2026-2027", loginPassword: rowData.password || (autoGenPassword ? Math.random().toString(36).slice(-8) : "Pass@123")
              } as any
            });
            successCount++;
          } catch (err) {}
        }
      }
      setIsImporting(false); setImportDialogOpen(false); setImportFile(null);
      queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
      notify("success", `Imported ${successCount} students successfully!`);
    };
    reader.readAsText(importFile);
  };

  const openAdd = () => {
    setEditingStudent(null); setForm(blankForm); setFieldErrors({}); setDobInvalid(false); setIsPhotoRemoved(false); setFormPageOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openEdit = (student: any) => {
    setEditingStudent(student); setFieldErrors({}); setDobInvalid(false); setIsPhotoRemoved(false);

    // 🌟 Gender Parse
    const rawG = String(student.gender || "").trim().toLowerCase();
    const rawGOther = String(student.genderOther || "").trim();
    
    let gVal = "";
    let gOtherVal = "";

    if (rawG === "male" || rawG === "female") {
      gVal = rawG;
      gOtherVal = "";
    } else {
      gVal = "other";
      gOtherVal = rawGOther || (rawG !== "other" ? student.gender : "");
    }

    // 🌟 Board Parse
    const rawB = String(student.board || "").trim();
    const rawBOther = String(student.boardOther || "").trim();
    const stdBoards = ["cbse", "icse", "state board"];

    let bVal = "";
    let bOtherVal = "";

    if (stdBoards.includes(rawB.toLowerCase())) {
      bVal = rawB;
      bOtherVal = "";
    } else {
      bVal = "Other";
      bOtherVal = rawBOther || (rawB.toLowerCase() !== "other" ? rawB : "");
    }

    setForm({
      ...blankForm, 
      name: student.name ?? "", 
      phone: student.phone ?? "", 
      email: student.email ?? "", 
      dateOfBirth: student.dateOfBirth ?? "",
      
      gender: gVal,
      genderOther: gOtherVal,
      board: bVal,
      boardOther: bOtherVal,

      aadhaarCard: student.aadhaarCard ?? "",
      previousMarksheet: student.previousMarksheet ?? "",

      bloodGroup: student.bloodGroup || "", 
      schoolName: student.schoolName ?? "", 
      className: student.className ?? "", 
      section: student.section ?? "",
      lastClassPercentage: student.lastClassPercentage ?? "", 
      lastClassMarks: student.lastClassMarks ?? "",
      photoDataUrl: student.photoDataUrl ?? "", 
      documents: Array.isArray(student.documents) ? student.documents : [],
      courseId: student.courseId ?? "", 
      batchId: student.batchId ?? "", 
      academicYear: student.academicYear ?? "2026-2027",
      motherName: student.motherName ?? "", 
      motherOccupation: student.motherOccupation ?? "", 
      motherPhone: student.motherPhone ?? "",
      motherPhoneCode: student.motherPhoneCode ?? "+91", 
      motherWhatsapp: student.motherWhatsapp ?? "", 
      motherWhatsappCode: student.motherWhatsappCode ?? "+91",
      fatherName: student.fatherName ?? student.parentName ?? "", 
      fatherOccupation: student.fatherOccupation ?? "", 
      fatherPhone: student.fatherPhone ?? student.parentPhone ?? "",
      fatherPhoneCode: student.fatherPhoneCode ?? "+91", 
      fatherWhatsapp: student.fatherWhatsapp ?? "", 
      fatherWhatsappCode: student.fatherWhatsappCode ?? "+91",
      emergencyPhone: student.emergencyPhone ?? "", 
      emergencyPhoneCode: student.emergencyPhoneCode ?? "+91", 
      correspondenceAddress: student.correspondenceAddress ?? student.address ?? "",
      correspondenceDistrict: student.correspondenceDistrict ?? "", 
      correspondenceState: student.correspondenceState ?? "", 
      correspondencePin: student.correspondencePin ?? "",
      permanentAddress: student.permanentAddress ?? "", 
      permanentDistrict: student.permanentDistrict ?? "", 
      permanentState: student.permanentState ?? "", 
      permanentPin: student.permanentPin ?? "",
      loginId: student.loginId ?? "", 
      loginPassword: "", 
      status: student.status === "inactive" ? "inactive" : "active",
    });
    setFormPageOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeForm = () => {
    setFormPageOpen(false);
    setEditingStudent(null);
    setForm(blankForm);
    setFieldErrors({});
    setDobInvalid(false);
    setIsPhotoRemoved(false);
  };

  const handlePhotoChange = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return notify("error", "Please choose an image file.");
    if (file.size > 1_500_000) return notify("error", "Please choose a photo smaller than 1.5 MB.");
    const reader = new FileReader();
    reader.onload = () => { setValue("photoDataUrl", String(reader.result || "")); setIsPhotoRemoved(false); };
    reader.readAsDataURL(file);
  };

  const handleDocumentChange = (label: string, file?: File) => {
    if (!file) return;
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) return notify("error", "Only PDF, JPG, PNG or WEBP files are allowed.");
    if (file.size > 3_000_000) return notify("error", "Please choose a document smaller than 3 MB.");
    const reader = new FileReader();
    reader.onload = () => {
      const newDoc: StudentDocument = { label, name: file.name, dataUrl: String(reader.result || ""), mimeType: file.type };
      setForm((old) => ({ ...old, documents: [...old.documents.filter(d => d.label !== label), newDoc] }));
    };
    reader.readAsDataURL(file);
  };

  const handleDocumentCapture = (label: string, dataUrl: string) => {
    const newDoc: StudentDocument = { label, name: `${label.replace(/\s+/g, "-").toLowerCase()}-camera.jpg`, dataUrl, mimeType: "image/jpeg" };
    setForm((old) => ({ ...old, documents: [...old.documents.filter(d => d.label !== label), newDoc] }));
  };

  const removeDocument = (label: string) => setForm((old) => ({ ...old, documents: old.documents.filter(d => d.label !== label) }));
  const getDocument = (label: string) => form.documents.find(d => d.label === label);

  const viewDocument = (doc: StudentDocument) => {
    const win = window.open("", "_blank");
    if (!win) return alert("Popup block ho gaya. Browser me popups allow karo.");
    if (doc.mimeType === "application/pdf" || doc.dataUrl.startsWith("data:application/pdf")) {
      win.document.write(`<html><head><title>${doc.name || "Document"}</title></head><body style="margin:0;background:#111"><embed src="${doc.dataUrl}" type="application/pdf" width="100%" height="100%" style="min-height:100vh;border:0" /></body></html>`);
    } else {
      win.document.write(`<html><head><title>${doc.name || "Preview"}</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;}img{max-width:95vw;max-height:95vh;object-fit:contain;border-radius:8px;}</style></head><body><img src="${doc.dataUrl}" alt="Doc" /></body></html>`);
    }
    win.document.close();
  };

  const downloadAdmissionForm = (student: any) => {
    const safe = (value: unknown) => String(value ?? "-").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const formatDate = (value: unknown) => {
      if (!value) return "—";
      const text = String(value);
      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) { const [year, month, day] = text.split("-"); return `${day}/${month}/${year}`; }
      return text;
    };
    const photo = student.photoDataUrl ? `<img class="student-photo" src="${student.photoDataUrl}" alt="Student photo" />` : `<div class="photo-placeholder">Affix a recent<br/>Passport size<br/>Photograph</div>`;
    const admissionDate = formatDate(student.createdAt);
    const courseAndBatch = `${safe(student.courseName)}${student.batchName ? ` — ${safe(student.batchName)}` : ""}`;
    const popup = window.open("", "_blank", "width=980,height=900");
    if (!popup) return alert("Popup blocked.");
    popup.document.write(`
      <!DOCTYPE html>
      <html>
        <head><title>Admission Form - ${safe(student.name)}</title><style>@page { size: A4 portrait; margin: 0; } * { box-sizing: border-box; } body { margin: 0; color: #151515; font-family: "Times New Roman", Georgia, serif; background: #f1f1f1; } .page { width: 210mm; height: 297mm; margin: 0 auto; padding: 4mm; background: #ffffff; border: 5px solid #3d2f95; position: relative; overflow: hidden; page-break-after: always; } .page:last-child { page-break-after: auto; } .original-header { display: block; width: 100%; height: auto; margin: 0; } .form-shell { margin: 3mm 2mm 0; border: 1.5px solid #e73121; border-radius: 8mm; padding: 3mm; } .main-title { margin: 0 0 2mm; font: 800 18px Arial, sans-serif; text-align: center; text-decoration: underline; letter-spacing: .3px; } .note { margin: 0 0 3mm; text-align: center; font-size: 9px; font-weight: 700; } .section-title { margin: 0; padding: 1.5mm 3mm; background: #e73121; color: #ffffff; font-size: 16px; font-weight: 800; text-align: center; } .section-box { border: 1px solid #e73121; border-top: 0; padding: 2.5mm 3mm 2mm; } .row { display: flex; align-items: flex-end; gap: 3mm; margin-bottom: 2.5mm; min-height: 5.5mm; font-size: 11.5px; font-weight: 700; } .row:last-child { margin-bottom: 0; } .field { display: inline-flex; min-width: 0; align-items: flex-end; gap: 1mm; flex: 1; } .field.small { flex: 0 0 25%; } .field.medium { flex: 0 0 43%; } .label { white-space: nowrap; } .value { min-width: 0; flex: 1; padding: 0 1mm 1mm; border-bottom: 1px dotted #222; overflow-wrap: anywhere; font-weight: 700; } .student-info { display: grid; grid-template-columns: 1fr 31mm; gap: 3mm; } .photo-placeholder, .student-photo { width: 31mm; height: 39mm; border: 1.5px solid #171717; object-fit: cover; } .photo-placeholder { display: grid; place-items: center; text-align: center; font-size: 9px; font-weight: 700; line-height: 1.2; } .rules { border: 1px solid #e73121; border-top: 0; padding: 2mm 4mm 2mm 8mm; font-size: 10.5px; font-weight: 700; line-height: 1.35; } .rules ol { margin: 0; padding-left: 5mm; } .footer { margin-top: 3mm; background: #ffffff; border-top: 3px solid #3d2f95; padding: 2mm 4mm; text-align: center; font: 700 9px Arial, sans-serif; line-height: 1.4; } .declaration { border: 1px solid #e73121; border-top: 0; padding: 4mm; font-size: 12.3px; font-weight: 700; line-height: 1.75; min-height: 170mm; text-align: justify; } .declaration .line { display: inline-block; min-width: 55mm; border-bottom: 1px dotted #222; vertical-align: baseline; } .signature-row { margin-top: 14mm; display: grid; grid-template-columns: 1fr 1fr; gap: 14mm; font-size: 11px; text-align: left; } .signature-box { padding-top: 7mm; } .signature-line { border-top: 1px dotted #222; padding-top: 1.5mm; font-weight: 800; } .office { border: 1px solid #e73121; border-top: 0; padding: 3mm; font-size: 11.5px; font-weight: 700; line-height: 1.6; } .office .office-row { display: flex; gap: 3mm; margin-bottom: 1.5mm; } .office .office-label { white-space: nowrap; } .office .office-value { flex: 1; border-bottom: 1px dotted #222; } @media print { html, body { width: 210mm; height: 297mm; background: #ffffff; } .page { width: 210mm; height: 297mm; margin: 0; } }</style></head>
        <body>
          <section class="page">
            <img class="original-header" src="/admission-form-original-header.png" alt="Header" />
            <div class="form-shell">
              <h1 class="main-title">REGISTRATION CUM ADMISSION FORM</h1>
              <p class="note">Use Blue/Black Ball Point Pen to Fill This Form</p>
              <div class="section-title">Student’s Information</div>
              <div class="section-box">
                <div class="student-info">
                  <div>
                    <div class="row"><div class="field"><span class="label">Student’s Name :</span><span class="value">${safe(student.name)}</span></div></div>
                    <div class="row"><div class="field medium"><span class="label">Date of Birth :</span><span class="value">${safe(formatDate(student.dateOfBirth))}</span></div><div class="field"><span class="label">Gender :</span><span class="value">${safe(student.gender ? String(student.gender).replace(/^./, (v) => v.toUpperCase()) : "")}</span></div></div>
                    <div class="row"><div class="field"><span class="label">School’s Name :</span><span class="value">${safe(student.schoolName)}</span></div></div>
                    <div class="row"><div class="field small"><span class="label">Class :</span><span class="value">${safe(student.className)}</span></div><div class="field small"><span class="label">Section :</span><span class="value">${safe(student.section)}</span></div><div class="field"><span class="label">Board :</span><span class="value">${safe(student.board)}</span></div></div>
                    <div class="row"><div class="field medium"><span class="label">Percentage of Last Class :</span><span class="value">${safe(student.lastClassPercentage)}</span></div><div class="field"><span class="label">Marks Obtained in Last Class :</span><span class="value">${safe(student.lastClassMarks)}</span></div></div>
                  </div>
                  ${photo}
                </div>
              </div>
              <div style="height:3mm"></div>
              <div class="section-title">Parent’s Information</div>
              <div class="section-box">
                <div class="row"><div class="field"><span class="label">Mother’s Name :</span><span class="value">${safe(student.motherName)}</span></div><div class="field medium"><span class="label">Occupation :</span><span class="value">${safe(student.motherOccupation)}</span></div></div>
                <div class="row"><div class="field"><span class="label">Father’s Name :</span><span class="value">${safe(student.fatherName ?? student.parentName)}</span></div><div class="field medium"><span class="label">Occupation :</span><span class="value">${safe(student.fatherOccupation)}</span></div></div>
                <div class="row"><div class="field"><span class="label">Mother’s Contact :</span><span class="value">${safe(student.motherPhone)}</span></div><div class="field medium"><span class="label">Whatsapp No. :</span><span class="value">${safe(student.motherWhatsapp)}</span></div></div>
                <div class="row"><div class="field"><span class="label">Father’s Contact :</span><span class="value">${safe(student.fatherPhone ?? student.parentPhone)}</span></div><div class="field medium"><span class="label">Whatsapp No. :</span><span class="value">${safe(student.fatherWhatsapp)}</span></div></div>
                <div class="row"><div class="field medium"><span class="label">Emergency Contact :</span><span class="value">${safe(student.emergencyPhone)}</span></div><div class="field"><span class="label">E-mail ID :</span><span class="value">${safe(student.email)}</span></div></div>
                <div class="row"><div class="field"><span class="label">Correspondence Address :</span><span class="value">${safe(student.correspondenceAddress)}</span></div></div>
                <div class="row"><div class="field small"><span class="label">District :</span><span class="value">${safe(student.correspondenceDistrict)}</span></div><div class="field medium"><span class="label">State :</span><span class="value">${safe(student.correspondenceState)}</span></div><div class="field small"><span class="label">PIN :</span><span class="value">${safe(student.correspondencePin)}</span></div></div>
                <div class="row"><div class="field"><span class="label">Permanent Address :</span><span class="value">${safe(student.permanentAddress)}</span></div></div>
                <div class="row"><div class="field small"><span class="label">District :</span><span class="value">${safe(student.permanentDistrict)}</span></div><div class="field medium"><span class="label">State :</span><span class="value">${safe(student.permanentState)}</span></div><div class="field small"><span class="label">PIN :</span><span class="value">${safe(student.permanentPin)}</span></div></div>
              </div>
              <div style="height:3mm"></div>
              <div class="section-title">RULES &amp; REGULATIONS</div>
              <div class="rules"><ol><li>Fees once paid will not be refunded.</li><li>Maintain discipline.</li></ol></div>
            </div>
            <div class="footer">Contact No.: 7844997666 | YouTube: /secondschoolclasses</div>
          </section>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    popup.document.close();
  };

  const handleDocumentUpload = (key: "aadhaarCard" | "previousMarksheet", file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      notify("error", "File size 5MB se kam honi chahiye");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setValue(key, e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const saveStudent = () => {
    const errs: Record<string, string> = {};
    if (dobInvalid) errs.dateOfBirth = "Date of Birth valid nahi hai";
    if (!form.name.trim()) errs.name = "Student ka naam zaroori hai";
    if (!form.fatherPhone && !form.motherPhone && !form.emergencyPhone) errs.contact = "Contact number zaroori hai";
    if (!form.courseId) errs.courseId = "Course select karo";
    if (!form.batchId) errs.batchId = "Batch select karo";

    if (form.gender === "other" && !(form.genderOther || "").trim()) {
      errs.genderOther = "Specify gender field zaroori hai";
    }
    if ((form.board === "Other" || form.board === "other") && !(form.boardOther || "").trim()) {
      errs.boardOther = "Specify board name field zaroori hai";
    }

    if (form.lastClassPercentage) {
      const n = Number(form.lastClassPercentage);
      if (Number.isNaN(n) || n < 0 || n > 100) errs.lastClassPercentage = "0-100 ke beech hona chahiye";
    }
    if (form.loginPassword && form.loginPassword.length > 0 && form.loginPassword.length < 6) errs.loginPassword = "Password minimum 6 characters";

    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      return notify("error", Object.values(errs)[0] || "Check required fields");
    }

    const contact = form.fatherPhone || form.motherPhone || form.emergencyPhone;
    
    let photoPayload = form.photoDataUrl;
    if (isPhotoRemoved || !form.photoDataUrl || form.photoDataUrl.trim() === "") {
      photoPayload = ""; 
    }

    const isGOther = form.gender === "other";
    const isBOther = form.board === "Other" || form.board === "other";

    // 🌟 FIX: Document remove karne par khali string "" hi jayegi (undefined nahi)
    const data: any = {
      ...form, 
      gender: isGOther ? "other" : form.gender, 
      genderOther: isGOther ? (form.genderOther || "").trim() : "",
      board: isBOther ? "Other" : form.board,
      boardOther: isBOther ? (form.boardOther || "").trim() : "",
      aadhaarCard: form.aadhaarCard || "",            // 👈 FIX: Allow empty string ""
      previousMarksheet: form.previousMarksheet || "",// 👈 FIX: Allow empty string ""
      phone: contact, 
      email: form.email || undefined,
      parentName: form.fatherName || undefined, 
      parentPhone: form.fatherPhone || undefined,
      loginId: form.loginId || undefined, 
      loginPassword: form.loginPassword || undefined,
      photoDataUrl: photoPayload,
    };

    const refresh = () => { 
      queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() }); 
      localStorage.removeItem("student-draft"); 
      closeForm();
      notify("success", editingStudent ? "Student updated successfully!" : "Student admitted successfully!");
    };

    const onError = (err: any) => {
      console.error("Save Error:", err);
      notify("error", err?.message || "Server par save karne mein error aaya");
    };
    
    if (editingStudent) {
      updateStudent.mutate({ id: editingStudent.id, data }, { onSuccess: refresh, onError });
    } else {
      createStudent.mutate({ data }, { onSuccess: refresh, onError });
    }
  };

  const updateStudentStatus = (student: any, status: "active" | "inactive") => {
    if (student.status === status) return;
    updateStudent.mutate({ id: student.id, data: { status } as any }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() }) });
  };

  const handleDelete = (student: any) => {
    if (!confirm("Delete " + student.name + "?")) return;
    deleteStudent.mutate({ id: student.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() }) });
  };

  const handleClearFilters = () => { setSearch(""); setBatchFilter("all"); setStatusFilter("all"); setSortBy("admission-asc"); };

  const submitResetPassword = () => {
    if (!newPassword || newPassword.length < 6) return notify("error", "Password must be at least 6 characters.");
    updateStudent.mutate(
      { id: viewingStudent.id, data: { loginPassword: newPassword } as any },
      { onSuccess: () => { notify("success", "Password reset successfully!"); setResetPasswordOpen(false); setNewPassword(""); } }
    );
  };

  const baseStudents = (students ?? []).filter((student: any) => {
    const linkedCourse = (courses ?? []).find((course: any) => course.id === student.courseId) as any;
    return studentCategory !== "academic" && studentCategory !== "computer" ? true : (linkedCourse?.courseType ?? "academic") === studentCategory;
  });

  const totalStudents = baseStudents.length;
  const activeStudents = baseStudents.filter((student: any) => (student.status ?? "active") === "active").length;
  const inactiveStudents = totalStudents - activeStudents;
  const droppedStudents = inactiveStudents;
  const newStudents = baseStudents.filter((student: any) => {
    if (!student.createdAt) return false;
    return Math.ceil(Math.abs(new Date().getTime() - new Date(student.createdAt).getTime()) / (1000 * 60 * 60 * 24)) <= 30;
  }).length;

  const filled = (s: keyof StudentForm) => String(form[s] ?? "").trim().length > 0;
  const section1Filled = filled("name") && filled("dateOfBirth") && filled("gender") && filled("schoolName") && form.courseId !== "" && form.batchId !== "";
  const section2Filled = filled("motherPhone") || filled("fatherPhone") || filled("emergencyPhone");
  const section3Filled = filled("correspondenceAddress") && filled("correspondenceState") && filled("correspondenceDistrict") && filled("correspondencePin");
  const section4Filled = filled("loginId") && filled("loginPassword");
  const saving = createStudent.isPending || updateStudent.isPending;

  const batchOptions = [{ label: "All Batches", value: "all" }, ...(batches?.map((b: any) => ({ label: b.name, value: b.id })) || [])];
  const statusOptions = [{ label: "All Status", value: "all" }, { label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }, { label: "Dropped", value: "dropped" }, { label: "Graduated", value: "graduated" }];
  const sortOptions = [{ label: "Admission No (A-Z)", value: "admission-asc" }, { label: "Admission No (Z-A)", value: "admission-desc" }, { label: "Name (A-Z)", value: "name-asc" }, { label: "Name (Z-A)", value: "name-desc" }];

  // ---------------------------------------------------------------------------
  // FORM PAGE VIEW (NEW ADD/EDIT full page)
  // ---------------------------------------------------------------------------
  if (formPageOpen) {
    return (
      <div className="max-w-6xl mx-auto pb-10">
        
        {/* 🌟 100% WORKING STICKY HEADER & PROGRESS BAR */}
        <div className="sticky top-0 z-30 bg-[#f6f7f9] pt-1 pb-3 space-y-3">
          
          {/* Top Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full bg-slate-50 border border-slate-200 hover:bg-slate-100 h-9 w-9 shrink-0" 
                onClick={closeForm}
              >
                <ArrowLeft className="h-4 w-4 text-slate-700" />
              </Button>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-tight">
                  {editingStudent ? "Edit Student Admission" : "New Student Admission Form"}
                </h1>
                <p className="text-[11px] text-slate-500">
                  {studentCategory === "academic" ? "Academic Student" : studentCategory === "computer" ? "Computer Student" : "Fill all fields carefully"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={closeForm} className="h-9 text-xs bg-white">Cancel</Button>
              <Button onClick={saveStudent} disabled={saving} className="h-9 text-xs bg-[#4d7c0f] hover:bg-[#3f660c] text-white font-medium px-4 shadow-sm">
                {saving ? "Saving..." : (editingStudent ? "Update Student" : "Save Admission")}
              </Button>
            </div>
          </div>

          {/* 📍 PROGRESS BAR */}
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <FormProgress 
              steps={[
                { label: "Student", filled: section1Filled }, 
                { label: "Parents", filled: section2Filled }, 
                { label: "Address", filled: section3Filled }, 
                { label: "Docs", filled: !!(form.aadhaarCard || form.previousMarksheet) }, 
                { label: "Login", filled: section4Filled }
              ]} 
            />
          </div>

        </div>

        {/* FORM BODY */}
        <div className="space-y-5 pt-1">
          
          {/* SECTION 1: STUDENT INFO */}
          <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white">
            <CardContent className="p-6 space-y-5">
              <SectionTitle number={1} icon={<GraduationCap className="h-5 w-5" />} tone="red">Student's Information</SectionTitle>

              <div className="grid gap-5 md:grid-cols-[1fr_200px]">
                <div className="space-y-4">
                  <FormRow cols={2}>
                    <div className="space-y-1">
                      <FormInput label="Student Name" required value={form.name} onChange={(v: string) => setValue("name", v)} placeholder="Enter student name" />
                      {fieldErrors.name && <p className="text-[11px] font-medium text-red-500">{fieldErrors.name}</p>}
                    </div>
                    <div className="space-y-1">
                      <DateInput label="Date of Birth" required value={form.dateOfBirth} onChange={(v: string) => setValue("dateOfBirth", v)} onValidityChange={(valid: boolean) => setDobInvalid(!valid)} hint="DD/MM/YYYY format" />
                      {fieldErrors.dateOfBirth && <p className="text-[11px] font-medium text-red-500">{fieldErrors.dateOfBirth}</p>}
                    </div>
                  </FormRow>
                  
                  <FormRow cols={2}>
                    <div className="space-y-2">
                      {/* Gender Dropdown */}
                      <FormSelect 
                        label="Gender" 
                        value={form.gender} 
                        onChange={(v: string) => {
                          setValue("gender", v);
                          // Agar Male/Female chuna, to genderOther ko clear kar do
                          if (v !== "other") setValue("genderOther", "");
                        }} 
                        options={[
                          { label: "Male", value: "male" }, 
                          { label: "Female", value: "female" }, 
                          { label: "Other", value: "other" }
                        ]} 
                        placeholder="Select gender" 
                      />

                      {/* ⚡ Jab "other" select hoga, tabhi ye input box dikhega */}
                      {form.gender === "other" && (
                        <FormInput 
                          label="Specify Gender" 
                          required
                          value={form.genderOther || ""} 
                          onChange={(v: string) => setValue("genderOther", v)} 
                          placeholder="Type gender" 
                        />
                      )}
                    </div>
                    <FormSelect 
                      label="Blood Group (Optional)" 
                      value={form.bloodGroup || ""} 
                      onChange={(v: string) => setValue("bloodGroup", v)} 
                      options={[
                        { label: "A+", value: "A+" }, { label: "A-", value: "A-" },
                        { label: "B+", value: "B+" }, { label: "B-", value: "B-" },
                        { label: "AB+", value: "AB+" }, { label: "AB-", value: "AB-" },
                        { label: "O+", value: "O+" }, { label: "O-", value: "O-" }
                      ]} 
                      placeholder="Select blood group" 
                    />
                  </FormRow>

                  <FormRow cols={2}>
                    <FormInput label="School Name" value={form.schoolName} onChange={(v: string) => setValue("schoolName", v)} placeholder="Enter school name" />
                    <FormInput label="Academic Year" required value={form.academicYear} onChange={(v: string) => setValue("academicYear", v)} />
                  </FormRow>
                </div>
                
                {/* Photo Box */}
                <div className="rounded-xl border-2 border-dashed bg-slate-50 p-3">
                  <Label className="block text-center text-xs font-bold uppercase tracking-wide text-slate-500">Student Photo</Label>
                  <div className="mx-auto mt-3 flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white shadow-lg ring-2 ring-primary/20">
                    {form.photoDataUrl ? <img src={form.photoDataUrl} alt="Student" className="h-full w-full object-cover" /> : <UserRound className="h-14 w-14 text-slate-300" />}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <label className="flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border bg-white text-xs font-semibold shadow-sm hover:bg-slate-50"><Upload className="h-3.5 w-3.5" />Upload<input type="file" accept="image/*" className="hidden" onChange={(e: any) => handlePhotoChange(e.target.files?.[0])} /></label>
                    <Button type="button" variant="outline" className="h-9 bg-white text-xs font-semibold shadow-sm" onClick={() => { setDocCameraLabel(null); setCameraOpen(true); }}><Camera className="mr-1.5 h-3.5 w-3.5" />Camera</Button>
                  </div>
                  {form.photoDataUrl && (
                    <Button 
                      type="button" variant="ghost" 
                      className="mt-2 h-7 w-full text-xs text-red-600 hover:bg-red-50" 
                      onClick={() => { setValue("photoDataUrl", ""); setIsPhotoRemoved(true); }}
                    >
                      <X className="mr-1 h-3 w-3" />Remove
                    </Button>
                  )}
                </div>
              </div>

              <FormRow cols={3}>
                <FormSelect label="Class" value={form.className} onChange={(v: string) => setValue("className", v)} options={CLASS_OPTIONS.map((c) => ({ label: c, value: c }))} placeholder="Select class" />
                <FormInput label="Section" value={form.section} onChange={(v: string) => setValue("section", v)} placeholder="Example: A" />
                <div className="space-y-2">
                  <FormSelect 
                    label="Board" 
                    value={form.board} 
                    onChange={(v: string) => {
                      setValue("board", v);
                      if (v !== "Other" && v !== "other") setValue("boardOther", "");
                    }} 
                    options={
                      BOARD_OPTIONS.includes("Other") 
                        ? BOARD_OPTIONS.map((b) => ({ label: b, value: b }))
                        : [...BOARD_OPTIONS, "Other"].map((b) => ({ label: b, value: b }))
                    } 
                    placeholder="Select board" 
                  />

                  {/* Jab "Other" select ho tabhi ye input box dikhega */}
                  {(form.board === "Other" || form.board === "other") && (
                    <FormInput 
                      label="Specify Board Name" 
                      required
                      value={form.boardOther || ""} 
                      onChange={(v: string) => setValue("boardOther", v)} 
                      placeholder="Type board name" 
                    />
                  )}
                </div>
              </FormRow>
              <FormRow cols={2}>
                <PercentField value={form.lastClassPercentage} onChange={(v: string) => setValue("lastClassPercentage", v)} error={fieldErrors.lastClassPercentage} />
                <FormInput label="Marks Obtained in Last Class" value={form.lastClassMarks} onChange={(v: string) => setValue("lastClassMarks", v)} placeholder="Example: 410 / 500" />
              </FormRow>
              <FormRow cols={2}>
                <div className="space-y-1">
                  <FormSelect label="Course" required value={form.courseId} onChange={(v: string) => setForm((old) => ({ ...old, courseId: v, batchId: "" }))} options={visibleCourses.map((c: any) => ({ label: c.name, value: c.id }))} placeholder="Select course" />
                  {fieldErrors.courseId && <p className="text-[11px] font-medium text-red-500">{fieldErrors.courseId}</p>}
                </div>
                <div className="space-y-1">
                  <FormSelect label="Batch" required value={form.batchId} onChange={(v: string) => setValue("batchId", v)} options={filteredBatches.map((b: any) => ({ label: b.name, value: b.id }))} placeholder={form.courseId ? "Select batch" : "Select course first"} disabled={!form.courseId} />
                  {fieldErrors.batchId && <p className="text-[11px] font-medium text-red-500">{fieldErrors.batchId}</p>}
                </div>
              </FormRow>
            </CardContent>
          </Card>

          {/* SECTION 2: PARENT */}
          <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white">
            <CardContent className="p-6 space-y-5">
              <SectionTitle number={2} icon={<Users className="h-5 w-5" />} tone="red">Parent's Information</SectionTitle>
              <div className="rounded-xl border p-4">
                <h3 className="mb-4 flex items-center gap-2 font-semibold"><span className="h-2 w-2 rounded-full bg-pink-500" />Mother's Details</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormInput label="Mother's Name" value={form.motherName} onChange={(v: string) => setValue("motherName", v)} />
                  <FormInput label="Occupation" value={form.motherOccupation} onChange={(v: string) => setValue("motherOccupation", v)} />
                  <PhoneField label="Contact Number" value={form.motherPhone} onChange={(v: string) => setValue("motherPhone", v)} code={form.motherPhoneCode} onCodeChange={(c: string) => setValue("motherPhoneCode", c)} />
                  <WhatsappField value={form.motherWhatsapp} contact={form.motherPhone} contactCode={form.motherPhoneCode} onChange={(v: string) => setValue("motherWhatsapp", v)} code={form.motherWhatsappCode} onCodeChange={(c: string) => setValue("motherWhatsappCode", c)} />
                </div>
              </div>
              <div className="rounded-xl border p-4">
                <h3 className="mb-4 flex items-center gap-2 font-semibold"><span className="h-2 w-2 rounded-full bg-blue-500" />Father's Details</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormInput label="Father's Name" value={form.fatherName} onChange={(v: string) => setValue("fatherName", v)} />
                  <FormInput label="Occupation" value={form.fatherOccupation} onChange={(v: string) => setValue("fatherOccupation", v)} />
                  <PhoneField label="Contact Number" value={form.fatherPhone} onChange={(v: string) => setValue("fatherPhone", v)} code={form.fatherPhoneCode} onCodeChange={(c: string) => setValue("fatherPhoneCode", c)} />
                  <WhatsappField value={form.fatherWhatsapp} contact={form.fatherPhone} contactCode={form.fatherPhoneCode} onChange={(v: string) => setValue("fatherWhatsapp", v)} code={form.fatherWhatsappCode} onCodeChange={(c: string) => setValue("fatherWhatsappCode", c)} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <PhoneField label="Emergency Contact" value={form.emergencyPhone} onChange={(v: string) => setValue("emergencyPhone", v)} code={form.emergencyPhoneCode} onCodeChange={(c: string) => setValue("emergencyPhoneCode", c)} />
                <EmailField value={form.email} onChange={(v: string) => setValue("email", v)} />
              </div>
              {fieldErrors.contact && <p className="text-xs text-red-600 mt-2 bg-red-50 border border-red-200 p-2 rounded-lg">{fieldErrors.contact}</p>}
            </CardContent>
          </Card>

          {/* SECTION 3: ADDRESS */}
          <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white">
            <CardContent className="p-6 space-y-5">
              <SectionTitle number={3} icon={<MapPin className="h-5 w-5" />} tone="red">Address Details</SectionTitle>
              <div className="rounded-xl border p-4">
                <FormInput label="Address" value={form.correspondenceAddress} onChange={(v: string) => setValue("correspondenceAddress", v)} />
                <div className="grid gap-4 md:grid-cols-3 mt-4">
                  <SearchableDropdown label="State" value={form.correspondenceState} options={INDIA_STATES} placeholder="Search state" onChange={(v: string) => setForm((old) => ({ ...old, correspondenceState: v, correspondenceDistrict: "" }))} />
                  <SearchableDropdown label="District" value={form.correspondenceDistrict} options={getDistricts(form.correspondenceState)} placeholder={form.correspondenceState ? "Search district" : "Select state first"} disabled={!form.correspondenceState} onChange={(v: string) => setValue("correspondenceDistrict", v)} />
                  <div className="space-y-1.5"><Label className="text-xs font-medium text-slate-600">PIN</Label><Input placeholder="6 digit" value={form.correspondencePin} onChange={(e: any) => setValue("correspondencePin", e.target.value.replace(/\D/g, "").slice(0, 6))} className="h-9 text-sm shadow-sm" /></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 4: DOCUMENTS (Only Aadhaar & Marksheet) */}
          <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white">
            <CardContent className="p-6 space-y-5">
              <SectionTitle number={4} icon={<FileText className="h-5 w-5" />} tone="red">
                Documents
              </SectionTitle>
              <p className="text-xs text-slate-500 -mt-2">
                Upload Aadhaar Card and Previous Class Marksheet (Image/PDF, Max 5MB)
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Aadhaar Card */}
                <div className="rounded-xl border p-4 space-y-3">
                  <Label className="text-xs font-medium text-slate-600">Aadhaar Card</Label>
                  {form.aadhaarCard ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center">
                        ✅ Aadhaar uploaded
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 w-full text-xs text-red-600 hover:bg-red-50"
                        onClick={() => setValue("aadhaarCard", "")}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border bg-slate-50 text-xs font-semibold hover:bg-slate-100 transition-colors">
                      <Upload className="h-4 w-4 text-slate-500" />
                      Upload Aadhaar
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e: any) => handleDocumentUpload("aadhaarCard", e.target.files?.[0])}
                      />
                    </label>
                  )}
                </div>

                {/* Previous Class Marksheet */}
                <div className="rounded-xl border p-4 space-y-3">
                  <Label className="text-xs font-medium text-slate-600">Previous Class Marksheet</Label>
                  {form.previousMarksheet ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center">
                        ✅ Marksheet uploaded
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 w-full text-xs text-red-600 hover:bg-red-50"
                        onClick={() => setValue("previousMarksheet", "")}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border bg-slate-50 text-xs font-semibold hover:bg-slate-100 transition-colors">
                      <Upload className="h-4 w-4 text-slate-500" />
                      Upload Marksheet
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e: any) => handleDocumentUpload("previousMarksheet", e.target.files?.[0])}
                      />
                    </label>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* SECTION 4: LOGIN */}
          <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white">
            <CardContent className="p-6 space-y-5">
              <SectionTitle number={5} icon={<KeyRound className="h-5 w-5" />} tone="red">Student Login Details</SectionTitle>
              <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4">
                <p className="mb-4 text-xs text-muted-foreground">Student in details se portal me login karega. Login ID unique honi chahiye.</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <IdCard className="h-3.5 w-3.5 text-muted-foreground" /> Login ID
                    </Label>
                    <div className="flex gap-2">
                      <Input autoComplete="off" name="student_login_id_new" value={form.loginId} onChange={(e: any) => setValue("loginId", e.target.value.toLowerCase().replace(/\s/g, ""))} className="h-9 text-sm shadow-sm" />
                      <Button type="button" variant="outline" className="shrink-0 h-9" onClick={() => {
                          const base = form.name.trim().toLowerCase().replace(/[^a-z]/g, "");
                          const phoneSrc = form.fatherPhone || form.motherPhone || form.emergencyPhone || "";
                          const last4 = phoneSrc.slice(-4);
                          if (base) setValue("loginId", `${base}${last4}`);
                        }}>
                        Auto
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <KeyRound className="h-3.5 w-3.5 text-muted-foreground" /> Password
                    </Label>
                    <div className="relative flex gap-2">
                      <div className="relative flex-1">
                        <Input autoComplete="new-password" name="student_login_password_new" type={showPassword ? "text" : "password"} value={form.loginPassword} placeholder={editingStudent ? "Blank = no change" : "Min 6 characters"} onChange={(e: any) => setValue("loginPassword", e.target.value)} className={`pr-10 h-9 text-sm shadow-sm ${fieldErrors.loginPassword ? "border-red-500" : ""}`} />
                        <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <Button type="button" variant="outline" className="shrink-0 h-9" onClick={() => {
                          const dob = form.dateOfBirth.replace(/\D/g, "");
                          setValue("loginPassword", dob || Math.random().toString(36).slice(-8));
                          setShowPassword(true);
                        }}>
                        Generate
                      </Button>
                    </div>
                    {fieldErrors.loginPassword && <p className="text-[11px] font-medium text-red-500">{fieldErrors.loginPassword}</p>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save button at bottom */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeForm} className="h-11 px-6">Cancel</Button>
            <Button onClick={saveStudent} disabled={saving} className="h-11 bg-[#4d7c0f] hover:bg-[#3f660c] text-white font-medium px-6 shadow-sm">
              {saving ? "Saving..." : (editingStudent ? "Update Student" : "Save Student Admission")}
            </Button>
          </div>
        </div>

        <CameraCapture 
          open={cameraOpen} 
          onClose={() => { setCameraOpen(false); setDocCameraLabel(null); }} 
          onCapture={(dataUrl) => { 
            if (docCameraLabel) handleDocumentCapture(docCameraLabel, dataUrl); 
            else { setValue("photoDataUrl", dataUrl); setIsPhotoRemoved(false); } 
            setDocCameraLabel(null); 
          }} 
        />
        
        {/* Toast */}
        {toast && (
          <div className={`fixed bottom-4 right-4 z-[200] flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm shadow-lg ${toast.type === "success" ? "border-green-300 bg-green-50 text-green-800" : "border-red-300 bg-red-50 text-red-800"}`}>
            {toast.type === "success" ? "✅" : "⚠️"}
            <span>{toast.msg}</span>
          </div>
        )}
      </div>
    );
  }
  
  // ---------------------------------------------------------------------------
  // PROFILE VIEW (EYE BUTTON CLICKED)
  // ---------------------------------------------------------------------------
  if (viewingStudent) {
    const s = viewingStudent;
    const initials = String(s.name || "S").split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase();
    const isInactive = s.status === "inactive";
    const enrolled = s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";

    const feeInfo = getStudentFeeInfo(s);

    return (
      <div className="space-y-4">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm border border-slate-200" onClick={() => setViewingStudent(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{s.name}</h1>
              <p className="text-xs text-slate-500">{s.enrollmentNo || s.id} {s.batchName ? `· ${s.batchName}` : ""}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="h-9 shadow-sm" onClick={() => { setViewingStudent(null); openEdit(s); }}>
              <Pencil className="mr-1.5 h-4 w-4" /> Edit
            </Button>
            <Button variant="outline" className="h-9 text-red-600 border-red-200 hover:bg-red-50 shadow-sm font-semibold" onClick={() => { setNewPassword(Math.random().toString(36).slice(-10)); setResetPasswordOpen(true); }}>
              <KeyRound className="mr-1.5 h-4 w-4" /> Reset Password
            </Button>
            <Button variant="outline" className="h-9 text-amber-700 border-amber-200 hover:bg-amber-50 shadow-sm" onClick={() => updateStudentStatus(s, isInactive ? "active" : "inactive")}>
              <Ban className="mr-1.5 h-4 w-4" /> {isInactive ? "Activate" : "Deactivate"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">
          {/* LEFT PROFILE CARD */}
          <div className="space-y-4">
            <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
              <CardContent className="p-5">
                <div className="flex flex-col items-center text-center">
                  {s.photoDataUrl ? (
                    <img src={s.photoDataUrl} alt={s.name} className="h-24 w-24 rounded-full object-cover border-4 border-white shadow" />
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-blue-600 text-white flex items-center justify-center text-3xl font-bold border-4 border-white shadow">
                      {initials}
                    </div>
                  )}
                  <h2 className="mt-3 text-lg font-bold text-[#4d7c0f]">{s.name}</h2>
                  <p className="text-xs text-slate-500">{s.email || "No email"}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.phone || "-"} {s.batchName ? `· ${s.batchName}` : ""}</p>

                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isInactive ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"}`}>
                      ● {isInactive ? "Inactive" : "Active"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" /> Enrolled: {enrolled}
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl border border-slate-100 p-2">
                    <p className="text-lg font-bold text-emerald-600">100%</p>
                    <p className="text-[10px] text-slate-400 font-bold tracking-wider">ATTEND.</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-2">
                    <p className="text-lg font-bold text-slate-600">0%</p>
                    <p className="text-[10px] text-slate-400 font-bold tracking-wider">SCORE</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-50 pb-2">
                    <span className="text-slate-500 flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /> Phone</span>
                    <span className="font-medium text-slate-800">{s.phone || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-b border-slate-50 pb-2">
                    <span className="text-slate-500 flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> Student email</span>
                    <span className="font-medium text-slate-800 truncate max-w-[180px]">{s.email || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-b border-slate-50 pb-2">
                    <span className="text-slate-500 flex items-center gap-2"><User className="h-4 w-4 text-slate-400" /> Class Teacher</span>
                    <span className="font-medium text-slate-800">{s.classTeacher || s.name || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-b border-slate-50 pb-2">
                    <span className="text-slate-500 flex items-center gap-2"><User className="h-4 w-4 text-slate-400" /> Father</span>
                    <span className="font-medium text-slate-800">{s.fatherName || s.parentName || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-b border-slate-50 pb-2">
                    <span className="text-slate-500 flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> Parent email</span>
                    <span className="font-medium text-slate-800">-</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-400" /> Enrollment Date</span>
                    <span className="font-medium text-slate-800">{enrolled}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Student Login Details Card */}
            <Card className="rounded-2xl border-amber-200 bg-amber-50/50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-amber-700 uppercase mb-3">
                  <ShieldCheck className="h-4 w-4" /> Student Login Details
                </div>
                <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-lg border border-amber-100">
                  <div className="text-xs text-slate-700 truncate flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-800">{s.loginId || s.name?.toLowerCase().replace(/\s/g, "") || "student"}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{s.email || "no@email.com"}</span>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 shrink-0 font-bold" onClick={() => { setNewPassword(Math.random().toString(36).slice(-10)); setResetPasswordOpen(true); }}>
                    <KeyRound className="mr-1 h-3 w-3" /> Reset Password
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Dynamic Fee Summary */}
            <Card className="rounded-2xl border-slate-200 shadow-sm bg-white">
              <CardContent className="p-4">
                <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                  Fee Summary
                </p>
                <div className="h-1.5 w-full bg-slate-100 rounded-full mt-2 mb-4 overflow-hidden">
                  {feeInfo.paid > 0 && <div className="h-full bg-[#4d7c0f] rounded-full transition-all" style={{ width: `${Math.min(100, (feeInfo.paid / (feeInfo.total || 1)) * 100)}%` }}></div>}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Total Billed</span><span className="font-semibold text-slate-700">₹{feeInfo.total.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Paid</span><span className="font-semibold text-emerald-600">₹{feeInfo.paid.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between border-t border-slate-100 pt-2 mt-1"><span className="text-slate-700 font-bold">Due</span><span className="font-bold text-red-500">₹{feeInfo.due.toLocaleString("en-IN")}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT CONTENT (TABS) */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-1.5 flex flex-wrap gap-1 shadow-sm">
              {[
                { id: "attendance", label: "Attendance", icon: CalendarDays },
                { id: "fees", label: "Tuition Fees", icon: Wallet },
                { id: "results", label: "Results", icon: BarChart3 },
                { id: "exams", label: "Exams", icon: ClipboardList },
                { id: "info", label: "More Info", icon: Info },
                { id: "documents", label: "Documents", icon: FolderOpen },
              ].map((t) => {
                const Icon = t.icon;
                const active = profileTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setProfileTab(t.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      active ? "bg-white text-emerald-700 shadow-sm border border-emerald-100" : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            <Card className="rounded-2xl border-slate-200 shadow-sm min-h-[420px] bg-white">
              <CardContent className="p-5">
                {profileTab === "attendance" && (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                      <h3 className="font-bold text-slate-800 text-lg">
                        Monthly Attendance — {new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Select defaultValue={new Date().toLocaleString("en-US", { month: "long" })}>
                          <SelectTrigger className="h-8 text-xs font-medium w-[110px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select defaultValue="2026"><SelectTrigger className="h-8 text-xs font-medium"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="2026">2026</SelectItem></SelectContent></Select>
                        <div className="text-xl font-bold text-emerald-600 ml-2">100<span className="text-sm">%</span></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-0 border rounded-xl overflow-hidden mb-6 text-center divide-x">
                      <div className="bg-slate-50 p-4"><p className="text-2xl font-bold text-slate-700">1</p><p className="text-[10px] font-bold text-slate-400 tracking-wider">TOTAL</p></div>
                      <div className="bg-white p-4"><p className="text-2xl font-bold text-emerald-600">1</p><p className="text-[10px] font-bold text-slate-400 tracking-wider">PRESENT</p></div>
                      <div className="bg-white p-4"><p className="text-2xl font-bold text-red-500">0</p><p className="text-[10px] font-bold text-slate-400 tracking-wider">ABSENT</p></div>
                      <div className="bg-white p-4"><p className="text-2xl font-bold text-amber-500">0</p><p className="text-[10px] font-bold text-slate-400 tracking-wider">LATE</p></div>
                    </div>

                    <div className="mb-2 flex justify-between text-xs text-slate-500"><span>Monthly Attendance Rate</span><span className="font-bold text-emerald-600">100%</span></div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-6"><div className="h-full w-full bg-emerald-500" /></div>

                    <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-slate-400 mb-2">
                      {["SUN","MON","TUE","WED","THU","FRI","SAT"].map((d) => <div key={d}>{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-2 text-center text-xs">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <div key={d} className={`py-2 rounded-lg border ${d === new Date().getDate() ? "bg-white border-emerald-400 text-emerald-700 font-bold shadow-sm" : "bg-slate-50 border-transparent text-slate-400"}`}>
                          {d}
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 flex flex-wrap gap-4 text-xs font-medium text-slate-500">
                      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-white border border-emerald-400 shadow-sm" /> Present</span>
                      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-100 border border-red-200" /> Absent</span>
                      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-100 border border-amber-200" /> Late</span>
                      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-slate-50 border border-slate-200" /> No record</span>
                    </div>
                  </div>
                )}

                {profileTab === "fees" && (
                  <div className="text-sm text-slate-600 space-y-3">
                    <h3 className="font-bold text-slate-800 text-base border-b pb-2">Tuition Fees Ledger</h3>
                    <p>No fee records found for this student.</p>
                  </div>
                )}
                {profileTab === "results" && (
                  <div className="text-sm text-slate-600 space-y-3">
                    <h3 className="font-bold text-slate-800 text-base border-b pb-2">Exam Results</h3>
                    <p>No results published yet.</p>
                  </div>
                )}
                {profileTab === "exams" && (
                  <div className="text-sm text-slate-600 space-y-3">
                    <h3 className="font-bold text-slate-800 text-base border-b pb-2">Upcoming & Past Exams</h3>
                    <p>No exams assigned.</p>
                  </div>
                )}
                {profileTab === "info" && (
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="rounded-xl border p-4 space-y-2 bg-slate-50">
                      <h4 className="font-bold text-slate-800 border-b pb-2 mb-3">Academic Info</h4>
                      <p className="flex justify-between"><span className="text-slate-500">Class</span> <span className="font-medium text-slate-700">{s.className || "-"}</span></p>
                      <p className="flex justify-between"><span className="text-slate-500">Section</span> <span className="font-medium text-slate-700">{s.section || "-"}</span></p>
                      <p className="flex justify-between"><span className="text-slate-500">Board</span> <span className="font-medium text-slate-700">{s.board || "-"}</span></p>
                      <p className="flex justify-between"><span className="text-slate-500">School</span> <span className="font-medium text-slate-700">{s.schoolName || "-"}</span></p>
                      <p className="flex justify-between"><span className="text-slate-500">Course</span> <span className="font-medium text-slate-700">{s.courseName || "-"}</span></p>
                      <p className="flex justify-between"><span className="text-slate-500">Batch</span> <span className="font-medium text-slate-700">{s.batchName || "-"}</span></p>
                    </div>
                    <div className="rounded-xl border p-4 space-y-2 bg-slate-50">
                      <h4 className="font-bold text-slate-800 border-b pb-2 mb-3">Address Info</h4>
                      <p className="text-slate-700">{s.correspondenceAddress || s.address || "-"}</p>
                      <p className="text-slate-700">{s.correspondenceDistrict || ""} {s.correspondenceState || ""}</p>
                      <p className="text-slate-700">PIN: {s.correspondencePin || "-"}</p>
                    </div>
                  </div>
                )}
                {profileTab === "documents" && (
                  <div className="text-sm text-slate-600">
                    <h3 className="font-bold text-slate-800 text-base mb-4 border-b pb-2">Uploaded Documents</h3>
                    {Array.isArray(s.documents) && s.documents.length > 0 ? (
                      <div className="grid sm:grid-cols-2 gap-3">
                        {s.documents.map((d: any, i: number) => (
                          <div key={i} className="flex items-center justify-between rounded-xl border p-3 bg-white shadow-sm">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="bg-blue-50 p-2 rounded-lg text-blue-500"><FolderOpen className="h-5 w-5" /></div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 truncate">{d.label || d.name}</p>
                                <p className="text-[10px] text-slate-400 truncate">{d.name}</p>
                              </div>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:bg-blue-50 shrink-0" onClick={() => viewDocument(d)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <FolderOpen className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-slate-400">No documents uploaded.</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Reset Password Modal */}
        <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
          <DialogContent className="max-w-sm p-0 rounded-2xl border-0 shadow-2xl overflow-hidden">
            <div className="bg-[#4d7c0f] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg font-bold">
                <KeyRound className="h-5 w-5" />
                <span>Reset Password</span>
              </div>
              <button onClick={() => setResetPasswordOpen(false)} className="text-white/80 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 bg-white">
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                <p className="font-bold text-[#4d7c0f]">{viewingStudent?.name}</p>
                <p className="text-sm text-slate-500">{viewingStudent?.email || "No email provided"}</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Password *</Label>
                <div className="flex">
                  <Input autoComplete="new-password" value={newPassword} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)} className="rounded-r-none h-10 shadow-sm" />
                  <Button variant="outline" className="rounded-l-none h-10 px-3 shadow-sm border-l-0" onClick={() => setNewPassword(Math.random().toString(36).slice(-10))}>
                    <RefreshCw className="h-4 w-4 text-slate-500" />
                  </Button>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={resetParentPwd} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResetParentPwd(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-[#4d7c0f]" />
                <span className="text-sm font-semibold text-slate-700">Also reset parent password</span>
              </label>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-amber-900 text-xs">
                <Mail className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Password will be emailed to user.</span>
              </div>
            </div>

            <div className="border-t border-slate-100 px-5 py-3 bg-slate-50 flex justify-between gap-3">
              <Button variant="outline" className="flex-1 rounded-xl h-10" onClick={() => setResetPasswordOpen(false)}>Cancel</Button>
              <Button className="flex-1 rounded-xl h-10 bg-red-600 hover:bg-red-700 text-white shadow-sm" onClick={submitResetPassword}>
                <KeyRound className="h-4 w-4 mr-2" /> Reset
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        {toast && (
          <div className={`fixed bottom-4 right-4 z-[200] flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm shadow-lg ${toast.type === "success" ? "border-green-300 bg-green-50 text-green-800" : "border-red-300 bg-red-50 text-red-800"}`}>
            {toast.type === "success" ? "✅" : "⚠️"}
            <span>{toast.msg}</span>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // MAIN LIST VIEW (STUDENTS DIRECTORY)
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{pageTitle}</h1>
          <p className="text-sm text-slate-600 mt-1">Manage all enrolled students across batches</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm h-9 px-3" onClick={() => setBulkUpdateDialogOpen(true)}>
            <Edit className="mr-1.5 h-4 w-4" /> Bulk Update
          </Button>
          <Button variant="outline" className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm h-9 px-3" onClick={() => setImportDialogOpen(true)}>
            <UploadCloud className="mr-1.5 h-4 w-4" /> Import
          </Button>
          <Button variant="outline" className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm h-9 px-3" onClick={handleExport}>
            <Download className="mr-1.5 h-4 w-4" /> Export
          </Button>
          <Button onClick={openAdd} className="bg-[#4d7c0f] hover:bg-[#3f660c] text-white shadow-sm font-medium h-9 px-4">
            <UserPlus className="mr-1.5 h-4 w-4" /> Admit Student
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
        <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-slate-100 p-2.5 rounded-xl"><Users className="text-slate-600 h-5 w-5" /></div>
            <div><p className="text-2xl font-bold text-slate-800">{totalStudents}</p><p className="text-[10px] font-bold text-slate-500 tracking-wider">TOTAL</p></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-green-100 p-2.5 rounded-xl"><UserCheck className="text-green-600 h-5 w-5" /></div>
            <div><p className="text-2xl font-bold text-green-600">{activeStudents}</p><p className="text-[10px] font-bold text-slate-800 tracking-wider uppercase">ACTIVE</p></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-slate-100 p-2.5 rounded-xl"><UserMinus className="text-slate-500 h-5 w-5" /></div>
            <div><p className="text-2xl font-bold text-slate-800">{droppedStudents}</p><p className="text-[10px] font-bold text-slate-800 tracking-wider uppercase">DROPPED</p></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-blue-50 p-2.5 rounded-xl"><UserPlus className="text-blue-500 h-5 w-5" /></div>
            <div><p className="text-2xl font-bold text-blue-500">{newStudents}</p><p className="text-[10px] font-bold text-slate-800 tracking-wider uppercase">NEW (MONTH)</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar with View Toggle */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 flex flex-col md:flex-row items-stretch md:items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            autoComplete="off"
            name="student_search_filter_box"
            className="w-full pl-9 border-slate-200 h-10 shadow-none focus-visible:ring-1 focus-visible:ring-slate-300 rounded-xl"
            placeholder="Search name, email, Student ID" value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
        </div>
        <div className="hidden md:block w-px h-6 bg-slate-200 mx-1"></div>
        <div className="grid grid-cols-2 md:flex items-center gap-2">
          <SearchableFilterDropdown value={batchFilter} onChange={setBatchFilter} options={batchOptions} placeholder="All Batches" className="md:w-[180px]" />
          <SearchableFilterDropdown value={statusFilter} onChange={setStatusFilter} options={statusOptions} placeholder="All Status" className="md:w-[140px]" />
          <SearchableFilterDropdown value={sortBy} onChange={setSortBy} options={sortOptions} placeholder="Sort By" className="md:w-[180px]" />
        </div>
        
        <div className="flex items-center justify-between gap-2 mt-2 md:mt-0">
          <Button variant="outline" onClick={handleClearFilters} className="border-slate-200 text-slate-600 hover:bg-slate-50 flex-1 md:flex-none h-10 rounded-xl shadow-sm">
            Clear
          </Button>
          
          <div className="hidden md:flex items-center h-10 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <button onClick={() => setViewMode("grid")} title="Grid View" className={`flex items-center justify-center h-full w-11 transition-colors ${viewMode === "grid" ? "bg-[#4d7c0f] text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <div className="h-full w-px bg-slate-200"></div>
            <button onClick={() => setViewMode("list")} title="List View" className={`flex items-center justify-center h-full w-11 transition-colors border-l border-slate-200 ${viewMode === "list" ? "bg-[#4d7c0f] text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Student List Section */}
      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="px-0">
          
          {/* Grid / Card View */}
          <div className={`space-y-3 ${viewMode === "grid" ? "md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0" : "md:hidden"}`}>
            {isLoading ? (
              <div className="col-span-full rounded-lg border bg-white p-4 text-center text-sm text-muted-foreground">Loading students...</div>
            ) : classWiseStudents.length === 0 ? (
              <div className="col-span-full rounded-lg border bg-white p-4 text-center text-sm text-muted-foreground">No students found</div>
            ) : (
              classWiseStudents.map((student: any, index: number) => {
                const feeInfo = getStudentFeeInfo(student);

                return (
                  <div key={student.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm relative flex flex-col justify-between">
                    <div className="flex items-start gap-3">
                      {student.photoDataUrl ? (
                        <img src={student.photoDataUrl} alt={student.name} className="h-14 w-14 shrink-0 rounded-lg border object-cover" />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border bg-muted"><UserRound className="h-5 w-5 text-muted-foreground" /></div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold"><span className="text-slate-400 mr-1.5 font-normal">#{index + 1}</span>{student.name}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{student.enrollmentNo || "-"} • {student.phone || "-"}</div>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">{student.className || "No Class"}</span>
                          <span className="rounded-full bg-purple-50 px-2 py-0.5 text-purple-700">{student.board || "No Board"}</span>
                          {feeInfo.isNoDue ? (
                            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-emerald-700 font-bold flex items-center gap-1"><Check className="h-3 w-3" /> No Due</span>
                          ) : (
                            <span className={`rounded-full px-2 py-0.5 font-bold border ${feeInfo.paid > 0 ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-red-50 border-red-200 text-red-600"}`}>{feeInfo.statusText}</span>
                          )}
                          <span className={`rounded-full px-2 py-0.5 ${student.status === "inactive" ? "bg-slate-100 text-slate-600" : "bg-green-50 text-green-700"}`}>
                            {student.status === "inactive" ? "Inactive" : "Active"}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground"><div>Course: {student.courseName || "-"}</div><div>Batch: {student.batchName || "-"}</div></div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-2">
                      <Button type="button" size="sm" variant="outline" className="h-9 text-xs bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50" onClick={() => { setViewingStudent(student); setProfileTab("attendance"); }}><Eye className="mr-1 h-3.5 w-3.5" /> View</Button>
                      <Button type="button" size="sm" variant="outline" className="h-9 text-xs bg-white" onClick={() => downloadAdmissionForm(student)}><Download className="mr-1 h-3.5 w-3.5" /> Form</Button>
                      <Button type="button" size="sm" variant="outline" className="h-9 text-xs bg-white" onClick={() => openEdit(student)}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                      <Button type="button" size="sm" variant="destructive" className="h-9 text-xs" onClick={() => handleDelete(student)}><Trash2 className="mr-1 h-3.5 w-3.5" /> Delete</Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Desktop Table View */}
          {viewMode === "list" && (
            <div className="hidden rounded-xl border border-slate-200 bg-white md:block overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-[60px] font-semibold text-slate-700 text-center">S.No.</TableHead>
                    <TableHead className="font-semibold text-slate-700">Student</TableHead>
                    <TableHead className="font-semibold text-slate-700">Student ID</TableHead>
                    <TableHead className="font-semibold text-slate-700">Class / Board</TableHead>
                    <TableHead className="font-semibold text-slate-700">Course / Batch</TableHead>
                    <TableHead className="font-semibold text-slate-700">Fees</TableHead>
                    <TableHead className="font-semibold text-slate-700">Status</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="py-10 text-center">Loading students...</TableCell></TableRow>
                  ) : classWiseStudents.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No students found</TableCell></TableRow>
                  ) : (
                    classWiseStudents.map((student: any, index: number) => {
                      const feeInfo = getStudentFeeInfo(student);

                      return (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium text-slate-500 text-center">{index + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {student.photoDataUrl ? (
                                <img src={student.photoDataUrl} alt={student.name} className="h-10 w-10 shrink-0 rounded-full border object-cover" />
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-slate-100">
                                  <UserRound className="h-5 w-5 text-slate-400" />
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-slate-900">{student.name}</div>
                                <div className="text-xs text-slate-500">{student.phone}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-600 font-medium">{student.enrollmentNo || "-"}</TableCell>
                          <TableCell>
                            <div className="text-slate-700 font-medium">{student.className || "-"}</div>
                            <div className="text-xs text-slate-500">{student.board || "-"}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-slate-700">{student.courseName || "-"}</div>
                            <div className="text-xs text-slate-500">{student.batchName || "-"}</div>
                          </TableCell>
                          <TableCell>
                            {feeInfo.isNoDue ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700 shadow-sm"><Check className="h-3 w-3" /> No Due</span>
                            ) : (
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border shadow-sm ${feeInfo.paid > 0 ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-red-50 border-red-200 text-red-600"}`}>{feeInfo.statusText}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Select value={student.status === "inactive" ? "inactive" : "active"} onValueChange={(value: "active" | "inactive") => updateStudentStatus(student, value)} disabled={updateStudent.isPending}>
                              <SelectTrigger className="h-8 w-[100px] border border-slate-200 bg-white shadow-sm focus:ring-0 rounded-md">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active"><Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-200 shadow-none border-none">Active</Badge></SelectItem>
                                <SelectItem value="inactive"><Badge variant="secondary" className="bg-slate-100 text-slate-600 shadow-none border-none">Inactive</Badge></SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" title="View Profile" className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50" onClick={() => { setViewingStudent(student); setProfileTab("attendance"); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Download Form" className="text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => downloadAdmissionForm(student)}>
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Edit Student" className="text-slate-400 hover:text-orange-600 hover:bg-orange-50" onClick={() => openEdit(student)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(student)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===================== ALL DIALOGS ===================== */}

      {/* BULK UPDATE DIALOG */}
      <Dialog open={bulkUpdateDialogOpen} onOpenChange={setBulkUpdateDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl gap-0 border-0 shadow-2xl">
          <div className="bg-[#4d7c0f] text-white px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-md">
            <div>
              <div className="flex items-center gap-2 text-xl font-bold">
                <Edit className="h-5 w-5" />
                <span>Bulk Update Students</span>
              </div>
              <p className="text-xs text-white/80 mt-0.5 font-normal">Download, edit in Excel, and re-upload to update existing student records</p>
            </div>
            <button onClick={() => setBulkUpdateDialogOpen(false)} className="text-white/80 hover:text-white rounded-lg p-1 transition-colors"><X className="h-5 w-5" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50/50">
            <div className="space-y-6">
              <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">HOW TO BULK UPDATE</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">1</span>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Download Current Data</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Click below to export a pre-filled CSV.</p>
                    <Button onClick={handleBulkDownloadTemplate} variant="outline" className="mt-2.5 h-9 border-emerald-300 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs rounded-lg shadow-sm">
                      <FileSpreadsheet className="mr-1.5 h-4 w-4 text-emerald-600" />
                      Download Student Data (CSV)
                    </Button>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">2</span>
                  <div><h4 className="text-sm font-semibold text-slate-800">Edit in Excel</h4><p className="text-xs text-slate-500 mt-0.5">Update any column. Do NOT change <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">admission_number</code>.</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">3</span>
                  <div><h4 className="text-sm font-semibold text-slate-800">Upload & Apply</h4><p className="text-xs text-slate-500 mt-0.5">Upload edited CSV. Each row is matched by <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">admission_number</code>.</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">4</span>
                  <div><h4 className="text-sm font-semibold text-slate-800">Review Results</h4><p className="text-xs text-slate-500 mt-0.5">See how many students were updated.</p></div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">UPLOAD EDITED CSV</h3>
              <div className="border-2 border-dashed border-emerald-300 bg-emerald-50/20 rounded-2xl p-8 text-center hover:bg-emerald-50/40 transition-colors cursor-pointer relative flex flex-col items-center justify-center min-h-[220px]">
                <input type="file" accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" onChange={(e: any) => setBulkUpdateFile(e.target.files?.[0] || null)} />
                <div className="bg-emerald-100 p-3.5 rounded-2xl mb-3 text-emerald-600"><FileSpreadsheet className="h-9 w-9" /></div>
                <p className="text-base font-bold text-emerald-700">Click to upload or drag & drop</p>
                <p className="text-xs text-slate-400 mt-1">CSV only · Max 10MB</p>
                {bulkUpdateFile && (<div className="mt-4 bg-emerald-100 border border-emerald-300 text-emerald-900 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 z-20 shadow-sm"><FileText className="h-4 w-4" /><span>{bulkUpdateFile.name}</span></div>)}
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-slate-700 flex items-start gap-2.5">
                <Info className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed"><span className="font-bold text-slate-800">Tip:</span> Only rows with valid <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono text-emerald-900">admission_number</code> will be updated.</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white px-6 py-3.5 flex items-center justify-between sticky bottom-0 z-20">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium"><ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" /><span>Only existing students are modified.</span></div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setBulkUpdateDialogOpen(false)} className="h-10 px-5 rounded-xl">Cancel</Button>
              <Button onClick={handleBulkUpdateApply} disabled={!bulkUpdateFile || isBulkUpdating} className="h-10 px-5 rounded-xl bg-[#0299cb] hover:bg-[#0284b5] text-white font-medium shadow-sm">
                <Edit className="mr-1.5 h-4 w-4" />
                {isBulkUpdating ? "Applying..." : "Apply Updates"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* BULK IMPORT DIALOG */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl gap-0 border-0 shadow-2xl">
          <div className="bg-[#4d7c0f] text-white px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-md">
            <div>
              <div className="flex items-center gap-2 text-xl font-bold"><UploadCloud className="h-5 w-5" /><span>Bulk Import Students</span></div>
              <p className="text-xs text-white/80 mt-0.5 font-normal">Upload a CSV to enroll multiple students at once</p>
            </div>
            <button onClick={() => setImportDialogOpen(false)} className="text-white/80 hover:text-white rounded-lg p-1 transition-colors"><X className="h-5 w-5" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50/50">
            <div className="space-y-6">
              <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">HOW TO IMPORT</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">1</span>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Download Template</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Start with our pre-formatted CSV template.</p>
                    <Button onClick={handleDownloadImportTemplate} variant="outline" className="mt-2.5 h-9 border-emerald-300 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100 font-semibold text-xs rounded-lg shadow-sm">Download Template</Button>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">2</span>
                  <div><h4 className="text-sm font-semibold text-slate-800">Fill Student Data</h4><p className="text-xs text-slate-500 mt-0.5">Open in Excel/Sheets. Do NOT rename column headers.</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">3</span>
                  <div><h4 className="text-sm font-semibold text-slate-800">Upload & Validate</h4><p className="text-xs text-slate-500 mt-0.5">Upload the file — we validate before importing.</p></div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">UPLOAD CSV FILE</h3>
              <div className="border-2 border-dashed border-emerald-300 bg-emerald-50/20 rounded-2xl p-8 text-center hover:bg-emerald-50/40 transition-colors cursor-pointer relative flex flex-col items-center justify-center min-h-[200px]">
                <input type="file" accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" onChange={(e: any) => setImportFile(e.target.files?.[0] || null)} />
                <div className="bg-blue-50 p-3.5 rounded-2xl mb-3 text-blue-500"><UploadCloud className="h-10 w-10 text-blue-400" /></div>
                <p className="text-base font-bold text-[#4d7c0f]">Click to upload or drag & drop</p>
                <p className="text-xs text-slate-400 mt-1">CSV only · Max 5MB · Up to 1,000 rows</p>
                {importFile && (<div className="mt-4 bg-emerald-100 border border-emerald-300 text-emerald-900 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 z-20 shadow-sm"><FileText className="h-4 w-4" /><span>{importFile.name}</span></div>)}
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-500 tracking-wider uppercase">IMPORT OPTIONS</h4>
                <label className="flex items-center gap-2.5 text-xs text-slate-700 font-medium cursor-pointer">
                  <input type="checkbox" checked={sendWelcomeEmail} onChange={(e) => setSendWelcomeEmail(e.target.checked)} className="h-4 w-4 accent-[#4d7c0f] rounded border-slate-300" />
                  <span>Send welcome email with login credentials</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-slate-700 font-medium cursor-pointer">
                  <input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} className="h-4 w-4 accent-[#4d7c0f] rounded border-slate-300" />
                  <span>Skip duplicate emails</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-slate-700 font-medium cursor-pointer">
                  <input type="checkbox" checked={autoGenPassword} onChange={(e) => setAutoGenPassword(e.target.checked)} className="h-4 w-4 accent-[#4d7c0f] rounded border-slate-300" />
                  <span>Auto-generate password if column is empty</span>
                </label>
              </div>
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed"><span className="font-bold text-amber-950">Before importing:</span> Make sure batch codes match exactly.</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white px-6 py-3.5 flex items-center justify-between sticky bottom-0 z-20">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium"><ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" /><span>All data is encrypted and stored securely.</span></div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setImportDialogOpen(false)} className="h-10 px-5 rounded-xl">Cancel</Button>
              <Button onClick={handleImportSubmit} disabled={!importFile || isImporting} className="h-10 px-5 rounded-xl bg-[#4d7c0f] hover:bg-[#3f660c] text-white font-medium shadow-sm">
                <UploadCloud className="mr-1.5 h-4 w-4" />
                {isImporting ? "Importing..." : "Import Students"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-[200] flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm shadow-lg ${toast.type === "success" ? "border-green-300 bg-green-50 text-green-800" : "border-red-300 bg-red-50 text-red-800"}`}>
          {toast.type === "success" ? "✅" : "⚠️"}
          <span>{toast.msg}</span>
        </div>
      )}

    </div>
  );
}