import {
  useListHomework,
  useListBatches,
  useListCourses,
  useListSubjects,
  getListHomeworkQueryKey,
} from "@workspace/api-client-react";
import { useMemo, useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  BookOpen,
  Clock,
  CalendarCheck,
  Send,
  PieChart,
  Eye,
  Pencil,
  Trash2,
  Paperclip,
  UserRound,
  AlertCircle,
  Filter,
  CheckCircle2,
  X,
  Medal,
  ArrowLeft,
  Download,
  Inbox,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { format, isToday, parseISO, startOfDay } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- Types & Schema ---
const schema = z.object({
  title: z.string().trim().min(2, "Enter homework title"),
  description: z.string().trim().min(5, "Enter instructions"),
  batchId: z.string().min(1, "Select batch"),
  subjectId: z.string().min(1, "Select subject"),
  dueDate: z.string().min(1, "Select due date"),
  fileUrl: z.string().optional(),
  maxMarks: z.string().optional(),
  type: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;
type Option = { label: string; value: string; subLabel?: string };

interface SubmissionItem {
  id: string;
  studentName: string;
  studentCode: string;
  submittedAt: string;
  status: string;
  fileUrl?: string;
  marksObtained?: number;
  gradeBadge?: string;
  note?: string;
}

// --- Helpers ---
function authHeaders() {
  const token = localStorage.getItem("coach_sutra_token") || "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiError(response: Response) {
  try {
    const data = await response.json();
    return data?.error || data?.message || "Error saving homework.";
  } catch {
    return "Error saving homework. Backend check karo.";
  }
}

function showDate(value?: string) {
  const date = new Date(`${String(value ?? "").slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "-" : format(date, "dd MMM yyyy");
}

function showDateTime(value?: string) {
  if (!value) return "-";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      const parsed = parseISO(value);
      return Number.isNaN(parsed.getTime()) ? value : format(parsed, "dd MMM, hh:mm a");
    }
    return format(date, "dd MMM, hh:mm a");
  } catch {
    return value;
  }
}

function getDueStatus(dueDate?: string): "overdue" | "today" | "upcoming" {
  if (!dueDate) return "upcoming";
  try {
    const d = startOfDay(parseISO(String(dueDate).slice(0, 10)));
    const today = startOfDay(new Date());
    if (d < today) return "overdue";
    if (isToday(d)) return "today";
    return "upcoming";
  } catch {
    return "upcoming";
  }
}

// SearchDropdown for Modals
function SearchDropdown({
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
  required = false,
}: {
  label: string;
  value: string;
  options: Option[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const selected = options.find((item) => item.value === value);
  const shown = options.filter((item) =>
    `${item.label} ${item.subLabel ?? ""}`.toLowerCase().includes(term.toLowerCase())
  );
  return (
    <div className="relative space-y-1.5">
      <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setTerm("");
          setOpen(!open);
        }}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 text-left text-sm hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selected ? "text-slate-800 font-medium" : "text-slate-400"}>
          {selected?.label ?? placeholder}
        </span>
        <span className="text-slate-400 text-xs">▼</span>
      </button>
      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          <Input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={`Search ${label.toLowerCase()}...`}
            className="mb-2 h-9 rounded-lg"
          />
          <div className="max-h-48 overflow-y-auto">
            {shown.length ? (
              shown.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(item.value);
                    setOpen(false);
                    setTerm("");
                  }}
                  className="flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm hover:bg-indigo-50"
                >
                  <span className="font-medium text-slate-800">{item.label}</span>
                  {item.subLabel && (
                    <span className="text-xs text-slate-400">{item.subLabel}</span>
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-3 text-center text-sm text-slate-400">No match found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// NEW: Searchable Dropdown specifically for Filters
function FilterSearchDropdown({
  value,
  options,
  placeholder,
  onChange,
  widthClass = "w-[150px]",
}: {
  value: string;
  options: Option[];
  placeholder: string;
  onChange: (value: string) => void;
  widthClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const selected = options.find((item) => item.value === value);
  const shown = options.filter((item) =>
    `${item.label} ${item.subLabel ?? ""}`.toLowerCase().includes(term.toLowerCase())
  );

  return (
    <div className={`relative ${widthClass}`}>
      <button
        type="button"
        onClick={() => {
          setTerm("");
          setOpen(!open);
        }}
        className="flex h-8 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 text-left text-xs font-medium text-slate-700 hover:border-slate-300 transition-colors"
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <span className="text-slate-400 text-[10px] ml-1 shrink-0">▼</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 w-full min-w-[180px] rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
            <Input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search..."
              className="mb-2 h-8 rounded-lg text-xs focus-visible:ring-1 focus-visible:ring-[#5C59E8]"
            />
            <div className="max-h-48 overflow-y-auto">
              {shown.length ? (
                shown.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onChange(item.value);
                      setOpen(false);
                      setTerm("");
                    }}
                    className={`flex w-full flex-col rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                      item.value === value
                        ? "bg-indigo-50 text-[#5C59E8] font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.subLabel ? (
                      <span className="text-[10px] text-slate-400 mt-0.5">{item.subLabel}</span>
                    ) : null}
                  </button>
                ))
              ) : (
                <div className="px-2 py-3 text-center text-xs text-slate-400">No match</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ==========================================
// REVIEW & GRADING VIEW
// ==========================================
function ReviewView({
  homework,
  onBack,
}: {
  homework: any;
  onBack: () => void;
}) {
  const maxMarks = homework.maxMarks ?? homework.marks ?? 10;
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradeModalTarget, setGradeModalTarget] = useState<SubmissionItem | null>(null);
  const [savingGrade, setSavingGrade] = useState(false);

  const [inputMarks, setInputMarks] = useState("");
  const [inputGrade, setInputGrade] = useState("");
  const [inputNote, setInputNote] = useState("");

  useEffect(() => {
    async function fetchSubmissions() {
      setLoading(true);
      try {
        const response = await fetch(`/api/homework/${homework.id}/submissions`, {
          headers: authHeaders(),
        });
        if (response.ok) {
          const data = await response.json();
          const list = Array.isArray(data) ? data : data.submissions || [];
          setSubmissions(
            list.map((s: any, idx: number) => ({
              id: s.id || String(idx + 1),
              studentName: s.studentName || s.student?.name || s.userName || "Student",
              studentCode: s.studentCode || s.studentRegistrationNo || s.student?.code || s.rollNo || "—",
              submittedAt: s.submittedAt || s.createdAt || new Date().toISOString(),
              status: s.status || (s.marksObtained !== undefined ? "Graded" : "Submitted"),
              fileUrl: s.fileUrl || s.attachmentUrl || "",
              marksObtained: s.marksObtained ?? s.marks,
              gradeBadge: (s.gradeBadge ?? s.grade) || "A+",
              note: s.note ?? s.remarks ?? "",
            }))
          );
        } else if (Array.isArray(homework.submissions) && homework.submissions.length > 0) {
          setSubmissions(
            homework.submissions.map((s: any, idx: number) => ({
              id: s.id || String(idx + 1),
              studentName: s.studentName || s.name || "Student",
              studentCode: s.studentCode || s.code || "—",
              submittedAt: s.submittedAt || s.createdAt || new Date().toISOString(),
              status: s.status || "Submitted",
              fileUrl: s.fileUrl || "",
              marksObtained: s.marksObtained ?? s.marks,
              gradeBadge: (s.gradeBadge ?? s.grade) || "A+",
              note: s.note ?? s.remarks ?? "",
            }))
          );
        } else {
          setSubmissions([]);
        }
      } catch {
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    }
    fetchSubmissions();
  }, [homework.id, homework.submissions]);

  const openGradeModal = (sub: SubmissionItem) => {
    setGradeModalTarget(sub);
    setInputMarks(sub.marksObtained !== undefined ? String(sub.marksObtained) : "");
    setInputGrade(sub.gradeBadge || "A+");
    setInputNote(sub.note || "");
  };

  const handleSaveGrade = async () => {
    if (!gradeModalTarget) return;
    setSavingGrade(true);
    try {
      const updatedMarks = inputMarks ? Number(inputMarks) : 0;
      const updatedGrade = inputGrade.trim() || "A+";
      const updatedNote = inputNote.trim();

      await fetch(`/api/homework-submissions/${gradeModalTarget.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          marksObtained: updatedMarks,
          gradeBadge: updatedGrade,
          note: updatedNote,
          status: "Graded",
        }),
      }).catch(() => null);

      setSubmissions((prev) =>
        prev.map((item) =>
          item.id === gradeModalTarget.id
            ? { ...item, marksObtained: updatedMarks, gradeBadge: updatedGrade, note: updatedNote, status: "Graded" }
            : item
        )
      );
      setGradeModalTarget(null);
    } catch {
      setSubmissions((prev) =>
        prev.map((item) =>
          item.id === gradeModalTarget.id
            ? {
                ...item,
                marksObtained: inputMarks ? Number(inputMarks) : item.marksObtained,
                gradeBadge: inputGrade.trim() || item.gradeBadge,
                note: inputNote.trim(),
                status: "Graded",
              }
            : item
        )
      );
      setGradeModalTarget(null);
    } finally {
      setSavingGrade(false);
    }
  };

  return (
    <div className="box-border w-full max-w-full overflow-x-hidden bg-[#eff1f6] min-h-screen p-4 sm:p-6 font-sans text-slate-800">
      <div className="flex items-center gap-3 mb-5">
        <Button
          variant="outline"
          size="icon"
          onClick={onBack}
          className="h-9 w-9 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-[#5C59E8] tracking-tight break-words">
            {homework.title}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5 break-words">
            {homework.batchName || "Batch"} · Due: {showDate(homework.dueDate)}, 12:00 AM
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100/80 w-full overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 font-medium text-sm">Loading student submissions...</div>
        ) : submissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF2FF]">
              <Inbox className="h-7 w-7 text-[#5C59E8]" strokeWidth={1.5} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No submissions received yet</h3>
            <p className="mt-1 max-w-md text-xs text-slate-500">
              Jab student apna homework submit karenge, tab unki file aur details yahan dikhegi.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[#EEF2FF] border-b border-slate-100">
                  {["STUDENT", "SUBMITTED", "STATUS", "FILE", `MARKS / ${maxMarks}`, "ACTION"].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-[10px] font-bold text-[#5C59E8] uppercase tracking-wider ${
                        h === "ACTION" ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 align-middle">
                      <div className="font-bold text-slate-900 text-sm break-words">{sub.studentName}</div>
                      <div className="text-[11px] text-slate-400 font-medium mt-0.5">{sub.studentCode}</div>
                    </td>
                    <td className="px-4 py-3 align-middle text-sm font-semibold text-slate-800 whitespace-nowrap">
                      {showDateTime(sub.submittedAt)}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span
                        className={`text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-block ${
                          sub.status === "Graded" ? "bg-[#059669]" : "bg-[#3B82F6]"
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {sub.fileUrl ? (
                        <a
                          href={sub.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-slate-300 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-50"
                        >
                          <Download className="w-3 h-3 text-slate-500" /> Download
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400">No File</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-[#059669]">
                          {sub.marksObtained !== undefined ? Number(sub.marksObtained).toFixed(2) : "—"}
                        </span>
                        {sub.gradeBadge && (
                          <span className="bg-[#5C59E8] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {sub.gradeBadge}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openGradeModal(sub)}
                        className="h-7 px-2.5 rounded-lg border-[#3B82F6] text-[#3B82F6] hover:bg-blue-50 text-[11px] font-semibold gap-1"
                      >
                        <Pencil className="w-3 h-3" /> Grade
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading &&
          submissions.map(
            (sub) =>
              sub.note && (
                <div key={`note-${sub.id}`} className="bg-slate-50/80 px-4 py-2.5 border-t border-slate-100 text-[11px] text-slate-500 font-medium break-words">
                  <span className="font-bold text-slate-600">Note:</span> {sub.note}
                </div>
              )
          )}
      </div>

      {/* Grade Dialog matching your exact screenshot design */}
      <Dialog open={Boolean(gradeModalTarget)} onOpenChange={(v) => !v && setGradeModalTarget(null)}>
        <DialogContent className="sm:max-w-[480px] w-[calc(100%-1.5rem)] p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-2xl [&>button]:hidden">
          <div className="bg-[#1D61D1] px-5 py-3.5 text-white flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Grade Submission</h2>
            <button type="button" onClick={() => setGradeModalTarget(null)} className="rounded-full p-1 text-white/80 hover:bg-white/20">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-5 space-y-4 bg-white">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  MARKS (MAX: {maxMarks})
                </label>
                <Input
                  type="number"
                  step="0.1"
                  max={maxMarks}
                  value={inputMarks}
                  onChange={(e) => setInputMarks(e.target.value)}
                  placeholder="9"
                  className="h-10 rounded-xl border-slate-200 focus-visible:ring-[#1D61D1] text-sm font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">GRADE</label>
                <Select value={inputGrade || "A+"} onValueChange={setInputGrade}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 focus:ring-[#1D61D1] text-sm font-medium text-slate-800">
                    <SelectValue placeholder="A+" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="—">—</SelectItem>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                    <SelectItem value="D">D</SelectItem>
                    <SelectItem value="F">F</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">FEEDBACK</label>
              <Textarea
                rows={3}
                value={inputNote}
                onChange={(e) => setInputNote(e.target.value)}
                placeholder="okay"
                className="rounded-xl border-slate-200 focus-visible:ring-[#1D61D1] resize-y min-h-[80px] text-sm"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" onClick={() => setGradeModalTarget(null)} className="h-9 px-4 rounded-xl bg-[#6C757D] hover:bg-[#5a6268] text-white font-semibold text-sm border-0">
                Cancel
              </Button>
              <Button type="button" onClick={handleSaveGrade} disabled={savingGrade} className="h-9 px-5 rounded-xl bg-[#1D61D1] hover:bg-[#1853BC] text-white font-semibold text-sm border-0 shadow-sm">
                {savingGrade ? "Saving..." : "Submit Grade"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// MAIN HOMEWORK COMPONENT
// ==========================================
export default function Homework() {
  const [location] = useLocation();
  const pageType =
    new URLSearchParams(location.split("?")[1] ?? window.location.search).get("type") === "computer"
      ? "computer"
      : "academic";
  const title = pageType === "computer" ? "Computer Homework" : "Homework & Assignments";

  const { data: homeworks, isLoading } = useListHomework();
  const { data: batches } = useListBatches();
  const { data: courses } = useListCourses();
  const { data: subjects } = useListSubjects();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [reviewingHw, setReviewingHw] = useState<any>(null);
  const [filterBatch, setFilterBatch] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaults: FormValues = {
    title: "", description: "", batchId: "", subjectId: "", dueDate: "", fileUrl: "", maxMarks: "10", type: "Homework",
  };
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults });

  const courseList = useMemo(
    () => ((courses ?? []) as any[]).filter((c) => (c.courseType ?? "academic") === pageType),
    [courses, pageType]
  );
  const courseIds = useMemo(() => new Set(courseList.map((c) => String(c.id))), [courseList]);
  const batchList = useMemo(
    () => ((batches ?? []) as any[]).filter((b) => courseIds.has(String(b.courseId ?? ""))),
    [batches, courseIds]
  );
  const subjectList = useMemo(
    () => ((subjects ?? []) as any[]).filter((s) => courseIds.has(String(s.courseId ?? ""))),
    [subjects, courseIds]
  );

  const formBatches = batchList;
  const watchedBatchId = form.watch("batchId");
  const formSubjects = useMemo(() => {
    if (!watchedBatchId) return subjectList;
    const batch = batchList.find((b) => b.id === watchedBatchId);
    if (!batch) return subjectList;
    return subjectList.filter((s) => String(s.courseId) === String(batch.courseId));
  }, [subjectList, batchList, watchedBatchId]);

  const allPageHomeworks = useMemo(() => {
    return ((homeworks ?? []) as any[]).filter((hw) => {
      const batch = batchList.find((b) => b.id === hw.batchId);
      return courseIds.has(String(batch?.courseId ?? ""));
    });
  }, [homeworks, batchList, courseIds]);

  const stats = useMemo(() => {
    let overdue = 0, active = 0, totalSubs = 0;
    for (const hw of allPageHomeworks) {
      if (getDueStatus(hw.dueDate) === "overdue") overdue++;
      else active++;
      totalSubs += Number(hw.submissionCount ?? hw.submissions?.length ?? 0);
    }
    return { total: allPageHomeworks.length, overdue, active, totalSubs, topType: "Homework" };
  }, [allPageHomeworks]);

  const visibleHomeworks = useMemo(() => {
    const term = search.toLowerCase();
    return allPageHomeworks.filter((hw) => {
      const status = getDueStatus(hw.dueDate);
      const type = (hw.type ?? "homework").toLowerCase();
      if (filterBatch !== "all" && String(hw.batchId) !== String(filterBatch)) return false;
      if (filterType !== "all" && type !== filterType) return false;
      if (filterStatus === "overdue" && status !== "overdue") return false;
      if (filterStatus === "active" && status === "overdue") return false;
      if (filterStatus === "upcoming" && status !== "upcoming") return false;
      return `${hw.title} ${hw.description} ${hw.subjectName} ${hw.batchName} ${hw.teacherName ?? ""}`
        .toLowerCase()
        .includes(term);
    });
  }, [allPageHomeworks, filterBatch, filterType, filterStatus, search]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: getListHomeworkQueryKey() });

  const startAdd = () => {
    setMessage(""); setEditTarget(null); setSelectedFile(null); form.reset(defaults); setOpen(true);
  };

  const startEdit = (hw: any) => {
    setMessage(""); setEditTarget(hw); setSelectedFile(null);
    form.reset({
      title: hw.title ?? "", description: hw.description ?? "", batchId: hw.batchId ?? "", subjectId: hw.subjectId ?? "",
      dueDate: String(hw.dueDate ?? "").slice(0, 10), fileUrl: hw.fileUrl ?? "",
      maxMarks: String(hw.maxMarks ?? hw.marks ?? "10"),
      type: hw.type ? String(hw.type).charAt(0).toUpperCase() + String(hw.type).slice(1) : "Homework",
    });
    setOpen(true);
  };

  const submit = async (values: FormValues) => {
    setMessage("");
    const batch = batchList.find((b) => b.id === values.batchId);
    const subject = subjectList.find((s) => s.id === values.subjectId);
    if (!batch || !subject || String(batch.courseId) !== String(subject.courseId)) {
      setMessage("Please select a valid Batch and Subject."); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...values, title: values.title.trim(), description: values.description.trim(),
        fileUrl: selectedFile ? selectedFile.name : values.fileUrl?.trim() ?? "",
        maxMarks: values.maxMarks ? Number(values.maxMarks) : 10, type: values.type || "Homework",
      };
      const response = await fetch(editTarget ? `/api/homework/${editTarget.id}` : "/api/homework", {
        method: editTarget ? "PATCH" : "POST", headers: authHeaders(), body: JSON.stringify(payload),
      });
      if (!response.ok) { setMessage(await apiError(response)); return; }
      await refresh(); setOpen(false); form.reset(defaults); setEditTarget(null); setSelectedFile(null);
    } catch { setMessage("Error saving homework."); }
    finally { setSaving(false); }
  };

  const deleteHomework = async (hw: any) => {
    if (!window.confirm(`Delete "${hw.title}"?`)) return;
    setDeletingId(hw.id); setMessage("");
    try {
      const response = await fetch(`/api/homework/${hw.id}`, { method: "DELETE", headers: authHeaders() });
      if (!response.ok) { setMessage(await apiError(response)); return; }
      await refresh();
    } catch { setMessage("Error deleting homework."); }
    finally { setDeletingId(null); }
  };

  const clearFilters = () => { setSearch(""); setFilterBatch("all"); setFilterType("all"); setFilterStatus("all"); };
  const hasActiveFilters = search.trim() !== "" || filterBatch !== "all" || filterType !== "all" || filterStatus !== "all";

  if (reviewingHw) {
    return <ReviewView homework={reviewingHw} onBack={() => setReviewingHw(null)} />;
  }

  return (
    <div className="box-border w-full max-w-full overflow-x-hidden bg-[#eff1f6] min-h-screen p-4 sm:p-5 font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-[#5C59E8] tracking-tight">{title}</h1>
          <p className="text-[12px] text-slate-500 font-medium mt-0.5">
            {stats.total} total · {stats.overdue} overdue · {stats.totalSubs} submissions received
          </p>
        </div>
        <Button onClick={startAdd} className="bg-[#5C59E8] hover:bg-[#4E4AE0] text-white rounded-full h-9 px-4 font-semibold text-sm shadow-md shrink-0">
          <Plus className="w-4 h-4 mr-1" /> Assign Homework
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-4">
        {[
          { v: stats.total, l: "Total Assigned", i: BookOpen, c: "text-slate-800" },
          { v: stats.overdue, l: "Overdue", i: Clock, c: "text-red-500" },
          { v: stats.active, l: "Active / Upcoming", i: CalendarCheck, c: "text-emerald-500" },
          { v: stats.totalSubs, l: "Total Submissions", i: Send, c: "text-[#5C59E8]" },
          { v: stats.topType, l: "Top Type", i: PieChart, c: "text-[#5C59E8] text-lg" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-3.5 shadow-sm flex items-center justify-between min-w-0">
            <div className="min-w-0 pr-1">
              <div className={`text-2xl font-bold tracking-tight leading-none ${s.c}`}>{s.v}</div>
              <div className="mt-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">{s.l}</div>
            </div>
            <s.i className="w-6 h-6 text-slate-300 shrink-0" strokeWidth={1.5} />
          </div>
        ))}
      </div>

      {/* Searchable Custom Filters */}
      <div className="bg-white rounded-xl p-2 shadow-sm mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, subject, batch..."
            className="w-full h-8 pl-8 bg-white border-slate-200 rounded-lg text-sm focus-visible:ring-1 focus-visible:ring-[#5C59E8]" />
        </div>
        
        <FilterSearchDropdown
          value={filterBatch} placeholder="All Batches" widthClass="w-[140px]"
          onChange={setFilterBatch}
          options={[{ label: "All Batches", value: "all" }, ...batchList.map((b) => ({ label: b.name, value: b.id, subLabel: courseList.find((c) => c.id === b.courseId)?.name }))]}
        />
        
        <FilterSearchDropdown
          value={filterType} placeholder="All Types" widthClass="w-[120px]"
          onChange={setFilterType}
          options={[
            { label: "All Types", value: "all" },
            { label: "Homework", value: "homework" },
            { label: "Assignment", value: "assignment" },
            { label: "Classwork", value: "classwork" },
            { label: "Project", value: "project" },
            { label: "Test", value: "test" },
          ]}
        />

        <FilterSearchDropdown
          value={filterStatus} placeholder="All Status" widthClass="w-[120px]"
          onChange={setFilterStatus}
          options={[
            { label: "All Status", value: "all" },
            { label: "Overdue", value: "overdue" },
            { label: "Active", value: "active" },
            { label: "Upcoming", value: "upcoming" },
          ]}
        />

        <Button className="h-8 px-3 bg-[#5C59E8] hover:bg-[#4E4AE0] text-white rounded-lg text-xs font-medium shadow-sm">
          <Filter className="w-3 h-3 mr-1" /> Filter
        </Button>
        <Button variant="ghost" onClick={clearFilters} className="h-8 px-2 text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-medium">
          Clear
        </Button>
      </div>

      {message && !open && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 font-medium">{message}</div>
      )}

      {/* Table Area */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100/60 w-full overflow-hidden">
        {isLoading ? (
          <div className="py-14 text-center text-slate-400 font-medium text-sm">Loading homeworks...</div>
        ) : visibleHomeworks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF2FF]">
              <BookOpen className="h-7 w-7 text-[#5C59E8]" strokeWidth={1.5} />
            </div>
            {hasActiveFilters ? (
              <>
                <h3 className="text-sm font-bold text-slate-800">No homework match your filters</h3>
                <p className="mt-1 max-w-sm text-xs text-slate-500">Try changing search or filters.</p>
                <Button variant="outline" onClick={clearFilters} className="mt-4 h-9 rounded-xl border-slate-200 px-4 text-xs font-semibold text-slate-600">
                  Clear Filters
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-sm font-bold text-slate-800">No homework assigned yet</h3>
                <p className="mt-1 max-w-sm text-xs text-slate-500">Apni pehli homework assign karo.</p>
                <Button onClick={startAdd} className="mt-4 h-9 rounded-full bg-[#5C59E8] px-5 text-xs font-semibold text-white shadow-md hover:bg-[#4E4AE0]">
                  <Plus className="mr-1 h-3.5 w-3.5" /> Assign Homework
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full table-fixed border-collapse min-w-[860px]">
              <colgroup>
                <col style={{ width: "22%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "17%" }} />
              </colgroup>
              <thead>
                <tr className="bg-[#EEF2FF]">
                  {["Assignment", "Batch", "Subject", "Type", "Due Date", "Submissions", "Actions"].map((h) => (
                    <th
                      key={h}
                      className={`px-3 py-2.5 text-[10px] font-bold text-[#5C59E8] uppercase tracking-wider ${
                        h === "Actions" ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleHomeworks.map((hw: any) => {
                  const status = getDueStatus(hw.dueDate);
                  const batch = batchList.find((b) => b.id === hw.batchId);
                  const submitted = Number(hw.submissionCount ?? hw.submissions?.length ?? 0);
                  const totalStudents = Number(
                    hw.totalStudents ?? hw.studentCount ?? hw.studentsCount ?? hw.students?.length ??
                    batch?.studentCount ?? batch?.totalStudents ?? batch?.studentsCount ??
                    batch?.enrolledCount ?? batch?.enrolledStudentsCount ?? batch?.students?.length ??
                    batch?.studentIds?.length ?? 0
                  );
                  const marks = hw.maxMarks ?? hw.marks ?? 10;
                  const teacher =
                    hw.teacherName || subjectList.find((s) => s.id === hw.subjectId)?.teacherName || "—";
                  const batchName = batch?.name || hw.batchName || "—";

                  return (
                    <tr key={hw.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-3 align-top">
                        <div className="font-bold text-slate-800 text-[13px] leading-snug break-words whitespace-normal">
                          {hw.title}
                        </div>
                        <div className="mt-1 space-y-0.5">
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                            <Medal className="w-3 h-3 shrink-0 text-slate-400" />
                            <span>{marks} marks</span>
                          </div>
                          <div className="flex items-start gap-1 text-[11px] text-slate-400 font-medium">
                            <UserRound className="w-3 h-3 shrink-0 text-slate-400 mt-0.5" />
                            <span className="break-words leading-tight">{teacher}</span>
                          </div>
                          {hw.fileUrl ? (
                            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                              <Paperclip className="w-3 h-3 shrink-0 text-slate-400" />
                              <span>Attachment</span>
                            </div>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-3 py-3 align-top">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="bg-slate-100 text-slate-700 text-[11px] px-2 py-1 rounded-md font-medium break-words whitespace-normal leading-snug">
                            {batchName}
                          </span>
                          {(hw.batchLevel || hw.level || batch?.level) && (
                            <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-md font-medium break-words">
                              {hw.batchLevel || hw.level || batch?.level}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3 align-top">
                        <span className="bg-slate-100 text-slate-700 text-[11px] px-2 py-1 rounded-md font-medium break-words whitespace-normal inline-block">
                          {hw.subjectName || "—"}
                        </span>
                      </td>

                      <td className="px-3 py-3 align-top whitespace-nowrap">
                        <span className="bg-[#EEF2FF] text-[#5C59E8] text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <BookOpen className="w-3 h-3 shrink-0" />
                          <span>{hw.type ? String(hw.type).charAt(0).toUpperCase() + String(hw.type).slice(1) : "Homework"}</span>
                        </span>
                      </td>

                      <td className="px-3 py-3 align-top whitespace-nowrap">
                        <div className="text-[12px] font-bold text-slate-800">{showDate(hw.dueDate)}</div>
                        {status === "overdue" && (
                          <div className="mt-0.5 flex items-center gap-0.5 text-[9px] font-bold text-red-500 uppercase">
                            <AlertCircle className="w-2.5 h-2.5 shrink-0" /> OVERDUE
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-3 align-top">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="h-1 w-10 bg-slate-100 rounded-full overflow-hidden shrink-0">
                            <div
                              className={`h-full rounded-full ${
                                submitted === 0 ? "bg-red-400"
                                  : submitted >= totalStudents && totalStudents > 0 ? "bg-emerald-500"
                                  : "bg-[#5C59E8]"
                              }`}
                              style={{
                                width: totalStudents > 0 ? `${Math.min(100, (submitted / totalStudents) * 100)}%` : "0%",
                              }}
                            />
                          </div>
                          <span className={`text-[11px] font-bold whitespace-nowrap ${submitted === 0 ? "text-red-500" : "text-slate-700"}`}>
                            {submitted}/{totalStudents}
                          </span>
                        </div>
                      </td>

                      <td className="px-2 py-3 align-top">
                        <div className="flex items-center justify-end gap-1 flex-nowrap">
                          <Button
                            variant="outline" size="sm"
                            className="h-7 px-2 rounded-md border-slate-200 text-slate-600 text-[10px] font-semibold hover:bg-slate-50 shrink-0"
                            onClick={() => setReviewingHw(hw)}
                          >
                            <Eye className="w-3 h-3 mr-0.5 text-slate-400 shrink-0" /> Review
                          </Button>
                          <Button
                            variant="outline" size="sm"
                            className="h-7 px-2 rounded-md border-slate-200 text-slate-600 text-[10px] font-semibold hover:bg-slate-50 shrink-0"
                            onClick={() => startEdit(hw)}
                          >
                            <Pencil className="w-3 h-3 mr-0.5 text-slate-400 shrink-0" /> Edit
                          </Button>
                          <Button
                            variant="outline" size="icon"
                            className="h-7 w-7 rounded-md border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0"
                            title="Delete"
                            onClick={() => deleteHomework(hw)}
                            disabled={deletingId === hw.id}
                          >
                            {deletingId === hw.id ? <span className="text-[9px]">...</span> : <Trash2 className="w-3 h-3" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setMessage(""); setSelectedFile(null); } }}>
        <DialogContent className="sm:max-w-[600px] w-[calc(100%-1.5rem)] p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-2xl [&>button]:hidden">
          <div className="relative bg-gradient-to-r from-[#5B4DC7] via-[#6D5CE7] to-[#8B5CF6] px-5 py-4 text-white">
            <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-3 rounded-full p-1 text-white/80 hover:bg-white/20">
              <X className="h-5 w-5" />
            </button>
            <DialogHeader className="space-y-0.5">
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-white">
                <Plus className="h-5 w-5" strokeWidth={2.5} />
                {editTarget ? "Update Homework" : "Assign New Homework"}
              </DialogTitle>
              <p className="text-sm text-white/80 font-normal">Create an assignment and notify students instantly</p>
            </DialogHeader>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto bg-white">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">Title <span className="text-red-500">*</span></FormLabel>
                  <FormControl><Input placeholder="e.g. Laws of Motion Practice Problems" className="h-10 rounded-xl border-slate-200 focus-visible:ring-[#6D5CE7]" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid gap-3 sm:grid-cols-2">
                <SearchDropdown label="Batch" required value={form.watch("batchId")} placeholder="— Select Batch —"
                  options={formBatches.map((b) => ({ label: b.name, value: b.id, subLabel: courseList.find((c) => c.id === b.courseId)?.name ?? "Batch" }))}
                  onChange={(v) => { form.setValue("batchId", v, { shouldValidate: true }); form.setValue("subjectId", ""); }} />
                <SearchDropdown label="Subject" required value={form.watch("subjectId")} placeholder="— Select Subject —" disabled={!form.watch("batchId")}
                  options={formSubjects.map((s) => ({ label: s.name, value: s.id, subLabel: s.code ? `Code: ${s.code}` : "Subject" }))}
                  onChange={(v) => form.setValue("subjectId", v, { shouldValidate: true })} />
              </div>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">Type</FormLabel>
                    <Select value={field.value || "Homework"} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger className="h-10 rounded-xl border-slate-200"><SelectValue placeholder="Homework" /></SelectTrigger></FormControl>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Homework">Homework</SelectItem>
                        <SelectItem value="Assignment">Assignment</SelectItem>
                        <SelectItem value="Classwork">Classwork</SelectItem>
                        <SelectItem value="Project">Project</SelectItem>
                        <SelectItem value="Test">Test</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="maxMarks" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">Max Marks</FormLabel>
                    <FormControl><Input type="number" min={1} placeholder="10" className="h-10 rounded-xl border-slate-200 focus-visible:ring-[#6D5CE7]" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="dueDate" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">Due Date <span className="text-red-500">*</span></FormLabel>
                    <FormControl><Input type="date" className="h-10 rounded-xl border-slate-200 focus-visible:ring-[#6D5CE7] text-sm" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">Description</FormLabel>
                  <FormControl><Textarea rows={3} placeholder="Describe the homework in detail..." className="rounded-xl border-slate-200 focus-visible:ring-[#6D5CE7] resize-none" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="space-y-1">
                <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  Attachment <span className="font-medium normal-case tracking-normal text-slate-400">(Optional)</span>
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                  <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; setSelectedFile(f || null); if (f) form.setValue("fileUrl", f.name); }} />
                  <Button type="button" variant="outline" size="sm" className="h-7 rounded-lg border-slate-300 text-xs font-semibold shrink-0" onClick={() => fileInputRef.current?.click()}>Choose File</Button>
                  <span className="text-sm text-slate-400 truncate flex-1">{selectedFile ? selectedFile.name : form.watch("fileUrl") || "No file chosen"}</span>
                  {(selectedFile || form.watch("fileUrl")) && (
                    <button type="button" className="text-slate-400 hover:text-red-500 shrink-0" onClick={() => { setSelectedFile(null); form.setValue("fileUrl", ""); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              {message && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 font-medium">{message}</div>}
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button type="button" variant="outline" className="h-9 rounded-xl px-4 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
                <Button type="submit" className="h-9 rounded-xl px-5 bg-[#5C59E8] hover:bg-[#4E4AE0] font-semibold gap-1.5 text-white border-0" disabled={saving}>
                  <CheckCircle2 className="h-4 w-4" />
                  {saving ? "Saving..." : editTarget ? "Update Homework" : "Assign Homework"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}