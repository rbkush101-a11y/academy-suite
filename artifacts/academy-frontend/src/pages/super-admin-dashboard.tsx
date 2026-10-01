import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity, AlertCircle, ArrowUpRight, Banknote, Bell, Building2, CheckCircle2, ClipboardList,
  FileText, Gauge, Megaphone, Package, Plus, Receipt, Settings2, Shield, Ticket, Users,
  UserRoundCheck, GraduationCap, UserRound, Landmark, TrendingUp, Clock3, ShieldAlert, Database, WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";

type PlatformRow = Record<string, unknown>;
type PlatformPayload = PlatformRow | PlatformRow[];
type CurrencyTotal = { currency: string; amount: number; count: number };
type DashboardRange = { startDate: string; endDate: string };
type DashboardData = {
  filters: DashboardRange & { interval: "day" | "month" };
  platform: {
    institutes: { total: number; active: number; trial: number; suspended: number; expired: number };
    totalBranches: number; totalStudents: number; totalTeachers: number; totalStaff: number; totalParents: number; totalActiveUsers: number;
  };
  subscriptions: { active: number; trial: number; expiringSoon: number; expired: number; canceled: number };
  revenue: {
    today: CurrencyTotal[]; thisMonth: CurrencyTotal[]; thisYear: CurrencyTotal[];
    pendingPayments: CurrencyTotal[]; failedPayments: CurrencyTotal[]; refunds: CurrencyTotal[];
    series: Array<{ date: string; [key: string]: string | number }>; currencies: string[];
  };
  growth: {
    newInstitutes: number; newStudents: number; newUsers: number; subscriptionGrowth: number;
    series: Array<{ date: string; institutes: number; students: number; users: number; subscriptions: number }>;
  };
  systemHealth: { services: Array<{ id: string; label: string; status: string; detail: string }>; checkedAt: string };
  recentActivity: Array<{ id: string; type: string; title: string; description: string; occurredAt: string; amount?: number; currency?: string }>;
  support: { openTickets: number };
};

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
  { key: "security", label: "Security", endpoint: "security/profile", icon: Shield },
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

async function fetchPlatformData(endpoint: string, range?: DashboardRange): Promise<PlatformPayload> {
  const token = localStorage.getItem("coach_sutra_token");
  const query = range ? `?${new URLSearchParams(range)}` : "";
  const response = await fetch(`/api/v1/platform/${endpoint}${query}`, {
    credentials: "same-origin",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || `Platform API request failed (${response.status})`);
  }
  return response.json() as Promise<PlatformPayload>;
}

function localDate(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function defaultDashboardRange(): DashboardRange {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  return { startDate: localDate(start), endDate: localDate(end) };
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${formatNumber(amount)}`;
  }
}

function formatMoneyTotals(totals: CurrencyTotal[]): string {
  if (!totals.length) return "0";
  return totals.map((total) => formatMoney(total.amount, total.currency)).join(" · ");
}

function MetricCard({ label, value, detail, icon: Icon }: { label: string; value: string; detail?: string; icon: LucideIcon }) {
  return (
    <Card className="min-w-0 shadow-sm">
      <CardContent className="flex min-h-28 items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 break-words text-xl font-semibold tracking-tight sm:text-2xl">{value}</p>
          {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
        </div>
        <span className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></span>
      </CardContent>
    </Card>
  );
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return <div className="mb-3"><h2 className="font-semibold tracking-tight">{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>;
}

function EmptyPanel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">{children}</div>;
}

type CreateAction = "institute" | "plan" | "announcement";
const createActionInfo: Record<CreateAction, { title: string; description: string; endpoint: string }> = {
  institute: { title: "Create institute", description: "Add an institute to the platform directory.", endpoint: "institutes" },
  plan: { title: "Create plan", description: "Set the pricing and capacity limits for a subscription plan.", endpoint: "plans" },
  announcement: { title: "Broadcast announcement", description: "Publish an in-app announcement for all institutes.", endpoint: "announcements" },
};

async function createPlatformRecord(endpoint: string, body: Record<string, unknown>) {
  const token = localStorage.getItem("coach_sutra_token");
  const response = await fetch(`/api/v1/platform/${endpoint}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(result.error || `Platform API request failed (${response.status})`);
  }
  return response.json();
}

function QuickActions() {
  const [activeAction, setActiveAction] = useState<CreateAction | null>(null);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ endpoint, body }: { endpoint: string; body: Record<string, unknown> }) => createPlatformRecord(endpoint, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["platform", "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["platform", activeAction ? createActionInfo[activeAction].endpoint : ""] }),
      ]);
      setActiveAction(null);
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeAction) return;
    const values = new FormData(event.currentTarget);
    const text = (key: string) => String(values.get(key) ?? "").trim();
    let body: Record<string, unknown>;
    if (activeAction === "institute") {
      body = {
        instituteName: text("instituteName"), instituteType: text("instituteType"), ownerName: text("ownerName"),
        email: text("email"), phone: text("phone"), plan: "basic", status: "active",
      };
    } else if (activeAction === "plan") {
      body = {
        name: text("name"), code: text("code"), currency: text("currency").toUpperCase(), description: text("description"),
        monthlyPrice: Number(text("monthlyPrice")), yearlyPrice: Number(text("yearlyPrice")),
        maxStudents: Number(text("maxStudents")), maxBranches: Number(text("maxBranches")), features: [],
      };
    } else {
      body = { title: text("title"), message: text("message"), audience: "all_institutes", status: "published", publishedAt: new Date().toISOString() };
    }
    mutation.mutate({ endpoint: createActionInfo[activeAction].endpoint, body });
  }

  const role = localStorage.getItem("coach_sutra_user_role") ?? "";
  const canCreateRecords = ["super_admin", "platform_admin"].includes(role);
  const canViewBilling = ["super_admin", "platform_admin", "finance_admin", "read_only_admin"].includes(role);
  const actions: Array<{ label: string; icon: LucideIcon; onClick?: () => void; href?: string }> = [
    ...(canCreateRecords ? [
      { label: "Create institute", icon: Building2, href: "/super-admin/institutes/new" },
      { label: "Create plan", icon: Plus, onClick: () => { mutation.reset(); setActiveAction("plan"); } },
      { label: "Broadcast announcement", icon: Megaphone, onClick: () => { mutation.reset(); setActiveAction("announcement"); } },
    ] : []),
    ...(canViewBilling ? [
      { label: "View subscriptions", icon: ClipboardList, href: "/super-admin/subscriptions" },
      { label: "View payments", icon: Banknote, href: "/super-admin/payments" },
    ] : []),
  ];
  if (!actions.length) return null;

  return (
    <>
      <section>
        <SectionTitle title="Quick actions" description="Create platform records or jump to billing operations." />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {actions.map(({ label, icon: Icon, onClick, href }) => href ? (
            <Button key={label} variant="outline" asChild className="h-auto justify-between py-3"><Link href={href}><span className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary" />{label}</span><ArrowUpRight className="h-4 w-4 text-muted-foreground" /></Link></Button>
          ) : (
            <Button key={label} variant="outline" onClick={onClick} className="h-auto justify-start py-3"><Icon className="h-4 w-4 text-primary" />{label}</Button>
          ))}
        </div>
      </section>
      <Dialog open={Boolean(activeAction)} onOpenChange={(open) => { if (!open) { setActiveAction(null); mutation.reset(); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {activeAction && <>
            <DialogHeader>
              <DialogTitle>{createActionInfo[activeAction].title}</DialogTitle>
              <DialogDescription>{createActionInfo[activeAction].description}</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              {activeAction === "institute" && <>
                <label className="block space-y-1.5 text-sm"><span>Institute name</span><Input name="instituteName" required autoFocus /></label>
                <label className="block space-y-1.5 text-sm"><span>Institute type</span><select name="instituteType" required className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="school">School</option><option value="coaching">Coaching</option><option value="computer_institute">Computer institute</option><option value="tuition_center">Tuition center</option><option value="academy">Academy</option></select></label>
                <label className="block space-y-1.5 text-sm"><span>Owner name</span><Input name="ownerName" required /></label>
                <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1.5 text-sm"><span>Email</span><Input name="email" type="email" required /></label><label className="block space-y-1.5 text-sm"><span>Phone</span><Input name="phone" required /></label></div>
              </>}
              {activeAction === "plan" && <>
                <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1.5 text-sm"><span>Plan name</span><Input name="name" required /></label><label className="block space-y-1.5 text-sm"><span>Code</span><Input name="code" required /></label></div>
                <label className="block space-y-1.5 text-sm"><span>Description</span><Input name="description" /></label>
                <div className="grid gap-3 sm:grid-cols-3"><label className="block space-y-1.5 text-sm"><span>Currency</span><Input name="currency" defaultValue="INR" required maxLength={3} /></label><label className="block space-y-1.5 text-sm"><span>Monthly price</span><Input name="monthlyPrice" type="number" min="0" step="0.01" defaultValue="0" required /></label><label className="block space-y-1.5 text-sm"><span>Yearly price</span><Input name="yearlyPrice" type="number" min="0" step="0.01" defaultValue="0" required /></label></div>
                <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1.5 text-sm"><span>Student limit</span><Input name="maxStudents" type="number" min="0" defaultValue="100" required /></label><label className="block space-y-1.5 text-sm"><span>Branch limit</span><Input name="maxBranches" type="number" min="0" defaultValue="1" required /></label></div>
              </>}
              {activeAction === "announcement" && <>
                <label className="block space-y-1.5 text-sm"><span>Title</span><Input name="title" required maxLength={160} /></label>
                <label className="block space-y-1.5 text-sm"><span>Message</span><textarea name="message" required rows={5} className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" /></label>
              </>}
              {mutation.error && <p role="alert" className="text-sm text-destructive">{mutation.error.message}</p>}
              <DialogFooter><Button type="button" variant="outline" onClick={() => setActiveAction(null)}>Cancel</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : activeAction === "announcement" ? "Publish announcement" : "Create"}</Button></DialogFooter>
            </form>
          </>}
        </DialogContent>
      </Dialog>
    </>
  );
}

function DateFilters({ draft, onDraftChange, onApply }: { draft: DashboardRange; onDraftChange: (range: DashboardRange) => void; onApply: () => void }) {
  return (
    <section className="rounded-xl border bg-background p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div><p className="text-sm font-medium">Growth and activity period</p><p className="mt-1 text-xs text-muted-foreground">Choose up to 366 days. Revenue cards use the current day, month, and year.</p></div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="grid gap-1 text-xs text-muted-foreground"><span>From</span><Input type="date" value={draft.startDate} max={draft.endDate} onChange={(event) => onDraftChange({ ...draft, startDate: event.target.value })} /></label>
          <label className="grid gap-1 text-xs text-muted-foreground"><span>To</span><Input type="date" value={draft.endDate} min={draft.startDate} onChange={(event) => onDraftChange({ ...draft, endDate: event.target.value })} /></label>
          <Button onClick={onApply}>Apply dates</Button>
        </div>
      </div>
    </section>
  );
}

const growthLines = [
  { key: "institutes", label: "Institutes", color: "#6366f1" },
  { key: "students", label: "Students", color: "#14b8a6" },
  { key: "users", label: "Users", color: "#f59e0b" },
  { key: "subscriptions", label: "Subscriptions", color: "#f43f5e" },
];

function TrendChart<T extends { date: string }>({ data, lines, emptyMessage }: {
  data: T[];
  lines: Array<{ key: string; label: string; color: string }>;
  emptyMessage: string;
}) {
  const hasData = data.some((point) => lines.some((line) => Number((point as Record<string, unknown>)[line.key]) > 0));
  if (!hasData) return <EmptyPanel>{emptyMessage}</EmptyPanel>;
  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={chartDate} minTickGap={24} tick={{ fontSize: 12 }} />
          <YAxis width={56} tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip labelFormatter={(value) => chartDate(String(value))} />
          <Legend />
          {lines.map((line) => <Line key={line.key} type="monotone" dataKey={line.key} name={line.label} stroke={line.color} strokeWidth={2} dot={false} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ActivityTable({ items }: { items: DashboardData["recentActivity"] }) {
  if (!items.length) return <EmptyPanel>No activity was recorded during the selected dates.</EmptyPanel>;
  return <Card className="shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground"><tr>{["Type", "Activity", "Amount", "When"].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead><tbody className="divide-y">{items.map((item) => <tr key={item.id} className="align-top"><td className="whitespace-nowrap px-4 py-3"><span className="rounded-full bg-muted px-2 py-1 text-xs capitalize">{item.type.replaceAll("_", " ")}</span></td><td className="max-w-xl px-4 py-3"><p className="font-medium">{item.title}</p><p className="mt-1 break-words text-xs text-muted-foreground">{item.description}</p></td><td className="whitespace-nowrap px-4 py-3">{item.amount !== undefined ? formatMoney(item.amount, item.currency || "INR") : "—"}</td><td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{new Date(item.occurredAt).toLocaleString()}</td></tr>)}</tbody></table></div></Card>;
}

function chartDate(value: string): string {
  const parts = value.split("-");
  return parts.length === 3 ? `${parts[1]}/${parts[2]}` : `${parts[1]}/${parts[0]?.slice(-2)}`;
}

function Overview({ data, draftRange, setDraftRange, applyRange }: {
  data: DashboardData; draftRange: DashboardRange; setDraftRange: (range: DashboardRange) => void; applyRange: () => void;
}) {
  const platformCards = [
    { label: "Total institutes", value: data.platform.institutes.total, detail: "All platform records", icon: Building2 },
    { label: "Active institutes", value: data.platform.institutes.active, detail: "Active and within expiry", icon: CheckCircle2 },
    { label: "Trial institutes", value: data.platform.institutes.trial, detail: "Institutes with a trial subscription", icon: Clock3 },
    { label: "Suspended institutes", value: data.platform.institutes.suspended, detail: "Inactive or suspended status", icon: ShieldAlert },
    { label: "Expired institutes", value: data.platform.institutes.expired, detail: "Marked expired or past expiry date", icon: AlertCircle },
    { label: "Total branches", value: data.platform.totalBranches, detail: "All branch records", icon: Landmark },
    { label: "Total students", value: data.platform.totalStudents, detail: "Student profiles", icon: GraduationCap },
    { label: "Total teachers", value: data.platform.totalTeachers, detail: "Teacher and faculty profiles", icon: UserRoundCheck },
    { label: "Total staff", value: data.platform.totalStaff, detail: "Staff profiles excluding teachers", icon: Users },
    { label: "Total parents", value: data.platform.totalParents, detail: "Parent accounts", icon: UserRound },
    { label: "Total active users", value: data.platform.totalActiveUsers, detail: "Unique users with a current session", icon: UserRoundCheck },
  ];
  const subscriptionCards = [
    { label: "Active subscriptions", value: data.subscriptions.active, icon: CheckCircle2, detail: "Current paid subscriptions" },
    { label: "Trial subscriptions", value: data.subscriptions.trial, icon: Clock3, detail: "Currently trialing" },
    { label: "Expiring soon", value: data.subscriptions.expiringSoon, icon: AlertCircle, detail: "Ends within 30 days" },
    { label: "Expired subscriptions", value: data.subscriptions.expired, icon: ShieldAlert, detail: "Expired or past end date" },
    { label: "Cancelled subscriptions", value: data.subscriptions.canceled, icon: ClipboardList, detail: "Marked cancelled" },
  ];
  const revenueCards = [
    { label: "Today's revenue", totals: data.revenue.today, icon: Banknote },
    { label: "This month", totals: data.revenue.thisMonth, icon: Receipt },
    { label: "This year", totals: data.revenue.thisYear, icon: TrendingUp },
    { label: "Pending payments", totals: data.revenue.pendingPayments, icon: Clock3 },
    { label: "Failed payments", totals: data.revenue.failedPayments, icon: AlertCircle },
    { label: "Refunds", totals: data.revenue.refunds, icon: Banknote },
  ];
  const growthCards = [
    { label: "New institutes", value: data.growth.newInstitutes, icon: Building2 },
    { label: "New students", value: data.growth.newStudents, icon: GraduationCap },
    { label: "New users", value: data.growth.newUsers, icon: Users },
    { label: "Subscription growth", value: data.growth.subscriptionGrowth, icon: TrendingUp },
  ];

  return (
    <div className="space-y-8">
      <QuickActions />
      <DateFilters draft={draftRange} onDraftChange={setDraftRange} onApply={applyRange} />

      <section>
        <SectionTitle title="Platform overview" description="Current platform footprint and account status." />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {platformCards.map((item) => <MetricCard key={item.label} label={item.label} value={formatNumber(item.value)} detail={item.detail} icon={item.icon} />)}
        </div>
      </section>

      <section>
        <SectionTitle title="Subscription overview" description="Subscription lifecycle counts from platform billing records." />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {subscriptionCards.map((item) => <MetricCard key={item.label} label={item.label} value={formatNumber(item.value)} detail={item.detail} icon={item.icon} />)}
        </div>
      </section>

      <section>
        <SectionTitle title="Revenue overview" description="Amounts stay grouped by currency so currencies are never added together." />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {revenueCards.map((item) => <MetricCard key={item.label} label={item.label} value={formatMoneyTotals(item.totals)} detail={`${formatNumber(item.totals.reduce((sum, total) => sum + total.count, 0))} payments`} icon={item.icon} />)}
        </div>
        <Card className="mt-4 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Collected revenue over selected dates</CardTitle></CardHeader>
          <CardContent>
            <TrendChart data={data.revenue.series} lines={data.revenue.currencies.map((currency, index) => ({ key: currency, label: currency, color: ["#6366f1", "#14b8a6", "#f59e0b", "#f43f5e"][index % 4] }))} emptyMessage="No successful payments were recorded in this date range." />
          </CardContent>
        </Card>
      </section>

      <section>
        <SectionTitle title="Growth" description={`${data.filters.startDate} through ${data.filters.endDate} · ${data.filters.interval === "month" ? "monthly" : "daily"} totals.`} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {growthCards.map((item) => <MetricCard key={item.label} label={item.label} value={formatNumber(item.value)} detail="Created during selected dates" icon={item.icon} />)}
        </div>
        <Card className="mt-4 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Platform growth by period</CardTitle></CardHeader>
          <CardContent>
            <TrendChart data={data.growth.series} lines={growthLines} emptyMessage="No new platform records were created in this date range." />
          </CardContent>
        </Card>
      </section>

      <section>
        <SectionTitle title="System health" description={`Checked ${new Date(data.systemHealth.checkedAt).toLocaleString()}.`} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.systemHealth.services.map((service) => {
            const isHealthy = service.status === "healthy" || service.status === "configured";
            const tone = isHealthy ? "bg-emerald-100 text-emerald-800" : service.status === "down" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800";
            const Icon = service.id === "database" || service.id === "storage" ? Database : service.id === "notifications" ? Bell : service.id === "backgroundJobs" ? Clock3 : Activity;
            return <Card key={service.id} className="shadow-sm"><CardContent className="flex items-start gap-3 p-4"><span className="rounded-lg bg-muted p-2"><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{service.label}</p><span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${tone}`}>{service.status.replaceAll("_", " ")}</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{service.detail}</p></div></CardContent></Card>;
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><SectionTitle title="Recent activity" description="Institute, subscription, payment, administrator, and security events." /></div><Link href="/super-admin/audit" className="text-sm font-medium text-primary hover:underline">Open audit log</Link></div>
        <ActivityTable items={data.recentActivity} />
      </section>
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
  const [draftRange, setDraftRange] = useState<DashboardRange>(defaultDashboardRange);
  const [dateRange, setDateRange] = useState<DashboardRange>(defaultDashboardRange);
  const sectionKey = location.split(/[?#]/, 1)[0].split("/").filter(Boolean)[1] ?? "dashboard";
  const section = sections.find((item) => item.key === sectionKey) ?? sections[0];
  const isDashboard = section.key === "dashboard";
  const query = useQuery({
    queryKey: isDashboard ? ["platform", section.endpoint, dateRange.startDate, dateRange.endDate] : ["platform", section.endpoint],
    queryFn: () => fetchPlatformData(section.endpoint, isDashboard ? dateRange : undefined),
  });
  const role = localStorage.getItem("coach_sutra_user_role")?.replaceAll("_", " ").toUpperCase() ?? "PLATFORM ADMIN";
  const { logout } = useAuth();

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
          <div className="flex items-center gap-2"><span className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium">{role}</span><button onClick={logout} className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted">Sign out</button></div>
        </header>
        {query.isPending ? (
          <div role="status" aria-live="polite" className="space-y-4"><Card><CardContent className="p-8 text-sm text-muted-foreground">Loading platform data…</CardContent></Card><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <Card key={index} className="h-28 animate-pulse bg-muted/40" />)}</div></div>
        ) : query.error ? (
          <Card><CardContent className="flex flex-col items-start gap-3 p-6 text-sm text-destructive"><div className="flex items-start gap-3"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{query.error.message}</span></div><Button variant="outline" onClick={() => void query.refetch()}>Retry</Button></CardContent></Card>
        ) : section.key === "dashboard" ? (
          <Overview data={query.data as DashboardData} draftRange={draftRange} setDraftRange={setDraftRange} applyRange={() => setDateRange(draftRange)} />
        ) : (
          <DataView sectionKey={section.key} data={query.data} />
        )}
      </main>
    </div>
  );
}
