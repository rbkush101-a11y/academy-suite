import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus,
  ChevronDown,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Check,
  X,
  AlertCircle,
} from "lucide-react";

// ───────────────── Types ─────────────────
interface Course {
  id: string | number;
  name: string;
  code?: string;
}

interface Subject {
  id: string | number;
  name: string;
  courseId?: string | number;
}

interface TopicItem {
  id: string | number;
  name: string;
  code?: string;
  description?: string;
  subjectName?: string;
  subjectId?: string | number;
  courseId?: string | number;
  status?: "Active" | "Inactive" | string;
}

interface SelectOption {
  value: string;
  label: string;
}

// ───────────────── Fallback Mock Data ─────────────────
const FALLBACK_COURSES: Course[] = [
  { id: "c1", name: "Class 10th Science" },
  { id: "c2", name: "Class 12th Physics" },
  { id: "c3", name: "Android App Development" },
];

const FALLBACK_SUBJECTS: Subject[] = [
  { id: "s1", name: "Physics", courseId: "c1" },
  { id: "s2", name: "Chemistry", courseId: "c1" },
  { id: "s3", name: "Electrostatics", courseId: "c2" },
  { id: "s4", name: "Java Core", courseId: "c3" },
];

const INITIAL_TOPICS: TopicItem[] = [
  {
    id: "t1",
    name: "Android Architecture",
    code: "JV",
    subjectName: "Java Core",
    status: "Active",
  },
  {
    id: "t2",
    name: "CCTV Topic 1",
    code: "01",
    subjectName: "— General —",
    status: "Active",
  },
  {
    id: "t3",
    name: "Gravity",
    code: "0022",
    description: "Laws of Gravitation and Motion",
    subjectName: "Physics",
    status: "Inactive",
  },
];

// ───────────────── Searchable Select ─────────────────
function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  className = "",
}: {
  options: SelectOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => String(o.value) === String(value));
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`
          w-full flex items-center justify-between gap-2
          border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm
          bg-white text-left transition
          focus:outline-none focus:ring-2 focus:ring-blue-500
          disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed
          ${open ? "ring-2 ring-blue-500 border-transparent" : ""}
          ${!selected ? "text-slate-400" : "text-slate-800"}
        `}
      >
        <span className="truncate">
          {selected ? selected.label : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setSearch("");
              }}
              className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {open && (
        <div className="absolute z-[100] mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-slate-400">
                No results found
              </div>
            ) : (
              filtered.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`
                      w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition
                      ${
                        isSelected
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-slate-700 hover:bg-slate-50"
                      }
                    `}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600 shrink-0" />
                    )}
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

// ───────────────── Main Component ─────────────────
export default function Topic() {
  // Local Topics + localStorage
  const [localTopics, setLocalTopics] = useState<TopicItem[]>(() => {
    const saved = localStorage.getItem("academy_custom_topics");
    return saved ? JSON.parse(saved) : INITIAL_TOPICS;
  });

  useEffect(() => {
    localStorage.setItem("academy_custom_topics", JSON.stringify(localTopics));
  }, [localTopics]);

  // Filter States
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    course: "",
    subject: "",
    search: "",
  });

  // Add Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicDescription, setNewTopicDescription] = useState("");
  const [newCourseId, setNewCourseId] = useState("");
  const [newSubjectId, setNewSubjectId] = useState("");
  const [formError, setFormError] = useState("");

  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTopicId, setEditTopicId] = useState<string | number | null>(null);
  const [editTopicName, setEditTopicName] = useState("");
  const [editTopicDescription, setEditTopicDescription] = useState("");
  const [editCourseId, setEditCourseId] = useState("");
  const [editSubjectId, setEditSubjectId] = useState("");
  const [editStatus, setEditStatus] = useState<"Active" | "Inactive">("Active");
  const [editFormError, setEditFormError] = useState("");

  // ── Courses ──
  const { data: apiCourses = [], isLoading: isLoadingCourses } = useQuery<
    Course[]
  >({
    queryKey: ["/api/courses"],
    queryFn: async () => {
      const token = localStorage.getItem("coach_sutra_token");
      const res = await fetch("/api/courses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) && data.length > 0 ? data : [];
    },
  });
  const courses = apiCourses.length > 0 ? apiCourses : FALLBACK_COURSES;

  // ── Subjects ──
  const { data: apiSubjects = [], isLoading: isLoadingSubjects } = useQuery<
    Subject[]
  >({
    queryKey: ["/api/subjects", selectedCourse || newCourseId || editCourseId],
    queryFn: async () => {
      const token = localStorage.getItem("coach_sutra_token");
      const courseFilter = selectedCourse || newCourseId || editCourseId;
      let url = "/api/subjects";
      if (courseFilter) url += `?courseId=${courseFilter}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) && data.length > 0 ? data : [];
    },
  });
  const subjects = apiSubjects.length > 0 ? apiSubjects : FALLBACK_SUBJECTS;

  // ── Topics API ──
  const { data: apiTopics = [], isLoading: isLoadingTopics } = useQuery<
    TopicItem[]
  >({
    queryKey: ["/api/topics", appliedFilters],
    queryFn: async () => {
      const token = localStorage.getItem("coach_sutra_token");
      const params = new URLSearchParams();
      if (appliedFilters.course)
        params.append("courseId", appliedFilters.course);
      if (appliedFilters.subject)
        params.append("subjectId", appliedFilters.subject);
      if (appliedFilters.search)
        params.append("search", appliedFilters.search);

      const res = await fetch(`/api/topics?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const allTopics = [...localTopics, ...apiTopics];

  const filteredTopics = allTopics.filter((item) => {
    if (
      appliedFilters.course &&
      String(item.courseId) !== String(appliedFilters.course)
    )
      return false;
    if (
      appliedFilters.subject &&
      String(item.subjectId) !== String(appliedFilters.subject)
    )
      return false;
    if (appliedFilters.search) {
      const q = appliedFilters.search.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchSub = item.subjectName?.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchSub) return false;
    }
    return true;
  });

  // ── Add Topic ──
  const addTopicMutation = useMutation({
    mutationFn: async (newTopic: {
      name: string;
      description?: string;
      courseId: string;
      subjectId: string;
    }) => {
      const token = localStorage.getItem("coach_sutra_token");
      try {
        await fetch("/api/topics", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...newTopic, status: "Active" }),
        });
      } catch (err) {}

      const subObj = subjects.find(
        (s) => String(s.id) === String(newTopic.subjectId)
      );

      return {
        id: "loc_" + Date.now(),
        name: newTopic.name,
        description: newTopic.description,
        courseId: newTopic.courseId,
        subjectId: newTopic.subjectId,
        subjectName: subObj ? subObj.name : "— General —",
        status: "Active" as const,
      };
    },
    onSuccess: (newTopicObj) => {
      setLocalTopics((prev) => [newTopicObj, ...prev]);
      setIsModalOpen(false);
      setNewTopicName("");
      setNewTopicDescription("");
      setNewCourseId("");
      setNewSubjectId("");
      setFormError("");
    },
  });

  // ── Edit Topic ──
  const handleOpenEditModal = (item: TopicItem) => {
    setEditTopicId(item.id);
    setEditTopicName(item.name);
    setEditTopicDescription(item.description || "");
    setEditCourseId(item.courseId ? String(item.courseId) : "");
    setEditSubjectId(item.subjectId ? String(item.subjectId) : "");
    setEditStatus(
      item.status === "Inactive" ? "Inactive" : "Active"
    );
    setEditFormError("");
    setIsEditModalOpen(true);
  };

  const handleUpdateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    setEditFormError("");

    if (!editTopicName.trim()) {
      setEditFormError("Please enter a Topic Name.");
      return;
    }

    const subObj = subjects.find(
      (s) => String(s.id) === String(editSubjectId)
    );

    setLocalTopics((prev) =>
      prev.map((t) => {
        if (t.id === editTopicId) {
          return {
            ...t,
            name: editTopicName,
            description: editTopicDescription,
            courseId: editCourseId,
            subjectId: editSubjectId,
            subjectName: subObj
              ? subObj.name
              : t.subjectName || "— General —",
            status: editStatus,
          };
        }
        return t;
      })
    );

    setIsEditModalOpen(false);
  };

  // Toggle Status from table
  const toggleTopicStatus = (id: string | number) => {
    setLocalTopics((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            status: t.status === "Inactive" ? "Active" : "Inactive",
          };
        }
        return t;
      })
    );
  };

  // Delete
  const handleDeleteTopic = (id: string | number) => {
    setLocalTopics((prev) => prev.filter((t) => t.id !== id));
  };

  // Filter handlers
  const handleFilter = () => {
    setAppliedFilters({
      course: selectedCourse,
      subject: selectedSubject,
      search: searchQuery,
    });
  };

  const handleClear = () => {
    setSelectedCourse("");
    setSelectedSubject("");
    setSearchQuery("");
    setAppliedFilters({ course: "", subject: "", search: "" });
  };

  // Add form submit
  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!newTopicName.trim()) {
      setFormError("Please enter a Topic Name.");
      return;
    }
    if (!newCourseId) {
      setFormError("Please select a Course.");
      return;
    }
    if (!newSubjectId) {
      setFormError("Please select a Subject.");
      return;
    }

    addTopicMutation.mutate({
      name: newTopicName,
      description: newTopicDescription,
      courseId: newCourseId,
      subjectId: newSubjectId,
    });
  };

  // Dropdown options
  const courseOptions: SelectOption[] = courses.map((c) => ({
    value: String(c.id),
    label: c.name,
  }));

  const filterSubjectOptions: SelectOption[] = subjects
    .filter(
      (s) => !selectedCourse || String(s.courseId) === String(selectedCourse)
    )
    .map((s) => ({ value: String(s.id), label: s.name }));

  const addModalSubjectOptions: SelectOption[] = subjects
    .filter(
      (s) => !newCourseId || String(s.courseId) === String(newCourseId)
    )
    .map((s) => ({ value: String(s.id), label: s.name }));

  const editModalSubjectOptions: SelectOption[] = subjects
    .filter(
      (s) => !editCourseId || String(s.courseId) === String(editCourseId)
    )
    .map((s) => ({ value: String(s.id), label: s.name }));

  return (
    <div className="min-h-screen bg-[#e7eef6] p-4 sm:p-6 text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1d5091]">Topic </h1>
            <p className="text-sm text-slate-500 mt-1">
              Standardised topics per subject — used in exams, question bank,
              and faculty profiles
            </p>
          </div>
          <button
            onClick={() => {
              setFormError("");
              setIsModalOpen(true);
            }}
            className="bg-[#1868db] hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 shadow-sm transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Add Topic
          </button>
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-end gap-3 text-xs font-bold uppercase tracking-wider text-slate-600">
          <div className="flex flex-col gap-1.5 w-full sm:w-52">
            <label className="text-[11px] text-slate-700 font-bold">
              COURSE
            </label>
            <SearchableSelect
              options={courseOptions}
              value={selectedCourse}
              onChange={(val) => {
                setSelectedCourse(val);
                setSelectedSubject("");
              }}
              placeholder="All Courses"
              disabled={isLoadingCourses}
            />
          </div>

          <div className="flex flex-col gap-1.5 w-full sm:w-52">
            <label className="text-[11px] text-slate-700 font-bold">
              SUBJECT
            </label>
            <SearchableSelect
              options={filterSubjectOptions}
              value={selectedSubject}
              onChange={setSelectedSubject}
              placeholder="All Subjects"
              disabled={isLoadingSubjects}
            />
          </div>

          <div className="flex flex-col gap-1.5 w-full sm:w-64">
            <label className="text-[11px] text-slate-700 font-bold">
              SEARCH
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topic..."
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-normal normal-case focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 text-sm"
            />
          </div>

          <button
            onClick={handleFilter}
            className="bg-white border border-[#2b6cb0] text-[#2b6cb0] font-semibold px-6 py-2.5 rounded-xl hover:bg-blue-50 normal-case transition text-sm"
          >
            Filter
          </button>
          <button
            onClick={handleClear}
            className="bg-white border border-slate-300 text-slate-600 font-semibold px-6 py-2.5 rounded-xl hover:bg-slate-50 normal-case transition text-sm"
          >
            Clear
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">TOPIC NAME</th>
                  <th className="py-4 px-6 text-center">SUBJECT</th>
                  <th className="py-4 px-6 text-center">STATUS</th>
                  <th className="py-4 px-6 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoadingTopics && filteredTopics.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-slate-400"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        <span>Loading topics...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredTopics.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-slate-400"
                    >
                      No topics found.
                    </td>
                  </tr>
                ) : (
                  filteredTopics.map((item) => {
                    const isActive = item.status !== "Inactive";
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/50 transition"
                      >
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900">
                            {item.name}
                          </div>
                          {item.code && (
                            <span className="inline-block mt-1 bg-blue-50 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              {item.code}
                            </span>
                          )}
                          {item.description && (
                            <div className="text-xs text-slate-400 mt-0.5">
                              {item.description}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center text-slate-400 text-xs">
                          {item.subjectName || "— General —"}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            type="button"
                            onClick={() => toggleTopicStatus(item.id)}
                            title="Click to toggle status"
                            className={`text-xs font-semibold px-3 py-1 rounded-full transition cursor-pointer ${
                              isActive
                                ? "bg-emerald-100/70 text-emerald-700 hover:bg-emerald-200"
                                : "bg-rose-100/70 text-rose-700 hover:bg-rose-200"
                            }`}
                          >
                            {isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              title="Edit topic"
                              className="w-8 h-8 rounded-xl border border-slate-300 text-slate-600 flex items-center justify-center hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTopic(item.id)}
                              title="Delete topic"
                              className="w-8 h-8 rounded-xl border border-red-200 text-red-500 flex items-center justify-center hover:bg-red-50 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ═══════════════ ADD TOPIC MODAL ═══════════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="relative bg-white w-full max-w-[440px] rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-[#1a56db] px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-semibold text-[15px]">
                <Plus className="w-5 h-5" strokeWidth={2.5} />
                <span>Add Topic</span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white transition p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTopic} className="p-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{formError}</span>
                </div>
              )}

              {/* TOPIC NAME */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 tracking-wide mb-1.5">
                  TOPIC NAME <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTopicName}
                  onChange={(e) => {
                    setNewTopicName(e.target.value);
                    if (formError) setFormError("");
                  }}
                  placeholder="e.g. Laws of Motion"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
                  Use the standard name — students and teachers will see this.
                </p>
              </div>

              {/* COURSE */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 tracking-wide mb-1.5">
                  COURSE <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={courseOptions}
                  value={newCourseId}
                  onChange={(val) => {
                    setNewCourseId(val);
                    setNewSubjectId("");
                    if (formError) setFormError("");
                  }}
                  placeholder="— Select Course first —"
                />
              </div>

              {/* SUBJECT */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 tracking-wide mb-1.5">
                  SUBJECT <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={addModalSubjectOptions}
                  value={newSubjectId}
                  onChange={(val) => {
                    setNewSubjectId(val);
                    if (formError) setFormError("");
                  }}
                  placeholder={
                    newCourseId
                      ? "— Select Subject —"
                      : "— Select Course first —"
                  }
                  disabled={!newCourseId}
                />
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 tracking-wide mb-1.5">
                  DESCRIPTION{" "}
                  <span className="text-slate-400 font-medium">
                    (OPTIONAL)
                  </span>
                </label>
                <textarea
                  value={newTopicDescription}
                  onChange={(e) => setNewTopicDescription(e.target.value)}
                  placeholder="Brief description of what this topic covers..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addTopicMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-[#1a56db] hover:bg-blue-700 text-white text-sm font-medium flex items-center gap-1.5 shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {addTopicMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" strokeWidth={2.5} />
                  )}
                  Add Topic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════ EDIT TOPIC MODAL ═══════════════ */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setIsEditModalOpen(false)}
          />

          <div className="relative bg-white w-full max-w-[440px] rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-[#1a56db] px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-semibold text-[15px]">
                <Pencil className="w-4 h-4" strokeWidth={2.5} />
                <span>Edit Topic</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-white/80 hover:text-white transition p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTopic} className="p-5 space-y-4">
              {editFormError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{editFormError}</span>
                </div>
              )}

              {/* TOPIC NAME */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 tracking-wide mb-1.5">
                  TOPIC NAME <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editTopicName}
                  onChange={(e) => {
                    setEditTopicName(e.target.value);
                    if (editFormError) setEditFormError("");
                  }}
                  placeholder="e.g. Laws of Motion"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              {/* COURSE */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 tracking-wide mb-1.5">
                  COURSE
                </label>
                <SearchableSelect
                  options={courseOptions}
                  value={editCourseId}
                  onChange={(val) => {
                    setEditCourseId(val);
                    setEditSubjectId("");
                  }}
                  placeholder="— Select Course —"
                />
              </div>

              {/* SUBJECT */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 tracking-wide mb-1.5">
                  SUBJECT
                </label>
                <SearchableSelect
                  options={editModalSubjectOptions}
                  value={editSubjectId}
                  onChange={setEditSubjectId}
                  placeholder="— Select Subject —"
                />
              </div>

              {/* STATUS */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 tracking-wide mb-1.5">
                  STATUS
                </label>
                <div className="flex items-center gap-3 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="radio"
                      name="editStatus"
                      value="Active"
                      checked={editStatus === "Active"}
                      onChange={() => setEditStatus("Active")}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-[11px]">
                      Active
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="radio"
                      name="editStatus"
                      value="Inactive"
                      checked={editStatus === "Inactive"}
                      onChange={() => setEditStatus("Inactive")}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full text-[11px]">
                      Inactive
                    </span>
                  </label>
                </div>
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 tracking-wide mb-1.5">
                  DESCRIPTION{" "}
                  <span className="text-slate-400 font-medium">
                    (OPTIONAL)
                  </span>
                </label>
                <textarea
                  value={editTopicDescription}
                  onChange={(e) => setEditTopicDescription(e.target.value)}
                  placeholder="Brief description of what this topic covers..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#1a56db] hover:bg-blue-700 text-white text-sm font-medium flex items-center gap-1.5 shadow-sm transition"
                >
                  <Check className="w-4 h-4" strokeWidth={2.5} />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}