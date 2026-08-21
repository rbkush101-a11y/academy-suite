import { Router, type IRouter } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { ExamSeries, Exam, ExamMark, calculateGrade } from "../models/Exam";
import { Batch } from "../models/Batch";
import { Subject } from "../models/Subject";
import { Student } from "../models/Student";
import { Staff } from "../models/Staff";

const router: IRouter = Router();
const clean = (value: unknown) => String(value ?? "").trim();
const validTypes = new Set([
  "weekly-test", "monthly-test", "unit-test", "half-yearly", "annual",
  "practice-test", "scholarship-test", "mid-term", "final", "mock",
]);

async function batchInfo(batchId: string) {
  return Batch.findById(batchId).select("name courseId");
}
async function formatSeries(series: any) {
  const batch = await batchInfo(String(series.batchId));
  const papers = await Exam.countDocuments({ seriesId: series._id });
  return {
    id: String(series._id),
    title: series.title,
    type: series.type,
    batchId: String(series.batchId),
    batchName: batch?.name ?? "",
    courseId: batch?.courseId ? String(batch.courseId) : "",
    testDate: series.testDate,
    status: series.status,
    instructions: series.instructions ?? "",
    paperCount: papers,
    createdAt: series.createdAt?.toISOString?.() ?? null,
  };
}
async function formatExam(exam: any) {
  const [batch, subject] = await Promise.all([
    batchInfo(String(exam.batchId)),
    Subject.findById(exam.subjectId).select("name code teacherId"),
  ]);
  const teacher = subject?.teacherId ? await Staff.findById(subject.teacherId).select("name") : null;
  return {
    id: String(exam._id),
    seriesId: exam.seriesId ? String(exam.seriesId) : "",
    name: exam.name,
    type: exam.type,
    batchId: String(exam.batchId),
    batchName: batch?.name ?? "",
    subjectId: String(exam.subjectId),
    subjectName: subject?.name ?? "",
    teacherName: teacher?.name ?? "",
    date: exam.date,
    startTime: exam.startTime ?? "",
    endTime: exam.endTime ?? "",
    totalMarks: exam.totalMarks,
    passingMarks: exam.passingMarks,
    room: exam.room ?? "",
    instructions: exam.instructions ?? "",
    status: exam.status,
  };
}
async function validateBatchSubject(batchId: string, subjectId: string) {
  const [batch, subject] = await Promise.all([Batch.findById(batchId), Subject.findById(subjectId)]);
  if (!batch) return { error: "Selected batch not found." };
  if (!subject) return { error: "Selected subject not found." };
  if (String(batch.courseId ?? "") !== String(subject.courseId ?? "")) {
    return { error: "Selected Batch and Subject must belong to the same Course." };
  }
  return { batch, subject };
}

router.get("/exam-series", authenticate, authorize("super_admin","institute_admin","teacher","student","parent"), async (req,res): Promise<void> => {
  try {
    const filter: any = {};
    const batchId = clean(req.query.batchId);
    const date = clean(req.query.date);
    const month = clean(req.query.month);
    if (batchId) filter.batchId = batchId;
    if (date) filter.testDate = date;
    if (month) filter.testDate = new RegExp(`^${month}`);
    const series = await ExamSeries.find(filter).sort({ testDate: -1, createdAt: -1 });
    res.json(await Promise.all(series.map(formatSeries)));
  } catch (error:any) {
    res.status(500).json({ error: error?.message ?? "Unable to load test sessions." });
  }
});

router.post("/exam-series", authenticate, authorize("super_admin","institute_admin","teacher"), async (req,res): Promise<void> => {
  try {
    const title = clean(req.body?.title);
    const type = clean(req.body?.type) || "weekly-test";
    const batchId = clean(req.body?.batchId);
    const testDate = clean(req.body?.testDate);
    const instructions = clean(req.body?.instructions);
    if (!title || !batchId || !testDate) {
      res.status(400).json({ error: "Test / Exam Name, Batch and Test Date are required." }); return;
    }
    if (!validTypes.has(type)) { res.status(400).json({ error: "Invalid test type." }); return; }
    const batch = await batchInfo(batchId);
    if (!batch) { res.status(404).json({ error: "Batch not found." }); return; }
    const item = await ExamSeries.create({
      title,
      type: type as any,
      batchId,
      testDate,
      instructions,
      status: "scheduled",
    });
    res.status(201).json(await formatSeries(item));
  } catch (error:any) {
    res.status(500).json({ error: error?.message ?? "Unable to create test session." });
  }
});

router.patch("/exam-series/:id", authenticate, authorize("super_admin","institute_admin","teacher"), async (req,res): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updates:any = {};
    for (const key of ["title","type","testDate","status","instructions"]) {
      if (req.body?.[key] !== undefined) updates[key] = clean(req.body[key]);
    }
    if (updates.type && !validTypes.has(updates.type)) { res.status(400).json({error:"Invalid test type."}); return; }
    const item = await ExamSeries.findByIdAndUpdate(id, updates, {new:true,runValidators:true});
    if (!item) { res.status(404).json({error:"Test session not found."}); return; }
    res.json(await formatSeries(item));
  } catch(error:any) {
    res.status(500).json({error:error?.message??"Unable to update test session."});
  }
});

router.delete("/exam-series/:id", authenticate, authorize("super_admin","institute_admin"), async (req,res): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const exams = await Exam.find({seriesId:id}).select("_id");
    await ExamMark.deleteMany({ examId: { $in: exams.map((exam) => exam._id) } });
    await Exam.deleteMany({seriesId:id});
    const removed = await ExamSeries.findByIdAndDelete(id);
    if (!removed) { res.status(404).json({error:"Test session not found."}); return; }
    res.json({message:"Test session, subject papers and marks deleted."});
  } catch(error:any) {
    res.status(500).json({error:error?.message??"Unable to delete test session."});
  }
});

router.get("/exams", authenticate, authorize("super_admin","institute_admin","teacher","student","parent"), async (req,res): Promise<void> => {
  try {
    const filter:any = {};
    const seriesId=clean(req.query.seriesId), batchId=clean(req.query.batchId);
    if(seriesId) filter.seriesId=seriesId;
    if(batchId) filter.batchId=batchId;
    const list = await Exam.find(filter).sort({date:-1,createdAt:-1});
    res.json(await Promise.all(list.map(formatExam)));
  } catch(error:any) { res.status(500).json({error:error?.message??"Unable to load subject papers."}); }
});

router.post("/exams", authenticate, authorize("super_admin","institute_admin","teacher"), async (req,res): Promise<void> => {
  try {
    const seriesId=clean(req.body?.seriesId), subjectId=clean(req.body?.subjectId);
    const name=clean(req.body?.name), date=clean(req.body?.date), startTime=clean(req.body?.startTime), endTime=clean(req.body?.endTime), room=clean(req.body?.room), instructions=clean(req.body?.instructions);
    const totalMarks=Number(req.body?.totalMarks), passingMarks=Number(req.body?.passingMarks);
    if(!seriesId || !subjectId || !name || !date){res.status(400).json({error:"Test Session, Subject, Paper Name and Date are required."});return;}
    if(!Number.isFinite(totalMarks)||totalMarks<=0||!Number.isFinite(passingMarks)||passingMarks<0||passingMarks>totalMarks){res.status(400).json({error:"Check Total and Passing Marks."});return;}
    const series=await ExamSeries.findById(seriesId);
    if(!series){res.status(404).json({error:"Test session not found."});return;}
    const checked=await validateBatchSubject(String(series.batchId),subjectId);
    if(checked.error){res.status(400).json({error:checked.error});return;}
    const duplicate=await Exam.findOne({seriesId,subjectId});
    if(duplicate){res.status(409).json({error:"This subject paper is already added in this test / exam."});return;}
    const paper=await Exam.create({seriesId,name,type:series.type,batchId:series.batchId,subjectId,date,startTime,endTime,room,instructions,totalMarks,passingMarks,status:"scheduled"});
    res.status(201).json(await formatExam(paper));
  } catch(error:any) {res.status(500).json({error:error?.message??"Unable to add subject paper."});}
});

router.patch("/exams/:id", authenticate, authorize("super_admin","institute_admin","teacher"), async (req,res): Promise<void> => {
  try {
    const id=Array.isArray(req.params.id)?req.params.id[0]:req.params.id;
    const old=await Exam.findById(id); if(!old){res.status(404).json({error:"Subject paper not found."});return;}
    const updates:any={};
    for(const k of ["name","date","startTime","endTime","room","instructions","status"]){if(req.body?.[k]!==undefined)updates[k]=clean(req.body[k]);}
    if(req.body?.totalMarks!==undefined)updates.totalMarks=Number(req.body.totalMarks);
    if(req.body?.passingMarks!==undefined)updates.passingMarks=Number(req.body.passingMarks);
    const total=updates.totalMarks??old.totalMarks, pass=updates.passingMarks??old.passingMarks;
    if(!Number.isFinite(total)||total<=0||!Number.isFinite(pass)||pass<0||pass>total){res.status(400).json({error:"Check Total and Passing Marks."});return;}
    const result=await Exam.findByIdAndUpdate(id,updates,{new:true,runValidators:true});
    res.json(await formatExam(result));
  }catch(error:any){res.status(500).json({error:error?.message??"Unable to update paper."});}
});

router.delete("/exams/:id", authenticate, authorize("super_admin","institute_admin"), async (req,res):Promise<void>=>{
  try {
    const id=Array.isArray(req.params.id)?req.params.id[0]:req.params.id;
    await ExamMark.deleteMany({examId:id});
    const removed=await Exam.findByIdAndDelete(id);
    if(!removed){res.status(404).json({error:"Subject paper not found."});return;}
    res.json({message:"Subject paper deleted."});
  }catch(error:any){res.status(500).json({error:error?.message??"Unable to delete paper."});}
});

router.get("/exams/:id/marks", authenticate, authorize("super_admin","institute_admin","teacher","student","parent"), async(req,res):Promise<void>=>{
  try{
    const id=Array.isArray(req.params.id)?req.params.id[0]:req.params.id;
    const exam=await Exam.findById(id);if(!exam){res.status(404).json({error:"Paper not found."});return;}
    const [students, saved]=await Promise.all([Student.find({batchId:exam.batchId}).select("name studentId").sort({name:1}),ExamMark.find({examId:id})]);
    const map=new Map(saved.map((mark:any)=>[String(mark.studentId),mark]));
    res.json(students.map((student:any)=>{const mark=map.get(String(student._id));const obtained=mark?.marksObtained??null;return {id:mark?String(mark._id):`new-${student._id}`,studentId:String(student._id),studentName:student.name??"",studentCode:student.studentId??"",marksObtained:obtained,grade:mark?.grade??"",remarks:mark?.remarks??"",resultStatus:obtained===null?"not-entered":obtained>=exam.passingMarks?"pass":"fail"};}));
  }catch(error:any){res.status(500).json({error:error?.message??"Unable to load marks."});}
});

router.post("/exams/:id/marks", authenticate, authorize("super_admin","institute_admin","teacher"), async(req,res):Promise<void>=>{
  try{
    const examId=Array.isArray(req.params.id)?req.params.id[0]:req.params.id;
    const exam=await Exam.findById(examId);if(!exam){res.status(404).json({error:"Paper not found."});return;}
    const studentId=clean(req.body?.studentId), obtained=Number(req.body?.marksObtained), remarks=clean(req.body?.remarks);
    if(!studentId||!Number.isFinite(obtained)||obtained<0||obtained>exam.totalMarks){res.status(400).json({error:`Marks must be 0 to ${exam.totalMarks}.`});return;}
    const student=await Student.findById(studentId).select("name batchId studentId");if(!student){res.status(404).json({error:"Student not found."});return;}
    if(String((student as any).batchId)!==String(exam.batchId)){res.status(400).json({error:"Student is not in this batch."});return;}
    const grade=calculateGrade(obtained,exam.totalMarks);
    const mark=await ExamMark.findOneAndUpdate({examId,studentId},{examId,studentId,marksObtained:obtained,grade,remarks},{upsert:true,new:true,runValidators:true});
    res.json({id:String(mark._id),studentId,studentName:(student as any).name??"",marksObtained:mark.marksObtained,grade:mark.grade,resultStatus:obtained>=exam.passingMarks?"pass":"fail",remarks:mark.remarks??""});
  }catch(error:any){res.status(500).json({error:error?.message??"Unable to save marks."});}
});

router.get("/report-card", authenticate, authorize("super_admin","institute_admin","teacher","student","parent"), async(req,res):Promise<void>=>{
  try{
    const studentId=clean(req.query.studentId), seriesIds=clean(req.query.seriesIds), batchId=clean(req.query.batchId), date=clean(req.query.date), month=clean(req.query.month);
    if(!studentId){res.status(400).json({error:"studentId is required."});return;}
    const student=await Student.findById(studentId).select("name studentId enrollmentNo batchId photoDataUrl");if(!student){res.status(404).json({error:"Student not found."});return;}
    const studentBatchId=String((student as any).batchId??"");
    if(batchId&&batchId!==studentBatchId){res.status(400).json({error:"Selected student does not belong to the selected batch."});return;}
    let series:any[]=[];
    if(seriesIds){series=await ExamSeries.find({_id:{$in:seriesIds.split(",").filter(Boolean)},batchId:studentBatchId});}
    else {const filter:any={batchId:studentBatchId};if(date)filter.testDate=date;if(month)filter.testDate=new RegExp(`^${month}`);series=await ExamSeries.find(filter).sort({testDate:1,createdAt:1});}
    const papers=await Exam.find({seriesId:{$in:series.map((s)=>s._id)}}).sort({date:1});
    const marks=await ExamMark.find({studentId,examId:{$in:papers.map((paper)=>paper._id)}});
    const markMap=new Map(marks.map((mark:any)=>[String(mark.examId),mark]));
    const subjects=await Subject.find({_id:{$in:papers.map((paper)=>paper.subjectId)}}).select("name");
    const subjectMap=new Map(subjects.map((subject:any)=>[String(subject._id),subject.name]));
    const seriesMap=new Map(series.map((item:any)=>[String(item._id),item]));
    const rows=papers.map((paper:any)=>{const mark=markMap.get(String(paper._id));return {seriesId:String(paper.seriesId),seriesTitle:seriesMap.get(String(paper.seriesId))?.title??"",testDate:paper.date,subject:subjectMap.get(String(paper.subjectId))??"Subject",totalMarks:paper.totalMarks,passingMarks:paper.passingMarks,marksObtained:mark?.marksObtained??null,grade:mark?.grade??"",remarks:mark?.remarks??"",resultStatus:mark?mark.marksObtained>=paper.passingMarks?"pass":"fail":"not-entered"};});
    const entered=rows.filter((row)=>row.marksObtained!==null);
    const totalMarks=entered.reduce((sum,row)=>sum+row.totalMarks,0), obtainedMarks=entered.reduce((sum,row)=>sum+Number(row.marksObtained),0);
    const percentage=totalMarks?Math.round((obtainedMarks/totalMarks)*100):0;
    res.json({studentId,studentName:(student as any).name??"",enrollmentNo:(student as any).studentId??(student as any).enrollmentNo??"",series:series.map((s)=>({id:String(s._id),title:s.title,type:s.type,testDate:s.testDate})),examResults:rows,totalMarks,obtainedMarks,percentage,grade:calculateGrade(obtainedMarks,totalMarks||1),finalResult:entered.length===rows.length&&rows.length?entered.every((row)=>row.resultStatus==="pass")?"pass":"fail":"pending"});
  }catch(error:any){res.status(500).json({error:error?.message??"Unable to build report card."});}
});

export default router;
