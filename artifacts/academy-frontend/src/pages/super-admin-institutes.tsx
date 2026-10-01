import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity, ArrowLeft, ArrowRight, Building2, Check, ChevronDown, ExternalLink,
  FilePlus2, Filter, LoaderCircle, Mail, Plus, RefreshCw, Search, ShieldCheck,
  ShieldOff, Archive, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type InstituteStatus = "pending" | "active" | "trial" | "suspended" | "expired" | "cancelled" | "archived";
type InstituteRow = {
  id: string; instituteName: string; legalName?: string; instituteType?: string; ownerName: string; email: string; phone: string;
  city?: string; state?: string; country?: string; domain?: string; plan?: string; status: InstituteStatus; expiryDate?: string;
  createdAt?: string; updatedAt?: string; branchCount: number; studentCount: number; lastActivity?: string | null;
  subscription?: { id?: string; status?: string; endsAt?: string }; currentPlan?: { id?: string; code?: string; name?: string };
};
type InstitutePage = { items: InstituteRow[]; page: number; limit: number; total: number; pages: number };
type Plan = { _id?: string; id?: string; code: string; name: string; status?: string; maxStudents?: number; maxBranches?: number };
type InstituteProfile = Omit<InstituteRow, "branchCount" | "studentCount" | "lastActivity" | "subscription" | "currentPlan"> & {
  ownerEmail: string; ownerPhone: string; legalName: string; address: string; city: string; state: string; country: string; pincode: string; logoDataUrl: string; website: string;
  defaultBranchId?: string | null; academicYear: string; initialAdminId?: string | null; archivedAt?: string | null; maxStudents?: number;
};
type InstituteDetail = {
  institute: InstituteProfile;
  overview: {
    branches: number; students: number; teachers: number; staff: number; parents: number; users: number; activeUsers: number; admins: number;
    courses: number; currentSubscription?: Record<string, any> | null;
    usage: Record<string, { used: number; limit: number | null }>;
  };
  sections: Record<string, any>;
};
type PlanPayload = Plan[] | { items?: Plan[] };

const token = () => localStorage.getItem("coach_sutra_token");
const role = () => localStorage.getItem("coach_sutra_user_role") ?? "";

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1/platform${path}`, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(result.error || `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function getPlans(): Promise<Plan[]> {
  const result = await api<PlanPayload>("/plans");
  return Array.isArray(result) ? result : result.items ?? [];
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return "No activity recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function humanize(value: string) {
  return value.replaceAll(/([A-Z])/g, " $1").replaceAll(/[_-]/g, " ").replace(/^./, (letter) => letter.toUpperCase());
}

function showValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return new Intl.NumberFormat().format(value);
  if (typeof value === "string" && /^\d{4}-\d\d-\d\d/.test(value)) return formatDateTime(value);
  if (typeof value === "object") {
    if (Array.isArray(value)) return value.length ? value.map(showValue).join(", ") : "—";
    const object = value as Record<string, unknown>;
    return String(object.name ?? object.code ?? object.email ?? object._id ?? object.id ?? "Details available");
  }
  return String(value);
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone = normalized === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : normalized === "trial" || normalized === "trialing" ? "border-blue-200 bg-blue-50 text-blue-800"
      : normalized === "suspended" || normalized === "expired" || normalized === "cancelled" ? "border-rose-200 bg-rose-50 text-rose-800"
        : normalized === "archived" ? "border-slate-300 bg-slate-100 text-slate-700" : "border-amber-200 bg-amber-50 text-amber-800";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${tone}`}>{status || "unknown"}</span>;
}

function PageShell({ title, children, trailing }: { title: string; children: ReactNode; trailing?: ReactNode }) {
  return <main className="min-h-screen bg-muted/30 px-4 py-6 sm:px-6 lg:px-10">
    <div className="mx-auto max-w-[1500px]">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><Link href="/super-admin" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" />Platform console</Link><h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1></div>
        <div className="flex flex-wrap items-center gap-2"><Link href="/super-admin/institutes" className="rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted">Institute directory</Link>{trailing}</div>
      </header>
      {children}
    </div>
  </main>;
}

function ErrorPanel({ error, retry }: { error: unknown; retry: () => void }) {
  return <Card className="border-destructive/40"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-5"><div className="text-sm text-destructive">{error instanceof Error ? error.message : "Unable to load platform data."}</div><Button variant="outline" onClick={retry}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button></CardContent></Card>;
}

function LoadingRows() {
  return <div role="status" aria-label="Loading institutes" className="space-y-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-14 animate-pulse rounded-lg bg-muted" />)}</div>;
}

const statusOptions: InstituteStatus[] = ["pending", "active", "trial", "suspended", "expired", "cancelled", "archived"];

export function SuperAdminInstituteList() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [subscription, setSubscription] = useState("all");
  const [plan, setPlan] = useState("all");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [direction, setDirection] = useState("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const plans = useQuery({ queryKey: ["platform", "institute-management", "plans"], queryFn: getPlans });
  const query = useQuery({
    queryKey: ["platform", "institute-management", search, status, subscription, plan, createdFrom, createdTo, sort, direction, page, limit],
    queryFn: () => {
      const params = new URLSearchParams({ search, status, subscription, sort, direction, page: String(page), limit: String(limit) });
      if (plan !== "all") params.set("plan", plan);
      if (createdFrom) params.set("createdFrom", createdFrom);
      if (createdTo) params.set("createdTo", createdTo);
      return api<InstitutePage>(`/institutes?${params.toString()}`);
    },
  });
  const pageData = query.data;
  const planItems = plans.data ?? [];

  return <PageShell title="Institute management" trailing={<Button onClick={() => setLocation("/super-admin/institutes/new")}><Plus className="mr-2 h-4 w-4" />Create institute</Button>}>
    <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card><CardContent className="flex items-center gap-3 p-4"><Building2 className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Matching institutes</p><p className="text-xl font-semibold">{pageData?.total ?? "—"}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 p-4"><Users className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">On this page</p><p className="text-xl font-semibold">{pageData?.items?.length ?? "—"}</p></div></CardContent></Card>
      <Card className="sm:col-span-2"><CardContent className="flex items-start gap-3 p-4"><Filter className="mt-0.5 h-5 w-5 text-primary" /><p className="text-sm text-muted-foreground">Search and filters run on the platform database. Use the headers to sort by institute, owner, status, branch count, student count, creation date, or last activity.</p></CardContent></Card>
    </div>

    <Card className="mb-4"><CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
      <label className="relative sm:col-span-2 xl:col-span-1"><span className="sr-only">Search institutes</span><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search institute, owner, email…" /></label>
      <label className="space-y-1 text-xs text-muted-foreground"><span>Status</span><select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="all">All statuses</option>{statusOptions.map((value) => <option key={value} value={value}>{value.toUpperCase()}</option>)}</select></label>
      <label className="space-y-1 text-xs text-muted-foreground"><span>Subscription</span><select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={subscription} onChange={(event) => { setSubscription(event.target.value); setPage(1); }}><option value="all">All subscriptions</option><option value="active">Active</option><option value="trialing">Trial</option><option value="past_due">Past due</option><option value="paused">Paused</option><option value="expired">Expired</option><option value="canceled">Cancelled</option><option value="none">No subscription</option></select></label>
      <label className="space-y-1 text-xs text-muted-foreground"><span>Plan</span><select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={plan} onChange={(event) => { setPlan(event.target.value); setPage(1); }}><option value="all">All plans</option>{planItems.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
      <label className="space-y-1 text-xs text-muted-foreground"><span>Created from</span><Input type="date" value={createdFrom} max={createdTo || undefined} onChange={(event) => { setCreatedFrom(event.target.value); setPage(1); }} /></label>
      <label className="space-y-1 text-xs text-muted-foreground"><span>Created through</span><Input type="date" value={createdTo} min={createdFrom || undefined} onChange={(event) => { setCreatedTo(event.target.value); setPage(1); }} /></label>
      <label className="space-y-1 text-xs text-muted-foreground"><span>Sort by</span><select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={sort} onChange={(event) => setSort(event.target.value)}>{[["createdAt", "Created date"], ["instituteName", "Institute name"], ["ownerName", "Owner name"], ["status", "Status"], ["branchCount", "Branch count"], ["studentCount", "Student count"], ["lastActivity", "Last activity"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="space-y-1 text-xs text-muted-foreground"><span>Direction / rows</span><div className="flex gap-2"><select aria-label="Sort direction" className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={direction} onChange={(event) => setDirection(event.target.value)}><option value="desc">Descending</option><option value="asc">Ascending</option></select><select aria-label="Rows per page" className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground" value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select></div></label>
    </CardContent></Card>

    {query.isPending ? <LoadingRows /> : query.error ? <ErrorPanel error={query.error} retry={() => void query.refetch()} /> : !pageData?.items?.length ? (
      <Card><CardContent className="flex flex-col items-center gap-2 p-10 text-center"><Building2 className="h-8 w-8 text-muted-foreground" /><p className="font-medium">No institutes found</p><p className="text-sm text-muted-foreground">Try changing your filters or create an institute to begin.</p><Button variant="outline" onClick={() => setLocation("/super-admin/institutes/new")}>Create institute</Button></CardContent></Card>
    ) : <Card>
      <div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-left text-sm">
        <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground"><tr>{[
          ["Institute", "instituteName"], ["Owner", "ownerName"], ["Status", "status"], ["Subscription", "subscription"], ["Plan", "plan"],
          ["Branches", "branchCount"], ["Students", "studentCount"], ["Created", "createdAt"], ["Last activity", "lastActivity"], ["", ""],
        ].map(([label, key]) => <th key={key || label} className="whitespace-nowrap px-4 py-3 font-semibold">{key ? <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => { if (sort === key) setDirection(direction === "asc" ? "desc" : "asc"); else { setSort(key); setDirection("asc"); } }}>{label}<ChevronDown className={`h-3 w-3 ${sort === key && direction === "asc" ? "rotate-180" : ""}`} /></button> : label}</th>)}</tr></thead>
        <tbody className="divide-y">{pageData.items.map((item) => <tr key={item.id} className="hover:bg-muted/20">
          <td className="px-4 py-3"><Link href={`/super-admin/institutes/${item.id}`} className="font-semibold text-primary hover:underline">{item.instituteName}</Link><p className="mt-1 text-xs text-muted-foreground">{[item.city, item.state].filter(Boolean).join(", ") || item.domain || "Institute profile"}</p></td>
          <td className="px-4 py-3"><p className="font-medium">{item.ownerName}</p><p className="mt-1 text-xs text-muted-foreground">{item.email}</p></td>
          <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
          <td className="px-4 py-3"><span className="capitalize">{(item.subscription?.status ?? "none").replaceAll("_", " ")}</span>{item.subscription?.endsAt && <p className="mt-1 text-xs text-muted-foreground">Ends {formatDate(item.subscription.endsAt)}</p>}</td>
          <td className="px-4 py-3">{item.currentPlan?.name || item.plan || "—"}</td>
          <td className="px-4 py-3 tabular-nums">{new Intl.NumberFormat().format(item.branchCount)}</td>
          <td className="px-4 py-3 tabular-nums">{new Intl.NumberFormat().format(item.studentCount)}</td>
          <td className="px-4 py-3 whitespace-nowrap">{formatDate(item.createdAt)}</td>
          <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(item.lastActivity)}</td>
          <td className="px-4 py-3"><Link href={`/super-admin/institutes/${item.id}`} aria-label={`Open ${item.instituteName}`} className="inline-flex rounded-md border p-2 hover:bg-muted"><ExternalLink className="h-4 w-4" /></Link></td>
        </tr>)}</tbody>
      </table></div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground"><span>Showing {(pageData.page - 1) * pageData.limit + 1}–{Math.min(pageData.page * pageData.limit, pageData.total)} of {pageData.total}</span><div className="flex items-center gap-2"><span>Page {pageData.page} of {Math.max(pageData.pages, 1)}</span><Button size="sm" variant="outline" disabled={pageData.page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ArrowLeft className="mr-1 h-4 w-4" />Previous</Button><Button size="sm" variant="outline" disabled={pageData.page >= pageData.pages} onClick={() => setPage((current) => current + 1)}>Next<ArrowRight className="ml-1 h-4 w-4" /></Button></div></div>
    </Card>}
  </PageShell>;
}

const currentAcademicYear = () => {
  const now = new Date();
  const start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}-${start + 1}`;
};

export function SuperAdminInstituteCreate() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const plans = useQuery({ queryKey: ["platform", "institute-management", "plans"], queryFn: getPlans });
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [logoError, setLogoError] = useState("");
  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => api<{ institute: InstituteProfile; adminPasswordSetupEmailQueued: boolean }>("/institutes", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["platform", "institute-management"] });
      await queryClient.invalidateQueries({ queryKey: ["platform", "dashboard"] });
      setLocation(`/super-admin/institutes/${result.institute.id}?created=1&setup=${result.adminPasswordSetupEmailQueued ? "queued" : "unavailable"}`);
    },
  });
  async function chooseLogo(file?: File) {
    setLogoError("");
    if (!file) { setLogoDataUrl(""); return; }
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type) || file.size > 1_800_000) {
      setLogoError("Choose a PNG, JPEG, WebP, or SVG image smaller than 1.8 MB."); return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(String(reader.result ?? ""));
    reader.onerror = () => setLogoError("Unable to read this logo file.");
    reader.readAsDataURL(file);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "").trim();
    create.mutate({
      instituteName: value("instituteName"), legalName: value("legalName"), instituteType: value("instituteType"),
      ownerName: value("ownerName"), ownerEmail: value("ownerEmail"), ownerPhone: value("ownerPhone"),
      initialAdminName: value("initialAdminName"), initialAdminEmail: value("initialAdminEmail"),
      address: value("address"), city: value("city"), state: value("state"), country: value("country"), pincode: value("pincode"),
      logoDataUrl, website: value("website"), domain: value("domain"), defaultBranchName: value("defaultBranchName"),
      defaultBranchCode: value("defaultBranchCode"), academicYear: value("academicYear"), planId: value("planId"),
      trialDays: Number(value("trialDays")), billingCycle: value("billingCycle"), status: value("status"),
    });
  }
  const options = plans.data ?? [];
  const canCreate = ["super_admin", "platform_admin"].includes(role());
  if (!canCreate) return <PageShell title="Create institute"><Card><CardContent className="p-6 text-sm text-destructive">Your platform role cannot create institutes.</CardContent></Card></PageShell>;
  return <PageShell title="Create institute"><form onSubmit={submit} className="space-y-5">
    {create.error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{create.error.message}</div>}
    {plans.error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">Unable to load subscription plans: {plans.error.message}</div>}
    <Card><CardHeader><CardTitle className="text-base">Institute profile</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Institute name" name="instituteName" required />
      <Field label="Legal name" name="legalName" />
      <label className="grid gap-1.5 text-sm"><span>Institute type <Required /></span><select name="instituteType" required className="h-9 rounded-md border border-input bg-background px-3"><option value="school">School</option><option value="coaching">Coaching</option><option value="computer_institute">Computer institute</option><option value="tuition_center">Tuition center</option><option value="academy">Academy</option></select></label>
      <Field label="Website" name="website" type="url" placeholder="https://example.edu" />
      <Field label="Domain" name="domain" placeholder="portal.example.edu" />
      <label className="grid gap-1.5 text-sm"><span>Logo</span><Input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => void chooseLogo(event.target.files?.[0])} />{logoError && <span className="text-xs text-destructive">{logoError}</span>}{logoDataUrl && <span className="text-xs text-emerald-700">Logo ready to upload</span>}</label>
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Owner and initial admin account</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Owner name" name="ownerName" required /><Field label="Owner email" name="ownerEmail" type="email" required /><Field label="Owner phone" name="ownerPhone" type="tel" required />
      <Field label="Initial admin name" name="initialAdminName" required /><Field label="Initial admin email" name="initialAdminEmail" type="email" required />
      <p className="sm:col-span-2 lg:col-span-3 text-xs text-muted-foreground">The initial administrator receives a single-use password setup link when mail delivery is configured. Passwords are never shown to platform operators.</p>
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Address and default branch</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Address" name="address" required /><Field label="City" name="city" required /><Field label="State" name="state" required /><Field label="Country" name="country" required /><Field label="Pincode" name="pincode" required />
      <Field label="Default branch" name="defaultBranchName" required defaultValue="Main Branch" /><Field label="Branch code" name="defaultBranchCode" defaultValue="MAIN" required /><Field label="Academic year" name="academicYear" defaultValue={currentAcademicYear()} required />
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Subscription</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="grid gap-1.5 text-sm"><span>Plan <Required /></span><select name="planId" required defaultValue="" disabled={plans.isPending || !options.length} className="h-9 rounded-md border border-input bg-background px-3"><option value="" disabled>{plans.isPending ? "Loading plans…" : options.length ? "Select a plan" : "No active plans available"}</option>{options.filter((item) => !item.status || item.status === "active").map((item) => <option key={item._id ?? item.id ?? item.code} value={item._id ?? item.id}>{item.name} · {item.code}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm"><span>Billing cycle</span><select name="billingCycle" className="h-9 rounded-md border border-input bg-background px-3"><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label>
      <label className="grid gap-1.5 text-sm"><span>Trial duration (days)</span><Input name="trialDays" type="number" min="0" max="365" defaultValue="0" required /></label>
      <label className="grid gap-1.5 text-sm"><span>Initial status</span><select name="status" className="h-9 rounded-md border border-input bg-background px-3"><option value="pending">PENDING — activate after setup</option><option value="active">ACTIVE</option></select></label>
      <p className="self-end text-xs text-muted-foreground sm:col-span-1 lg:col-span-2">A positive trial duration starts a trial subscription and sets the institute status to TRIAL.</p>
    </CardContent></Card>
    <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={() => setLocation("/super-admin/institutes")}>Cancel</Button><Button type="submit" disabled={create.isPending || plans.isPending || !options.length || Boolean(logoError)}>{create.isPending ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Creating…</> : <><FilePlus2 className="mr-2 h-4 w-4" />Create institute</>}</Button></div>
  </form></PageShell>;
}

function Required() { return <span className="text-destructive">*</span>; }
function Field({ label, name, required, type = "text", placeholder, defaultValue }: { label: string; name: string; required?: boolean; type?: string; placeholder?: string; defaultValue?: string }) {
  return <label className="grid gap-1.5 text-sm"><span>{label}{required && <> <Required /></>}</span><Input name={name} type={type} placeholder={placeholder} defaultValue={defaultValue} required={required} maxLength={240} /></label>;
}

const detailTabs = ["Overview", "Profile", "Owner", "Branches", "Admins", "Users", "Students", "Teachers", "Staff", "Parents", "Courses", "Subscriptions", "Payments", "Invoices", "Usage", "Activity", "Audit Logs", "Settings"] as const;
type DetailTab = (typeof detailTabs)[number];
const sectionKey: Record<DetailTab, string> = {
  Overview: "overview", Profile: "profile", Owner: "owner", Branches: "branches", Admins: "admins", Users: "users", Students: "students",
  Teachers: "teachers", Staff: "staff", Parents: "parents", Courses: "courses", Subscriptions: "subscriptions", Payments: "payments",
  Invoices: "invoices", Usage: "usage", Activity: "activity", "Audit Logs": "auditLogs", Settings: "settings",
};

function DetailMetric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) {
  return <Card><CardContent className="flex items-center gap-3 p-4"><span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></span><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-semibold tabular-nums">{new Intl.NumberFormat().format(value)}</p></div></CardContent></Card>;
}

function DetailRows({ tab, rows, onReset, canReset }: { tab: DetailTab; rows: any[]; onReset?: (id: string) => void; canReset?: boolean }) {
  if (!rows?.length) return <Card><CardContent className="p-10 text-center"><p className="font-medium">No {tab.toLowerCase()} records</p><p className="mt-1 text-sm text-muted-foreground">The platform API returned no records in this section.</p></CardContent></Card>;
  const desired: Record<string, string[]> = {
    Branches: ["name", "code", "status", "isMain", "phone", "email", "createdAt"],
    Admins: ["name", "email", "phone", "isApproved", "createdAt"], Users: ["name", "email", "role", "phone", "isApproved", "createdAt"],
    Students: ["name", "enrollmentNo", "status", "academicYear", "email", "phone"], Teachers: ["name", "role", "positionTitle", "status", "email", "phone"],
    Staff: ["name", "role", "positionTitle", "status", "email", "phone"], Parents: ["name", "email", "phone", "isApproved", "createdAt"],
    Courses: ["name", "courseType", "duration", "fees", "status", "createdAt"],
    Subscriptions: ["planId", "status", "billingCycle", "startsAt", "endsAt", "createdAt"],
    Payments: ["amount", "currency", "status", "provider", "reference", "paidAt", "createdAt"],
    Invoices: ["invoiceNumber", "total", "currency", "status", "issuedAt", "dueAt", "paidAt"],
    Activity: ["kind", "action", "actorEmail", "actorRole", "outcome", "createdAt"],
    "Audit Logs": ["createdAt", "actorEmail", "actorRole", "action", "targetType", "targetId", "ipAddress"],
  };
  const columns = desired[tab] ?? Object.keys(rows[0]).filter((key) => key !== "id").slice(0, 7);
  return <Card><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground"><tr>{columns.map((column) => <th key={column} className="px-4 py-3 font-semibold">{humanize(column)}</th>)}{tab === "Admins" && canReset && <th className="px-4 py-3">Security</th>}</tr></thead><tbody className="divide-y">{rows.map((row, index) => <tr key={row.id ?? row._id ?? index} className="align-top">{columns.map((column) => <td key={column} className="max-w-72 break-words px-4 py-3">{column === "status" ? <StatusBadge status={String(row[column] ?? "")} /> : column.toLowerCase().includes("at") || column === "createdAt" || column === "updatedAt" || column === "paidAt" || column === "dueAt" || column === "endsAt" || column === "startsAt" ? formatDateTime(row[column]) : showValue(row[column])}</td>)}{tab === "Admins" && canReset && <td className="px-4 py-3"><Button size="sm" variant="outline" onClick={() => onReset?.(String(row.id ?? row._id))}><Mail className="mr-2 h-3.5 w-3.5" />Send reset</Button></td>}</tr>)}</tbody></table></div><div className="border-t px-4 py-3 text-xs text-muted-foreground">Showing up to {rows.length} records returned by the platform API.</div></Card>;
}

export function SuperAdminInstituteDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/super-admin/institutes/:id");
  const id = params?.id ?? "";
  const [tab, setTab] = useState<DetailTab>("Overview");
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [announcementError, setAnnouncementError] = useState("");
  const [trialDays, setTrialDays] = useState("14");
  const [planId, setPlanId] = useState("");
  const [profileEditing, setProfileEditing] = useState(false);
  const queryClient = useQueryClient();
  const detail = useQuery({ queryKey: ["platform", "institute-management", "detail", id], queryFn: () => api<InstituteDetail>(`/institutes/${id}`), enabled: Boolean(id) });
  const plans = useQuery({ queryKey: ["platform", "institute-management", "plans"], queryFn: getPlans });
  const canManage = ["super_admin", "platform_admin"].includes(role());
  const canReset = canManage;
  const canAnnounce = ["super_admin", "platform_admin", "support_admin"].includes(role());
  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["platform", "institute-management", "detail", id] }),
      queryClient.invalidateQueries({ queryKey: ["platform", "institute-management"] }),
      queryClient.invalidateQueries({ queryKey: ["platform", "dashboard"] }),
    ]);
  };
  const statusMutation = useMutation({ mutationFn: (action: string) => api(`/institutes/${id}/status`, { method: "POST", body: JSON.stringify({ action }) }), onSuccess: invalidate });
  const trialMutation = useMutation({ mutationFn: ({ action, days }: { action: "start" | "extend"; days: number }) => api(`/institutes/${id}/trial`, { method: "POST", body: JSON.stringify({ action, days, ...(planId ? { planId } : {}) }) }), onSuccess: invalidate });
  const planMutation = useMutation({ mutationFn: () => api(`/institutes/${id}/subscription`, { method: "PATCH", body: JSON.stringify({ planId }) }), onSuccess: invalidate });
  const resetMutation = useMutation({ mutationFn: (adminId: string) => api(`/institutes/${id}/admins/${adminId}/password-reset`, { method: "POST", body: "{}" }), onSuccess: invalidate });
  const announceMutation = useMutation({ mutationFn: (body: { title: string; message: string }) => api(`/institutes/${id}/announcements`, { method: "POST", body: JSON.stringify(body) }), onSuccess: async () => { setAnnouncementOpen(false); setAnnouncementError(""); await invalidate(); } });
  const profileMutation = useMutation({ mutationFn: (body: Record<string, unknown>) => api(`/institutes/${id}`, { method: "PATCH", body: JSON.stringify(body) }), onSuccess: async () => { setProfileEditing(false); await invalidate(); } });
  const data = detail.data;
  const institute = data?.institute;
  const availablePlans = plans.data ?? [];
  const currentPlanId = data?.overview.currentSubscription?.planId?._id ?? data?.overview.currentSubscription?.planId?.id ?? "";
  const actionError = statusMutation.error || trialMutation.error || planMutation.error || resetMutation.error || profileMutation.error;

  function submitAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAnnouncementError("");
    const form = new FormData(event.currentTarget);
    announceMutation.mutate({ title: String(form.get("title") ?? "").trim(), message: String(form.get("message") ?? "").trim() });
  }

  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body: Record<string, unknown> = {};
    ["instituteName", "legalName", "instituteType", "ownerName", "email", "phone", "address", "city", "state", "country", "pincode", "website", "domain", "academicYear"].forEach((key) => { body[key] = String(form.get(key) ?? "").trim(); });
    profileMutation.mutate(body);
  }

  if (detail.isPending) return <PageShell title="Institute details"><div className="space-y-3"><div className="h-24 animate-pulse rounded-lg bg-muted" /><LoadingRows /></div></PageShell>;
  if (detail.error || !data || !institute) return <PageShell title="Institute details"><ErrorPanel error={detail.error ?? new Error("Institute was not found.")} retry={() => void detail.refetch()} /></PageShell>;
  const section = sectionKey[tab];
  const rows = Array.isArray(data.sections[section]) ? data.sections[section] : [];
  const planSelect = <select aria-label="Subscription plan" value={planId || currentPlanId || ""} onChange={(event) => setPlanId(event.target.value)} className="h-9 min-w-48 rounded-md border border-input bg-background px-3 text-sm"><option value="">Select plan</option>{availablePlans.filter((plan) => !plan.status || plan.status === "active").map((plan) => <option key={plan._id ?? plan.id ?? plan.code} value={plan._id ?? plan.id}>{plan.name}</option>)}</select>;
  const status = institute.status;
  const disabled = statusMutation.isPending || trialMutation.isPending || planMutation.isPending;

  return <PageShell title={institute.instituteName} trailing={<Button variant="outline" onClick={() => void detail.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-4 shadow-sm"><div className="flex min-w-0 items-center gap-3">{institute.logoDataUrl ? <img src={institute.logoDataUrl} alt="" className="h-12 w-12 rounded-lg border object-contain" /> : <span className="rounded-lg bg-primary/10 p-3 text-primary"><Building2 className="h-6 w-6" /></span>}<div className="min-w-0"><p className="truncate text-lg font-semibold">{institute.legalName || institute.instituteName}</p><p className="truncate text-sm text-muted-foreground">{institute.ownerName} · {institute.ownerEmail}</p></div><StatusBadge status={status} /></div><div className="flex flex-wrap gap-2">
      {canManage && status === "pending" && <Button size="sm" disabled={disabled} onClick={() => statusMutation.mutate("activate")}><ShieldCheck className="mr-1.5 h-4 w-4" />Activate</Button>}
      {canManage && ["active", "trial"].includes(status) && <Button size="sm" variant="outline" disabled={disabled} onClick={() => { if (window.confirm("Suspend this institute? Its tenant sessions will be revoked.")) statusMutation.mutate("suspend"); }}><ShieldOff className="mr-1.5 h-4 w-4" />Suspend</Button>}
      {canManage && status === "suspended" && <Button size="sm" disabled={disabled} onClick={() => statusMutation.mutate("resume")}><ShieldCheck className="mr-1.5 h-4 w-4" />Resume</Button>}
      {canManage && status !== "archived" && <Button size="sm" variant="destructive" disabled={disabled} onClick={() => { if (window.confirm("Archive this institute? All institute access will be blocked and the data will be retained.")) statusMutation.mutate("archive"); }}><Archive className="mr-1.5 h-4 w-4" />Archive</Button>}
      {canAnnounce && <Button size="sm" variant="outline" onClick={() => { setAnnouncementError(""); setAnnouncementOpen(true); }}><Mail className="mr-1.5 h-4 w-4" />Send announcement</Button>}
    </div></div>
    {actionError && <div role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{actionError.message}</div>}
    {(window.location.search.includes("created=1")) && <div role="status" className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-800"><Check className="h-4 w-4" />Institute created. {new URLSearchParams(window.location.search).get("setup") === "queued" ? "The initial admin password setup email was queued." : "Mail delivery is not configured; use Send reset in the Admins tab after email delivery is configured."}</div>}

    {canManage && <Card className="mb-4"><CardContent className="flex flex-wrap items-end gap-3 p-4"><div className="mr-auto"><p className="text-sm font-semibold">Subscription actions</p><p className="mt-1 text-xs text-muted-foreground">Choose a live plan before changing the subscription or starting/extending a trial.</p></div>{planSelect}<label className="grid gap-1 text-xs text-muted-foreground"><span>Trial days</span><Input className="w-28" type="number" min="1" max="365" value={trialDays} onChange={(event) => setTrialDays(event.target.value)} /></label><Button size="sm" variant="outline" disabled={disabled || !Number(trialDays)} onClick={() => trialMutation.mutate({ action: "start", days: Number(trialDays) })}>Start trial</Button><Button size="sm" variant="outline" disabled={disabled || !Number(trialDays)} onClick={() => trialMutation.mutate({ action: "extend", days: Number(trialDays) })}>Extend trial</Button><Button size="sm" disabled={disabled || !planId} onClick={() => planMutation.mutate()}>Change plan</Button></CardContent></Card>}

    <div className="mb-4 overflow-x-auto"><div className="flex min-w-max gap-1 border-b">{detailTabs.map((value) => <button key={value} onClick={() => { setTab(value); setProfileEditing(false); }} className={`border-b-2 px-3 py-2 text-sm font-medium ${tab === value ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{value}</button>)}</div></div>

    {tab === "Overview" && <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      ["Branches", data.overview.branches, Building2], ["Students", data.overview.students, Users], ["Teachers", data.overview.teachers, ShieldCheck], ["Staff", data.overview.staff, Users],
      ["Parents", data.overview.parents, Users], ["Users", data.overview.users, Users], ["Active users", data.overview.activeUsers, Activity], ["Admins", data.overview.admins, ShieldCheck],
    ].map(([label, value, icon]) => <DetailMetric key={String(label)} label={String(label)} value={Number(value)} icon={icon as typeof Users} />)}</div><div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle className="text-base">Institute overview</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">{[["Status", <StatusBadge status={status} />], ["Plan", data.overview.currentSubscription?.planId?.name ?? institute.plan ?? "—"], ["Academic year", institute.academicYear], ["Created", formatDate(institute.createdAt)], ["Expires", formatDate(institute.expiryDate)], ["Last activity", formatDateTime(data.sections.activity?.[0]?.createdAt)]].map(([label, value]) => <div key={String(label)}><p className="text-xs text-muted-foreground">{label}</p><div className="mt-1 text-sm font-medium">{value as ReactNode}</div></div>)}</CardContent></Card><Card><CardHeader><CardTitle className="text-base">Current subscription</CardTitle></CardHeader><CardContent>{data.overview.currentSubscription ? <div className="grid gap-3 sm:grid-cols-2">{Object.entries(data.overview.currentSubscription).filter(([key]) => key !== "_id").map(([key, value]) => <div key={key}><p className="text-xs text-muted-foreground">{humanize(key)}</p><p className="mt-1 text-sm font-medium">{showValue(value)}</p></div>)}</div> : <p className="text-sm text-muted-foreground">No subscription record found.</p>}</CardContent></Card></div></div>}

    {tab === "Profile" && <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Institute profile</CardTitle>{canManage && !profileEditing && <Button size="sm" variant="outline" onClick={() => setProfileEditing(true)}>Edit profile</Button>}</CardHeader><CardContent>{profileEditing ? <form onSubmit={submitProfile} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[
      ["Institute name", "instituteName"], ["Legal name", "legalName"], ["Owner name", "ownerName"], ["Owner email", "email"], ["Owner phone", "phone"],
      ["Address", "address"], ["City", "city"], ["State", "state"], ["Country", "country"], ["Pincode", "pincode"], ["Website", "website"], ["Domain", "domain"], ["Academic year", "academicYear"],
    ].map(([label, name]) => <label key={name} className="grid gap-1.5 text-sm"><span>{label}</span><Input name={name} defaultValue={(institute as any)[name] ?? ""} required={name === "instituteName" || name === "email" || name === "ownerName" || name === "phone"} /></label>)}<div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3"><Button type="button" variant="outline" onClick={() => setProfileEditing(false)}>Cancel</Button><Button type="submit" disabled={profileMutation.isPending}>{profileMutation.isPending ? "Saving…" : "Save profile"}</Button></div></form> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(institute).filter(([key]) => !["id", "initialAdminId", "defaultBranchId", "archivedAt", "logoDataUrl"].includes(key)).map(([key, value]) => <div key={key}><p className="text-xs text-muted-foreground">{humanize(key)}</p><p className="mt-1 break-words text-sm font-medium">{key.endsWith("At") || key === "createdAt" || key === "updatedAt" || key === "expiryDate" ? formatDateTime(value as string) : key === "status" ? <StatusBadge status={String(value)} /> : showValue(value)}</p></div>)}{institute.website && <a className="text-sm text-primary underline" href={institute.website} target="_blank" rel="noreferrer">Open website</a>}</div>}</CardContent></Card>}

    {tab === "Owner" && <Card><CardHeader><CardTitle className="text-base">Institute owner</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[["Name", institute.ownerName], ["Email", institute.ownerEmail], ["Phone", institute.ownerPhone], ["Initial administrator", institute.initialAdminId ?? "—"]].map(([label, value]) => <div key={String(label)}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-medium">{showValue(value)}</p></div>)}</CardContent></Card>}

    {tab === "Usage" && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Object.entries(data.sections.usage as Record<string, { used: number; limit: number | null }> ?? {}).map(([key, item]) => <Card key={key}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{humanize(key)}</p><p className="mt-2 text-2xl font-semibold">{new Intl.NumberFormat().format(item.used)} <span className="text-sm font-normal text-muted-foreground">/ {item.limit === null ? "unlimited" : new Intl.NumberFormat().format(item.limit)}</span></p>{item.limit !== null && <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, item.limit ? item.used / item.limit * 100 : 0)}%` }} /></div>}</CardContent></Card>)}</div>}

    {tab === "Profile" || tab === "Owner" || tab === "Overview" || tab === "Usage" ? null : <DetailRows tab={tab} rows={rows} canReset={canReset} onReset={(adminId) => { if (window.confirm("Send a single-use password reset link to this administrator?")) resetMutation.mutate(adminId); }} />}

    <Dialog open={announcementOpen} onOpenChange={setAnnouncementOpen}><DialogContent><DialogHeader><DialogTitle>Send institute announcement</DialogTitle><DialogDescription>This in-app notice is saved for this institute and will appear in its notification list.</DialogDescription></DialogHeader><form onSubmit={submitAnnouncement} className="space-y-4"><label className="grid gap-1.5 text-sm"><span>Title</span><Input name="title" required maxLength={160} /></label><label className="grid gap-1.5 text-sm"><span>Message</span><textarea name="message" required maxLength={5000} rows={5} className="resize-y rounded-md border border-input bg-background px-3 py-2 text-sm" /></label>{(announcementError || announceMutation.error) && <p role="alert" className="text-sm text-destructive">{announcementError || (announceMutation.error as Error).message}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => setAnnouncementOpen(false)}>Cancel</Button><Button type="submit" disabled={announceMutation.isPending}>{announceMutation.isPending ? "Sending…" : "Send announcement"}</Button></DialogFooter></form></DialogContent></Dialog>
  </PageShell>;
}

export function InstituteAdminResetPassword() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const resetToken = useMemo(() => new URLSearchParams(window.location.search).get("token") ?? "", []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!resetToken) { setError("This password setup link is missing its token. Ask your platform administrator for a new link."); return; }
    if (password !== confirm) { setError("The passwords do not match."); return; }
    setPending(true);
    try {
      const response = await fetch("/api/auth/institute-admin/reset-password", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: resetToken, password }) });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to reset the password.");
      window.history.replaceState(null, "", "/institute-admin/reset-password");
      setDone(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to reset the password."); }
    finally { setPending(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white"><Card className="w-full max-w-md border-white/10 bg-slate-900 text-white"><CardHeader><CardTitle>{done ? "Password updated" : "Set up your institute password"}</CardTitle><p className="text-sm text-slate-300">{done ? "Your other institute administrator sessions were signed out." : "Choose at least 12 characters with uppercase and lowercase letters and a number."}</p></CardHeader><CardContent>{done ? <Button className="w-full" onClick={() => setLocation("/login")}>Continue to sign in</Button> : <form className="space-y-4" onSubmit={submit}><label className="grid gap-1.5 text-sm"><span>New password</span><Input type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={password} onChange={(event) => setPassword(event.target.value)} /></label><label className="grid gap-1.5 text-sm"><span>Confirm password</span><Input type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={confirm} onChange={(event) => setConfirm(event.target.value)} /></label>{error && <p role="alert" className="text-sm text-rose-300">{error}</p>}<Button type="submit" className="w-full" disabled={pending}>{pending ? "Updating…" : "Set password"}</Button><Link href="/login" className="block text-center text-sm text-slate-300 hover:text-white">Back to sign in</Link></form>}</CardContent></Card></main>;
}
