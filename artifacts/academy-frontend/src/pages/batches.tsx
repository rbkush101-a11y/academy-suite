import {
  useListBatches,
  useListCourses,
  getListBatchesQueryKey,
} from "@workspace/api-client-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, CalendarDays, BookMarked, Pencil, Trash2, Copy } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";

const batchSchema = z.object({
  name: z.string().trim().min(2, "Enter batch name"),
  courseId: z.string().min(1, "Select a course"),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
  schedule: z.string().trim().min(2, "Enter schedule"),
  academicYear: z.string().trim().min(4, "Enter academic year"),
  startDate: z.string().min(1, "Select start date"),
  status: z.enum(["active", "upcoming", "completed"]),
});

type BatchForm = z.infer<typeof batchSchema>;

function getAuthHeaders() {
  const token = localStorage.getItem("coach_sutra_token") || "";

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function getErrorText(response: Response) {
  try {
    const result = await response.json();
    return result?.error || result?.message || "Please check all details and try again.";
  } catch {
    return "Please check all details and try again.";
  }
}

function normalDate(value?: string) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function SearchableCourseDropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { id: string; name: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedName = options.find((course) => course.id === value)?.name ?? "";
  const [searchText, setSearchText] = useState(selectedName);
  const [activeIndex, setActiveIndex] = useState(-1);

  const filteredOptions = options.filter((course) =>
    course.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const selectCourse = (course: { id: string; name: string }) => {
    onChange(course.id);
    setSearchText(course.name);
    setOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div className="relative space-y-1.5">
      <label className="text-sm font-medium">Course</label>

      <Input
        value={searchText}
        placeholder="Search or select course"
        onFocus={() => {
          setOpen(true);
          setActiveIndex(-1);
        }}
        onChange={(event) => {
          setSearchText(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((old) =>
              filteredOptions.length === 0 ? -1 : Math.min(old + 1, filteredOptions.length - 1)
            );
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((old) =>
              filteredOptions.length === 0 ? -1 : Math.max(old - 1, 0)
            );
          } else if (event.key === "Enter" && open && filteredOptions.length > 0) {
            event.preventDefault();
            selectCourse(filteredOptions[activeIndex >= 0 ? activeIndex : 0]);
          } else if (event.key === "Escape") {
            event.preventDefault();
            setSearchText(selectedName);
            setOpen(false);
            setActiveIndex(-1);
          }
        }}
        onBlur={() => {
          window.setTimeout(() => {
            setSearchText(selectedName);
            setOpen(false);
            setActiveIndex(-1);
          }, 150);
        }}
      />

      <button
        type="button"
        aria-label="Open course list"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          setSearchText(selectedName);
          setOpen((old) => !old);
          setActiveIndex(-1);
        }}
        className="absolute right-2 top-[31px] flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-muted"
      >
        <span className="text-xs">▼</span>
      </button>

      {open ? (
        <div className="absolute z-50 max-h-64 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((course, index) => (
              <button
                key={course.id}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectCourse(course);
                }}
                className={`flex w-full rounded-sm px-3 py-2 text-left text-sm ${
                  index === activeIndex ? "bg-muted font-medium" : "hover:bg-muted"
                }`}
              >
                {course.name}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No matching course found. Select only from the available course list.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function Batches() {
  const [location] = useLocation();
  const typeFromUrl = new URLSearchParams(location.split("?")[1] ?? window.location.search).get("type");
  const pageType = typeFromUrl === "academic" || typeFromUrl === "computer" ? typeFromUrl : null;
  const pageTitle =
    pageType === "academic"
      ? "Academic Batches"
      : pageType === "computer"
        ? "Computer Batches"
        : "Batches";

  const { data: batches, isLoading } = useListBatches();
  const { data: courses } = useListCourses();
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const queryClient = useQueryClient();

  const visibleBatches = (batches ?? []).filter((batch: any) => {
    if (!pageType) return true;
    const linkedCourse = (courses ?? []).find((course: any) => course.id === batch.courseId) as any;
    return (linkedCourse?.courseType ?? "academic") === pageType;
  });

  const defaults: BatchForm = {
    name: "",
    courseId: "",
    capacity: 30,
    schedule: "Mon-Wed-Fri, 5PM-7PM",
    academicYear: "2026-2027",
    startDate: new Date().toISOString().split("T")[0],
    status: "active",
  };

  const form = useForm<BatchForm>({
    resolver: zodResolver(batchSchema),
    defaultValues: defaults,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: getListBatchesQueryKey(),
    });
  };

  const openAdd = () => {
    setMessage("");
    setEditTarget(null);
    form.reset(defaults);
    setOpen(true);
  };

  const openEdit = (batch: any) => {
    setMessage("");
    setEditTarget(batch);
    form.reset({
      name: batch.name ?? "",
      courseId: batch.courseId ?? "",
      capacity: Number(batch.capacity ?? 30),
      schedule: batch.schedule ?? "",
      academicYear: batch.academicYear ?? "",
      startDate: normalDate(batch.startDate),
      status: batch.status ?? "active",
    });
    setOpen(true);
  };

  const duplicateBatch = (batch: any) => {
    setMessage("");
    setEditTarget(null);
    form.reset({
      name: `${batch.name ?? ""} - Copy`,
      courseId: batch.courseId ?? "",
      capacity: Number(batch.capacity ?? 30),
      schedule: batch.schedule ?? "",
      academicYear: batch.academicYear ?? "",
      startDate: normalDate(batch.startDate) || defaults.startDate,
      status: batch.status ?? "active",
    });
    setOpen(true);
  };

  const closeDialog = (value: boolean) => {
    setOpen(value);
    if (!value) {
      setEditTarget(null);
      form.reset(defaults);
    }
  };

  const onSubmit = async (values: BatchForm) => {
    setSaving(true);
    setMessage("");

    const payload = {
      name: values.name.trim(),
      courseId: values.courseId,
      capacity: Number(values.capacity),
      schedule: values.schedule.trim(),
      academicYear: values.academicYear.trim(),
      startDate: values.startDate,
      status: values.status,
    };

    try {
      const response = await fetch(
        editTarget ? `/api/batches/${editTarget.id}` : "/api/batches",
        {
          method: editTarget ? "PATCH" : "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        setMessage(await getErrorText(response));
        return;
      }

      await refresh();
      setOpen(false);
      setEditTarget(null);
      form.reset(defaults);
    } catch {
      setMessage("Server se connection nahi ho raha. Backend run hai ya nahi, check karo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (batch: any) => {
    if (!confirm(`Delete ${batch.name}?`)) return;

    setDeletingId(batch.id);
    setMessage("");

    try {
      const response = await fetch(`/api/batches/${batch.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        setMessage(await getErrorText(response));
        return;
      }

      await refresh();
    } catch {
      setMessage("Delete nahi hua. Backend run hai ya nahi, check karo.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pageType === "academic"
              ? "Manage batches for Academic Courses."
              : pageType === "computer"
                ? "Manage batches for Computer Courses."
                : "Manage all batches."}
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Batch
        </Button>
      </div>

      {message ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={closeDialog}>
        <DialogContent
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Batch" : "Create New Batch"}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="courseId"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <SearchableCourseDropdown
                        value={field.value}
                        options={(courses ?? [])
                          .filter((course: any) => !pageType || (course.courseType ?? "academic") === pageType)
                          .map((course) => ({
                            id: course.id,
                            name: course.name,
                          }))}
                        onChange={(value) =>
                          form.setValue("courseId", value, { shouldValidate: true })
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity</FormLabel>
                      <FormControl><Input type="number" min="1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="academicYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Academic Year</FormLabel>
                      <FormControl><Input placeholder="2026-2027" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="schedule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Schedule</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {message ? <p className="text-sm text-red-600">{message}</p> : null}

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Saving..." : editTarget ? "Update Batch" : "Save Batch"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="py-12 text-center">Loading batches...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visibleBatches.map((batch) => (
            <Card key={batch.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{batch.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    <div className={`rounded px-2 py-0.5 text-xs font-medium ${
                      batch.status === "active"
                        ? "bg-green-100 text-green-700"
                        : batch.status === "upcoming"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-600"
                    }`}>
                      {(batch.status ?? "active").toUpperCase()}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Duplicate Batch"
                      onClick={() => duplicateBatch(batch)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>

                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit Batch" onClick={() => openEdit(batch)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(batch)}
                      disabled={deletingId === batch.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="mt-1 flex items-center gap-1 text-sm text-primary">
                  <BookMarked className="h-3 w-3" /> {batch.courseName}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" /><span>{batch.schedule}</span>
                </div>

                <div className="space-y-1">
                  <div className="mb-1 flex justify-between text-xs">
                    <span>Enrollment</span>
                    <span className="font-medium">{batch.enrolled ?? 0} / {batch.capacity}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.min(100, ((batch.enrolled ?? 0) / batch.capacity) * 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {visibleBatches.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              {pageType === "academic"
                ? "No academic batches created yet."
                : pageType === "computer"
                  ? "No computer batches created yet."
                  : "No batches created yet."}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
