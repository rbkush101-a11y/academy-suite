import { useListCourses, getListCoursesQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, BookOpen, Clock, IndianRupee, Pencil, Trash2, Copy } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const courseSchema = z.object({
  name: z.string().trim().min(2, "Enter course name"),
  description: z.string().trim().min(5, "Enter at least 5 characters"),
  duration: z.string().trim().min(2, "Enter duration"),
  fees: z.coerce.number().min(0, "Fees cannot be negative"),
  courseType: z.enum(["academic", "computer"]),
  status: z.enum(["active", "inactive"]),
});

type CourseForm = z.infer<typeof courseSchema>;

function authHeaders() {
  const token = localStorage.getItem("coach_sutra_token") || "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function errorText(response: Response) {
  try {
    const result = await response.json();
    return result?.error || result?.message || "Please check details and try again.";
  } catch {
    return "Please check details and try again.";
  }
}

export default function Courses() {
  const [location] = useLocation();
  const categoryFromUrl = new URLSearchParams(location.split("?")[1] ?? window.location.search).get("type");
  const pageType = categoryFromUrl === "academic" || categoryFromUrl === "computer" ? categoryFromUrl : null;
  const pageTitle = pageType === "academic" ? "Academic Courses" : pageType === "computer" ? "Computer Courses" : "Courses";

  const { data: courseList, isLoading } = useListCourses();
  const courses = (courseList ?? []) as any[];
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const queryClient = useQueryClient();

  const defaults: CourseForm = {
    name: "",
    description: "",
    duration: "6 Months",
    fees: 0,
    courseType: pageType ?? "academic",
    status: "active",
  };

  const form = useForm<CourseForm>({
    resolver: zodResolver(courseSchema),
    defaultValues: defaults,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
  };

  const openAdd = () => {
    setMessage("");
    setEditTarget(null);
    form.reset({ ...defaults, courseType: pageType ?? "academic" });
    setOpen(true);
  };

  const openEdit = (course: any) => {
    setMessage("");
    setEditTarget(course);
    form.reset({
      name: course.name ?? "",
      description: course.description ?? "",
      duration: course.duration ?? "",
      fees: Number(course.fees ?? 0),
      courseType: course.courseType ?? "academic",
      status: course.status ?? "active",
    });
    setOpen(true);
  };

  const duplicateCourse = (course: any) => {
    setMessage("");
    setEditTarget(null);
    form.reset({
      name: `${course.name ?? ""} - Copy`,
      description: course.description ?? "",
      duration: course.duration ?? "",
      fees: Number(course.fees ?? 0),
      courseType: course.courseType ?? pageType ?? "academic",
      status: course.status ?? "active",
    });
    setOpen(true);
  };

  const onSubmit = async (values: CourseForm) => {
    setSaving(true);
    setMessage("");

    const data = {
      name: values.name.trim(),
      description: values.description.trim(),
      duration: values.duration.trim(),
      fees: Number(values.fees),
      courseType: values.courseType,
      status: values.status,
    };

    try {
      const response = await fetch(
        editTarget ? `/api/courses/${editTarget.id}` : "/api/courses",
        {
          method: editTarget ? "PATCH" : "POST",
          headers: authHeaders(),
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        setMessage(await errorText(response));
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

  const handleDelete = async (course: any) => {
    if (!confirm(`Delete ${course.name}?`)) return;

    setDeletingId(course.id);
    setMessage("");

    try {
      const response = await fetch(`/api/courses/${course.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!response.ok) {
        setMessage(await errorText(response));
        return;
      }

      await refresh();
    } catch {
      setMessage("Delete nahi hua. Backend check karo.");
    } finally {
      setDeletingId(null);
    }
  };

  const visibleCourses = courses.filter((course) => {
    if (!pageType) return true;
    return (course.courseType ?? "academic") === pageType;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pageType === "computer"
              ? "Computer courses added here will automatically appear in Computer Enquiry."
              : pageType === "academic"
                ? "Manage academic courses."
                : "Manage all academic and computer courses."}
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Course
        </Button>
      </div>

      {message ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px]"
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Course" : "Add New Course"}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {!pageType ? (
                <FormField
                  control={form.control}
                  name="courseType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select course type" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="academic">Academic Course</SelectItem>
                          <SelectItem value="computer">Computer Course</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">
                  Course Type: {pageType === "academic" ? "Academic Course" : "Computer Course"}
                </div>
              )}

              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Course Name</FormLabel><FormControl><Input placeholder="Enter course name" {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Enter course details" {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="duration" render={({ field }) => (
                  <FormItem><FormLabel>Duration</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="fees" render={({ field }) => (
                  <FormItem><FormLabel>Fees (₹)</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {message ? <p className="text-sm text-red-600">{message}</p> : null}

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Saving..." : editTarget ? "Update Course" : "Save Course"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="py-12 text-center">Loading courses...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visibleCourses.map((course) => (
            <Card key={course.id} className="overflow-hidden transition-colors hover:border-primary/50">
              <CardHeader className="border-b bg-slate-50 pb-4 dark:bg-slate-900">
                <div className="flex items-start justify-between">
                  <CardTitle className="flex min-w-0 flex-1 items-center gap-2">
                    <BookOpen className="h-5 w-5 shrink-0 text-primary" />
                    <span className="truncate">{course.name}</span>
                  </CardTitle>
                  <div className="ml-2 flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Duplicate Course"
                      onClick={() => duplicateCourse(course)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit Course" onClick={() => openEdit(course)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Delete Course" onClick={() => handleDelete(course)} disabled={deletingId === course.id}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <CardDescription className="mt-2 line-clamp-2">{course.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 pt-4">
                <Badge variant="outline" className="w-full justify-center">
                  {(course.courseType ?? "academic") === "computer" ? "Computer Course" : "Academic Course"}
                </Badge>
                <div className="flex items-center justify-between text-sm"><div className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" />Duration</div><div className="font-medium">{course.duration}</div></div>
                <div className="flex items-center justify-between text-sm"><div className="flex items-center gap-2 text-muted-foreground"><IndianRupee className="h-4 w-4" />Fees</div><div className="font-mono text-base font-medium text-primary">₹{Number(course.fees ?? 0).toLocaleString()}</div></div>
                <Badge variant={course.status === "active" ? "default" : "secondary"} className="w-full justify-center">{course.status}</Badge>
              </CardContent>
            </Card>
          ))}

          {visibleCourses.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              {pageType === "computer" ? "No computer courses created yet." : pageType === "academic" ? "No academic courses created yet." : "No courses created yet."}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
