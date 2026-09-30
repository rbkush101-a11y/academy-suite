import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Activity, AlertCircle, ArrowUpRight, Banknote, Bell, Building2, ClipboardList, FileText,
  Gauge, Megaphone, Package, Receipt, Settings2, Shield, Ticket, Users, WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PlatformRow = Record<string, unknown>;
type PlatformPayload = PlatformRow | PlatformRow[];

const sections: Array<{ key: string; label: string; endpoint: string; icon: LucideIcon }> = [
  { key: "dashboard", label: "Overview", endpoint: "dashboard", icon: Gauge },
  { key: "institutes", label: "Institutes", endpoint: "institutes", icon: Building2 },
  { key: "users", label: "Platform users", endpoint: "users", icon: Users },
  { key: "plans", label: "Plans", endpoint: "plans", icon: Package },
  { key: "features", label: "Features", endpoint: "features", icon: WandSparkles },
  { key: "subscriptions", label: "Subscriptions", endpoint: "subscriptions", icon: ClipboardList },
  { key: "payments", label: "Payments", endpoint: "payments", icon: Banknote },
  { key: "invoices", label: "Invoices", endpoint: "invoices", icon: Receipt },
  { key: "analytics", label: "Analytics", endpoint: "analytics", icon: Activity },
  { key: "support", label: "Support", endpoint: "support", icon: Ticket },
  { key: "notifications", label: "Notifications", endpoint: "notifications", icon: Bell },
  { key: "announcements", label: "Announcements", endpoint: "announcements", icon: Megaphone },
  { key: "audit", label: "Audit log", endpoint: "audit", icon: FileText },
  { key: "security", label: "Security sessions", endpoint: "security/sessions", icon: Shield },
  { key: "system-health", label: "System health", endpoint: "system-health", icon: Activity },
  { key: "settings", label: "Settings", endpoint: "settings", icon: Settings2 },
];

const preferredColumns: Record<string, string[]> = {
  institutes: ["instituteName", "ownerName", "email", "plan", "status", "maxStudents"],
  users: ["name", "email", "role", "instituteId", "isApproved", "createdAt"],
  plans: ["name", "code", "currency", "monthlyPrice", "yearlyPrice", "status"],
  features: ["name", "key", "enabled", "description"],
  subscriptions: ["instituteId", "planId", "status", "billingCycle", "startsAt", "endsAt"],
  payments: ["instituteId", "invoiceId", "amount", "currency", "status", "createdAt"],
  invoices: ["invoiceNumber", "instituteId", "total", "currency", "status", "dueAt"],
  support: ["ticketNumber", "subject", "status", "priority", "requesterEmail", "createdAt"],
  notifications: ["title", "audience", "channel", "status", "scheduledAt", "createdAt"],
  announcements: ["title", "audience", "status", "scheduledAt", "publishedAt", "createdAt"],
  audit: ["createdAt", "actorEmail", "actorRole", "action", "targetType", "targetId"],
  security: ["user", "ipAddress", "userAgent", "createdAt", "lastSeenAt", "expiresAt"],
};

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

async function fetchPlatformData(endpoint: string): Promise<PlatformPayload> {
  const token = localStorage.getItem("coach_sutra_token");
  const response = await fetch(`/api/v1/platform/${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || `Platform API request failed (${response.status})`);
  }
  return response.json() as Promise<PlatformPayload>;
}

function Overview({ data }: { data: PlatformRow }) {
  const instituteData = data.institutes as PlatformRow | undefined;
  const cards = [
    { label: "Institutes", value: display(instituteData?.total), detail: `${display(instituteData?.active)} active`, icon: Building2 },
    { label: "Platform users", value: display(data.platformUsers), detail: "Operator accounts", icon: Users },
    { label: "Active subscriptions", value: display(data.activeSubscriptions), detail: "Trialing or active", icon: ClipboardList },
    { label: "Open support", value: display(data.openTickets), detail: "Needs attention", icon: Ticket },
    { label: "Outstanding invoices", value: display(data.outstandingInvoices), detail: "Issued or overdue", icon: Receipt },
    { label: "Collected", value: display(data.collectedAmount), detail: "Successful recorded payments", icon: Banknote },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map(({ label, value, detail, icon: Icon }) => (
        <Card key={label}>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
            </div>
            <span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></span>
          </CardContent>
        </Card>
      ))}
      <Card className="sm:col-span-2 xl:col-span-3">
        <CardHeader><CardTitle className="text-base">Platform operations</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {sections.slice(1, 9).map(({ key, label, icon: Icon }) => (
            <Link key={key} href={`/super-admin/${key}`} className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted">
              <span className="flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" />{label}</span>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function DataView({ sectionKey, data }: { sectionKey: string; data: PlatformPayload }) {
  if (sectionKey === "settings" || sectionKey === "system-health" || sectionKey === "analytics") {
    const entries = Object.entries(data as PlatformRow);
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {entries.map(([key, value]) => (
          <Card key={key}>
            <CardContent className="p-5">
              <p className="text-sm capitalize text-muted-foreground">{key.replaceAll(/([A-Z])/g, " $1").replaceAll("_", " ")}</p>
              <p className="mt-2 break-words text-sm font-medium">{display(value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const rawRows = Array.isArray(data) ? data : Array.isArray((data as PlatformRow).items) ? (data as PlatformRow).items as PlatformRow[] : [];
  const columns = preferredColumns[sectionKey] ?? Object.keys(rawRows[0] ?? {}).slice(0, 6);
  if (!rawRows.length) {
    return <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No records were returned by the platform API.</CardContent></Card>;
  }
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>{columns.map((column) => <th className="px-4 py-3 font-medium" key={column}>{column.replaceAll(/([A-Z])/g, " $1").replaceAll("_", " ")}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {rawRows.map((row, index) => (
              <tr key={String(row.id ?? row._id ?? index)} className="align-top">
                {columns.map((column) => <td className="max-w-72 px-4 py-3" key={column}><span className="line-clamp-2 break-all">{display(row[column])}</span></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function SuperAdminDashboard() {
  const [location] = useLocation();
  const sectionKey = location.split(/[?#]/, 1)[0].split("/").filter(Boolean)[1] ?? "dashboard";
  const section = sections.find((item) => item.key === sectionKey) ?? sections[0];
  const query = useQuery({
    queryKey: ["platform", section.endpoint],
    queryFn: () => fetchPlatformData(section.endpoint),
  });
  const role = localStorage.getItem("coach_sutra_user_role")?.replaceAll("_", " ").toUpperCase() ?? "PLATFORM ADMIN";

  return (
    <div className="min-h-screen bg-muted/20 lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="border-b bg-background p-4 lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="mb-5 px-2 pt-1">
          <p className="font-semibold tracking-tight">ParikshaDrishti</p>
          <p className="mt-1 text-xs text-muted-foreground">Platform console</p>
        </div>
        <nav className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-1">
          {sections.map(({ key, label, icon: Icon }) => {
            const active = sectionKey === key;
            return (
              <Link key={key} href={key === "dashboard" ? "/super-admin" : `/super-admin/${key}`} className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <Icon className="h-4 w-4 shrink-0" />{label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0 p-4 sm:p-6 lg:p-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Platform administration</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{section.label}</h1>
          </div>
          <span className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium">{role}</span>
        </header>
        {query.isPending ? (
          <Card><CardContent className="p-8 text-sm text-muted-foreground">Loading platform data…</CardContent></Card>
        ) : query.error ? (
          <Card><CardContent className="flex items-start gap-3 p-6 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{query.error.message}</span></CardContent></Card>
        ) : section.key === "dashboard" ? (
          <Overview data={query.data as PlatformRow} />
        ) : (
          <DataView sectionKey={section.key} data={query.data} />
        )}
      </main>
    </div>
  );
}
