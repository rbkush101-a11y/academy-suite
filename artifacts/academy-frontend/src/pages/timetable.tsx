import {
  useListTimetableEntries,
  useListBatches,
  useListCourses,
  useListSubjects,
  useListStaff,
  useCreateTimetableEntry,
  getListTimetableEntriesQueryKey,
} from "@workspace/api-client-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Plus, Clock, UserRound, BookOpen, Layers3, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    return result?.error || result?.message || "Timetable entry delete nahi hui.";
  } catch {
    return "Timetable entry delete nahi hui. Backend check karo.";
  }
}

const timetableSchema = z.object({
  batchId: z.string().min(1, "Select a batch"),
  subjectId: z.string().min(1, "Select a subject"),
  day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]),
  startTime: z.string().min(1, "Select start time"),
  endTime: z.string().min(1, "Select end time"),
  room: z.string().optional(),
});

type TimetableForm = z.infer<typeof timetableSchema>;

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
  const selected = options.find((option) => option.value === value);
  const [searchText, setSearchText] = useState("");

  const visibleOptions = options.filter((option) =>
    `${option.label} ${option.subLabel ?? ""}`.toLowerCase().includes(searchText.toLowerCase())
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
          {selected ? selected.label : placeholder}
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
            {visibleOptions.length > 0 ? (
              visibleOptions.map((option) => (
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

function teacherNameFor(subject: any, staff: any[]) {
  if (subject?.teacherName) return subject.teacherName;

  const teacherId =
    typeof subject?.teacherId === "object"
      ? String(subject.teacherId?._id ?? subject.teacherId?.id ?? "")
      : String(subject?.teacherId ?? "");

  return staff.find((member: any) => member.id === teacherId)?.name ?? "";
}

export default function Timetable() {
  const [location] = useLocation();
  const typeFromUrl = new URLSearchParams(location.split("?")[1] ?? window.location.search).get("type");
  const pageType = typeFromUrl === "academic" || typeFromUrl === "computer" ? typeFromUrl : "academic";
  const pageTitle = pageType === "computer" ? "Computer Timetable" : "Academic Timetable";
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [viewCourseId, setViewCourseId] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [formCourseId, setFormCourseId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: entries, isLoading } = useListTimetableEntries(
    { batchId: selectedBatch },
    { query: { enabled: !!selectedBatch } as any }
  );
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
      subjectId: "",
      day: "Monday",
      startTime: "09:00",
      endTime: "10:00",
      room: "",
    },
  });

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

  const allBatchList = (batches ?? []) as any[];
  const allCourseList = (courses ?? []) as any[];
  const allSubjectList = (subjects ?? []) as any[];
  const staffList = (staff ?? []) as any[];

  // Academic and Computer timetable data stay completely separate.
  const courseList = allCourseList.filter(
    (course) => (course.courseType ?? "academic") === pageType
  );
  const allowedCourseIds = new Set(courseList.map((course) => String(course.id)));
  const batchList = allBatchList.filter((batch) => allowedCourseIds.has(String(batch.courseId ?? "")));
  const subjectList = allSubjectList.filter((subject) => allowedCourseIds.has(String(subject.courseId ?? "")));

  const selectedFormBatch = batchList.find((batch) => batch.id === form.watch("batchId"));
  const effectiveCourseId = formCourseId || selectedFormBatch?.courseId || "";

  const formBatches = batchList.filter(
    (batch) => !formCourseId || String(batch.courseId ?? "") === String(formCourseId)
  );

  const formSubjects = subjectList.filter(
    (subject) => String(subject.courseId ?? "") === String(effectiveCourseId)
  );

  const selectedSubject = subjectList.find((subject) => subject.id === form.watch("subjectId"));
  const assignedTeacher = teacherNameFor(selectedSubject, staffList);

  const viewBatches = batchList.filter((batch) => {
    if (viewCourseId === "all") return true;
    return String(batch.courseId ?? "") === String(viewCourseId);
  });

  const batchOptions: DropdownOption[] = viewBatches.map((batch) => {
    const course = courseList.find((item) => item.id === batch.courseId);
    return {
      label: batch.name,
      value: batch.id,
      subLabel: course?.name ? `Course: ${course.name}` : "Course not assigned",
    };
  });

  const openAdd = () => {
    setMessage("");
    setFormCourseId("");
    form.reset({
      batchId: "",
      subjectId: "",
      day: "Monday",
      startTime: "09:00",
      endTime: "10:00",
      room: "",
    });
    setOpen(true);
  };

  const onSubmit = (values: TimetableForm) => {
    setMessage("");

    if (!effectiveCourseId) {
      setMessage("Pehle Course aur Batch select karo.");
      return;
    }

    const selectedBatchForSave = batchList.find((batch) => batch.id === values.batchId);
    const selectedSubjectForSave = subjectList.find((subject) => subject.id === values.subjectId);

    if (!selectedBatchForSave || !selectedSubjectForSave) {
      setMessage("Batch aur Subject select karo.");
      return;
    }

    if (String(selectedBatchForSave.courseId ?? "") !== String(selectedSubjectForSave.courseId ?? "")) {
      setMessage("Selected Batch aur Subject same Course ke hone chahiye.");
      return;
    }

    createEntry.mutate(
      { data: values },
      {
        onSuccess: () => {
          setSelectedBatch(values.batchId);
          setOpen(false);
          form.reset();
          queryClient.invalidateQueries({ queryKey: getListTimetableEntriesQueryKey() });
        },
        onError: (error: any) => {
          setMessage(error?.message ?? "Timetable entry save nahi hui. Backend check karo.");
        },
      }
    );
  };

  const deleteEntry = async (entry: any) => {
    const confirmed = window.confirm(
      `Do you want to delete the ${entry.subjectName || "this"} timetable entry for ${entry.day} from ${entry.startTime} to ${entry.endTime}?`
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

      await queryClient.invalidateQueries({ queryKey: getListTimetableEntriesQueryKey() });
    } catch {
      setMessage("Timetable entry delete nahi hui. Backend run hai ya nahi check karo.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pageType === "computer"
              ? "Computer Courses ke liye timetable manage karo."
              : "Academic Courses ke liye timetable manage karo."}
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add Schedule
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>Add {pageType === "computer" ? "Computer" : "Academic"} Timetable Entry</DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <SearchableDropdown
                  label="Course"
                  value={formCourseId}
                  placeholder="Select course first"
                  options={courseList.map((course) => ({
                    label: course.name,
                    value: course.id,
                    subLabel:
                      (course.courseType ?? "academic") === "computer"
                        ? "Computer Course"
                        : "Academic Course",
                  }))}
                  onChange={(value) => {
                    setFormCourseId(value);
                    form.setValue("batchId", "", { shouldValidate: true });
                    form.setValue("subjectId", "", { shouldValidate: true });
                  }}
                />

                <SearchableDropdown
                  label="Select Batch"
                  value={form.watch("batchId")}
                  placeholder={formCourseId ? "Search and select batch" : "Select Course first"}
                  disabled={!formCourseId}
                  options={formBatches.map((batch) => ({
                    label: batch.name,
                    value: batch.id,
                    subLabel: batch.startDate
                      ? `Starts: ${String(batch.startDate).slice(0, 10)}`
                      : "Batch",
                  }))}
                  onChange={(value) => {
                    form.setValue("batchId", value, { shouldValidate: true });
                    form.setValue("subjectId", "", { shouldValidate: true });
                  }}
                />

                <SearchableDropdown
                  label="Subject"
                  value={form.watch("subjectId")}
                  placeholder={effectiveCourseId ? "Search and select subject" : "Select Batch first"}
                  disabled={!effectiveCourseId}
                  options={formSubjects.map((subject) => ({
                    label: subject.name,
                    value: subject.id,
                    subLabel: subject.code ? `Code: ${subject.code}` : "Subject",
                  }))}
                  onChange={(value) => form.setValue("subjectId", value, { shouldValidate: true })}
                />

                <div className="rounded-md border bg-muted/30 px-3 py-2.5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <UserRound className="h-4 w-4" />
                    Assigned Teacher
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {assignedTeacher || "Subject select karne par assigned teacher automatic show hoga"}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="day"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {days.map((day) => (
                            <SelectItem key={day} value={day}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="room"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room / Mode (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Example: Room 1 / Online / Computer Lab" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {message ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {message}
                  </div>
                ) : null}

                <Button type="submit" className="w-full" disabled={createEntry.isPending}>
                  {createEntry.isPending ? "Saving..." : "Save Timetable Entry"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {message ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      ) : null}

      <Card>
        <CardHeader className="border-b bg-slate-50 dark:bg-slate-900">
          <div className="grid max-w-3xl gap-4 md:grid-cols-2">
            <SearchableDropdown
              label={`Filter ${pageType === "computer" ? "Computer" : "Academic"} Course`}
              value={viewCourseId}
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
                  subLabel:
                    pageType === "computer"
                      ? "Computer Course"
                      : "Academic Course",
                })),
              ]}
              onChange={(value) => {
                setViewCourseId(value);
                setSelectedBatch("");
              }}
            />

            <SearchableDropdown
              label="Select Batch"
              value={selectedBatch}
              placeholder="Search and select batch to view timetable"
              options={batchOptions}
              onChange={setSelectedBatch}
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {!selectedBatch ? (
            <div className="py-16 text-center text-muted-foreground">
              <Layers3 className="mx-auto mb-3 h-8 w-8 opacity-50" />
              Please select a batch to view its timetable
            </div>
          ) : isLoading ? (
            <div className="py-16 text-center">Loading timetable...</div>
          ) : (
            <div className="grid grid-cols-1 divide-y border-t md:grid-cols-7 md:divide-x md:divide-y-0">
              {days.map((day) => {
                const dayEntries = entries?.filter((entry: any) => entry.day === day) || [];

                return (
                  <div key={day} className="min-h-[200px]">
                    <div className="border-b bg-slate-100 p-2 text-center text-sm font-semibold dark:bg-slate-800">
                      {day}
                    </div>

                    <div className="space-y-2 p-2">
                      {dayEntries.length === 0 ? (
                        <div className="py-4 text-center text-xs text-muted-foreground">No classes</div>
                      ) : (
                        dayEntries.map((entry: any) => (
                          <div key={entry.id} className="rounded border border-primary/20 bg-primary/10 p-2 text-sm">
                            <div className="flex items-start gap-1.5 font-bold text-primary">
                              <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              <span>{entry.subjectName}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {entry.startTime} - {entry.endTime}
                            </div>
                            <div className="mt-1 truncate text-xs">{entry.teacherName || "Teacher not assigned"}</div>
                            {entry.room ? (
                              <div className="mt-1 text-xs text-muted-foreground">Room: {entry.room}</div>
                            ) : null}

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="mt-2 h-7 w-full border border-red-200 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => deleteEntry(entry)}
                              disabled={deletingId === entry.id}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              {deletingId === entry.id ? "Deleting..." : "Delete"}
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
