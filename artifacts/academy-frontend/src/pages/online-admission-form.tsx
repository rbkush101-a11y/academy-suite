import { useEffect, useMemo, useRef, useState } from "react";
import { useRoute } from "wouter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Users, MapPin, FileText, Upload, UserRound, Search, Check, ChevronDown, X, Loader2, AlertCircle, CheckCircle2, Camera } from "lucide-react";
import { INDIA_STATES, getDistricts } from "@/lib/india-locations";
import { FormProgress } from "@/components/form-progress";
import { CameraCapture } from "@/components/camera-capture";

const CLASS_OPTIONS = ["NURSERY", "L.K.G", "U.K.G", ...Array.from({ length: 12 }, (_, i) => `${i + 1}`)];
const BOARD_OPTIONS = ["CBSE", "ICSE", "UP Board", "Other"];
const GENDER_OPTIONS = ["Male", "Female", "Other"];
const BLOOD_GROUP_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const COUNTRY_CODES = [
  { code: "+91", iso: "in", name: "India" },
  { code: "+1", iso: "us", name: "USA" },
  { code: "+44", iso: "gb", name: "UK" },
  { code: "+971", iso: "ae", name: "UAE" },
  { code: "+966", iso: "sa", name: "Saudi" },
  { code: "+974", iso: "qa", name: "Qatar" },
  { code: "+965", iso: "kw", name: "Kuwait" },
  { code: "+968", iso: "om", name: "Oman" },
  { code: "+973", iso: "bh", name: "Bahrain" },
  { code: "+92", iso: "pk", name: "Pakistan" },
  { code: "+880", iso: "bd", name: "Bangladesh" },
  { code: "+977", iso: "np", name: "Nepal" },
  { code: "+94", iso: "lk", name: "Sri Lanka" },
  { code: "+61", iso: "au", name: "Australia" },
  { code: "+65", iso: "sg", name: "Singapore" },
  { code: "+60", iso: "my", name: "Malaysia" },
  { code: "+49", iso: "de", name: "Germany" },
  { code: "+33", iso: "fr", name: "France" },
  { code: "+81", iso: "jp", name: "Japan" },
  { code: "+86", iso: "cn", name: "China" },
];


type PublicCourse = {
  id: string;
  name: string;
  description?: string;
  duration?: string;
  fees?: number;
  courseType?: string;
};

type PublicBatch = {
  id: string;
  name: string;
  courseId: string;
  capacity: number;
  currentStrength: number;
  schedule?: string;
  academicYear?: string;
  startDate?: string;
  status?: string;
};

type PublicConfig = {
  institute: {
    id: string;
    name: string;
    logoDataUrl?: string;
    academicYear?: string;
    city?: string;
    state?: string;
  };
  courses: PublicCourse[];
  batches: PublicBatch[];
};

type UploadValue = {
  name: string;
  mimeType: string;
  dataUrl: string;
};

async function readUpload(file: File, maxBytes: number, allowedTypes: string[]): Promise<UploadValue> {
  if (!allowedTypes.includes(file.type)) throw new Error("Unsupported file type.");
  if (file.size > maxBytes) throw new Error(`File must be ${Math.round(maxBytes / 1024 / 1024)}MB or smaller.`);
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
  return { name: file.name, mimeType: file.type, dataUrl };
}

function SectionTitle({ number, icon, children }: any) {
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

function FormRow({ cols = 2, children }: any) { return <div className={`grid gap-4 ${cols === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>{children}</div>; }

function FormInput({ label, required = false, value, onChange, placeholder = "", type = "text" }: any) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium text-[#52627a]">{label}{required && <span className="ml-1 text-red-500">*</span>}</Label><Input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9 border-[#d4dde9] bg-white text-sm text-[#071426] shadow-sm placeholder:text-[#91a0b5] focus-visible:border-cyan-500 focus-visible:ring-1 focus-visible:ring-cyan-500" /></div>;
}

function SearchableDropdown({ label, value, options, onChange, placeholder = "Search...", disabled = false, required = false }: any) {
  const [open, setOpen] = useState(false); const [search, setSearch] = useState(""); const ref = useRef<HTMLDivElement>(null);
  const normalized = (options || []).map((o: any) => typeof o === "string" ? { label: o, value: o } : o);
  const selected = normalized.find((o: 
    any) => o.value === value);
  const filtered = normalized.filter((o: any) => String(o.label).toLowerCase().includes(search.toLowerCase()));
  useEffect(() => { const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", fn); return () => document.removeEventListener("mousedown", fn); }, []);
  return <div className="relative space-y-1.5" ref={ref}>
    <Label className="text-xs font-medium text-[#52627a]">{label}{required && <span className="ml-1 text-red-500">*</span>}</Label>
    <button type="button" disabled={disabled} onClick={() => { setSearch(""); setOpen(v => !v); }} className={`flex h-9 w-full items-center justify-between rounded-md border border-[#d4dde9] bg-white px-3 text-left text-sm shadow-sm ${disabled ? "cursor-not-allowed bg-slate-50 text-[#91a0b5]" : "hover:bg-slate-50"}`}>
      <span className={selected ? "text-[#071426]" : "text-[#91a0b5]"}>{selected?.label || placeholder}</span><ChevronDown className="h-4 w-4 shrink-0 text-[#91a0b5]" />
    </button>
    {open && !disabled && <div className="absolute left-0 top-[calc(100%+2px)] z-[100] w-full rounded-md border border-slate-200 bg-white p-1.5 shadow-xl">
      <div className="relative mb-1.5"><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#91a0b5]" /><input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-2 text-sm text-[#071426] outline-none placeholder:text-[#91a0b5] focus:border-blue-500" /></div>
      <div className="max-h-56 overflow-y-auto">{filtered.length ? filtered.map((o: any) => <button key={o.value} type="button" onMouseDown={e => e.preventDefault()} onClick={() => { onChange(o.value); setOpen(false); setSearch(""); }} className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm ${o.value === value ? "bg-blue-50 font-medium text-blue-700" : "text-slate-700 hover:bg-slate-100"}`}><span>{o.label}</span>{o.value === value && <Check className="h-3.5 w-3.5" />}</button>) : <div className="px-3 py-3 text-center text-xs text-[#70809a]">No results found</div>}</div>
    </div>}
  </div>;
}

function Flag({ iso }: { iso: string }) {
  return (
    <img
      src={`https://flagcdn.com/w40/${iso}.png`}
      srcSet={`https://flagcdn.com/w80/${iso}.png 2x`}
      alt=""
      className="h-4 w-5 rounded-[2px] object-cover"
      loading="lazy"
    />
  );
}

function PhoneField({
  label,
  value,
  onChange,
  code = "+91",
  onCodeChange,
  required = false,
}: any) {
  const selected = COUNTRY_CODES.find((c) => c.code === code) ?? COUNTRY_CODES[0];

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-[#52627a]">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>

      <div className="flex h-9 overflow-hidden rounded-md border border-[#d4dde9] bg-white shadow-sm focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500">
        <div className="relative flex shrink-0 items-center gap-1 border-r border-slate-200 bg-white px-2.5">
          <Flag iso={selected.iso} />
          <svg
            className="h-3 w-3 text-[#70809a]"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M5.25 7.5L10 12.25L14.75 7.5H5.25Z" />
          </svg>
          <span className="text-sm font-medium text-[#071426]">{code}</span>

          <select
            value={code}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              onCodeChange?.(e.target.value)
            }
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>

        <input
          inputMode="numeric"
          placeholder="Mobile number"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange(e.target.value.replace(/\D/g, "").slice(0, 15))
          }
          className="h-full w-full border-0 bg-transparent px-3 text-sm text-[#071426] outline-none placeholder:text-[#91a0b5]"
        />
      </div>
    </div>
  );
}

function WhatsappField({
  value,
  contact,
  onChange,
  code = "+91",
  onCodeChange,
  contactCode = "+91",
}: any) {
  const same =
    Boolean(contact) &&
    value === contact &&
    code === contactCode;

  const selected = COUNTRY_CODES.find((c) => c.code === code) ?? COUNTRY_CODES[0];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-xs font-medium text-[#52627a]">
          WhatsApp Number
        </Label>

        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-[#0b5bd3]"
            checked={same}
            disabled={!contact}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              if (e.target.checked) {
                onChange(contact);
                onCodeChange?.(contactCode);
              } else {
                onChange("");
              }
            }}
          />
          Same as contact
        </label>
      </div>

      <div className="flex h-9 overflow-hidden rounded-md border border-[#d4dde9] bg-white shadow-sm focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500">
        <div className="relative flex shrink-0 items-center gap-1 border-r border-slate-200 bg-white px-2.5">
          <Flag iso={selected.iso} />
          <svg
            className="h-3 w-3 text-[#70809a]"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M5.25 7.5L10 12.25L14.75 7.5H5.25Z" />
          </svg>
          <span className="text-sm font-medium text-[#071426]">{code}</span>

          <select
            value={code}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              onCodeChange?.(e.target.value)
            }
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>

        <input
          inputMode="numeric"
          placeholder="WhatsApp number"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange(e.target.value.replace(/\D/g, "").slice(0, 15))
          }
          className="h-full w-full border-0 bg-transparent px-3 text-sm text-[#071426] outline-none placeholder:text-[#91a0b5]"
        />
      </div>
    </div>
  );
}
function EmailField({ value, onChange }: any) { return <FormInput label="Parent Email" type="email" value={value} onChange={onChange} placeholder="Enter email address" />; }
function PercentField({ value, onChange }: any) { return <FormInput label="Last Class Percentage" value={value} onChange={(v: string) => onChange(v.replace(/[^0-9.]/g, "").slice(0, 6))} placeholder="Example: 85.5" />; }

export default function OnlineAdmissionForm() {
  const [, params] = useRoute("/online-admission-form/:instituteId");
  const instituteId = params?.instituteId || new URLSearchParams(window.location.search).get("institute") || "";

  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fileError, setFileError] = useState("");
  const [success, setSuccess] = useState<{ applicationNumber: string; instituteName: string } | null>(null);
  const [documentCamera, setDocumentCamera] = useState<"aadhaarFront" | "aadhaarBack" | "previousMarksheet" | null>(null);

  const [form, setForm] = useState<any>({
    name:"", dateOfBirth:"", gender:"", genderOther:"", bloodGroup:"", schoolName:"",
    academicYear:"2026-2027", photoDataUrl:"", className:"", section:"", board:"",
    boardOther:"", lastClassPercentage:"", lastClassMarks:"", courseId:"", batchId:"",
    motherName:"", motherOccupation:"", motherPhone:"", motherPhoneCode:"+91",
    motherWhatsapp:"", motherWhatsappCode:"+91", fatherName:"", fatherOccupation:"",
    fatherPhone:"", fatherPhoneCode:"+91", fatherWhatsapp:"", fatherWhatsappCode:"+91",
    emergencyPhone:"", emergencyPhoneCode:"+91", email:"", correspondenceAddress:"",
    correspondenceState:"", correspondenceDistrict:"", correspondencePin:"",
    aadhaarFront:null as UploadValue | null, aadhaarBack:null as UploadValue | null,
    previousMarksheet:null as UploadValue | null,
    _website:"",
  });

  const setValue = (key: string, value: any) => setForm((old: any) => ({ ...old, [key]: value }));

  useEffect(() => {
    let cancelled = false;

    async function loadPublicConfig() {
      if (!instituteId) {
        setError("This admission link is incomplete. Please request the institute's latest admission link.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const response = await fetch(`/api/public/online-admissions/${encodeURIComponent(instituteId)}/config`);
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.error || "Unable to load admission form.");

        if (!cancelled) {
          setConfig(body);
          setForm((old: any) => ({
            ...old,
            academicYear: body?.institute?.academicYear || old.academicYear || "2026-2027",
          }));
        }
      } catch (loadError: any) {
        if (!cancelled) setError(loadError?.message || "Unable to load admission form.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPublicConfig();
    return () => { cancelled = true; };
  }, [instituteId]);

  const courses: PublicCourse[] = config?.courses ?? [];
  const batches: PublicBatch[] = config?.batches ?? [];
  const filteredBatches = useMemo(
    () => !form.courseId
      ? []
      : batches.filter((b) =>
          String(b.courseId) === String(form.courseId) &&
          (b.capacity <= 0 || b.currentStrength < b.capacity)
        ),
    [batches, form.courseId],
  );

  const photo = async (file?: File) => {
    if (!file) return;
    try {
      setFileError("");
      const upload = await readUpload(file, 2 * 1024 * 1024, ["image/jpeg", "image/png", "image/webp"]);
      setValue("photoDataUrl", upload.dataUrl);
    } catch (uploadError: any) {
      setFileError(uploadError?.message || "Unable to upload photo.");
    }
  };

  const doc = async (key: "aadhaarFront" | "aadhaarBack" | "previousMarksheet", file?: File) => {
    if (!file) return;
    try {
      setFileError("");
      const upload = await readUpload(
        file,
        3 * 1024 * 1024,
        ["image/jpeg", "image/png", "image/webp", "application/pdf"],
      );
      setValue(key, upload);
    } catch (uploadError: any) {
      setFileError(uploadError?.message || "Unable to upload document.");
    }
  };

  const captureDocument = (dataUrl: string) => {
    if (!documentCamera) return;

    const comma = dataUrl.indexOf(",");
    const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
    const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
    const bytes = Math.max(0, Math.floor((base64.length * 3) / 4) - padding);

    if (bytes > 3 * 1024 * 1024) {
      setFileError("Captured document must be 3MB or smaller.");
      setDocumentCamera(null);
      return;
    }

    const mimeType = dataUrl.match(/^data:([^;]+);base64,/)?.[1]?.toLowerCase() || "image/jpeg";
    const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
    const name =
      documentCamera === "aadhaarFront"
        ? `aadhaar-card-front-camera.${extension}`
        : documentCamera === "aadhaarBack"
          ? `aadhaar-card-back-camera.${extension}`
          : `previous-class-marksheet-camera.${extension}`;

    setValue(documentCamera, {
      name,
      mimeType,
      dataUrl,
    } as UploadValue);

    setFileError("");
    setDocumentCamera(null);
  };

  const validate = () => {
    if (!form.name.trim()) return "Student name is required.";
    if (!form.dateOfBirth) return "Date of birth is required.";
    if (!form.gender) return "Gender is required.";
    if (form.gender === "other" && !form.genderOther.trim()) return "Please specify gender.";
    if (!form.academicYear.trim()) return "Academic year is required.";
    if (!form.courseId) return "Please select a course.";
    if (!form.batchId) return "Please select a batch.";
    if (!form.aadhaarFront) return "Please upload or capture Aadhaar Card front side.";
    if (!form.aadhaarBack) return "Please upload or capture Aadhaar Card back side.";
    if (!form.previousMarksheet) return "Please upload or capture Previous Class Marksheet front side.";
    if (!form.fatherPhone && !form.motherPhone && !form.emergencyPhone) {
      return "Please provide at least one parent or emergency contact number.";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return "Please enter a valid email address.";
    }
    return "";
  };

  const submitApplication = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const response = await fetch(`/api/public/online-admissions/${encodeURIComponent(instituteId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Unable to submit application.");

      setSuccess({
        applicationNumber: body.applicationNumber,
        instituteName: body.instituteName || config?.institute?.name || "Institute",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (submitError: any) {
      setError(submitError?.message || "Unable to submit application.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  const studentStepFilled = Boolean(
    form.name &&
    form.dateOfBirth &&
    form.gender &&
    form.academicYear &&
    form.courseId &&
    form.batchId
  );
  const parentStepFilled = Boolean(
    form.fatherPhone || form.motherPhone || form.emergencyPhone
  );
  const addressStepFilled = Boolean(
    form.correspondenceAddress &&
    form.correspondenceState &&
    form.correspondenceDistrict &&
    form.correspondencePin
  );
  const documentsStepFilled = Boolean(form.aadhaarFront && form.aadhaarBack && form.previousMarksheet);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb]">
      <div className="flex items-center gap-3 rounded-2xl border bg-white px-6 py-5 text-sm font-medium text-[#52627a] shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-[#2f66c9]" /> Loading admission form...
      </div>
    </div>;
  }

  if (!config) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] p-4">
      <Card className="w-full max-w-lg rounded-2xl"><CardContent className="p-8 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
        <h1 className="mt-4 text-xl font-bold text-[#071426]">Admission form unavailable</h1>
        <p className="mt-2 text-sm text-[#70809a]">{error || "Please contact the institute for a valid admission link."}</p>
      </CardContent></Card>
    </div>;
  }

  if (success) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] p-4">
      <Card className="w-full max-w-xl rounded-3xl border-emerald-200 shadow-lg"><CardContent className="p-8 text-center md:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-9 w-9 text-emerald-600" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-[#071426]">Application submitted</h1>
        <p className="mt-2 text-sm text-[#70809a]">Your application has been sent to {success.instituteName}.</p>
        <div className="mx-auto mt-6 max-w-sm rounded-2xl bg-slate-900 px-5 py-4 text-white">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#91a0b5]">Application Number</div>
          <div className="mt-1 text-xl font-bold tracking-wide">{success.applicationNumber}</div>
        </div>
        <p className="mt-5 text-xs text-[#91a0b5]">Save this application number for future reference.</p>
      </CardContent></Card>
    </div>;
  }

  return <div className="min-h-screen w-full overflow-x-clip bg-[#f4f7fb] px-3 pb-10 pt-2 md:px-6">
    <div className="mx-auto w-full max-w-6xl space-y-3">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[26px] border border-[#202943] bg-[linear-gradient(105deg,#020817_0%,#020b1d_58%,#21184d_100%)] shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
        <div className="h-[3px] bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500" />
        <div className="px-4 py-4 text-center md:px-6 md:py-5">
          <div className="mb-2 flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] text-cyan-300 ring-1 ring-white/10 shadow-sm">
              {config.institute.logoDataUrl
                ? <img src={config.institute.logoDataUrl} alt="" className="h-full w-full object-cover" />
                : <GraduationCap className="h-5 w-5" />}
            </div>
            <span className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-violet-200">
              Admissions {form.academicYear || "2026-2027"}
            </span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-white md:text-2xl">
            {config.institute.name || "Second School Classes"}
          </h1>
          <h2 className="mx-auto mt-1 text-base font-bold leading-snug text-white md:text-lg">
            Online Admission Application Form
          </h2>
          <p className="mt-1 text-xs font-medium text-white/80 md:text-sm">
            Please fill in all required details carefully.
          </p>
          {(config.institute.city || config.institute.state) && (
            <div className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-slate-200 shadow-sm">
              <MapPin className="h-3.5 w-3.5" />
              {[config.institute.city, config.institute.state].filter(Boolean).join(", ")}
            </div>
          )}
        </div>
      </div>

      <div className="sticky top-0 z-50 bg-[#f4f7fb]/95 py-1.5 shadow-sm backdrop-blur">
        <div className="mx-auto max-w-5xl rounded-2xl border border-[#dfe6f0] bg-white px-3 py-2 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
          <FormProgress
            steps={[
              { label: "Student", filled: studentStepFilled },
              { label: "Parents", filled: parentStepFilled },
              { label: "Address", filled: addressStepFilled },
              { label: "Docs", filled: documentsStepFilled },
            ]}
          />
        </div>
      </div>

      {error && <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0"/><span>{error}</span></div>}
      {fileError && <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0"/><span>{fileError}</span></div>}
      <input aria-hidden="true" tabIndex={-1} autoComplete="off" value={form._website} onChange={e=>setValue("_website",e.target.value)} className="hidden"/>

      <div className="space-y-5 pt-2">
        <Card className="rounded-[20px] border border-[#dfe6f0] bg-white text-[#071426] shadow-[0_6px_20px_rgba(15,23,42,0.05)]"><CardContent className="space-y-5 p-5 md:p-6"><SectionTitle number={1} icon={<GraduationCap className="h-5 w-5" />}>Student's Information</SectionTitle>
          <div className="grid gap-5 md:grid-cols-[1fr_200px]"><div className="space-y-4">
            <FormRow><FormInput label="Student Name" required value={form.name} onChange={(v:string)=>setValue("name",v)} placeholder="Enter student name"/><FormInput label="Date of Birth" required type="date" value={form.dateOfBirth} onChange={(v:string)=>setValue("dateOfBirth",v)}/></FormRow>
            <FormRow><div className="space-y-2"><SearchableDropdown label="Gender" value={form.gender} required options={GENDER_OPTIONS.map(x=>({label:x,value:x.toLowerCase()}))} placeholder="Select gender" onChange={(v:string)=>{setValue("gender",v);if(v!=="other")setValue("genderOther","")}}/>{form.gender==="other"&&<FormInput label="Specify Gender" required value={form.genderOther} onChange={(v:string)=>setValue("genderOther",v)} placeholder="Type gender"/>}</div><SearchableDropdown label="Blood Group (Optional)" value={form.bloodGroup} options={BLOOD_GROUP_OPTIONS} placeholder="Select blood group" onChange={(v:string)=>setValue("bloodGroup",v)}/></FormRow>
            <FormRow><FormInput label="School Name" value={form.schoolName} onChange={(v:string)=>setValue("schoolName",v)} placeholder="Enter school name"/><FormInput label="Academic Year" required value={form.academicYear} onChange={(v:string)=>setValue("academicYear",v)}/></FormRow>
          </div><div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-3"><Label className="block text-center text-xs font-bold uppercase tracking-wide text-[#70809a]">Student Photo</Label><div className="mx-auto mt-3 flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white shadow-lg ring-2 ring-cyan-500/20">{form.photoDataUrl?<img src={form.photoDataUrl} alt="Student" className="h-full w-full object-cover"/>:<UserRound className="h-14 w-14 text-slate-300"/>}</div><div className="mt-4 grid grid-cols-2 gap-2"><label className="flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border bg-white text-xs font-semibold shadow-sm hover:bg-[#f4f7fb]"><Upload className="h-3.5 w-3.5"/>Upload<input type="file" accept="image/*" className="hidden" onChange={e=>void photo(e.target.files?.[0])}/></label><label className="flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border bg-white text-xs font-semibold shadow-sm hover:bg-[#f4f7fb]"><Camera className="h-3.5 w-3.5"/>Camera<input type="file" accept="image/*" capture="user" className="hidden" onChange={e=>void photo(e.target.files?.[0])}/></label></div>{form.photoDataUrl&&<Button type="button" variant="ghost" className="mt-2 h-7 w-full text-xs text-red-600 hover:bg-red-50" onClick={()=>setValue("photoDataUrl","")}><X className="mr-1 h-3 w-3"/>Remove</Button>}</div></div>
          <FormRow cols={3}><SearchableDropdown label="Class" value={form.className} options={CLASS_OPTIONS} placeholder="Select class" onChange={(v:string)=>setValue("className",v)}/><FormInput label="Section" value={form.section} onChange={(v:string)=>setValue("section",v)} placeholder="Example: A"/><div className="space-y-2"><SearchableDropdown label="Board" value={form.board} options={BOARD_OPTIONS} placeholder="Select board" onChange={(v:string)=>{setValue("board",v);if(v!=="Other")setValue("boardOther","")}}/>{form.board==="Other"&&<FormInput label="Specify Board Name" required value={form.boardOther} onChange={(v:string)=>setValue("boardOther",v)} placeholder="Type board name"/>}</div></FormRow>
          <FormRow><PercentField value={form.lastClassPercentage} onChange={(v:string)=>setValue("lastClassPercentage",v)}/><FormInput label="Marks Obtained in Last Class" value={form.lastClassMarks} onChange={(v:string)=>setValue("lastClassMarks",v)} placeholder="Example: 410 / 500"/></FormRow>
          <FormRow><SearchableDropdown label="Course" required value={form.courseId} options={courses.map((c:any)=>({label:c.name,value:c.id}))} placeholder="Select course" onChange={(v:string)=>setForm((old:any)=>({...old,courseId:v,batchId:""}))}/><SearchableDropdown label="Batch" required value={form.batchId} options={filteredBatches.map((b:any)=>({label:b.name,value:b.id}))} placeholder={form.courseId?"Select batch":"Select course first"} disabled={!form.courseId} onChange={(v:string)=>setValue("batchId",v)}/></FormRow>
        </CardContent></Card>

        {/* SECTION 2: PARENT — same layout as Student Admit Form */}
        <Card className="rounded-[20px] border border-[#dfe6f0] bg-white text-[#071426] shadow-[0_6px_20px_rgba(15,23,42,0.05)]">
          <CardContent className="p-6 space-y-5">
            <SectionTitle number={2} icon={<Users className="h-5 w-5" />}>Parent's Information</SectionTitle>

            <div className="rounded-2xl border border-[#e1e8f1] bg-white p-4">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-[#071426]">
                <span className="h-2 w-2 rounded-full bg-pink-500" />
                Mother's Details
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FormInput
                  label="Mother's Name"
                  value={form.motherName}
                  onChange={(v: string) => setValue("motherName", v)}
                />
                <FormInput
                  label="Occupation"
                  value={form.motherOccupation}
                  onChange={(v: string) => setValue("motherOccupation", v)}
                />
                <PhoneField
                  label="Contact Number"
                  value={form.motherPhone}
                  onChange={(v: string) => setValue("motherPhone", v)}
                  code={form.motherPhoneCode}
                  onCodeChange={(c: string) => setValue("motherPhoneCode", c)}
                />
                <WhatsappField
                  value={form.motherWhatsapp}
                  contact={form.motherPhone}
                  contactCode={form.motherPhoneCode}
                  onChange={(v: string) => setValue("motherWhatsapp", v)}
                  code={form.motherWhatsappCode}
                  onCodeChange={(c: string) => setValue("motherWhatsappCode", c)}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-[#e1e8f1] bg-white p-4">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-[#071426]">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Father's Details
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FormInput
                  label="Father's Name"
                  value={form.fatherName}
                  onChange={(v: string) => setValue("fatherName", v)}
                />
                <FormInput
                  label="Occupation"
                  value={form.fatherOccupation}
                  onChange={(v: string) => setValue("fatherOccupation", v)}
                />
                <PhoneField
                  label="Contact Number"
                  value={form.fatherPhone}
                  onChange={(v: string) => setValue("fatherPhone", v)}
                  code={form.fatherPhoneCode}
                  onCodeChange={(c: string) => setValue("fatherPhoneCode", c)}
                />
                <WhatsappField
                  value={form.fatherWhatsapp}
                  contact={form.fatherPhone}
                  contactCode={form.fatherPhoneCode}
                  onChange={(v: string) => setValue("fatherWhatsapp", v)}
                  code={form.fatherWhatsappCode}
                  onCodeChange={(c: string) => setValue("fatherWhatsappCode", c)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <PhoneField
                label="Emergency Contact"
                value={form.emergencyPhone}
                onChange={(v: string) => setValue("emergencyPhone", v)}
                code={form.emergencyPhoneCode}
                onCodeChange={(c: string) => setValue("emergencyPhoneCode", c)}
              />
              <EmailField
                value={form.email}
                onChange={(v: string) => setValue("email", v)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[20px] border border-[#dfe6f0] bg-white text-[#071426] shadow-[0_6px_20px_rgba(15,23,42,0.05)]"><CardContent className="space-y-5 p-5 md:p-6"><SectionTitle number={3} icon={<MapPin className="h-5 w-5"/>}>Address Details</SectionTitle><div className="rounded-2xl border border-[#e1e8f1] bg-white p-4"><FormInput label="Address" value={form.correspondenceAddress} onChange={(v:string)=>setValue("correspondenceAddress",v)}/><div className="mt-4 grid gap-4 md:grid-cols-3"><SearchableDropdown label="State" value={form.correspondenceState} options={INDIA_STATES} placeholder="Search state" onChange={(v:string)=>setForm((old:any)=>({...old,correspondenceState:v,correspondenceDistrict:""}))}/><SearchableDropdown label="District" value={form.correspondenceDistrict} options={getDistricts(form.correspondenceState)} placeholder={form.correspondenceState?"Search district":"Select state first"} disabled={!form.correspondenceState} onChange={(v:string)=>setValue("correspondenceDistrict",v)}/><FormInput label="PIN" value={form.correspondencePin} onChange={(v:string)=>setValue("correspondencePin",v.replace(/\D/g,"").slice(0,6))} placeholder="6 digit"/></div></div></CardContent></Card>

        <Card className="rounded-[20px] border border-[#dfe6f0] bg-white text-[#071426] shadow-[0_6px_20px_rgba(15,23,42,0.05)]">
          <CardContent className="space-y-5 p-5 md:p-6">
            <SectionTitle number={4} icon={<FileText className="h-5 w-5"/>}>Documents</SectionTitle>

            <div className="-mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-[#70809a]">
                Aadhaar Card ke Front + Back dono aur Previous Class Marksheet ka Front upload/capture karein (Image/PDF, Max 3MB each).
              </p>
              <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-600">
                Required
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
              {/* Aadhaar Card — Front + Back */}
              <div className="rounded-2xl border border-[#e1e8f1] bg-white p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <Label className="text-sm font-bold text-[#071426]">Aadhaar Card</Label>
                    <p className="mt-0.5 text-[11px] text-[#70809a]">
                      Front aur back dono alag upload/capture karein.
                    </p>
                  </div>
                  <span className="rounded-full border border-[#dce5f0] bg-[#f5f8fc] px-2 py-1 text-[10px] font-bold text-[#52627a]">
                    2 SIDES
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      key: "aadhaarFront" as const,
                      title: "Front Side",
                      helper: "Photo & Aadhaar number side",
                    },
                    {
                      key: "aadhaarBack" as const,
                      title: "Back Side",
                      helper: "Address side",
                    },
                  ].map((item) => {
                    const value = form[item.key] as UploadValue | null;

                    return (
                      <div key={item.key} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-bold text-[#071426]">{item.title}</div>
                            <div className="mt-0.5 text-[10px] text-[#91a0b5]">{item.helper}</div>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                            value ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {value ? "READY" : "PENDING"}
                          </span>
                        </div>

                        {value && (
                          <div className="mt-3 flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[10px] font-semibold text-emerald-700">
                            <Check className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                            <span className="min-w-0 truncate">{value.name}</span>
                          </div>
                        )}

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <label className="flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 shadow-sm transition-colors hover:bg-[#f4f7fb]">
                            <Upload className="h-3.5 w-3.5 text-[#70809a]"/>
                            {value ? "Replace" : "Upload"}
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={e=>void doc(item.key,e.target.files?.[0])}
                            />
                          </label>

                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 bg-white text-[11px] font-semibold shadow-sm"
                            onClick={()=>setDocumentCamera(item.key)}
                          >
                            <Camera className="mr-1.5 h-3.5 w-3.5"/>
                            Camera
                          </Button>
                        </div>

                        {value && (
                          <Button
                            type="button"
                            variant="ghost"
                            className="mt-2 h-7 w-full text-[10px] text-red-600 hover:bg-red-50"
                            onClick={()=>setValue(item.key,null)}
                          >
                            <X className="mr-1 h-3 w-3"/>
                            Remove {item.title}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Previous Class Marksheet — Front Only */}
              <div className="rounded-2xl border border-[#e1e8f1] bg-white p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <Label className="text-sm font-bold text-[#071426]">Previous Class Marksheet</Label>
                    <p className="mt-0.5 text-[11px] text-[#70809a]">
                      Sirf front side required hai.
                    </p>
                  </div>
                  <span className="rounded-full border border-[#dce5f0] bg-[#f5f8fc] px-2 py-1 text-[10px] font-bold text-[#52627a]">
                    FRONT ONLY
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-[#071426]">Front Side</div>
                      <div className="mt-0.5 text-[10px] text-[#91a0b5]">Marks / result details side</div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      form.previousMarksheet
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}>
                      {form.previousMarksheet ? "READY" : "PENDING"}
                    </span>
                  </div>

                  {form.previousMarksheet && (
                    <div className="mt-3 flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[10px] font-semibold text-emerald-700">
                      <Check className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                      <span className="min-w-0 truncate">{form.previousMarksheet.name}</span>
                    </div>
                  )}

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label className="flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 shadow-sm transition-colors hover:bg-[#f4f7fb]">
                      <Upload className="h-3.5 w-3.5 text-[#70809a]"/>
                      {form.previousMarksheet ? "Replace" : "Upload"}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={e=>void doc("previousMarksheet",e.target.files?.[0])}
                      />
                    </label>

                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 bg-white text-[11px] font-semibold shadow-sm"
                      onClick={()=>setDocumentCamera("previousMarksheet")}
                    >
                      <Camera className="mr-1.5 h-3.5 w-3.5"/>
                      Camera
                    </Button>
                  </div>

                  {form.previousMarksheet && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-2 h-7 w-full text-[10px] text-red-600 hover:bg-red-50"
                      onClick={()=>setValue("previousMarksheet",null)}
                    >
                      <X className="mr-1 h-3 w-3"/>
                      Remove Marksheet
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[11px] leading-5 text-[#52627a]">
              <span className="font-bold">Tip:</span> Camera use karte waqt document ko seedha rakhein, glare avoid karein aur poora card/page frame ke andar rakhein.
            </div>
          </CardContent>
        </Card>

        <div className="rounded-[20px] border border-[#dfe6f0] bg-white p-4 text-[#071426] shadow-[0_6px_20px_rgba(15,23,42,0.05)] md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-bold text-[#071426]">Ready to submit?</div>
              <p className="mt-1 max-w-xl text-xs leading-5 text-[#70809a]">
                Please review the details once before submitting. After submission, the institute can review your application and contact you for the next step.
              </p>
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2">
              <Button type="button" variant="outline" className="h-10 px-5" onClick={()=>window.close()}>
                Close
              </Button>
              <Button
                type="button"
                disabled={submitting}
                onClick={()=>void submitApplication()}
                className="h-10 bg-[#001a4d] px-5 font-semibold text-white shadow-sm hover:bg-[#00266f] disabled:opacity-60"
              >
                {submitting
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Submitting...</>
                  : "Submit Admission Application"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <CameraCapture
        open={documentCamera !== null}
        onClose={()=>setDocumentCamera(null)}
        onCapture={captureDocument}
      />
    </div>
  </div>;
}
