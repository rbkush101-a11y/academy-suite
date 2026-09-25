import { useListSubjects, useListCourses, useListStaff, getListSubjectsQueryKey } from "@workspace/api-client-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Search, Plus, Pencil, Trash2, Book, CheckCircle2, UserCheck, UserX,
  LayoutGrid, List as ListIcon, BookOpen, ChevronDown, Check, X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useQueryClient } from "@tanstack/react-query";

function getAuthHeaders() {
  const token = localStorage.getItem("coach_sutra_token") || "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function readApiError(response: Response) {
  try {
    const result = await response.json();
    return result?.message || result?.error || "Subject save nahi hua.";
  } catch {
    return "Subject save nahi hua. Backend check karo.";
  }
}

function normalizeStr(str: any) {
  return String(str || "")
    .toLowerCase()
    .replace(/['’`\s\-_.,]/g, "")
    .replace(/s$/g, "");
}

function isFlexibleMatch(a: any, b: any) {
  const x = normalizeStr(a);
  const y = normalizeStr(b);
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

function getGradeNumber(str: any): string | null {
  if (!str || typeof str !== "string") return null;
  const s = str.trim();
  if (/^[0-9a-fA-F]{24}$/.test(s)) return null;
  const m = s.match(/(?:class|grade|std|standard)?\s*\b(\d{1,2})(?:st|nd|rd|th)?\b/i);
  return m?.[1] || null;
}

function isCourseMatched(
  teacherCourse: string,
  teacherCourseId: string,
  subjectCourseName: string,
  subjectCourseId: string
) {
  if (teacherCourseId && subjectCourseId && String(teacherCourseId) === String(subjectCourseId)) return true;
  if (!teacherCourse) return false;

  const tg = getGradeNumber(teacherCourse);
  const sg = getGradeNumber(subjectCourseName);
  if (tg && sg && tg !== sg) return false;

  const tn = normalizeStr(teacherCourse);
  const sn = normalizeStr(subjectCourseName);
  if (tn === sn) return true;
  if (tn && sn && (tn.includes(sn) || sn.includes(tn))) return true;
  if (tg && sg && tg === sg) return true;
  return false;
}

function parseTaught(st: any) {
  const out: Array<{ subject: string; course: string; courseId: string }> = [];
  let raw: any[] = [];
  if (Array.isArray(st?.subjectsTaught)) raw = st.subjectsTaught;
  else if (typeof st?.subjectsTaught === "string") {
    try {
      const p = JSON.parse(st.subjectsTaught);
      if (Array.isArray(p)) raw = p;
    } catch {}
  }
  raw.forEach((item) => {
    if (typeof item === "string") out.push({ subject: item, course: "", courseId: "" });
    else if (item && typeof item === "object") {
      out.push({
        subject: item.subject || item.subjectName || item.name || "",
        course: item.course || item.courseName || item.className || "",
        courseId: String(item.courseId || item.id || ""),
      });
    }
  });
  return out;
}

const subjectSchema = z.object({
  name: z.string().min(2, "Subject name is required"),
  code: z.string().min(2, "Subject code is required"),
  courseId: z.string().min(1, "Please select a course"),
});

type SubjectForm = z.infer<typeof subjectSchema>;

/* =========================================================
   SEARCHABLE DROPDOWN COMPONENT
   ========================================================= */
interface DropdownOption {
  label: string;
  value: string;
}

interface SearchableDropdownProps {
  value?: string;
  placeholder?: string;
  rounded?: "sm" | "md" | "lg" | "xl" | "full";
  options: DropdownOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

function SearchableDropdown({
  value,
  placeholder = "Select option",
  rounded = "lg",
  options = [],
  onChange,
  disabled = false,
}: SearchableDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => String(opt.value) === String(value)),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase().trim())
    );
  }, [options, search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const roundedClass = {
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-xl",
    xl: "rounded-2xl",
    full: "rounded-full",
  }[rounded] || "rounded-xl";

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full h-11 px-3.5 flex items-center justify-between border bg-slate-50/50 text-left text-sm font-medium transition-all ${roundedClass} ${
          open
            ? "border-[#6366f1] ring-2 ring-[#6366f1]/20 bg-white"
            : "border-slate-200 hover:border-slate-300"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className={`truncate ${selectedOption ? "text-slate-800 font-semibold" : "text-slate-400"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {value && !disabled && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200/60 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="p-2 border-b border-slate-100 bg-slate-50/60">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-2.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-[#6366f1] font-medium"
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400 font-medium">No results found</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left transition-colors ${
                      isSelected
                        ? "bg-[#eef2ff] text-[#4f46e5] font-bold"
                        : "text-slate-700 hover:bg-slate-50 font-medium"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-[#6366f1] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
   ========================================================= */
export default function Subjects() {
  const [location] = useLocation();
  const typeFromUrl = new URLSearchParams(location.split("?")[1] ?? window.location.search).get("type");
  const pageType = typeFromUrl === "academic" || typeFromUrl === "computer" ? typeFromUrl : null;
  const pageTitle =
    pageType === "academic" ? "Academic Subjects" : pageType === "computer" ? "Computer Subjects" : "Subjects";

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "no_teachers">("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [statusMap, setStatusMap] = useState<Record<string, "active" | "inactive">>({});

  const { data: subjects, isLoading } = useListSubjects();
  const { data: courses } = useListCourses();
  const { data: staffData } = useListStaff();
  const queryClient = useQueryClient();

  const defaults: SubjectForm = { name: "", code: "", courseId: "" };

  const visibleCourses = useMemo(
    () =>
      (courses ?? []).filter(
        (c: any) => !pageType || ((c as any).courseType ?? "academic") === pageType
      ),
    [courses, pageType]
  );

  const form = useForm<SubjectForm>({
    resolver: zodResolver(subjectSchema),
    defaultValues: defaults,
  });

  const openAdd = () => {
    setMessage("");
    setEditTarget(null);
    form.reset(defaults);
    setOpen(true);
  };

  const openEdit = (subject: any) => {
    setMessage("");
    setEditTarget(subject);
    form.reset({
      name: subject.name || "",
      code: subject.code || "",
      courseId: String(subject.courseId || ""),
    });
    setOpen(true);
  };

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
  };

  const resolveStatus = (s: any): "active" | "inactive" => {
    if (statusMap[s.id]) return statusMap[s.id];
    if (s?.status === "inactive" || s?.isActive === false || s?.active === false) return "inactive";
    return "active";
  };

  const onSubmit = async (values: SubjectForm) => {
    setMessage("");
    setSaving(true);
    try {
      const payload = {
        name: values.name.trim(),
        code: values.code.trim(),
        courseId: values.courseId,
      };
      const res = await fetch(editTarget ? `/api/subjects/${editTarget.id}` : "/api/subjects", {
        method: editTarget ? "PATCH" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setMessage(await readApiError(res));
        return;
      }
      await refresh();
      setOpen(false);
      setEditTarget(null);
      form.reset(defaults);
    } catch {
      setMessage("Subject save nahi hua. Backend check karo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (subject: any) => {
    if (!window.confirm(`Delete ${subject.name}?`)) return;
    setDeletingId(subject.id);
    try {
      const res = await fetch(`/api/subjects/${subject.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        setMessage(await readApiError(res));
        return;
      }
      await refresh();
    } catch {
      setMessage("Delete failed.");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleStatus = async (subject: any) => {
    const current = resolveStatus(subject);
    const next = current === "active" ? "inactive" : "active";
    setTogglingId(subject.id);
    setStatusMap((p) => ({ ...p, [subject.id]: next }));
    try {
      const res = await fetch(`/api/subjects/${subject.id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: next, isActive: next === "active", active: next === "active" }),
      });
      if (!res.ok) {
        setStatusMap((p) => ({ ...p, [subject.id]: current }));
        setMessage(await readApiError(res));
        return;
      }
      await refresh();
    } catch {
      setStatusMap((p) => ({ ...p, [subject.id]: current }));
      setMessage("Status update failed.");
    } finally {
      setTogglingId(null);
    }
  };

  const pageSubjects = useMemo(() => {
    const staffList = Array.isArray(staffData) ? staffData : [];
    return (subjects ?? [])
      .map((subject: any) => {
        const courseId = String(subject.courseId || "");
        const found = (courses ?? []).find((c: any) => String(c.id || c._id) === courseId) as any;
        const courseName = found?.name || found?.courseName || subject.courseName || "";

        const teachers: any[] = [];
        staffList.forEach((st: any) => {
          if (st.status === "inactive" || st.isActive === false) return;
          const taught = parseTaught(st);
          const ok = taught.some((t) => {
            const subOk =
              isFlexibleMatch(t.subject, subject.name) ||
              isFlexibleMatch(t.subject, subject.code) ||
              String((t as any).subjectId || "") === String(subject.id);
            if (!subOk) return false;
            return isCourseMatched(t.course, t.courseId, courseName, courseId);
          });
          if (ok) {
            teachers.push({
              id: st.id || st._id,
              name: st.name || st.fullName || [st.firstName, st.lastName].filter(Boolean).join(" ") || "Teacher",
              photo: st.photoDataUrl || st.photo || "",
            });
          }
        });

        return {
          ...subject,
          courseId,
          courseName,
          assignedTeachers: Array.from(new Map(teachers.map((t) => [t.id, t])).values()),
        };
      })
      .filter((s: any) => {
        if (!pageType) return true;
        const c = (courses ?? []).find((x: any) => String(x.id || x._id) === String(s.courseId)) as any;
        return c && ((c as any).courseType || "academic") === pageType;
      });
  }, [subjects, courses, pageType, staffData]);

  const filtered = useMemo(() => {
    return pageSubjects.filter((s: any) => {
      const term = search.toLowerCase();
      const st = resolveStatus(s);
      const searchOk =
        !term ||
        s.name?.toLowerCase().includes(term) ||
        String(s.code || "").toLowerCase().includes(term) ||
        String(s.courseName || "").toLowerCase().includes(term);
      const tabOk =
        activeFilter === "all" ? true : activeFilter === "active" ? st === "active" : s.assignedTeachers.length === 0;
      return searchOk && tabOk;
    });
  }, [pageSubjects, search, activeFilter, statusMap]);

  const total = pageSubjects.length;
  const activeCount = pageSubjects.filter((s: any) => resolveStatus(s) === "active").length;
  const withTeachers = pageSubjects.filter((s: any) => s.assignedTeachers.length > 0).length;
  const noTeachers = total - withTeachers;

  const StatusBadge = ({ subject }: { subject: any }) => {
    const st = resolveStatus(subject);
    const loading = togglingId === subject.id;
    const active = st === "active";
    return (
      <button
        type="button"
        disabled={loading}
        onClick={() => toggleStatus(subject)}
        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold tracking-wider ${
          active ? "border-[#bbf7d0] bg-[#dcfce7] text-[#16a34a]" : "border-[#fecaca] bg-[#fee2e2] text-[#dc2626]"
        }`}
      >
        {loading ? "..." : active ? "ACTIVE" : "INACTIVE"}
      </button>
    );
  };

  const Actions = ({ subject }: { subject: any }) => (
    <div className="flex gap-2">
      <button type="button" onClick={() => openEdit(subject)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-[#6366f1] hover:text-[#6366f1]">
        <Pencil className="h-[14px] w-[14px]" />
      </button>
      <button type="button" disabled={deletingId === subject.id} onClick={() => handleDelete(subject)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-red-400 hover:text-red-500">
        {deletingId === subject.id ? "..." : <Trash2 className="h-[14px] w-[14px]" />}
      </button>
    </div>
  );

  const Teachers = ({ list }: { list: any[] }) =>
    list?.length ? (
      <div className="flex items-center gap-2.5">
        <div className="flex -space-x-2">
          {list.slice(0, 3).map((t, i) =>
            t.photo ? (
              <img key={i} src={t.photo} title={t.name} className="h-7 w-7 rounded-full border-2 border-white object-cover" />
            ) : (
              <div key={i} title={t.name} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#e0e7ff] text-[10px] font-bold text-[#4f46e5]">
                {String(t.name || "T").charAt(0).toUpperCase()}
              </div>
            )
          )}
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-bold text-[#15803d]">{list.length} Teacher{list.length > 1 ? "s" : ""}</div>
          <div className="max-w-[150px] truncate text-[10px] text-slate-500">{list.map((t) => t.name).join(", ")}</div>
        </div>
      </div>
    ) : (
      <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-1.5 text-[#b45309]">
        <UserX className="h-3.5 w-3.5" />
        <span className="text-[11px] font-bold">Unassigned</span>
      </div>
    );

  return (
    <div className="min-h-screen space-y-6 bg-[#eff1f5] p-8 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#5b61d6]">{pageTitle}</h1>
          <p className="mt-1 text-[13px] font-medium text-slate-500">{total} subjects · {activeCount} active · {withTeachers} with teachers</p>
        </div>
        <Button onClick={openAdd} className="rounded-xl bg-[#6366f1] px-5 py-5 text-sm font-semibold text-white hover:bg-[#4f46e5]">
          <Plus className="mr-1.5 h-4 w-4" /> New Subject
        </Button>
      </div>

      {message && !open && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "TOTAL SUBJECTS", val: total, icon: Book, color: "text-[#5b61d6]" },
          { label: "ACTIVE", val: activeCount, icon: CheckCircle2, color: "text-[#10b981]" },
          { label: "WITH TEACHERS", val: withTeachers, icon: UserCheck, color: "text-[#f59e0b]" },
          { label: "NO TEACHERS", val: noTeachers, icon: UserX, color: "text-[#ef4444]" },
        ].map((s, i) => (
          <div key={i} className="flex items-center justify-between rounded-[20px] border border-slate-100/50 bg-white p-5">
            <div>
              <div className="text-[28px] font-bold leading-none text-slate-800">{s.val}</div>
              <div className="mt-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{s.label}</div>
            </div>
            <div className={`rounded-full bg-slate-50 p-2.5 ${s.color}`}><s.icon className="h-6 w-6" strokeWidth={2.5} /></div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-100/50 bg-white p-2.5 md:flex-row">
        <div className="relative w-full flex-1 pl-2">
          <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, code, course..." className="h-10 border-0 bg-transparent pl-11 shadow-none focus-visible:ring-0" />
        </div>
        <div className="flex items-center gap-2 pr-1">
          {[
            { id: "all", label: `All (${total})` },
            { id: "active", label: `Active (${activeCount})` },
            { id: "no_teachers", label: `No Teachers (${noTeachers})` },
          ].map((t) => (
            <button key={t.id} onClick={() => setActiveFilter(t.id as any)} className={`rounded-xl border px-4 py-2 text-[13px] font-semibold ${activeFilter === t.id ? "border-[#6366f1] bg-[#f4f5fc] text-[#6366f1]" : "border-slate-200 text-slate-500"}`}>
              {t.label}
            </button>
          ))}
          <div className="ml-1 flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button onClick={() => setViewMode("list")} className={`rounded-lg p-1.5 ${viewMode === "list" ? "bg-[#5b61d6] text-white" : "text-slate-400"}`}><ListIcon className="h-[18px] w-[18px]" /></button>
            <button onClick={() => setViewMode("grid")} className={`rounded-lg p-1.5 ${viewMode === "grid" ? "bg-[#5b61d6] text-white" : "text-slate-400"}`}><LayoutGrid className="h-[18px] w-[18px]" /></button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-[20px] bg-white py-16 text-center text-slate-500">Loading subjects...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[20px] bg-white py-16 text-center text-slate-500">No subjects found.</div>
      ) : viewMode === "list" ? (
        <div className="overflow-hidden rounded-[20px] border border-slate-100/50 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#eef0f8] bg-[#f4f5fc]">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#717bd9]">Subject</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#717bd9]">Code</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#717bd9]">Course</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#717bd9]">Assigned Teachers</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#717bd9]">Status</th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-[#717bd9]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f0f2ff] text-[15px] font-bold text-[#5b61d6]">{String(s.name || "S").charAt(0).toUpperCase()}</div>
                        <span className="text-[14px] font-bold text-slate-800">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="rounded border border-[#e0e7ff] bg-[#f8fafc] px-2 py-0.5 text-[11px] font-bold text-[#6366f1]">{s.code || "N/A"}</span></td>
                    <td className="px-6 py-4">{s.courseName ? <span className="inline-flex rounded-full border border-[#bae6fd] bg-[#e0f2fe] px-2.5 py-0.5 text-[11px] font-bold text-[#0369a1]">{s.courseName}</span> : <span className="text-sm text-slate-400">—</span>}</td>
                    <td className="px-6 py-4"><Teachers list={s.assignedTeachers || []} /></td>
                    <td className="px-6 py-4"><StatusBadge subject={s} /></td>
                    <td className="px-6 py-4"><div className="flex justify-end"><Actions subject={s} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((s: any) => (
            <div key={s.id} className="flex flex-col gap-4 rounded-[20px] border border-slate-100/50 bg-white p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f0f2ff] text-xl font-bold text-[#5b61d6]">{String(s.name || "S").charAt(0).toUpperCase()}</div>
                <StatusBadge subject={s} />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-slate-800">{s.name}</h3>
                <span className="mt-1.5 inline-flex rounded border border-[#e0e7ff] bg-[#f8fafc] px-2 py-0.5 text-[11px] font-bold text-[#6366f1]">{s.code || "N/A"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                {s.courseName ? <span className="inline-flex rounded-full border border-[#bae6fd] bg-[#e0f2fe] px-2.5 py-0.5 text-[11px] font-bold text-[#0369a1]">{s.courseName}</span> : <span className="text-xs text-slate-400">No course</span>}
              </div>
              <Teachers list={s.assignedTeachers || []} />
              <div className="mt-auto flex justify-end border-t border-slate-100 pt-3"><Actions subject={s} /></div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl border-0 p-8 sm:max-w-[480px]">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-[22px] font-bold text-slate-800">
              {editTarget ? "Edit Subject" : "Add New Subject"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              
              {/* EXACT MATCHING SEARCHABLE DROPDOWN */}
              <FormField
                control={form.control}
                name="courseId"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                      Course <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <SearchableDropdown
                        value={field.value}
                        placeholder="Select course"
                        rounded="lg"
                        options={visibleCourses.map((c: any) => ({
                          label: c.name || c.courseName || "Untitled",
                          value: String(c.id || c._id),
                        }))}
                        onChange={(v) => {
                          field.onChange(v);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                        Subject Name <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="e.g. Mathematics"
                          className="h-11 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-[#6366f1]" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                        Subject Code <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="e.g. MATH-10"
                          className="h-11 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-[#6366f1]" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {message && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>}

              <Button type="submit" disabled={saving} className="h-12 w-full rounded-xl bg-[#6366f1] text-[15px] font-bold text-white hover:bg-[#4f46e5]">
                {saving ? "Saving..." : editTarget ? "Update Subject" : "Save Subject"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}