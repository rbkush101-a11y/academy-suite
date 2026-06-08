import { useListTimetableEntries, useListBatches, useCreateTimetableEntry } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Plus, Clock } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { getListTimetableEntriesQueryKey } from "@workspace/api-client-react";

const timetableSchema = z.object({
  batchId: z.string().min(1),
  subjectId: z.string().min(1),
  day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]),
  startTime: z.string(),
  endTime: z.string(),
  room: z.string().optional(),
});

export default function Timetable() {
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const { data: entries, isLoading } = useListTimetableEntries({ batchId: selectedBatch }, { query: { enabled: !!selectedBatch } as any });
  const { data: batches } = useListBatches();
  const [open, setOpen] = useState(false);

  const queryClient = useQueryClient();
  const createEntry = useCreateTimetableEntry();

  const form = useForm<z.infer<typeof timetableSchema>>({
    resolver: zodResolver(timetableSchema),
    defaultValues: { batchId: "", subjectId: "", day: "Monday", startTime: "09:00", endTime: "10:00", room: "" },
  });

  const onSubmit = (values: z.infer<typeof timetableSchema>) => {
    createEntry.mutate({ data: values }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListTimetableEntriesQueryKey() });
      }
    });
  };

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Timetable</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Schedule</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Timetable Entry</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="batchId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch ID</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="subjectId" render={({ field }) => (
                  <FormItem><FormLabel>Subject ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="day" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="startTime" render={({ field }) => (
                    <FormItem><FormLabel>Start Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="endTime" render={({ field }) => (
                    <FormItem><FormLabel>End Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="room" render={({ field }) => (
                  <FormItem><FormLabel>Room (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={createEntry.isPending}>
                  {createEntry.isPending ? "Adding..." : "Save Entry"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b">
          <div className="max-w-sm space-y-1">
            <label className="text-sm font-medium">Select Batch</label>
            <Select value={selectedBatch} onValueChange={setSelectedBatch}>
              <SelectTrigger>
                <SelectValue placeholder="Select a batch to view timetable" />
              </SelectTrigger>
              <SelectContent>
                {batches?.map(batch => (
                  <SelectItem key={batch.id} value={batch.id}>{batch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!selectedBatch ? (
            <div className="py-16 text-center text-muted-foreground">
              Please select a batch to view its timetable
            </div>
          ) : isLoading ? (
            <div className="py-16 text-center">Loading timetable...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-7 border-t divide-y md:divide-y-0 md:divide-x">
              {days.map(day => {
                const dayEntries = entries?.filter(e => e.day === day) || [];
                return (
                  <div key={day} className="min-h-[200px]">
                    <div className="bg-slate-100 dark:bg-slate-800 p-2 text-center font-semibold text-sm border-b">
                      {day}
                    </div>
                    <div className="p-2 space-y-2">
                      {dayEntries.length === 0 ? (
                        <div className="text-center text-xs text-muted-foreground py-4">No classes</div>
                      ) : (
                        dayEntries.map(entry => (
                          <div key={entry.id} className="p-2 bg-primary/10 rounded border border-primary/20 text-sm">
                            <div className="font-bold text-primary">{entry.subjectName}</div>
                            <div className="text-xs flex items-center gap-1 mt-1 text-muted-foreground">
                              <Clock className="h-3 w-3" /> {entry.startTime} - {entry.endTime}
                            </div>
                            <div className="text-xs mt-1 truncate">{entry.teacherName}</div>
                            {entry.room && <div className="text-xs text-muted-foreground">Room: {entry.room}</div>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}