import { useMemo, useState } from "react";
import { useListAdmissions, useListBatches } from "@workspace/api-client-react";
import {
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Eye,
  Filter,
  Mail,
  Phone,
  Search,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const STATUS_META = {
  pending: { label: "Pending", icon: Clock3, className: "bg-orange-50 text-orange-600 border-orange-200" },
  review: { label: "Under Review", icon: Search, className: "bg-blue-50 text-blue-600 border-blue-200" },
  approved: { label: "Approved", icon: CheckCircle2, className: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  rejected: { label: "Rejected", icon: XCircle, className: "bg-red-50 text-red-600 border-red-200" },
} as const;

type OnlineStatus = keyof typeof STATUS_META;

type AdmissionRow = {
  id: string;
  studentName?: string;
  email?: string;
  phone?: string;
  className?: string;
  board?: string;
  courseInterest?: string;
  status?: string;
  createdAt?: string;
  enquiryDate?: string;
  remarks?: string;
  parentName?: string;
  batchId?: string;
  batchName?: string;
  previousPercentage?: number | string;
  applicationNumber?: string;
};

type BatchRow = {
  id: string;
  name: string;
  status?: string;
};

function getOnlineStatus(status?: string): OnlineStatus {
  switch (status) {
    case "enrolled":
      return "approved";
    case "dropped":
      return "rejected";
    case "contacted":
    case "visited":
      return "review";
    case "new":
    default:
      return "pending";
  }
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function relativeDate(value?: string) {
  if (!value) return "";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? "s" : ""} ago`;
}

function getApplicationNumber(row: AdmissionRow, index: number) {
  if (row.applicationNumber) return row.applicationNumber;
  const year = row.createdAt ? new Date(row.createdAt).getFullYear() : new Date().getFullYear();
  return `APP-${year}-${String(index + 1).padStart(5, "0")}`;
}

function getBatchName(row: AdmissionRow, batches: BatchRow[]) {
  if (row.batchName) return row.batchName;
  if (row.batchId) return batches.find((batch) => batch.id === row.batchId)?.name ?? "—";
  return row.courseInterest || row.className || "—";
}

function SummaryCard({
  value,
  label,
  icon: Icon,
  tone,
}: {
  value: number;
  label: string;
  icon: any;
  tone: "blue" | "orange" | "cyan" | "green" | "red";
}) {
  const tones = {
    blue: "text-blue-600",
    orange: "text-orange-500",
    cyan: "text-sky-500",
    green: "text-emerald-500",
    red: "text-red-500",
  };
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className={`text-[30px] font-bold leading-none ${tones[tone]}`}>{value}</div>
      <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</div>
      <Icon className={`absolute bottom-5 right-4 h-7 w-7 ${tones[tone]}`} strokeWidth={2.2} />
    </div>
  );
}

export default function OnlineAdmissions() {
  const { data: admissionsData, isLoading } = useListAdmissions();
  const { data: batchesData } = useListBatches();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [batch, setBatch] = useState("all");
  const [filtersApplied, setFiltersApplied] = useState(true);
  const [selected, setSelected] = useState<AdmissionRow | null>(null);

  const admissions = useMemo(() => {
    const source = Array.isArray(admissionsData) ? admissionsData : [];
    return [...(source as AdmissionRow[])].sort((a, b) => {
      const ad = new Date(a.createdAt || a.enquiryDate || 0).getTime();
      const bd = new Date(b.createdAt || b.enquiryDate || 0).getTime();
      return bd - ad;
    });
  }, [admissionsData]);

  const batches = useMemo(() => {
    const source = Array.isArray(batchesData) ? batchesData : [];
    return source as BatchRow[];
  }, [batchesData]);

  const counts = useMemo(() => {
    const result = { pending: 0, review: 0, approved: 0, rejected: 0 };
    admissions.forEach((row) => result[getOnlineStatus(row.status)]++);
    return result;
  }, [admissions]);

  const filtered = useMemo(() => {
    if (!filtersApplied) return admissions;
    const q = search.trim().toLowerCase();
    return admissions.filter((row) => {
      const onlineStatus = getOnlineStatus(row.status);
      const batchName = getBatchName(row, batches);
      const matchesSearch = !q || [row.studentName, row.email, row.phone, batchName, row.applicationNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
      const matchesStatus = status === "all" || onlineStatus === status;
      const matchesBatch = batch === "all" || row.batchId === batch || batchName === batch;
      return matchesSearch && matchesStatus && matchesBatch;
    });
  }, [admissions, batches, batch, filtersApplied, search, status]);

  // Public admission form URL — never point this to the admin Students page.
  // window.location.origin automatically uses the deployed domain (e.g. parikshadrishti.com).
  const publicLink = `${window.location.origin}/online-admission-form`;

  const previewAdmissionForm = () => {
    window.open(`${window.location.origin}/online-admission-form`, "_blank", "noopener,noreferrer");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLink);
    } catch {
      // Clipboard can be blocked on non-secure/local environments.
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setBatch("all");
    setFiltersApplied(true);
  };

  return (
    <div className="min-h-full overflow-x-hidden bg-[#f3f6fb] p-4 md:p-6">
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
      />
      <div className="mx-auto max-w-[1500px] space-y-5">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-blue-700">Online Admissions</h1>
          <p className="mt-1 text-sm text-slate-500">Manage student applications and enrollment pipeline</p>
        </div>

        <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-5 text-white shadow-sm">
          <div className="absolute -right-8 -top-16 h-48 w-48 rounded-full bg-white/5" />
          <div className="absolute right-10 -bottom-24 h-48 w-48 rounded-full bg-white/5" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/10 shadow-inner"
                aria-hidden="true"
              >
                <i className="bi bi-globe2 text-[26px] leading-none text-white" />
              </div>
              <div className="min-w-0">
                <div className="font-bold">Public Admission Form</div>
                <div className="mt-1 truncate text-xs text-blue-100">{publicLink}</div>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                onClick={copyLink}
                className="border border-white/25 bg-white/10 text-white hover:bg-white/20"
              >
                <ClipboardList className="mr-2 h-4 w-4" /> Copy Link
              </Button>
              <Button
                type="button"
                onClick={previewAdmissionForm}
                className="border border-white/25 bg-white/10 text-white hover:bg-white/20"
              >
                <Eye className="mr-2 h-4 w-4" /> Preview
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <SummaryCard value={admissions.length} label="Total" icon={Users} tone="blue" />
          <SummaryCard value={counts.pending} label="Pending" icon={Clock3} tone="orange" />
          <SummaryCard value={counts.review} label="Under Review" icon={Search} tone="cyan" />
          <SummaryCard value={counts.approved} label="Approved" icon={Check} tone="green" />
          <SummaryCard value={counts.rejected} label="Rejected" icon={X} tone="red" />
        </div>

        <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search applicant name or email..."
                className="h-11 border-slate-200 pl-10"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-11 w-full lg:w-[145px]"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={batch} onValueChange={setBatch}>
              <SelectTrigger className="h-11 w-full lg:w-[220px]"><SelectValue placeholder="All Batches" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                {batches.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="button" onClick={() => setFiltersApplied(true)} className="h-11 bg-blue-700 px-6 hover:bg-blue-800">
              <Filter className="mr-2 h-4 w-4" /> Filter
            </Button>
            <Button type="button" variant="outline" onClick={clearFilters} className="h-11 px-5">Clear</Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
          <div className="w-full overflow-hidden">
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr className="border-b border-blue-200 bg-blue-50/70 text-left text-xs font-bold uppercase tracking-wide text-blue-700">
                  <th className="w-[10%] px-3 py-4">APP #</th>
                  <th className="w-[20%] px-3 py-4">APPLICANT</th>
                  <th className="w-[12%] px-3 py-4">PHONE</th>
                  <th className="w-[14%] px-3 py-4">FOR BATCH</th>
                  <th className="w-[8%] px-3 py-4">PREV %</th>
                  <th className="w-[12%] px-3 py-4">APPLIED</th>
                  <th className="w-[13%] px-3 py-4">STATUS</th>
                  <th className="w-[7%] px-3 py-4 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="px-5 py-14 text-center text-sm text-slate-500">Loading applications...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-14 text-center text-sm text-slate-500">No applications found.</td></tr>
                ) : filtered.map((row, index) => {
                  const onlineStatus = getOnlineStatus(row.status);
                  const meta = STATUS_META[onlineStatus];
                  const StatusIcon = meta.icon;
                  const applied = row.createdAt || row.enquiryDate;
                  const appNumber = getApplicationNumber(row, admissions.indexOf(row));
                  return (
                    <tr key={row.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                      <td className="px-3 py-4 align-middle">
                        <span className="inline-flex rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">{appNumber}</span>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-sm font-bold text-white">
                            {(row.studentName || "?").trim().charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800">{row.studentName || "—"}</div>
                            <div className="mt-0.5 text-xs text-slate-400">{row.email || "No email"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="truncate px-3 py-4 text-sm text-slate-700">{row.phone || "—"}</td>
                      <td className="px-3 py-4">
                        <span className="inline-flex max-w-[150px] rounded-lg bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700">{getBatchName(row, batches)}</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">{row.previousPercentage !== undefined && row.previousPercentage !== "" ? `${row.previousPercentage}%` : "—"}</td>
                      <td className="px-3 py-4">
                        <div className="text-sm font-medium text-slate-700">{formatDate(applied)}</div>
                        <div className="mt-0.5 text-xs text-slate-400">{relativeDate(applied)}</div>
                      </td>
                      <td className="px-3 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${meta.className}`}>
                          <StatusIcon className="h-3.5 w-3.5" /> {meta.label}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <Button type="button" variant="outline" size="icon" onClick={() => setSelected(row)} className="h-9 w-9 border-blue-100 text-blue-600 hover:bg-blue-50">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-xs text-slate-400">Showing {filtered.length} of {admissions.length} applications</div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-blue-700">Application Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              <div className="flex items-center gap-4 rounded-xl bg-blue-50 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-700 text-lg font-bold text-white">
                  {(selected.studentName || "?").trim().charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-slate-800">{selected.studentName}</div>
                  <div className="text-sm text-slate-500">{getApplicationNumber(selected, admissions.indexOf(selected))}</div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><div className="text-xs font-semibold uppercase text-slate-400">Phone</div><div className="mt-1 flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-blue-600" />{selected.phone || "—"}</div></div>
                <div><div className="text-xs font-semibold uppercase text-slate-400">Email</div><div className="mt-1 flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-blue-600" />{selected.email || "—"}</div></div>
                <div><div className="text-xs font-semibold uppercase text-slate-400">Batch</div><div className="mt-1 text-sm font-medium">{getBatchName(selected, batches)}</div></div>
                <div><div className="text-xs font-semibold uppercase text-slate-400">Applied</div><div className="mt-1 text-sm font-medium">{formatDate(selected.createdAt || selected.enquiryDate)}</div></div>
                <div><div className="text-xs font-semibold uppercase text-slate-400">Previous Percentage</div><div className="mt-1 text-sm font-medium">{selected.previousPercentage !== undefined && selected.previousPercentage !== "" ? `${selected.previousPercentage}%` : "—"}</div></div>
                <div><div className="text-xs font-semibold uppercase text-slate-400">Parent / Guardian</div><div className="mt-1 text-sm font-medium">{selected.parentName || "—"}</div></div>
              </div>
              {selected.remarks ? <div><div className="text-xs font-semibold uppercase text-slate-400">Remarks</div><div className="mt-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{selected.remarks}</div></div> : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
