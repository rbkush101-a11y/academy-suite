import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  KeyRound,
  Loader2,
  Pencil,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Account = {
  id: string;
  name: string;
  loginId: string;
  email: string;
  phone: string;
  isApproved: boolean;
};

type Child = {
  id: string;
  name: string;
  enrollmentNo: string;
  className: string;
  section: string;
  academicYear: string;
  status: string;
  photoDataUrl: string;
  batchName: string;
};

type Family = {
  id: string;
  father: { name: string; phone: string; account: Account | null };
  mother: { name: string; phone: string; account: Account | null };
  children: Child[];
};

type StudentOption = {
  id: string;
  name: string;
  enrollmentNo: string;
  className: string;
  section: string;
  status: string;
  batchName: string;
};

type FamiliesResponse = {
  families: Family[];
  students: StudentOption[];
};

type ParentRelation = "father" | "mother";

const token = () => localStorage.getItem("coach_sutra_token") || "";

const getSelectedInstituteId = () => localStorage.getItem("foundation_institute_id") || "";

const roleFromToken = () => {
  try {
    const raw = token().split(".")[1];
    if (!raw) return "";
    const json = atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
    return String(JSON.parse(json)?.role || "");
  } catch {
    return "";
  }
};

function requestUrl(path: string) {
  const role = roleFromToken();
  const instituteId = getSelectedInstituteId();
  if (role === "super_admin" && instituteId) {
    return `${path}${path.includes("?") ? "&" : "?"}instituteId=${encodeURIComponent(instituteId)}`;
  }
  return path;
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${token()}`);
  if (options.body !== undefined && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  let body = options.body;
  if (roleFromToken() === "super_admin" && getSelectedInstituteId() && typeof body === "string") {
    try {
      const parsed = JSON.parse(body);
      parsed.instituteId = getSelectedInstituteId();
      body = JSON.stringify(parsed);
    } catch {
      // Keep non-JSON bodies unchanged.
    }
  }

  const response = await fetch(requestUrl(path), { ...options, headers, body });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || `Request failed (${response.status})`);
  return payload as T;
}

const clean = (value: unknown) => String(value ?? "").trim();

const initials = (value?: string) =>
  clean(value || "P")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const childClass = (child: { className?: string; section?: string }) => {
  const cls = clean(child.className);
  const section = clean(child.section);
  if (cls && section) return `Class ${cls} • ${section}`;
  if (cls) return `Class ${cls}`;
  return "Class not assigned";
};

function shortLogin(name: string, phone: string) {
  const first = clean(name).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 7) || "parent";
  const digits = clean(phone).replace(/\D/g, "").slice(-4) || String(Math.floor(1000 + Math.random() * 9000));
  return `${first}${digits}@parent.app`;
}

function strongPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "@#";
  const pool = upper + lower + digits + symbols;
  const pick = (value: string) => value[Math.floor(Math.random() * value.length)];
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (chars.length < 10) chars.push(pick(pool));
  return chars.sort(() => Math.random() - 0.5).join("");
}


type SearchableDropdownProps = {
  value: string;
  options: string[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  onChange: (value: string) => void;
};

function SearchableDropdown({
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  onChange,
}: SearchableDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const visibleOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.toLowerCase().includes(needle));
  }, [options, query]);

  const choose = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          setQuery("");
        }}
        className={`flex h-11 w-full items-center justify-between rounded-md border bg-white px-3 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
          open ? "border-blue-400 ring-2 ring-blue-500/10" : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <span className={value ? "truncate font-semibold text-slate-900" : "truncate text-slate-500"}>
          {value || placeholder}
        </span>
        <div className="ml-2 flex shrink-0 items-center gap-1">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                choose("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  choose("");
                }
              }}
              className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label={`Clear ${placeholder}`}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-10 border-slate-200 pl-9"
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setOpen(false);
                    setQuery("");
                  }
                }}
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-1.5">
            <button
              type="button"
              onClick={() => choose("")}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                !value ? "bg-blue-50 font-bold text-blue-700" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span>{placeholder}</span>
              {!value && <Check className="h-4 w-4" />}
            </button>

            {visibleOptions.map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => choose(option)}
                className={`mt-0.5 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  value === option ? "bg-blue-50 font-bold text-blue-700" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="truncate">{option}</span>
                {value === option && <Check className="h-4 w-4 shrink-0" />}
              </button>
            ))}

            {visibleOptions.length === 0 && (
              <div className="px-3 py-6 text-center">
                <Search className="mx-auto h-5 w-5 text-slate-300" />
                <p className="mt-2 text-xs font-semibold text-slate-500">{emptyText}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ParentsPage() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");

  const [childrenFamily, setChildrenFamily] = useState<Family | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [childrenSearch, setChildrenSearch] = useState("");
  const [childrenBusy, setChildrenBusy] = useState(false);
  const [childrenError, setChildrenError] = useState("");

  const [loginFamily, setLoginFamily] = useState<Family | null>(null);
  const [loginRelation, setLoginRelation] = useState<ParentRelation>("father");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [accountActive, setAccountActive] = useState(true);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await api<FamiliesResponse>("/api/parents/families");
      setFamilies(Array.isArray(payload.families) ? payload.families : []);
      setStudents(Array.isArray(payload.students) ? payload.students : []);
    } catch (cause: any) {
      setError(cause?.message || "Unable to load parent families.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const classOptions = useMemo(
    () =>
      [...new Set(students.map((student) => clean(student.className)).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
      ),
    [students],
  );

  const batchOptions = useMemo(
    () =>
      [...new Set(students.map((student) => clean(student.batchName)).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
      ),
    [students],
  );

  const filteredFamilies = useMemo(() => {
    const needle = search.toLowerCase().trim();
    return families.filter((family) => {
      const familyText = [
        family.father.name,
        family.father.phone,
        family.mother.name,
        family.mother.phone,
        ...family.children.flatMap((child) => [child.name, child.enrollmentNo, child.className, child.section, child.batchName]),
      ]
        .join(" ")
        .toLowerCase();

      if (needle && !familyText.includes(needle)) return false;
      if (classFilter && !family.children.some((child) => clean(child.className) === classFilter)) return false;
      if (batchFilter && !family.children.some((child) => clean(child.batchName) === batchFilter)) return false;
      return true;
    });
  }, [families, search, classFilter, batchFilter]);

  const openChildren = (family: Family) => {
    setChildrenFamily(family);
    setSelectedStudentIds(family.children.map((child) => child.id));
    setChildrenSearch("");
    setChildrenError("");
  };

  const saveChildren = async () => {
    if (!childrenFamily) return;
    if (!selectedStudentIds.length) {
      setChildrenError("At least one child link karo.");
      return;
    }
    setChildrenBusy(true);
    setChildrenError("");
    try {
      await api(`/api/parents/families/${childrenFamily.id}/children`, {
        method: "PUT",
        body: JSON.stringify({ studentIds: selectedStudentIds }),
      });
      setChildrenFamily(null);
      await load();
    } catch (cause: any) {
      setChildrenError(cause?.message || "Unable to update children.");
    } finally {
      setChildrenBusy(false);
    }
  };

  const openLogin = (family: Family, relation: ParentRelation) => {
    const parent = relation === "father" ? family.father : family.mother;
    setLoginFamily(family);
    setLoginRelation(relation);
    setLoginId(parent.account?.loginId || shortLogin(parent.name, parent.phone));
    setPassword("");
    setAccountActive(parent.account?.isApproved ?? true);
    setLoginError("");
  };

  const parentForLogin = loginFamily ? (loginRelation === "father" ? loginFamily.father : loginFamily.mother) : null;

  const saveLogin = async () => {
    if (!loginFamily || !parentForLogin) return;
    if (!loginId.trim()) {
      setLoginError("Login ID required hai.");
      return;
    }
    if (!parentForLogin.account && !password) {
      setLoginError("New account ke liye password required hai.");
      return;
    }

    setLoginBusy(true);
    setLoginError("");
    try {
      await api(`/api/parents/families/${loginFamily.id}/login`, {
        method: "POST",
        body: JSON.stringify({
          relation: loginRelation,
          loginId: loginId.trim(),
          password,
          isApproved: accountActive,
        }),
      });
      setLoginFamily(null);
      await load();
    } catch (cause: any) {
      setLoginError(cause?.message || "Unable to save login.");
    } finally {
      setLoginBusy(false);
    }
  };

  const visibleStudents = useMemo(() => {
    const needle = childrenSearch.trim().toLowerCase();
    if (!needle) return students;
    return students.filter((student) =>
      [student.name, student.enrollmentNo, student.className, student.section, student.batchName]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [students, childrenSearch]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#07152f_0%,#0b2557_56%,#3b2fc2_100%)] p-6 text-white shadow-xl md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.15em] text-cyan-200">
                <UsersRound className="h-4 w-4" /> Family & Parent Management
              </div>
              <h1 className="mt-4 text-3xl font-black md:text-4xl">Parents</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Ek family card me Father + Mother rakho, children exact Student IDs se link karo, aur dono parent logins ko same children access do.
              </p>
            </div>
            <Button onClick={() => void load()} variant="secondary" className="rounded-xl bg-white text-slate-900 hover:bg-slate-100">
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </div>
        </section>

        <section className="mt-5 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search father, mother, child, phone..." className="h-11 pl-10" />
            </div>
            <SearchableDropdown
              value={classFilter}
              options={classOptions}
              placeholder="All Classes"
              searchPlaceholder="Search class..."
              emptyText="No matching class found"
              onChange={setClassFilter}
            />
            <SearchableDropdown
              value={batchFilter}
              options={batchOptions}
              placeholder="All Batches"
              searchPlaceholder="Search batch..."
              emptyText="No matching batch found"
              onChange={setBatchFilter}
            />
          </div>
          {(classFilter || batchFilter) && (
            <button onClick={() => { setClassFilter(""); setBatchFilter(""); }} className="mt-3 text-xs font-bold text-blue-600 hover:underline">Clear class/batch filters</button>
          )}
        </section>

        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
        ) : error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">{error}</div>
        ) : (
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            {filteredFamilies.map((family) => (
              <article key={family.id} className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#f8fbff,#eef4ff)] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-blue-600">Family Card</p>
                      <h2 className="mt-1 text-xl font-black text-slate-950">
                        {family.father.name || family.mother.name || "Parent Family"}
                      </h2>
                    </div>
                    <div className="rounded-2xl bg-blue-600 px-3 py-2 text-center text-white">
                      <p className="text-lg font-black leading-none">{family.children.length}</p>
                      <p className="mt-1 text-[9px] font-bold uppercase">Children</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 p-5 md:grid-cols-2">
                  {(["father", "mother"] as ParentRelation[]).map((relation) => {
                    const parent = relation === "father" ? family.father : family.mother;
                    const label = relation === "father" ? "Father" : "Mother";
                    return (
                      <div key={relation} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white font-black text-blue-700 shadow-sm">{initials(parent.name || label)}</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-black text-slate-950">{parent.name || `${label} name missing`}</p>
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-black uppercase text-slate-600">{label}</span>
                            </div>
                            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Phone className="h-3.5 w-3.5" /> {parent.phone || "Phone missing"}</p>
                          </div>
                        </div>

                        {parent.account ? (
                          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Login {parent.account.isApproved ? "Active" : "Inactive"}</p>
                                <p className="mt-1 truncate text-xs font-semibold text-slate-700">{parent.account.loginId}</p>
                              </div>
                              <Button size="sm" variant="outline" onClick={() => openLogin(family, relation)} className="h-8 rounded-lg bg-white px-2 text-[10px] font-black"><Pencil className="mr-1 h-3 w-3" /> Manage</Button>
                            </div>
                          </div>
                        ) : (
                          <Button disabled={!parent.name} onClick={() => openLogin(family, relation)} className="mt-3 h-9 w-full rounded-xl bg-slate-950 text-xs font-black">
                            <KeyRound className="mr-2 h-4 w-4" /> Create {label} Login
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Linked Children</p>
                      <p className="mt-1 text-xs text-slate-400">Father aur Mother dono accounts ko yahi child list milegi.</p>
                    </div>
                    <Button onClick={() => openChildren(family)} variant="outline" className="rounded-xl text-xs font-black">
                      <UsersRound className="mr-2 h-4 w-4" /> Manage Children
                    </Button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {family.children.map((child) => (
                      <div key={child.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-xs font-black text-blue-700">
                          {child.photoDataUrl ? <img src={child.photoDataUrl} alt="" className="h-full w-full object-cover" /> : initials(child.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-slate-950">{child.name}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500">{child.enrollmentNo || "No enrollment"} • {childClass(child)}{child.batchName ? ` • ${child.batchName}` : ""}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    ))}
                    {family.children.length === 0 && <div className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-700">No children linked.</div>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Dialog open={Boolean(childrenFamily)} onOpenChange={(open) => !open && setChildrenFamily(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden p-0">
          <DialogHeader className="border-b border-slate-100 px-6 py-5">
            <DialogTitle>Manage Linked Children</DialogTitle>
            <DialogDescription>
              Selected children Father aur Mother dono ke Parent App me show honge.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto px-6 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={childrenSearch} onChange={(event) => setChildrenSearch(event.target.value)} placeholder="Search student, enrollment, class, batch..." className="pl-10" />
            </div>
            <div className="mt-4 space-y-2">
              {visibleStudents.map((student) => {
                const checked = selectedStudentIds.includes(student.id);
                return (
                  <button
                    type="button"
                    key={student.id}
                    onClick={() => setSelectedStudentIds((current) => checked ? current.filter((id) => id !== student.id) : [...current, student.id])}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${checked ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}
                  >
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${checked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"}`}>{checked && <Check className="h-4 w-4" />}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-950">{student.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{student.enrollmentNo} • {childClass(student)}{student.batchName ? ` • ${student.batchName}` : ""}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="border-t border-slate-100 bg-white px-6 py-4">
            {childrenError && <p className="mb-3 text-xs font-semibold text-red-600">{childrenError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setChildrenFamily(null)}>Cancel</Button>
              <Button onClick={() => void saveChildren()} disabled={childrenBusy}>
                {childrenBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save {selectedStudentIds.length} Children
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(loginFamily)} onOpenChange={(open) => !open && setLoginFamily(null)}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{parentForLogin?.account ? "Manage" : "Create"} {loginRelation === "father" ? "Father" : "Mother"} Login</DialogTitle>
            <DialogDescription>
              Is account ko family ke {loginFamily?.children.length ?? 0} linked children automatically milenge.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white font-black text-blue-700"><UserRound className="h-5 w-5" /></div>
              <div><p className="font-black text-slate-950">{parentForLogin?.name || "Parent"}</p><p className="text-xs text-slate-500">{parentForLogin?.phone || "Phone missing"}</p></div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Login ID</Label>
                <button type="button" onClick={() => parentForLogin && setLoginId(shortLogin(parentForLogin.name, parentForLogin.phone))} className="text-xs font-black text-blue-600">Auto Generate</button>
              </div>
              <Input value={loginId} onChange={(event) => setLoginId(event.target.value)} autoComplete="off" />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>{parentForLogin?.account ? "New Password (optional)" : "Temporary Password"}</Label>
                <button type="button" onClick={() => setPassword(strongPassword())} className="text-xs font-black text-blue-600">Auto Generate</button>
              </div>
              <Input value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder={parentForLogin?.account ? "Blank = keep current password" : "Generate or enter password"} />
              <p className="mt-1 text-[11px] text-slate-400">8+ chars, uppercase, lowercase and number.</p>
            </div>

            <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <div><p className="text-sm font-black text-slate-900">Account Active</p><p className="text-xs text-slate-500">Inactive account login nahi kar payega.</p></div>
              <input type="checkbox" checked={accountActive} onChange={(event) => setAccountActive(event.target.checked)} className="h-5 w-5" />
            </label>

            <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-700">
              <ShieldCheck className="mr-1 inline h-4 w-4" /> Same family ke linked children automatically sync rahenge.
            </div>
          </div>

          {loginError && <p className="text-xs font-semibold text-red-600">{loginError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setLoginFamily(null)}>Cancel</Button>
            <Button onClick={() => void saveLogin()} disabled={loginBusy}>
              {loginBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {parentForLogin?.account ? "Save Changes" : "Create Parent Login"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
