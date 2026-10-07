import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Search,
  Settings2,
  ShieldCheck,
  UserRound,
  Users,
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

type FamilyAccount = {
  id: string;
  name: string;
  loginId: string;
  email: string;
  phone: string;
  isApproved: boolean;
};

type FamilyContact = {
  name: string;
  phone: string;
};

type FamilyChild = {
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

type FamilyRecord = {
  id: string;
  father: FamilyContact;
  mother: FamilyContact;
  account: FamilyAccount | null;
  children: FamilyChild[];
};

type FamiliesResponse = {
  families: FamilyRecord[];
  students: FamilyChild[];
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function isLegacyParentEmail(value: unknown) {
  const email = text(value).toLowerCase();
  return email.endsWith("@parent.app");
}

function apiRoot() {
  const configured = String(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
  return configured.endsWith("/api") ? configured : `${configured}/api`;
}

function tokenPayload() {
  try {
    const token = localStorage.getItem("coach_sutra_token") || "";
    const encoded = token.split(".")[1];
    if (!encoded) return {} as Record<string, string>;
    return JSON.parse(
      atob(encoded.replace(/-/g, "+").replace(/_/g, "/")),
    ) as Record<string, string>;
  } catch {
    return {} as Record<string, string>;
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const payload = tokenPayload();
  const selectedInstitute =
    localStorage.getItem("foundation_institute_id") || "";
  const token =
    localStorage.getItem("coach_sutra_token") || "";

  let requestPath = path;

  if (
    payload.role === "super_admin" &&
    selectedInstitute &&
    !requestPath.includes("instituteId=")
  ) {
    requestPath = `${requestPath}${requestPath.includes("?") ? "&" : "?"}instituteId=${encodeURIComponent(selectedInstitute)}`;
  }

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`,
    );
  }

  if (
    options.body !== undefined &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  const response = await fetch(
    `${apiRoot()}${requestPath}`,
    {
      ...options,
      headers,
    },
  );

  const data =
    await response
      .json()
      .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error ||
        `Request failed (${response.status})`,
    );
  }

  return data as T;
}

function childClassLabel(child: FamilyChild) {
  if (child.className && child.section) {
    return `Class ${child.className} • ${child.section}`;
  }
  if (child.className) {
    return `Class ${child.className}`;
  }
  return "Class not assigned";
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) =>
        part[0]?.toUpperCase(),
      )
      .join("") || "P"
  );
}

function randomIndex(length: number) {
  try {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.getRandomValues ===
        "function"
    ) {
      const array =
        new Uint32Array(1);

      crypto.getRandomValues(
        array,
      );

      return (
        array[0] %
        length
      );
    }
  } catch {
    // Fallback below.
  }

  return Math.floor(
    Math.random() * length,
  );
}

function generateStrongPassword() {
  const upper =
    "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower =
    "abcdefghijkmnopqrstuvwxyz";
  const digits =
    "23456789";
  const symbols =
    "@#$!";
  const all =
    upper +
    lower +
    digits +
    symbols;

  const pick = (
    chars: string,
  ) =>
    chars[
      randomIndex(chars.length)
    ];

  const chars = [
    pick(upper),
    pick(lower),
    pick(digits),
    pick(symbols),
  ];

  while (
    chars.length < 10
  ) {
    chars.push(
      pick(all),
    );
  }

  for (
    let index =
      chars.length - 1;
    index > 0;
    index -= 1
  ) {
    const swapIndex =
      randomIndex(
        index + 1,
      );

    [
      chars[index],
      chars[swapIndex],
    ] = [
      chars[swapIndex],
      chars[index],
    ];
  }

  return chars.join("");
}

function StudentAvatar({
  child,
}: {
  child: FamilyChild;
}) {
  if (child.photoDataUrl) {
    return (
      <img
        src={child.photoDataUrl}
        alt={child.name}
        className="h-11 w-11 shrink-0 rounded-xl object-cover"
      />
    );
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-xs font-black text-slate-600">
      {initials(
        child.name,
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {hint}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function SearchableFilter({
  label,
  value,
  options,
  allLabel,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  allLabel: string;
  onChange: (
    value: string,
  ) => void;
}) {
  const [open, setOpen] =
    useState(false);
  const [query, setQuery] =
    useState("");

  const selectedLabel =
    value === "all"
      ? allLabel
      : value;

  useEffect(() => {
    if (!open) {
      setQuery(
        selectedLabel,
      );
    }
  }, [
    open,
    selectedLabel,
  ]);

  const visible =
    options.filter(
      (option) =>
        option
          .toLowerCase()
          .includes(
            query
              .trim()
              .toLowerCase(),
          ),
    );

  return (
    <div className="relative">
      <Label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </Label>
      <Input
        value={query}
        autoComplete="off"
        onFocus={(event) => {
          setOpen(true);
          if (
            value === "all"
          ) {
            setQuery("");
          } else {
            event.currentTarget.select();
          }
        }}
        onChange={(event) => {
          setQuery(
            event.target.value,
          );
          setOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(
            () => {
              setOpen(false);
              setQuery(
                selectedLabel,
              );
            },
            140,
          );
        }}
        className="h-11 rounded-xl border-slate-200 bg-white text-sm font-semibold text-slate-700"
      />

      {open ? (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          <button
            type="button"
            onMouseDown={(
              event,
            ) => {
              event.preventDefault();
              onChange(
                "all",
              );
              setQuery(
                allLabel,
              );
              setOpen(
                false,
              );
            }}
            className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold ${
              value === "all"
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            {allLabel}
          </button>

          {visible.map(
            (option) => (
              <button
                key={
                  option
                }
                type="button"
                onMouseDown={(
                  event,
                ) => {
                  event.preventDefault();
                  onChange(
                    option,
                  );
                  setQuery(
                    option,
                  );
                  setOpen(
                    false,
                  );
                }}
                className={`mt-1 flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold ${
                  value ===
                  option
                    ? "bg-cyan-50 text-cyan-800"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {option}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

function ContactBox({
  relation,
  contact,
}: {
  relation:
    | "Father"
    | "Mother";
  contact: FamilyContact;
}) {
  const hasContact =
    Boolean(
      contact.name ||
        contact.phone,
    );

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#081321] text-xs font-black text-cyan-300">
          {initials(
            contact.name ||
              relation,
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-indigo-700">
              {relation}
            </span>
          </div>

          <p className="mt-2 truncate text-sm font-black text-slate-950">
            {contact.name ||
              `${relation} name not added`}
          </p>

          {contact.phone ? (
            <a
              href={`tel:${contact.phone.replace(/\s+/g, "")}`}
              className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-700"
            >
              <Phone className="h-3.5 w-3.5" />
              {contact.phone}
            </a>
          ) : (
            <p className="mt-1.5 text-xs font-semibold text-amber-700">
              Phone missing
            </p>
          )}

          {!hasContact ? (
            <p className="mt-2 text-[11px] font-medium text-slate-400">
              Add details in the student record.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function Parents() {
  const [, setLocation] =
    useLocation();

  const [
    families,
    setFamilies,
  ] = useState<
    FamilyRecord[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    classFilter,
    setClassFilter,
  ] = useState("all");

  const [
    batchFilter,
    setBatchFilter,
  ] = useState("all");

  const [
    loginFamily,
    setLoginFamily,
  ] =
    useState<FamilyRecord | null>(
      null,
    );

  const [
    loginForm,
    setLoginForm,
  ] = useState({
    email: "",
    password: "",
    isApproved: true,
  });

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    savingLogin,
    setSavingLogin,
  ] = useState(false);

  const [
    loginError,
    setLoginError,
  ] = useState("");

  const load =
    async () => {
      setLoading(true);
      setError("");

      try {
        const data =
          await apiRequest<FamiliesResponse>(
            "/parents/families",
          );

        setFamilies(
          Array.isArray(
            data.families,
          )
            ? data.families
            : [],
        );
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not load parent families.",
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    void load();
  }, []);

  const classOptions =
    useMemo(() => {
      return [
        ...new Set(
          families.flatMap(
            (family) =>
              family.children
                .map(
                  (child) =>
                    childClassLabel(
                      child,
                    ),
                )
                .filter(
                  Boolean,
                ),
          ),
        ),
      ].sort();
    }, [families]);

  const batchOptions =
    useMemo(() => {
      return [
        ...new Set(
          families.flatMap(
            (family) =>
              family.children
                .map(
                  (child) =>
                    text(
                      child.batchName,
                    ),
                )
                .filter(
                  Boolean,
                ),
          ),
        ),
      ].sort();
    }, [families]);

  const filteredFamilies =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return families.filter(
        (family) => {
          if (
            classFilter !==
              "all" &&
            !family.children.some(
              (child) =>
                childClassLabel(
                  child,
                ) ===
                classFilter,
            )
          ) {
            return false;
          }

          if (
            batchFilter !==
              "all" &&
            !family.children.some(
              (child) =>
                text(
                  child.batchName,
                ) ===
                batchFilter,
            )
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const values = [
            family.father.name,
            family.father.phone,
            family.mother.name,
            family.mother.phone,
            family.account?.email,
            ...family.children.flatMap(
              (child) => [
                child.name,
                child.enrollmentNo,
                childClassLabel(
                  child,
                ),
                child.batchName,
              ],
            ),
          ];

          return values.some(
            (value) =>
              text(value)
                .toLowerCase()
                .includes(
                  query,
                ),
          );
        },
      );
    }, [
      families,
      search,
      classFilter,
      batchFilter,
    ]);

  const linkedStudents =
    new Set(
      families.flatMap(
        (family) =>
          family.children.map(
            (child) =>
              child.id,
          ),
      ),
    ).size;

  const multiChildFamilies =
    families.filter(
      (family) =>
        family.children.length >
        1,
    ).length;

  const activeLogins =
    families.filter(
      (family) =>
        family.account
          ?.isApproved ===
        true,
    ).length;

  const openLogin =
    (family: FamilyRecord) => {
      setLoginFamily(
        family,
      );
      setLoginForm({
        email:
          family.account?.email &&
          !isLegacyParentEmail(
            family.account.email,
          )
            ? family.account.email
            : "",
        password: "",
        isApproved:
          family.account
            ?.isApproved ??
          true,
      });
      setLoginError("");
      setShowPassword(
        false,
      );
    };

  const saveLogin =
    async () => {
      if (!loginFamily) {
        return;
      }

      const email =
        loginForm.email
          .trim()
          .toLowerCase();

      const password =
        loginForm.password;

      if (
        !email ||
        !/^\S+@\S+\.\S+$/.test(
          email,
        )
      ) {
        setLoginError(
          "Enter a valid family login email address.",
        );
        return;
      }

      if (
        !loginFamily.account &&
        !password
      ) {
        setLoginError(
          "Password is required when creating the family login.",
        );
        return;
      }

      if (
        password &&
        (
          password.length <
            8 ||
          !/[a-z]/.test(
            password,
          ) ||
          !/[A-Z]/.test(
            password,
          ) ||
          !/\d/.test(
            password,
          )
        )
      ) {
        setLoginError(
          "Password needs 8+ characters with uppercase, lowercase and a number.",
        );
        return;
      }

      setSavingLogin(
        true,
      );
      setLoginError("");

      try {
        await apiRequest(
          `/parents/families/${loginFamily.id}/login`,
          {
            method:
              "POST",
            body:
              JSON.stringify(
                {
                  email,
                  password,
                  isApproved:
                    loginForm.isApproved,
                },
              ),
          },
        );

        setLoginFamily(
          null,
        );

        setLoginForm({
          email: "",
          password: "",
          isApproved:
            true,
        });

        await load();
      } catch (cause) {
        setLoginError(
          cause instanceof Error
            ? cause.message
            : "Could not save family login.",
        );
      } finally {
        setSavingLogin(
          false,
        );
      }
    };

  const autoPassword =
    () => {
      setLoginForm(
        (current) => ({
          ...current,
          password:
            generateStrongPassword(),
        }),
      );
      setShowPassword(
        true,
      );
    };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 pb-8">
      <section className="relative overflow-hidden rounded-[26px] border border-indigo-400/20 bg-[#07111f] px-5 py-5 text-white shadow-[0_22px_70px_rgba(15,23,42,0.18)] sm:px-6 lg:px-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute right-32 top-10 h-36 w-36 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-300">
              <Users className="h-4 w-4" />
              Parents & Families
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Family Accounts
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-medium text-slate-300">
              Father and mother stay together on one family card. Each family has one shared login account for all linked children.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-slate-300">
            <span className="font-black text-white">
              One family
            </span>
            {" = "}
            one card
            {" = "}
            one login
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Families"
          value={families.length}
          hint="Father + mother grouped together"
        />
        <StatCard
          icon={GraduationCap}
          label="Linked students"
          value={linkedStudents}
          hint="Students inside family cards"
        />
        <StatCard
          icon={UserRound}
          label="Multi-child families"
          value={multiChildFamilies}
          hint="Families with 2+ students"
        />
        <StatCard
          icon={ShieldCheck}
          label="Active logins"
          value={activeLogins}
          hint="Shared family accounts"
        />
      </section>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1.6fr_1fr_1fr]">
        <div>
          <Label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
            Search
          </Label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search father, mother, phone, email, student..."
              className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10 font-medium"
            />
          </div>
        </div>

        <SearchableFilter
          label="Class"
          value={classFilter}
          options={classOptions}
          allLabel="All classes"
          onChange={setClassFilter}
        />

        <SearchableFilter
          label="Batch"
          value={batchFilter}
          options={batchOptions}
          allLabel="All batches"
          onChange={setBatchFilter}
        />
      </section>

      {error ? (
        <section className="flex items-start justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-black">
                Could not load family records
              </p>
              <p className="mt-1 text-sm text-rose-700">
                {error}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              void load()
            }
            className="rounded-xl border-rose-200 bg-white"
          >
            Retry
          </Button>
        </section>
      ) : null}

      {loading ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {Array.from({
            length: 4,
          }).map(
            (_, index) => (
              <div
                key={index}
                className="h-80 animate-pulse rounded-[22px] border border-slate-200 bg-white"
              />
            ),
          )}
        </section>
      ) : filteredFamilies.length ===
        0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Users className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-black text-slate-950">
            No family records found
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Try changing the search or filters.
          </p>
        </section>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {filteredFamilies.map(
            (family) => (
              <article
                key={
                  family.id
                }
                className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-indigo-500">
                        Family
                      </p>
                      <h2 className="mt-1 text-lg font-black text-slate-950">
                        {family.father.name ||
                          family.mother.name ||
                          "Parent Family"}
                      </h2>
                    </div>

                    <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-center">
                      <p className="text-lg font-black leading-none text-cyan-800">
                        {
                          family
                            .children
                            .length
                        }
                      </p>
                      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-700">
                        {family
                          .children
                          .length ===
                        1
                          ? "Child"
                          : "Children"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <ContactBox
                      relation="Father"
                      contact={
                        family.father
                      }
                    />
                    <ContactBox
                      relation="Mother"
                      contact={
                        family.mother
                      }
                    />
                  </div>
                </div>

                <div className="p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-indigo-500" />
                      <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                        Linked children
                      </h3>
                    </div>

                    {family
                      .children
                      .length >
                    1 ? (
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-black text-indigo-700">
                        Same family •{" "}
                        {
                          family
                            .children
                            .length
                        }{" "}
                        students
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-2.5">
                    {family.children.map(
                      (child) => (
                        <button
                          key={
                            child.id
                          }
                          type="button"
                          onClick={() =>
                            child.id &&
                            setLocation(
                              `/students?view=${encodeURIComponent(child.id)}`,
                            )
                          }
                          className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/40"
                        >
                          <StudentAvatar
                            child={
                              child
                            }
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-black text-slate-900">
                                {
                                  child.name
                                }
                              </p>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] ${
                                  child.status ===
                                  "active"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-200 text-slate-600"
                                }`}
                              >
                                {
                                  child.status
                                }
                              </span>
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500">
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                {childClassLabel(
                                  child,
                                )}
                              </span>
                              <span>
                                {
                                  child.enrollmentNo ||
                                  "No enrollment ID"
                                }
                              </span>
                              {child.batchName ? (
                                <span>
                                  {
                                    child.batchName
                                  }
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      ),
                    )}
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-4">
                    {family.account ? (
                      <div className="flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className={`h-4 w-4 ${family.account.isApproved ? "text-emerald-600" : "text-amber-600"}`} />
                            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-600">
                              One family login
                            </p>
                          </div>

                          <p className="mt-2 truncate text-sm font-black text-slate-950">
                            {isLegacyParentEmail(
                              family.account.email,
                            )
                              ? "Real login email not set"
                              : family.account.email}
                          </p>

                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500">
                            {family
                              .father
                              .phone ? (
                              <span>
                                Father:{" "}
                                {
                                  family
                                    .father
                                    .phone
                                }
                              </span>
                            ) : null}
                            {family
                              .mother
                              .phone ? (
                              <span>
                                Mother:{" "}
                                {
                                  family
                                    .mother
                                    .phone
                                }
                              </span>
                            ) : null}
                          </div>

                          <p className="mt-1 text-[11px] font-semibold text-slate-500">
                            {isLegacyParentEmail(
                              family.account.email,
                            )
                              ? "Old generated login detected. Open Manage Login and save the real family email once."
                              : "Email or either saved parent phone opens the same account with the same password."}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                              family
                                .account
                                .isApproved
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {family
                              .account
                              .isApproved
                              ? "ACTIVE"
                              : "INACTIVE"}
                          </span>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              openLogin(
                                family,
                              )
                            }
                            className="h-9 rounded-xl border-slate-200 px-3 text-xs font-black"
                          >
                            <Settings2 className="mr-2 h-3.5 w-3.5" />
                            Manage Login
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-black text-slate-950">
                            No family login yet
                          </p>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            Create one login for father and mother. Both saved phone numbers and the login email will open this same family account.
                          </p>
                        </div>

                        <Button
                          type="button"
                          onClick={() =>
                            openLogin(
                              family,
                            )
                          }
                          disabled={
                            !family
                              .father
                              .phone &&
                            !family
                              .mother
                              .phone
                          }
                          className="h-9 rounded-xl bg-[#081321] px-3 text-xs font-black text-white hover:bg-[#10243c]"
                        >
                          <KeyRound className="mr-2 h-3.5 w-3.5 text-cyan-300" />
                          Create Family Login
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ),
          )}
        </section>
      )}

      <Dialog
        open={Boolean(
          loginFamily,
        )}
        onOpenChange={(
          open,
        ) => {
          if (
            !open &&
            !savingLogin
          ) {
            setLoginFamily(
              null,
            );
          }
        }}
      >
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden rounded-[24px] border-slate-200 p-0 sm:max-w-[540px]">
          <div className="shrink-0 bg-[#07111f] px-5 py-4 text-white">
            <DialogHeader>
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-cyan-300">
                <KeyRound className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl font-black text-white">
                {loginFamily
                  ?.account
                  ? "Manage Family Login"
                  : "Create Family Login"}
              </DialogTitle>
              <DialogDescription className="text-slate-300">
                One account is shared by this family. The login email, father phone and mother phone open the same Parent App account.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 space-y-4 overflow-y-auto p-5">
            {loginFamily ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <ContactBox
                  relation="Father"
                  contact={
                    loginFamily.father
                  }
                />
                <ContactBox
                  relation="Mother"
                  contact={
                    loginFamily.mother
                  }
                />
              </div>
            ) : null}

            <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-900">
                Shared credentials
              </p>
              <p className="mt-1 text-xs font-medium leading-5 text-cyan-800">
                Use the login email or either saved parent phone number with the same password.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="family-login-email" className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">
                Login Email
              </Label>
              <Input
                id="family-login-email"
                type="email"
                value={
                  loginForm.email
                }
                onChange={(
                  event,
                ) =>
                  setLoginForm(
                    (
                      current,
                    ) => ({
                      ...current,
                      email:
                        event
                          .target
                          .value,
                    }),
                  )
                }
                placeholder="family@example.com"
                autoComplete="off"
                disabled={
                  savingLogin
                }
                className="h-11 rounded-xl bg-slate-50"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="family-login-password" className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">
                  {loginFamily
                    ?.account
                    ? "New Password (optional)"
                    : "Password"}
                </Label>

                <button
                  type="button"
                  onClick={
                    autoPassword
                  }
                  disabled={
                    savingLogin
                  }
                  className="text-[11px] font-black text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                >
                  Generate Password
                </button>
              </div>

              <div className="relative">
                <Input
                  id="family-login-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    loginForm.password
                  }
                  onChange={(
                    event,
                  ) =>
                    setLoginForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        password:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  placeholder={
                    loginFamily
                      ?.account
                      ? "Leave blank to keep current password"
                      : "Enter password"
                  }
                  disabled={
                    savingLogin
                  }
                  className="h-11 rounded-xl bg-slate-50 pr-11"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (
                        current,
                      ) =>
                        !current,
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              <p className="text-[11px] font-medium text-slate-400">
                Minimum 8 characters with uppercase, lowercase and a number.
              </p>
            </div>

            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-sm font-black text-slate-900">
                  Login active
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Turn this off to block the shared family account.
                </p>
              </div>

              <input
                type="checkbox"
                checked={
                  loginForm.isApproved
                }
                onChange={(
                  event,
                ) =>
                  setLoginForm(
                    (
                      current,
                    ) => ({
                      ...current,
                      isApproved:
                        event
                          .target
                          .checked,
                    }),
                  )
                }
                className="h-5 w-5 accent-slate-900"
              />
            </label>

            {loginError ? (
              <div className="flex gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {loginError}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-white p-4">
            <Button
              type="button"
              variant="outline"
              disabled={
                savingLogin
              }
              onClick={() =>
                setLoginFamily(
                  null,
                )
              }
              className="rounded-xl"
            >
              Cancel
            </Button>

            <Button
              type="button"
              disabled={
                savingLogin
              }
              onClick={() =>
                void saveLogin()
              }
              className="rounded-xl bg-[#081321] px-5 font-black text-white hover:bg-[#10243c]"
            >
              {savingLogin ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 h-4 w-4 text-cyan-300" />
              )}
              {loginFamily
                ?.account
                ? "Save Login"
                : "Create Login"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
