import {
  useListHomework,
  useListBatches,
  useListCourses,
  useListSubjects,
  getListHomeworkQueryKey,
} from "@workspace/api-client-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Plus, BookMarked, CalendarDays, Link as LinkIcon, UserRound, Trash2, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const schema = z.object({
  title: z.string().trim().min(2, "Enter homework title"),
  description: z.string().trim().min(5, "Enter instructions"),
  batchId: z.string().min(1, "Select batch"),
  subjectId: z.string().min(1, "Select subject"),
  dueDate: z.string().min(1, "Select due date"),
  fileUrl: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;
type Option = { label: string; value: string; subLabel?: string };

function authHeaders() {
  const token = localStorage.getItem("coach_sutra_token") || "";
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
async function apiError(response: Response) {
  try {
    const data = await response.json();
    return data?.error || data?.message || "Homework save nahi hua.";
  } catch {
    return "Homework save nahi hua. Backend check karo.";
  }
}
function SearchDropdown({ label, value, options, placeholder, onChange, disabled = false }: {
  label: string; value: string; options: Option[]; placeholder: string; onChange: (value: string) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const selected = options.find((item) => item.value === value);
  const shown = options.filter((item) => `${item.label} ${item.subLabel ?? ""}`.toLowerCase().includes(term.toLowerCase()));
  return (
    <div className="relative space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <button type="button" disabled={disabled} onClick={() => { setTerm(""); setOpen(!open); }}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-left text-sm hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-50">
        <span className={selected ? "" : "text-muted-foreground"}>{selected?.label ?? placeholder}</span><span className="text-xs">▼</span>
      </button>
      {open && !disabled ? (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-2 shadow-lg">
          <Input autoFocus value={term} onChange={(e) => setTerm(e.target.value)} placeholder={`Search ${label.toLowerCase()}...`} className="mb-2 h-9" />
          <div className="max-h-56 overflow-y-auto">
            {shown.length ? shown.map((item) => (
              <button key={item.value} type="button" onMouseDown={(e) => { e.preventDefault(); onChange(item.value); setOpen(false); setTerm(""); }}
                className="flex w-full flex-col rounded px-3 py-2 text-left text-sm hover:bg-muted">
                <span className="font-medium">{item.label}</span>{item.subLabel ? <span className="text-xs text-muted-foreground">{item.subLabel}</span> : null}
              </button>
            )) : <div className="px-3 py-3 text-center text-sm text-muted-foreground">No matching option found</div>}
          </div>
        </div>
      ) : null}
    </div>
  );
}
function showDate(value?: string) {
  const date = new Date(`${String(value ?? "").slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "-" : format(date, "dd MMM yyyy");
}

export default function Homework() {
  const [location] = useLocation();
  const pageType = new URLSearchParams(location.split("?")[1] ?? window.location.search).get("type") === "computer" ? "computer" : "academic";
  const title = pageType === "computer" ? "Computer Homework" : "Academic Homework";

  const { data: homeworks, isLoading } = useListHomework();
  const { data: batches } = useListBatches();
  const { data: courses } = useListCourses();
  const { data: subjects } = useListSubjects();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [courseId, setCourseId] = useState("");
  const [filterCourse, setFilterCourse] = useState("all");
  const [filterBatch, setFilterBatch] = useState("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const defaults: FormValues = { title: "", description: "", batchId: "", subjectId: "", dueDate: format(new Date(), "yyyy-MM-dd"), fileUrl: "" };
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults });

  const courseList = useMemo(() => ((courses ?? []) as any[]).filter((c) => (c.courseType ?? "academic") === pageType), [courses, pageType]);
  const courseIds = useMemo(() => new Set(courseList.map((c) => String(c.id))), [courseList]);
  const batchList = useMemo(() => ((batches ?? []) as any[]).filter((b) => courseIds.has(String(b.courseId ?? ""))), [batches, courseIds]);
  const subjectList = useMemo(() => ((subjects ?? []) as any[]).filter((s) => courseIds.has(String(s.courseId ?? ""))), [subjects, courseIds]);

  const formBatches = batchList.filter((b) => !courseId || String(b.courseId) === String(courseId));
  const formSubjects = subjectList.filter((s) => String(s.courseId) === String(courseId));
  const selectedSubject = subjectList.find((s) => s.id === form.watch("subjectId"));
  const selectedTeacher = selectedSubject?.teacherName || "Subject select karne par assigned teacher show hoga";
  const viewBatches = batchList.filter((b) => filterCourse === "all" || String(b.courseId) === String(filterCourse));

  const visibleHomeworks = useMemo(() => {
    const term = search.toLowerCase();
    return ((homeworks ?? []) as any[]).filter((hw) => {
      const batch = batchList.find((b) => b.id === hw.batchId);
      const hwCourse = String(batch?.courseId ?? "");
      return courseIds.has(hwCourse) &&
        (filterCourse === "all" || hwCourse === String(filterCourse)) &&
        (filterBatch === "all" || String(hw.batchId) === String(filterBatch)) &&
        (`${hw.title} ${hw.description} ${hw.subjectName} ${hw.batchName}`).toLowerCase().includes(term);
    });
  }, [homeworks, batchList, courseIds, filterCourse, filterBatch, search]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: getListHomeworkQueryKey() });
  const startAdd = () => { setMessage(""); setEditTarget(null); setCourseId(""); form.reset(defaults); setOpen(true); };
  const startEdit = (hw: any) => {
    const batch = batchList.find((b) => b.id === hw.batchId);
    setMessage(""); setEditTarget(hw); setCourseId(String(batch?.courseId ?? ""));
    form.reset({ title: hw.title ?? "", description: hw.description ?? "", batchId: hw.batchId ?? "", subjectId: hw.subjectId ?? "", dueDate: String(hw.dueDate ?? "").slice(0,10), fileUrl: hw.fileUrl ?? "" });
    setOpen(true);
  };
  const submit = async (values: FormValues) => {
    setMessage("");
    const batch = batchList.find((b) => b.id === values.batchId);
    const subject = subjectList.find((s) => s.id === values.subjectId);
    if (!courseId || !batch || !subject) { setMessage("Course, Batch aur Subject select karo."); return; }
    if (String(batch.courseId) !== String(subject.courseId)) { setMessage("Selected Batch aur Subject same Course ke hone chahiye."); return; }
    setSaving(true);
    try {
      const response = await fetch(editTarget ? `/api/homework/${editTarget.id}` : "/api/homework", {
        method: editTarget ? "PATCH" : "POST", headers: authHeaders(),
        body: JSON.stringify({ ...values, title: values.title.trim(), description: values.description.trim(), fileUrl: values.fileUrl?.trim() ?? "" }),
      });
      if (!response.ok) { setMessage(await apiError(response)); return; }
      await refresh(); setOpen(false); form.reset(defaults); setEditTarget(null);
    } catch { setMessage("Homework save nahi hua. Backend run hai ya nahi check karo."); }
    finally { setSaving(false); }
  };
  const deleteHomework = async (hw: any) => {
    if (!window.confirm(`Do you want to delete the homework "${hw.title}"?`)) return;
    setDeletingId(hw.id); setMessage("");
    try {
      const response = await fetch(`/api/homework/${hw.id}`, { method: "DELETE", headers: authHeaders() });
      if (!response.ok) { setMessage(await apiError(response)); return; }
      await refresh();
    } catch { setMessage("Homework delete nahi hua. Backend check karo."); }
    finally { setDeletingId(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{pageType === "computer" ? "Computer Courses ke batch ke liye homework publish karo." : "Academic Courses ke batch ke liye homework publish karo."}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={startAdd}><Plus className="mr-2 h-4 w-4" />Assign Homework</Button></DialogTrigger>
          <DialogContent className="sm:max-w-[580px]"><DialogHeader><DialogTitle>{editTarget ? "Update Homework" : `Assign ${pageType === "computer" ? "Computer" : "Academic"} Homework`}</DialogTitle></DialogHeader>
            <Form {...form}><form onSubmit={form.handleSubmit(submit)} className="space-y-4">
              <SearchDropdown label="Course" value={courseId} placeholder="Select course first" options={courseList.map((c) => ({ label: c.name, value: c.id, subLabel: pageType === "computer" ? "Computer Course" : "Academic Course" }))}
                onChange={(v) => { setCourseId(v); form.setValue("batchId", ""); form.setValue("subjectId", ""); }} />
              <div className="grid gap-4 md:grid-cols-2">
                <SearchDropdown label="Select Batch" value={form.watch("batchId")} placeholder={courseId ? "Search and select batch" : "Select Course first"} disabled={!courseId}
                  options={formBatches.map((b) => ({ label: b.name, value: b.id, subLabel: "Batch" }))} onChange={(v) => form.setValue("batchId", v, { shouldValidate: true })} />
                <SearchDropdown label="Subject" value={form.watch("subjectId")} placeholder={courseId ? "Search and select subject" : "Select Course first"} disabled={!courseId}
                  options={formSubjects.map((s) => ({ label: s.name, value: s.id, subLabel: s.code ? `Code: ${s.code}` : "Subject" }))} onChange={(v) => form.setValue("subjectId", v, { shouldValidate: true })} />
              </div>
              <div className="rounded-md border bg-muted/30 px-3 py-2.5"><div className="flex items-center gap-2 text-sm font-medium"><UserRound className="h-4 w-4" />Assigned Teacher</div><div className="mt-1 text-sm text-muted-foreground">{selectedTeacher}</div></div>
              <FormField control={form.control} name="title" render={({field}) => <FormItem><FormLabel>Homework Title</FormLabel><FormControl><Input placeholder="Example: Chapter 1 Exercise" {...field}/></FormControl><FormMessage/></FormItem>} />
              <FormField control={form.control} name="description" render={({field}) => <FormItem><FormLabel>Instructions</FormLabel><FormControl><Textarea rows={4} placeholder="Write complete homework instructions..." {...field}/></FormControl><FormMessage/></FormItem>} />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField control={form.control} name="dueDate" render={({field}) => <FormItem><FormLabel>Due Date</FormLabel><FormControl><Input type="date" {...field}/></FormControl><FormMessage/></FormItem>} />
                <FormField control={form.control} name="fileUrl" render={({field}) => <FormItem><FormLabel>Reference Link (Optional)</FormLabel><FormControl><Input placeholder="Google Drive / YouTube link" {...field}/></FormControl><FormMessage/></FormItem>} />
              </div>
              {message ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</div> : null}
              <Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving..." : editTarget ? "Update Homework" : "Publish Homework"}</Button>
            </form></Form>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardHeader className="border-b bg-slate-50 dark:bg-slate-900"><div className="grid gap-4 md:grid-cols-3">
        <SearchDropdown label={`Filter ${pageType === "computer" ? "Computer" : "Academic"} Course`} value={filterCourse} placeholder="Search Course"
          options={[{label:`All ${pageType === "computer" ? "Computer" : "Academic"} Courses`,value:"all"}, ...courseList.map((c) => ({label:c.name,value:c.id}))]}
          onChange={(v) => {setFilterCourse(v);setFilterBatch("all");}} />
        <SearchDropdown label="Filter Batch" value={filterBatch} placeholder="Search Batch"
          options={[{label:"All Batches",value:"all"}, ...viewBatches.map((b) => ({label:b.name,value:b.id,subLabel:courseList.find((c)=>c.id===b.courseId)?.name??""}))]} onChange={setFilterBatch} />
        <div className="space-y-1.5"><label className="text-sm font-medium">Search Homework</label><div className="flex items-center gap-2"><Search className="h-4 w-4 text-muted-foreground"/><Input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Title, batch or subject..."/></div></div>
      </div></CardHeader></Card>
      {message && !open ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div> : null}
      {isLoading ? <div className="py-12 text-center">Loading homeworks...</div> : <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visibleHomeworks.map((hw:any) => <Card key={hw.id}><CardHeader className="border-b bg-slate-50 pb-3 dark:bg-slate-900"><div className="flex items-start justify-between gap-2"><CardTitle className="flex text-lg"><BookMarked className="mr-2 mt-0.5 h-5 w-5 shrink-0 text-primary"/><span className="line-clamp-2">{hw.title}</span></CardTitle><div className="flex shrink-0 gap-1"><Button variant="ghost" size="icon" title="Update Homework" onClick={()=>startEdit(hw)}><Pencil className="h-4 w-4"/></Button><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="Delete Homework" onClick={()=>deleteHomework(hw)} disabled={deletingId===hw.id}>{deletingId===hw.id?<span className="text-xs">...</span>:<Trash2 className="h-4 w-4"/>}</Button></div></div></CardHeader><CardContent className="space-y-4 pt-4"><p className="line-clamp-4 text-sm text-muted-foreground">{hw.description}</p><div className="grid grid-cols-2 gap-3 text-sm"><div><span className="block text-xs text-muted-foreground">Batch</span><span className="font-medium">{hw.batchName||"-"}</span></div><div><span className="block text-xs text-muted-foreground">Subject</span><span className="font-medium">{hw.subjectName||"-"}</span></div><div><span className="block text-xs text-muted-foreground">Teacher</span><span className="font-medium">{hw.teacherName||"Not assigned"}</span></div><div><span className="block text-xs text-muted-foreground">Due Date</span><span className="flex items-center gap-1 font-medium"><CalendarDays className="h-3.5 w-3.5"/>{showDate(hw.dueDate)}</span></div></div>{hw.fileUrl?<Button variant="outline" size="sm" className="w-full" asChild><a href={hw.fileUrl} target="_blank" rel="noreferrer"><LinkIcon className="mr-2 h-4 w-4"/>Open Reference Link</a></Button>:null}</CardContent></Card>)}
        {!visibleHomeworks.length ? <div className="col-span-full py-12 text-center text-muted-foreground">No homework found.</div> : null}
      </div>}
    </div>
  );
}
