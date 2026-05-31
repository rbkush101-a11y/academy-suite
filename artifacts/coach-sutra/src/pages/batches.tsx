import { useListBatches, useCreateBatch } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users, CalendarDays, BookMarked } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQueryClient } from "@tanstack/react-query";
import { getListBatchesQueryKey } from "@workspace/api-client-react";

const batchSchema = z.object({
  name: z.string().min(2),
  courseId: z.string().min(1),
  capacity: z.coerce.number().min(1),
  schedule: z.string().min(2),
  academicYear: z.string().min(4),
  startDate: z.string(),
});

export default function Batches() {
  const { data: batches, isLoading } = useListBatches();
  const [open, setOpen] = useState(false);

  const queryClient = useQueryClient();
  const createBatch = useCreateBatch();

  const form = useForm<z.infer<typeof batchSchema>>({
    resolver: zodResolver(batchSchema),
    defaultValues: { name: "", courseId: "", capacity: 30, schedule: "Mon-Wed-Fri, 5PM-7PM", academicYear: "2024-2025", startDate: new Date().toISOString().split("T")[0] },
  });

  const onSubmit = (values: z.infer<typeof batchSchema>) => {
    createBatch.mutate({ data: values }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListBatchesQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Batches</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Batch</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Batch</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Batch Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="courseId" render={({ field }) => (
                  <FormItem><FormLabel>Course ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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
                <Button type="submit" className="w-full" disabled={createBatch.isPending}>
                  {createBatch.isPending ? "Creating..." : "Save Batch"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading batches...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches?.map(batch => (
            <Card key={batch.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle>{batch.name}</CardTitle>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    batch.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    batch.status === 'upcoming' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {batch.status.toUpperCase()}
                  </div>
                </div>
                <div className="text-sm text-primary flex items-center gap-1 mt-1">
                  <BookMarked className="h-3 w-3" /> {batch.courseName}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  <span>{batch.schedule}</span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Enrollment</span>
                    <span className="font-medium">{batch.enrolled || 0} / {batch.capacity}</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full" 
                      style={{ width: `${Math.min(100, ((batch.enrolled || 0) / batch.capacity) * 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {batches?.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No batches created yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}