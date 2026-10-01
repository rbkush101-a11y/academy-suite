import { useMemo, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive, CheckCircle2, Edit3, Filter, LoaderCircle, Package, Plus, RefreshCw,
  Search, ShieldOff, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

type Plan = {
  _id?: string;
  id?: string;
  code: string;
  name: string;
  description?: string;
  currency: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxStudents: number;
  maxBranches: number;
  features: string[];
  status: "active" | "archived";
  createdAt?: string;
  updatedAt?: string;
};

type Feature = {
  _id?: string;
  id?: string;
  key: string;
  name: string;
  description?: string;
  enabled?: boolean;
};

const token = () => localStorage.getItem("coach_sutra_token");
const platformRole = () => localStorage.getItem("coach_sutra_user_role") ?? "";

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

function planId(plan: Plan) {
  return String(plan._id ?? plan.id ?? "");
}

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currency} ${new Intl.NumberFormat().format(value)}`;
  }
}

function date(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(parsed);
}

function StatusBadge({ status }: { status: Plan["status"] }) {
  return status === "active"
    ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800"><CheckCircle2 className="h-3 w-3" />Active</span>
    : <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700"><Archive className="h-3 w-3" />Archived</span>;
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return <Card><CardContent className="flex flex-col items-center gap-3 p-10 text-center">
    <Package className="h-9 w-9 text-muted-foreground" />
    <div><p className="font-medium">No plans found</p><p className="mt-1 text-sm text-muted-foreground">Create your first SaaS subscription plan to make it available during institute setup.</p></div>
    <Button onClick={onCreate}><Plus className="mr-2 h-4 w-4" />Create plan</Button>
  </CardContent></Card>;
}

function PlanForm({
  initial,
  features,
  onSubmit,
  pending,
  error,
  onCancel,
}: {
  initial?: Plan;
  features: Feature[];
  onSubmit: (body: Record<string, unknown>) => void;
  pending: boolean;
  error?: Error | null;
  onCancel: () => void;
}) {
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(initial?.features ?? []);
  const editing = Boolean(initial);
  const enabledFeatures = features.filter((feature) => feature.enabled !== false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "").trim();
    onSubmit({
      name: text("name"),
      code: text("code").toLowerCase().replace(/\s+/g, "-"),
      description: text("description"),
      currency: text("currency").toUpperCase(),
      monthlyPrice: Number(text("monthlyPrice")),
      yearlyPrice: Number(text("yearlyPrice")),
      maxStudents: Number(text("maxStudents")),
      maxBranches: Number(text("maxBranches")),
      features: selectedFeatures,
      status: text("status"),
    });
  }

  return <form onSubmit={submit} className="space-y-4">
    {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error.message}</div>}
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm"><span>Plan name *</span><Input name="name" defaultValue={initial?.name ?? ""} required autoFocus /></label>
      <label className="grid gap-1.5 text-sm"><span>Plan code *</span><Input name="code" defaultValue={initial?.code ?? ""} required disabled={editing} placeholder="starter" /><span className="text-xs text-muted-foreground">{editing ? "Code cannot be changed after creation." : "Lowercase unique identifier."}</span></label>
    </div>
    <label className="grid gap-1.5 text-sm"><span>Description</span><textarea name="description" defaultValue={initial?.description ?? ""} rows={3} className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" /></label>
    <div className="grid gap-4 sm:grid-cols-3">
      <label className="grid gap-1.5 text-sm"><span>Currency *</span><Input name="currency" defaultValue={initial?.currency ?? "INR"} maxLength={3} required /></label>
      <label className="grid gap-1.5 text-sm"><span>Monthly price *</span><Input name="monthlyPrice" type="number" min="0" step="0.01" defaultValue={initial?.monthlyPrice ?? 0} required /></label>
      <label className="grid gap-1.5 text-sm"><span>Yearly price *</span><Input name="yearlyPrice" type="number" min="0" step="0.01" defaultValue={initial?.yearlyPrice ?? 0} required /></label>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm"><span>Maximum students *</span><Input name="maxStudents" type="number" min="0" step="1" defaultValue={initial?.maxStudents ?? 100} required /></label>
      <label className="grid gap-1.5 text-sm"><span>Maximum branches *</span><Input name="maxBranches" type="number" min="0" step="1" defaultValue={initial?.maxBranches ?? 1} required /></label>
    </div>
    <label className="grid gap-1.5 text-sm"><span>Status</span><select name="status" defaultValue={initial?.status ?? "active"} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="active">Active</option><option value="archived">Archived</option></select></label>

    <div className="space-y-2">
      <div><p className="text-sm font-medium">Features</p><p className="text-xs text-muted-foreground">These keys are stored with the plan and can be used by tenant feature gating.</p></div>
      {!enabledFeatures.length ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No enabled platform features are configured yet. You can create the plan now and add features later.</div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {enabledFeatures.map((feature) => {
            const checked = selectedFeatures.includes(feature.key);
            return <label key={feature.key} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-muted/30">
              <input type="checkbox" checked={checked} onChange={() => setSelectedFeatures((current) => checked ? current.filter((key) => key !== feature.key) : [...current, feature.key])} className="mt-1 h-4 w-4" />
              <span className="min-w-0"><span className="block text-sm font-medium">{feature.name}</span><span className="block text-xs text-muted-foreground">{feature.key}{feature.description ? ` · ${feature.description}` : ""}</span></span>
            </label>;
          })}
        </div>
      )}
    </div>

    <DialogFooter><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Saving…</> : editing ? "Save changes" : "Create plan"}</Button></DialogFooter>
  </form>;
}

export default function SuperAdminPlans() {
  const queryClient = useQueryClient();
  const canManage = ["super_admin", "platform_admin"].includes(platformRole());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Plan["status"]>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | undefined>();
  const [mutationError, setMutationError] = useState<Error | null>(null);

  const plans = useQuery({
    queryKey: ["platform", "plans", "management"],
    queryFn: () => api<Plan[]>("/plans"),
  });
  const features = useQuery({
    queryKey: ["platform", "features", "for-plan-form"],
    queryFn: () => api<Feature[]>("/features"),
  });

  const filteredPlans = useMemo(() => {
    const rows = plans.data ?? [];
    const query = search.trim().toLowerCase();
    return rows.filter((plan) => {
      const matchesSearch = !query || [plan.name, plan.code, plan.description].some((value) => String(value ?? "").toLowerCase().includes(query));
      const matchesStatus = statusFilter === "all" || plan.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [plans.data, search, statusFilter]);

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => api<Plan>("/plans", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["platform", "plans"] });
      setDialogOpen(false);
      setEditing(undefined);
      setMutationError(null);
    },
    onError: (error) => setMutationError(error instanceof Error ? error : new Error("Unable to create plan.")),
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => api<Plan>(`/plans/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["platform", "plans"] });
      setDialogOpen(false);
      setEditing(undefined);
      setMutationError(null);
    },
    onError: (error) => setMutationError(error instanceof Error ? error : new Error("Unable to update plan.")),
  });

  const archive = useMutation({
    mutationFn: (id: string) => api<void>(`/plans/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["platform", "plans"] });
      await queryClient.invalidateQueries({ queryKey: ["platform", "institute-management", "plans"] });
    },
  });

  const isSaving = create.isPending || update.isPending;

  function openCreate() {
    setMutationError(null);
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(plan: Plan) {
    setMutationError(null);
    setEditing(plan);
    setDialogOpen(true);
  }

  function submit(body: Record<string, unknown>) {
    setMutationError(null);
    if (editing) {
      const id = planId(editing);
      if (!id) return setMutationError(new Error("This plan has no valid identifier."));
      update.mutate({ id, body });
    } else {
      create.mutate(body);
    }
  }

  async function toggleStatus(plan: Plan) {
    const id = planId(plan);
    if (!id) return;
    try {
      await api<Plan>(`/plans/${id}`, { method: "PATCH", body: JSON.stringify({ status: plan.status === "active" ? "archived" : "active" }) });
      await queryClient.invalidateQueries({ queryKey: ["platform", "plans"] });
      await queryClient.invalidateQueries({ queryKey: ["platform", "institute-management", "plans"] });
    } catch (error) {
      setMutationError(error instanceof Error ? error : new Error("Unable to change plan status."));
    }
  }

  return <main className="min-h-screen bg-muted/30 px-4 py-6 sm:px-6 lg:px-10">
    <div className="mx-auto max-w-[1500px]">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/super-admin" className="text-xs text-muted-foreground hover:text-foreground">← Platform console</Link>
          <p className="mt-2 text-sm text-muted-foreground">SaaS billing configuration</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Plans</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Create and manage the subscription plans available to institutes.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/super-admin/institutes" className="rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted">Institute directory</Link>
          {canManage && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create plan</Button>}
        </div>
      </header>

      {!canManage && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Your platform role can view plans but cannot create or edit them.</div>}
      {mutationError && <div role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{mutationError.message}</div>}
      {archive.error && <div role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{archive.error instanceof Error ? archive.error.message : "Unable to archive plan."}</div>}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total plans</p><p className="mt-1 text-2xl font-semibold">{plans.data?.length ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active plans</p><p className="mt-1 text-2xl font-semibold">{plans.data?.filter((plan) => plan.status === "active").length ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Archived plans</p><p className="mt-1 text-2xl font-semibold">{plans.data?.filter((plan) => plan.status === "archived").length ?? 0}</p></CardContent></Card>
      </div>

      <Card className="mb-4"><CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_220px_auto]">
        <label className="relative"><span className="sr-only">Search plans</span><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search plan name, code or description…" className="pl-9" /></label>
        <label className="flex items-center gap-2 text-sm"><Filter className="h-4 w-4 text-muted-foreground" /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | Plan["status"])} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="all">All statuses</option><option value="active">Active</option><option value="archived">Archived</option></select></label>
        <Button variant="outline" onClick={() => void plans.refetch()} disabled={plans.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${plans.isFetching ? "animate-spin" : ""}`} />Refresh</Button>
      </CardContent></Card>

      {plans.isPending ? <Card><CardContent className="flex items-center gap-2 p-8 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Loading plans…</CardContent></Card>
        : plans.error ? <Card><CardContent className="flex flex-wrap items-center justify-between gap-3 p-8 text-sm text-destructive"><span>{plans.error instanceof Error ? plans.error.message : "Unable to load plans."}</span><Button variant="outline" onClick={() => void plans.refetch()}>Retry</Button></CardContent></Card>
        : !filteredPlans.length ? <EmptyState onCreate={openCreate} />
        : <Card><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground"><tr>{["Plan", "Pricing", "Limits", "Features", "Status", "Created", "Actions"].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead>
          <tbody className="divide-y">
            {filteredPlans.map((plan) => <tr key={planId(plan)} className="align-top hover:bg-muted/20">
              <td className="px-4 py-4"><p className="font-semibold">{plan.name}</p><p className="mt-1 text-xs text-muted-foreground">{plan.code}</p>{plan.description && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{plan.description}</p>}</td>
              <td className="px-4 py-4 whitespace-nowrap"><p>{money(plan.monthlyPrice, plan.currency)} / month</p><p className="mt-1 text-xs text-muted-foreground">{money(plan.yearlyPrice, plan.currency)} / year</p></td>
              <td className="px-4 py-4 whitespace-nowrap"><p>{new Intl.NumberFormat().format(plan.maxStudents)} students</p><p className="mt-1 text-xs text-muted-foreground">{new Intl.NumberFormat().format(plan.maxBranches)} branches</p></td>
              <td className="px-4 py-4"><div className="flex max-w-xs flex-wrap gap-1.5">{plan.features?.length ? plan.features.map((feature) => <span key={feature} className="rounded-full bg-muted px-2 py-1 text-xs">{feature}</span>) : <span className="text-xs text-muted-foreground">No features</span>}</div></td>
              <td className="px-4 py-4"><StatusBadge status={plan.status} /></td>
              <td className="px-4 py-4 whitespace-nowrap text-muted-foreground">{date(plan.createdAt)}</td>
              <td className="px-4 py-4"><div className="flex flex-wrap gap-2">
                {canManage && <Button size="sm" variant="outline" onClick={() => openEdit(plan)}><Edit3 className="mr-1.5 h-3.5 w-3.5" />Edit</Button>}
                {canManage && <Button size="sm" variant="outline" onClick={() => void toggleStatus(plan)}>{plan.status === "active" ? <><ShieldOff className="mr-1.5 h-3.5 w-3.5" />Archive</> : <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Activate</>}</Button>}
              </div></td>
            </tr>)}
          </tbody>
        </table></div></Card>}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditing(undefined); setMutationError(null); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit plan" : "Create plan"}</DialogTitle><DialogDescription>{editing ? "Update pricing, limits, features, or status." : "Define the pricing and capacity limits for a new subscription plan."}</DialogDescription></DialogHeader>
          <PlanForm initial={editing} features={features.data ?? []} onSubmit={submit} pending={isSaving} error={mutationError} onCancel={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  </main>;
}
