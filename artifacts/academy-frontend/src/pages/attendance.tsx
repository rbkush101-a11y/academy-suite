import {
  useListStudentAttendance,
  useListBatches,
  useListCourses,
  useMarkStudentAttendance,
  getListStudentAttendanceQueryKey,
} from "@workspace/api-client-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Users, CalendarDays, CheckCircle2, XCircle, Clock3 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

type StatusFilter = "all" | "present" | "absent" | "late" | "not_marked";
type AttendanceStatus = "present" | "absent" | "late";

type DropdownOption = {
  label: string;
  value: string;
  subLabel?: string;
};

function SearchableDropdown({
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: DropdownOption[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const selected = options.find((item) => item.value === value);

  const filteredOptions = options.filter((item) =>
    `${item.label} ${item.subLabel ?? ""}`.toLowerCase().includes(searchText.toLowerCase())
  );

  const choose = (option: DropdownOption) => {
    onChange(option.value);
    setSearchText("");
    setOpen(false);
  };

  return (
    <div className="relative space-y-1.5">
      <label className="text-sm font-medium">{label}</label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setSearchText("");
          setOpen((old) => !old);
        }}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-left text-sm shadow-sm transition-colors hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selected ? "" : "text-muted-foreground"}>
          {selected?.label ?? placeholder}
        </span>
        <span className="text-xs text-muted-foreground">▼</span>
      </button>

      {open && !disabled ? (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-2 shadow-lg">
          <Input
            autoFocus
            value={searchText}
            placeholder={`Search ${label.toLowerCase()}...`}
            onChange={(event) => setSearchText(event.target.value)}
            className="mb-2 h-9"
          />
          <div className="max-h-56 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    choose(option);
                  }}
                  className="flex w-full flex-col rounded px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <span className="font-medium">{option.label}</span>
                  {option.subLabel ? (
                    <span className="text-xs text-muted-foreground">{option.subLabel}</span>
                  ) : null}
                </button>
              ))
            ) : (
              <div className="px-3 py-3 text-center text-sm text-muted-foreground">
                No matching option found
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatusPill({ status }: { status?: string | null }) {
  const cleanStatus = status || "not_marked";
  const styles: Record<string, string> = {
    present: "bg-green-100 text-green-700",
    absent: "bg-red-100 text-red-700",
    late: "bg-yellow-100 text-yellow-700",
    not_marked: "bg-slate-100 text-slate-600",
  };

  return (
    <span className={`rounded px-2 py-1 text-xs font-medium ${styles[cleanStatus] ?? styles.not_marked}`}>
      {cleanStatus === "not_marked" ? "NOT MARKED" : cleanStatus.toUpperCase()}
    </span>
  );
}

export default function Attendance() {
  const [location] = useLocation();
  const typeFromUrl = new URLSearchParams(location.split("?")[1] ?? window.location.search).get("type");
  const pageType = typeFromUrl === "computer" ? "computer" : "academic";
  const pageTitle = pageType === "computer" ? "Computer Attendance" : "Academic Attendance";

  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [courseId, setCourseId] = useState("all");
  const [batchId, setBatchId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [message, setMessage] = useState("");

  const { data: batches } = useListBatches();
  const { data: courses } = useListCourses();

  const { data: attendanceRecords, isLoading } = useListStudentAttendance(
    { batchId, date },
    { query: { enabled: !!batchId } as any }
  );

  const markAttendance = useMarkStudentAttendance();
  const queryClient = useQueryClient();

  const courseList = useMemo(
    () =>
      ((courses ?? []) as any[]).filter(
        (course) => (course.courseType ?? "academic") === pageType
      ),
    [courses, pageType]
  );

  const allowedCourseIds = useMemo(
    () => new Set(courseList.map((course) => String(course.id))),
    [courseList]
  );

  const batchList = useMemo(
    () =>
      ((batches ?? []) as any[]).filter((batch) =>
        allowedCourseIds.has(String(batch.courseId ?? ""))
      ),
    [batches, allowedCourseIds]
  );

  const visibleBatches = batchList.filter(
    (batch) => courseId === "all" || String(batch.courseId ?? "") === String(courseId)
  );

  const counts = useMemo(() => {
    const records = (attendanceRecords ?? []) as any[];
    return {
      all: records.length,
      present: records.filter((record) => record.status === "present").length,
      absent: records.filter((record) => record.status === "absent").length,
      late: records.filter((record) => record.status === "late").length,
      not_marked: records.filter((record) => !record.status || record.status === "not_marked").length,
    };
  }, [attendanceRecords]);

  const filteredRecords = useMemo(() => {
    const term = studentSearch.trim().toLowerCase();

    return ((attendanceRecords ?? []) as any[]).filter((record) => {
      const recordStatus = record.status || "not_marked";
      const matchesStatus = statusFilter === "all" || recordStatus === statusFilter;
      const matchesSearch =
        !term ||
        String(record.studentName ?? "").toLowerCase().includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [attendanceRecords, studentSearch, statusFilter]);

  const handleMark = (studentId: string, status: AttendanceStatus) => {
    if (!batchId) return;

    setMessage("");

    markAttendance.mutate(
      {
        data: { studentId, batchId, date, status },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStudentAttendanceQueryKey() });
        },
        onError: (error: any) => {
          setMessage(error?.message ?? "Attendance save nahi hui. Backend check karo.");
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {pageType === "computer"
            ? ""
            : ""}
        </p>
      </div>

      <Card>
        <CardHeader className="border-b bg-slate-50 dark:bg-slate-900">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  setStatusFilter("all");
                }}
              />
            </div>

            <SearchableDropdown
              label={`Filter ${pageType === "computer" ? "Computer" : "Academic"} Course`}
              value={courseId}
              placeholder={`Search ${pageType === "computer" ? "Computer" : "Academic"} Course`}
              options={[
                {
                  label: `All ${pageType === "computer" ? "Computer" : "Academic"} Courses`,
                  value: "all",
                  subLabel: "Show batches from every course",
                },
                ...courseList.map((course) => ({
                  label: course.name,
                  value: course.id,
                  subLabel: pageType === "computer" ? "Computer Course" : "Academic Course",
                })),
              ]}
              onChange={(value) => {
                setCourseId(value);
                setBatchId("");
                setStatusFilter("all");
              }}
            />

            <SearchableDropdown
              label="Select Batch"
              value={batchId}
              placeholder="Search and select batch"
              options={visibleBatches.map((batch) => {
                const course = courseList.find((item) => item.id === batch.courseId);
                return {
                  label: batch.name,
                  value: batch.id,
                  subLabel: course?.name ? `Course: ${course.name}` : "Batch",
                };
              })}
              onChange={(value) => {
                setBatchId(value);
                setStatusFilter("all");
              }}
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {!batchId ? (
            <div className="py-16 text-center text-muted-foreground">
              <Users className="mx-auto mb-3 h-8 w-8 opacity-50" />
              Select a batch to view and mark attendance
            </div>
          ) : isLoading ? (
            <div className="py-16 text-center text-muted-foreground">Loading students...</div>
          ) : (
            <div className="space-y-4 p-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "all", label: "All Students", count: counts.all },
                  { value: "present", label: "Present", count: counts.present },
                  { value: "absent", label: "Absent", count: counts.absent },
                  { value: "late", label: "Late", count: counts.late },
                  { value: "not_marked", label: "Not Marked", count: counts.not_marked },
                ].map((item) => (
                  <Button
                    key={item.value}
                    type="button"
                    size="sm"
                    variant={statusFilter === item.value ? "default" : "outline"}
                    onClick={() => setStatusFilter(item.value as StatusFilter)}
                  >
                    {item.label} ({item.count})
                  </Button>
                ))}
              </div>

              <div className="flex max-w-sm items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={studentSearch}
                  placeholder="Search student..."
                  onChange={(event) => setStudentSearch(event.target.value)}
                  className="h-9"
                />
              </div>

              {message ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {message}
                </div>
              ) : null}

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Mark Attendance</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                          No students found in this batch
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRecords.map((record: any) => (
                        <TableRow key={record.studentId || record.id}>
                          <TableCell className="font-medium">{record.studentName || "Unnamed Student"}</TableCell>
                          <TableCell>
                            <StatusPill status={record.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant={record.status === "present" ? "default" : "outline"}
                                onClick={() => handleMark(record.studentId, "present")}
                                disabled={markAttendance.isPending}
                              >
                                Present
                              </Button>
                              <Button
                                size="sm"
                                variant={record.status === "late" ? "default" : "outline"}
                                onClick={() => handleMark(record.studentId, "late")}
                                disabled={markAttendance.isPending}
                              >
                                Late
                              </Button>
                              <Button
                                size="sm"
                                variant={record.status === "absent" ? "destructive" : "outline"}
                                onClick={() => handleMark(record.studentId, "absent")}
                                disabled={markAttendance.isPending}
                              >
                                Absent
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
