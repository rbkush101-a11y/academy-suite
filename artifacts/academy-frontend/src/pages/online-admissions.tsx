import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Copy,
  Eye,
  FileCheck2,
  Filter,
  GraduationCap,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type OnlineStatus =
  | "submitted"
  | "under_review"
  | "correction_required"
  | "approved"
  | "rejected"
  | "converted";

type AdmissionRow = {
  id: string;
  applicationNumber: string;
  status: OnlineStatus;
  studentName: string;
  name?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  className?: string;
  board?: string;
  previousPercentage?: string;
  academicYear?: string;
  courseId?: string;
  courseName?: string;
  batchId?: string;
  batchName?: string;
  parentName?: string;
  reviewNote?: string;
  convertedStudentId?: string;
  createdAt?: string;
  updatedAt?: string;
};

type AdmissionDetail = AdmissionRow & {
  genderOther?: string;
  bloodGroup?: string;
  schoolName?: string;
  photoDataUrl?: string;
  section?: string;
  boardOther?: string;
  lastClassPercentage?: string;
  lastClassMarks?: string;
  motherName?: string;
  motherOccupation?: string;
  motherPhone?: string;
  motherPhoneCode?: string;
  motherWhatsapp?: string;
  motherWhatsappCode?: string;
  fatherName?: string;
  fatherOccupation?: string;
  fatherPhone?: string;
  fatherPhoneCode?: string;
  fatherWhatsapp?: string;
  fatherWhatsappCode?: string;
  emergencyPhone?: string;
  emergencyPhoneCode?: string;
  correspondenceAddress?: string;
  correspondenceState?: string;
  correspondenceDistrict?: string;
  correspondencePin?: string;
  aadhaarFront?: { name: string; mimeType: string; dataUrl: string } | null;
  aadhaarBack?: { name: string; mimeType: string; dataUrl: string } | null;
  previousMarksheet?: { name: string; mimeType: string; dataUrl: string } | null;
  reviewedAt?: string;
  convertedAt?: string;
};

const STATUS_META: Record<OnlineStatus, { label: string; className: string; icon: any }> = {
  submitted: { label: "Submitted", className: "border-orange-200 bg-orange-50 text-orange-700", icon: Clock3 },
  under_review: { label: "Under Review", className: "border-blue-200 bg-blue-50 text-blue-700", icon: Search },
  correction_required: { label: "Correction Required", className: "border-amber-200 bg-amber-50 text-amber-700", icon: RefreshCw },
  approved: { label: "Approved", className: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  rejected: { label: "Rejected", className: "border-red-200 bg-red-50 text-red-700", icon: XCircle },
  converted: { label: "Student Created", className: "border-violet-200 bg-violet-50 text-violet-700", icon: UserPlus },
};

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = localStorage.getItem("coach_sutra_token");
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || "Request failed.");
  return body as T;
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function relativeDate(value?: string) {
  if (!value) return "";
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "";
  const days = Math.floor((Date.now() - time) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? "s" : ""} ago`;
}

function fullPhone(code?: string, number?: string) {
  return number ? `${code || ""}${number}` : "—";
}

function SummaryCard({ value, label, icon: Icon, className }: any) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 ${className}`}>
          <Icon className="h-4 w-4" strokeWidth={2.1} />
        </span>
        <div className="text-2xl font-black leading-none text-slate-950">{value}</div>
      </div>
      <div className="mt-3 text-sm font-bold text-slate-800">{label}</div>
      <div className="mt-1 text-xs text-slate-500">Live application count</div>
    </div>
  );
}

function StatusBadge({ status }: { status: OnlineStatus }) {
  const meta = STATUS_META[status] || STATUS_META.submitted;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${meta.className}`}>
      <Icon className="h-3.5 w-3.5" /> {meta.label}
    </span>
  );
}

function DocumentLink({ label, value }: { label: string; value?: { name: string; mimeType: string; dataUrl: string } | null }) {
  if (!value?.dataUrl) return <div className="rounded-xl border border-dashed p-3 text-xs text-slate-400">{label}: not uploaded</div>;
  return (
    <a href={value.dataUrl} download={value.name} className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
      <span className="truncate"><FileCheck2 className="mr-2 inline h-4 w-4" />{label}: {value.name}</span>
      <span className="ml-3 shrink-0">Open</span>
    </a>
  );
}

export default function OnlineAdmissions() {
  const [, setLocation] = useLocation();
  const [rows, setRows] = useState<AdmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [batch, setBatch] = useState("all");
  const [publicPath, setPublicPath] = useState("");
  const [selected, setSelected] = useState<AdmissionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewNote, setReviewNote] = useState("");

  const publicLink = publicPath ? `${window.location.origin}${publicPath}` : "";

  async function loadRows(silent = false) {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      const [applications, link] = await Promise.all([
        api<AdmissionRow[]>("/online-admissions"),
        api<{ path: string }>("/online-admissions/public-link"),
      ]);
      setRows(Array.isArray(applications) ? applications : []);
      setPublicPath(link.path || "");
    } catch (error: any) {
      toast.error(error?.message || "Unable to load online admissions.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadRows();
  }, []);

  const batches = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((row) => {
      if (row.batchId && row.batchName) map.set(row.batchId, row.batchName);
    });
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const counts = useMemo(() => {
    const result = {
      total: rows.length,
      submitted: 0,
      under_review: 0,
      approved: 0,
      rejected: 0,
      converted: 0,
    };
    rows.forEach((row) => {
      if (row.status === "submitted") result.submitted++;
      if (row.status === "under_review" || row.status === "correction_required") result.under_review++;
      if (row.status === "approved") result.approved++;
      if (row.status === "rejected") result.rejected++;
      if (row.status === "converted") result.converted++;
    });
    return result;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        !q ||
        [row.applicationNumber, row.studentName, row.email, row.phone, row.courseName, row.batchName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      const matchesStatus = status === "all" || row.status === status || (status === "under_review" && row.status === "correction_required");
      const matchesBatch = batch === "all" || row.batchId === batch;
      return matchesSearch && matchesStatus && matchesBatch;
    });
  }, [rows, search, status, batch]);

  async function openApplication(row: AdmissionRow) {
    try {
      setDetailLoading(true);
      setSelected({ ...row });
      const data = await api<AdmissionDetail>(`/online-admissions/${row.id}`);
      setSelected(data);
      setReviewNote(data.reviewNote || "");
    } catch (error: any) {
      setSelected(null);
      toast.error(error?.message || "Unable to load application.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function updateStatus(nextStatus: OnlineStatus) {
    if (!selected) return;
    try {
      setActionLoading(true);
      const updated = await api<AdmissionDetail>(`/online-admissions/${selected.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus, reviewNote }),
      });
      setSelected(updated);
      setRows((old) => old.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));
      toast.success(`Application marked ${STATUS_META[nextStatus].label}.`);
    } catch (error: any) {
      toast.error(error?.message || "Unable to update application.");
    } finally {
      setActionLoading(false);
    }
  }

  async function convertToStudent() {
    if (!selected) return;
    try {
      setActionLoading(true);
      const result = await api<{ success: boolean; student?: { id: string; name: string; enrollmentNo: string } }>(
        `/online-admissions/${selected.id}/convert-to-student`,
        { method: "POST", body: JSON.stringify({}) },
      );
      const updated = await api<AdmissionDetail>(`/online-admissions/${selected.id}`);
      setSelected(updated);
      setRows((old) => old.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));
      toast.success(result.student?.enrollmentNo ? `Student created: ${result.student.enrollmentNo}` : "Student created successfully.");
    } catch (error: any) {
      toast.error(error?.message || "Unable to create student.");
    } finally {
      setActionLoading(false);
    }
  }

  async function copyLink() {
    if (!publicLink) return;
    try {
      await navigator.clipboard.writeText(publicLink);
      toast.success("Admission link copied.");
    } catch {
      toast.error("Clipboard access is unavailable. Copy the link manually.");
    }
  }

  return (
    <div className="min-h-full overflow-x-hidden bg-[#f3f6fb] p-4 md:p-6">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />
      <div className="mx-auto max-w-[1600px] space-y-5">
        <section className="relative overflow-hidden rounded-[28px] border border-slate-200/70 bg-slate-950 px-5 py-6 text-white shadow-[0_22px_70px_-38px_rgba(15,23,42,0.65)] sm:px-7 lg:px-8">
          <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative grid gap-6 xl:grid-cols-[1.35fr_0.65fr] xl:items-end">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-200">
                <ClipboardCheck className="h-3.5 w-3.5" /> Online Admissions
              </div>

              <h1 className="max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
                Turn every online application into a clear admission decision.
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Review applications, verify documents, approve candidates and convert them into students without losing the admission trail.
              </p>

              <div className="mt-6 flex flex-wrap gap-2.5">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100">
                  <ClipboardList className="h-3.5 w-3.5 text-cyan-300" />
                  {counts.total} total applications
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100">
                  <Search className="h-3.5 w-3.5 text-cyan-300" />
                  {counts.under_review} in review
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100">
                  <UserPlus className="h-3.5 w-3.5 text-cyan-300" />
                  {counts.converted} students created
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Approved</div>
                  <CheckCircle2 className="h-4 w-4 text-cyan-300" />
                </div>
                <div className="mt-3 text-3xl font-black text-white">{counts.approved}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Students Created</div>
                  <UserPlus className="h-4 w-4 text-cyan-300" />
                </div>
                <div className="mt-3 text-3xl font-black text-white">{counts.converted}</div>
              </div>
            </div>
          </div>

          <div className="relative mt-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-cyan-300" aria-hidden="true">
                <i className="bi bi-globe2 text-[23px] leading-none" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white">Public Admission Form</div>
                <div className="mt-1 truncate text-xs text-slate-400">{publicLink || "Loading link..."}</div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void copyLink()}
                disabled={!publicLink}
                className="border border-white/10 bg-white/10 text-white hover:bg-white/15"
              >
                <ClipboardList className="mr-2 h-4 w-4" /> Copy Link
              </Button>
              <Button
                type="button"
                onClick={() => publicLink && window.open(publicLink, "_blank", "noopener,noreferrer")}
                disabled={!publicLink}
                className="bg-white text-slate-950 hover:bg-slate-100"
              >
                <Eye className="mr-2 h-4 w-4" /> Preview
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadRows(true)}
                disabled={refreshing}
                className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <SummaryCard value={counts.total} label="Total" icon={ClipboardList} className="text-sky-600" />
          <SummaryCard value={counts.submitted} label="Submitted" icon={Clock3} className="text-orange-500" />
          <SummaryCard value={counts.under_review} label="Review" icon={Search} className="text-sky-500" />
          <SummaryCard value={counts.approved} label="Approved" icon={CheckCircle2} className="text-emerald-500" />
          <SummaryCard value={counts.rejected} label="Rejected" icon={XCircle} className="text-red-500" />
          <SummaryCard value={counts.converted} label="Students Created" icon={UserPlus} className="text-violet-600" />
        </div>

        <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Application workspace</p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">Admission applications</h2>
                <p className="mt-1 text-sm text-slate-500">{filtered.length} of {rows.length} applications visible</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_190px_220px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search applicant, application #, phone..." className="h-11 border-slate-200 pl-10" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-11"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="converted">Student Created</SelectItem>
              </SelectContent>
            </Select>
            <Select value={batch} onValueChange={setBatch}>
              <SelectTrigger className="h-11"><SelectValue placeholder="All Batches" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                {batches.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" className="h-11" onClick={() => { setSearch(""); setStatus("all"); setBatch("all"); }}>
              <Filter className="mr-2 h-4 w-4" /> Clear
            </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                  <th className="px-4 py-4">Application</th>
                  <th className="px-4 py-4">Applicant</th>
                  <th className="px-4 py-4">Course / Batch</th>
                  <th className="px-4 py-4">Previous %</th>
                  <th className="px-4 py-4">Applied</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-5 py-16 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading applications...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-16 text-center"><ClipboardCheck className="mx-auto h-9 w-9 text-slate-300" /><div className="mt-3 font-semibold text-slate-700">No applications found</div><div className="mt-1 text-sm text-slate-400">Share the public form link or clear your filters.</div></td></tr>
                ) : filtered.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                    <td className="px-4 py-4"><span className="inline-flex rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">{row.applicationNumber}</span></td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">{(row.studentName || "?").trim().charAt(0).toUpperCase()}</div>
                        <div className="min-w-0"><div className="font-semibold text-slate-800">{row.studentName || "—"}</div><div className="mt-0.5 text-xs text-slate-400">{row.phone || row.email || "No contact"}</div></div>
                      </div>
                    </td>
                    <td className="px-4 py-4"><div className="text-sm font-semibold text-slate-700">{row.courseName || "—"}</div><div className="mt-1 text-xs text-slate-400">{row.batchName || "—"}</div></td>
                    <td className="px-4 py-4 text-sm text-slate-600">{row.previousPercentage ? `${row.previousPercentage}%` : "—"}</td>
                    <td className="px-4 py-4"><div className="text-sm font-medium text-slate-700">{formatDate(row.createdAt)}</div><div className="mt-0.5 text-xs text-slate-400">{relativeDate(row.createdAt)}</div></td>
                    <td className="px-4 py-4"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-4 text-center"><Button type="button" variant="outline" size="icon" onClick={() => void openApplication(row)} className="h-9 w-9 border-slate-200 text-slate-700 hover:bg-slate-100"><Eye className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) { setSelected(null); setReviewNote(""); } }}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle className="text-xl font-black text-slate-950">Application Review</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  {selected.photoDataUrl ? <img src={selected.photoDataUrl} alt={selected.studentName} className="h-14 w-14 rounded-xl object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-950 text-xl font-bold text-white">{(selected.studentName || "?").charAt(0).toUpperCase()}</div>}
                  <div><div className="font-bold text-slate-900">{selected.studentName}</div><div className="mt-1 text-sm text-slate-500">{selected.applicationNumber}</div></div>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              {detailLoading ? (
                <div className="py-12 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading full application...</div>
              ) : (
                <>
                  <div className="grid gap-4 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div><div className="text-[11px] font-semibold uppercase text-slate-400">Course</div><div className="mt-1 text-sm font-semibold">{selected.courseName || "—"}</div></div>
                    <div><div className="text-[11px] font-semibold uppercase text-slate-400">Batch</div><div className="mt-1 text-sm font-semibold">{selected.batchName || "—"}</div></div>
                    <div><div className="text-[11px] font-semibold uppercase text-slate-400">Academic Year</div><div className="mt-1 text-sm font-semibold">{selected.academicYear || "—"}</div></div>
                    <div><div className="text-[11px] font-semibold uppercase text-slate-400">Date of Birth</div><div className="mt-1 text-sm">{selected.dateOfBirth || "—"}</div></div>
                    <div><div className="text-[11px] font-semibold uppercase text-slate-400">Gender</div><div className="mt-1 text-sm capitalize">{selected.gender === "other" ? selected.genderOther || "Other" : selected.gender || "—"}</div></div>
                    <div><div className="text-[11px] font-semibold uppercase text-slate-400">Previous %</div><div className="mt-1 text-sm">{selected.lastClassPercentage ? `${selected.lastClassPercentage}%` : "—"}</div></div>
                    <div><div className="text-[11px] font-semibold uppercase text-slate-400">School</div><div className="mt-1 text-sm">{selected.schoolName || "—"}</div></div>
                    <div><div className="text-[11px] font-semibold uppercase text-slate-400">Class / Board</div><div className="mt-1 text-sm">{[selected.className, selected.board === "Other" ? selected.boardOther : selected.board].filter(Boolean).join(" • ") || "—"}</div></div>
                    <div><div className="text-[11px] font-semibold uppercase text-slate-400">Applied</div><div className="mt-1 text-sm">{formatDate(selected.createdAt)}</div></div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border p-4">
                      <div className="mb-3 text-sm font-bold text-slate-800">Parent / Contact</div>
                      <div className="space-y-2 text-sm text-slate-600">
                        <div><strong>Father:</strong> {selected.fatherName || "—"} • {fullPhone(selected.fatherPhoneCode, selected.fatherPhone)}</div>
                        <div><strong>Mother:</strong> {selected.motherName || "—"} • {fullPhone(selected.motherPhoneCode, selected.motherPhone)}</div>
                        <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-700" /> Emergency: {fullPhone(selected.emergencyPhoneCode, selected.emergencyPhone)}</div>
                        <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-700" /> {selected.email || "No email"}</div>
                      </div>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <div className="mb-3 text-sm font-bold text-slate-800">Address</div>
                      <div className="text-sm leading-6 text-slate-600">{selected.correspondenceAddress || "—"}<br />{[selected.correspondenceDistrict, selected.correspondenceState, selected.correspondencePin].filter(Boolean).join(", ")}</div>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <DocumentLink label="Aadhaar Front" value={selected.aadhaarFront} />
                    <DocumentLink label="Aadhaar Back" value={selected.aadhaarBack} />
                    <DocumentLink label="Previous Marksheet" value={selected.previousMarksheet} />
                  </div>

                  {selected.status !== "converted" && (
                    <div className="rounded-2xl border bg-slate-50 p-4">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Review Note</label>
                      <Textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Internal review note or correction message..." className="mt-2 min-h-24 bg-white" />
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button variant="outline" disabled={actionLoading} className="border-slate-200 text-slate-700 hover:bg-slate-100" onClick={() => void updateStatus("under_review")}>Under Review</Button>
                        <Button variant="outline" disabled={actionLoading} className="border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => void updateStatus("correction_required")}>Request Correction</Button>
                        <Button variant="outline" disabled={actionLoading} className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => void updateStatus("rejected")}>Reject</Button>
                        <Button disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700" onClick={() => void updateStatus("approved")}><CheckCircle2 className="mr-2 h-4 w-4" />Approve</Button>
                      </div>
                    </div>
                  )}

                  {selected.status === "approved" && (
                    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div><div className="font-bold text-violet-900">Application approved</div><div className="mt-1 text-sm text-violet-700">Create the student profile and assign the selected course + batch.</div></div>
                        <Button disabled={actionLoading} className="bg-violet-700 hover:bg-violet-800" onClick={() => void convertToStudent()}>
                          {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />} Approve & Create Student
                        </Button>
                      </div>
                    </div>
                  )}

                  {selected.status === "converted" && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div><div className="font-bold text-emerald-900">Student profile created</div><div className="mt-1 text-sm text-emerald-700">This application is locked to prevent duplicate student creation.</div></div>
                        <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={() => setLocation("/students")}><GraduationCap className="mr-2 h-4 w-4" />Open Students</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
