import { useListSubjects, useListCourses, useListStaff, getListSubjectsQueryKey } from "@workspace/api-client-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Search, Plus, Pencil, Trash2, Book, CheckCircle2, UserCheck, UserX,
  LayoutGrid, List as ListIcon, BookOpen, X
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
    return result?.message || result?.error || "Subject save nahi hua. Details check karo.";
  } catch {
    return "Subject save nahi hua. Backend connection check karo.";
  }
}

// Multi-Course Persistent Storage Sync
const COURSE_MAP_KEY = "coach_sutra_subject_courses_v4";

function getStoredCoursesMap(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(COURSE_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSubjectCourses(subjectId: string, subjectCode: string, subjectName: string, courseIds: string[]) {
  try {
    const map = getStoredCoursesMap();
    if (subjectId) map[`id:${subjectId}`] = courseIds;
    if (subjectCode) map[`code:${normalizeStr(subjectCode)}`] = courseIds;
    if (subjectName) map[`name:${normalizeStr(subjectName)}`] = courseIds;
    localStorage.setItem(COURSE_MAP_KEY, JSON.stringify(map));
  } catch {}
}

function getResolvedCourseIds(subject: any): string[] {
  const map = getStoredCoursesMap();

  if (subject?.id && map[`id:${subject.id}`]?.length) {
    return map[`id:${subject.id}`];
  }
  if (subject?.code && map[`code:${normalizeStr(subject.code)}`]?.length) {
    return map[`code:${normalizeStr(subject.code)}`];
  }
  if (subject?.name && map[`name:${normalizeStr(subject.name)}`]?.length) {
    return map[`name:${normalizeStr(subject.name)}`];
  }

  let fromSubject: string[] = [];
  if (Array.isArray(subject?.courseIds) && subject.courseIds.length > 0) {
    fromSubject = subject.courseIds.map((x: any) => String(x.id || x._id || x));
  } else if (typeof subject?.courseIds === "string") {
    if (subject.courseIds.startsWith("[")) {
      try { fromSubject = JSON.parse(subject.courseIds); } catch {}
    } else {
      fromSubject = subject.courseIds.split(",").map((s: string) => s.trim()).filter(Boolean);
    }
  }

  if (fromSubject.length > 0) return fromSubject;
  if (subject?.courseId) return [String(subject.courseId)];

  return [];
}

// Normalizer for smart flexible matching (Math's <-> Maths <-> Math)
function normalizeStr(str: any): string {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .replace(/['’`\s\-_.,]/g, "")
    .replace(/s$/g, "");
}

function isFlexibleMatch(str1: any, str2: any): boolean {
  const a = normalizeStr(str1);
  const b = normalizeStr(str2);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  return false;
}

const subjectSchema = z.object({
  name: z.string().min(2, "Name required"),
  code: z.string().min(2, "Code required"),
  courseIds: z.array(z.string()).min(1, "Select at least one course"),
});

type SubjectForm = z.infer<typeof subjectSchema>;
type DropdownOption = { label: string; value: string };

/* ============================================================
   MULTI SELECT — Courses Dropdown (100% Reliable Selection)
   ============================================================ */
function MultiSelectSearchableDropdown({
  label,
  selectedValues = [],
  options = [],
  placeholder = "Select courses...",
  onChange,
}: {
  label: string;
  selectedValues?: string[];
  options: DropdownOption[];
  placeholder?: string;
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const safeSelected = useMemo(() => (Array.isArray(selectedValues) ? selectedValues : []), [selectedValues]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearchText("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    return options.filter((o) =>
      o.label.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [options, searchText]);

  const selectedOptions = useMemo(() => {
    return options.filter((o) => safeSelected.includes(o.value));
  }, [options, safeSelected]);

  const handleToggle = (value: string) => {
    if (!value) return;
    const isSelected = safeSelected.includes(value);
    let next: string[];
    if (isSelected) {
      next = safeSelected.filter((v) => v !== value);
    } else {
      next = [...safeSelected, value];
    }
    onChange(next);
  };

  const handleRemoveTag = (e: React.MouseEvent, value: string) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(safeSelected.filter((v) => v !== value));
  };

  return (
    <div className="space-y-1.5 relative" ref={containerRef}>
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </label>

      {/* Trigger Box */}
      <div
        onClick={() => setOpen((prev) => !prev)}
        className={`flex min-h-[44px] w-full cursor-pointer flex-wrap gap-1.5 rounded-xl border bg-slate-50/50 p-2 pr-8 transition-all ${
          open ? "border-[#6366f1] ring-1 ring-[#6366f1] bg-white" : "border-slate-200"
        }`}
      >
        {selectedOptions.length === 0 && !searchText && (
          <span className="text-sm text-slate-400 self-center pl-1">
            {placeholder}
          </span>
        )}

        {selectedOptions.map((opt) => (
          <span
            key={opt.value}
            className="inline-flex items-center gap-1 rounded-md bg-[#e0e7ff] py-1 pl-2.5 pr-1.5 text-[11px] font-bold text-[#4f46e5]"
          >
            {opt.label}
            <button
              type="button"
              onClick={(e) => handleRemoveTag(e, opt.value)}
              className="rounded-full p-0.5 transition-colors hover:bg-[#c7d2fe]"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        <input
          type="text"
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={(e) => e.stopPropagation()}
          placeholder={selectedOptions.length === 0 ? "" : "Search..."}
          className="min-w-[60px] flex-1 bg-transparent text-sm text-slate-700 outline-none"
        />

        <span className="pointer-events-none absolute right-3 top-[38px] text-[10px] text-slate-400">
          {open ? "▲" : "▼"}
        </span>
      </div>

      {/* Dropdown Options List */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-[999] mt-1.5 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl">
          {filtered.length > 0 ? (
            filtered.map((option) => {
              const checked = safeSelected.includes(option.value);
              return (
                <div
                  key={option.value}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggle(option.value);
                  }}
                  className="flex w-full cursor-pointer items-center rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 select-none"
                >
                  <div className={`mr-3 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                    checked ? "border-[#6366f1] bg-[#6366f1]" : "border-slate-300 bg-white"
                  }`}>
                    {checked && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={`truncate ${checked ? "font-bold text-slate-900" : "font-medium"}`}>
                    {option.label}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="px-3 py-3 text-center text-sm font-medium text-slate-400">
              No courses found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getSubjectStatus(subject: any): "active" | "inactive" {
  if (subject?.status === "inactive" || subject?.isActive === false || subject?.active === false) {
    return "inactive";
  }
  return "active";
}

export default function Subjects() {
  const [location] = useLocation();
  const typeFromUrl = new URLSearchParams(location.split("?")[1] ?? window.location.search).get("type");
  const pageType = typeFromUrl === "academic" || typeFromUrl === "computer" ? typeFromUrl : null;
  const pageTitle =
    pageType === "academic" ? "Academic Subjects" : pageType === "computer" ? "Computer Subjects" : "Subjects";

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "no_teachers">("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const { data: subjects, isLoading } = useListSubjects();
  const { data: courses } = useListCourses();
  const { data: staffData } = useListStaff();

  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [statusMap, setStatusMap] = useState<Record<string, "active" | "inactive">>({});

  const queryClient = useQueryClient();

  const defaults: SubjectForm = { name: "", code: "", courseIds: [] };

  const visibleCourses = (courses ?? []).filter(
    (course: any) => !pageType || ((course as any).courseType ?? "academic") === pageType
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

    const parsedCourseIds = getResolvedCourseIds(subject);

    form.reset({
      name: subject.name,
      code: subject.code,
      courseIds: parsedCourseIds,
    });
    setOpen(true);
  };

  const refreshSubjects = async () => {
    await queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
  };

  const resolveStatus = (subject: any): "active" | "inactive" =>
    statusMap[subject.id] ?? getSubjectStatus(subject);

  const onSubmit = async (values: SubjectForm) => {
    setMessage("");
    setSaving(true);

    const payload = {
      name: values.name.trim(),
      code: values.code.trim(),
      courseIds: values.courseIds,
      courseId: values.courseIds[0] || "",
    };

    try {
      const response = await fetch(
        editTarget ? `/api/subjects/${editTarget.id}` : "/api/subjects",
        {
          method: editTarget ? "PATCH" : "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        setMessage(await readApiError(response));
        return;
      }

      let subjectId = editTarget?.id;
      if (!subjectId) {
        try {
          const resData = await response.clone().json();
          subjectId = resData?.id || resData?.subject?.id;
        } catch {}
      }

      saveSubjectCourses(subjectId, values.code, values.name, values.courseIds);

      await refreshSubjects();
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
    if (!window.confirm(`Do you want to delete ${subject.name}?`)) return;
    setMessage("");
    setDeletingId(subject.id);
    try {
      const response = await fetch(`/api/subjects/${subject.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        setMessage(await readApiError(response));
        return;
      }
      await refreshSubjects();
    } catch {
      setMessage("Delete failed.");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleStatus = async (subject: any) => {
    const current = resolveStatus(subject);
    const next = current === "active" ? "inactive" : "active";
    setMessage("");
    setTogglingId(subject.id);
    setStatusMap((prev) => ({ ...prev, [subject.id]: next }));

    try {
      const response = await fetch(`/api/subjects/${subject.id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status: next,
          isActive: next === "active",
          active: next === "active",
        }),
      });
      if (!response.ok) {
        setStatusMap((prev) => ({ ...prev, [subject.id]: current }));
        setMessage(await readApiError(response));
        return;
      }
      await refreshSubjects();
    } catch {
      setStatusMap((prev) => ({ ...prev, [subject.id]: current }));
      setMessage("Status update nahi hua. Backend check karo.");
    } finally {
      setTogglingId(null);
    }
  };

  // =========================================================================
  // CORE FIX: MULTI-COURSE & FLEXIBLE STAFF TEACHER LINKING
  // =========================================================================
  const pageSubjects = useMemo(() => {
    const staffList = Array.isArray(staffData) ? staffData : [];

    return (subjects ?? [])
      .map((subject: any) => {
        // 1. Resolve Course IDs
        const cIds = getResolvedCourseIds(subject);

        // 2. Resolve Course Names
        const resolvedCourseNames: string[] = [];
        cIds.forEach((id: string) => {
          const found = (courses ?? []).find((c: any) => String(c.id || c._id) === String(id)) as any;
          if (found && (found.name || found.courseName)) {
            resolvedCourseNames.push(found.name || found.courseName);
          }
        });

        if (resolvedCourseNames.length === 0 && subject.courseName) {
          resolvedCourseNames.push(subject.courseName);
        }

        const subjectName = subject.name || "";

        // 3. Match Teachers from Staff Form
        const matchedTeachers: any[] = [];

        if (subject.teacherName || subject.teacherId) {
          matchedTeachers.push({
            id: subject.teacherId || "direct-1",
            name: subject.teacherName || "Assigned Teacher",
            photo: "",
          });
        }

        staffList.forEach((st: any) => {
          if (st.status === "inactive" || st.isActive === false) return;

          const taughtArr: any[] = [];
          if (Array.isArray(st.subjectsTaught)) {
            st.subjectsTaught.forEach((item: any) => {
              if (typeof item === "string") taughtArr.push({ subject: item, course: "" });
              else if (item && typeof item === "object") {
                taughtArr.push({
                  subject: item.subject || item.subjectName || item.name || item.title || "",
                  course: item.course || item.courseName || item.className || "",
                  courseId: item.courseId || "",
                });
              }
            });
          }
          if (st.subject) taughtArr.push({ subject: st.subject, course: st.course || "" });
          if (st.designation) taughtArr.push({ subject: st.designation, course: "" });

          const matchesSubject = taughtArr.some((t: any) => {
            const isSubjMatch =
              isFlexibleMatch(t.subject, subjectName) ||
              String(t.subjectId || "") === String(subject.id) ||
              isFlexibleMatch(subject.code, t.subject);

            if (!isSubjMatch) return false;

            if (!t.course) return true;
            return (
              cIds.includes(String(t.courseId)) ||
              resolvedCourseNames.some((rc) => isFlexibleMatch(t.course, rc))
            );
          });

          if (matchesSubject) {
            matchedTeachers.push({
              id: st.id || st._id,
              name: st.name || st.fullName || [st.firstName, st.lastName].filter(Boolean).join(" ") || "Teacher",
              photo: st.photoDataUrl || st.photo || "",
            });
          }
        });

        const uniqueTeachers = Array.from(new Map(matchedTeachers.map((t) => [t.id, t])).values());

        return {
          ...subject,
          courseIds: cIds,
          courseNames: Array.from(new Set(resolvedCourseNames)),
          assignedTeachers: uniqueTeachers,
        };
      })
      .filter((subject: any) => {
        if (!pageType) return true;
        const hasMatchingType = subject.courseIds.some((id: string) => {
          const c = (courses ?? []).find((c: any) => String(c.id || c._id) === String(id)) as any;
          return c && ((c as any).courseType || "academic") === pageType;
        });
        return hasMatchingType;
      });
  }, [subjects, courses, pageType, staffData]);

  const filtered = useMemo(() => {
    return pageSubjects.filter((subject: any) => {
      const term = search.toLowerCase();
      const status = resolveStatus(subject);

      const matchesSearch =
        term === "" ||
        subject.name.toLowerCase().includes(term) ||
        (subject.code || "").toLowerCase().includes(term) ||
        (subject.courseNames || []).some((c: string) => c.toLowerCase().includes(term));

      const matchesTab =
        activeFilter === "all"
          ? true
          : activeFilter === "active"
            ? status === "active"
            : activeFilter === "no_teachers"
              ? subject.assignedTeachers.length === 0
              : true;

      return matchesSearch && matchesTab;
    });
  }, [pageSubjects, search, activeFilter, statusMap]);

  const totalSubjects = pageSubjects.length;
  const activeCount = pageSubjects.filter((s: any) => resolveStatus(s) === "active").length;
  const withTeachersCount = pageSubjects.filter((s: any) => s.assignedTeachers.length > 0).length;
  const noTeachersCount = totalSubjects - withTeachersCount;

  const StatusBadge = ({ subject }: { subject: any }) => {
    const status = resolveStatus(subject);
    const isToggling = togglingId === subject.id;
    const isActive = status === "active";
    return (
      <button
        type="button"
        onClick={() => toggleStatus(subject)}
        disabled={isToggling}
        title={isActive ? "Click to set Inactive" : "Click to set Active"}
        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-extrabold tracking-wider transition-all ${
          isActive
            ? "border-[#bbf7d0] bg-[#dcfce7] text-[#16a34a] hover:bg-[#bbf7d0]"
            : "border-[#fecaca] bg-[#fee2e2] text-[#dc2626] hover:bg-[#fecaca]"
        } ${isToggling ? "cursor-wait opacity-60" : "cursor-pointer"}`}
      >
        {isToggling ? "..." : isActive ? "ACTIVE" : "INACTIVE"}
      </button>
    );
  };

  const ActionButtons = ({ subject }: { subject: any }) => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => openEdit(subject)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 shadow-sm transition-all hover:border-[#6366f1] hover:text-[#6366f1]"
        title="Edit"
      >
        <Pencil className="h-[14px] w-[14px]" />
      </button>
      <button
        onClick={() => handleDelete(subject)}
        disabled={deletingId === subject.id}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 shadow-sm transition-all hover:border-red-400 hover:text-red-500"
        title="Delete"
      >
        {deletingId === subject.id ? (
          <span className="text-[10px] font-bold">...</span>
        ) : (
          <Trash2 className="h-[14px] w-[14px]" />
        )}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen space-y-6 bg-[#eff1f5] p-8 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#5b61d6]">{pageTitle}</h1>
          <p className="mt-1 text-[13px] font-medium text-slate-500">
            {totalSubjects} subjects · {activeCount} active · {withTeachersCount} with teachers
          </p>
        </div>
        <Button
          onClick={openAdd}
          className="rounded-xl bg-[#6366f1] px-5 py-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#4f46e5]"
        >
          <Plus className="mr-1.5 h-4 w-4" /> New Subject
        </Button>
      </div>

      {message && !open && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          {message}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "TOTAL SUBJECTS", val: totalSubjects, icon: Book, color: "text-[#5b61d6]" },
          { label: "ACTIVE", val: activeCount, icon: CheckCircle2, color: "text-[#10b981]" },
          { label: "WITH TEACHERS", val: withTeachersCount, icon: UserCheck, color: "text-[#f59e0b]" },
          { label: "NO TEACHERS", val: noTeachersCount, icon: UserX, color: "text-[#ef4444]" },
        ].map((stat, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-[20px] border border-slate-100/50 bg-white p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]"
          >
            <div>
              <div className="text-[28px] font-bold leading-none text-slate-800">{stat.val}</div>
              <div className="mt-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {stat.label}
              </div>
            </div>
            <div className={`rounded-full bg-slate-50/50 p-2.5 ${stat.color}`}>
              <stat.icon className="h-6 w-6" strokeWidth={2.5} />
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-100/50 bg-white p-2.5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] md:flex-row">
        <div className="relative w-full flex-1 pl-2">
          <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search name, code, course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full border-0 bg-transparent pl-11 text-sm text-slate-600 shadow-none placeholder:text-slate-400 focus-visible:ring-0"
          />
        </div>

        <div className="flex items-center gap-3 pr-1">
          <div className="flex items-center gap-2">
            {[
              { id: "all", label: `All (${totalSubjects})` },
              { id: "active", label: `Active (${activeCount})` },
              { id: "no_teachers", label: `No Teachers (${noTeachersCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as any)}
                className={`rounded-xl border px-4 py-2 text-[13px] font-semibold transition-all ${
                  activeFilter === tab.id
                    ? "border-[#6366f1] bg-[#f4f5fc] text-[#6366f1]"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="ml-1 flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-lg p-1.5 transition-colors ${
                viewMode === "list" ? "bg-[#5b61d6] text-white" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <ListIcon className="h-[18px] w-[18px]" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-lg p-1.5 transition-colors ${
                viewMode === "grid" ? "bg-[#5b61d6] text-white" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <LayoutGrid className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="rounded-[20px] border border-slate-100/50 bg-white py-16 text-center font-medium text-slate-500 shadow-sm">
          Loading subjects...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[20px] border border-slate-100/50 bg-white py-16 text-center font-medium text-slate-500 shadow-sm">
          No subjects found.
        </div>
      ) : viewMode === "list" ? (
        <div className="overflow-hidden rounded-[20px] border border-slate-100/50 bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#eef0f8] bg-[#f4f5fc]">
                  <th className="w-[25%] px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#717bd9]">Subject</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#717bd9]">Code</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#717bd9]">Courses</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#717bd9]">Assigned Teachers</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#717bd9]">Status</th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-[#717bd9]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((subject: any) => (
                  <tr key={subject.id} className="group transition-colors hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f0f2ff] text-[15px] font-bold text-[#5b61d6]">
                          {subject.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[14px] font-bold text-slate-800">{subject.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded border border-[#e0e7ff] bg-[#f8fafc] px-2 py-0.5 text-[11px] font-bold text-[#6366f1]">
                        {subject.code || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {subject.courseNames && subject.courseNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {subject.courseNames.map((cName: string, idx: number) => (
                            <span
                              key={idx}
                              className="inline-flex items-center rounded-full border border-[#bae6fd] bg-[#e0f2fe] px-2.5 py-0.5 text-[11px] font-bold text-[#0369a1]"
                            >
                              {cName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {subject.assignedTeachers?.length > 0 ? (
                        <div className="flex items-center gap-2.5">
                          <div className="flex -space-x-2">
                            {subject.assignedTeachers.slice(0, 3).map((t: any, idx: number) =>
                              t.photo ? (
                                <img
                                  key={idx}
                                  src={t.photo}
                                  alt={t.name}
                                  title={t.name}
                                  className="h-7 w-7 rounded-full border-2 border-white object-cover shadow-sm"
                                />
                              ) : (
                                <div
                                  key={idx}
                                  title={t.name}
                                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#e0e7ff] text-[10px] font-bold text-[#4f46e5] shadow-sm"
                                >
                                  {t.name.charAt(0).toUpperCase()}
                                </div>
                              )
                            )}
                            {subject.assignedTeachers.length > 3 && (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-bold text-slate-600 shadow-sm">
                                +{subject.assignedTeachers.length - 3}
                              </div>
                            )}
                          </div>
                          <div className="flex min-w-0 flex-col">
                            <span className="text-[11px] font-bold leading-tight text-[#15803d]">
                              {subject.assignedTeachers.length} Teacher{subject.assignedTeachers.length !== 1 ? "s" : ""}
                            </span>
                            <span className="max-w-[160px] truncate text-[10px] font-medium leading-tight text-slate-500">
                              {subject.assignedTeachers.map((t: any) => t.name).join(", ")}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-1.5 text-[#b45309]">
                          <UserX className="h-3.5 w-3.5" />
                          <span className="text-[11px] font-bold">Unassigned</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge subject={subject} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end">
                        <ActionButtons subject={subject} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((subject: any) => (
            <div
              key={subject.id}
              className="group flex flex-col gap-4 rounded-[20px] border border-slate-100/50 bg-white p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f0f2ff] text-xl font-bold text-[#5b61d6]">
                  {subject.name.charAt(0).toUpperCase()}
                </div>
                <StatusBadge subject={subject} />
              </div>
              <div>
                <h3 className="text-[15px] font-bold leading-snug text-slate-800">{subject.name}</h3>
                <span className="mt-1.5 inline-flex items-center rounded border border-[#e0e7ff] bg-[#f8fafc] px-2 py-0.5 text-[11px] font-bold text-[#6366f1]">
                  {subject.code || "N/A"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                <BookOpen className="h-3.5 w-3.5 text-slate-400 shrink-0 mr-1" />
                {subject.courseNames && subject.courseNames.length > 0 ? (
                  subject.courseNames.map((cName: string, idx: number) => (
                    <span
                      key={idx}
                      className="inline-flex items-center rounded-full border border-[#bae6fd] bg-[#e0f2fe] px-2.5 py-0.5 text-[11px] font-bold text-[#0369a1]"
                    >
                      {cName}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">No course</span>
                )}
              </div>

              <div>
                {subject.assignedTeachers?.length > 0 ? (
                  <div className="flex items-center gap-2.5 rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2">
                    <div className="flex -space-x-2">
                      {subject.assignedTeachers.slice(0, 3).map((t: any, idx: number) => (
                        t.photo ? (
                          <img key={idx} src={t.photo} alt={t.name} title={t.name} className="h-7 w-7 rounded-full border-2 border-white object-cover shadow-sm" />
                        ) : (
                          <div key={idx} title={t.name} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-white text-[10px] font-bold text-[#15803d] shadow-sm">
                            {t.name.charAt(0).toUpperCase()}
                          </div>
                        )
                      ))}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold leading-tight text-[#15803d]">
                        {subject.assignedTeachers.length} Teacher{subject.assignedTeachers.length !== 1 ? 's' : ''}
                      </span>
                      <span className="max-w-[120px] truncate text-[10px] font-medium leading-tight text-[#16a34a] opacity-90">
                        {subject.assignedTeachers.map((t:any) => t.name).join(", ")}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[#b45309]">
                    <UserX className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-bold">Unassigned</span>
                  </div>
                )}
              </div>
              <div className="mt-auto flex justify-end border-t border-slate-100 pt-3">
                <ActionButtons subject={subject} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl border-0 p-8 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] sm:max-w-[480px]">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-[22px] font-bold text-slate-800">
              {editTarget ? "Edit Subject" : "Add New Subject"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Subject Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
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
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Subject Code
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="h-11 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-[#6366f1]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="courseIds"
                render={({ field }) => (
                  <FormItem>
                    <MultiSelectSearchableDropdown
                      label="Courses"
                      selectedValues={field.value || []}
                      placeholder="Select courses..."
                      options={visibleCourses.map((c: any) => ({
                        label: c.name || c.courseName || "Untitled",
                        value: String(c.id || c._id),
                      }))}
                      onChange={(vals) => field.onChange(vals)}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {message && (
                <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {message}
                </div>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={saving}
                  className="h-12 w-full rounded-xl bg-[#6366f1] text-[15px] font-bold text-white shadow-md transition-all hover:bg-[#4f46e5]"
                >
                  {saving ? "Saving..." : editTarget ? "Update Subject" : "Save Subject"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}