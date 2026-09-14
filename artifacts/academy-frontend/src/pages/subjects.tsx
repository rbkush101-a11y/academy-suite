import { useListSubjects, useListCourses, useListStaff, getListSubjectsQueryKey } from "@workspace/api-client-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Search, Plus, Pencil, Trash2, Book, CheckCircle2, UserCheck, UserX,
  LayoutGrid, List as ListIcon, Users, BookOpen,
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

const subjectSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  courseId: z.string().min(1, "Select a course"),
  teacherId: z.string().optional(),
});

type SubjectForm = z.infer<typeof subjectSchema>;
type DropdownOption = { label: string; value: string };

function SearchableDropdown({
  label, value, options, placeholder, onChange,
}: {
  label: string; value: string; options: DropdownOption[]; placeholder: string; onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((option) => option.value === value)?.label ?? "";
  const [searchText, setSearchText] = useState(selectedLabel);
  const [activeIndex, setActiveIndex] = useState(-1);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchText.toLowerCase())
  );

  const selectOption = (option: DropdownOption) => {
    onChange(option.value);
    setSearchText(option.label);
    setActiveIndex(-1);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((old) =>
        filteredOptions.length === 0 ? -1 : Math.min(old + 1, filteredOptions.length - 1)
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((old) =>
        filteredOptions.length === 0 ? -1 : Math.max(old - 1, 0)
      );
      return;
    }
    if (event.key === "Enter" && open && filteredOptions.length > 0) {
      event.preventDefault();
      selectOption(filteredOptions[activeIndex >= 0 ? activeIndex : 0]);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setSearchText(selectedLabel);
      setActiveIndex(-1);
      setOpen(false);
    }
  };

  return (
    <div className="relative space-y-1.5">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <Input
          value={searchText}
          placeholder={placeholder}
          onFocus={() => { setOpen(true); setActiveIndex(-1); }}
          onChange={(event) => { setSearchText(event.target.value); setOpen(true); setActiveIndex(-1); }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            window.setTimeout(() => {
              setSearchText(selectedLabel);
              setActiveIndex(-1);
              setOpen(false);
            }, 150);
          }}
          className="h-11 rounded-xl bg-slate-50/50 border-slate-200 focus-visible:ring-[#6366f1] focus-visible:ring-offset-0"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <span className="text-[10px]">▼</span>
        </div>
      </div>
      {open ? (
        <div className="absolute z-50 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-100 bg-white p-1 shadow-lg mt-1">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onMouseDown={(event) => { event.preventDefault(); selectOption(option); }}
                className={`flex w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  index === activeIndex ? "bg-[#f4f5fc] text-[#6366f1] font-medium" : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                {option.label}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-slate-400">No matching option found.</div>
          )}
        </div>
      ) : null}
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
  const { data: staff } = useListStaff();

  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  // Local override so UI updates instantly even if backend status field name differs
  const [statusMap, setStatusMap] = useState<Record<string, "active" | "inactive">>({});

  const queryClient = useQueryClient();

  const defaults: SubjectForm = { name: "", code: "", courseId: "", teacherId: "" };
  const visibleCourses = (courses ?? []).filter(
    (course: any) => !pageType || (course.courseType ?? "academic") === pageType
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
      name: subject.name,
      code: subject.code,
      courseId: subject.courseId,
      teacherId: subject.teacherId ?? "",
    });
    setOpen(true);
  };

  const refreshSubjects = async () => {
    await queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
  };

  const resolveStatus = (subject: any): "active" | "inactive" => {
    return statusMap[subject.id] ?? getSubjectStatus(subject);
  };

  const onSubmit = async (values: SubjectForm) => {
    setMessage("");
    const selectedCourse = (courses ?? []).find((course: any) => course.id === values.courseId) as any;
    if (!selectedCourse) {
      setMessage("Course select karo.");
      return;
    }
    if (pageType && (selectedCourse.courseType ?? "academic") !== pageType) {
      setMessage(`Please select a ${pageType === "academic" ? "Academic" : "Computer"} Course.`);
      return;
    }

    setSaving(true);
    const payload = {
      name: values.name.trim(),
      code: values.code.trim(),
      courseId: values.courseId,
      teacherId: values.teacherId || "",
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
    // Optimistic UI update
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
        // Revert on failure
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

  const teachers = staff?.filter((member) => member.role === "teacher") ?? [];

  const pageSubjects = useMemo(() => {
    return (subjects ?? []).filter((subject: any) => {
      const subjectCourse = (courses ?? []).find((course: any) => course.id === subject.courseId) as any;
      const courseType = subjectCourse?.courseType ?? "academic";
      if (pageType && courseType !== pageType) return false;
      return true;
    });
  }, [subjects, courses, pageType]);

  const filtered = useMemo(() => {
    return pageSubjects.filter((subject: any) => {
      const subjectCourse = (courses ?? []).find((course: any) => course.id === subject.courseId) as any;
      const term = search.toLowerCase();
      const status = resolveStatus(subject);

      const matchesSearch =
        term === "" ||
        subject.name.toLowerCase().includes(term) ||
        subject.code.toLowerCase().includes(term) ||
        (subject.courseName ?? subjectCourse?.name ?? "").toLowerCase().includes(term);

      const matchesTab =
        activeFilter === "all"
          ? true
          : activeFilter === "active"
            ? status === "active"
            : activeFilter === "no_teachers"
              ? !subject.teacherId
              : true;

      return matchesSearch && matchesTab;
    });
  }, [pageSubjects, courses, search, activeFilter, statusMap]);

  const totalSubjects = pageSubjects.length;
  const activeCount = pageSubjects.filter((s: any) => resolveStatus(s) === "active").length;
  const withTeachersCount = pageSubjects.filter((s: any) => s.teacherId).length;
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
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider transition-all border ${
          isActive
            ? "text-[#16a34a] bg-[#dcfce7] border-[#bbf7d0] hover:bg-[#bbf7d0]"
            : "text-[#dc2626] bg-[#fee2e2] border-[#fecaca] hover:bg-[#fecaca]"
        } ${isToggling ? "opacity-60 cursor-wait" : "cursor-pointer"}`}
      >
        {isToggling ? "..." : isActive ? "ACTIVE" : "INACTIVE"}
      </button>
    );
  };

  const ActionButtons = ({ subject }: { subject: any }) => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => openEdit(subject)}
        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-[#6366f1] bg-white border border-slate-200 rounded-lg shadow-sm hover:border-[#6366f1] transition-all"
        title="Edit"
      >
        <Pencil className="h-[14px] w-[14px]" />
      </button>
      <button
        onClick={() => handleDelete(subject)}
        disabled={deletingId === subject.id}
        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-red-400 transition-all"
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
    <div className="min-h-screen bg-[#eff1f5] p-8 space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-[#5b61d6] tracking-tight">{pageTitle}</h1>
          <p className="mt-1 text-[13px] font-medium text-slate-500">
            {totalSubjects} subjects · {activeCount} active · {withTeachersCount} with teachers
          </p>
        </div>
        <Button
          onClick={openAdd}
          className="bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-xl shadow-sm px-5 py-5 text-sm font-semibold transition-all"
        >
          <Plus className="mr-1.5 h-4 w-4" /> New Subject
        </Button>
      </div>

      {message && !open && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          {message}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "TOTAL SUBJECTS", val: totalSubjects, icon: Book, color: "text-[#5b61d6]" },
          { label: "ACTIVE", val: activeCount, icon: CheckCircle2, color: "text-[#10b981]" },
          { label: "WITH TEACHERS", val: withTeachersCount, icon: UserCheck, color: "text-[#f59e0b]" },
          { label: "NO TEACHERS", val: noTeachersCount, icon: UserX, color: "text-[#ef4444]" },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100/50 flex items-center justify-between"
          >
            <div>
              <div className="text-[28px] leading-none font-bold text-slate-800">{stat.val}</div>
              <div className="text-[10px] font-bold text-slate-400 mt-2.5 uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
            <div className={`p-2.5 rounded-full bg-slate-50/50 ${stat.color}`}>
              <stat.icon className="h-6 w-6" strokeWidth={2.5} />
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-2xl p-2.5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100/50 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full pl-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400" />
          <Input
            placeholder="Search name, code, course..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 w-full border-0 focus-visible:ring-0 shadow-none pl-11 text-slate-600 text-sm placeholder:text-slate-400 bg-transparent"
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
                className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all border ${
                  activeFilter === tab.id
                    ? "border-[#6366f1] text-[#6366f1] bg-[#f4f5fc]"
                    : "border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200 ml-1">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "list" ? "bg-[#5b61d6] text-white" : "text-slate-400 hover:text-slate-600"
              }`}
              title="List view"
            >
              <ListIcon className="h-[18px] w-[18px]" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "grid" ? "bg-[#5b61d6] text-white" : "text-slate-400 hover:text-slate-600"
              }`}
              title="Grid view"
            >
              <LayoutGrid className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-white rounded-[20px] py-16 text-center text-slate-500 font-medium shadow-sm border border-slate-100/50">
          Loading subjects...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-[20px] py-16 text-center text-slate-500 font-medium shadow-sm border border-slate-100/50">
          No subjects found.
        </div>
      ) : viewMode === "list" ? (
        /* ========== LIST VIEW ========== */
        <div className="bg-white rounded-[20px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f4f5fc] border-b border-[#eef0f8]">
                  <th className="px-6 py-4 text-[11px] font-bold text-[#717bd9] uppercase tracking-wider w-[28%]">
                    Subject
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold text-[#717bd9] uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold text-[#717bd9] uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold text-[#717bd9] uppercase tracking-wider">
                    Teachers
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold text-[#717bd9] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold text-[#717bd9] uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((subject: any) => (
                  <tr key={subject.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#f0f2ff] text-[#5b61d6] flex items-center justify-center font-bold text-[15px]">
                          {subject.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-800 text-[14px]">{subject.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold text-[#6366f1] border border-[#e0e7ff] bg-[#f8fafc]">
                        {subject.code || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {subject.courseName ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold text-[#0369a1] bg-[#e0f2fe] border border-[#bae6fd]">
                          {subject.courseName}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {subject.teacherId ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0]">
                          <UserCheck className="w-3.5 h-3.5" />
                          <div className="flex flex-col">
                            <span className="font-bold text-[11px] leading-tight">1 teacher</span>
                            <span className="text-[10px] font-medium opacity-80 leading-tight truncate max-w-[80px]">
                              {subject.teacherName}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#fffbeb] text-[#b45309] border border-[#fde68a]">
                          <UserX className="w-3.5 h-3.5" />
                          <span className="font-bold text-[11px]">0 teachers</span>
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
        /* ========== GRID VIEW ========== */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((subject: any) => (
            <div
              key={subject.id}
              className="bg-white rounded-[20px] border border-slate-100/50 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] p-5 flex flex-col gap-4 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-[#f0f2ff] text-[#5b61d6] flex items-center justify-center font-bold text-xl">
                  {subject.name.charAt(0).toUpperCase()}
                </div>
                <StatusBadge subject={subject} />
              </div>

              <div>
                <h3 className="font-bold text-slate-800 text-[15px] leading-snug">{subject.name}</h3>
                <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded text-[11px] font-bold text-[#6366f1] border border-[#e0e7ff] bg-[#f8fafc]">
                  {subject.code || "N/A"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                {subject.courseName ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold text-[#0369a1] bg-[#e0f2fe] border border-[#bae6fd]">
                    {subject.courseName}
                  </span>
                ) : (
                  <span className="text-slate-400 text-xs">No course</span>
                )}
              </div>

              <div>
                {subject.teacherId ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0]">
                    <Users className="w-3.5 h-3.5" />
                    <div className="flex flex-col">
                      <span className="font-bold text-[11px] leading-tight">1 teacher</span>
                      <span className="text-[10px] font-medium opacity-80 leading-tight truncate max-w-[120px]">
                        {subject.teacherName}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#fffbeb] text-[#b45309] border border-[#fde68a]">
                    <UserX className="w-3.5 h-3.5" />
                    <span className="font-bold text-[11px]">0 teachers</span>
                  </div>
                )}
              </div>

              <div className="pt-3 mt-auto border-t border-slate-100 flex justify-end">
                <ActionButtons subject={subject} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl border-0 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] p-8 sm:max-w-[480px]">
          <DialogHeader className="mb-4">
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
                      <FormLabel className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Subject Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="h-11 rounded-xl bg-slate-50/50 border-slate-200 focus-visible:ring-[#6366f1]"
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
                      <FormLabel className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Subject Code
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="h-11 rounded-xl bg-slate-50/50 border-slate-200 focus-visible:ring-[#6366f1]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <SearchableDropdown
                label="Course"
                value={form.watch("courseId")}
                placeholder="Search or select course"
                options={visibleCourses.map((course: any) => ({
                  label: course.name,
                  value: course.id,
                }))}
                onChange={(value) => form.setValue("courseId", value, { shouldValidate: true })}
              />

              <SearchableDropdown
                label="Assigned Teacher (optional)"
                value={form.watch("teacherId") || ""}
                placeholder="Search and select teacher"
                options={teachers.map((teacher) => ({
                  label: teacher.name,
                  value: teacher.id,
                }))}
                onChange={(value) => form.setValue("teacherId", value, { shouldValidate: true })}
              />

              {message && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mt-2">
                  {message}
                </div>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-xl h-12 text-[15px] font-bold shadow-md transition-all"
                  disabled={saving}
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