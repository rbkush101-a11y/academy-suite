import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Laptop, LogOut, MonitorSmartphone, Shield, ShieldAlert, Smartphone } from "lucide-react";
import { Link, useLocation } from "wouter";

type SecurityProfile = { email: string; emailVerifiedAt: string | null; twoFactorEnabled: boolean; accountCreatedAt: string };
type PlatformSession = {
  _id: string;
  current: boolean;
  ipAddress: string;
  deviceName: string;
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
  userAgent: string;
  createdAt: string;
  lastLoginAt?: string;
  lastSeenAt: string;
  expiresAt: string;
  user: { name: string; email: string; role: string } | null;
};
type LoginEvent = {
  _id: string;
  event: string;
  outcome: "success" | "failure" | "info";
  ipAddress: string;
  userAgent: string;
  deviceName: string;
  sessionId: string;
  details: Record<string, unknown>;
  createdAt: string;
};
type Paged<T> = { items: T[]; page: number; limit: number; total: number };

async function platformRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("coach_sutra_token");
  const response = await fetch(`/api/v1/platform/${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || `Platform request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function dateTime(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function ErrorPanel({ error }: { error: Error }) {
  return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error.message}</div>;
}

function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-6">
      <Link href="/super-admin" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Platform overview</Link>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </header>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border bg-background p-5 shadow-sm"><h2 className="font-semibold">{title}</h2><div className="mt-4">{children}</div></section>;
}

export function SuperAdminSecurityHome() {
  const profile = useQuery({ queryKey: ["platform", "security", "profile"], queryFn: () => platformRequest<SecurityProfile>("security/profile") });

  return (
    <div className="mx-auto min-h-screen max-w-5xl bg-muted/20 p-4 sm:p-8">
      <PageHeader title="Security" description="Review account protections and manage platform sign-in sessions." />
      {profile.isPending ? <p className="text-sm text-muted-foreground">Loading security settings…</p> : profile.error ? <ErrorPanel error={profile.error} /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Platform account">
            <div className="flex items-start gap-3"><Shield className="mt-0.5 h-5 w-5 text-primary" /><div className="min-w-0"><p className="break-all text-sm font-medium">{profile.data.email}</p><p className="mt-1 text-sm text-muted-foreground">Created {dateTime(profile.data.accountCreatedAt)}</p><p className="mt-1 text-sm text-muted-foreground">Email verification: {profile.data.emailVerifiedAt ? `verified ${dateTime(profile.data.emailVerifiedAt)}` : "not recorded"}</p></div></div>
          </SectionCard>
          <SectionCard title="Two-factor authentication">
            <div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600" /><div><p className="text-sm font-medium">{profile.data.twoFactorEnabled ? "Enabled" : "Not enabled"}</p><p className="mt-1 text-sm text-muted-foreground">The account and login flow have a second-factor enforcement hook. Enrollment and recovery-code management are not available yet.</p></div></div>
          </SectionCard>
          <SectionCard title="Sessions and sign-in history">
            <p className="text-sm text-muted-foreground">Review active devices, revoke an individual session, or sign out the platform account on every device.</p>
            <div className="mt-4 flex flex-wrap gap-3"><Link href="/super-admin/sessions" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Active sessions</Link><Link href="/super-admin/login-history" className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">Login history</Link></div>
          </SectionCard>
          <SectionCard title="Password">
            <p className="text-sm text-muted-foreground">Password recovery links expire after 30 minutes. Resetting a password revokes all active platform sessions.</p>
            <Link href="/super-admin/forgot-password" className="mt-4 inline-flex rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">Request a password reset</Link>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

function deviceIcon(type: PlatformSession["deviceType"]) {
  if (type === "mobile") return Smartphone;
  if (type === "tablet") return MonitorSmartphone;
  return Laptop;
}

function clearPlatformClientSession(setLocation: (path: string) => void) {
  localStorage.removeItem("coach_sutra_token");
  localStorage.removeItem("coach_sutra_user_role");
  window.dispatchEvent(new Event("storage"));
  setLocation("/super-admin/login");
}

export function SuperAdminSessions() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const query = useQuery({ queryKey: ["platform", "security", "sessions"], queryFn: () => platformRequest<PlatformSession[]>("security/sessions") });
  const revoke = useMutation({
    mutationFn: (id: string) => platformRequest<{ id: string; revokedAt: string }>(`security/sessions/${encodeURIComponent(id)}/revoke`, { method: "POST" }),
    onSuccess: (_result, id) => {
      const current = query.data?.find((session) => session._id === id)?.current;
      if (current) clearPlatformClientSession(setLocation);
      else void queryClient.invalidateQueries({ queryKey: ["platform", "security", "sessions"] });
    },
  });
  const logoutAll = useMutation({
    mutationFn: () => platformRequest<void>("security/logout-all", { method: "POST" }),
    onSuccess: () => clearPlatformClientSession(setLocation),
  });

  return (
    <div className="mx-auto min-h-screen max-w-5xl bg-muted/20 p-4 sm:p-8">
      <PageHeader title="Active sessions" description="Sessions are scoped to platform operator accounts and expire automatically after 30 days." />
      <div className="mb-4 flex justify-end"><button onClick={() => logoutAll.mutate()} disabled={logoutAll.isPending} className="inline-flex items-center gap-2 rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"><LogOut className="h-4 w-4" />{logoutAll.isPending ? "Signing out…" : "Sign out all devices"}</button></div>
      {(revoke.error || logoutAll.error) && <div className="mb-4"><ErrorPanel error={(revoke.error || logoutAll.error) as Error} /></div>}
      {query.isPending ? <p className="text-sm text-muted-foreground">Loading sessions…</p> : query.error ? <ErrorPanel error={query.error} /> : !query.data.length ? (
        <div className="rounded-xl border bg-background p-8 text-center text-sm text-muted-foreground">There are no active platform sessions.</div>
      ) : (
        <div className="space-y-3">
          {query.data.map((session) => {
            const DeviceIcon = deviceIcon(session.deviceType);
            return <article key={session._id} className="flex flex-col gap-4 rounded-xl border bg-background p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 gap-3"><span className="rounded-lg bg-muted p-2.5"><DeviceIcon className="h-5 w-5" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-medium">{session.deviceName || "Unknown device"}</h2>{session.current && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">This device</span>}</div><p className="mt-1 text-sm text-muted-foreground">{session.user?.name || session.user?.email || "Platform account"} · {session.user?.role?.replaceAll("_", " ")}</p><p className="mt-1 break-all text-xs text-muted-foreground">IP {session.ipAddress || "unknown"} · Started {dateTime(session.lastLoginAt || session.createdAt)} · Last active {dateTime(session.lastSeenAt)}</p><p className="mt-1 break-all text-xs text-muted-foreground">{session.userAgent || "Browser details unavailable"}</p></div></div>
              <button onClick={() => revoke.mutate(session._id)} disabled={revoke.isPending} className="shrink-0 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50">Revoke session</button>
            </article>;
          })}
        </div>
      )}
    </div>
  );
}

export function SuperAdminLoginHistory() {
  const query = useQuery({ queryKey: ["platform", "security", "login-history"], queryFn: () => platformRequest<Paged<LoginEvent>>("security/login-history?limit=100") });
  return (
    <div className="mx-auto min-h-screen max-w-6xl bg-muted/20 p-4 sm:p-8">
      <PageHeader title="Login history" description="Recent sign-in and session security events for your platform account." />
      {query.isPending ? <p className="text-sm text-muted-foreground">Loading login history…</p> : query.error ? <ErrorPanel error={query.error} /> : !query.data.items.length ? (
        <div className="rounded-xl border bg-background p-8 text-center text-sm text-muted-foreground">No security events are available yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-background shadow-sm">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground"><tr>{["When", "Event", "Result", "Device", "IP address", "Session"].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
            <tbody className="divide-y">
              {query.data.items.map((event) => <tr key={event._id} className="align-top">
                <td className="whitespace-nowrap px-4 py-3">{dateTime(event.createdAt)}</td>
                <td className="max-w-56 px-4 py-3"><span className="break-words">{event.event.replaceAll("_", " ").replaceAll(".", " · ")}</span></td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${event.outcome === "success" ? "bg-emerald-100 text-emerald-800" : event.outcome === "failure" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"}`}>{event.outcome}</span></td>
                <td className="max-w-64 px-4 py-3"><span className="break-words">{event.deviceName || event.userAgent || "Unknown device"}</span></td>
                <td className="whitespace-nowrap px-4 py-3">{event.ipAddress || "—"}</td>
                <td className="max-w-40 break-all px-4 py-3 text-xs text-muted-foreground">{event.sessionId || "—"}</td>
              </tr>)}
            </tbody>
          </table>
          <p className="border-t px-4 py-3 text-xs text-muted-foreground">Showing {query.data.items.length} of {query.data.total} events. History is retained for up to one year.</p>
        </div>
      )}
    </div>
  );
}
