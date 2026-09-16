import {
  useListStudentAttendance,
  useListBatches,
  useListCourses,
  useListStudents,
} from "@workspace/api-client-react";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Download,
  Search,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Trophy,
  Percent,
} from "lucide-react";
import { format, getDaysInMonth } from "date-fns";

type AttendanceStatus = "present" | "late" | "half_day" | "holiday" | "excused" | "absent" | "not_marked";

type DropdownOption = {
  label: string;
  value: string;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Exact colors matching screenshot
const STATUS_COLORS: Record<string, string> = {
  present: "#10b981",    // Green
  late: "#f59e0b",       // Yellow
  half_day: "#f97316",   // Orange
  holiday: "#0ea5e9",    // Blue
  excused: "#6366f1",    // Purple
  absent: "#ef4444",     // Red
  not_marked: "#e2e8f0", // Light Gray/No Data
  no_data: "#e2e8f0",
};

// Searchable Dropdown for Batches
function SearchableDropdown({
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
}: {
  value: string;
  options: DropdownOption[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const selected = options.find((item) => String(item.value) === String(value));

  const filteredOptions = options.filter((item) =>
    item.label.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="relative w-full sm:w-[260px]">
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setSearchText(""); setOpen((o) => !o); }}
        className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-semibold text-slate-700 hover:border-[#5b6cf9]/50 focus:ring-2 focus:ring-[#5b6cf9]/30 outline-none transition-all shadow-sm"
      >
        <span className={selected ? "truncate text-slate-800" : "text-slate-500 truncate"}>
          {selected?.label ?? placeholder}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          <Input 
            autoFocus 
            value={searchText} 
            placeholder="Search batch..." 
            onChange={(e) => setSearchText(e.target.value)} 
            className="mb-2 h-9 text-sm rounded-lg" 
          />
          <div className="max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {filteredOptions.length > 0 ? filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => { onChange(option.value); setOpen(false); }}
                className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${String(option.value) === String(value) ? "bg-[#5b6cf9]/10 text-[#5b6cf9] font-bold" : "text-slate-700 hover:bg-slate-100"}`}
              >
                {option.label}
              </button>
            )) : (
              <div className="px-2 py-3 text-center text-sm text-slate-400 font-medium">No batches found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({
  icon,
  label,
  value,
  valueColor,
  iconBg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  valueColor: string;
  iconBg: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col gap-3 min-w-[140px]">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconBg}`}>{icon}</div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-3xl font-bold tracking-tight ${valueColor}`}>{value}</div>
    </div>
  );
}

// Mini Batch Loader
function BatchLoader({
  batchId,
  date,
  onLoaded,
}: {
  batchId: string;
  date: string;
  onLoaded: (batchId: string, date: string, records: any[]) => void;
}) {
  const { data } = useListStudentAttendance(
    { batchId, date },
    { query: { enabled: !!batchId && !!date } as any }
  );
  useEffect(() => {
    if (data && Array.isArray(data)) onLoaded(batchId, date, data as any[]);
  }, [batchId, date, data, onLoaded]);
  return null;
}

// Flexible Batch Matcher Helper
const matchesBatch = (student: any, targetBatchId: string) => {
  if (targetBatchId === "all") return true;
  const target = String(targetBatchId);

  const possibleIds = [
    student?.batchId,
    student?.batch_id,
    student?.currentBatchId,
    student?.batch?.id,
    student?.batch?.batchId,
  ];

  if (possibleIds.some((id) => id !== undefined && id !== null && String(id) === target)) {
    return true;
  }

  if (Array.isArray(student?.batches)) {
    return student.batches.some((b: any) => String(b?.id ?? b) === target);
  }

  if (Array.isArray(student?.batchIds)) {
    return student.batchIds.some((id: any) => String(id) === target);
  }

  return false;
};

export default function AttendanceReport() {
  const [, setLocation] = useLocation();
  const now = new Date();

  // State for Month-Year Picker
  const [monthStr, setMonthStr] = useState(format(now, "yyyy-MM"));
  
  const selectedYear = parseInt(monthStr.split("-")[0], 10);
  const selectedMonth = parseInt(monthStr.split("-")[1], 10) - 1; // 0-indexed

  const [batchId, setBatchId] = useState("all");
  const [studentSearch, setStudentSearch] = useState("");
  const [recordsMap, setRecordsMap] = useState<Record<string, { bId: string; records: any[] }>>({});

  const { data: batches } = useListBatches();
  const { data: students } = useListStudents();

  const batchList = useMemo(() => (batches ?? []) as any[], [batches]);
  const studentList = useMemo(() => (students ?? []) as any[], [students]);

  const daysInMonth = getDaysInMonth(new Date(selectedYear, selectedMonth));

  const days = useMemo<Date[]>(() => {
    return Array.from({ length: daysInMonth }, (_, i) => new Date(selectedYear, selectedMonth, i + 1));
  }, [selectedYear, selectedMonth, daysInMonth]);

  const dateStrings = useMemo<string[]>(
    () => days.map((d: Date) => format(d, "yyyy-MM-dd")),
    [days]
  );

  const activeBatchIds = useMemo(() => {
    if (batchId !== "all") return [batchId];
    return batchList.map((b: any) => String(b.id));
  }, [batchId, batchList]);

  const fetchKeys = useMemo(() => {
    const keys: { batchId: string; date: string }[] = [];
    activeBatchIds.forEach((bId: string) => {
      dateStrings.forEach((d: string) => keys.push({ batchId: bId, date: d }));
    });
    return keys;
  }, [activeBatchIds, dateStrings]);

  const handleLoaded = useCallback((bId: string, date: string, records: any[]) => {
    const key = `${bId}__${date}`;
    setRecordsMap((prev) => {
      if (prev[key]?.records === records) return prev;
      return { ...prev, [key]: { bId, records } };
    });
  }, []);

  useEffect(() => {
    setRecordsMap({});
  }, [monthStr]);

  // Build student attendance map attached to real data
  const studentStats = useMemo(() => {
    const map: Record<string, any> = {};

    // 1. Filter students belonging to selected batch
    const relevantStudents = studentList.filter((s: any) => matchesBatch(s, batchId));

    relevantStudents.forEach((s: any) => {
      const sid = String(s.id || s.studentId);
      if (!sid) return;
      
      const sBatchId = String(s.batchId || s.batch_id || s.currentBatchId || s.batch?.id || "");
      const batch = batchList.find((b: any) => String(b.id) === sBatchId) 
                 || batchList.find((b: any) => String(b.id) === String(batchId));

      map[sid] = {
        studentId: sid,
        studentName: s.name || s.studentName || `${s.firstName || ""} ${s.lastName || ""}`.trim() || "Unknown",
        batchId: sBatchId || String(batchId),
        batchName: batch?.name || "N/A",
        admissionNo: s.admissionNo || s.rollNo || sid.substring(0, 10),
        dayStatus: {},
        present: 0, absent: 0, late: 0, half_day: 0, holiday: 0, excused: 0, totalMarked: 0,
      };
    });

    // 2. Merge API attendance records cleanly
    Object.entries(recordsMap).forEach(([key, item]) => {
      const fetchedBatchId = item.bId;
      
      // Skip records if a specific batch is selected and doesn't match
      if (batchId !== "all" && String(fetchedBatchId) !== String(batchId)) {
        return;
      }

      const recs = item.records;
      if (!Array.isArray(recs)) return;

      recs.forEach((rec: any) => {
        const sid = String(rec.studentId);
        if (!sid) return;

        if (!map[sid]) {
          const recBatchId = String(rec.batchId || fetchedBatchId);
          const batch = batchList.find((b: any) => String(b.id) === recBatchId);
          map[sid] = {
            studentId: sid,
            studentName: rec.studentName || "Unknown",
            batchId: recBatchId,
            batchName: batch?.name || "N/A",
            admissionNo: rec.admissionNo || sid.substring(0, 10),
            dayStatus: {},
            present: 0, absent: 0, late: 0, half_day: 0, holiday: 0, excused: 0, totalMarked: 0,
          };
        }

        // Parse Date safely
        const rawDate = rec.date || rec.attendanceDate || key.split("__")[1] || "";
        let dayNum = 0;
        if (rawDate) {
          const datePart = rawDate.split("T")[0];
          const parts = datePart.split("-");
          if (parts.length >= 3) {
            dayNum = parseInt(parts[2], 10);
          }
        }

        if (dayNum >= 1 && dayNum <= 31) {
          const st = (rec.status || "not_marked") as AttendanceStatus;
          map[sid].dayStatus[dayNum] = st;
        }
      });
    });

    // 3. Compute Totals
    Object.values(map).forEach((s: any) => {
      Object.values(s.dayStatus).forEach((st: any) => {
        if (st === "present") s.present++;
        else if (st === "absent") s.absent++;
        else if (st === "late") s.late++;
        else if (st === "half_day") s.half_day++;
        else if (st === "holiday") s.holiday++;
        else if (st === "excused") s.excused++;
        if (st && st !== "not_marked") s.totalMarked++;
      });
    });

    return Object.values(map);
  }, [recordsMap, batchList, studentList, batchId]);

  const filteredStudents = useMemo(() => {
    const term = studentSearch.trim().toLowerCase();
    let list = studentStats;
    if (term) {
      list = list.filter(
        (s) =>
          s.studentName.toLowerCase().includes(term) ||
          String(s.admissionNo || "").toLowerCase().includes(term)
      );
    }
    return [...list].sort((a, b) => {
      const pa = a.totalMarked ? (a.present + a.late + a.half_day) / a.totalMarked : 0;
      const pb = b.totalMarked ? (b.present + b.late + b.half_day) / b.totalMarked : 0;
      if (pb === pa) return b.totalMarked - a.totalMarked; 
      return pb - pa;
    });
  }, [studentStats, studentSearch]);

  const overall = useMemo(() => {
    let present = 0, absent = 0, late = 0, half_day = 0, holiday = 0, excused = 0, total = 0;
    studentStats.forEach((s) => {
      present += s.present; absent += s.absent; late += s.late;
      half_day += s.half_day; holiday += s.holiday; excused += s.excused;
      total += s.totalMarked;
    });
    const attended = present + late + half_day;
    const avg = total > 0 ? Math.round((attended / total) * 1000) / 10 : 0;

    const daily: { day: number; present: number; absent: number }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      let p = 0, a = 0;
      studentStats.forEach((s) => {
        const st = s.dayStatus[d];
        if (st === "present" || st === "late" || st === "half_day") p++;
        else if (st === "absent") a++;
      });
      daily.push({ day: d, present: p, absent: a });
    }

    const buckets = [
      { label: "0–25%", min: 0, max: 25, count: 0 },
      { label: "26–50%", min: 26, max: 50, count: 0 },
      { label: "51–74%", min: 51, max: 74, count: 0 },
      { label: "75–89%", min: 75, max: 89, count: 0 },
      { label: "90–100%", min: 90, max: 100, count: 0 },
    ];
    let atRisk = 0, perfect = 0;
    studentStats.forEach((s) => {
      if (s.totalMarked > 0) {
        const pct = Math.round(((s.present + s.late + s.half_day) / s.totalMarked) * 100);
        if (pct < 75) atRisk++;
        if (pct === 100) perfect++;
        buckets.forEach((b) => { if (pct >= b.min && pct <= b.max) b.count++; });
      }
    });

    const batchMap: Record<string, { name: string; present: number; total: number }> = {};
    studentStats.forEach((s) => {
      if (!batchMap[s.batchId]) batchMap[s.batchId] = { name: s.batchName, present: 0, total: 0 };
      batchMap[s.batchId].present += s.present + s.late + s.half_day;
      batchMap[s.batchId].total += s.totalMarked;
    });
    const batchWise = Object.values(batchMap)
      .map((b) => ({ name: b.name, pct: b.total > 0 ? Math.round((b.present / b.total) * 100) : 0 }))
      .sort((a, b) => b.pct - a.pct);

    return {
      avg, presentDays: present, absentDays: absent, lateMarks: late + half_day,
      atRisk, perfect, daily, buckets, batchWise,
      breakdown: { present, late: late + half_day, absent },
    };
  }, [studentStats, daysInMonth]);

  const maxDaily = Math.max(1, ...overall.daily.map((d) => Math.max(d.present, d.absent)));
  const maxBucket = Math.max(1, ...overall.buckets.map((b) => b.count));

  const getStatusLabel = (pct: number, marked: number) => {
    if (marked === 0) return { text: "No Data", cls: "bg-slate-100 text-slate-500" };
    if (pct >= 95) return { text: "Excellent", cls: "bg-emerald-50 text-emerald-700" };
    if (pct >= 75) return { text: "Good", cls: "bg-blue-50 text-blue-700" };
    if (pct >= 50) return { text: "Average", cls: "bg-amber-50 text-amber-700" };
    return { text: "At Risk", cls: "bg-red-50 text-red-700" };
  };

  const exportCSV = () => {
    const headers = ["Student", "Admission No", "Batch", "Present", "Absent", "Late", "Half Day", "Holiday", "Excused", "Total", "Attendance %"];
    const rows = filteredStudents.map((s) => {
      const pct = s.totalMarked > 0 ? Math.round(((s.present + s.late + s.half_day) / s.totalMarked) * 100) : 0;
      return [
        `"${s.studentName}"`, `"${s.admissionNo || ""}"`, `"${s.batchName}"`,
        s.present, s.absent, s.late, s.half_day, s.holiday, s.excused, s.totalMarked, `${pct}%`,
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Attendance_Report_${MONTHS[selectedMonth]}_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full bg-[#e8ebf3] p-4 sm:p-6 font-sans">
      {fetchKeys.map(({ batchId: bId, date }) => (
        <BatchLoader key={`${bId}-${date}`} batchId={bId} date={date} onLoaded={handleLoaded} />
      ))}

      <div className="max-w-[1400px] mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/attendance")} className="mt-1 text-slate-500 hover:text-slate-800 bg-white shadow-sm border border-slate-200">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#5b6cf9]">Attendance Report</h1>
              <p className="mt-0.5 text-sm text-slate-500 font-medium">
                {MONTHS[selectedMonth]} {selectedYear} — Visual analytics & student-wise breakdown
              </p>
            </div>
          </div>
          <Button onClick={exportCSV} variant="outline" className="bg-white border-slate-200 text-slate-700 font-semibold h-9 px-4 rounded-xl shadow-sm gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Select Batch</label>
            <SearchableDropdown
              value={batchId}
              placeholder="All Batches"
              options={[
                { label: "All Batches", value: "all" },
                ...batchList.map((b) => ({ label: b.name, value: String(b.id) })),
              ]}
              onChange={setBatchId}
            />
          </div>
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Month & Year</label>
            <Input 
              type="month" 
              value={monthStr} 
              onChange={(e) => setMonthStr(e.target.value)} 
              className="h-10 w-full sm:w-[200px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm focus:ring-2 focus:ring-[#5b6cf9]/30 outline-none transition-all" 
            />
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatBox icon={<Percent className="w-4 h-4 text-rose-500" />} iconBg="bg-rose-50" label="Avg Attendance" value={`${overall.avg}%`} valueColor={overall.avg >= 75 ? "text-emerald-500" : "text-rose-500"} />
          <StatBox icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} iconBg="bg-emerald-50" label="Present Days" value={overall.presentDays} valueColor="text-emerald-500" />
          <StatBox icon={<XCircle className="w-4 h-4 text-rose-500" />} iconBg="bg-rose-50" label="Absent Days" value={overall.absentDays} valueColor="text-rose-500" />
          <StatBox icon={<Clock className="w-4 h-4 text-amber-500" />} iconBg="bg-amber-50" label="Late Marks" value={overall.lateMarks} valueColor="text-amber-500" />
          <StatBox icon={<AlertTriangle className="w-4 h-4 text-orange-500" />} iconBg="bg-orange-50" label="At-Risk (<75%)" value={overall.atRisk} valueColor="text-orange-500" />
          <StatBox icon={<Trophy className="w-4 h-4 text-violet-500" />} iconBg="bg-violet-50" label="Perfect (100%)" value={overall.perfect} valueColor="text-violet-500" />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800">Daily Attendance Trend</h3>
                <p className="text-xs text-slate-400">Present vs Absent per day</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> Present</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" /> Absent</span>
              </div>
            </div>
            <div className="h-48 flex items-end gap-[3px] px-1">
              {overall.daily.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                  <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: "160px" }}>
                    <div className="w-full rounded-t bg-[#34d399] hover:bg-[#10b981] transition-all min-h-[2px]" style={{ height: `${(d.present / maxDaily) * 100}%` }} />
                    <div className="w-full rounded-t bg-[#fb7185] hover:bg-[#ef4444] transition-all min-h-[2px]" style={{ height: `${(d.absent / maxDaily) * 100}%` }} />
                  </div>
                  <span className="text-[9px] text-slate-400 font-medium">{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-1">Overall Breakdown</h3>
            <p className="text-xs text-slate-400 mb-4">Present · Late · Absent</p>
            {(() => {
              const { present, late, absent } = overall.breakdown;
              const sum = present + late + absent || 1;
              const pPct = (present / sum) * 100;
              const lPct = (late / sum) * 100;
              return (
                <div className="flex flex-col items-center">
                  <div className="w-40 h-40 rounded-full relative" style={{ background: `conic-gradient(#10b981 0% ${pPct}%, #f59e0b ${pPct}% ${pPct + lPct}%, #ef4444 ${pPct + lPct}% 100%)` }}>
                    <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center shadow-inner">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-slate-800">{overall.avg}%</div>
                        <div className="text-[10px] text-slate-400 font-semibold">AVG</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 mt-5 text-xs font-semibold">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> Present</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /> Late</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" /> Absent</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-1">Attendance Distribution</h3>
            <p className="text-xs text-slate-400 mb-5">Students grouped by attendance %</p>
            <div className="h-48 flex items-end gap-3 px-2">
              {overall.buckets.map((b, i) => {
                const colors = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#10b981"];
                return (
                  <div key={b.label} className="flex-1 flex flex-col items-center gap-2 group">
                    <span className="text-xs font-bold text-slate-600">{b.count}</span>
                    <div className="w-full rounded-t-lg transition-all min-h-[4px] hover:opacity-80" style={{ height: `${(b.count / maxBucket) * 140}px`, backgroundColor: colors[i] }} />
                    <span className="text-[10px] text-slate-400 font-semibold text-center leading-tight whitespace-nowrap">{b.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-1">Batch-wise Comparison</h3>
            <p className="text-xs text-slate-400 mb-5">Average attendance % per batch</p>
            <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
              {overall.batchWise.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No batch data yet</p>
              ) : (
                overall.batchWise.map((b, i) => {
                  const colors = ["from-emerald-400 to-[#10b981]", "from-orange-400 to-[#f97316]", "from-blue-400 to-[#3b82f6]", "from-violet-400 to-[#8b5cf6]", "from-pink-400 to-[#f43f5e]"];
                  return (
                    <div key={b.name + i} className="flex items-center gap-3">
                      <span className="text-[11px] font-bold text-slate-600 w-[100px] truncate text-right shrink-0">{b.name}</span>
                      <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div className={`h-full rounded-full bg-gradient-to-r ${colors[i % colors.length]} transition-all`} style={{ width: `${b.pct}%` }} />
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 w-9">{b.pct}%</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* HEATMAP */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Attendance Heatmap</h3>
              <p className="text-xs text-slate-500 mt-0.5">Student × Day matrix for {MONTHS[selectedMonth]} {selectedYear}</p>
            </div>
            
            {/* Heatmap Legend */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-600">
              {[
                { l: "Present", c: STATUS_COLORS.present }, { l: "Late", c: STATUS_COLORS.late },
                { l: "Half Day", c: STATUS_COLORS.half_day }, { l: "Holiday", c: STATUS_COLORS.holiday },
                { l: "Excused", c: STATUS_COLORS.excused }, { l: "Absent", c: STATUS_COLORS.absent },
                { l: "No Data", c: STATUS_COLORS.no_data },
              ].map((x) => (
                <span key={x.l} className="flex items-center gap-1.5">
                  <span className="w-[14px] h-[14px] rounded-[4px]" style={{ background: x.c }} /> {x.l}
                </span>
              ))}
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            {/* Fixed Height Scrolling Container */}
            <div className="overflow-auto max-h-[450px] relative custom-scrollbar">
              <table className="w-full border-collapse text-[11px]">
                {/* Sticky Header */}
                <thead className="sticky top-0 z-30 shadow-sm">
                  <tr className="bg-[#eef2ff]">
                    <th className="sticky left-0 z-40 bg-[#eef2ff] text-left px-4 py-2.5 font-bold text-[#4f46e5] min-w-[160px] border-r border-white/50">
                      Student
                    </th>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                      <th key={d} className="px-1 py-2.5 font-bold text-[#4f46e5] text-center min-w-[28px]">
                        {d}
                      </th>
                    ))}
                    <th className="sticky right-0 z-40 bg-[#eef2ff] px-4 py-2.5 font-bold text-[#4f46e5] text-center border-l border-white/50">
                      %
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((s) => {
                    const pct = s.totalMarked > 0 ? Math.round(((s.present + s.late + s.half_day) / s.totalMarked) * 100) : 0;
                    return (
                      <tr key={s.studentId} className="hover:bg-slate-50 transition-colors">
                        <td className="sticky left-0 z-20 bg-white hover:bg-slate-50 px-4 py-2 font-semibold text-slate-700 truncate max-w-[160px] border-r border-slate-100">
                          {s.studentName}
                        </td>
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                          const st = s.dayStatus[d] || "no_data";
                          const color = STATUS_COLORS[st] || STATUS_COLORS.no_data;
                          return (
                            <td key={d} className="px-1 py-1.5 text-center">
                              <div 
                                className="w-[22px] h-[22px] mx-auto rounded-[6px]" 
                                style={{ backgroundColor: color }} 
                                title={`${s.studentName} - Day ${d}: ${st}`} 
                              />
                            </td>
                          );
                        })}
                        <td className={`sticky right-0 z-20 bg-white hover:bg-slate-50 px-4 py-2 text-center font-bold border-l border-slate-100 ${pct >= 75 ? "text-emerald-600" : pct > 0 ? "text-rose-500" : "text-slate-400"}`}>
                          {pct}%
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={daysInMonth + 2} className="text-center py-10 text-slate-400 font-medium">
                        No students found for this selection
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Student-wise Details Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 bg-[#f8fafc]">
            <div>
              <h3 className="font-bold text-slate-800">Student-wise Details</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Showing records for {filteredStudents.length} students</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="Search student name or admission no..." className="h-10 pl-9 rounded-xl border-slate-200 text-sm shadow-sm focus:ring-[#5b6cf9]/30" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="text-left px-5 py-4">Student Info</th>
                  <th className="text-left px-3 py-4">Batch</th>
                  <th className="text-center px-3 py-4 text-emerald-600">P</th>
                  <th className="text-center px-3 py-4 text-rose-500">A</th>
                  <th className="text-center px-3 py-4 text-amber-500">L</th>
                  <th className="text-center px-3 py-4">Total Marked</th>
                  <th className="text-left px-4 py-4 min-w-[150px]">Attendance %</th>
                  <th className="text-center px-5 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => {
                  const pct = s.totalMarked > 0 ? Math.round(((s.present + s.late + s.half_day) / s.totalMarked) * 100) : 0;
                  const status = getStatusLabel(pct, s.totalMarked);
                  return (
                    <tr key={s.studentId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-bold text-slate-800">{s.studentName}</div>
                        <div className="text-[10px] font-semibold text-slate-400 mt-0.5">{s.admissionNo || s.studentId.substring(0, 10)}</div>
                      </td>
                      <td className="px-3 py-3 text-slate-600 font-semibold text-xs">{s.batchName}</td>
                      <td className="px-3 py-3 text-center font-bold text-emerald-600 bg-emerald-50/30">{s.present}</td>
                      <td className="px-3 py-3 text-center font-bold text-rose-500 bg-rose-50/30">{s.absent}</td>
                      <td className="px-3 py-3 text-center font-bold text-amber-500 bg-amber-50/30">{s.late}</td>
                      <td className="px-3 py-3 text-center font-bold text-slate-600 bg-slate-50/50">{s.totalMarked}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner max-w-[100px]">
                            <div className={`h-full rounded-full transition-all ${pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : pct > 0 ? "bg-rose-400" : "bg-slate-300"}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className={`text-xs font-bold w-9 ${pct >= 75 ? "text-emerald-600" : pct > 0 ? "text-rose-500" : "text-slate-400"}`}>{pct}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-flex px-3 py-1 rounded-md text-[10px] font-bold tracking-wide shadow-sm border border-black/5 ${status.cls}`}>{status.text}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}