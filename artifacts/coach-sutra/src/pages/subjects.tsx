import { useListSubjects, useCreateSubject, useUpdateSubject, useDeleteSubject, useListCourses, useListStaff, getListSubjectsQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, BookOpen, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";

const subjectSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  courseId: z.string().min(1, "Select a course"),
  teacherId: z.string().optional(),
});

type SubjectForm = z.infer<typeof subjectSchema>;

export default function Subjects() {
  const [search, setSearch] = useState("");
  const { data: subjects, isLoading } = useListSubjects();
  const { data: courses } = useListCourses();
  const { data: staff } = useListStaff();
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  const queryClient = useQueryClient();
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();

  const defaults: SubjectForm = { name: "", code: "", courseId: "", teacherId: "" };
  const form = useForm<SubjectForm>({ resolver: zodResolver(subjectSchema), defaultValues: defaults });

  const openAdd = () => { setEditTarget(null); form.reset(defaults); setOpen(true); };
  const openEdit = (s: any) => { setEditTarget(s); form.reset({ name: s.name, code: s.code, courseId: s.courseId, teacherId: s.teacherId ?? "" }); setOpen(true); };

  const onSubmit = (values: SubjectForm) => {
    const invalidate = () => { queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() }); setOpen(false); };
    if (editTarget) {
      updateSubject.mutate({ id: editTarget.id, data: values }, { onSuccess: invalidate });
    } else {
      createSubject.mutate({ data: values }, { onSuccess: invalidate });
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this subject?")) return;
    deleteSubject.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() }) });
  };

  const teachers = staff?.filter(s => s.role === "teacher") ?? [];
  const filtered = subjects?.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase())) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Subject</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editTarget ? "Edit Subject" : "Add New Subject"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Subject Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="code" render={({ field }) => (
                  <FormItem><FormLabel>Subject Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="courseId" render={({ field }) => (
                <FormItem><FormLabel>Course</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="teacherId" render={({ field }) => (
                <FormItem><FormLabel>Assigned Teacher (optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={createSubject.isPending || updateSubject.isPending}>
                {createSubject.isPending || updateSubject.isPending ? "Saving..." : editTarget ? "Update Subject" : "Save Subject"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 max-w-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search subjects..." value={search} onChange={e => setSearch(e.target.value)} className="h-9" />
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
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Loading subjects...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No subjects found</TableCell></TableRow>
                ) : filtered.map(subject => (
                  <TableRow key={subject.id}>
                    <TableCell><Badge variant="outline">{subject.code}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-muted-foreground" />{subject.name}</div>
                    </TableCell>
                    <TableCell>{subject.courseName}</TableCell>
                    <TableCell>{subject.teacherName ?? <span className="text-muted-foreground italic">Unassigned</span>}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(subject)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(subject.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
