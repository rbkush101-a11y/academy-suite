import { useGetStudentReportCard, useListStudents } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GraduationCap, Printer } from "lucide-react";

export default function ReportCard() {
  const [studentId, setStudentId] = useState("");
  const { data: students } = useListStudents();
  const { data: report, isLoading } = useGetStudentReportCard({ studentId }, { query: { enabled: !!studentId } });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-3xl font-bold tracking-tight">Report Cards</h1>
        <Button onClick={handlePrint} disabled={!report} variant="outline">
          <Printer className="mr-2 h-4 w-4" /> Print
        </Button>
      </div>

      <Card className="print:hidden">
        <CardContent className="p-4">
          <div className="max-w-md space-y-2">
            <label className="text-sm font-medium">Select Student</label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Search and select student" />
              </SelectTrigger>
              <SelectContent>
                {students?.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.enrollmentNo})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-12">Loading report card...</div>
      ) : report ? (
        <Card className="print:shadow-none print:border-none">
          <CardHeader className="text-center border-b pb-6">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary text-primary-foreground rounded-full">
                <GraduationCap className="h-8 w-8" />
              </div>
            </div>
            <CardTitle className="text-2xl uppercase tracking-wider">Academic Report Card</CardTitle>
            <p className="text-muted-foreground">Second School Classes</p>
          </CardHeader>
          <CardContent className="pt-6 space-y-8">
            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border">
              <div>
                <span className="text-muted-foreground">Student Name:</span>
                <span className="ml-2 font-bold text-base">{report.studentName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Enrollment No:</span>
                <span className="ml-2 font-medium">{report.enrollmentNo}</span>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead className="text-center">Total Marks</TableHead>
                  <TableHead className="text-center">Marks Obtained</TableHead>
                  <TableHead className="text-right">Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.examResults?.map((res, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{res.subject}</TableCell>
                    <TableCell className="text-center">{res.totalMarks}</TableCell>
                    <TableCell className="text-center font-bold">{res.marksObtained}</TableCell>
                    <TableCell className="text-right font-bold text-primary">{res.grade}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-between items-center bg-primary/5 p-4 rounded-lg border border-primary/20">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Total Score</div>
                <div className="text-2xl font-bold">{report.obtainedMarks} <span className="text-sm font-normal text-muted-foreground">/ {report.totalMarks}</span></div>
              </div>
              <div className="space-y-1 text-center border-l pl-6 border-primary/20">
                <div className="text-sm text-muted-foreground">Percentage</div>
                <div className="text-2xl font-bold">{report.percentage}%</div>
              </div>
              <div className="space-y-1 text-right border-l pl-6 border-primary/20">
                <div className="text-sm text-muted-foreground">Final Grade</div>
                <div className="text-3xl font-bold text-primary">{report.grade}</div>
              </div>
            </div>
            
            {report.remarks && (
              <div className="mt-8 p-4 border rounded-lg italic text-sm text-muted-foreground">
                <span className="font-semibold block not-italic text-foreground mb-1">Remarks:</span>
                {report.remarks}
              </div>
            )}
          </CardContent>
        </Card>
      ) : studentId ? (
        <div className="text-center py-12 text-muted-foreground">No report card data found for this student.</div>
      ) : null}
    </div>
  );
}