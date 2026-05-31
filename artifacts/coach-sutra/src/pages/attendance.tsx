import { useListStudentAttendance, useListBatches, useMarkStudentAttendance } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { getListStudentAttendanceQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";

export default function Attendance() {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [batchId, setBatchId] = useState("");
  
  const { data: batches } = useListBatches();
  
  // We simulate fetching students for this batch and their attendance.
  // In a real app, this would use a more tailored hook.
  const { data: attendanceRecords, isLoading } = useListStudentAttendance({ batchId, date }, { query: { enabled: !!batchId } });

  const markAttendance = useMarkStudentAttendance();
  const queryClient = useQueryClient();

  const handleMark = (studentId: string, status: 'present' | 'absent' | 'late') => {
    markAttendance.mutate({
      data: { studentId, batchId, date, status }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStudentAttendanceQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
      </div>

      <Card>
        <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b">
          <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
            <div className="space-y-1">
              <label className="text-sm font-medium">Date</label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-1 flex-1 max-w-sm">
              <label className="text-sm font-medium">Batch</label>
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select batch to mark attendance" />
                </SelectTrigger>
                <SelectContent>
                  {batches?.map(batch => (
                    <SelectItem key={batch.id} value={batch.id}>{batch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!batchId ? (
            <div className="py-16 text-center text-muted-foreground">
              Please select a batch to view and mark attendance
            </div>
          ) : isLoading ? (
            <div className="py-16 text-center text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceRecords?.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No students in this batch</TableCell></TableRow>
                ) : (
                  attendanceRecords?.map(record => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.studentName}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          record.status === 'present' ? 'bg-green-100 text-green-700' :
                          record.status === 'absent' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {record.status?.toUpperCase() || 'NOT MARKED'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant={record.status === 'present' ? 'default' : 'outline'} onClick={() => handleMark(record.studentId, 'present')}>Present</Button>
                        <Button size="sm" variant={record.status === 'absent' ? 'destructive' : 'outline'} onClick={() => handleMark(record.studentId, 'absent')}>Absent</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}