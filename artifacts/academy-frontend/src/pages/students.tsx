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
  DateInput,
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

const STUDENT_DOCUMENT_LABELS = {
  AADHAAR_FRONT: "Aadhaar Card Front",
  AADHAAR_BACK: "Aadhaar Card Back",
  MARKSHEET_FRONT: "Previous Class Marksheet",
} as const;

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
  const serverSummary = student?.feeSummary;

  if (serverSummary === null) {
    return {
      hasData: false,
      assigned: false,
      total: 0,
      paid: 0,
      due: 0,
      currentDue: 0,
      overdue: 0,
      outstanding: 0,
      upcoming: 0,
      isNoDue: false,
      status: "unavailable",
      statusText: "Fee access restricted",
    };
  }

  if (serverSummary && typeof serverSummary === "object") {
    const total = Math.max(0, Number(serverSummary.total ?? 0));
    const paid = Math.max(0, Number(serverSummary.paid ?? 0));
    const currentDue = Math.max(0, Number(serverSummary.currentDue ?? 0));
    const overdue = Math.max(0, Number(serverSummary.overdue ?? 0));
    const outstanding = Math.max(0, Number(serverSummary.outstanding ?? 0));
    const upcoming = Math.max(0, Number(serverSummary.upcoming ?? 0));
    const assigned = Boolean(serverSummary.assigned);

    let status = String(serverSummary.status || "assigned");
    let statusText = "Fee assigned";

    if (!assigned && Number(serverSummary.bills ?? 0) === 0) {
      status = "not_assigned";
      statusText = "Fee not assigned";
    } else if (overdue > 0) {
      status = "overdue";
      statusText = `₹${overdue.toLocaleString("en-IN")} Overdue`;
    } else if (currentDue > 0) {
      status = "due";
      statusText = `₹${currentDue.toLocaleString("en-IN")} Due`;
    } else if (outstanding > 0) {
      status = "upcoming";
      statusText = `₹${upcoming.toLocaleString("en-IN")} Upcoming`;
    } else if (total > 0) {
      status = "clear";
      statusText = "No Due";
    }

    return {
      hasData: true,
      assigned,
      total,
      paid,
      due: currentDue,
      currentDue,
      overdue,
      outstanding,
      upcoming,
      isNoDue: status === "clear",
      status,
      statusText,
    };
  }

  // Legacy fallback. Missing fee fields are never treated as "No Due".
  const legacyKeys = [
    "totalFee",
    "totalBilled",
    "feeAmount",
    "courseFee",
    "fee",
    "feesPaid",
    "paidAmount",
    "paidFee",
    "pendingFees",
    "dueFee",
  ];
  const hasLegacyFeeData = legacyKeys.some(
    (key) => student?.[key] !== undefined && student?.[key] !== null,
  );

  if (!hasLegacyFeeData) {
    return {
      hasData: false,
      assigned: false,
      total: 0,
      paid: 0,
      due: 0,
      currentDue: 0,
      overdue: 0,
      outstanding: 0,
      upcoming: 0,
      isNoDue: false,
      status: "not_synced",
      statusText: "Fee data not synced",
    };
  }

  const total = Number(
    student?.totalFee ??
      student?.totalBilled ??
      student?.feeAmount ??
      student?.courseFee ??
      student?.fee ??
      0,
  );
  const paid = Number(
    student?.feesPaid ?? student?.paidAmount ?? student?.paidFee ?? 0,
  );

  let due = 0;
  if (student?.pendingFees !== undefined && student?.pendingFees !== null) {
    due = Number(student.pendingFees);
  } else if (student?.dueFee !== undefined && student?.dueFee !== null) {
    due = Number(student.dueFee);
  } else if (total > 0) {
    due = Math.max(0, total - paid);
  }

  const isNoDue = total > 0 && due === 0;

  return {
    hasData: true,
    assigned: true,
    total,
    paid,
    due,
    currentDue: due,
    overdue: 0,
    outstanding: due,
    upcoming: 0,
    isNoDue,
    status: isNoDue ? "clear" : due > 0 ? "due" : "assigned",
    statusText:
      isNoDue
        ? "No Due"
        : due > 0
          ? `₹${due.toLocaleString("en-IN")} Due`
          : "Fee assigned",
  };
}

function feeHealthClasses(status: string) {
  if (status === "clear") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "overdue") return "border-red-200 bg-red-50 text-red-700";
  if (status === "due") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "upcoming") return "border-cyan-200 bg-cyan-50 text-cyan-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function studentStatusMeta(status: string) {
  if (status === "inactive") {
    return {
      label: "Inactive",
      className:
        "border-slate-300 bg-slate-100 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700",
      nextLabel: "Click to activate",
    };
  }

  if (status === "graduated") {
    return {
      label: "Graduated",
      className: "border-violet-200 bg-violet-50 text-violet-700",
      nextLabel: "Graduated student",
    };
  }

  return {
    label: "Active",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-700",
    nextLabel: "Click to deactivate",
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
              <input autoFocus type="text" className="w-full rounded-md border border-slate-200 pl-8 pr-3 py-1.5 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all" placeholder="Search..." value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="mt-1 flex flex-col gap-0.5">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-sm text-slate-500 text-center">No results found</div>
            ) : (
              filtered.map((option: any) => (
                <button key={option.value} type="button" className={`flex w-full items-center justify-between text-left px-2.5 py-2 text-sm rounded-md transition-colors gap-2 ${option.value === value ? 'bg-slate-950 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'}`} onClick={() => { onChange(option.value); setOpen(false); }}>
                  <span className="whitespace-normal leading-snug">{option.label}</span>
                  {option.value === value && <Check className="h-3.5 w-3.5 shrink-0 text-cyan-300" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function normalizeStudentDocuments(student: any): StudentDocument[] {
  const docs: StudentDocument[] = Array.isArray(student?.documents)
    ? student.documents
        .filter((doc: any) => doc && doc.dataUrl)
        .map((doc: any) => ({
          label: String(doc.label || doc.name || "Document"),
          name: String(doc.name || "document"),
          dataUrl: String(doc.dataUrl || ""),
          mimeType: String(doc.mimeType || "image/jpeg"),
        }))
    : [];

  const has = (label: string) => docs.some((doc) => doc.label === label);

  // Backward compatibility for older students that stored one Aadhaar/marksheet
  // directly on the student record instead of in the documents array.
  if (student?.aadhaarCard && !has(STUDENT_DOCUMENT_LABELS.AADHAAR_FRONT)) {
    docs.push({
      label: STUDENT_DOCUMENT_LABELS.AADHAAR_FRONT,
      name: "aadhaar-card-front-legacy.jpg",
      dataUrl: String(student.aadhaarCard),
      mimeType: String(student.aadhaarCard).startsWith("data:application/pdf")
        ? "application/pdf"
        : "image/jpeg",
    });
  }

  if (student?.previousMarksheet && !has(STUDENT_DOCUMENT_LABELS.MARKSHEET_FRONT)) {
    docs.push({
      label: STUDENT_DOCUMENT_LABELS.MARKSHEET_FRONT,
      name: "previous-class-marksheet-legacy.jpg",
      dataUrl: String(student.previousMarksheet),
      mimeType: String(student.previousMarksheet).startsWith("data:application/pdf")
        ? "application/pdf"
        : "image/jpeg",
    });
  }

  return docs;
}

function AdmissionSectionTitle({ number, icon, children }: any) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[linear-gradient(105deg,#020817_0%,#07112a_58%,#21184d_100%)] px-4 py-2.5 text-white shadow-sm">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-xs font-extrabold text-cyan-300">
        {number}
      </span>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-cyan-300">
        {icon}
      </div>
      <div className="text-sm font-bold tracking-wide">{children}</div>
    </div>
  );
}

type CsvTransferError = {
  row: number;
  identifier: string;
  reason: string;
};

type CsvTransferSummary = {
  total: number;
  success: number;
  skipped: number;
  failed: number;
  errors: CsvTransferError[];
};

function normalizeCsvHeader(value: string) {
  return String(value || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function parseCsvText(csvText: string) {
  const matrix: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell);
    cell = "";
  };

  const pushRow = () => {
    if (row.some((value) => String(value).trim() !== "")) matrix.push(row);
    row = [];
  };

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];

    if (char === '"') {
      if (inQuotes && csvText[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      pushCell();
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && csvText[index + 1] === "\n") index += 1;
      pushCell();
      pushRow();
      continue;
    }

    cell += char;
  }

  if (inQuotes) throw new Error("CSV has an unclosed quoted value.");
  if (cell !== "" || row.length > 0) {
    pushCell();
    pushRow();
  }

  if (matrix.length === 0) throw new Error("CSV file is empty.");

  const headers = matrix[0].map(normalizeCsvHeader);
  if (headers.some((header) => !header)) throw new Error("CSV contains a blank column header.");
  if (new Set(headers).size !== headers.length) throw new Error("CSV contains duplicate column headers.");

  const rows = matrix.slice(1).map((values, rowIndex) => {
    const data: Record<string, string> = {};
    headers.forEach((header, columnIndex) => {
      data[header] = String(values[columnIndex] ?? "").trim();
    });
    return { rowNumber: rowIndex + 2, data };
  });

  return { headers, rows };
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadCsvFile(filename: string, headers: string[], rows: unknown[][]) {
  const content = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ].join("\r\n");

  // BOM keeps UTF-8 names/addresses readable when opened directly in Excel.
  const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function validateCsvFile(file: File, maxMb: number) {
  if (!file.name.toLowerCase().endsWith(".csv")) return "Please choose a .csv file.";
  if (file.size > maxMb * 1024 * 1024) return `CSV file must be ${maxMb} MB or smaller.`;
  return "";
}

function normalizeCsvDate(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const [, year, month, day] = iso;
    const normalized = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const parsed = new Date(`${normalized}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : normalized;
  }

  // Indian spreadsheet-friendly DD/MM/YYYY (also accepts - or . separators).
  const dmy = raw.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (dmy) {
    const [, day, month, year] = dmy;
    const normalized = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const parsed = new Date(`${normalized}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : normalized;
  }

  return null;
}

function generatedAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

function generateTemporaryPassword(length = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint32Array(length);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * alphabet.length);
  }
  let password = "";
  for (let i = 0; i < length; i += 1) password += alphabet[bytes[i] % alphabet.length];
  return password;
}

function transferErrorMessage(error: any) {
  return String(error?.message || error?.response?.data?.error || "Request failed").slice(0, 240);
}

// ---------------------------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------------------------

export default function Students({ preview = false }: { preview?: boolean }) {
  const [location] = useLocation();
  const isOnlineAdmissionPreview = preview || location.split("?")[0] === "/online-admission-form";
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
  const [feeFilter, setFeeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  
  // Profile View State
  const [viewingStudent, setViewingStudent] = useState<any>(null);
  const [profileTab, setProfileTab] = useState<"overview" | "academic" | "fees" | "attendance" | "tests" | "documents">("overview");

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
      setProfileTab("overview");

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

  // Read-only Student Support Mode (owner / SUPER_ADMIN only)
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const [supportReason, setSupportReason] = useState("");
  const [supportStarting, setSupportStarting] = useState(false);
  const [supportError, setSupportError] = useState("");

  // Full-Page Form State (NEW - Replaced dialogOpen)
  const [formPageOpen, setFormPageOpen] = useState(isOnlineAdmissionPreview);
  
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
      setEditingStudent(null);
      setForm({
        ...blankForm,
        name: params.get("leadName") ?? "",
        phone: params.get("leadPhone") ?? "",
        email: params.get("leadEmail") ?? "",
        fatherName: params.get("parentName") ?? "",
        fatherPhone: params.get("leadPhone") ?? "",
        className: params.get("className") ?? "",
        board: params.get("board") ?? "",
      });
      setFormPageOpen(true);
    }
  }, [location]);

  

  // Bulk Update State
  const [bulkUpdateFile, setBulkUpdateFile] = useState<File | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Import / Bulk Update State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [autoGenPassword, setAutoGenPassword] = useState(true);
  const [importSummary, setImportSummary] = useState<CsvTransferSummary | null>(null);
  const [bulkUpdateSummary, setBulkUpdateSummary] = useState<CsvTransferSummary | null>(null);

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
    const linkedCourse = (courses ?? []).find(
      (course: any) => course.id === student.courseId,
    ) as any;

    const isCorrectCategory =
      studentCategory !== "academic" && studentCategory !== "computer"
        ? true
        : (linkedCourse?.courseType ?? "academic") === studentCategory;

    if (!isCorrectCategory) return false;
    if (
      batchFilter !== "all" &&
      String(student.batchId) !== String(batchFilter)
    ) {
      return false;
    }

    const studentStatus = String(student.status || "active");
    if (statusFilter !== "all" && studentStatus !== statusFilter) return false;

    const feeInfo = getStudentFeeInfo(student);
    if (feeFilter === "due" && feeInfo.currentDue <= 0) return false;
    if (feeFilter === "overdue" && feeInfo.overdue <= 0) return false;
    if (feeFilter === "clear" && !feeInfo.isNoDue) return false;
    if (feeFilter === "upcoming" && feeInfo.status !== "upcoming") return false;
    if (
      feeFilter === "not_assigned" &&
      feeInfo.status !== "not_assigned"
    ) {
      return false;
    }

    const query = search.trim().toLowerCase();
    if (!query) return true;

    return [
      student.name,
      student.enrollmentNo,
      student.email,
      student.phone,
      student.parentName,
      student.parentPhone,
      student.fatherName,
      student.fatherPhone,
      student.motherName,
      student.motherPhone,
      student.courseName,
      student.batchName,
      student.className,
      student.section,
      student.board,
      student.schoolName,
    ].some((value) => String(value ?? "").toLowerCase().includes(query));
  });

  const classSerialNumber = (className: unknown) => {
    const value = String(className ?? "").trim().toUpperCase();
    if (value === "NURSERY") return 1;
    if (value === "L.K.G" || value === "LKG" || value === "L.K.G.") return 2;
    if (value === "U.K.G" || value === "UKG" || value === "U.K.G.") return 3;

    const numberMatch = value.match(/(?:CLASS\s*)?(\d{1,2})/);
    if (!numberMatch) return 9999;

    const classNumber = Number(numberMatch[1]);
    const boardNumber = value.includes("CBSE")
      ? 0
      : value.includes("ICSE")
        ? 1
        : 2;

    return 100 + classNumber * 10 + boardNumber;
  };

  const classWiseStudents = [...filteredStudents].sort(
    (first: any, second: any) => {
      if (sortBy === "newest") {
        return (
          new Date(second.createdAt || 0).getTime() -
          new Date(first.createdAt || 0).getTime()
        );
      }

      if (sortBy === "oldest") {
        return (
          new Date(first.createdAt || 0).getTime() -
          new Date(second.createdAt || 0).getTime()
        );
      }

      if (sortBy === "admission-asc") {
        return String(first.enrollmentNo || "").localeCompare(
          String(second.enrollmentNo || ""),
          undefined,
          { numeric: true },
        );
      }

      if (sortBy === "admission-desc") {
        return String(second.enrollmentNo || "").localeCompare(
          String(first.enrollmentNo || ""),
          undefined,
          { numeric: true },
        );
      }

      if (sortBy === "name-asc") {
        return String(first.name || "").localeCompare(String(second.name || ""));
      }

      if (sortBy === "name-desc") {
        return String(second.name || "").localeCompare(String(first.name || ""));
      }

      if (sortBy === "fee-due-desc") {
        return (
          getStudentFeeInfo(second).currentDue -
          getStudentFeeInfo(first).currentDue
        );
      }

      const classDifference =
        classSerialNumber(first.className) -
        classSerialNumber(second.className);

      if (classDifference !== 0) return classDifference;

      return String(first.name ?? "").localeCompare(
        String(second.name ?? ""),
      );
    },
  );

  const findBatchFromCsv = (rawValue: string) => {
    const value = String(rawValue || "").trim().toLowerCase();
    if (!value) return null;

    return (
      (batches ?? []).find((batch: any) => {
        const candidates = [batch.id, batch.name, (batch as any).code]
          .filter(Boolean)
          .map((candidate) => String(candidate).trim().toLowerCase());
        return candidates.includes(value);
      }) ?? null
    );
  };

  const makeUniqueImportLoginId = (
    name: string,
    phone: string,
    preferred: string,
    usedLoginIds: Set<string>,
    rowNumber: number,
  ) => {
    const requested = String(preferred || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9._-]/g, "")
      .slice(0, 40);

    if (requested) {
      if (usedLoginIds.has(requested)) return { value: "", error: `Login ID '${requested}' already exists.` };
      usedLoginIds.add(requested);
      return { value: requested, error: "" };
    }

    const namePart = String(name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 18) || "student";
    const phonePart = String(phone || "").replace(/\D/g, "").slice(-4);
    const base = `${namePart}${phonePart || rowNumber}`.slice(0, 32);

    let candidate = base;
    let suffix = 2;
    while (usedLoginIds.has(candidate)) {
      candidate = `${base}${suffix}`.slice(0, 40);
      suffix += 1;
    }
    usedLoginIds.add(candidate);
    return { value: candidate, error: "" };
  };

  const chooseCsvFile = (file: File | null, kind: "import" | "bulk") => {
    if (!file) {
      if (kind === "import") setImportFile(null);
      else setBulkUpdateFile(null);
      return;
    }

    const error = validateCsvFile(file, kind === "import" ? 5 : 10);
    if (error) {
      notify("error", error);
      if (kind === "import") setImportFile(null);
      else setBulkUpdateFile(null);
      return;
    }

    if (kind === "import") {
      setImportFile(file);
      setImportSummary(null);
    } else {
      setBulkUpdateFile(file);
      setBulkUpdateSummary(null);
    }
  };

  const exportHeaders = [
    "admission_number",
    "name",
    "email",
    "phone",
    "gender",
    "date_of_birth",
    "school_name",
    "class_name",
    "section",
    "board",
    "father_name",
    "guardian_phone",
    "address",
    "batch_name",
    "course_name",
    "academic_year",
    "status",
    "login_id",
  ];

  const exportRows = (source: any[]) =>
    source.map((student: any) => [
      student.enrollmentNo || student.id || student._id || "",
      student.name || "",
      student.email || "",
      student.phone || "",
      student.gender || "",
      student.dateOfBirth || "",
      student.schoolName || "",
      student.className || "",
      student.section || "",
      student.board || "",
      student.fatherName || student.parentName || "",
      student.fatherPhone || student.parentPhone || "",
      student.correspondenceAddress || student.address || "",
      student.batchName || "",
      student.courseName || "",
      student.academicYear || "",
      student.status || "active",
      student.loginId || "",
    ]);

  const handleExport = () => {
    if (classWiseStudents.length === 0) return notify("error", "No student data to export.");
    const dateStamp = new Date().toISOString().slice(0, 10);
    downloadCsvFile(`students_${dateStamp}.csv`, exportHeaders, exportRows(classWiseStudents));
    notify("success", `Exported ${classWiseStudents.length} student${classWiseStudents.length === 1 ? "" : "s"}.`);
  };

  const handleBulkDownloadTemplate = () => {
    if (classWiseStudents.length === 0) return notify("error", "No student data is available for bulk update.");
    const dateStamp = new Date().toISOString().slice(0, 10);
    downloadCsvFile(`students_bulk_update_${dateStamp}.csv`, exportHeaders, exportRows(classWiseStudents));
    notify("success", "Bulk update CSV downloaded. Keep admission_number unchanged.");
  };

  const handleDownloadImportTemplate = () => {
    const sampleBatch = (batches ?? []).find((batch: any) => batch.status === "active") ?? (batches ?? [])[0];
    const batchName = sampleBatch?.name || "ENTER EXACT BATCH NAME";
    const academicYear = sampleBatch?.academicYear || generatedAcademicYear();
    const headers = [
      "name",
      "email",
      "phone",
      "batch_name",
      "date_of_birth",
      "gender",
      "school_name",
      "class_name",
      "section",
      "board",
      "father_name",
      "guardian_phone",
      "address",
      "academic_year",
      "login_id",
      "password",
    ];
    const sampleRow = [
      "Arjun Mehta",
      "arjun@example.com",
      "9876543210",
      batchName,
      "2007-04-15",
      "male",
      "Example School",
      "11",
      "A",
      "CBSE",
      "Rajiv Mehta",
      "9876500001",
      "42 Civil Lines, Prayagraj",
      academicYear,
      "",
      "",
    ];
    downloadCsvFile("student_import_template.csv", headers, [sampleRow]);
    notify("success", "Import template downloaded.");
  };

  const downloadTransferErrors = (kind: "import" | "bulk", summary: CsvTransferSummary | null) => {
    if (!summary?.errors.length) return;
    downloadCsvFile(
      `${kind === "import" ? "student_import" : "student_bulk_update"}_errors_${new Date().toISOString().slice(0, 10)}.csv`,
      ["row", "student", "reason"],
      summary.errors.map((error) => [error.row, error.identifier, error.reason]),
    );
  };

  const handleBulkUpdateApply = async () => {
    if (!bulkUpdateFile) return notify("error", "Please choose an edited CSV file first.");

    const fileError = validateCsvFile(bulkUpdateFile, 10);
    if (fileError) return notify("error", fileError);

    setIsBulkUpdating(true);
    setBulkUpdateSummary(null);

    try {
      const parsed = parseCsvText(await bulkUpdateFile.text());
      if (!parsed.headers.includes("admission_number")) {
        throw new Error("Bulk update CSV must contain the admission_number column.");
      }
      if (parsed.rows.length === 0) throw new Error("Bulk update CSV has no student rows.");
      if (parsed.rows.length > 2000) throw new Error("Bulk update supports up to 2,000 rows at a time.");

      const summary: CsvTransferSummary = {
        total: parsed.rows.length,
        success: 0,
        skipped: 0,
        failed: 0,
        errors: [],
      };

      for (const { rowNumber, data } of parsed.rows) {
        const admissionNo = String(data.admission_number || "").trim();
        const identifier = admissionNo || data.name || `Row ${rowNumber}`;

        if (!admissionNo) {
          summary.failed += 1;
          summary.errors.push({ row: rowNumber, identifier, reason: "admission_number is required." });
          continue;
        }

        const matchedStudent = (students ?? []).find(
          (student: any) =>
            String(student.enrollmentNo || "").trim() === admissionNo ||
            String(student.id || student._id || "").trim() === admissionNo,
        );

        if (!matchedStudent) {
          summary.failed += 1;
          summary.errors.push({ row: rowNumber, identifier, reason: "No existing student matched this admission_number." });
          continue;
        }

        try {
          const updatePayload: any = {};
          const put = (column: string, field: string) => {
            const value = String(data[column] ?? "").trim();
            if (value !== "") updatePayload[field] = value;
          };

          put("name", "name");
          put("email", "email");
          put("phone", "phone");
          put("school_name", "schoolName");
          put("class_name", "className");
          put("section", "section");
          put("board", "board");
          put("address", "correspondenceAddress");
          put("academic_year", "academicYear");
          put("login_id", "loginId");

          if (data.father_name) {
            updatePayload.fatherName = data.father_name;
            updatePayload.parentName = data.father_name;
          }
          if (data.guardian_phone) {
            updatePayload.fatherPhone = data.guardian_phone;
            updatePayload.parentPhone = data.guardian_phone;
          }

          if (data.gender) {
            const gender = data.gender.toLowerCase();
            if (!["male", "female", "other"].includes(gender)) {
              throw new Error("gender must be male, female or other.");
            }
            updatePayload.gender = gender;
          }

          if (data.date_of_birth) {
            const date = normalizeCsvDate(data.date_of_birth);
            if (date === null) throw new Error("date_of_birth must be YYYY-MM-DD or DD/MM/YYYY.");
            updatePayload.dateOfBirth = date;
          }

          if (data.status) {
            const rawStatus = data.status.toLowerCase();
            const status = rawStatus === "dropped" ? "inactive" : rawStatus;
            if (!["active", "inactive", "graduated"].includes(status)) {
              throw new Error("status must be active, inactive or graduated.");
            }
            updatePayload.status = status;
          }

          const batchValue = data.batch_name || data.batch_code || "";
          if (batchValue) {
            const batch = findBatchFromCsv(batchValue);
            if (!batch) throw new Error(`Batch '${batchValue}' was not found. Use the exact batch name.`);
            if (!batch.courseId) throw new Error(`Batch '${batchValue}' has no linked course.`);
            updatePayload.batchId = String(batch.id);
            updatePayload.courseId = String(batch.courseId);
            if (!updatePayload.academicYear && batch.academicYear) updatePayload.academicYear = batch.academicYear;
          }

          if (Object.keys(updatePayload).length === 0) {
            summary.skipped += 1;
            continue;
          }

          await updateStudent.mutateAsync({
            id: matchedStudent.id,
            data: updatePayload as any,
          });
          summary.success += 1;
        } catch (error: any) {
          summary.failed += 1;
          summary.errors.push({ row: rowNumber, identifier, reason: transferErrorMessage(error) });
        }
      }

      setBulkUpdateSummary(summary);
      setBulkUpdateFile(null);
      await queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });

      if (summary.failed > 0) {
        notify("error", `Bulk update finished: ${summary.success} updated, ${summary.skipped} skipped, ${summary.failed} failed.`);
      } else {
        notify("success", `Bulk update complete: ${summary.success} updated${summary.skipped ? `, ${summary.skipped} skipped` : ""}.`);
      }
    } catch (error: any) {
      notify("error", transferErrorMessage(error));
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleImportSubmit = async () => {
    if (!importFile) return notify("error", "Please choose a CSV file.");

    const fileError = validateCsvFile(importFile, 5);
    if (fileError) return notify("error", fileError);

    setIsImporting(true);
    setImportSummary(null);

    try {
      const parsed = parseCsvText(await importFile.text());
      const hasBatchColumn = parsed.headers.includes("batch_name") || parsed.headers.includes("batch_code");
      for (const required of ["name", "phone"]) {
        if (!parsed.headers.includes(required)) throw new Error(`Import CSV must contain the ${required} column.`);
      }
      if (!hasBatchColumn) throw new Error("Import CSV must contain batch_name (legacy batch_code is also accepted).");
      if (parsed.rows.length === 0) throw new Error("Import CSV has no student rows.");
      if (parsed.rows.length > 1000) throw new Error("Import supports up to 1,000 rows at a time.");

      const summary: CsvTransferSummary = {
        total: parsed.rows.length,
        success: 0,
        skipped: 0,
        failed: 0,
        errors: [],
      };

      const existingEmails = new Set(
        (students ?? [])
          .map((student: any) => String(student.email || "").trim().toLowerCase())
          .filter(Boolean),
      );
      const usedLoginIds = new Set(
        (students ?? [])
          .map((student: any) => String(student.loginId || "").trim().toLowerCase())
          .filter(Boolean),
      );

      for (const { rowNumber, data } of parsed.rows) {
        const name = String(data.name || "").trim();
        const phone = String(data.phone || "").trim();
        const email = String(data.email || "").trim().toLowerCase();
        const identifier = name || email || phone || `Row ${rowNumber}`;

        try {
          if (!name) throw new Error("name is required.");
          if (!phone) throw new Error("phone is required.");

          if (skipDuplicates && email && existingEmails.has(email)) {
            summary.skipped += 1;
            summary.errors.push({ row: rowNumber, identifier, reason: "Skipped because this email already exists." });
            continue;
          }

          const batchValue = data.batch_name || data.batch_code || "";
          const batch = findBatchFromCsv(batchValue);
          if (!batch) throw new Error(`Batch '${batchValue || "(blank)"}' was not found. Use the exact batch name.`);

          const batchId = String(batch.id || "");
          const courseId = String(batch.courseId || "");
          if (!batchId || !courseId) throw new Error(`Batch '${batchValue}' is not linked to a valid course.`);

          const rawDate = String(data.date_of_birth || "").trim();
          const dateOfBirth = normalizeCsvDate(rawDate);
          if (rawDate && dateOfBirth === null) {
            throw new Error("date_of_birth must be YYYY-MM-DD or DD/MM/YYYY.");
          }

          let gender = String(data.gender || "").trim().toLowerCase();
          if (gender && !["male", "female", "other"].includes(gender)) {
            throw new Error("gender must be male, female or other.");
          }

          const suppliedPassword = String(data.password || "").trim();
          if (suppliedPassword && suppliedPassword.length < 6) {
            throw new Error("password must be at least 6 characters.");
          }
          const loginPassword = suppliedPassword || (autoGenPassword ? generateTemporaryPassword() : "");

          let loginId = "";
          if (data.login_id || loginPassword) {
            const loginResult = makeUniqueImportLoginId(name, phone, data.login_id || "", usedLoginIds, rowNumber);
            if (loginResult.error) throw new Error(loginResult.error);
            loginId = loginResult.value;
          }

          const academicYear = String(data.academic_year || batch.academicYear || generatedAcademicYear()).trim();
          if (!academicYear) throw new Error("academic_year could not be determined.");

          await createStudent.mutateAsync({
            data: {
              ...blankForm,
              name,
              email: email || undefined,
              phone,
              batchId,
              courseId,
              academicYear,
              status: "active",
              dateOfBirth: dateOfBirth || "",
              gender: gender || undefined,
              schoolName: data.school_name || "",
              className: data.class_name || "",
              section: data.section || "",
              board: data.board || "",
              fatherName: data.father_name || "",
              parentName: data.father_name || undefined,
              fatherPhone: data.guardian_phone || "",
              parentPhone: data.guardian_phone || undefined,
              correspondenceAddress: data.address || "",
              loginId: loginId || undefined,
              loginPassword: loginPassword || undefined,
            } as any,
          });

          if (email) existingEmails.add(email);
          summary.success += 1;
        } catch (error: any) {
          summary.failed += 1;
          summary.errors.push({ row: rowNumber, identifier, reason: transferErrorMessage(error) });
        }
      }

      setImportSummary(summary);
      setImportFile(null);
      await queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });

      if (summary.failed > 0) {
        notify("error", `Import finished: ${summary.success} imported, ${summary.skipped} skipped, ${summary.failed} failed.`);
      } else {
        notify("success", `Import complete: ${summary.success} imported${summary.skipped ? `, ${summary.skipped} skipped` : ""}.`);
      }
    } catch (error: any) {
      notify("error", transferErrorMessage(error));
    } finally {
      setIsImporting(false);
    }
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

    const normalizedDocuments = normalizeStudentDocuments(student);

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
      documents: normalizedDocuments,
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
    if (isOnlineAdmissionPreview) {
      window.close();
      return;
    }
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

  const syncLegacyDocumentField = (
    label: string,
    dataUrl: string,
    current: StudentForm,
  ): Partial<StudentForm> => {
    if (label === STUDENT_DOCUMENT_LABELS.AADHAAR_FRONT) {
      return { aadhaarCard: dataUrl } as Partial<StudentForm>;
    }
    if (label === STUDENT_DOCUMENT_LABELS.MARKSHEET_FRONT) {
      return { previousMarksheet: dataUrl } as Partial<StudentForm>;
    }
    return {};
  };

  const handleDocumentChange = (label: string, file?: File) => {
    if (!file) return;
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) return notify("error", "Only PDF, JPG, PNG or WEBP files are allowed.");
    if (file.size > 3_000_000) return notify("error", "Please choose a document smaller than 3 MB.");

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const newDoc: StudentDocument = {
        label,
        name: file.name,
        dataUrl,
        mimeType: file.type,
      };

      setForm((old) => ({
        ...old,
        ...syncLegacyDocumentField(label, dataUrl, old),
        documents: [...old.documents.filter((d) => d.label !== label), newDoc],
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleDocumentCapture = (label: string, dataUrl: string) => {
    const newDoc: StudentDocument = {
      label,
      name: `${label.replace(/\s+/g, "-").toLowerCase()}-camera.jpg`,
      dataUrl,
      mimeType: "image/jpeg",
    };

    setForm((old) => ({
      ...old,
      ...syncLegacyDocumentField(label, dataUrl, old),
      documents: [...old.documents.filter((d) => d.label !== label), newDoc],
    }));
  };

  const removeDocument = (label: string) => {
    setForm((old) => ({
      ...old,
      ...(label === STUDENT_DOCUMENT_LABELS.AADHAAR_FRONT ? { aadhaarCard: "" } : {}),
      ...(label === STUDENT_DOCUMENT_LABELS.MARKSHEET_FRONT ? { previousMarksheet: "" } : {}),
      documents: old.documents.filter((d) => d.label !== label),
    }));
  };

  const getDocument = (label: string) => form.documents.find((d) => d.label === label);

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

    if (!getDocument(STUDENT_DOCUMENT_LABELS.AADHAAR_FRONT)) {
      errs.aadhaarFront = "Aadhaar Card ka front side upload ya camera se capture karo";
    }
    if (!getDocument(STUDENT_DOCUMENT_LABELS.AADHAAR_BACK)) {
      errs.aadhaarBack = "Aadhaar Card ka back side upload ya camera se capture karo";
    }
    if (!getDocument(STUDENT_DOCUMENT_LABELS.MARKSHEET_FRONT)) {
      errs.marksheetFront = "Previous Class Marksheet ka front upload ya camera se capture karo";
    }

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
    if (student.status === status || student.status === "graduated") return;

    setStatusUpdatingId(student.id);

    updateStudent.mutate(
      { id: student.id, data: { status } as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListStudentsQueryKey(),
          });

          if (viewingStudent?.id === student.id) {
            setViewingStudent((current: any) =>
              current ? { ...current, status } : current,
            );
          }

          notify("success", `${student.name} marked ${status}.`);
        },
        onError: (error: any) => {
          notify(
            "error",
            error?.message || "Unable to update student status.",
          );
        },
        onSettled: () => setStatusUpdatingId(null),
      },
    );
  };

  const toggleStudentStatus = (student: any) => {
    const current = String(student.status || "active");
    if (current === "graduated") return;

    updateStudentStatus(
      student,
      current === "inactive" ? "active" : "inactive",
    );
  };

  const handleDelete = (student: any) => {
    if (!confirm("Delete " + student.name + "?")) return;
    deleteStudent.mutate({ id: student.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() }) });
  };

  const handleClearFilters = () => { setSearch(""); setBatchFilter("all"); setStatusFilter("all"); setFeeFilter("all"); setSortBy("newest"); };

  const submitResetPassword = () => {
    if (!newPassword || newPassword.length < 6) return notify("error", "Password must be at least 6 characters.");
    updateStudent.mutate(
      { id: viewingStudent.id, data: { loginPassword: newPassword } as any },
      { onSuccess: () => { notify("success", "Password reset successfully!"); setResetPasswordOpen(false); setNewPassword(""); } }
    );
  };

  const startStudentSupportMode = async () => {
    const student = viewingStudent;
    if (!student) return;

    const reason = supportReason.trim();
    if (reason.length < 5) {
      setSupportError("Support reason minimum 5 characters hona chahiye.");
      return;
    }

    const token = localStorage.getItem("coach_sutra_token") || "";
    const role = localStorage.getItem("coach_sutra_user_role") || "";
    const studentId = String(student.id || student._id || "");

    if (!token || !studentId) {
      setSupportError("Admin session ya student ID available nahi hai.");
      return;
    }

    if (!["institute_admin", "super_admin"].includes(role)) {
      setSupportError("Student Support Mode sirf Institute Admin/Owner aur SUPER_ADMIN use kar sakte hain.");
      return;
    }

    if (localStorage.getItem("academy_support_original_token")) {
      setSupportError("Ek support session already active hai. Pehle usse exit karein.");
      return;
    }

    setSupportStarting(true);
    setSupportError("");

    try {
      const endpoint =
        role === "super_admin"
          ? "/api/v1/platform/student-support/start"
          : "/api/student-support/start";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ studentId, reason }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.token || !data?.sessionId) {
        throw new Error(data?.error || "Student Support Mode start nahi ho saka.");
      }

      // Keep the owner/admin session so Exit Support Mode can restore it.
      localStorage.setItem("academy_support_original_token", token);
      localStorage.setItem("academy_support_original_role", role);
      localStorage.setItem("academy_support_session_id", String(data.sessionId));
      localStorage.setItem("academy_support_student_id", studentId);
      localStorage.setItem("academy_support_student_name", String(data.student?.name || student.name || "Student"));
      localStorage.setItem("academy_support_return_path", `/students?view=${encodeURIComponent(studentId)}`);
      localStorage.setItem("academy_support_expires_at", String(data.expiresAt || ""));

      localStorage.setItem("coach_sutra_token", String(data.token));
      localStorage.setItem("coach_sutra_user_role", "student");
      window.dispatchEvent(new Event("storage"));
      window.location.assign("/student-dashboard?support=1");
    } catch (error: any) {
      setSupportError(error?.message || "Student Support Mode start nahi ho saka.");
    } finally {
      setSupportStarting(false);
    }
  };

  const baseStudents = (students ?? []).filter((student: any) => {
    const linkedCourse = (courses ?? []).find((course: any) => course.id === student.courseId) as any;
    return studentCategory !== "academic" && studentCategory !== "computer" ? true : (linkedCourse?.courseType ?? "academic") === studentCategory;
  });

  const totalStudents = baseStudents.length;
  const activeStudents = baseStudents.filter(
    (student: any) => (student.status ?? "active") === "active",
  ).length;
  const inactiveStudents = baseStudents.filter(
    (student: any) => student.status === "inactive",
  ).length;
  const graduatedStudents = baseStudents.filter(
    (student: any) => student.status === "graduated",
  ).length;

  const newStudents = baseStudents.filter((student: any) => {
    if (!student.createdAt) return false;

    return (
      Math.ceil(
        Math.abs(
          new Date().getTime() -
            new Date(student.createdAt).getTime(),
        ) /
          (1000 * 60 * 60 * 24),
      ) <= 30
    );
  }).length;

  const studentsWithDue = baseStudents.filter(
    (student: any) => getStudentFeeInfo(student).currentDue > 0,
  ).length;
  const feeNotAssignedCount = baseStudents.filter(
    (student: any) =>
      getStudentFeeInfo(student).status === "not_assigned",
  ).length;
  const totalOutstanding = baseStudents.reduce(
    (sum: number, student: any) =>
      sum + getStudentFeeInfo(student).outstanding,
    0,
  );
  const activeRate =
    totalStudents > 0
      ? Math.round((activeStudents / totalStudents) * 100)
      : 0;
  const batchesInUse = new Set(
    baseStudents.map((student: any) => student.batchId).filter(Boolean),
  ).size;

  const filled = (s: keyof StudentForm) => String(form[s] ?? "").trim().length > 0;
  const section1Filled = filled("name") && filled("dateOfBirth") && filled("gender") && filled("schoolName") && form.courseId !== "" && form.batchId !== "";
  const section2Filled = filled("motherPhone") || filled("fatherPhone") || filled("emergencyPhone");
  const section3Filled = filled("correspondenceAddress") && filled("correspondenceState") && filled("correspondenceDistrict") && filled("correspondencePin");
  const documentsFilled =
    Boolean(getDocument(STUDENT_DOCUMENT_LABELS.AADHAAR_FRONT)) &&
    Boolean(getDocument(STUDENT_DOCUMENT_LABELS.AADHAAR_BACK)) &&
    Boolean(getDocument(STUDENT_DOCUMENT_LABELS.MARKSHEET_FRONT));
  const section4Filled = filled("loginId") && filled("loginPassword");
  const saving = createStudent.isPending || updateStudent.isPending;

  const batchOptions = [
    { label: "All Batches", value: "all" },
    ...(batches?.map((batch: any) => ({
      label: batch.name,
      value: batch.id,
    })) || []),
  ];

  const feeOptions = [
    { label: "All Fee Health", value: "all" },
    { label: "Due Now", value: "due" },
    { label: "Overdue", value: "overdue" },
    { label: "No Due", value: "clear" },
    { label: "Upcoming Only", value: "upcoming" },
    { label: "Fee Not Assigned", value: "not_assigned" },
  ];

  const sortOptions = [
    { label: "Newest Admission", value: "newest" },
    { label: "Oldest Admission", value: "oldest" },
    { label: "Admission No (A-Z)", value: "admission-asc" },
    { label: "Admission No (Z-A)", value: "admission-desc" },
    { label: "Name (A-Z)", value: "name-asc" },
    { label: "Name (Z-A)", value: "name-desc" },
    { label: "Fee Due (High-Low)", value: "fee-due-desc" },
  ];

  // ---------------------------------------------------------------------------
  // FORM PAGE VIEW (NEW ADD/EDIT full page)
  // ---------------------------------------------------------------------------
  if (formPageOpen) {
    return (
      <div className="min-h-full bg-[#f3f6fb] px-1 pb-10 pt-1 md:px-2">
        <div className="mx-auto max-w-6xl overflow-x-clip">
        
        {/* Compact premium Online Admission header + sticky progress */}
        {isOnlineAdmissionPreview ? (
          <>
            <div className="bg-[#f6f7f9] pt-2 pb-2">
              <div className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl border border-[#173a73] bg-[#0f2f66] shadow-md">
                <div className="h-1 bg-[#2f66c9]" />
                <div className="px-4 py-4 text-center md:px-6 md:py-5">
                  <div className="mb-2 flex items-center justify-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/20 shadow-sm">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <span className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                      Admissions 2026–27
                    </span>
                  </div>
                  <h1 className="text-xl font-extrabold tracking-tight text-white md:text-2xl">
                    Second School Classes
                  </h1>
                  <h2 className="mx-auto mt-1 text-base font-bold leading-snug text-white md:text-lg">
                    Online Admission Applicatioin Form 2026-2027
                  </h2>
                  <p className="mt-1 text-xs font-bold text-white/90 md:text-sm">
                    Please fill in all required details carefully.
                  </p>
                  <div className="mx-auto mt-3 flex w-full items-center justify-center rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 shadow-sm">
                    <div className="text-sm font-bold text-white md:text-base">Online Student Admission Form</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="sticky top-0 z-50 bg-[#f6f7f9] py-1.5 shadow-sm">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <FormProgress steps={[
                  { label: "Student", filled: section1Filled },
                  { label: "Parents", filled: section2Filled },
                  { label: "Address", filled: section3Filled },
                  { label: "Docs", filled: documentsFilled },
                ]} />
              </div>
            </div>
          </>
        ) : (
          <div className="sticky top-0 z-50 space-y-3 bg-[#f3f6fb]/95 pb-3 pt-1 backdrop-blur">
            <div className="relative overflow-hidden rounded-[22px] border border-slate-800 bg-[linear-gradient(105deg,#020817_0%,#020b1d_58%,#21184d_100%)] px-4 py-3.5 text-white shadow-[0_14px_36px_rgba(15,23,42,0.18)] md:px-5">
              <div className="absolute -right-16 -top-20 h-44 w-44 rounded-full bg-violet-500/20 blur-3xl" />
              <div className="absolute bottom-0 left-1/3 h-28 w-28 rounded-full bg-cyan-400/10 blur-2xl" />

              <div className="relative flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-xl border border-white/10 bg-white/[0.06] text-white hover:bg-white/10 hover:text-white"
                    onClick={closeForm}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>

                  <div className="min-w-0">
                    <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-violet-200">
                      <UserPlus className="h-3 w-3 text-cyan-300" />
                      Student Admission
                    </div>
                    <h1 className="truncate text-lg font-black tracking-tight text-white md:text-xl">
                      {editingStudent ? "Edit Student Admission" : "New Student Admission Form"}
                    </h1>
                    <p className="mt-1 text-[11px] text-slate-300">
                      {studentCategory === "academic"
                        ? "Academic Student"
                        : studentCategory === "computer"
                          ? "Computer Student"
                          : "Capture complete admission details in one place"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={closeForm}
                    className="h-9 border-white/15 bg-transparent px-4 text-xs text-white hover:bg-white/10 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={saveStudent}
                    disabled={saving}
                    className="h-9 bg-white px-4 text-xs font-bold text-slate-950 shadow-sm hover:bg-slate-100"
                  >
                    {saving ? "Saving..." : (editingStudent ? "Update Student" : "Save Admission")}
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
              <FormProgress steps={[
                { label: "Student", filled: section1Filled },
                { label: "Parents", filled: section2Filled },
                { label: "Address", filled: section3Filled },
                { label: "Docs", filled: documentsFilled },
                { label: "Login", filled: section4Filled }
              ]} />
            </div>
          </div>
        )}

        {/* FORM BODY */}
        <div className={isOnlineAdmissionPreview ? "space-y-5 pt-2" : "space-y-5 pt-1"}>
          
          {/* SECTION 1: STUDENT INFO */}
          <Card className="rounded-[20px] border border-[#dfe6f0] bg-white shadow-[0_6px_20px_rgba(15,23,42,0.05)]">
            <CardContent className="p-6 space-y-5">
              <AdmissionSectionTitle number={1} icon={<GraduationCap className="h-5 w-5" />}>Student's Information</AdmissionSectionTitle>

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
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-3">
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
          <Card className="rounded-[20px] border border-[#dfe6f0] bg-white shadow-[0_6px_20px_rgba(15,23,42,0.05)]">
            <CardContent className="p-6 space-y-5">
              <AdmissionSectionTitle number={2} icon={<Users className="h-5 w-5" />}>Parent's Information</AdmissionSectionTitle>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <h3 className="mb-4 flex items-center gap-2 font-semibold"><span className="h-2 w-2 rounded-full bg-pink-500" />Mother's Details</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormInput label="Mother's Name" value={form.motherName} onChange={(v: string) => setValue("motherName", v)} />
                  <FormInput label="Occupation" value={form.motherOccupation} onChange={(v: string) => setValue("motherOccupation", v)} />
                  <PhoneField label="Contact Number" value={form.motherPhone} onChange={(v: string) => setValue("motherPhone", v)} code={form.motherPhoneCode} onCodeChange={(c: string) => setValue("motherPhoneCode", c)} />
                  <WhatsappField value={form.motherWhatsapp} contact={form.motherPhone} contactCode={form.motherPhoneCode} onChange={(v: string) => setValue("motherWhatsapp", v)} code={form.motherWhatsappCode} onCodeChange={(c: string) => setValue("motherWhatsappCode", c)} />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
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
          <Card className="rounded-[20px] border border-[#dfe6f0] bg-white shadow-[0_6px_20px_rgba(15,23,42,0.05)]">
            <CardContent className="p-6 space-y-5">
              <AdmissionSectionTitle number={3} icon={<MapPin className="h-5 w-5" />}>Address Details</AdmissionSectionTitle>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <FormInput label="Address" value={form.correspondenceAddress} onChange={(v: string) => setValue("correspondenceAddress", v)} />
                <div className="grid gap-4 md:grid-cols-3 mt-4">
                  <SearchableDropdown label="State" value={form.correspondenceState} options={INDIA_STATES} placeholder="Search state" onChange={(v: string) => setForm((old) => ({ ...old, correspondenceState: v, correspondenceDistrict: "" }))} />
                  <SearchableDropdown label="District" value={form.correspondenceDistrict} options={getDistricts(form.correspondenceState)} placeholder={form.correspondenceState ? "Search district" : "Select state first"} disabled={!form.correspondenceState} onChange={(v: string) => setValue("correspondenceDistrict", v)} />
                  <div className="space-y-1.5"><Label className="text-xs font-medium text-slate-600">PIN</Label><Input placeholder="6 digit" value={form.correspondencePin} onChange={(e: any) => setValue("correspondencePin", e.target.value.replace(/\D/g, "").slice(0, 6))} className="h-9 text-sm shadow-sm" /></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 4: DOCUMENTS */}
          <Card className="rounded-[20px] border border-[#dfe6f0] bg-white shadow-[0_6px_20px_rgba(15,23,42,0.05)]">
            <CardContent className="p-6 space-y-5">
              <AdmissionSectionTitle number={4} icon={<FileText className="h-5 w-5" />}>
                Documents
              </AdmissionSectionTitle>

              <div className="-mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-500">
                  Aadhaar ke Front + Back dono aur Previous Class Marksheet ka Front upload/capture karein.
                </p>
                <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-600">
                  Required
                </span>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
                {/* Aadhaar: front + back */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <Label className="text-sm font-bold text-slate-800">Aadhaar Card</Label>
                      <p className="mt-0.5 text-[11px] text-slate-500">Front aur back dono alag capture/upload honge.</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600">2 SIDES</span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { label: STUDENT_DOCUMENT_LABELS.AADHAAR_FRONT, title: "Front Side", helper: "Photo & Aadhaar number side" },
                      { label: STUDENT_DOCUMENT_LABELS.AADHAAR_BACK, title: "Back Side", helper: "Address side" },
                    ].map((item) => {
                      const document = getDocument(item.label);

                      return (
                        <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-xs font-bold text-slate-800">{item.title}</div>
                              <div className="mt-0.5 text-[10px] text-slate-400">{item.helper}</div>
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                              document ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                            }`}>
                              {document ? "READY" : "PENDING"}
                            </span>
                          </div>

                          {document && (
                            <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2">
                              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                              <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-emerald-700">
                                {document.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => viewDocument(document)}
                                className="rounded-md p-1 text-emerald-700 hover:bg-emerald-100"
                                title="View document"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <label className="flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
                              <Upload className="h-3.5 w-3.5 text-slate-500" />
                              {document ? "Replace" : "Upload"}
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="hidden"
                                onChange={(e: any) => handleDocumentChange(item.label, e.target.files?.[0])}
                              />
                            </label>

                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 bg-white text-[11px] font-semibold shadow-sm"
                              onClick={() => {
                                setDocCameraLabel(item.label);
                                setCameraOpen(true);
                              }}
                            >
                              <Camera className="mr-1.5 h-3.5 w-3.5" />
                              Camera
                            </Button>
                          </div>

                          {document && (
                            <Button
                              type="button"
                              variant="ghost"
                              className="mt-2 h-7 w-full text-[10px] text-red-600 hover:bg-red-50"
                              onClick={() => removeDocument(item.label)}
                            >
                              <X className="mr-1 h-3 w-3" />
                              Remove {item.title}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Marksheet: front only */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <Label className="text-sm font-bold text-slate-800">Previous Class Marksheet</Label>
                      <p className="mt-0.5 text-[11px] text-slate-500">Sirf front side required hai.</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600">FRONT ONLY</span>
                  </div>

                  {(() => {
                    const document = getDocument(STUDENT_DOCUMENT_LABELS.MARKSHEET_FRONT);

                    return (
                      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-bold text-slate-800">Front Side</div>
                            <div className="mt-0.5 text-[10px] text-slate-400">Marks / result details side</div>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                            document ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {document ? "READY" : "PENDING"}
                          </span>
                        </div>

                        {document && (
                          <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2">
                            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-emerald-700">
                              {document.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => viewDocument(document)}
                              className="rounded-md p-1 text-emerald-700 hover:bg-emerald-100"
                              title="View document"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <label className="flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
                            <Upload className="h-3.5 w-3.5 text-slate-500" />
                            {document ? "Replace" : "Upload"}
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={(e: any) =>
                                handleDocumentChange(
                                  STUDENT_DOCUMENT_LABELS.MARKSHEET_FRONT,
                                  e.target.files?.[0],
                                )
                              }
                            />
                          </label>

                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 bg-white text-[11px] font-semibold shadow-sm"
                            onClick={() => {
                              setDocCameraLabel(STUDENT_DOCUMENT_LABELS.MARKSHEET_FRONT);
                              setCameraOpen(true);
                            }}
                          >
                            <Camera className="mr-1.5 h-3.5 w-3.5" />
                            Camera
                          </Button>
                        </div>

                        {document && (
                          <Button
                            type="button"
                            variant="ghost"
                            className="mt-2 h-7 w-full text-[10px] text-red-600 hover:bg-red-50"
                            onClick={() => removeDocument(STUDENT_DOCUMENT_LABELS.MARKSHEET_FRONT)}
                          >
                            <X className="mr-1 h-3 w-3" />
                            Remove Marksheet
                          </Button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[11px] leading-5 text-slate-600">
                <span className="font-bold">Tip:</span> Camera use karte waqt document ko seedha rakhein, glare avoid karein aur poora card/page frame ke andar rakhein.
              </div>
            </CardContent>
          </Card>
          
          {!isOnlineAdmissionPreview && (
          <>
          {/* SECTION 4: LOGIN */}
          <Card className="rounded-[20px] border border-[#dfe6f0] bg-white shadow-[0_6px_20px_rgba(15,23,42,0.05)]">
            <CardContent className="p-6 space-y-5">
              <AdmissionSectionTitle number={5} icon={<KeyRound className="h-5 w-5" />}>Student Login Details</AdmissionSectionTitle>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
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
          </>
          )}

          {/* Save button at bottom */}
          <div className="flex justify-end gap-2 pt-2">
            {!isOnlineAdmissionPreview && (
              <Button variant="outline" onClick={closeForm} className="h-11 px-6">Cancel</Button>
            )}
            <Button onClick={saveStudent} disabled={saving} className="h-11 bg-slate-950 hover:bg-slate-900 text-white font-bold px-6 shadow-sm">
              {saving ? "Submitting..." : (isOnlineAdmissionPreview ? "Submit Application" : (editingStudent ? "Update Student" : "Save Student Admission"))}
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
            setCameraOpen(false); 
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
      </div>
    );
  }
  
  // ---------------------------------------------------------------------------
  // PROFILE VIEW (EYE BUTTON CLICKED)
  // ---------------------------------------------------------------------------
  if (viewingStudent) {
    const s = viewingStudent;

    const studentId = String(s.id || s._id || "");
    const initials = String(s.name || "S")
      .split(" ")
      .map((p: string) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const isInactive = s.status === "inactive";
    const enrolled = s.createdAt
      ? new Date(s.createdAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "Not available";

    const feeInfo = getStudentFeeInfo(s);
    const hasFeeData = feeInfo.total > 0 || feeInfo.paid > 0 || feeInfo.due > 0;
    const feeProgress =
      feeInfo.total > 0
        ? Math.min(100, Math.round((feeInfo.paid / feeInfo.total) * 100))
        : 0;

    const linkedCourse = (courses ?? []).find(
      (course: any) => String(course.id || course._id) === String(s.courseId || ""),
    ) as any;
    const linkedBatch = (batches ?? []).find(
      (batch: any) => String(batch.id) === String(s.batchId || ""),
    ) as any;

    const courseLabel = s.courseName || linkedCourse?.name || "Not assigned";
    const batchLabel = s.batchName || linkedBatch?.name || "Not assigned";

    const profileDocuments = normalizeStudentDocuments(s);
    const expectedDocumentLabels = [
      STUDENT_DOCUMENT_LABELS.AADHAAR_FRONT,
      STUDENT_DOCUMENT_LABELS.AADHAAR_BACK,
      STUDENT_DOCUMENT_LABELS.MARKSHEET_FRONT,
    ];
    const requiredDocumentsReady = expectedDocumentLabels.filter((label) =>
      profileDocuments.some((doc) => doc.label === label),
    ).length;

    const attendanceSource =
      s.attendanceSummary && typeof s.attendanceSummary === "object"
        ? s.attendanceSummary
        : s.attendanceStats && typeof s.attendanceStats === "object"
          ? s.attendanceStats
          : null;

    const attendanceTotal = Number(
      attendanceSource?.total ??
        attendanceSource?.totalClasses ??
        attendanceSource?.workingDays ??
        0,
    );
    const attendancePresent = Number(
      attendanceSource?.present ??
        attendanceSource?.presentDays ??
        0,
    );
    const attendanceAbsent = Number(
      attendanceSource?.absent ??
        attendanceSource?.absentDays ??
        0,
    );
    const attendanceLate = Number(
      attendanceSource?.late ??
        attendanceSource?.lateDays ??
        0,
    );
    const attendanceRate =
      attendanceTotal > 0
        ? Math.round((attendancePresent / attendanceTotal) * 100)
        : null;

    const profileTests = (
      Array.isArray(s.testResults)
        ? s.testResults
        : Array.isArray(s.examResults)
          ? s.examResults
          : Array.isArray(s.results)
            ? s.results
            : Array.isArray(s.exams)
              ? s.exams
              : []
    ) as any[];

    const parentContact =
      s.fatherPhone ||
      s.motherPhone ||
      s.parentPhone ||
      s.emergencyPhone ||
      "";

    const addressLine = [
      s.correspondenceAddress || s.address,
      s.correspondenceDistrict,
      s.correspondenceState,
      s.correspondencePin,
    ]
      .filter(Boolean)
      .join(", ");

    const completenessChecks = [
      Boolean(s.name),
      Boolean(s.dateOfBirth),
      Boolean(s.gender),
      Boolean(s.photoDataUrl),
      courseLabel !== "Not assigned",
      batchLabel !== "Not assigned",
      Boolean(parentContact),
      Boolean(addressLine),
      requiredDocumentsReady === expectedDocumentLabels.length,
      Boolean(s.loginId),
    ];
    const profileCompleteness = Math.round(
      (completenessChecks.filter(Boolean).length / completenessChecks.length) * 100,
    );

    const InfoRow = ({
      label,
      value,
      mono = false,
    }: {
      label: string;
      value: any;
      mono?: boolean;
    }) => (
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        <span
          className={`max-w-[62%] text-right text-sm font-bold text-slate-800 ${
            mono ? "font-mono text-xs" : ""
          }`}
        >
          {value || "—"}
        </span>
      </div>
    );

    const EmptyState = ({
      icon: Icon,
      title,
      text,
    }: {
      icon: any;
      title: string;
      text: string;
    }) => (
      <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
          <Icon className="h-5 w-5" />
        </div>
        <h4 className="mt-4 text-sm font-black text-slate-800">{title}</h4>
        <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">{text}</p>
      </div>
    );

    const profileTabs = [
      { id: "overview", label: "Overview", icon: User },
      { id: "academic", label: "Course & Batch", icon: GraduationCap },
      { id: "fees", label: "Fees", icon: Wallet },
      { id: "attendance", label: "Attendance", icon: CalendarDays },
      { id: "tests", label: "Tests", icon: BarChart3 },
      { id: "documents", label: "Documents", icon: FolderOpen },
    ] as const;

    return (
      <div className="min-h-full space-y-4 bg-[#f3f6fb] pb-8">
        {/* Student 360 hero */}
        <section className="relative overflow-hidden rounded-[28px] border border-slate-800 bg-[linear-gradient(105deg,#020817_0%,#020b1d_58%,#21184d_100%)] px-5 py-5 text-white shadow-[0_22px_70px_-38px_rgba(15,23,42,0.65)] sm:px-6">
          <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="mt-1 h-10 w-10 shrink-0 rounded-xl border border-white/10 bg-white/[0.06] text-white hover:bg-white/10 hover:text-white"
                onClick={() => setViewingStudent(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              {s.photoDataUrl ? (
                <img
                  src={s.photoDataUrl}
                  alt={s.name}
                  className="h-20 w-20 shrink-0 rounded-2xl border border-white/15 object-cover shadow-lg"
                />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] text-2xl font-black text-cyan-200">
                  {initials}
                </div>
              )}

              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">
                    Student 360°
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                      isInactive
                        ? "border-slate-500/30 bg-slate-500/10 text-slate-300"
                        : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                    }`}
                  >
                    {isInactive ? "Inactive" : "Active"}
                  </span>
                </div>

                <h1 className="truncate text-2xl font-black tracking-tight sm:text-3xl">
                  {s.name}
                </h1>
                <p className="mt-1 text-sm text-slate-300">
                  {s.enrollmentNo || studentId || "Student ID pending"}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-200">
                    {courseLabel}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-200">
                    {batchLabel}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-200">
                    Joined {enrolled}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 xl:justify-end">
              <Button
                variant="outline"
                className="h-10 border-white/15 bg-white/[0.05] text-white hover:bg-white/10 hover:text-white"
                onClick={() => {
                  setViewingStudent(null);
                  openEdit(s);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" /> Edit Profile
              </Button>
              <Button
                variant="outline"
                className="h-10 border-white/15 bg-white/[0.05] text-white hover:bg-white/10 hover:text-white"
                onClick={() => {
                  setNewPassword(Math.random().toString(36).slice(-10));
                  setResetPasswordOpen(true);
                }}
              >
                <KeyRound className="mr-2 h-4 w-4" /> Reset Login
              </Button>
              {["institute_admin", "super_admin"].includes(localStorage.getItem("coach_sutra_user_role") || "") && (
                <Button
                  variant="outline"
                  className="h-10 border-cyan-300/20 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/15 hover:text-white"
                  onClick={() => {
                    setSupportReason("");
                    setSupportError("");
                    setSupportDialogOpen(true);
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" /> View as Student
                </Button>
              )}
              <Button
                className={`h-10 font-bold ${
                  isInactive
                    ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                    : "bg-white text-slate-950 hover:bg-slate-100"
                }`}
                onClick={() =>
                  updateStudentStatus(s, isInactive ? "active" : "inactive")
                }
              >
                <Ban className="mr-2 h-4 w-4" />
                {isInactive ? "Activate" : "Deactivate"}
              </Button>
            </div>
          </div>
        </section>

        {/* Profile health strip */}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-2xl border-slate-200/80 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50">
                  <UserCheck className="h-4 w-4 text-cyan-700" />
                </div>
                <span className="text-xs font-black text-slate-950">
                  {profileCompleteness}%
                </span>
              </div>
              <p className="mt-3 text-sm font-black text-slate-900">Record completeness</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-cyan-500"
                  style={{ width: `${profileCompleteness}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200/80 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                  <Wallet className="h-4 w-4 text-slate-700" />
                </div>
                <span
                  className={`text-xs font-black ${
                    !hasFeeData
                      ? "text-slate-400"
                      : feeInfo.due > 0
                        ? "text-amber-600"
                        : "text-emerald-600"
                  }`}
                >
                  {feeInfo.status === "not_assigned" ? "Not assigned" : !hasFeeData ? "Unavailable" : feeInfo.overdue > 0 ? "Overdue" : feeInfo.currentDue > 0 ? "Due" : feeInfo.isNoDue ? "Clear" : "Upcoming"}
                </span>
              </div>
              <p className="mt-3 text-xl font-black text-slate-950">
                {feeInfo.status === "not_assigned" ? "—" : hasFeeData ? `₹${feeInfo.currentDue.toLocaleString("en-IN")}` : "—"}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Current due</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200/80 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50">
                  <FolderOpen className="h-4 w-4 text-violet-700" />
                </div>
                <span className="text-xs font-black text-slate-500">
                  {requiredDocumentsReady}/3 required
                </span>
              </div>
              <p className="mt-3 text-xl font-black text-slate-950">
                {profileDocuments.length}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Documents on record</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200/80 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                  <ShieldCheck className="h-4 w-4 text-blue-700" />
                </div>
                <span
                  className={`text-xs font-black ${
                    s.loginId ? "text-emerald-600" : "text-slate-400"
                  }`}
                >
                  {s.loginId ? "Enabled" : "Not created"}
                </span>
              </div>
              <p className="mt-3 truncate text-sm font-black text-slate-950">
                {s.loginId || "Portal login pending"}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Student portal access</p>
            </CardContent>
          </Card>
        </section>

        {/* Navigation */}
        <section className="sticky top-0 z-40 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-sm backdrop-blur">
          <div className="flex gap-1 overflow-x-auto">
            {profileTabs.map((tab) => {
              const Icon = tab.icon;
              const active = profileTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setProfileTab(tab.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
                    active
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${active ? "text-cyan-300" : ""}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Tab content */}
        <section className="rounded-[24px] border border-slate-200/80 bg-white shadow-sm">
          <div className="p-4 sm:p-5">
            {profileTab === "overview" && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Student overview
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Identity, contacts and admission record
                  </h2>
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <User className="h-4 w-4 text-cyan-700" />
                      <h3 className="text-sm font-black text-slate-900">Personal details</h3>
                    </div>
                    <InfoRow label="Date of birth" value={s.dateOfBirth} />
                    <InfoRow
                      label="Gender"
                      value={
                        s.gender === "other"
                          ? s.genderOther || "Other"
                          : s.gender
                            ? String(s.gender).replace(/^./, (c: string) => c.toUpperCase())
                            : ""
                      }
                    />
                    <InfoRow label="Blood group" value={s.bloodGroup} />
                    <InfoRow label="Academic year" value={s.academicYear} />
                    <InfoRow label="Enrollment date" value={enrolled} />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4 text-cyan-700" />
                      <h3 className="text-sm font-black text-slate-900">Parent / guardian</h3>
                    </div>
                    <InfoRow label="Father" value={s.fatherName || s.parentName} />
                    <InfoRow label="Father phone" value={s.fatherPhone || s.parentPhone} />
                    <InfoRow label="Mother" value={s.motherName} />
                    <InfoRow label="Mother phone" value={s.motherPhone} />
                    <InfoRow label="Emergency" value={s.emergencyPhone} />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Phone className="h-4 w-4 text-cyan-700" />
                      <h3 className="text-sm font-black text-slate-900">Contact & access</h3>
                    </div>
                    <InfoRow label="Primary phone" value={s.phone || parentContact} />
                    <InfoRow label="Email" value={s.email} />
                    <InfoRow label="Login ID" value={s.loginId || "Not created"} mono />
                    <InfoRow
                      label="Portal"
                      value={s.loginId ? "Enabled" : "Login not created"}
                    />
                    <InfoRow label="Status" value={isInactive ? "Inactive" : "Active"} />
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-cyan-700" />
                      <h3 className="text-sm font-black text-slate-900">Address</h3>
                    </div>
                    {addressLine ? (
                      <p className="text-sm leading-6 text-slate-700">{addressLine}</p>
                    ) : (
                      <p className="text-sm text-slate-400">No address has been added yet.</p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-cyan-700" />
                        <h3 className="text-sm font-black text-slate-900">Student login</h3>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg border-slate-200 text-xs font-bold"
                        onClick={() => {
                          setNewPassword(Math.random().toString(36).slice(-10));
                          setResetPasswordOpen(true);
                        }}
                      >
                        <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                        Reset
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500">Login ID</p>
                    <p className="mt-1 font-mono text-sm font-bold text-slate-800">
                      {s.loginId || "Not created"}
                    </p>
                    <p className="mt-3 text-xs text-slate-500">
                      Password is not displayed for security reasons.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {profileTab === "academic" && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Academic assignment
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Course, batch and previous academic details
                  </h2>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-cyan-700" />
                      <h3 className="text-sm font-black text-slate-900">Current assignment</h3>
                    </div>
                    <InfoRow label="Course" value={courseLabel} />
                    <InfoRow label="Batch" value={batchLabel} />
                    <InfoRow label="Class" value={s.className} />
                    <InfoRow label="Section" value={s.section} />
                    <InfoRow label="Academic year" value={s.academicYear} />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-cyan-700" />
                      <h3 className="text-sm font-black text-slate-900">Previous academics</h3>
                    </div>
                    <InfoRow label="School" value={s.schoolName} />
                    <InfoRow
                      label="Board"
                      value={
                        s.board === "Other"
                          ? s.boardOther || "Other"
                          : s.board
                      }
                    />
                    <InfoRow label="Previous %" value={s.lastClassPercentage} />
                    <InfoRow label="Previous marks" value={s.lastClassMarks} />
                  </div>
                </div>
              </div>
            )}

            {profileTab === "fees" && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Fee health
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Student fee position
                  </h2>
                </div>

                {hasFeeData ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-bold text-slate-500">Total billed</p>
                        <p className="mt-2 text-2xl font-black text-slate-950">
                          ₹{feeInfo.total.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                        <p className="text-xs font-bold text-emerald-700">Paid</p>
                        <p className="mt-2 text-2xl font-black text-emerald-700">
                          ₹{feeInfo.paid.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div
                        className={`rounded-2xl border p-4 ${
                          feeInfo.due > 0
                            ? "border-amber-200 bg-amber-50/60"
                            : "border-emerald-200 bg-emerald-50/60"
                        }`}
                      >
                        <p
                          className={`text-xs font-bold ${
                            feeInfo.due > 0 ? "text-amber-700" : "text-emerald-700"
                          }`}
                        >
                          Outstanding
                        </p>
                        <p
                          className={`mt-2 text-2xl font-black ${
                            feeInfo.due > 0 ? "text-amber-700" : "text-emerald-700"
                          }`}
                        >
                          ₹{feeInfo.due.toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-500">Collection progress</span>
                        <span className="font-black text-slate-800">{feeProgress}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-cyan-500"
                          style={{ width: `${feeProgress}%` }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <EmptyState
                    icon={Wallet}
                    title="Fee structure is not available on this student record"
                    text="No billed, paid or due amount is currently present in the student data. This avoids showing a fake 'No Due' status when fees are not configured."
                  />
                )}
              </div>
            )}

            {profileTab === "attendance" && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Attendance
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Attendance summary
                  </h2>
                </div>

                {attendanceSource && attendanceTotal > 0 ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-bold text-slate-500">Total</p>
                        <p className="mt-2 text-2xl font-black text-slate-950">{attendanceTotal}</p>
                      </div>
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                        <p className="text-xs font-bold text-emerald-700">Present</p>
                        <p className="mt-2 text-2xl font-black text-emerald-700">{attendancePresent}</p>
                      </div>
                      <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4">
                        <p className="text-xs font-bold text-red-700">Absent</p>
                        <p className="mt-2 text-2xl font-black text-red-700">{attendanceAbsent}</p>
                      </div>
                      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                        <p className="text-xs font-bold text-amber-700">Late</p>
                        <p className="mt-2 text-2xl font-black text-amber-700">{attendanceLate}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-500">Attendance rate</span>
                        <span className="font-black text-slate-800">{attendanceRate}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${attendanceRate ?? 0}%` }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <EmptyState
                    icon={CalendarDays}
                    title="No attendance summary is attached to this student record"
                    text="The old profile was showing a hard-coded 100% attendance. That has been removed. Real attendance should appear here only when the attendance API returns student-level data."
                  />
                )}
              </div>
            )}

            {profileTab === "tests" && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Tests & performance
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Test history and scores
                  </h2>
                </div>

                {profileTests.length > 0 ? (
                  <div className="space-y-2">
                    {profileTests.map((test: any, index: number) => {
                      const title =
                        test.name ||
                        test.title ||
                        test.examName ||
                        test.testName ||
                        `Test ${index + 1}`;
                      const obtained =
                        test.obtainedMarks ??
                        test.marksObtained ??
                        test.score ??
                        test.marks;
                      const totalMarks =
                        test.totalMarks ??
                        test.maxMarks ??
                        test.outOf;
                      const testDate = test.date || test.examDate || test.createdAt;

                      return (
                        <div
                          key={test.id || test._id || `${title}-${index}`}
                          className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-black text-slate-900">{title}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {test.subjectName || test.subject || "Subject not specified"}
                              {testDate
                                ? ` · ${new Date(testDate).toLocaleDateString("en-GB")}`
                                : ""}
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                              Score
                            </p>
                            <p className="mt-1 text-lg font-black text-slate-950">
                              {obtained !== undefined && obtained !== null
                                ? `${obtained}${totalMarks ? ` / ${totalMarks}` : ""}`
                                : "Not published"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={BarChart3}
                    title="No test results are available on this student record"
                    text="Results and exams were previously shown as separate empty placeholders. They are now combined into one cleaner Tests area and will display actual data when the student API provides it."
                  />
                )}
              </div>
            )}

            {profileTab === "documents" && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Documents
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Admission documents
                  </h2>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {expectedDocumentLabels.map((label) => {
                    const document = profileDocuments.find((doc) => doc.label === label);

                    return (
                      <div
                        key={label}
                        className={`rounded-2xl border p-4 ${
                          document
                            ? "border-emerald-200 bg-emerald-50/40"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                            <FileText
                              className={`h-4 w-4 ${
                                document ? "text-emerald-600" : "text-slate-400"
                              }`}
                            />
                          </div>
                          <span
                            className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ${
                              document
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            {document ? "Ready" : "Missing"}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-black text-slate-900">{label}</p>
                        <p className="mt-1 truncate text-[10px] text-slate-500">
                          {document?.name || "No document uploaded"}
                        </p>
                        {document && (
                          <Button
                            type="button"
                            variant="outline"
                            className="mt-3 h-8 w-full rounded-lg border-slate-200 text-xs font-bold"
                            onClick={() => viewDocument(document)}
                          >
                            <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {profileDocuments.filter(
                  (doc) => !expectedDocumentLabels.includes(doc.label as any),
                ).length > 0 && (
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h3 className="text-sm font-black text-slate-900">Other documents</h3>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {profileDocuments
                        .filter(
                          (doc) => !expectedDocumentLabels.includes(doc.label as any),
                        )
                        .map((doc, index) => (
                          <div
                            key={`${doc.label}-${index}`}
                            className="flex items-center justify-between rounded-xl bg-slate-50 p-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-slate-800">
                                {doc.label || doc.name}
                              </p>
                              <p className="mt-0.5 truncate text-[10px] text-slate-400">
                                {doc.name}
                              </p>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 shrink-0 rounded-lg"
                              onClick={() => viewDocument(doc)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Read-only Student Support Mode */}
        <Dialog open={supportDialogOpen} onOpenChange={(open) => {
          if (!supportStarting) setSupportDialogOpen(open);
        }}>
          <DialogContent className="max-w-md overflow-hidden rounded-2xl border-0 p-0 shadow-2xl">
            <div className="bg-[linear-gradient(105deg,#020817_0%,#07112a_58%,#21184d_100%)] px-5 py-4 text-white">
              <div className="flex items-center gap-2 text-lg font-black">
                <Eye className="h-5 w-5 text-cyan-300" />
                <span>View as Student</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-300">
                Student ka password dekhe bina uska portal exactly student ki tarah open hoga. Session read-only rahega.
              </p>
            </div>

            <div className="space-y-4 bg-white p-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500">Student</p>
                <p className="mt-1 font-black text-slate-900">{viewingStudent?.name || "Student"}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {viewingStudent?.enrollmentNo || viewingStudent?.id || "Student ID"}
                </p>
              </div>

              <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-3 text-xs leading-5 text-cyan-950">
                <span className="font-black">Read-only Support Mode:</span> profile, fees, attendance, homework, timetable aur results dekh sakte ho; edit/payment/password-change jaise mutation actions backend se blocked rahenge.
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Support reason *</Label>
                <textarea
                  value={supportReason}
                  onChange={(event) => setSupportReason(event.target.value.slice(0, 240))}
                  placeholder="Example: Parent reported fee receipt issue"
                  className="min-h-[88px] w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  disabled={supportStarting}
                />
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Audit log me reason save hoga.</span>
                  <span>{supportReason.length}/240</span>
                </div>
              </div>

              {supportError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                  {supportError}
                </div>
              )}
            </div>

            <div className="flex gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3">
              <Button
                variant="outline"
                className="h-10 flex-1 rounded-xl"
                disabled={supportStarting}
                onClick={() => setSupportDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="h-10 flex-1 rounded-xl bg-slate-950 font-bold text-white hover:bg-slate-900"
                disabled={supportStarting}
                onClick={() => void startStudentSupportMode()}
              >
                <Eye className="mr-2 h-4 w-4" />
                {supportStarting ? "Opening..." : "Start Support Mode"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reset Password Modal */}
        <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
          <DialogContent className="max-w-sm overflow-hidden rounded-2xl border-0 p-0 shadow-2xl">
            <div className="bg-[linear-gradient(105deg,#020817_0%,#07112a_58%,#21184d_100%)] px-5 py-4 text-white">
              <div className="flex items-center gap-2 text-lg font-black">
                <KeyRound className="h-5 w-5 text-cyan-300" />
                <span>Reset Student Login</span>
              </div>
              <p className="mt-1 text-xs text-slate-300">
                Set a new password for {viewingStudent?.name || "this student"}.
              </p>
            </div>

            <div className="space-y-4 bg-white p-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500">Login ID</p>
                <p className="mt-1 font-mono text-sm font-black text-slate-900">
                  {viewingStudent?.loginId || "Not created"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {viewingStudent?.email || "Email not provided"}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  New Password *
                </Label>
                <div className="flex">
                  <Input
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewPassword(e.target.value)
                    }
                    className="h-10 rounded-r-none shadow-sm"
                  />
                  <Button
                    variant="outline"
                    className="h-10 rounded-l-none border-l-0 px-3 shadow-sm"
                    onClick={() =>
                      setNewPassword(Math.random().toString(36).slice(-10))
                    }
                  >
                    <RefreshCw className="h-4 w-4 text-slate-500" />
                  </Button>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={resetParentPwd}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setResetParentPwd(e.target.checked)
                  }
                  className="h-4 w-4 rounded border-slate-300 accent-slate-950"
                />
                <span className="text-sm font-semibold text-slate-700">
                  Also reset parent password
                </span>
              </label>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Password delivery depends on the configured communication/email flow.
              </div>
            </div>

            <div className="flex gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3">
              <Button
                variant="outline"
                className="h-10 flex-1 rounded-xl"
                onClick={() => setResetPasswordOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="h-10 flex-1 rounded-xl bg-slate-950 text-white hover:bg-slate-900"
                onClick={submitResetPassword}
              >
                <KeyRound className="mr-2 h-4 w-4" /> Reset Password
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {toast && (
          <div
            className={`fixed bottom-4 right-4 z-[200] flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm shadow-lg ${
              toast.type === "success"
                ? "border-green-300 bg-green-50 text-green-800"
                : "border-red-300 bg-red-50 text-red-800"
            }`}
          >
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
      
      {/* Premium student operations header */}
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200/70 bg-slate-950 px-5 py-6 text-white shadow-[0_22px_70px_-38px_rgba(15,23,42,0.65)] sm:px-7 lg:px-8">
        <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute -bottom-24 right-48 h-60 w-60 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200">
              <GraduationCap className="h-3.5 w-3.5" />
              Student Operations
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{pageTitle}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Admissions, student records, fee health and academic assignment — manage the complete student lifecycle from one workspace.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200">{totalStudents} total students</span>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">{activeStudents} active</span>
              <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200">{studentsWithDue} with fee dues</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Button variant="outline" className="h-10 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => setImportDialogOpen(true)}>
              <UploadCloud className="mr-2 h-4 w-4" /> Import
            </Button>
            <Button variant="outline" className="h-10 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            <Button onClick={openAdd} className="h-10 bg-white px-4 font-bold text-slate-950 shadow-sm hover:bg-cyan-50">
              <UserPlus className="mr-2 h-4 w-4" /> Admit Student
            </Button>
          </div>
        </div>
      </section>

      {/* Student health KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border-slate-200/80 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50"><UserCheck className="h-5 w-5 text-emerald-600" /></div>
              <span className="text-xs font-bold text-emerald-600">{activeRate}% active</span>
            </div>
            <p className="mt-4 text-2xl font-black text-slate-950">{activeStudents}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Active student records</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50"><UserPlus className="h-5 w-5 text-blue-600" /></div>
              <span className="text-xs font-bold text-slate-400">Last 30 days</span>
            </div>
            <p className="mt-4 text-2xl font-black text-slate-950">{newStudents}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">New admissions</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50"><Wallet className="h-5 w-5 text-amber-600" /></div>
              <span className="text-xs font-bold text-amber-600">{studentsWithDue} accounts</span>
            </div>
            <p className="mt-4 text-2xl font-black text-slate-950">₹{totalOutstanding.toLocaleString("en-IN")}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Outstanding student fees</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50"><ClipboardList className="h-5 w-5 text-violet-600" /></div>
              <span className="text-xs font-bold text-slate-400">{inactiveStudents} inactive · {graduatedStudents} graduated</span>
            </div>
            <p className="mt-4 text-2xl font-black text-slate-950">{batchesInUse}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Batches with enrolled students</p>
          </CardContent>
        </Card>
      </section>

      {/* Directory workspace */}
      <section className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-950">Student Directory</h2>
                <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-600 shadow-none">{classWiseStudents.length}</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500">Search, filter and take action without leaving the directory.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="h-9 rounded-xl border-slate-200 bg-white text-slate-700" onClick={() => setBulkUpdateDialogOpen(true)}>
                <Edit className="mr-1.5 h-4 w-4" /> Bulk Update
              </Button>
              <div className="flex h-9 items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                <button onClick={() => setViewMode("list")} title="List View" className={`flex h-full w-10 items-center justify-center transition-colors ${viewMode === "list" ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
                  <List className="h-4 w-4" />
                </button>
                <button onClick={() => setViewMode("grid")} title="Grid View" className={`flex h-full w-10 items-center justify-center border-l border-slate-200 transition-colors ${viewMode === "grid" ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="grid gap-2 xl:grid-cols-[minmax(320px,1fr)_210px_190px_205px_auto]">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  autoComplete="off"
                  name="student_search_filter_box"
                  className="h-11 rounded-xl border-slate-200 bg-white pl-10 pr-10 shadow-sm focus-visible:border-cyan-500 focus-visible:ring-cyan-500/20"
                  placeholder="Search student, ID, phone, parent, course, batch, class..."
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearch(e.target.value)
                  }
                />
                {search && (
                  <button
                    type="button"
                    title="Clear search"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <SearchableFilterDropdown
                value={batchFilter}
                onChange={setBatchFilter}
                options={batchOptions}
                placeholder="All Batches"
              />
              <SearchableFilterDropdown
                value={feeFilter}
                onChange={setFeeFilter}
                options={feeOptions}
                placeholder="All Fee Health"
              />
              <SearchableFilterDropdown
                value={sortBy}
                onChange={setSortBy}
                options={sortOptions}
                placeholder="Sort Students"
              />

              <Button
                variant="ghost"
                onClick={handleClearFilters}
                className="h-11 rounded-xl px-3 text-slate-500 hover:bg-white hover:text-slate-900"
              >
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Reset
              </Button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {[
                { value: "all", label: "All", count: totalStudents },
                { value: "active", label: "Active", count: activeStudents },
                { value: "inactive", label: "Inactive", count: inactiveStudents },
                { value: "graduated", label: "Graduated", count: graduatedStudents },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setStatusFilter(item.value)}
                  className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-bold transition ${
                    statusFilter === item.value
                      ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      statusFilter === item.value
                        ? "bg-white/10 text-cyan-200"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              ))}

              <div className="mx-1 hidden h-5 w-px bg-slate-200 sm:block" />

              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <FilterIcon className="h-3.5 w-3.5" />
                {classWiseStudents.length} shown
              </span>

              {feeNotAssignedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFeeFilter("not_assigned")}
                  className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 hover:bg-amber-100"
                >
                  {feeNotAssignedCount} fee not assigned
                </button>
              )}
            </div>

            {(search ||
              batchFilter !== "all" ||
              statusFilter !== "all" ||
              feeFilter !== "all") && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 text-[11px] text-slate-500">
                <span className="font-bold text-slate-700">Active filters:</span>

                {search && (
                  <span className="rounded-full bg-white px-2.5 py-1 shadow-sm">
                    Search: “{search}”
                  </span>
                )}

                {batchFilter !== "all" && (
                  <span className="rounded-full bg-white px-2.5 py-1 shadow-sm">
                    Batch:{" "}
                    {batchOptions.find(
                      (option: any) => option.value === batchFilter,
                    )?.label || "Selected"}
                  </span>
                )}

                {statusFilter !== "all" && (
                  <span className="rounded-full bg-white px-2.5 py-1 shadow-sm">
                    Status: {statusFilter}
                  </span>
                )}

                {feeFilter !== "all" && (
                  <span className="rounded-full bg-white px-2.5 py-1 shadow-sm">
                    Fee:{" "}
                    {feeOptions.find(
                      (option: any) => option.value === feeFilter,
                    )?.label || feeFilter}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-3 sm:p-4">
          {/* Grid / mobile card view */}
          <div className={`${viewMode === "grid" ? "grid gap-3 md:grid-cols-2 2xl:grid-cols-3" : "space-y-3 md:hidden"}`}>
            {isLoading ? (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">Loading students...</div>
            ) : classWiseStudents.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                <Users className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 font-bold text-slate-700">No students found</p>
                <p className="mt-1 text-xs text-slate-500">Try clearing filters or admit a new student.</p>
              </div>
            ) : (
              classWiseStudents.map((student: any) => {
                const feeInfo = getStudentFeeInfo(student);
                return (
                  <article key={student.id} className="group rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50">
                    <div className="flex items-start gap-3">
                      {student.photoDataUrl ? (
                        <img src={student.photoDataUrl} alt={student.name} className="h-14 w-14 shrink-0 rounded-2xl border border-slate-200 object-cover" />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100"><UserRound className="h-6 w-6 text-slate-400" /></div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="truncate font-black text-slate-900">{student.name}</h3>
                            <p className="mt-0.5 text-xs font-medium text-slate-500">{student.enrollmentNo || "Student ID pending"}</p>
                          </div>
                          {(() => {
                            const meta = studentStatusMeta(
                              String(student.status || "active"),
                            );
                            const canToggle = student.status !== "graduated";

                            return (
                              <button
                                type="button"
                                title={meta.nextLabel}
                                disabled={
                                  !canToggle ||
                                  statusUpdatingId === student.id
                                }
                                onClick={() =>
                                  canToggle &&
                                  toggleStudentStatus(student)
                                }
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide transition ${meta.className} ${
                                  canToggle
                                    ? "cursor-pointer"
                                    : "cursor-default"
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    student.status === "inactive"
                                      ? "bg-slate-400"
                                      : student.status === "graduated"
                                        ? "bg-violet-500"
                                        : "bg-emerald-500"
                                  }`}
                                />
                                {statusUpdatingId === student.id
                                  ? "Updating..."
                                  : meta.label}
                              </button>
                            );
                          })()}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-xl bg-slate-50 p-2.5"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Class</p><p className="mt-1 font-bold text-slate-700">{student.className || "—"} {student.section ? `· ${student.section}` : ""}</p></div>
                          <div className="rounded-xl bg-slate-50 p-2.5"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Batch</p><p className="mt-1 truncate font-bold text-slate-700">{student.batchName || "Not assigned"}</p></div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Fee status</p>
                            <span className={`mt-1 inline-flex rounded-full border px-2 py-1 text-[10px] font-black ${feeHealthClasses(feeInfo.status)}`}>{feeInfo.statusText}</span>
                          </div>
                          <p className="truncate text-xs font-medium text-slate-500">{student.phone || student.email || "No contact"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <Button type="button" size="sm" variant="outline" className="h-9 rounded-xl border-slate-200 text-xs font-bold" onClick={() => { setViewingStudent(student); setProfileTab("overview"); }}><Eye className="mr-1.5 h-3.5 w-3.5" /> Profile</Button>
                      <Button type="button" size="sm" variant="outline" className="h-9 rounded-xl border-slate-200 text-xs font-bold" onClick={() => openEdit(student)}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
                      <Button type="button" size="sm" variant="outline" className="h-9 rounded-xl border-slate-200 text-xs font-bold" onClick={() => downloadAdmissionForm(student)}><Download className="mr-1.5 h-3.5 w-3.5" /> Form</Button>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {/* Desktop data table */}
          {viewMode === "list" && (
            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 md:block">
              <Table>
                <TableHeader className="bg-slate-50/90">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[68px] pl-5 text-[11px] font-black uppercase tracking-wider text-slate-500">#</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">Student</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">Academic</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">Course / Batch</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">Fee Health</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">Status</TableHead>
                    <TableHead className="pr-5 text-right text-[11px] font-black uppercase tracking-wider text-slate-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="py-12 text-center text-sm text-slate-500">Loading students...</TableCell></TableRow>
                  ) : classWiseStudents.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="py-14 text-center"><Users className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-2 font-semibold text-slate-600">No students match these filters.</p></TableCell></TableRow>
                  ) : (
                    classWiseStudents.map((student: any, index: number) => {
                      const feeInfo = getStudentFeeInfo(student);
                      return (
                        <TableRow key={student.id} className="group border-slate-100 hover:bg-slate-50/70">
                          <TableCell className="pl-5 font-bold text-slate-400">{index + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {student.photoDataUrl ? (
                                <img src={student.photoDataUrl} alt={student.name} className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 object-cover" />
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100"><UserRound className="h-5 w-5 text-slate-400" /></div>
                              )}
                              <div className="min-w-0">
                                <button type="button" onClick={() => { setViewingStudent(student); setProfileTab("overview"); }} className="block max-w-[220px] truncate text-left text-sm font-black text-slate-900 hover:text-blue-700">{student.name}</button>
                                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500"><span>{student.enrollmentNo || "No ID"}</span><span>·</span><span className="max-w-[120px] truncate">{student.phone || student.email || "No contact"}</span></div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-bold text-slate-700">{student.className || "—"}{student.section ? ` · ${student.section}` : ""}</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">{student.board || "Board not set"}</p>
                          </TableCell>
                          <TableCell>
                            <p className="max-w-[180px] truncate text-sm font-semibold text-slate-700">{student.courseName || "Course not assigned"}</p>
                            <p className="mt-0.5 max-w-[180px] truncate text-[11px] text-slate-500">{student.batchName || "Batch not assigned"}</p>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${feeHealthClasses(feeInfo.status)}`}>
                              {feeInfo.statusText}
                            </span>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const meta = studentStatusMeta(
                                String(student.status || "active"),
                              );
                              const canToggle = student.status !== "graduated";

                              return (
                                <button
                                  type="button"
                                  title={meta.nextLabel}
                                  disabled={
                                    !canToggle ||
                                    statusUpdatingId === student.id
                                  }
                                  onClick={() =>
                                    canToggle &&
                                    toggleStudentStatus(student)
                                  }
                                  className={`inline-flex h-8 min-w-[106px] items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-black transition ${meta.className} ${
                                    canToggle
                                      ? "cursor-pointer"
                                      : "cursor-default"
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                      student.status === "inactive"
                                        ? "bg-slate-400"
                                        : student.status === "graduated"
                                          ? "bg-violet-500"
                                          : "bg-emerald-500"
                                    }`}
                                  />
                                  {statusUpdatingId === student.id
                                    ? "Updating"
                                    : meta.label}
                                </button>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="pr-5 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-80 transition-opacity group-hover:opacity-100">
                              <Button variant="ghost" size="icon" title="View profile" className="h-8 w-8 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700" onClick={() => { setViewingStudent(student); setProfileTab("overview"); }}><Eye className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" title="Edit student" className="h-8 w-8 rounded-lg text-slate-500 hover:bg-amber-50 hover:text-amber-700" onClick={() => openEdit(student)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" title="Download form" className="h-8 w-8 rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => downloadAdmissionForm(student)}><Download className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" title="Delete student" className="h-8 w-8 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(student)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </section>

      {/* ===================== ALL DIALOGS ===================== */}

      {/* BULK UPDATE DIALOG */}
      <Dialog
        open={bulkUpdateDialogOpen}
        onOpenChange={(open) => {
          setBulkUpdateDialogOpen(open);
          if (!open) {
            setBulkUpdateFile(null);
            setBulkUpdateSummary(null);
          }
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto rounded-[24px] border-0 p-0 shadow-2xl">
          <div className="sticky top-0 z-20 bg-[linear-gradient(105deg,#020817_0%,#07112a_58%,#21184d_100%)] px-6 py-4 text-white shadow-md">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xl font-black">
                  <Edit className="h-5 w-5 text-cyan-300" />
                  <span>Bulk Update Students</span>
                </div>
                <p className="mt-1 text-xs text-slate-300">Download current records, edit safe columns and upload the CSV again.</p>
              </div>
              <button onClick={() => setBulkUpdateDialogOpen(false)} className="rounded-lg p-1 text-white/75 transition hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid gap-6 bg-[#f3f6fb] p-6 md:grid-cols-2">
            <div className="space-y-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Workflow</p>
                <h3 className="mt-1 text-lg font-black text-slate-950">Safe CSV update</h3>
              </div>

              <div className="space-y-3">
                {[
                  ["1", "Download current data", "The export contains the admission number used to match every student."],
                  ["2", "Edit required values", "Keep admission_number unchanged. Blank cells are treated as no change."],
                  ["3", "Use exact batch names", "Changing batch_name also updates the linked course safely."],
                  ["4", "Upload and review", "Invalid rows are reported instead of being silently ignored."],
                ].map(([number, title, copy]) => (
                  <div key={number} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-xs font-black text-cyan-300">{number}</span>
                    <div>
                      <p className="text-sm font-black text-slate-900">{title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{copy}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={handleBulkDownloadTemplate} variant="outline" className="h-10 w-full rounded-xl border-slate-300 bg-white font-bold text-slate-800 hover:bg-slate-50">
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Download Current Student CSV
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Upload</p>
                <h3 className="mt-1 text-lg font-black text-slate-950">Edited CSV</h3>
              </div>

              <div className="relative flex min-h-[190px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-7 text-center transition hover:border-cyan-400 hover:bg-cyan-50/20">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => chooseCsvFile(e.target.files?.[0] || null, "bulk")}
                />
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-cyan-300">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <p className="font-black text-slate-900">Choose edited CSV</p>
                <p className="mt-1 text-xs text-slate-500">CSV only · Max 10 MB · Up to 2,000 rows</p>
                {bulkUpdateFile && (
                  <div className="relative z-20 mt-4 max-w-full rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-900">
                    <span className="block max-w-[320px] truncate">{bulkUpdateFile.name}</span>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-5 text-amber-900">
                <span className="font-black">Important:</span> do not edit <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">admission_number</code>. Use the exact <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">batch_name</code> shown in the downloaded file.
              </div>

              {bulkUpdateSummary && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div><p className="text-lg font-black text-slate-950">{bulkUpdateSummary.total}</p><p className="text-[10px] font-bold uppercase text-slate-400">Rows</p></div>
                    <div><p className="text-lg font-black text-emerald-600">{bulkUpdateSummary.success}</p><p className="text-[10px] font-bold uppercase text-slate-400">Updated</p></div>
                    <div><p className="text-lg font-black text-slate-500">{bulkUpdateSummary.skipped}</p><p className="text-[10px] font-bold uppercase text-slate-400">Skipped</p></div>
                    <div><p className="text-lg font-black text-red-600">{bulkUpdateSummary.failed}</p><p className="text-[10px] font-bold uppercase text-slate-400">Failed</p></div>
                  </div>
                  {bulkUpdateSummary.errors.length > 0 && (
                    <Button variant="outline" className="mt-3 h-9 w-full rounded-xl text-xs font-bold" onClick={() => downloadTransferErrors("bulk", bulkUpdateSummary)}>
                      <Download className="mr-1.5 h-3.5 w-3.5" /> Download Error Report
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-3.5">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <ShieldCheck className="h-4 w-4 text-cyan-700" /> Existing students only
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setBulkUpdateDialogOpen(false)} className="h-10 rounded-xl px-5">Close</Button>
              <Button onClick={handleBulkUpdateApply} disabled={!bulkUpdateFile || isBulkUpdating} className="h-10 rounded-xl bg-slate-950 px-5 font-bold text-white hover:bg-slate-900">
                <Edit className="mr-1.5 h-4 w-4" /> {isBulkUpdating ? "Applying..." : "Apply Updates"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* BULK IMPORT DIALOG */}
      <Dialog
        open={importDialogOpen}
        onOpenChange={(open) => {
          setImportDialogOpen(open);
          if (!open) {
            setImportFile(null);
            setImportSummary(null);
          }
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto rounded-[24px] border-0 p-0 shadow-2xl">
          <div className="sticky top-0 z-20 bg-[linear-gradient(105deg,#020817_0%,#07112a_58%,#21184d_100%)] px-6 py-4 text-white shadow-md">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xl font-black">
                  <UploadCloud className="h-5 w-5 text-cyan-300" />
                  <span>Bulk Import Students</span>
                </div>
                <p className="mt-1 text-xs text-slate-300">Validate batch, course, login and student data before creating records.</p>
              </div>
              <button onClick={() => setImportDialogOpen(false)} className="rounded-lg p-1 text-white/75 transition hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid gap-6 bg-[#f3f6fb] p-6 md:grid-cols-2">
            <div className="space-y-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Step 1</p>
                <h3 className="mt-1 text-lg font-black text-slate-950">Prepare the import file</h3>
              </div>

              <Button onClick={handleDownloadImportTemplate} variant="outline" className="h-10 w-full rounded-xl border-slate-300 bg-white font-bold text-slate-800 hover:bg-slate-50">
                <Download className="mr-2 h-4 w-4" /> Download Import Template
              </Button>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Required columns</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["name", "phone", "batch_name"].map((column) => (
                    <code key={column} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{column}</code>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">Use exact batch names. The linked course is picked automatically from the batch.</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Available batches</p>
                <div className="mt-3 flex max-h-32 flex-wrap gap-2 overflow-y-auto">
                  {(batches ?? []).length > 0 ? (
                    (batches ?? []).map((batch: any) => (
                      <span key={batch.id || batch.name} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                        {batch.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-amber-700">No batches available. Create a course/batch before importing students.</span>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Import options</p>
                <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-slate-700">
                  <input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-slate-950" />
                  <span>Skip rows whose email already exists</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-slate-700">
                  <input type="checkbox" checked={autoGenPassword} onChange={(e) => setAutoGenPassword(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-slate-950" />
                  <span>Generate a temporary portal password when password is blank</span>
                </label>
                <p className="text-[11px] leading-4 text-slate-400">Welcome-email sending is not shown here because the current student API does not provide a bulk credential-email action.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Step 2</p>
                <h3 className="mt-1 text-lg font-black text-slate-950">Upload & validate</h3>
              </div>

              <div className="relative flex min-h-[190px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-7 text-center transition hover:border-cyan-400 hover:bg-cyan-50/20">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => chooseCsvFile(e.target.files?.[0] || null, "import")}
                />
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-cyan-300">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <p className="font-black text-slate-900">Choose student CSV</p>
                <p className="mt-1 text-xs text-slate-500">CSV only · Max 5 MB · Up to 1,000 rows</p>
                {importFile && (
                  <div className="relative z-20 mt-4 max-w-full rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-900">
                    <span className="block max-w-[320px] truncate">{importFile.name}</span>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-5 text-amber-900">
                <AlertTriangle className="mr-2 inline h-4 w-4 align-text-bottom text-amber-600" />
                Date can be <b>YYYY-MM-DD</b> or <b>DD/MM/YYYY</b>. Password must be at least 6 characters when supplied.
              </div>

              {importSummary && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div><p className="text-lg font-black text-slate-950">{importSummary.total}</p><p className="text-[10px] font-bold uppercase text-slate-400">Rows</p></div>
                    <div><p className="text-lg font-black text-emerald-600">{importSummary.success}</p><p className="text-[10px] font-bold uppercase text-slate-400">Imported</p></div>
                    <div><p className="text-lg font-black text-slate-500">{importSummary.skipped}</p><p className="text-[10px] font-bold uppercase text-slate-400">Skipped</p></div>
                    <div><p className="text-lg font-black text-red-600">{importSummary.failed}</p><p className="text-[10px] font-bold uppercase text-slate-400">Failed</p></div>
                  </div>
                  {importSummary.errors.length > 0 && (
                    <Button variant="outline" className="mt-3 h-9 w-full rounded-xl text-xs font-bold" onClick={() => downloadTransferErrors("import", importSummary)}>
                      <Download className="mr-1.5 h-3.5 w-3.5" /> Download Skipped / Error Report
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-3.5">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <ShieldCheck className="h-4 w-4 text-cyan-700" /> Batch & course are validated before save
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setImportDialogOpen(false)} className="h-10 rounded-xl px-5">Close</Button>
              <Button onClick={handleImportSubmit} disabled={!importFile || isImporting || (batches ?? []).length === 0} className="h-10 rounded-xl bg-slate-950 px-5 font-bold text-white hover:bg-slate-900">
                <UploadCloud className="mr-1.5 h-4 w-4" /> {isImporting ? "Importing..." : "Import Students"}
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