import { useListExams, useCreateExam, useListBatches } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FileText, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { getListExamsQueryKey } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const examSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["unit-test", "mid-term", "final", "mock"]),
  batchId: z.string().min(1),
  subjectId: z.string().min(1),
  date: z.string(),
  totalMarks: z.coerce.number().min(1),
  passingMarks: z.coerce.number().min(1),
});

export default function Exams() {
  const { data: exams, isLoading } = useListExams();
  const { data: batches } = useListBatches();
  const [open, setOpen] = useState(false);

  const queryClient = useQueryClient();
  const createExam = useCreateExam();

  const form = useForm<z.infer<typeof examSchema>>({
    resolver: zodResolver(examSchema),
    defaultValues: { name: "", type: "unit-test", batchId: "", subjectId: "", date: format(new Date(), 'yyyy-MM-dd'), totalMarks: 100, passingMarks: 35 },
  });

  const onSubmit = (values: z.infer<typeof examSchema>) => {
    createExam.mutate({ data: values }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListExamsQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Exams</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Schedule Exam</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule New Exam</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Exam Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="unit-test">Unit Test</SelectItem>
                          <SelectItem value="mid-term">Mid Term</SelectItem>
                          <SelectItem value="final">Final</SelectItem>
                          <SelectItem value="mock">Mock Test</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="batchId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Batch</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {batches?.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="subjectId" render={({ field }) => (
                    <FormItem><FormLabel>Subject ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="totalMarks" render={({ field }) => (
                    <FormItem><FormLabel>Total Marks</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="passingMarks" render={({ field }) => (
                    <FormItem><FormLabel>Passing Marks</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <Button type="submit" className="w-full" disabled={createExam.isPending}>
                  {createExam.isPending ? "Scheduling..." : "Schedule Exam"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading exams...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams?.map(exam => (
            <Card key={exam.id}>
              <CardHeader className="pb-3 bg-slate-50 dark:bg-slate-900 border-b">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {exam.name}
                  </CardTitle>
                  <Badge variant={exam.status === 'completed' ? 'default' : exam.status === 'ongoing' ? 'destructive' : 'secondary'}>
                    {exam.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground block text-xs">Batch</span>
                    <span className="font-medium">{exam.batchName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Subject</span>
                    <span className="font-medium">{exam.subjectName}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground block text-xs">Date</span>
                    <span className="font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {format(new Date(exam.date), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded text-sm">
                  <div className="text-center">
                    <span className="block text-xs text-muted-foreground">Type</span>
                    <span className="font-semibold uppercase">{exam.type}</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-xs text-muted-foreground">Total Marks</span>
                    <span className="font-semibold">{exam.totalMarks}</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-xs text-muted-foreground">Passing</span>
                    <span className="font-semibold text-green-600">{exam.passingMarks}</span>
                  </div>
                </div>
                <Button className="w-full" variant="outline">Enter Marks</Button>
              </CardContent>
            </Card>
          ))}
          {exams?.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No exams scheduled.
            </div>
          )}
        </div>
      )}
    </div>
  );
}