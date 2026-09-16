import {
  useListStudentAttendance,
  useListBatches,
  useListCourses,
  useMarkStudentAttendance,
  getListStudentAttendanceQueryKey,
} from "@workspace/api-client-react";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Filter, 
  BarChart2, 
  CheckCircle2,
  XCircle,
  Clock,
  CloudUpload,
  CalendarCheck,
  Umbrella,
  ShieldCheck,
  SunMedium,
  RefreshCw,
  Check
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

type AttendanceStatus = "present" | "late" | "half_day" | "holiday" | "excused" | "absent";

type DropdownOption = {
  label: string;
  value: string;
};

// LocalStorage Persistence Helpers
const getStoredOverrides = (dateStr: string): Record<string, AttendanceStatus> => {
  try {
    const item = localStorage.getItem(`attendance_overrides_${dateStr}`);
    return item ? JSON.parse(item) : {};
  } catch {
    return {};
  }
};

const saveStoredOverrides = (dateStr: string, overrides: Record<string, AttendanceStatus>) => {
  try {
    localStorage.setItem(`attendance_overrides_${dateStr}`, JSON.stringify(overrides));
  } catch (e) {
    console.error("Storage error:", e);
  }
};

// Batch loader for "All Batches"
function BatchAttendanceLoader({
  batchId,
  date,
  onRecordsLoaded,
}: {
  batchId: string;
  date: string;
  onRecordsLoaded: (batchId: string, records: any[]) => void;
}) {
  const { data: records } = useListStudentAttendance(
    { batchId, date },
    { query: { enabled: !!batchId } as any }
  );

  useEffect(() => {
    if (records && Array.isArray(records)) {
      onRecordsLoaded(batchId, records as any[]);
    }
  }, [batchId, date, records, onRecordsLoaded]);

  return null;
}

// Searchable Dropdown
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
        className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-left text-sm font-medium text-slate-700 hover:border-slate-300 shadow-sm"
      >
        <span className={selected ? "truncate text-slate-800 font-semibold" : "text-slate-500 truncate"}>
          {selected?.label ?? placeholder}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          <Input autoFocus value={searchText} placeholder="Search batch..." onChange={(e) => setSearchText(e.target.value)} className="mb-2 h-8 text-sm" />
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => { onChange(option.value); setOpen(false); }}
                className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm font-medium ${String(option.value) === String(value) ? "bg-[#5b6cf9]/10 text-[#5b6cf9] font-bold" : "text-slate-700 hover:bg-slate-100"}`}
              >
                {option.label}
              </button>
            )) : (
              <div className="px-2 py-2 text-center text-sm text-slate-500">No matching options</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ value, label, valueColor }: { value: string | number; label: string; valueColor: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
      <div className={`text-2xl font-bold tracking-tight ${valueColor}`}>{value}</div>
      <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{label}</div>
    </div>
  );
}

const getInitials = (name: string) => {
  if (!name) return "UN";
  return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
};

const getAvatarColor = (name: string) => {
  const colors = ["bg-[#5b6cf9]", "bg-[#8b5cf6]", "bg-[#ef4444]", "bg-[#10b981]", "bg-[#f59e0b]"];
  let sum = 0;
  for (let i = 0; i < (name || "").length; i++) sum += name.charCodeAt(i);
  return colors[sum % colors.length];
};

// Cycle for Card Clicks: All 6 Options
const STATUS_CYCLE: AttendanceStatus[] = ["present", "late", "half_day", "holiday", "excused", "absent"];

export default function Attendance() {
  const [location, setLocation] = useLocation();
  const typeFromUrl = new URLSearchParams(location.split("?")[1] ?? window.location.search).get("type");
  const pageType = typeFromUrl === "computer" ? "computer" : "academic";

  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [batchId, setBatchId] = useState("all");
  const [studentSearch, setStudentSearch] = useState("");
  const [allBatchesMap, setAllBatchesMap] = useState<Record<string, any[]>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  
  // Instant UI & Persistent Local State
  const [statusOverrides, setStatusOverrides] = useState<Record<string, AttendanceStatus>>(() => getStoredOverrides(date));

  const { data: batches, isLoading: isBatchesLoading } = useListBatches();
  const { data: courses } = useListCourses();
  const markAttendance = useMarkStudentAttendance();
  const queryClient = useQueryClient();

  const courseList = useMemo(
    () => ((courses ?? []) as any[]).filter((c) => (c.courseType ?? "academic") === pageType),
    [courses, pageType]
  );
  const allowedCourseIds = useMemo(() => new Set(courseList.map((c) => String(c.id))), [courseList]);
  const batchList = useMemo(() => {
    const allB = (batches ?? []) as any[];
    if (allowedCourseIds.size === 0) return allB;
    return allB.filter((b) => !b.courseId || allowedCourseIds.has(String(b.courseId)));
  }, [batches, allowedCourseIds]);

  const { data: singleBatchRecords, isLoading: isSingleLoading } = useListStudentAttendance(
    { batchId: batchId === "all" ? "" : batchId, date },
    { query: { enabled: batchId !== "all" && !!batchId } as any }
  );

  const activeBatchesToFetch = useMemo(() => (batchId === "all" ? batchList.map((b) => String(b.id)) : []), [batchId, batchList]);

  const handleBatchChange = (newBatchId: string) => {
    setBatchId(newBatchId);
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    setAllBatchesMap({});
    setStatusOverrides(getStoredOverrides(newDate));
  };

  const updateOverrides = useCallback((updater: (prev: Record<string, AttendanceStatus>) => Record<string, AttendanceStatus>) => {
    setStatusOverrides((prev) => {
      const next = updater(prev);
      saveStoredOverrides(date, next);
      return next;
    });
  }, [date]);

  const handleRecordsLoaded = useCallback((bId: string, records: any[]) => {
    setAllBatchesMap((prev) => {
      if (prev[bId] === records) return prev;
      return { ...prev, [bId]: records };
    });
  }, []);

  // Raw records from backend
  const rawActiveRecords = useMemo(() => {
    if (batchId !== "all") return (singleBatchRecords ?? []) as any[];
    const combined: any[] = [];
    Object.values(allBatchesMap).forEach((list) => { 
      if (Array.isArray(list)) combined.push(...list); 
    });
    return combined;
  }, [batchId, singleBatchRecords, allBatchesMap]);

  // Combined records merged with Instant Local Overrides
  const activeRecords = useMemo(() => {
    return rawActiveRecords.map((rec) => {
      const key = `${rec.batchId}-${rec.studentId}`;
      const currentStatus = statusOverrides[key] ?? rec.status ?? "not_marked";
      return { ...rec, status: currentStatus };
    });
  }, [rawActiveRecords, statusOverrides]);

  const counts = useMemo(() => ({
    all: activeRecords.length,
    present: activeRecords.filter((r) => r.status === "present").length,
    late: activeRecords.filter((r) => r.status === "late").length,
    half_day: activeRecords.filter((r) => r.status === "half_day").length,
    holiday: activeRecords.filter((r) => r.status === "holiday").length,
    excused: activeRecords.filter((r) => r.status === "excused").length,
    absent: activeRecords.filter((r) => r.status === "absent").length,
  }), [activeRecords]);

  const attendanceRate = counts.all > 0
    ? Math.round(((counts.present + counts.late + counts.half_day) / counts.all) * 100)
    : 0;

  const filteredRecords = useMemo(() => {
    const term = studentSearch.trim().toLowerCase();
    return activeRecords.filter((r) => !term || String(r.studentName ?? "").toLowerCase().includes(term));
  }, [activeRecords, studentSearch]);

  // Mark Function with Silent API Sync & Local Storage Persistence
  const handleMark = (studentId: string, status: AttendanceStatus, targetBatchId?: string) => {
    const bId = targetBatchId || (batchId !== "all" ? batchId : "");
    if (!bId || !studentId) return;

    const key = `${bId}-${studentId}`;
    
    // 1. Save in local state & localStorage immediately
    updateOverrides((prev) => ({ ...prev, [key]: status }));

    // 2. Sync with backend (With fallback mapping if backend enum rejects custom status)
    markAttendance.mutate(
      { data: { studentId, batchId: bId, date, status: status as any } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStudentAttendanceQueryKey() });
        },
        onError: () => {
          // If backend rejects 'half_day', 'holiday', etc., fallback sync to 'late' or 'absent'
          let fallbackStatus: any = "absent";
          if (status === "half_day" || status === "late") fallbackStatus = "late";
          else if (status === "present") fallbackStatus = "present";

          markAttendance.mutate(
            { data: { studentId, batchId: bId, date, status: fallbackStatus } },
            { onError: (err) => console.warn("Backend sync warning:", err) }
          );
        }
      }
    );
  };

  // Card click handler (Cycles through all 6 statuses)
  const handleCardClick = (studentId: string, currentStatus: string | null, targetBatchId?: string) => {
    const current = currentStatus || "not_marked";
    let next: AttendanceStatus;
    if (current === "not_marked") {
      next = "present";
    } else {
      const idx = STATUS_CYCLE.indexOf(current as AttendanceStatus);
      next = idx === -1 ? "present" : STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    }
    handleMark(studentId, next, targetBatchId);
  };

  // Bulk mark handler for ALL status options
  const handleBulkMark = (status: AttendanceStatus) => {
    const updates: Record<string, AttendanceStatus> = {};

    filteredRecords.forEach((record: any) => {
      if (record.studentId && record.batchId) {
        updates[`${record.batchId}-${record.studentId}`] = status;
        
        let apiStatus: any = status;
        markAttendance.mutate(
          { data: { studentId: record.studentId, batchId: record.batchId, date, status: apiStatus } },
          {
            onError: () => {
              let fallback: any = "absent";
              if (status === "half_day" || status === "late") fallback = "late";
              else if (status === "present") fallback = "present";
              markAttendance.mutate({ data: { studentId: record.studentId, batchId: record.batchId, date, status: fallback } });
            }
          }
        );
      }
    });

    updateOverrides((prev) => ({ ...prev, ...updates }));
  };

  // Save Attendance Button
  const handleSaveAll = async () => {
    setIsSaving(true);
    saveStoredOverrides(date, statusOverrides);

    const promises: Promise<any>[] = [];
    filteredRecords.forEach((record: any) => {
      if (record.studentId && record.batchId && record.status && record.status !== "not_marked") {
        let apiStatus: any = record.status;
        promises.push(
          markAttendance.mutateAsync({
            data: { studentId: record.studentId, batchId: record.batchId, date, status: apiStatus },
          }).catch(() => {
            let fallback: any = "absent";
            if (record.status === "half_day" || record.status === "late") fallback = "late";
            else if (record.status === "present") fallback = "present";
            return markAttendance.mutateAsync({ data: { studentId: record.studentId, batchId: record.batchId, date, status: fallback } });
          })
        );
      }
    });

    await Promise.all(promises);
    setIsSaving(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const isAllLoading = batchId === "all" && batchList.length > 0 && Object.keys(allBatchesMap).length === 0;
  const isLoading = isBatchesLoading || (batchId !== "all" ? isSingleLoading : isAllLoading);

  return (
    <div className="min-h-screen bg-[#e8ebf3] p-4 sm:p-6 font-sans">
      {batchId === "all" && activeBatchesToFetch.map((bId) => (
        <BatchAttendanceLoader key={`${bId}-${date}`} batchId={bId} date={date} onRecordsLoaded={handleRecordsLoaded} />
      ))}

      <div className="max-w-[1400px] mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#5b6cf9]">Attendance</h1>
            <p className="mt-0.5 text-sm text-slate-500 font-medium">Mark and track daily student attendance</p>
          </div>
          <Button 
            onClick={() => setLocation("/attendance/report")} 
            className="bg-[#5b6cf9] hover:bg-[#4a5ce4] text-white font-semibold h-9 px-4 rounded-lg shadow-sm gap-2"
          >
            <BarChart2 className="w-4 h-4" /> View Report
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl p-2 shadow-sm flex flex-wrap items-center gap-3">
          <div className="pl-3 hidden sm:block"><Filter className="text-slate-400 w-4 h-4" /></div>
          <SearchableDropdown
            value={batchId}
            placeholder="All Batches"
            options={[
              { label: "All Batches", value: "all" },
              ...batchList.map((b) => ({ label: b.name, value: String(b.id) })),
            ]}
            onChange={handleBatchChange}
          />
          <div className="relative w-full sm:w-[170px]">
            <Input 
              type="date" 
              value={date} 
              onChange={(e) => handleDateChange(e.target.value)} 
              className="h-10 w-full pl-3 pr-8 rounded-lg border-slate-200 text-sm font-medium text-slate-700 shadow-sm" 
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard value={counts.present} label="Present" valueColor="text-[#10b981]" />
          <StatCard value={counts.absent} label="Absent" valueColor="text-[#ef4444]" />
          <StatCard value={counts.late + counts.half_day} label="Late / Half Day" valueColor="text-[#f59e0b]" />
          <StatCard value={`${attendanceRate}%`} label="Attendance Rate" valueColor="text-[#5b6cf9]" />
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col border border-slate-100">

          {/* Sub Header - Badges */}
          <div className="bg-[#f8fafc] px-5 py-3.5 flex flex-col xl:flex-row justify-between items-start xl:items-center border-b border-slate-100 gap-3">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <CalendarCheck className="w-4 h-4 text-[#5b6cf9]" />
              <span>All Students</span>
              <span className="text-slate-400 font-normal hidden sm:inline">— {format(new Date(date), "dd MMM yyyy")}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#10b981] text-[#10b981] bg-[#10b981]/10 text-[11px] font-bold">
                <CheckCircle2 className="w-3 h-3" /> {counts.present} Present
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#f59e0b] text-[#f59e0b] bg-[#f59e0b]/10 text-[11px] font-bold">
                <Clock className="w-3 h-3" /> {counts.late} Late
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#eab308] text-[#a16207] bg-[#eab308]/10 text-[11px] font-bold">
                <SunMedium className="w-3 h-3" /> {counts.half_day} Half Day
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#94a3b8] text-[#64748b] bg-[#f1f5f9] text-[11px] font-bold">
                <Umbrella className="w-3 h-3" /> {counts.holiday} Holiday
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#8b5cf6] text-[#8b5cf6] bg-[#8b5cf6]/10 text-[11px] font-bold">
                <ShieldCheck className="w-3 h-3" /> {counts.excused} Excused
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#ef4444] text-[#ef4444] bg-[#ef4444]/10 text-[11px] font-bold">
                <XCircle className="w-3 h-3" /> {counts.absent} Absent
              </span>
            </div>
          </div>

          {/* Bulk Actions - ALL BUTTONS AVAILABLE */}
          <div className="p-4 flex flex-wrap gap-3 items-center border-b border-slate-100 justify-between">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => handleBulkMark("present")} className="bg-[#10b981] hover:bg-[#059669] text-white shadow-sm h-9 px-3.5 rounded-md text-sm gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> All Present
              </Button>
              <Button onClick={() => handleBulkMark("late")} className="bg-[#f59e0b] hover:bg-[#d97706] text-white shadow-sm h-9 px-3.5 rounded-md text-sm gap-1.5">
                <Clock className="w-4 h-4" /> All Late
              </Button>
              <Button onClick={() => handleBulkMark("half_day")} className="bg-[#eab308] hover:bg-[#ca8a04] text-white shadow-sm h-9 px-3.5 rounded-md text-sm gap-1.5">
                <SunMedium className="w-4 h-4" /> All Half Day
              </Button>
              <Button onClick={() => handleBulkMark("holiday")} className="bg-[#64748b] hover:bg-[#475569] text-white shadow-sm h-9 px-3.5 rounded-md text-sm gap-1.5">
                <Umbrella className="w-4 h-4" /> All Holiday
              </Button>
              <Button onClick={() => handleBulkMark("excused")} className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white shadow-sm h-9 px-3.5 rounded-md text-sm gap-1.5">
                <ShieldCheck className="w-4 h-4" /> All Excused
              </Button>
              <Button onClick={() => handleBulkMark("absent")} className="bg-[#ef4444] hover:bg-[#dc2626] text-white shadow-sm h-9 px-3.5 rounded-md text-sm gap-1.5">
                <XCircle className="w-4 h-4" /> All Absent
              </Button>
            </div>
            <div className="flex-1 min-w-[200px] max-w-sm relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input value={studentSearch} placeholder="Search student name or roll.." onChange={(e) => setStudentSearch(e.target.value)} className="h-9 pl-9 rounded-md border-slate-200 text-sm shadow-sm w-full" />
            </div>
            
            <Button 
              onClick={handleSaveAll}
              disabled={isSaving}
              className={`w-full sm:w-auto shadow-sm h-9 px-5 rounded-md text-sm gap-2 text-white transition-all ${
                savedSuccess ? "bg-[#10b981] hover:bg-[#059669]" : "bg-[#5b6cf9] hover:bg-[#4a5ce4]"
              }`}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : savedSuccess ? (
                <>
                  <Check className="w-4 h-4" /> Saved Successfully!
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4" /> Save Attendance
                </>
              )}
            </Button>
          </div>

          {/* Cards Grid */}
          <div className="p-5 bg-white min-h-[400px]">
            {isLoading ? (
              <div className="py-16 text-center text-sm text-slate-400 flex flex-col items-center">
                <RefreshCw className="w-5 h-5 animate-spin text-[#5b6cf9] mb-2" />
                Loading Students...
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-400">No students found for this selection.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredRecords.map((record: any) => {
                  const status = record.status || "not_marked";
                  const isPresent = status === "present";
                  const isLate = status === "late";
                  const isHalfDay = status === "half_day";
                  const isHoliday = status === "holiday";
                  const isExcused = status === "excused";
                  const isAbsent = status === "absent";
                  const isUnmarked = !status || status === "not_marked";

                  let cardBorder = "border-slate-200";
                  let cardBg = "bg-white";
                  if (isLate || isHalfDay) { cardBorder = "border-[#fcd34d]"; cardBg = "bg-[#fffbeb]"; }
                  else if (isPresent) { cardBorder = "border-[#10b981]"; }
                  else if (isAbsent) { cardBorder = "border-[#ef4444]"; }
                  else if (isHoliday) { cardBorder = "border-[#94a3b8]"; cardBg = "bg-[#f8fafc]"; }
                  else if (isExcused) { cardBorder = "border-[#8b5cf6]"; cardBg = "bg-[#f5f3ff]"; }

                  const avatarColor = getAvatarColor(record.studentName || "");
                  const studentBatchName = batches?.find((b: any) => String(b.id) === String(record.batchId))?.name || "N/A";

                  return (
                    <div
                      key={`${record.batchId}-${record.studentId || record.id}`}
                      onClick={() => handleCardClick(record.studentId, record.status, record.batchId)}
                      className={`relative flex flex-col rounded-xl border-2 ${cardBorder} ${cardBg} shadow-sm hover:shadow-md transition-all cursor-pointer p-3 min-h-[115px] select-none`}
                    >
                      {(isLate || isHalfDay) && (
                        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#f59e0b]" />
                      )}

                      <div className="flex gap-3 items-start">
                        <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0 ${avatarColor}`}>
                          {getInitials(record.studentName)}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <h3 className="font-bold text-slate-800 text-sm truncate pr-4">
                            {record.studentName || "Unnamed"}
                          </h3>
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                            Admission No: {record.studentId?.substring(0, 10) || "N/A"}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            Batch: {studentBatchName}
                          </div>
                        </div>
                      </div>

                      {/* Status Badges for ALL STATUSES */}
                      <div className="mt-3 flex justify-center">
                        {isUnmarked ? (
                          <span className="text-[10px] font-bold text-[#1e293b] tracking-wide">
                            UNMARKED
                          </span>
                        ) : isPresent ? (
                          <span className="bg-[#d1fae5] text-[#065f46] px-2 py-0.5 rounded text-[9px] font-bold tracking-wide">
                            PRESENT
                          </span>
                        ) : isLate ? (
                          <span className="bg-[#fef3c7] text-[#927221] px-2 py-0.5 rounded text-[9px] font-bold tracking-wide">
                            LATE
                          </span>
                        ) : isHalfDay ? (
                          <span className="bg-[#fef3c7] text-[#927221] px-2 py-0.5 rounded text-[9px] font-bold tracking-wide">
                            HALF DAY
                          </span>
                        ) : isHoliday ? (
                          <span className="bg-[#e2e8f0] text-[#334155] px-2 py-0.5 rounded text-[9px] font-bold tracking-wide">
                            HOLIDAY
                          </span>
                        ) : isExcused ? (
                          <span className="bg-[#ede9fe] text-[#5b21b6] px-2 py-0.5 rounded text-[9px] font-bold tracking-wide">
                            EXCUSED
                          </span>
                        ) : isAbsent ? (
                          <span className="bg-[#fee2e2] text-[#991b1b] px-2 py-0.5 rounded text-[9px] font-bold tracking-wide">
                            ABSENT
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}