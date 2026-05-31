import { useListHomework, useCreateHomework, useListBatches } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Plus, BookMarked, Calendar, Link as LinkIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { getListHomeworkQueryKey } from "@workspace/api-client-react";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

const homeworkSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(5),
  batchId: z.string().min(1),
  subjectId: z.string().min(1),
  dueDate: z.string(),
  fileUrl: z.string().optional(),
});

export default function Homework() {
  const { data: homeworks, isLoading } = useListHomework();
  const { data: batches } = useListBatches();
  const [open, setOpen] = useState(false);

  const queryClient = useQueryClient();
  const createHomework = useCreateHomework();

  const form = useForm<z.infer<typeof homeworkSchema>>({
    resolver: zodResolver(homeworkSchema),
    defaultValues: { title: "", description: "", batchId: "", subjectId: "", dueDate: format(new Date(), 'yyyy-MM-dd'), fileUrl: "" },
  });

  const onSubmit = (values: z.infer<typeof homeworkSchema>) => {
    createHomework.mutate({ data: values }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListHomeworkQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Homework</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Assign Homework</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign New Homework</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                )} />
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
                <FormField control={form.control} name="dueDate" render={({ field }) => (
                  <FormItem><FormLabel>Due Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="fileUrl" render={({ field }) => (
                  <FormItem><FormLabel>Reference Link (Optional)</FormLabel><FormControl><Input type="url" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={createHomework.isPending}>
                  {createHomework.isPending ? "Assigning..." : "Assign Homework"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading homeworks...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {homeworks?.map(hw => (
            <Card key={hw.id}>
              <CardHeader className="pb-3 bg-slate-50 dark:bg-slate-900 border-b">
                <CardTitle className="text-lg flex items-start gap-2">
                  <BookMarked className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{hw.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3">{hw.description}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground block text-xs">Batch</span>
                    <span className="font-medium">{hw.batchName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Subject</span>
                    <span className="font-medium">{hw.subjectName}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground block text-xs">Due Date</span>
                    <span className="font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {format(new Date(hw.dueDate), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
                {hw.fileUrl && (
                  <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                    <a href={hw.fileUrl} target="_blank" rel="noreferrer">
                      <LinkIcon className="h-4 w-4 mr-2" /> View Attachment
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
          {homeworks?.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No homework assigned yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}