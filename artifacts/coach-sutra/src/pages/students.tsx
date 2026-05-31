import {
  useListStudents, useCreateStudent, useUpdateStudent, useDeleteStudent,
  useListBatches, useListCourses, getListStudentsQueryKey
} from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";

const studentSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  courseId: z.string().min(1, "Select a course"),
  batchId: z.string().min(1, "Select a batch"),
  academicYear: z.string().min(4),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
});

type StudentForm = z.infer<typeof studentSchema>;

export default function Students() {
  const [search, setSearch] = useState("");
  const { data: students, isLoading } = useListStudents();
  const { data: courses } = useListCourses();
  const { data: batches } = useListBatches();
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  const queryClient = useQueryClient();
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();

  const defaults: StudentForm = { name: "", email: "", phone: "", courseId: "", batchId: "", academicYear: "2024-2025", parentName: "", parentPhone: "", gender: undefined };

  const form = useForm<StudentForm>({ resolver: zodResolver(studentSchema), defaultValues: defaults });

  const openAdd = () => { setEditTarget(null); form.reset(defaults); setOpen(true); };
  const openEdit = (s: any) => {
    setEditTarget(s);
    form.reset({ name: s.name, email: s.email, phone: s.phone, courseId: s.courseId, batchId: s.batchId, academicYear: s.academicYear, parentName: s.parentName ?? "", parentPhone: s.parentPhone ?? "", gender: s.gender ?? undefined });
    setOpen(true);
  };

  const onSubmit = (values: StudentForm) => {
    const invalidate = () => { queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() }); setOpen(false); };
    if (editTarget) {
      updateStudent.mutate({ id: editTarget.id, data: values }, { onSuccess: invalidate });
    } else {
      createStudent.mutate({ data: values }, { onSuccess: invalidate });
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this student?")) return;
    deleteStudent.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() }) });
  };

  const selectedCourseId = form.watch("courseId");
  const filteredBatches = batches?.filter(b => !selectedCourseId || b.courseId === selectedCourseId) ?? [];
  const filtered = students?.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()) || (s.enrollmentNo ?? "").includes(search)) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Students</h1>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Student</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader><DialogTitle>{editTarget ? "Edit Student" : "Add New Student"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="gender" render={({ field }) => (
                  <FormItem><FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="courseId" render={({ field }) => (
                  <FormItem><FormLabel>Course</FormLabel>
                    <Select onValueChange={(v) => { field.onChange(v); form.setValue("batchId", ""); }} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="batchId" render={({ field }) => (
                  <FormItem><FormLabel>Batch</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {filteredBatches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="academicYear" render={({ field }) => (
                <FormItem><FormLabel>Academic Year</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="parentName" render={({ field }) => (
                  <FormItem><FormLabel>Parent Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="parentPhone" render={({ field }) => (
                  <FormItem><FormLabel>Parent Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <Button type="submit" className="w-full" disabled={createStudent.isPending || updateStudent.isPending}>
                {createStudent.isPending || updateStudent.isPending ? "Saving..." : editTarget ? "Update Student" : "Add Student"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 max-w-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} className="h-9" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Enrollment No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading students...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No students found</TableCell></TableRow>
                ) : filtered.map(student => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.enrollmentNo}</TableCell>
                    <TableCell>
                      <div>{student.name}</div>
                      <div className="text-xs text-muted-foreground">{student.email}</div>
                    </TableCell>
                    <TableCell>{student.courseName}</TableCell>
                    <TableCell>{student.batchName}</TableCell>
                    <TableCell>
                      <Badge variant={student.status === "active" ? "default" : "secondary"}>{student.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(student)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(student.id)}><Trash2 className="h-4 w-4" /></Button>
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
