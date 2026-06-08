import { useListPTMMeetings, useSchedulePTM, useListBatches } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquare, Plus, Calendar, MapPin } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { getListPTMMeetingsQueryKey } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const ptmSchema = z.object({
  title: z.string().min(2),
  batchId: z.string().min(1),
  scheduledDate: z.string(),
  venue: z.string().min(2),
  agenda: z.string().optional(),
});

export default function PTM() {
  const { data: meetings, isLoading } = useListPTMMeetings();
  const { data: batches } = useListBatches();
  const [open, setOpen] = useState(false);

  const queryClient = useQueryClient();
  const schedulePTM = useSchedulePTM();

  const form = useForm<z.infer<typeof ptmSchema>>({
    resolver: zodResolver(ptmSchema),
    defaultValues: { title: "Parent Teacher Meeting", batchId: "", scheduledDate: format(new Date(), "yyyy-MM-dd'T'10:00"), venue: "Main Hall", agenda: "" },
  });

  const onSubmit = (values: z.infer<typeof ptmSchema>) => {
    schedulePTM.mutate({ data: values }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListPTMMeetingsQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Parent Teacher Meetings</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Schedule PTM</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule PTM</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
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
                <FormField control={form.control} name="scheduledDate" render={({ field }) => (
                  <FormItem><FormLabel>Date & Time</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="venue" render={({ field }) => (
                  <FormItem><FormLabel>Venue</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="agenda" render={({ field }) => (
                  <FormItem><FormLabel>Agenda (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={schedulePTM.isPending}>
                  {schedulePTM.isPending ? "Scheduling..." : "Schedule Meeting"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading meetings...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {meetings?.map(meeting => (
            <Card key={meeting.id}>
              <CardHeader className="pb-3 border-b bg-slate-50 dark:bg-slate-900">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    {meeting.title}
                  </CardTitle>
                  <Badge variant={meeting.status === 'scheduled' ? 'default' : meeting.status === 'completed' ? 'secondary' : 'destructive'} className="capitalize">
                    {meeting.status}
                  </Badge>
                </div>
                <div className="text-sm font-medium text-primary mt-2">Batch: {meeting.batchName}</div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{format(new Date(meeting.scheduledDate), "MMM d, yyyy 'at' h:mm a")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{meeting.venue}</span>
                </div>
                {meeting.agenda && (
                  <div className="text-sm text-muted-foreground border-t pt-3 mt-3">
                    <span className="font-semibold block mb-1">Agenda:</span>
                    {meeting.agenda}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {meetings?.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No PTMs scheduled yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}