import { useListBatches, useCreateBatch, useUpdateBatch, useDeleteBatch, useListCourses, getListBatchesQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, CalendarDays, BookMarked, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";

const batchSchema = z.object({
  name: z.string().min(2),
  courseId: z.string().min(1, "Select a course"),
  capacity: z.coerce.number().min(1),
  schedule: z.string().min(2),
  academicYear: z.string().min(4),
  startDate: z.string().min(1),
});

type BatchForm = z.infer<typeof batchSchema>;

export default function Batches() {
  const { data: batches, isLoading } = useListBatches();
  const { data: courses } = useListCourses();
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  const queryClient = useQueryClient();
  const createBatch = useCreateBatch();
  const updateBatch = useUpdateBatch();
  const deleteBatch = useDeleteBatch();

  const defaults: BatchForm = { name: "", courseId: "", capacity: 30, schedule: "Mon-Wed-Fri, 5PM-7PM", academicYear: "2024-2025", startDate: new Date().toISOString().split("T")[0] };

  const form = useForm<BatchForm>({ resolver: zodResolver(batchSchema), defaultValues: defaults });

  const openAdd = () => { setEditTarget(null); form.reset(defaults); setOpen(true); };
  const openEdit = (b: any) => { setEditTarget(b); form.reset({ name: b.name, courseId: b.courseId, capacity: b.capacity, schedule: b.schedule, academicYear: b.academicYear, startDate: b.startDate }); setOpen(true); };

  const onSubmit = (values: BatchForm) => {
    const invalidate = () => { queryClient.invalidateQueries({ queryKey: getListBatchesQueryKey() }); setOpen(false); };
    if (editTarget) {
      updateBatch.mutate({ id: editTarget.id, data: values }, { onSuccess: invalidate });
    } else {
      createBatch.mutate({ data: values }, { onSuccess: invalidate });
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this batch?")) return;
    deleteBatch.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListBatchesQueryKey() }) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Batches</h1>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Batch</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editTarget ? "Edit Batch" : "Create New Batch"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Batch Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="courseId" render={({ field }) => (
                <FormItem><FormLabel>Course</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="capacity" render={({ field }) => (
                  <FormItem><FormLabel>Capacity</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="academicYear" render={({ field }) => (
                  <FormItem><FormLabel>Academic Year</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="schedule" render={({ field }) => (
                <FormItem><FormLabel>Schedule</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={createBatch.isPending || updateBatch.isPending}>
                {createBatch.isPending || updateBatch.isPending ? "Saving..." : editTarget ? "Update Batch" : "Save Batch"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="text-center py-12">Loading batches...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches?.map(batch => (
            <Card key={batch.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">{batch.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    <div className={`px-2 py-0.5 rounded text-xs font-medium ${batch.status === 'active' ? 'bg-green-100 text-green-700' : batch.status === 'upcoming' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                      {batch.status?.toUpperCase()}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(batch)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(batch.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="text-sm text-primary flex items-center gap-1 mt-1">
                  <BookMarked className="h-3 w-3" /> {batch.courseName}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" /><span>{batch.schedule}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Enrollment</span>
                    <span className="font-medium">{batch.enrolled ?? 0} / {batch.capacity}</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div className="bg-primary h-full" style={{ width: `${Math.min(100, ((batch.enrolled ?? 0) / batch.capacity) * 100)}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {batches?.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground">No batches created yet.</div>}
        </div>
      )}
    </div>
  );
}
