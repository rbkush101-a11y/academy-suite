import { useListCourses, getListCoursesQueryKey } from "@workspace/api-client-react";
import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Copy, Search, ChevronsUpDown, Check, BookOpen } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const courseSchema = z.object({
  name: z.string().trim().min(2, "Enter course name"),
  description: z.string().trim().min(5, "Enter at least 5 characters"),
  duration: z.string().trim().min(2, "Enter duration"),
  fees: z.coerce.number().min(0, "Fees cannot be negative"),
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
  const { data: courseList, isLoading: isLoadingCourses } = useListCourses();
  const courses = (courseList ?? []) as any[];
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
  const [courseSearchInput, setCourseSearchInput] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: allBatches = [] } = useQuery<any[]>({
    queryKey: ["/api/batches"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/batches", { headers: authHeaders() });
        if (!response.ok) return [];
        const res = await response.json();
        return Array.isArray(res) ? res : (res.data ?? []);
      } catch {
        return [];
      }
    }
  });

  const { data: allSubjects = [] } = useQuery<any[]>({
    queryKey: ["/api/subjects"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/subjects", { headers: authHeaders() });
        if (!response.ok) return [];
        const res = await response.json();
        return Array.isArray(res) ? res : (res.data ?? []);
      } catch {
        return [];
      }
    }
  });

  const defaults: CourseForm = {
    name: "",
    description: "",
    duration: "12 Months",
    fees: 0,
    status: "active",
  };

  const form = useForm<CourseForm>({
    resolver: zodResolver(courseSchema),
    defaultValues: defaults,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
    await queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
  };

  const openAdd = () => {
    setMessage("");
    setEditTarget(null);
    form.reset(defaults);
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
      setMessage("Server error. Check backend.");
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
      setMessage("Failed to delete. Check backend.");
    } finally {
      setDeletingId(null);
    }
  };

  const searchableDropdownCourses = courses.filter((c) =>
    c.name?.toLowerCase().includes(courseSearchInput.toLowerCase())
  );

  const selectedCourseName = selectedCourseId === "all"
    ? "All Courses"
    : courses.find(c => c.id === selectedCourseId)?.name ?? "Select Course...";

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || course.status === statusFilter;
    const matchesSelectedCourse = selectedCourseId === "all" || course.id === selectedCourseId;

    return matchesSearch && matchesStatus && matchesSelectedCourse;
  });

  const extractNumber = (str: string) => {
    const match = str?.match(/\d+/);
    return match ? match[0] : str;
  };

  return (
    <div className="min-h-screen bg-[#eef1f6] p-4 md:p-8 space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1a56db]">Course / Program Master</h1>
          <p className="mt-1 text-[13px] md:text-sm text-slate-500">
            Top-level hierarchy: Course → Subject → Topic. Batches are linked to a course.
          </p>
        </div>
        <button 
          onClick={openAdd}
          className="bg-[#1a56db] hover:bg-[#1e40af] text-white px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors shadow-md shadow-blue-500/20"
        >
          <Plus className="h-4 w-4" /> New Course
        </button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-slate-200 focus-visible:ring-[#1a56db]/20 focus-visible:border-[#1a56db] rounded-lg h-10"
          />
        </div>

        <div className="relative w-full md:w-[250px]" ref={dropdownRef}>
          <Button
            variant="outline"
            className="w-full justify-between overflow-hidden text-ellipsis whitespace-nowrap bg-white px-3 font-normal border-slate-200 rounded-lg h-10 hover:bg-slate-50"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <span className="truncate">{selectedCourseName}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>

          {dropdownOpen && (
            <div className="absolute left-0 right-0 z-50 mt-1 max-h-[300px] overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg shadow-slate-200/50">
              <div className="flex items-center border-b px-2 pb-1 pt-1">
                <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                <input
                  placeholder="Search course..."
                  className="flex h-8 w-full bg-transparent text-sm outline-none"
                  value={courseSearchInput}
                  onChange={(e) => setCourseSearchInput(e.target.value)}
                />
              </div>
              <div className="mt-1 max-h-[200px] overflow-y-auto">
                <button
                  type="button"
                  className="relative flex w-full items-center rounded-md px-2 py-1.5 text-sm hover:bg-slate-100"
                  onClick={() => { setSelectedCourseId("all"); setDropdownOpen(false); }}
                >
                  <Check className={`mr-2 h-4 w-4 ${selectedCourseId === "all" ? "opacity-100 text-[#1a56db]" : "opacity-0"}`} />
                  All Courses
                </button>
                {searchableDropdownCourses.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="relative flex w-full items-center rounded-md px-2 py-1.5 text-sm hover:bg-slate-100"
                    onClick={() => { setSelectedCourseId(c.id); setDropdownOpen(false); setCourseSearchInput(""); }}
                  >
                    <Check className={`mr-2 h-4 w-4 ${selectedCourseId === c.id ? "opacity-100 text-[#1a56db]" : "opacity-0"}`} />
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-full md:w-[180px]">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-white border-slate-200 rounded-lg h-10 focus:ring-[#1a56db]/20 focus:border-[#1a56db]">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent className="rounded-lg border-slate-200 shadow-lg shadow-slate-200/50">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          {message}
        </div>
      )}

      {/* Compact Dialog / Form matching your image */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[440px] p-0 gap-0 sm:rounded-[20px] border border-slate-200 shadow-xl overflow-hidden bg-white">
          
          <DialogHeader className="flex flex-row items-center gap-3 px-5 pt-5 pb-3 space-y-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#eef2fc]">
              <BookOpen className="h-5 w-5 text-[#1a56db]" />
            </div>
            <DialogTitle className="text-[17px] font-bold text-[#1e293b]">
              {editTarget ? "Edit Course" : "Add New Course"}
            </DialogTitle>
          </DialogHeader>

          <div className="px-5 pb-5">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[13px] font-semibold text-slate-700">Course Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="E.g. 10th CBSE" 
                        className="h-[42px] rounded-[10px] border-slate-200 bg-white px-3 text-sm placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#1a56db]/20 focus-visible:border-[#1a56db] shadow-sm" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[13px] font-semibold text-slate-700">Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter course details or short code..." 
                        className="min-h-[80px] rounded-[10px] border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#1a56db]/20 focus-visible:border-[#1a56db] resize-none shadow-sm" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="duration" render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[13px] font-semibold text-slate-700">Duration</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="12 Months" 
                          className="h-[42px] rounded-[10px] border-slate-200 bg-white px-3 text-sm placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#1a56db]/20 focus-visible:border-[#1a56db] shadow-sm" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="fees" render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[13px] font-semibold text-slate-700">Fees (₹)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" min="0" 
                          className="h-[42px] rounded-[10px] border-slate-200 bg-white px-3 text-sm placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#1a56db]/20 focus-visible:border-[#1a56db] shadow-sm" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[13px] font-semibold text-slate-700">Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-[42px] rounded-[10px] border-slate-200 bg-white text-sm focus:ring-2 focus:ring-[#1a56db]/20 focus:border-[#1a56db] shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl border-slate-200">
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <div className="pt-2">
                  <Button 
                    type="submit" 
                    className="w-full h-[46px] rounded-[10px] bg-[#1a56db] hover:bg-[#1e40af] text-[15px] font-medium shadow-none" 
                    disabled={saving}
                  >
                    {saving ? "Saving..." : editTarget ? "Update Course" : "Save Course"}
                  </Button>
                </div>

              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Courses Cards Grid */}
      {isLoadingCourses ? (
        <div className="py-12 text-center text-slate-500 font-medium">Loading courses...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const matchedBatches = allBatches.filter((b) => b.courseId === course.id || b.course?.id === course.id);
            const batchCount = course._count?.batches ?? course.batches?.length ?? matchedBatches.length ?? 0;

            const matchedSubjects = allSubjects.filter((s) => s.courseId === course.id || s.course?.id === course.id);
            const subjectCount = course._count?.subjects ?? course.subjects?.length ?? matchedSubjects.length ?? 0;

            const displayDuration = extractNumber(course.duration || "0");

            return (
              <div key={course.id} className="bg-white rounded-[20px] p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col gap-4 transition-all hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.1)]">
                
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[17px] font-extrabold text-slate-900 leading-tight">{course.name}</h3>
                    <p className="mt-1.5 text-[13px] text-slate-500 whitespace-pre-wrap break-words font-medium">
                      {course.description || "No description"}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full capitalize shrink-0 ${
                    course.status === 'active' ? 'bg-[#1b8c56] text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {course.status}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2 pb-1 items-end">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-3xl font-black text-[#2563eb] tracking-tight">{subjectCount}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">SUBJECTS</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-3xl font-black text-[#16a34a] tracking-tight">{batchCount}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">BATCHES</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-3xl font-black text-[#eab308] tracking-tight">{displayDuration}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">DURATION</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xl font-extrabold text-slate-700 tracking-tight">₹{Number(course.fees ?? 0).toLocaleString()}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">FEES</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-auto pt-3">
                  <button
                    onClick={() => duplicateCourse(course)}
                    title="Duplicate Course"
                    className="flex flex-1 items-center justify-center gap-1.5 py-2 px-2 rounded-xl border-2 border-slate-100 text-slate-600 hover:bg-slate-50 hover:border-slate-200 transition-all text-sm font-bold"
                  >
                    <Copy className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Copy</span>
                  </button>
                  <button
                    onClick={() => openEdit(course)}
                    className="flex-[1.5] flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border-2 border-[#2563eb]/20 text-[#2563eb] hover:bg-blue-50 transition-all text-sm font-bold"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(course)}
                    disabled={deletingId === course.id}
                    className="flex-[1.5] flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border-2 border-[#ef4444]/20 text-[#ef4444] hover:bg-red-50 transition-all text-sm font-bold disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>

              </div>
            );
          })}

          {filteredCourses.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 font-medium">
              No courses found matching your criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
}