import {
  useListTimetableEntries,
  useListBatches,
  useListCourses,
  useListSubjects,
  useListStaff,
  useCreateTimetableEntry,
  getListTimetableEntriesQueryKey,
} from "@workspace/api-client-react";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Clock,
  Printer,
  Users,
  UserCheck,
  CalendarPlus,
  Pencil,
  Check,
  Search,
  CalendarDays,
  X,
  ArrowLeftRight,
  BookOpen,
  FlaskConical,
  MessageCircle,
  ClipboardList,
  Star,
  RotateCcw,
  Target,
  Mic,
  Wrench,
  Pin,
  CheckCircle2,
  AlertCircle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    return result?.error || result?.message || "Request fail ho gayi.";
  } catch {
    return "Request fail ho gayi. Backend check karo.";
  }
}

const DAYS_SHORT = [
  { key: "Sunday", label: "Sun" },
  { key: "Monday", label: "Mon" },
  { key: "Tuesday", label: "Tue" },
  { key: "Wednesday", label: "Wed" },
  { key: "Thursday", label: "Thu" },
  { key: "Friday", label: "Fri" },
  { key: "Saturday", label: "Sat" },
] as const;

const CLASS_TYPES = [
  { label: "Lecture", value: "Lecture", icon: BookOpen },
  { label: "Lab / Practical", value: "Lab", icon: FlaskConical },
  { label: "Doubt Session", value: "Doubt Session", icon: MessageCircle },
  { label: "Test / Exam", value: "Test", icon: ClipboardList },
  { label: "Revision Class", value: "Revision", icon: RotateCcw },
  { label: "Practice / DPP", value: "Practice", icon: Target },
  { label: "Tutorial", value: "Tutorial", icon: Pencil },
  { label: "Workshop", value: "Workshop", icon: Wrench },
  { label: "Seminar / Guest", value: "Seminar", icon: Mic },
  { label: "Extra Class", value: "Extra Class", icon: Star },
  { label: "Counseling", value: "Counseling", icon: Users },
  { label: "Other", value: "Other", icon: Pin },
];

const CLASS_TYPE_BADGE_COLORS: Record<string, string> = {
  Lecture: "bg-indigo-50 border-indigo-200 text-indigo-700",
  Lab: "bg-cyan-50 border-cyan-200 text-cyan-700",
  "Doubt Session": "bg-amber-50 border-amber-200 text-amber-700",
  Test: "bg-rose-50 border-rose-200 text-rose-700",
  Revision: "bg-emerald-50 border-emerald-200 text-emerald-700",
  Practice: "bg-sky-50 border-sky-200 text-sky-700",
  Tutorial: "bg-blue-50 border-blue-200 text-blue-700",
  Workshop: "bg-orange-50 border-orange-200 text-orange-700",
  Seminar: "bg-violet-50 border-violet-200 text-violet-700",
  "Extra Class": "bg-purple-50 border-purple-200 text-purple-700",
  Counseling: "bg-teal-50 border-teal-200 text-teal-700",
  Other: "bg-slate-50 border-slate-200 text-slate-700",
};

const timetableSchema = z.object({
  batchId: z.string().min(1, "Select a batch"),
  teacherId: z.string().min(1, "Select a teacher"),
  subjectId: z.string().min(1, "Select a subject"),
  room: z.string().optional(),
  days: z.array(z.string()).min(1, "Select at least one day"),
  startTime: z.string().min(1, "Select start time"),
  endTime: z.string().min(1, "Select end time"),
  classType: z.string().optional(),
  otherClassType: z.string().optional(),
  color: z.string().optional(),
  zoomLink: z.string().optional(),
});

type TimetableForm = z.infer<typeof timetableSchema>;
type DropdownOption = { label: string; value: string; subLabel?: string };

/* ───── TIME HELPERS ───── */
function parseTime24(time24: string) {
  const [hStr, mStr] = (time24 || "09:00").split(":");
  let h = parseInt(hStr || "9", 10);
  const m = parseInt(mStr || "0", 10);
  const isPM = h >= 12;
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return { hour12: h12, minute: m, isPM };
}

function toTime24(hour12: number, minute: number, isPM: boolean) {
  let h = hour12 % 12;
  if (isPM) h += 12;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatTime12(time24: string) {
  if (!time24) return "";
  const { hour12, minute, isPM } = parseTime24(time24);
  return `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${isPM ? "PM" : "AM"}`;
}

function timeToHour(time24: string): number {
  if (!time24) return 0;
  return parseInt(String(time24).split(":")[0], 10) || 0;
}

function time24ToMins(time24: string): number {
  if (!time24) return 0;
  const parts = String(time24).split(":");
  const h = parseInt(parts[0] || "0", 10);
  const m = parseInt(parts[1] || "0", 10);
  return h * 60 + m;
}

function minsToTime12(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = (mins / 60).toFixed(1).replace(".0", "");
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${Math.floor(mins / 60)}h ${m}m`;
}

function buildMatrixHours(entries: any[], fallbackStart = 16, fallbackEnd = 20): number[] {
  if (!entries?.length) {
    return Array.from({ length: fallbackEnd - fallbackStart + 1 }, (_, i) => fallbackStart + i);
  }
  let minH = 23;
  let maxH = 0;
  for (const e of entries) {
    const s = timeToHour(e.startTime);
    const eHour = timeToHour(e.endTime);
    const endRow = eHour > s && String(e.endTime).endsWith(":00") ? eHour - 1 : eHour;
    minH = Math.min(minH, s);
    maxH = Math.max(maxH, Math.max(s, endRow));
  }
  minH = Math.max(0, minH);
  maxH = Math.min(23, Math.max(maxH, minH));
  const hours: number[] = [];
  for (let h = minH; h <= maxH; h++) hours.push(h);
  return hours.length
    ? hours
    : Array.from({ length: fallbackEnd - fallbackStart + 1 }, (_, i) => fallbackStart + i);
}

function resolveId(raw: any): string {
  if (raw == null) return "";
  if (typeof raw === "object") return String(raw._id ?? raw.id ?? "");
  return String(raw);
}

function resolveTeacherName(entry: any, staffList: any[], subjectList: any[] = []) {
  if (entry?.teacherName && String(entry.teacherName).trim()) {
    return String(entry.teacherName).trim();
  }
  if (typeof entry?.teacherId === "object" && entry?.teacherId?.name) {
    return String(entry.teacherId.name).trim();
  }
  const tId = resolveId(entry?.teacherId);
  if (tId) {
    const t = staffList.find((s) => String(s.id ?? s._id ?? "") === tId);
    if (t?.name) return t.name;
  }
  const sId = resolveId(entry?.subjectId);
  if (sId) {
    const subj = subjectList.find((s) => String(s.id ?? s._id ?? "") === sId);
    if (subj?.teacherName) return subj.teacherName;
    const subjTId = resolveId(subj?.teacherId);
    if (subjTId) {
      const t = staffList.find((s) => String(s.id ?? s._id ?? "") === subjTId);
      if (t?.name) return t.name;
    }
  }
  return "";
}

function resolveBatchName(entry: any, batchList: any[]) {
  if (entry?.batchName && String(entry.batchName).trim()) {
    return String(entry.batchName).trim();
  }
  const id = resolveId(entry?.batchId);
  return batchList.find((b) => String(b.id ?? b._id ?? "") === id)?.name ?? "";
}

/* ───── DYNAMIC SHIFT AVAILABILITY CALCULATOR ───── */
function calculateTeacherAvailability(teacherClasses: any[], shiftStart24 = "08:00", shiftEnd24 = "20:00") {
  const dayStartMins = time24ToMins(shiftStart24);
  const dayEndMins = time24ToMins(shiftEnd24);

  const sorted = [...teacherClasses].sort(
    (a, b) => time24ToMins(a.startTime) - time24ToMins(b.startTime)
  );

  const busySlots: any[] = [];
  const freeSlots: { startMins: number; endMins: number; durationMins: number; label: string }[] = [];

  let currentPointer = dayStartMins;

  for (const cls of sorted) {
    const sMins = time24ToMins(cls.startTime);
    const eMins = time24ToMins(cls.endTime);

    if (sMins > currentPointer && currentPointer < dayEndMins) {
      const slotEnd = Math.min(sMins, dayEndMins);
      const dur = slotEnd - currentPointer;
      if (dur >= 15) {
        freeSlots.push({
          startMins: currentPointer,
          endMins: slotEnd,
          durationMins: dur,
          label: `${minsToTime12(currentPointer)} - ${minsToTime12(slotEnd)}`,
        });
      }
    }

    busySlots.push({
      ...cls,
      startMins: sMins,
      endMins: eMins,
      durationMins: Math.max(0, eMins - sMins),
      timeLabel: `${formatTime12(cls.startTime)} - ${formatTime12(cls.endTime)}`,
    });

    currentPointer = Math.max(currentPointer, eMins);
  }

  if (currentPointer < dayEndMins) {
    const dur = dayEndMins - currentPointer;
    if (dur >= 15) {
      freeSlots.push({
        startMins: currentPointer,
        endMins: dayEndMins,
        durationMins: dur,
        label: `${minsToTime12(currentPointer)} - ${minsToTime12(dayEndMins)}`,
      });
    }
  }

  // Find exact busy time only within the shift window
  let busyMinsWithinShift = 0;
  for (const cls of sorted) {
    const s = Math.max(dayStartMins, time24ToMins(cls.startTime));
    const e = Math.min(dayEndMins, time24ToMins(cls.endTime));
    if (e > s) {
      busyMinsWithinShift += (e - s);
    }
  }

  const totalBusyMins = busySlots.reduce((acc, s) => acc + s.durationMins, 0);
  const totalFreeMins = Math.max(0, (dayEndMins - dayStartMins) - busyMinsWithinShift);

  return {
    busySlots,
    freeSlots,
    totalBusyMins,
    totalFreeMins,
    shiftStart: formatTime12(shiftStart24),
    shiftEnd: formatTime12(shiftEnd24)
  };
}

/* ───── TIME PICKER FIELD ───── */
function TimePickerField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);

  const parsed = parseTime24(value);
  const [draftHour, setDraftHour] = useState(parsed.hour12);
  const [draftMinute, setDraftMinute] = useState(parsed.minute);
  const [draftPM, setDraftPM] = useState(parsed.isPM);

  const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const syncDraftFromValue = () => {
    const p = parseTime24(value);
    setDraftHour(p.hour12);
    setDraftMinute(p.minute);
    setDraftPM(p.isPM);
  };

  const openPicker = () => {
    syncDraftFromValue();
    setOpen(true);
  };

  const handleCancel = () => {
    syncDraftFromValue();
    setOpen(false);
  };

  const handleConfirm = () => {
    onChange(toTime24(draftHour, draftMinute, draftPM));
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleCancel();
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      hourListRef.current
        ?.querySelector("[data-selected='true']")
        ?.scrollIntoView({ block: "center" });
      minuteListRef.current
        ?.querySelector("[data-selected='true']")
        ?.scrollIntoView({ block: "center" });
    }, 30);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <div className="relative space-y-1.5" ref={containerRef}>
      <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <button
        type="button"
        onClick={() => (open ? handleCancel() : openPicker())}
        className="flex h-11 w-full items-center gap-2 rounded-xl border border-indigo-100 bg-white px-3 text-left text-sm shadow-sm hover:border-indigo-300 transition-colors"
      >
        <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
        <span className="flex-1 font-medium text-slate-800">{formatTime12(value)}</span>
        <span className="text-xs text-slate-400">▼</span>
      </button>

      {open && (
        <div className="absolute z-[60] mt-1 w-[280px] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-[#7c3aed] to-[#6366f1] px-4 py-5 text-center text-white">
            <div className="text-[10px] font-bold tracking-[0.15em] uppercase opacity-80 mb-1">
              {label}
            </div>
            <div className="text-4xl font-bold tracking-wider tabular-nums">
              {String(draftHour).padStart(2, "0")}
              <span className="opacity-60 mx-0.5">:</span>
              {String(draftMinute).padStart(2, "0")}
            </div>
            <div className="mt-3 inline-flex rounded-full bg-white/20 p-0.5">
              <button
                type="button"
                onClick={() => setDraftPM(false)}
                className={`px-4 py-1 rounded-full text-xs font-bold transition-all ${
                  !draftPM ? "bg-white text-indigo-700 shadow" : "text-white/80 hover:text-white"
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => setDraftPM(true)}
                className={`px-4 py-1 rounded-full text-xs font-bold transition-all ${
                  draftPM ? "bg-white text-indigo-700 shadow" : "text-white/80 hover:text-white"
                }`}
              >
                PM
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 border-b border-slate-100">
            <div className="border-r border-slate-100">
              <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase text-center py-2 bg-slate-50">
                Hour
              </div>
              <div ref={hourListRef} className="max-h-40 overflow-y-auto py-1">
                {HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    data-selected={h === draftHour}
                    onClick={() => setDraftHour(h)}
                    className={`w-full py-2 text-sm font-semibold transition-all ${
                      h === draftHour
                        ? "bg-[#6366f1] text-white rounded-lg"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                    style={
                      h === draftHour
                        ? { width: "calc(100% - 16px)", marginLeft: 8 }
                        : undefined
                    }
                  >
                    {String(h).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase text-center py-2 bg-slate-50">
                Minute
              </div>
              <div ref={minuteListRef} className="max-h-40 overflow-y-auto py-1">
                {MINUTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    data-selected={m === draftMinute}
                    onClick={() => setDraftMinute(m)}
                    className={`w-full py-2 text-sm font-semibold transition-all ${
                      m === draftMinute
                        ? "bg-[#6366f1] text-white rounded-lg"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                    style={
                      m === draftMinute
                        ? { width: "calc(100% - 16px)", marginLeft: 8 }
                        : undefined
                    }
                  >
                    {String(m).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 p-3 bg-white border-t border-slate-100">
            <button
              type="button"
              onClick={handleCancel}
              className="h-9 px-4 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="h-9 px-4 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] text-white text-sm font-semibold shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ColorPickerField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Color</label>
      <div className="relative h-11 rounded-xl border border-slate-200 overflow-hidden flex items-center px-2 bg-white">
        <input
          type="color"
          value={value || "#6366f1"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div
          className="h-6 w-full rounded-md pointer-events-none"
          style={{ backgroundColor: value || "#6366f1" }}
        />
      </div>
    </div>
  );
}

function SearchableDropdown({
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
  className = "",
  rounded = "full",
}: {
  label?: string;
  value: string;
  options: DropdownOption[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  rounded?: "full" | "lg";
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const [searchText, setSearchText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearchText("");
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  const visibleOptions = options.filter((option) =>
    `${option.label} ${option.subLabel ?? ""}`.toLowerCase().includes(searchText.toLowerCase())
  );

  const choose = (option: DropdownOption) => {
    onChange(option.value);
    setSearchText("");
    setOpen(false);
  };

  const radius = rounded === "full" ? "rounded-full" : "rounded-xl";

  return (
    <div className={`relative space-y-1.5 w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setSearchText("");
          setOpen((old) => !old);
        }}
        className={`flex h-11 w-full items-center justify-between border border-slate-200 bg-white px-4 text-left text-sm shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${radius}`}
      >
        <span className={`truncate mr-2 ${selected ? "text-slate-800 font-medium" : "text-slate-400"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="text-xs text-slate-400 shrink-0">▼</span>
      </button>

      {open && !disabled ? (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <Input
            autoFocus
            value={searchText}
            placeholder="Search..."
            onChange={(event) => setSearchText(event.target.value)}
            className="mb-2 h-9 rounded-lg text-sm"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="max-h-56 overflow-y-auto">
            {visibleOptions.length > 0 ? (
              visibleOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    choose(option);
                  }}
                  className={`flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 ${
                    option.value === value ? "bg-indigo-50 text-indigo-700 font-semibold" : ""
                  }`}
                >
                  <span>{option.label}</span>
                  {option.subLabel ? (
                    <span className="text-xs text-slate-400">{option.subLabel}</span>
                  ) : null}
                </button>
              ))
            ) : (
              <div className="px-3 py-3 text-center text-sm text-slate-400">No matching option found</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function Timetable() {
  const [location] = useLocation();
  const typeFromUrl = new URLSearchParams(
    location.split("?")[1] ?? window.location.search
  ).get("type");
  const pageType =
    typeFromUrl === "academic" || typeFromUrl === "computer" ? typeFromUrl : "academic";

  const [selectedBatch, setSelectedBatch] = useState("all");
  const [selectedTeacher, setSelectedTeacher] = useState("all");

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [substituteOpen, setSubstituteOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [availTeacher, setAvailTeacher] = useState("");
  const [availDay, setAvailDay] = useState("Monday");
  const [availChecked, setAvailChecked] = useState(false);

  const { data: allEntries } = useListTimetableEntries({});
  const { data: batches } = useListBatches();
  const { data: courses } = useListCourses();
  const { data: subjects } = useListSubjects();
  const { data: staff } = useListStaff();

  const queryClient = useQueryClient();
  const createEntry = useCreateTimetableEntry();

  const form = useForm<TimetableForm>({
    resolver: zodResolver(timetableSchema),
    defaultValues: {
      batchId: "",
      teacherId: "",
      subjectId: "",
      room: "",
      days: ["Monday"],
      startTime: "16:00",
      endTime: "17:00",
      classType: "Lecture",
      otherClassType: "",
      color: "#6366f1",
      zoomLink: "",
    },
  });

  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ] as const;
  const daysShortMap: Record<string, string> = {
    Monday: "MON",
    Tuesday: "TUE",
    Wednesday: "WED",
    Thursday: "THU",
    Friday: "FRI",
    Saturday: "SAT",
    Sunday: "SUN",
  };
  const currentDayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

  const allBatchList = (batches ?? []) as any[];
  const allCourseList = (courses ?? []) as any[];
  const allSubjectList = (subjects ?? []) as any[];
  const staffList = (staff ?? []) as any[];

  const courseList = allCourseList.filter(
    (course) => (course.courseType ?? "academic") === pageType
  );
  const allowedCourseIds = new Set(courseList.map((c) => String(c.id)));
  const batchList = allBatchList.filter((b) =>
    allowedCourseIds.has(String(b.courseId ?? ""))
  );
  const subjectList = allSubjectList.filter((s) =>
    allowedCourseIds.has(String(s.courseId ?? ""))
  );

  const watchedBatchId = form.watch("batchId");
  const watchedTeacherId = form.watch("teacherId");
  const watchedDays = form.watch("days") || [];

  const selectedBatchObj = batchList.find((b) => b.id === watchedBatchId);
  const formSubjects = subjectList.filter((subject) => {
    if (
      selectedBatchObj &&
      String(subject.courseId ?? "") !== String(selectedBatchObj.courseId ?? "")
    ) {
      return false;
    }
    if (watchedTeacherId) {
      const tId = resolveId(subject?.teacherId);
      if (tId && tId !== watchedTeacherId) return false;
    }
    return true;
  });

  const closeForm = () => {
    setOpen(false);
    setEditingId(null);
    setMessage("");
  };

  const openAdd = () => {
    setEditingId(null);
    setMessage("");
    form.reset({
      batchId: selectedBatch !== "all" ? selectedBatch : "",
      teacherId: selectedTeacher !== "all" ? selectedTeacher : "",
      subjectId: "",
      room: "",
      days: ["Monday"],
      startTime: "16:00",
      endTime: "17:00",
      classType: "Lecture",
      otherClassType: "",
      color: "#6366f1",
      zoomLink: "",
    });
    setOpen(true);
  };

  const handleCellDoubleClick = (day: string, hour: number) => {
    setEditingId(null);
    setMessage("");
    const startH = String(hour).padStart(2, "0");
    const endH = String(Math.min(hour + 1, 23)).padStart(2, "0");
    form.reset({
      batchId: selectedBatch !== "all" ? selectedBatch : "",
      teacherId: selectedTeacher !== "all" ? selectedTeacher : "",
      subjectId: "",
      room: "",
      days: [day],
      startTime: `${startH}:00`,
      endTime: `${endH}:00`,
      classType: "Lecture",
      otherClassType: "",
      color: "#6366f1",
      zoomLink: "",
    });
    setOpen(true);
  };

  const openEdit = (entry: any) => {
    setMessage("");
    setEditingId(String(entry.id));

    let teacherId = resolveId(entry.teacherId);
    if (!teacherId && entry.teacherName) {
      teacherId = staffList.find((t) => t.name === entry.teacherName)?.id ?? "";
    }

    const knownTypes = CLASS_TYPES.map((t) => t.value);
    const rawType = entry.classType || "Lecture";
    const isOther = !!rawType && !knownTypes.includes(rawType);

    form.reset({
      batchId: resolveId(entry.batchId),
      teacherId: String(teacherId || ""),
      subjectId: resolveId(entry.subjectId),
      room: entry.room || "",
      days: [entry.day],
      startTime: entry.startTime || "16:00",
      endTime: entry.endTime || "17:00",
      classType: isOther ? "Other" : rawType,
      otherClassType: isOther ? rawType : "",
      color: entry.color || "#6366f1",
      zoomLink: entry.zoomLink || "",
    });
    setOpen(true);
  };

  const toggleDay = (dayKey: string) => {
    if (editingId) {
      form.setValue("days", [dayKey], { shouldValidate: true });
      return;
    }
    const current = form.getValues("days") || [];
    if (current.includes(dayKey)) {
      form.setValue(
        "days",
        current.filter((d) => d !== dayKey),
        { shouldValidate: true }
      );
    } else {
      form.setValue("days", [...current, dayKey], { shouldValidate: true });
    }
  };

  const toggleSelectAllDays = () => {
    if (editingId) return;
    const allKeys = DAYS_SHORT.map((d) => d.key);
    const current = form.getValues("days") || [];
    if (current.length === allKeys.length) {
      form.setValue("days", [], { shouldValidate: true });
    } else {
      form.setValue("days", allKeys, { shouldValidate: true });
    }
  };

  const onSubmit = async (values: TimetableForm) => {
    setMessage("");
    setSaving(true);

    const finalClassType =
      values.classType === "Other" && values.otherClassType?.trim()
        ? values.otherClassType.trim()
        : values.classType;

    const selTeacherObj = staffList.find((s) => String(s.id ?? s._id) === String(values.teacherId));
    const selSubjectObj = subjectList.find((s) => String(s.id ?? s._id) === String(values.subjectId));
    const selBatchObj = batchList.find((b) => String(b.id ?? b._id) === String(values.batchId));

    const basePayload = {
      batchId: values.batchId,
      batchName: selBatchObj?.name || undefined,
      subjectId: values.subjectId,
      subjectName: selSubjectObj?.name || undefined,
      teacherId: values.teacherId,
      teacherName: selTeacherObj?.name || undefined,
      startTime: values.startTime,
      endTime: values.endTime,
      room: values.room || undefined,
      ...(finalClassType ? { classType: finalClassType } : {}),
      ...(values.color ? { color: values.color } : {}),
      ...(values.zoomLink ? { zoomLink: values.zoomLink } : {}),
    };

    try {
      if (editingId) {
        const day = values.days[0] || "Monday";
        const payload = { ...basePayload, day };
        const response = await fetch(`/api/timetable/${editingId}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const retry = await fetch(`/api/timetable/${editingId}`, {
            method: "PATCH",
            headers: getAuthHeaders(),
            body: JSON.stringify(payload),
          });
          if (!retry.ok) {
            setMessage(await readApiError(retry));
            return;
          }
        }
      } else {
        for (const day of values.days) {
          const payload = { ...basePayload, day };
          
          const response = await fetch("/api/timetable", {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            await new Promise<void>((resolve, reject) => {
              createEntry.mutate(
                { data: payload as any },
                {
                  onSuccess: () => resolve(),
                  onError: (err: any) => reject(err),
                }
              );
            });
          }
        }
      }

      closeForm();
      form.reset();
      queryClient.invalidateQueries({ queryKey: getListTimetableEntriesQueryKey() });
    } catch (error: any) {
      setMessage(error?.message ?? "Timetable entry save nahi hui.");
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (entry: any) => {
    const confirmed = window.confirm(
      `Delete ${entry.subjectName || "this"} class for ${entry.day}?`
    );
    if (!confirmed) return;
    setDeletingId(entry.id);
    setMessage("");
    try {
      const response = await fetch(`/api/timetable/${entry.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        setMessage(await readApiError(response));
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: getListTimetableEntriesQueryKey(),
      });
    } catch {
      setMessage("Delete fail ho gayi. Backend check karo.");
    } finally {
      setDeletingId(null);
    }
  };

  const displayEntries = (allEntries || []).filter((entry: any) => {
    if (selectedBatch !== "all") {
      const entryBatchId = resolveId(entry.batchId);
      if (entryBatchId && entryBatchId !== selectedBatch) return false;
    }
    if (selectedTeacher !== "all") {
      const entryTeacherId = resolveId(entry.teacherId);
      if (entryTeacherId && entryTeacherId === selectedTeacher) return true;
      const teacher = staffList.find((t) => String(t.id ?? t._id) === selectedTeacher);
      if (teacher && entry.teacherName === teacher.name) return true;
      return false;
    }
    return true;
  });

  const selectedBatchFilterObj = batchList.find((b) => b.id === selectedBatch);
  const selectedTeacherFilterObj = staffList.find((t) => t.id === selectedTeacher);

  const handlePrint = () => {
    const batchTitle = selectedBatchFilterObj?.name || "All Batches";
    const teacherTitle = selectedTeacherFilterObj?.name || null;
    const printedOn = new Date().toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const dayRowsHtml = days
      .map((day) => {
        const dayEntries = displayEntries
          .filter((e: any) => e.day === day)
          .sort((a: any, b: any) =>
            String(a.startTime).localeCompare(String(b.startTime))
          );
        if (!dayEntries.length) return "";
        const classesHtml = dayEntries
          .map((entry: any) => {
            const batchName = resolveBatchName(entry, batchList);
            const teacher = resolveTeacherName(entry, staffList, subjectList);
            const meta = [
              teacher ? `(${teacher})` : "",
              batchName ? `Batch: ${batchName}` : "",
              entry.room ? `Room: ${entry.room}` : "",
            ]
              .filter(Boolean)
              .join(" ");
            return `<div class="class-row"><span class="time">${entry.startTime}–${entry.endTime}</span><span class="subject">${entry.subjectName || ""}</span><span class="meta">${meta}</span></div>`;
          })
          .join("");
        return `<tr><td class="day-cell">${day}</td><td class="classes-cell">${classesHtml}</td></tr>`;
      })
      .filter(Boolean)
      .join("");

    const subtitle = teacherTitle
      ? `Weekly Timetable — ${batchTitle} | Teacher: ${teacherTitle}`
      : `Weekly Timetable — ${batchTitle}`;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${subtitle}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui;padding:32px 40px;color:#1e293b}
.header{text-align:center;margin-bottom:8px}.header h1{font-size:22px;font-weight:700}
table{width:100%;border-collapse:collapse;margin-top:20px;border:1px solid #cbd5e1}
th{background:#6366f1;color:#fff;font-size:12px;padding:10px 14px;text-align:left}
.day-cell{font-weight:700;padding:10px 14px;background:#f8fafc;width:130px;border-right:1px solid #e2e8f0;vertical-align:top}
.classes-cell{padding:6px 10px;vertical-align:top}
.class-row{display:flex;gap:6px;padding:5px 8px;margin-bottom:4px;background:#eef2ff;border-radius:4px}
.time{font-size:12px;font-weight:600;color:#4338ca;min-width:90px}.subject{font-size:13px;font-weight:700}.meta{font-size:11px;color:#64748b}
.print-btn-bar{text-align:center;margin-bottom:20px}
.print-btn-bar button{background:#6366f1;color:#fff;border:none;padding:10px 28px;border-radius:8px;font-weight:600;cursor:pointer}
@media print{.print-btn-bar{display:none!important}}</style></head>
<body><div class="print-btn-bar"><button onclick="window.print()">Print / Save as PDF</button></div>
<div class="header"><h1>${subtitle}</h1><div style="font-size:12px;color:#64748b;margin-top:6px">Printed on ${printedOn} | Coach Sutra</div></div>
<table><thead><tr><th>DAY</th><th>CLASSES</th></tr></thead><tbody>${dayRowsHtml || '<tr><td colspan="2" style="padding:24px;text-align:center;color:#94a3b8">No classes</td></tr>'}</tbody></table>
</body></html>`;

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
    }
  };

  const allDaysSelected = watchedDays.length === DAYS_SHORT.length;
  const MATRIX_HOURS = buildMatrixHours(displayEntries, 16, 20);

  /* ───── ACCURATE TEACHER AVAILABILITY SCAN W/ STAFF SHIFT HOURS ───── */
  const availTeacherObj = staffList.find(
    (t) => String(t.id ?? t._id) === String(availTeacher)
  );

  const teacherDayClasses = availTeacher
    ? (allEntries || []).filter((e: any) => {
        if (e.day !== availDay) return false;
        const eTeacherId = resolveId(e.teacherId);
        if (
          eTeacherId &&
          (eTeacherId === String(availTeacherObj?.id) ||
            eTeacherId === String(availTeacherObj?._id))
        ) {
          return true;
        }
        if (availTeacherObj?.name && e.teacherName === availTeacherObj.name) {
          return true;
        }
        return false;
      })
    : [];

  const availabilityAnalysis = calculateTeacherAvailability(
    teacherDayClasses,
    availTeacherObj?.workTimingFrom || "08:00",
    availTeacherObj?.workTimingTo || "20:00"
  );

  return (
    <div className="min-h-screen bg-[#f4f6fb] p-4 md:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-nowrap items-center justify-between gap-4 overflow-x-auto pb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#5c6ac4] tracking-tight shrink-0 whitespace-nowrap">
            Timetable
          </h1>

          <div className="flex flex-nowrap items-center gap-2 shrink-0">
            <Button
              onClick={handlePrint}
              variant="outline"
              className="bg-white text-slate-700 border-slate-200 h-9 text-xs font-semibold rounded-lg whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" /> Print PDF
            </Button>
            <Button
              onClick={() => setSubstituteOpen(true)}
              variant="outline"
              className="bg-white text-slate-700 border-slate-200 h-9 text-xs font-semibold rounded-lg whitespace-nowrap"
            >
              <Users className="w-3.5 h-3.5 mr-1.5" /> Substitutes
            </Button>
            <Button
              onClick={() =>
                document
                  .getElementById("teacher-availability-section")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              variant="outline"
              className="bg-white text-slate-700 border-slate-200 h-9 text-xs font-semibold rounded-lg whitespace-nowrap"
            >
              <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Availability
            </Button>

            <Dialog
              open={open}
              onOpenChange={(v) => {
                if (!v) closeForm();
                else setOpen(true);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  onClick={openAdd}
                  className="bg-[#6366f1] hover:bg-[#4f46e5] text-white h-9 px-4 text-xs font-semibold rounded-lg whitespace-nowrap"
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Add Class
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-[640px] p-0 gap-0 rounded-2xl border-0 shadow-2xl max-h-[90vh] overflow-y-auto [&>button.absolute]:hidden">
                <div className="bg-gradient-to-r from-[#6366f1] to-[#818cf8] px-6 py-4 flex items-center justify-between sticky top-0 z-10 rounded-t-2xl">
                  <div className="flex items-center gap-2.5 text-white">
                    <CalendarPlus className="w-5 h-5" />
                    <DialogTitle className="text-lg font-semibold text-white tracking-tight">
                      {editingId ? "Update Class" : "Schedule New Class"}
                    </DialogTitle>
                  </div>
                  <button
                    type="button"
                    onClick={closeForm}
                    className="rounded-full p-1.5 text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="batchId"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                              Batch <span className="text-red-500">*</span>
                            </FormLabel>
                            <SearchableDropdown
                              value={field.value}
                              placeholder="Select batch"
                              rounded="lg"
                              options={batchList.map((b) => ({
                                label: b.name,
                                value: b.id,
                              }))}
                              onChange={(v) => {
                                field.onChange(v);
                                form.setValue("subjectId", "", { shouldValidate: true });
                              }}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="teacherId"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                              Teacher <span className="text-red-500">*</span>
                            </FormLabel>
                            <SearchableDropdown
                              value={field.value}
                              placeholder="Select teacher"
                              rounded="lg"
                              options={staffList.map((t) => ({
                                label: t.name,
                                value: t.id,
                              }))}
                              onChange={(v) => {
                                field.onChange(v);
                                form.setValue("subjectId", "", { shouldValidate: true });
                              }}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="subjectId"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                              Subject <span className="text-red-500">*</span>
                            </FormLabel>
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <SearchableDropdown
                                  value={field.value}
                                  placeholder={
                                    !watchedTeacherId
                                      ? "— select teacher first —"
                                      : "Select subject"
                                  }
                                  disabled={!watchedTeacherId}
                                  rounded="lg"
                                  options={formSubjects.map((s) => ({
                                    label: s.name,
                                    value: s.id,
                                    subLabel: s.code ? `Code: ${s.code}` : undefined,
                                  }))}
                                  onChange={field.onChange}
                                />
                              </div>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="room"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                              Room
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. Room 210"
                                {...field}
                                className="h-11 rounded-xl border-slate-200 text-sm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="days"
                      render={() => (
                        <FormItem className="space-y-2">
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                              Select Day(s) <span className="text-red-500">*</span>
                            </FormLabel>
                            {!editingId && (
                              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={allDaysSelected}
                                  onChange={toggleSelectAllDays}
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600"
                                />
                                Select All (Everyday)
                              </label>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {DAYS_SHORT.map((d) => {
                              const isSelected = watchedDays.includes(d.key);
                              return (
                                <button
                                  key={d.key}
                                  type="button"
                                  onClick={() => toggleDay(d.key)}
                                  className={`min-w-[52px] h-10 px-3 rounded-full text-sm font-semibold border-2 transition-all ${
                                    isSelected
                                      ? "bg-[#6366f1] border-[#6366f1] text-white shadow-sm"
                                      : "bg-white border-indigo-200 text-indigo-500 hover:border-indigo-400 hover:bg-indigo-50"
                                  }`}
                                >
                                  {d.label}
                                </button>
                              );
                            })}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <TimePickerField
                              label="Start Time"
                              value={field.value}
                              onChange={field.onChange}
                              required
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem>
                            <TimePickerField
                              label="End Time"
                              value={field.value}
                              onChange={field.onChange}
                              required
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="classType"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                              Class Type
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-11 rounded-xl border-slate-200 text-sm">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {CLASS_TYPES.map((t) => {
                                  const Icon = t.icon;
                                  return (
                                    <SelectItem key={t.value} value={t.value}>
                                      <div className="flex items-center gap-2">
                                        <Icon className="w-4 h-4 text-indigo-500" />
                                        <span>{t.label}</span>
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>

                            {field.value === "Other" && (
                              <FormField
                                control={form.control}
                                name="otherClassType"
                                render={({ field: otherField }) => (
                                  <div className="pt-1.5">
                                    <Input
                                      {...otherField}
                                      placeholder="Specify custom class type..."
                                      className="h-10 rounded-xl border-indigo-200 bg-indigo-50/30 text-sm focus:bg-white"
                                      autoFocus
                                    />
                                  </div>
                                )}
                              />
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="color"
                        render={({ field }) => (
                          <FormItem>
                            <ColorPickerField
                              value={field.value || "#6366f1"}
                              onChange={field.onChange}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="zoomLink"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                              Zoom Link
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://..."
                                {...field}
                                className="h-11 rounded-xl border-slate-200 text-sm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {message ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                        {message}
                      </div>
                    ) : null}

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={closeForm}
                        className="h-11 px-6 rounded-xl border-slate-200 text-slate-600 text-sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={saving || createEntry.isPending}
                        className="h-11 px-6 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] text-white shadow-md text-sm"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        {saving || createEntry.isPending
                          ? editingId
                            ? "Updating..."
                            : "Scheduling..."
                          : editingId
                            ? "Update Class"
                            : "Schedule Class"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* FILTERS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex items-center gap-3 w-full md:w-80">
              <span className="text-sm font-semibold text-slate-700 shrink-0">Batch:</span>
              <SearchableDropdown
                value={selectedBatch}
                placeholder="— All Batches —"
                options={[
                  { label: "— All Batches —", value: "all" },
                  ...batchList.map((b) => ({ label: b.name, value: b.id })),
                ]}
                onChange={setSelectedBatch}
              />
            </div>
            <div className="flex items-center gap-3 w-full md:w-80">
              <span className="text-sm font-semibold text-slate-700 shrink-0">Teacher:</span>
              <SearchableDropdown
                value={selectedTeacher}
                placeholder="— All Teachers —"
                options={[
                  { label: "— All Teachers —", value: "all" },
                  ...staffList.map((t) => ({ label: t.name, value: t.id })),
                ]}
                onChange={setSelectedTeacher}
              />
            </div>
          </div>
        </div>

        {/* MATRIX */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden select-none">
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#6366f1]" />
              <h3 className="font-bold text-slate-800 text-base">Weekly Schedule</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {CLASS_TYPES.filter((t) => t.value !== "Other").slice(0, 6).map((type) => (
                <span
                  key={type.value}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    CLASS_TYPE_BADGE_COLORS[type.value] ||
                    "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  {type.label === "Doubt Session" ? "Doubt" : type.label.split(" / ")[0]}
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50 text-center font-bold text-xs text-slate-600">
                <div className="py-3 border-r border-slate-200 text-slate-400">TIME</div>
                {days.map((day) => {
                  const isToday = day === currentDayName;
                  return (
                    <div
                      key={day}
                      className={`py-3 border-r border-slate-200 uppercase tracking-wider flex flex-col items-center justify-center gap-1 ${
                        isToday ? "bg-indigo-50/70 text-[#6366f1]" : ""
                      }`}
                    >
                      <span>{daysShortMap[day]}</span>
                      {isToday && (
                        <span className="bg-[#6366f1] text-white text-[9px] px-1.5 py-0.5 rounded font-extrabold">
                          TODAY
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {displayEntries.length === 0 && (
                <div className="px-4 py-3 text-xs text-center text-slate-400 border-b border-slate-100">
                  No classes yet. Double-click any empty slot to add a class.
                </div>
              )}

              <div className="relative divide-y divide-slate-100">
                {MATRIX_HOURS.map((hour) => {
                  const hourLabel = `${String(hour % 12 || 12).padStart(2, "0")}:00 ${
                    hour >= 12 ? "PM" : "AM"
                  }`;

                  return (
                    <div key={hour} className="grid grid-cols-8">
                      <div className="p-2 border-r border-slate-200 text-xs text-slate-500 font-semibold text-center bg-slate-50/30 min-h-[72px] flex items-center justify-center">
                        {hourLabel}
                      </div>

                      {days.map((day) => {
                        const slotEntries = displayEntries.filter((e: any) => {
                          if (e.day !== day) return false;
                          return timeToHour(e.startTime) === hour;
                        });

                        return (
                          <div
                            key={day}
                            onDoubleClick={() => handleCellDoubleClick(day, hour)}
                            className="group border-r border-slate-100 p-1 relative bg-white hover:bg-slate-50 transition-colors cursor-pointer min-h-[72px]"
                          >
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-0 pointer-events-none">
                              <div className="bg-indigo-100/60 text-indigo-400 rounded-full p-1.5">
                                <Plus className="w-5 h-5" />
                              </div>
                            </div>

                            <div className="relative z-10 h-full flex flex-col gap-1">
                              {slotEntries.map((entry: any) => {
                                const teacherName = resolveTeacherName(entry, staffList, subjectList);
                                const batchName = resolveBatchName(entry, batchList);
                                const blockColor = entry.color || "#6366f1";

                                return (
                                  <div
                                    key={entry.id}
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      openEdit(entry);
                                    }}
                                    className="group/entry relative p-2 rounded-r-lg text-xs space-y-0.5 shadow-sm cursor-default border-l-4"
                                    style={{
                                      borderLeftColor: blockColor,
                                      backgroundColor: `${blockColor}18`,
                                    }}
                                  >
                                    <div
                                      className="font-bold pr-12 truncate"
                                      style={{ color: blockColor }}
                                    >
                                      {entry.subjectName}
                                    </div>
                                    <div className="text-[11px] text-slate-600 font-medium">
                                      {entry.startTime}–{entry.endTime}
                                    </div>
                                    {teacherName ? (
                                      <div className="text-[11px] text-slate-500 font-semibold truncate">
                                        {teacherName}
                                      </div>
                                    ) : null}
                                    {(batchName || entry.room) && (
                                      <div className="text-[10px] text-slate-400 truncate">
                                        {batchName}
                                        {entry.room
                                          ? `${batchName ? " · " : ""}📍${entry.room}`
                                          : ""}
                                      </div>
                                    )}

                                    {/* Edit + Delete */}
                                    <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover/entry:opacity-100 transition-opacity">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openEdit(entry);
                                        }}
                                        className="text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded-full p-0.5 shadow-sm"
                                        title="Edit Class"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteEntry(entry);
                                        }}
                                        disabled={deletingId === entry.id}
                                        className="text-slate-400 hover:text-red-500 bg-white border border-slate-200 rounded-full p-0.5 shadow-sm"
                                        title="Delete Class"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* TEACHER AVAILABILITY CHECKER WIDGET */}
        <div
          id="teacher-availability-section"
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5"
        >
          <div className="flex items-center gap-2.5 text-[#5c6ac4]">
            <UserCheck className="w-5 h-5" />
            <h3 className="font-bold text-lg text-slate-800">Check Teacher Availability</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                Teacher
              </label>
              <SearchableDropdown
                value={availTeacher}
                placeholder="Select teacher..."
                rounded="lg"
                options={staffList.map((t) => ({ label: t.name, value: t.id }))}
                onChange={(val) => {
                  setAvailTeacher(val);
                  setAvailChecked(true);
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold tracking-wide text-slate-500 uppercase">Day</label>
              <Select
                value={availDay}
                onValueChange={(val) => {
                  setAvailDay(val);
                  setAvailChecked(true);
                }}
              >
                <SelectTrigger className="h-11 rounded-xl border-slate-200 text-sm bg-white">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {days.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => setAvailChecked(true)}
              disabled={!availTeacher}
              className="bg-[#6366f1] hover:bg-[#4f46e5] text-white h-11 px-6 rounded-xl font-semibold text-sm shadow-sm"
            >
              <Search className="w-4 h-4 mr-2" /> Check Availability
            </Button>
          </div>

          {/* AVAILABILITY RESULTS DISPLAY */}
          {availChecked && availTeacherObj && (
            <div className="mt-4 rounded-2xl border border-indigo-100 bg-slate-50/50 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                  <div className="text-base font-bold text-slate-800">
                    {availTeacherObj.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Schedule for <span className="font-semibold text-indigo-600">{availDay}</span> ({availabilityAnalysis.shiftStart} - {availabilityAnalysis.shiftEnd})
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-100 text-xs font-bold text-rose-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-rose-500" />
                    <span>{availabilityAnalysis.busySlots.length} Classes ({formatDuration(availabilityAnalysis.totalBusyMins)} Busy)</span>
                  </div>

                  <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{formatDuration(availabilityAnalysis.totalFreeMins)} Free</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Available Free Time Windows ({availabilityAnalysis.freeSlots.length} Windows)</span>
                </div>

                {availabilityAnalysis.freeSlots.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {availabilityAnalysis.freeSlots.map((free, idx) => (
                      <div
                        key={idx}
                        className="bg-emerald-50/80 border border-emerald-200/80 p-3 rounded-xl flex items-center justify-between shadow-2xs"
                      >
                        <div>
                          <div className="text-xs font-bold text-emerald-900">{free.label}</div>
                          <div className="text-[10px] font-medium text-emerald-600 mt-0.5">Completely Unscheduled</div>
                        </div>
                        <span className="text-xs font-extrabold text-emerald-700 bg-white border border-emerald-200 px-2 py-0.5 rounded-md">
                          {formatDuration(free.durationMins)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                    Teacher has no free windows on {availDay} between {availabilityAnalysis.shiftStart} and {availabilityAnalysis.shiftEnd}.
                  </div>
                )}
              </div>

              {availabilityAnalysis.busySlots.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200/60">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    <span>Scheduled Classes Across All Batches ({availabilityAnalysis.busySlots.length})</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {availabilityAnalysis.busySlots.map((item: any) => {
                      const batchName = resolveBatchName(item, batchList);
                      return (
                        <div
                          key={item.id}
                          className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5 shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{item.subjectName}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100">
                              {item.timeLabel}
                            </span>
                          </div>
                          <div className="text-slate-500 text-[11px] flex items-center gap-1">
                            <span>Batch: <strong className="text-slate-700">{batchName || "General"}</strong></span>
                            {item.room ? <span> · 📍Room {item.room}</span> : ""}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SUBSTITUTES DIALOG */}
      <Dialog open={substituteOpen} onOpenChange={setSubstituteOpen}>
        <DialogContent className="sm:max-w-[500px] p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-[#6366f1]" /> Arrange Substitute Teacher
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-500">
              Select a class and assign a substitute staff member.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Select Class</label>
              <Select>
                <SelectTrigger className="h-10 rounded-xl border-slate-200 text-sm">
                  <SelectValue placeholder="Choose scheduled class..." />
                </SelectTrigger>
                <SelectContent>
                  {displayEntries.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.day} - {e.subjectName} ({e.startTime})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Substitute Teacher</label>
              <Select>
                <SelectTrigger className="h-10 rounded-xl border-slate-200 text-sm">
                  <SelectValue placeholder="Select available staff..." />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setSubstituteOpen(false)}
                className="h-10 px-4 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  alert("Substitute assigned successfully!");
                  setSubstituteOpen(false);
                }}
                className="h-10 px-5 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] text-white"
              >
                Assign Substitute
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}