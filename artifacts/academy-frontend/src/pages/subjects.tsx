import { useListSubjects, useListCourses, useListStaff, getListSubjectsQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, BookOpen, Pencil, Trash2, Copy } from "lucide-react";
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

type DropdownOption = {
  label: string;
  value: string;
};

function SearchableDropdown({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: DropdownOption[];
  placeholder: string;
  onChange: (value: string) => void;
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

    if (event.key === "Enter") {
      if (open && filteredOptions.length > 0) {
        event.preventDefault();
        selectOption(filteredOptions[activeIndex >= 0 ? activeIndex : 0]);
      }
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
      <label className="text-sm font-medium">{label}</label>

      <Input
        value={searchText}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          setActiveIndex(-1);
        }}
        onChange={(event) => {
          setSearchText(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          window.setTimeout(() => {
            setSearchText(selectedLabel);
            setActiveIndex(-1);
            setOpen(false);
          }, 150);
        }}
      />

      <button
        type="button"
        aria-label={`Open ${label} options`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          setSearchText(selectedLabel);
          setOpen((old) => !old);
          setActiveIndex(-1);
        }}
        className="absolute right-2 top-[31px] flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-muted"
      >
        <span className="text-xs">▼</span>
      </button>

      {open ? (
        <div className="absolute z-50 max-h-56 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectOption(option);
                }}
                className={`flex w-full rounded-sm px-3 py-2 text-left text-sm ${
                  index === activeIndex ? "bg-muted font-medium" : "hover:bg-muted"
                }`}
              >
                {option.label}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No matching option found. Please choose from the available list.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function Subjects() {
  const [location] = useLocation();
  const typeFromUrl = new URLSearchParams(location.split("?")[1] ?? window.location.search).get("type");
  const pageType = typeFromUrl === "academic" || typeFromUrl === "computer" ? typeFromUrl : null;
  const pageTitle =
    pageType === "academic"
      ? "Academic Subjects"
      : pageType === "computer"
        ? "Computer Subjects"
        : "Subjects";

  const [search, setSearch] = useState("");
  const { data: subjects, isLoading } = useListSubjects();
  const { data: courses } = useListCourses();
  const { data: staff } = useListStaff();
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

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

  const duplicateSubject = (subject: any) => {
    setMessage("");
    setEditTarget(null);
    form.reset({
      name: `${subject.name ?? ""} - Copy`,
      code: `${subject.code ?? ""}-COPY`,
      courseId: subject.courseId ?? "",
      teacherId: subject.teacherId ?? "",
    });
    setOpen(true);
  };

  const refreshSubjects = async () => {
    await queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
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
      setMessage("Subject save nahi hua. Backend run hai ya nahi check karo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (subject: any) => {
    const confirmed = window.confirm(`Do you want to delete the subject ${subject.name}?`);
    if (!confirmed) return;

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
      setMessage("Subject delete nahi hua. Backend check karo.");
    } finally {
      setDeletingId(null);
    }
  };

  const teachers = staff?.filter((member) => member.role === "teacher") ?? [];
  const filtered = subjects?.filter((subject: any) => {
    const subjectCourse = (courses ?? []).find((course: any) => course.id === subject.courseId) as any;
    const courseType = subjectCourse?.courseType ?? "academic";

    if (pageType && courseType !== pageType) return false;

    const term = search.toLowerCase();
    return (
      subject.name.toLowerCase().includes(term) ||
      subject.code.toLowerCase().includes(term) ||
      (subject.courseName ?? subjectCourse?.name ?? "").toLowerCase().includes(term)
    );
  }) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pageType === "academic"
              ? "Manage subjects for Academic Courses."
              : pageType === "computer"
                ? "Manage subjects for Computer Courses."
                : "Manage all subjects."}
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Subject
        </Button>
      </div>

      {message && !open ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Subject" : "Add New Subject"}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject Code</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
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
                onChange={(value) =>
                  form.setValue("courseId", value, { shouldValidate: true })
                }
              />

              <SearchableDropdown
                label="Assigned Teacher (optional)"
                value={form.watch("teacherId") || ""}
                placeholder="Search and select teacher"
                options={teachers.map((teacher) => ({
                  label: teacher.name,
                  value: teacher.id,
                }))}
                onChange={(value) =>
                  form.setValue("teacherId", value, { shouldValidate: true })
                }
              />

              {message ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {message}
                </div>
              ) : null}

              <Button
                type="submit"
                className="w-full"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editTarget
                    ? "Update Subject"
                    : "Save Subject"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex max-w-sm items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search subjects..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-9"
            />
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Subject Name</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center">Loading subjects...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">{pageType === "academic"
                      ? "No academic subjects found"
                      : pageType === "computer"
                        ? "No computer subjects found"
                        : "No subjects found"}</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell><Badge variant="outline">{subject.code}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          {subject.name}
                        </div>
                      </TableCell>
                      <TableCell>{subject.courseName}</TableCell>
                      <TableCell>
                        {subject.teacherName ?? <span className="italic text-muted-foreground">Unassigned</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Duplicate Subject"
                            onClick={() => duplicateSubject(subject)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Edit Subject" onClick={() => openEdit(subject)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(subject)}
                            disabled={deletingId === subject.id}
                          >
                            {deletingId === subject.id ? <span className="text-xs">...</span> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
