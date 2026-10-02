import { useMemo, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Edit3,
  Filter,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  ShieldOff,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Feature = {
  _id?: string;
  id?: string;
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
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

function featureId(feature: Feature) {
  return String(feature._id ?? feature.id ?? "");
}

function date(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(parsed);
}

function StatusBadge({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
      <CheckCircle2 className="h-3 w-3" />
      Enabled
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
      <XCircle className="h-3 w-3" />
      Disabled
    </span>
  );
}

function FeatureForm({
  initial,
  onSubmit,
  pending,
  error,
  onCancel,
}: {
  initial?: Feature;
  onSubmit: (body: Record<string, unknown>) => void;
  pending: boolean;
  error?: Error | null;
  onCancel: () => void;
}) {
  const editing = Boolean(initial);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "").trim();

    onSubmit({
      name: text("name"),
      ...(editing ? {} : {
        key: text("key").toLowerCase().replace(/\s+/g, "_"),
      }),
      description: text("description"),
      enabled: text("enabled") === "true",
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error.message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm">
          <span>Feature name *</span>
          <Input
            name="name"
            defaultValue={initial?.name ?? ""}
            placeholder="Student Management"
            required
            autoFocus
          />
        </label>

        <label className="grid gap-1.5 text-sm">
          <span>Feature key *</span>
          <Input
            name="key"
            defaultValue={initial?.key ?? ""}
            placeholder="student_management"
            required
            disabled={editing}
          />
          <span className="text-xs text-muted-foreground">
            {editing
              ? "Feature key cannot be changed after creation."
              : "Use lowercase letters, numbers and underscores."}
          </span>
        </label>
      </div>

      <label className="grid gap-1.5 text-sm">
        <span>Description</span>
        <textarea
          name="description"
          defaultValue={initial?.description ?? ""}
          rows={3}
          placeholder="Manage students and student records."
          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </label>

      <label className="grid gap-1.5 text-sm">
        <span>Status</span>
        <select
          name="enabled"
          defaultValue={initial?.enabled === false ? "false" : "true"}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="true">Enabled</option>
          <option value="false">Disabled</option>
        </select>
      </label>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : editing ? (
            "Save changes"
          ) : (
            "Create feature"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
        <Sparkles className="h-9 w-9 text-muted-foreground" />
        <div>
          <p className="font-medium">No platform features found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first platform feature so plans can use feature gating.
          </p>
        </div>
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create feature
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SuperAdminFeatures() {
  const queryClient = useQueryClient();
  const canManage = ["super_admin", "platform_admin"].includes(platformRole());

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Feature | undefined>();
  const [mutationError, setMutationError] = useState<Error | null>(null);

  const features = useQuery({
    queryKey: ["platform", "features", "management"],
    queryFn: () => api<Feature[]>("/features"),
  });

  const filteredFeatures = useMemo(() => {
    const rows = features.data ?? [];
    const query = search.trim().toLowerCase();

    return rows.filter((feature) => {
      const matchesSearch =
        !query ||
        [feature.name, feature.key, feature.description]
          .some((value) => String(value ?? "").toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "enabled" && feature.enabled !== false) ||
        (statusFilter === "disabled" && feature.enabled === false);

      return matchesSearch && matchesStatus;
    });
  }, [features.data, search, statusFilter]);

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<Feature>("/features", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["platform", "features"] });
      setDialogOpen(false);
      setEditing(undefined);
      setMutationError(null);
    },
    onError: (error) => {
      setMutationError(
        error instanceof Error ? error : new Error("Unable to create feature.")
      );
    },
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api<Feature>(`/features/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["platform", "features"] });
      await queryClient.invalidateQueries({ queryKey: ["platform", "features", "for-plan-form"] });
      setDialogOpen(false);
      setEditing(undefined);
      setMutationError(null);
    },
    onError: (error) => {
      setMutationError(
        error instanceof Error ? error : new Error("Unable to update feature.")
      );
    },
  });

  const isSaving = create.isPending || update.isPending;

  function openCreate() {
    setMutationError(null);
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(feature: Feature) {
    setMutationError(null);
    setEditing(feature);
    setDialogOpen(true);
  }

  function submit(body: Record<string, unknown>) {
    setMutationError(null);

    if (editing) {
      const id = featureId(editing);
      if (!id) {
        setMutationError(new Error("This feature has no valid identifier."));
        return;
      }
      update.mutate({ id, body });
    } else {
      create.mutate(body);
    }
  }

  async function toggleFeature(feature: Feature) {
    const id = featureId(feature);
    if (!id) return;

    try {
      await api<Feature>(`/features/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: feature.enabled === false }),
      });

      await queryClient.invalidateQueries({ queryKey: ["platform", "features"] });
      await queryClient.invalidateQueries({ queryKey: ["platform", "features", "for-plan-form"] });
    } catch (error) {
      setMutationError(
        error instanceof Error ? error : new Error("Unable to change feature status.")
      );
    }
  }

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/super-admin"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ← Platform console
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">
              Platform administration
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Features
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Create and manage platform features used for SaaS plan feature gating.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/super-admin/plans"
              className="rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
            >
              Manage plans
            </Link>

            {canManage && (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create feature
              </Button>
            )}
          </div>
        </header>

        {!canManage && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Your platform role can view features but cannot create or edit them.
          </div>
        )}

        {mutationError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {mutationError.message}
          </div>
        )}

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total features</p>
              <p className="mt-1 text-2xl font-semibold">
                {features.data?.length ?? 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Enabled</p>
              <p className="mt-1 text-2xl font-semibold">
                {features.data?.filter((feature) => feature.enabled !== false).length ?? 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Disabled</p>
              <p className="mt-1 text-2xl font-semibold">
                {features.data?.filter((feature) => feature.enabled === false).length ?? 0}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-4">
          <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_220px_auto]">
            <label className="relative">
              <span className="sr-only">Search features</span>
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search feature name, key or description…"
                className="pl-9"
              />
            </label>

            <label className="flex items-center gap-2 text-sm">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as "all" | "enabled" | "disabled")
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">All statuses</option>
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </label>

            <Button
              variant="outline"
              onClick={() => void features.refetch()}
              disabled={features.isFetching}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${features.isFetching ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </CardContent>
        </Card>

        {features.isPending ? (
          <Card>
            <CardContent className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading features…
            </CardContent>
          </Card>
        ) : features.error ? (
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-8 text-sm text-destructive">
              <span>
                {features.error instanceof Error
                  ? features.error.message
                  : "Unable to load features."}
              </span>
              <Button variant="outline" onClick={() => void features.refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : !filteredFeatures.length ? (
          <EmptyState onCreate={openCreate} />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    {["Feature", "Key", "Description", "Status", "Created", "Actions"].map(
                      (heading) => (
                        <th key={heading} className="px-4 py-3 font-semibold">
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filteredFeatures.map((feature) => (
                    <tr
                      key={featureId(feature)}
                      className="align-top hover:bg-muted/20"
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold">{feature.name}</p>
                      </td>

                      <td className="px-4 py-4">
                        <code className="rounded bg-muted px-2 py-1 text-xs">
                          {feature.key}
                        </code>
                      </td>

                      <td className="px-4 py-4">
                        <p className="max-w-md text-sm text-muted-foreground">
                          {feature.description || "—"}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge enabled={feature.enabled !== false} />
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">
                        {date(feature.createdAt)}
                      </td>

                      <td className="px-4 py-4">
                        {canManage && (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEdit(feature)}
                            >
                              <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                              Edit
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void toggleFeature(feature)}
                            >
                              {feature.enabled !== false ? (
                                <>
                                  <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
                                  Disable
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                  Enable
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditing(undefined);
              setMutationError(null);
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit feature" : "Create feature"}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? "Update the feature name, description, or status."
                  : "Create a platform feature that can later be assigned to subscription plans."}
              </DialogDescription>
            </DialogHeader>

            <FeatureForm
              initial={editing}
              onSubmit={submit}
              pending={isSaving}
              error={mutationError}
              onCancel={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
