import { useListCourses, useListBatches, useListStudents } from "@workspace/api-client-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GraduationCap, Printer, CalendarDays, ChevronLeft, CheckSquare } from "lucide-react";

type Series = { id:string; title:string; type:string; batchId:string; testDate:string; paperCount:number; status:string; };
type Option = { label:string; value:string; subLabel?:string };

const headers = () => {
  const token = localStorage.getItem("coach_sutra_token") || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
};
const typeLabel = (value:string) => value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function SearchDropdown({label,value,options,placeholder,onChange,disabled=false}:{label:string;value:string;options:Option[];placeholder:string;onChange:(v:string)=>void;disabled?:boolean}) {
  const [open,setOpen]=useState(false), [term,setTerm]=useState("");
  const selected=options.find((item)=>item.value===value);
  const shown=options.filter((item)=>`${item.label} ${item.subLabel??""}`.toLowerCase().includes(term.toLowerCase()));
  return <div className="relative space-y-1.5">
    <label className="text-sm font-medium">{label}</label>
    <button type="button" disabled={disabled} onClick={()=>{setTerm("");setOpen(!open);}} className="flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 text-left text-sm disabled:opacity-50">
      <span className={selected?"":"text-muted-foreground"}>{selected?.label??placeholder}</span><span className="text-xs">▼</span>
    </button>
    {open&&!disabled?<div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-2 shadow-lg">
      <Input autoFocus className="mb-2 h-9" value={term} onChange={(e)=>setTerm(e.target.value)} placeholder={`Search ${label.toLowerCase()}...`}/>
      <div className="max-h-56 overflow-y-auto">{shown.length?shown.map((item)=><button key={item.value} type="button" onMouseDown={(e)=>{e.preventDefault();onChange(item.value);setOpen(false);}} className="flex w-full flex-col rounded px-3 py-2 text-left text-sm hover:bg-muted"><b>{item.label}</b>{item.subLabel?<span className="text-xs text-muted-foreground">{item.subLabel}</span>:null}</button>):<div className="p-3 text-center text-sm text-muted-foreground">No option found</div>}</div>
    </div>:null}
  </div>;
}

export default function ReportCard() {
  const [location]=useLocation();
  const pageType=new URLSearchParams(location.split("?")[1]??window.location.search).get("type")==="computer"?"computer":"academic";
  const {data:courses}=useListCourses(); const {data:batches}=useListBatches(); const {data:students}=useListStudents();
  const [courseId,setCourseId]=useState(""); const [batchId,setBatchId]=useState(""); const [studentId,setStudentId]=useState("");
  const [mode,setMode]=useState<"date"|"month"|"school">("date");
  const [date,setDate]=useState(new Date().toISOString().slice(0,10));
  const [month,setMonth]=useState(new Date().toISOString().slice(0,7));
  const [series,setSeries]=useState<Series[]>([]); const [selectedIds,setSelectedIds]=useState<string[]>([]);
  const [report,setReport]=useState<any>(null); const [loading,setLoading]=useState(false); const [message,setMessage]=useState("");

  const courseList=useMemo(()=>((courses??[])as any[]).filter((c)=>(c.courseType??"academic")===pageType),[courses,pageType]);
  const courseIds=useMemo(()=>new Set(courseList.map((c)=>String(c.id))),[courseList]);
  const batchList=useMemo(()=>((batches??[])as any[]).filter((b)=>courseIds.has(String(b.courseId??""))),[batches,courseIds]);
  const viewBatches=batchList.filter((b)=>!courseId||String(b.courseId)===courseId);
  const studentList=useMemo(()=>((students??[])as any[]).filter((s)=>String(s.batchId??"")===batchId),[students,batchId]);
  const selectedCourse=courseList.find((c)=>c.id===courseId), selectedBatch=batchList.find((b)=>b.id===batchId), selectedStudent=studentList.find((s)=>s.id===studentId);

  // Report rows ke hisaab se print scale automatically compact hota hai,
  // taaki ek A4 page me poora report card aaye aur koi row cut na ho.
  const reportRowCount = report?.examResults?.length ?? 0;
  // 1–7 rows: preview aur print bilkul same normal size.
  // Extra rows: only then compact scale, so everything remains on one A4 page.
  const printScale = reportRowCount <= 7
    ? 1
    : Math.max(0.52, 1 - (reportRowCount - 7) * 0.045);

  useEffect(()=>{ setSeries([]);setSelectedIds([]);setReport(null);if(!batchId)return;
    const params=new URLSearchParams({batchId});
    if(mode==="date")params.set("date",date);
    if(mode==="month")params.set("month",month);
    fetch(`/api/exam-series?${params}`,{headers:headers()}).then(async r=>r.ok?r.json():[]).then((items)=>{setSeries(items);setSelectedIds(items.map((x:Series)=>x.id));}).catch(()=>setSeries([]));
  },[batchId,mode,date,month]);

  const toggle=(id:string)=>setSelectedIds((old)=>old.includes(id)?old.filter((x)=>x!==id):[...old,id]);
  const viewReport=async()=>{
    if(!studentId){setMessage("Pehle Student select karo.");return;}
    if(!selectedIds.length){setMessage("Kam se kam ek Test / Exam select karo.");return;}
    setLoading(true);setMessage("");
    try{
      const response=await fetch(`/api/report-card?studentId=${studentId}&seriesIds=${selectedIds.join(",")}`,{headers:headers()});
      const data=await response.json().catch(()=>null);
      if(!response.ok){setMessage(data?.error??"Report card load nahi hua.");return;}
      if(!data?.examResults?.length){setMessage("Selected test me is student ke marks abhi enter nahi hain.");return;}
      setReport(data);
    }catch{setMessage("Report card load nahi hua.");}finally{setLoading(false);}
  };

  if(report){
    return <div className="mx-auto max-w-6xl space-y-4">
      <style>{`
        .a4-preview-sheet {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 8mm;
          background: white;
          overflow: hidden;
          box-sizing: border-box;
        }

        .report-print {
          transform: scale(var(--report-scale, 1));
          transform-origin: top left;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          html, body {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          body * {
            visibility: hidden !important;
          }

          .a4-preview-sheet,
          .a4-preview-sheet *,
          .report-print,
          .report-print * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .a4-preview-sheet {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            padding: 8mm !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            background: white !important;
          }

          .report-print {
            width: 194mm !important;
            max-width: none !important;
            margin: 0 !important;
            box-shadow: none !important;
            transform: scale(var(--report-scale, 1)) !important;
            transform-origin: top left !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .report-toolbar {
            display: none !important;
          }
        }
      `}</style>
      <div className="report-toolbar flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4 shadow-sm">
        <div><h1 className="text-xl font-bold">Report Card Preview</h1><p className="text-sm text-muted-foreground">Preview jaisa hi same-to-same A4 print hoga. Normal report normal size me rahega; rows zyada hone par hi compact hoga, koi result cut nahi hogi.</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={()=>setReport(null)}><ChevronLeft className="mr-1 h-4 w-4"/>Back</Button><Button onClick={()=>window.print()}><Printer className="mr-2 h-4 w-4"/>Print / Save PDF</Button></div>
      </div>
      <div
        className="a4-preview-sheet rounded-lg bg-white shadow-sm"
        style={{ "--report-scale": printScale } as any}
      >
      <Card className="report-print mx-auto max-w-[794px] overflow-hidden border-2 border-slate-800 bg-white shadow-lg">
        {/* Row 1: Coaching logo + name + report title + test name */}
        <div className="border-b-4 border-primary bg-slate-950 px-5 py-4 text-center text-white">
          <div className="flex items-center justify-center gap-3">
            <img
              src="/second-school-classes-logo.jpg"
              alt="Second School Classes"
              className="h-12 w-12 rounded-full border-2 border-white bg-white object-contain p-1"
            />
            <div className="text-left">
              <div className="text-lg font-extrabold uppercase tracking-[0.13em]">
                Second School Classes
              </div>
              <div className="mt-0.5 text-[10px] font-semibold tracking-[0.18em] text-white/80">
                {pageType === "computer" ? "COMPUTER EDUCATION REPORT" : "ACADEMIC PROGRESS REPORT"}
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs font-semibold">
            {report.series.map((item: any) => `${item.title} (${item.testDate})`).join(" • ")}
          </div>
        </div>

        <CardContent className="space-y-3 p-4">
          {/* Row 2: Student Photo, Student Name, ID, Course/Class, Batch */}
          <div className="grid overflow-hidden rounded-lg border-2 border-slate-800 text-sm md:grid-cols-[86px_1.35fr_1fr_1.15fr]">
            <div className="flex items-center justify-center border-b-2 border-slate-800 bg-slate-100 p-2 md:border-b-0 md:border-r-2">
              {selectedStudent?.photoDataUrl ? (
                <img
                  src={selectedStudent.photoDataUrl}
                  alt={report.studentName}
                  className="h-14 w-14 rounded border-2 border-slate-800 object-cover"
                />
              ) : (
                <GraduationCap className="h-8 w-8 text-slate-500" />
              )}
            </div>

            <div className="border-b-2 border-slate-800 p-2.5 md:border-b-0 md:border-r-2">
              <div className="text-[10px] font-semibold tracking-wider text-slate-500">STUDENT NAME</div>
              <div className="mt-1 font-bold text-slate-900">{report.studentName}</div>
            </div>

            <div className="border-b-2 border-slate-800 p-2.5 md:border-b-0 md:border-r-2">
              <div className="text-[10px] font-semibold tracking-wider text-slate-500">STUDENT ID</div>
              <div className="mt-1 font-bold text-slate-900">{report.enrollmentNo || "-"}</div>
            </div>

            <div className="p-2.5">
              <div className="text-[10px] font-semibold tracking-wider text-slate-500">COURSE / CLASS</div>
              <div className="mt-1 font-bold text-slate-900">{selectedCourse?.name || "-"}</div>
              <div className="mt-2 text-[10px] font-semibold tracking-wider text-slate-500">BATCH</div>
              <div className="mt-1 font-bold text-slate-900">{selectedBatch?.name || "-"}</div>
            </div>
          </div>

          {/* Row 3: Test / Subject result table */}
          <div className="overflow-hidden rounded-lg border-2 border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="p-2 text-left">Test / Subject</th>
                  <th className="p-2 text-center">Date</th>
                  <th className="p-2 text-center">Total</th>
                  <th className="p-2 text-center">Obtained</th>
                  <th className="p-2 text-center">Grade</th>
                  <th className="p-2 text-center">Result</th>
                </tr>
              </thead>
              <tbody>
                {report.examResults.map((row: any, index: number) => (
                  <tr key={`${row.subject}-${index}`} className="border-t border-slate-300">
                    <td className="p-2">
                      <div className="font-bold">{row.subject}</div>
                      <div className="text-[10px] text-slate-500">{row.seriesTitle}</div>
                    </td>
                    <td className="p-2 text-center text-xs">{row.testDate}</td>
                    <td className="p-2 text-center">{row.totalMarks}</td>
                    <td className="p-2 text-center font-bold">{row.marksObtained ?? "-"}</td>
                    <td className="p-2 text-center font-bold">{row.grade || "-"}</td>
                    <td className="p-2 text-center font-bold">
                      {row.resultStatus === "pass" ? "PASS" : row.resultStatus === "fail" ? "FAIL" : "PENDING"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Row 4: Total */}
          <div className="grid overflow-hidden rounded-lg border-2 border-slate-800 text-center md:grid-cols-5">
            {[
              ["Total", report.totalMarks],
              ["Obtained", report.obtainedMarks],
              ["Percentage", `${report.percentage}%`],
              ["Grade", report.grade],
              ["Result", String(report.finalResult).toUpperCase()],
            ].map(([label, value], index) => (
              <div
                key={String(label)}
                className={`p-2.5 ${index < 4 ? "border-b border-slate-300 md:border-b-0 md:border-r" : ""}`}
              >
                <div className="text-[10px] font-semibold tracking-wide text-slate-500">{label}</div>
                <div className="mt-1 text-lg font-extrabold text-slate-900">{value}</div>
              </div>
            ))}
          </div>

          {/* Row 5: Signatures */}
          <div className="grid gap-8 pt-7 text-center text-[11px] font-medium text-slate-700 md:grid-cols-3">
            <div><div className="mb-5"></div><div className="border-t-2 border-slate-800 pt-1.5">Teacher Signature</div></div>
            <div><div className="mb-5"></div><div className="border-t-2 border-slate-800 pt-1.5">Parent Signature</div></div>
            <div><div className="mb-5"></div><div className="border-t-2 border-slate-800 pt-1.5">Director Signature</div></div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>;
  }

  return <div className="mx-auto max-w-5xl space-y-6">
    <div><h1 className="text-3xl font-bold">{pageType==="computer"?"Computer Report Cards":"Academic Report Cards"}</h1><p className="mt-1 text-sm text-muted-foreground">Date-wise, month-wise aur school examination ke hisaab se purane aur naye tests ka result dekho.</p></div>
    <Card><CardHeader><CardTitle>1. Select Student</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-3">
      <SearchDropdown label="Course" value={courseId} placeholder="Select Course" options={courseList.map((c)=>({label:c.name,value:c.id}))} onChange={(v)=>{setCourseId(v);setBatchId("");setStudentId("");}}/>
      <SearchDropdown label="Batch" value={batchId} placeholder={courseId?"Select Batch":"Select Course first"} disabled={!courseId} options={viewBatches.map((b)=>({label:b.name,value:b.id}))} onChange={(v)=>{setBatchId(v);setStudentId("");}}/>
      <SearchDropdown label="Student" value={studentId} placeholder={batchId?"Select Student":"Select Batch first"} disabled={!batchId} options={studentList.map((s)=>({label:s.name,value:s.id,subLabel:s.studentId||s.enrollmentNo||""}))} onChange={setStudentId}/>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>2. Find Tests / Exams</CardTitle></CardHeader><CardContent className="space-y-4">
      <div className="flex flex-wrap gap-2"><Button size="sm" variant={mode==="date"?"default":"outline"} onClick={()=>setMode("date")}><CalendarDays className="mr-1 h-4 w-4"/>Date-wise</Button><Button size="sm" variant={mode==="month"?"default":"outline"} onClick={()=>setMode("month")}>Month-wise</Button><Button size="sm" variant={mode==="school"?"default":"outline"} onClick={()=>setMode("school")}>School Exam</Button></div>
      {mode==="date"?<div className="max-w-xs"><label className="text-sm font-medium">Test Date</label><Input type="date" value={date} onChange={(e)=>setDate(e.target.value)}/><p className="mt-1 text-xs text-muted-foreground">Ek hi Sunday ko 2 tests hue hain to dono neeche alag-alag dikhenge.</p></div>:null}
      {mode==="month"?<div className="max-w-xs"><label className="text-sm font-medium">Month</label><Input type="month" value={month} onChange={(e)=>setMonth(e.target.value)}/><p className="mt-1 text-xs text-muted-foreground">Is month ke saare weekly/monthly tests ek saath select kar sakte ho.</p></div>:null}
      {mode==="school"?<p className="text-sm text-muted-foreground">Batch select karte hi Half Yearly, Annual, Unit Test jaise school examinations neeche dikh jayenge. Jo report chahiye usko select karo.</p>:null}
      {!batchId?<div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">Pehle Batch select karo.</div>:<div className="space-y-2">{series.length?series.map((item)=><label key={item.id} className="flex cursor-pointer items-center justify-between rounded-lg border p-3 hover:bg-muted/40"><div className="flex items-center gap-3"><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={()=>toggle(item.id)} className="h-4 w-4"/><div><div className="font-semibold">{item.title}</div><div className="text-xs text-muted-foreground">{item.testDate} • {typeLabel(item.type)} • {item.paperCount} subject paper(s)</div></div></div><CheckSquare className="h-4 w-4 text-muted-foreground"/></label>):<div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">Is filter me koi test / exam nahi mila.</div>}</div>}
      <Button onClick={viewReport} disabled={!studentId||!selectedIds.length||loading}>{loading?"Loading Preview...":"View Report Card Preview"}</Button>
    </CardContent></Card>
    {message?<div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{message}</div>:null}
  </div>;
}