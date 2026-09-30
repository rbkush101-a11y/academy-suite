import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertCircle, Building2, Check, ChevronDown, CircleCheck, Clock3,
  FileClock, KeyRound, Loader2, Plus, Save, Shield, ShieldCheck, Trash2,
  Users, X,
} from "lucide-react";

type Branch = { id: string; name: string; code: string; phone: string; email: string; address: string; status: "active" | "inactive"; isMain: boolean };
type RoleDef = { id: string; key: string; name: string; description: string; permissions: string[]; isSystem: boolean };
type UserRecord = { id: string; name: string; email: string; phone: string; role: string; customRoleId: string; branchIds: string[]; isApproved: boolean; createdAt: string | null };
type PermissionGroup = { module: string; label: string; actions: readonly string[] };
type Institute = { id: string; instituteName: string; instituteType: string; ownerName: string; email: string; phone: string; address: string; status: string; plan: string };
type FoundationData = { institute: Institute | null; branches: Branch[]; settings: Record<string, unknown>; users: UserRecord[]; roles: RoleDef[]; permissions: PermissionGroup[]; activeBranchId: string; currentUserId: string };
type Session = { id: string; userId: string; name: string; email: string; role: string; ipAddress: string; userAgent: string; branchId: string; createdAt: string; lastSeenAt: string; expiresAt: string; isCurrent: boolean };
type AuditItem = { id: string; actorEmail: string; actorRole: string; action: string; targetType: string; targetId: string; ipAddress: string; details: Record<string, unknown>; createdAt: string };
type Tab = "overview" | "branches" | "users" | "roles" | "settings" | "security" | "audit";

const TABS: Array<{ id: Tab; label: string; icon: typeof Building2 }> = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "branches", label: "Branches", icon: Building2 },
  { id: "users", label: "Users", icon: Users },
  { id: "roles", label: "Roles & permissions", icon: Shield },
  { id: "settings", label: "Institute settings", icon: KeyRound },
  { id: "security", label: "Sessions & security", icon: ShieldCheck },
  { id: "audit", label: "Audit log", icon: FileClock },
];

const ROLE_OPTIONS = [
  ["institute_admin", "Institute Admin"], ["teacher", "Teacher"], ["staff", "Staff"],
  ["accountant", "Accountant"], ["parent", "Parent"],
];

function tokenPayload() {
  try {
    const token = localStorage.getItem("coach_sutra_token") || "";
    const encoded = token.split(".")[1];
    if (!encoded) return {};
    return JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/")));
  } catch { return {}; }
}

function apiRoot() {
  const configured = String(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
  return configured.endsWith("/api") ? configured : `${configured}/api`;
}

async function request<T>(path: string, options: RequestInit = {}, scope = true): Promise<T> {
  const root = apiRoot();
  const payload = tokenPayload();
  const selectedInstitute = localStorage.getItem("foundation_institute_id") || "";
  const requestPath = scope && payload.role === "super_admin" && selectedInstitute && path.startsWith("/foundation/") && !path.includes("instituteId=")
    ? `${path}${path.includes("?") ? "&" : "?"}instituteId=${encodeURIComponent(selectedInstitute)}`
    : path;
  const url = `${root}${requestPath}`;
  const token = localStorage.getItem("coach_sutra_token") || "";
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body = options.body;
  if (typeof body === "string" && scope && requestPath.startsWith("/foundation/")) {
    try {
      const data = JSON.parse(body);
      if (payload.role === "super_admin" && localStorage.getItem("foundation_institute_id")) {
        data.instituteId = localStorage.getItem("foundation_institute_id");
      }
      body = JSON.stringify(data);
    } catch { /* Leave non-JSON request bodies unchanged. */ }
  }
  if (body !== undefined && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(url, { ...options, headers, body });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data as T;
}

function fieldClass(extra = "") {
  return `mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-[#6b7d00] focus:ring-2 focus:ring-[#6b7d00]/10 ${extra}`;
}

function dateLabel(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export default function Foundation() {
  const payload = useMemo(() => tokenPayload(), []);
  const isSuperAdmin = payload.role === "super_admin";
  const [instituteId, setInstituteId] = useState<string>(() => {
    const saved = localStorage.getItem("foundation_institute_id") || "";
    return isSuperAdmin ? (saved || payload.instituteId || "") : (payload.instituteId || "");
  });
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [data, setData] = useState<FoundationData | null>(null);
  const [tab, setTab] = useState<Tab>(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    return TABS.some(({ id }) => id === requested) ? requested as Tab : "overview";
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [roleDraft, setRoleDraft] = useState<RoleDef | null>(null);
  const [roleForm, setRoleForm] = useState({ name: "", key: "", description: "" });
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [branchForm, setBranchForm] = useState({ name: "", code: "", phone: "", email: "", address: "" });
  const [userForm, setUserForm] = useState({ name: "", email: "", phone: "", password: "", role: "staff", customRoleId: "", branchIds: [] as string[] });
  const [instituteForm, setInstituteForm] = useState({ instituteName: "", instituteType: "academy", ownerName: "", email: "", phone: "", address: "" });
  const [settingForm, setSettingForm] = useState({ academicYear: "", timezone: "Asia/Kolkata", currency: "INR", passingPercentage: "33", attendanceThreshold: "75", dateFormat: "DD/MM/YYYY" });

  const scopedPath = useCallback((path: string) => {
    if (!isSuperAdmin || !instituteId || !path.startsWith("/foundation/")) return path;
    return `${path}${path.includes("?") ? "&" : "?"}instituteId=${encodeURIComponent(instituteId)}`;
  }, [instituteId, isSuperAdmin]);

  const loadFoundation = useCallback(async () => {
    if (isSuperAdmin && !instituteId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const next = await request<FoundationData>(scopedPath("/foundation/bootstrap"));
      setData(next);
      setInstituteForm({
        instituteName: next.institute?.instituteName ?? "", instituteType: next.institute?.instituteType ?? "academy",
        ownerName: next.institute?.ownerName ?? "", email: next.institute?.email ?? "",
        phone: next.institute?.phone ?? "", address: next.institute?.address ?? "",
      });
      const values = next.settings ?? {};
      setSettingForm((prev) => ({
        ...prev,
        academicYear: String(values.academicYear ?? prev.academicYear), timezone: String(values.timezone ?? prev.timezone),
        currency: String(values.currency ?? prev.currency), passingPercentage: String(values.passingPercentage ?? prev.passingPercentage),
        attendanceThreshold: String(values.attendanceThreshold ?? prev.attendanceThreshold), dateFormat: String(values.dateFormat ?? prev.dateFormat),
      }));
      setSelectedRoleId((current) => current || next.roles[0]?.id || "");
      localStorage.setItem("foundation_branches", JSON.stringify(next.branches));
      window.dispatchEvent(new Event("branchListChanged"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the institute foundation.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [instituteId, isSuperAdmin, scopedPath]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    request<Institute[]>("/institutes", {}, false)
      .then((items) => setInstitutes(items))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load institutes."));
  }, [isSuperAdmin]);

  useEffect(() => { void loadFoundation(); }, [loadFoundation]);

  useEffect(() => {
    const onBranchChange = () => { void loadFoundation(); };
    window.addEventListener("branchChanged", onBranchChange);
    return () => window.removeEventListener("branchChanged", onBranchChange);
  }, [loadFoundation]);

  useEffect(() => {
    if (!data || (tab !== "security" && tab !== "audit")) return;
    if (tab === "security") {
      request<{ sessions: Session[] }>(scopedPath("/foundation/sessions"))
        .then((result) => setSessions(result.sessions)).catch((cause) => setError(cause.message));
    } else {
      request<{ logs: AuditItem[] }>(scopedPath("/foundation/audit"))
        .then((result) => setAudit(result.logs)).catch((cause) => setError(cause.message));
    }
  }, [data, scopedPath, tab]);

  const selectedRole = data?.roles.find((role) => role.id === selectedRoleId) ?? null;
  const activeBranch = data ? data.branches.find((branch) => branch.id === data.activeBranchId) ?? null : null;

  const runAction = async (action: () => Promise<unknown>, message: string, reload = true) => {
    setSaving(true); setError(""); setNotice("");
    try {
      await action();
      if (reload) await loadFoundation();
      setNotice(message);
      window.setTimeout(() => setNotice(""), 3500);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The change could not be saved.");
    } finally { setSaving(false); }
  };

  const createBranch = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      const branch = await request<Branch>("/foundation/branches", { method: "POST", body: JSON.stringify(branchForm) });
      setBranchForm({ name: "", code: "", phone: "", email: "", address: "" }); setShowBranchForm(false);
      if (!data?.activeBranchId) {
        const result = await request<{ token: string }>("/foundation/active-branch", { method: "PATCH", body: JSON.stringify({ branchId: branch.id }) });
        localStorage.setItem("coach_sutra_token", result.token);
        localStorage.setItem("active_branch_id", branch.id);
        localStorage.setItem("active_branch_name", branch.name);
        window.dispatchEvent(new Event("branchChanged"));
      }
      await loadFoundation(); setNotice("Branch created and saved to this institute.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Branch could not be created."); }
    finally { setSaving(false); }
  };

  const switchBranch = async (branchId: string) => {
    await runAction(async () => {
      const result = await request<{ token: string; branch: Branch }>("/foundation/active-branch", { method: "PATCH", body: JSON.stringify({ branchId }) });
      localStorage.setItem("coach_sutra_token", result.token);
      localStorage.setItem("active_branch_id", result.branch.id);
      localStorage.setItem("active_branch_name", result.branch.name);
      window.dispatchEvent(new Event("branchChanged"));
    }, "Active branch context updated.");
  };

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault();
    await runAction(async () => {
      await request("/foundation/users", { method: "POST", body: JSON.stringify(userForm) });
      setUserForm({ name: "", email: "", phone: "", password: "", role: "staff", customRoleId: "", branchIds: [] });
      setShowUserForm(false);
    }, "User account created.");
  };

  const createRole = async (event: React.FormEvent) => {
    event.preventDefault();
    await runAction(async () => {
      const role = await request<RoleDef>("/foundation/roles", { method: "POST", body: JSON.stringify({ ...roleForm, permissions: [] }) });
      setRoleForm({ name: "", key: "", description: "" }); setShowRoleForm(false); setSelectedRoleId(role.id);
    }, "Custom role created.");
  };

  const saveRole = async () => {
    if (!roleDraft) return;
    await runAction(async () => {
      await request(`/foundation/roles/${roleDraft.id}`, { method: "PATCH", body: JSON.stringify({ permissions: roleDraft.permissions }) });
    }, "Role permissions saved.");
  };

  const deleteRole = async () => {
    if (!selectedRole || selectedRole.isSystem || !window.confirm(`Remove ${selectedRole.name}? Users must be reassigned first.`)) return;
    await runAction(async () => {
      await request(`/foundation/roles/${selectedRole.id}`, { method: "DELETE" });
      setSelectedRoleId(""); setRoleDraft(null);
    }, "Custom role removed.");
  };

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    await runAction(async () => {
      await request("/foundation/institute", { method: "PATCH", body: JSON.stringify(instituteForm) });
      await request("/foundation/settings", { method: "PATCH", body: JSON.stringify({ settings: settingForm }) });
    }, "Institute settings saved.");
  };

  const revokeSession = async (session: Session) => {
    setSaving(true); setError(""); setNotice("");
    try {
      await request(`/foundation/sessions/${session.id}`, { method: "DELETE" });
      if (session.isCurrent) {
        localStorage.removeItem("coach_sutra_token");
        window.location.assign("/login");
        return;
      }
      setSessions((current) => current.filter((item) => item.id !== session.id));
      setNotice("Session revoked.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Session could not be revoked.");
    } finally { setSaving(false); }
  };

  const createUserPermissionProfiles = useMemo(() => data?.roles ?? [], [data?.roles]);

  if (loading && !data) {
    return <div className="flex min-h-[55vh] items-center justify-center gap-3 text-sm font-semibold text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-[#6b7d00]" /> Loading institute foundation…</div>;
  }

  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-5 pb-8">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#092f48] via-[#11475a] to-[#517b25] p-6 text-white shadow-sm md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]"><ShieldCheck className="h-3.5 w-3.5" /> Phase 1 · Foundation</div>
            <h1 className="text-2xl font-black tracking-tight md:text-3xl">Institute foundation</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">Manage institute identity, branches, access roles, security sessions, and the activity trail from one place.</p>
          </div>
          {isSuperAdmin && <label className="w-full max-w-sm text-xs font-bold text-white/80">Institute / tenant
            <select value={instituteId} onChange={(event) => { setInstituteId(event.target.value); localStorage.setItem("foundation_institute_id", event.target.value); }} className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-3 text-sm font-semibold text-white outline-none [&>option]:text-slate-900">
              <option value="">Select an institute</option>
              {institutes.map((institute) => <option key={institute.id} value={institute.id}>{institute.instituteName}</option>)}
            </select>
          </label>}
          {data?.branches.length ? <label className="w-full max-w-xs text-xs font-bold text-white/80">Active branch context
            <select value={data.activeBranchId} onChange={(event) => void switchBranch(event.target.value)} disabled={saving} className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-3 text-sm font-semibold text-white outline-none disabled:opacity-60 [&>option]:text-slate-900">
              <option value="">Choose a branch</option>{data.branches.filter((branch) => branch.status === "active").map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </label> : null}
        </div>
      </section>

      {error && <div role="alert" className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {notice && <div role="status" className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"><CircleCheck className="h-4 w-4" />{notice}</div>}

      {!data && isSuperAdmin && !instituteId ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#517b25]"><Building2 className="h-6 w-6" /></div>
          <h2 className="text-lg font-extrabold text-slate-900">Choose an institute to begin</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Select a tenant above to manage its branches, users, roles, settings, sessions, and audit history.</p>
          <a href="/super-admin-dashboard" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">Open the institute manager</a>
        </section>
      ) : data ? <>
        <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {TABS.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-colors md:text-sm ${tab === id ? "bg-[#6b7d00] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}><Icon className="h-4 w-4" />{label}</button>)}
        </div>

        {tab === "overview" && <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={Building2} label="Branches" value={data.branches.length} detail={`${data.branches.filter((branch) => branch.status === "active").length} active`} />
            <Metric icon={Users} label="User accounts" value={data.users.length} detail={`${data.users.filter((user) => user.isApproved).length} approved`} />
            <Metric icon={Shield} label="Access roles" value={data.roles.length} detail={`${data.roles.filter((role) => !role.isSystem).length} custom`} />
            <Metric icon={ShieldCheck} label="Active branch" value={activeBranch?.name ?? "Not selected"} detail={data.institute?.plan ? `${data.institute.plan} plan` : "Institute context"} />
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-extrabold text-slate-900">Tenant profile</h2><p className="mt-1 text-sm text-slate-500">Institute identity used across the academy system.</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold capitalize text-emerald-700">{data.institute?.status ?? "Not configured"}</span></div>
              {data.institute ? <div className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2"><Readout label="Institute" value={data.institute.instituteName} /><Readout label="Type" value={data.institute.instituteType.replaceAll("_", " ")} /><Readout label="Owner" value={data.institute.ownerName} /><Readout label="Contact" value={`${data.institute.email} · ${data.institute.phone}`} /><Readout label="Plan" value={data.institute.plan} /><Readout label="Address" value={data.institute.address || "Add an address in Institute Settings"} /></div> : <p className="mt-5 text-sm text-slate-500">This account is not connected to an institute yet.</p>}
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-base font-extrabold text-slate-900">Foundation checklist</h2><p className="mt-1 text-sm text-slate-500">Core access and security controls for this tenant.</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {[["Institute / tenant", Boolean(data.institute)], ["Branch directory", data.branches.length > 0], ["User accounts", true], ["Roles and permissions", data.roles.length > 0], ["Authentication", true], ["Session controls", true], ["Audit trail", true], ["Institute settings", true], ["Active branch context", Boolean(activeBranch)]].map(([label, complete]) => <div key={String(label)} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5"><span className={`flex h-5 w-5 items-center justify-center rounded-full ${complete ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{complete ? <Check className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}</span><span className="text-xs font-semibold text-slate-700">{label}</span></div>)}
              </div>
            </section>
          </div>
        </div>}

        {tab === "branches" && <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <SectionHeading title="Branch directory" description="Create branches and choose the active branch context used in your session." action={<button onClick={() => setShowBranchForm(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#6b7d00] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#586700]"><Plus className="h-4 w-4" /> Add branch</button>} />
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Branch</th><th className="px-4 py-3">Code</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{data.branches.map((branch) => <tr key={branch.id} className="hover:bg-slate-50/70"><td className="px-5 py-4"><div className="font-bold text-slate-800">{branch.name}{branch.isMain && <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-700">Main</span>}</div><div className="mt-1 max-w-xs truncate text-xs text-slate-500">{branch.address || "No address"}</div>{data.activeBranchId === branch.id && <div className="mt-1 text-[10px] font-bold text-emerald-700">Current session context</div>}</td><td className="px-4 py-4 font-mono text-xs font-bold text-[#586700]">{branch.code}</td><td className="px-4 py-4 text-xs text-slate-600">{branch.email || "—"}<div className="mt-1">{branch.phone || "—"}</div></td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${branch.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{branch.status}</span></td><td className="px-4 py-4"><div className="flex justify-end gap-2">{branch.status === "active" && data.activeBranchId !== branch.id && <button onClick={() => void switchBranch(branch.id)} className="rounded-lg border border-[#6b7d00]/30 px-3 py-1.5 text-xs font-bold text-[#586700] hover:bg-lime-50">Switch to</button>}<button title={branch.status === "active" ? "Deactivate branch" : "Activate branch"} onClick={() => void runAction(() => request(`/foundation/branches/${branch.id}`, { method: "PATCH", body: JSON.stringify({ status: branch.status === "active" ? "inactive" : "active" }) }), `Branch ${branch.status === "active" ? "deactivated" : "activated"}.`)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">{branch.status === "active" ? "Deactivate" : "Activate"}</button><button title="Remove branch" onClick={() => { if (window.confirm(`Remove ${branch.name}?`)) void runAction(() => request(`/foundation/branches/${branch.id}`, { method: "DELETE" }), "Branch removed."); }} className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button></div></td></tr>)}</tbody></table>{!data.branches.length && <Empty title="No branches yet" detail="Add the first branch to establish a branch context." />}</div>
        </section>}

        {tab === "users" && <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <SectionHeading title="Institute users" description="Create user accounts, assign a portal role, and limit branch access." action={<button onClick={() => setShowUserForm(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#6b7d00] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#586700]"><Plus className="h-4 w-4" /> Add user</button>} />
          <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">User</th><th className="px-4 py-3">Portal role</th><th className="px-4 py-3">Permission profile</th><th className="px-4 py-3">Access</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{data.users.map((user) => <tr key={user.id}><td className="px-5 py-4"><div className="font-bold text-slate-800">{user.name}</div><div className="mt-1 text-xs text-slate-500">{user.email}{user.phone && ` · ${user.phone}`}</div></td><td className="px-4 py-4"><select value={user.role} onChange={(event) => void runAction(() => request(`/foundation/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ role: event.target.value, customRoleId: "" }) }), "User role updated.")} className={fieldClass("mt-0 min-w-36 py-2 text-xs")}><option value="super_admin" disabled>Super Admin</option>{ROLE_OPTIONS.filter(([value]) => isSuperAdmin || value !== "institute_admin").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td className="px-4 py-4"><select value={user.customRoleId} onChange={(event) => void runAction(() => request(`/foundation/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ customRoleId: event.target.value }) }), "Permission profile updated.")} className={fieldClass("mt-0 min-w-44 py-2 text-xs")}><option value="">Default role permissions</option>{data.roles.filter((role) => !role.isSystem || role.key === user.role).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></td><td className="px-4 py-4 text-xs text-slate-600">{user.branchIds.length ? `${user.branchIds.length} assigned` : "All institute branches"}</td><td className="px-4 py-4"><button onClick={() => void runAction(() => request(`/foundation/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ isApproved: !user.isApproved }) }), `Account ${user.isApproved ? "paused" : "approved"}.`)} className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${user.isApproved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{user.isApproved ? "Active · click to pause" : "Pending · click to approve"}</button></td></tr>)}</tbody></table>{!data.users.length && <Empty title="No institute users found" detail="Create an account for staff, teachers, or an institute administrator." />}</div>
        </section>}

        {tab === "roles" && <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
          <section className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><div><h2 className="font-extrabold text-slate-900">Role profiles</h2><p className="mt-1 text-xs text-slate-500">Built-in and custom access.</p></div><button onClick={() => setShowRoleForm(true)} title="Create a custom role" className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6b7d00] text-white hover:bg-[#586700]"><Plus className="h-4 w-4" /></button></div><div className="space-y-1">{data.roles.map((role) => <button key={role.id} onClick={() => { setSelectedRoleId(role.id); setRoleDraft({ ...role, permissions: [...role.permissions] }); }} className={`w-full rounded-xl px-3 py-3 text-left transition-colors ${selectedRoleId === role.id ? "bg-[#f2f4e4] text-[#465500]" : "text-slate-700 hover:bg-slate-50"}`}><span className="flex items-center justify-between gap-2 text-sm font-bold">{role.name}{role.isSystem && <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Built-in</span>}</span><span className="mt-1 block line-clamp-2 text-[11px] text-slate-500">{role.description || `${role.permissions.length} permissions`}</span></button>)}</div></section>
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><SectionHeading title={selectedRole?.name ?? "Select a role"} description="Choose the actions this permission profile can perform." action={<div className="flex gap-2">{selectedRole && !selectedRole.isSystem && <button onClick={() => void deleteRole()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /> Remove role</button>}<button onClick={() => void saveRole()} disabled={!roleDraft || saving} className="inline-flex items-center gap-2 rounded-xl bg-[#6b7d00] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#586700] disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save permissions</button></div>} />
            {roleDraft ? <div className="divide-y divide-slate-100">{(data.permissions ?? []).map((group) => <div key={group.module} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(150px,1fr)_2fr] md:items-center"><div><div className="text-sm font-bold text-slate-800">{group.label}</div><div className="text-[10px] text-slate-400">{group.module}</div></div><div className="flex flex-wrap gap-2">{group.actions.map((action) => { const key = `${group.module}.${action}`; const checked = roleDraft.permissions.includes(key); return <label key={key} className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold capitalize ${checked ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}><input type="checkbox" checked={checked} onChange={() => setRoleDraft((current) => current ? { ...current, permissions: checked ? current.permissions.filter((item) => item !== key) : [...current.permissions, key] } : current)} className="accent-[#6b7d00]" />{action}</label>; })}</div></div>)}</div> : <Empty title="Select a role profile" detail="Choose a profile to review and edit its permissions." />}
          </section>
        </div>}

        {tab === "settings" && <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><SectionHeading title="Institute settings" description="Identity, academic defaults, and regional preferences." />
          <form onSubmit={(event) => void saveSettings(event)} className="space-y-6 p-5 md:p-6">
            <div><h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Institute identity</h3><div className="mt-3 grid gap-4 sm:grid-cols-2"><Field label="Institute name" value={instituteForm.instituteName} onChange={(value) => setInstituteForm({ ...instituteForm, instituteName: value })} /><label className="text-xs font-bold text-slate-600">Institute type<select value={instituteForm.instituteType} onChange={(event) => setInstituteForm({ ...instituteForm, instituteType: event.target.value })} className={fieldClass()}>{[["school", "School"], ["coaching", "Coaching"], ["computer_institute", "Computer institute"], ["tuition_center", "Tuition center"], ["academy", "Academy"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><Field label="Owner / director" value={instituteForm.ownerName} onChange={(value) => setInstituteForm({ ...instituteForm, ownerName: value })} /><Field label="Contact email" type="email" value={instituteForm.email} onChange={(value) => setInstituteForm({ ...instituteForm, email: value })} /><Field label="Contact phone" value={instituteForm.phone} onChange={(value) => setInstituteForm({ ...instituteForm, phone: value })} /><Field label="Address" value={instituteForm.address} onChange={(value) => setInstituteForm({ ...instituteForm, address: value })} /></div></div>
            <div className="border-t border-slate-100 pt-5"><h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Academic and regional defaults</h3><div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Current academic year" value={settingForm.academicYear} onChange={(value) => setSettingForm({ ...settingForm, academicYear: value })} placeholder="2026–27" /><Field label="Timezone" value={settingForm.timezone} onChange={(value) => setSettingForm({ ...settingForm, timezone: value })} /><Field label="Currency" value={settingForm.currency} onChange={(value) => setSettingForm({ ...settingForm, currency: value.toUpperCase() })} /><Field label="Passing percentage" value={settingForm.passingPercentage} onChange={(value) => setSettingForm({ ...settingForm, passingPercentage: value })} /><Field label="Attendance threshold (%)" value={settingForm.attendanceThreshold} onChange={(value) => setSettingForm({ ...settingForm, attendanceThreshold: value })} /><Field label="Date format" value={settingForm.dateFormat} onChange={(value) => setSettingForm({ ...settingForm, dateFormat: value })} /></div></div>
            <div className="flex justify-end border-t border-slate-100 pt-5"><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#6b7d00] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"><Save className="h-4 w-4" /> Save institute settings</button></div>
          </form>
        </section>}

        {tab === "security" && <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><SectionHeading title="Active sessions" description="Review signed-in devices and revoke sessions that should no longer have access." />
          <div className="divide-y divide-slate-100">{sessions.map((session) => <div key={session.id} className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center"><div className="min-w-0"><div className="flex items-center gap-2 text-sm font-bold text-slate-800">{session.name} <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-500">{session.role.replaceAll("_", " ")}</span>{session.isCurrent && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">Current session</span>}</div><div className="mt-1 truncate text-xs text-slate-500">{session.email || "Student portal"} · {session.ipAddress || "IP unavailable"}</div><div className="mt-1 text-[10px] text-slate-400">Signed in {dateLabel(session.createdAt)} · last active {dateLabel(session.lastSeenAt)} · expires {dateLabel(session.expiresAt)}</div><div className="mt-1 max-w-2xl truncate text-[10px] text-slate-400" title={session.userAgent}>{session.userAgent || "Device details unavailable"}</div></div><button onClick={() => void revokeSession(session)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Revoke</button></div>)}{!sessions.length && <Empty title="No active sessions found" detail="Sessions created by the new sign-in flow will appear here." />}</div>
        </section>}

        {tab === "audit" && <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><SectionHeading title="Audit log" description="A chronological record of account, branch, settings, role, and security changes." />
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Action</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Target</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Time</th></tr></thead><tbody className="divide-y divide-slate-100">{audit.map((entry) => <tr key={entry.id}><td className="px-5 py-3"><span className="font-bold text-slate-800">{entry.action.replaceAll(".", " · ")}</span><div className="mt-1 max-w-xs truncate text-[10px] text-slate-400">{Object.entries(entry.details ?? {}).map(([key, value]) => `${key}: ${String(value)}`).join(" · ")}</div></td><td className="px-4 py-3 text-xs text-slate-600">{entry.actorEmail || "System"}<div className="mt-1 text-[10px] capitalize text-slate-400">{entry.actorRole?.replaceAll("_", " ")}</div></td><td className="px-4 py-3 text-xs text-slate-600">{entry.targetType || "—"}<div className="mt-1 max-w-28 truncate font-mono text-[10px] text-slate-400">{entry.targetId}</div></td><td className="px-4 py-3 font-mono text-xs text-slate-500">{entry.ipAddress || "—"}</td><td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{dateLabel(entry.createdAt)}</td></tr>)}</tbody></table>{!audit.length && <Empty title="No activity recorded yet" detail="Changes made through Foundation and new sign-ins will appear here." />}</div>
        </section>}
      </> : null}

      {showBranchForm && <Modal title="Add a branch" onClose={() => setShowBranchForm(false)}><form onSubmit={(event) => void createBranch(event)} className="space-y-3"><Field label="Branch name" required value={branchForm.name} onChange={(value) => setBranchForm({ ...branchForm, name: value })} /><Field label="Branch code" value={branchForm.code} onChange={(value) => setBranchForm({ ...branchForm, code: value.toUpperCase() })} placeholder="Generated from name when blank" /><div className="grid gap-3 sm:grid-cols-2"><Field label="Email" type="email" value={branchForm.email} onChange={(value) => setBranchForm({ ...branchForm, email: value })} /><Field label="Phone" value={branchForm.phone} onChange={(value) => setBranchForm({ ...branchForm, phone: value })} /></div><Field label="Address" value={branchForm.address} onChange={(value) => setBranchForm({ ...branchForm, address: value })} /><ModalActions busy={saving} onCancel={() => setShowBranchForm(false)} submit="Create branch" /></form></Modal>}

      {showUserForm && <Modal title="Create institute user" onClose={() => setShowUserForm(false)}><form onSubmit={(event) => void createUser(event)} className="space-y-3"><div className="grid gap-3 sm:grid-cols-2"><Field label="Full name" required value={userForm.name} onChange={(value) => setUserForm({ ...userForm, name: value })} /><Field label="Email" type="email" required value={userForm.email} onChange={(value) => setUserForm({ ...userForm, email: value })} /><Field label="Phone" value={userForm.phone} onChange={(value) => setUserForm({ ...userForm, phone: value })} /><Field label="Temporary password" type="password" required value={userForm.password} onChange={(value) => setUserForm({ ...userForm, password: value })} placeholder="8+ characters, upper/lowercase and number" /></div><label className="block text-xs font-bold text-slate-600">Portal role<select value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value, customRoleId: "" })} className={fieldClass()}>{ROLE_OPTIONS.filter(([value]) => isSuperAdmin || value !== "institute_admin").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="block text-xs font-bold text-slate-600">Permission profile<select value={userForm.customRoleId} onChange={(event) => setUserForm({ ...userForm, customRoleId: event.target.value })} className={fieldClass()}><option value="">Use default role permissions</option>{createUserPermissionProfiles.filter((role) => !role.isSystem || role.key === userForm.role).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>{data?.branches.length ? <fieldset><legend className="mb-2 text-xs font-bold text-slate-600">Branch access <span className="font-normal text-slate-400">(nothing selected = all branches)</span></legend><div className="grid gap-2 sm:grid-cols-2">{data.branches.filter((branch) => branch.status === "active").map((branch) => <label key={branch.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={userForm.branchIds.includes(branch.id)} onChange={(event) => setUserForm({ ...userForm, branchIds: event.target.checked ? [...userForm.branchIds, branch.id] : userForm.branchIds.filter((id) => id !== branch.id) })} className="accent-[#6b7d00]" />{branch.name}</label>)}</div></fieldset> : null}<p className="text-[10px] text-slate-400">Password must contain a lowercase letter, uppercase letter, and number.</p><ModalActions busy={saving} onCancel={() => setShowUserForm(false)} submit="Create user" /></form></Modal>}

      {showRoleForm && <Modal title="Create a custom role" onClose={() => setShowRoleForm(false)}><form onSubmit={(event) => void createRole(event)} className="space-y-3"><Field label="Role name" required value={roleForm.name} onChange={(value) => setRoleForm({ ...roleForm, name: value, key: value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") })} placeholder="e.g. Branch coordinator" /><Field label="Role key" required value={roleForm.key} onChange={(value) => setRoleForm({ ...roleForm, key: value.toLowerCase() })} /><Field label="Description" value={roleForm.description} onChange={(value) => setRoleForm({ ...roleForm, description: value })} /><p className="text-[10px] text-slate-400">New roles start with no additional permissions. Select a role after creation to configure its access.</p><ModalActions busy={saving} onCancel={() => setShowRoleForm(false)} submit="Create role" /></form></Modal>}
    </main>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Building2; label: string; value: string | number; detail: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">{label}</span><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3f5e8] text-[#617400]"><Icon className="h-4 w-4" /></span></div><div className="mt-3 truncate text-2xl font-black text-slate-900">{value}</div><div className="mt-1 text-[11px] font-medium text-slate-500">{detail}</div></div>;
}

function SectionHeading({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-extrabold text-slate-900">{title}</h2><p className="mt-1 text-xs text-slate-500">{description}</p></div>{action}</div>;
}

function Readout({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div><div className="mt-1 text-sm font-semibold capitalize text-slate-800">{value || "—"}</div></div>;
}

function Field({ label, value, onChange, type = "text", required = false, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return <label className="block text-xs font-bold text-slate-600">{label}{required && <span className="ml-1 text-red-500">*</span>}<input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={fieldClass()} /></label>;
}

function Empty({ title, detail }: { title: string; detail: string }) {
  return <div className="px-5 py-12 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Building2 className="h-5 w-5" /></div><h3 className="mt-3 text-sm font-bold text-slate-700">{title}</h3><p className="mt-1 text-xs text-slate-500">{detail}</p></div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"><button aria-label="Close modal" onClick={onClose} className="absolute inset-0 bg-slate-950/45" /><section className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl md:p-6"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-extrabold text-slate-900">{title}</h2><button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>{children}</section></div>;
}

function ModalActions({ busy, onCancel, submit }: { busy: boolean; onCancel: () => void; submit: string }) {
  return <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[#6b7d00] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{submit}</button></div>;
}
