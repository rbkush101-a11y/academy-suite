import { Router, type IRouter } from "express";
import { authenticate } from "../middlewares/auth";
import { Exam, ExamMark, calculateGrade } from "../models/Exam";
import { Batch } from "../models/Batch";
import { Subject } from "../models/Subject";
import { Student } from "../models/Student";

const router: IRouter = Router();

async function fmtExam(e: any) {
  const [batch, subject] = await Promise.all([
    Batch.findById(e.batchId).select("name"),
    Subject.findById(e.subjectId).select("name"),
  ]);
  return {
    id: String(e._id),
    name: e.name,
    type: e.type,
    batchId: String(e.batchId),
    batchName: batch?.name ?? null,
    subjectId: String(e.subjectId),
    subjectName: subject?.name ?? null,
    date: e.date,
    totalMarks: e.totalMarks,
    passingMarks: e.passingMarks,
    duration: e.duration ?? null,
    status: e.status,
    createdAt: e.createdAt.toISOString(),
  };
}

router.get("/exams", authenticate, async (req, res): Promise<void> => {
  const { batchId, status } = req.query as Record<string, string>;
  const filter: any = {};
  if (batchId) filter.batchId = batchId;
  if (status) filter.status = status;
  const exams = await Exam.find(filter).sort({ date: -1 });
  const result = await Promise.all(exams.map(fmtExam));
  res.json(result);
});

router.post("/exams", authenticate, async (req, res): Promise<void> => {
  const exam = await Exam.create(req.body);
  res.status(201).json(await fmtExam(exam));
});

router.get("/exams/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const exam = await Exam.findById(id);
  if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }
  res.json(await fmtExam(exam));
});

router.patch("/exams/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const exam = await Exam.findByIdAndUpdate(id, req.body, { new: true });
  if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }
  res.json(await fmtExam(exam));
});

router.delete("/exams/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await Exam.findByIdAndDelete(id);
  res.sendStatus(204);
});

router.get("/exams/:id/marks", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const marks = await ExamMark.find({ examId: id });
  const result = await Promise.all(marks.map(async (m) => {
    const student = await Student.findById(m.studentId).select("name");
    return {
      id: String(m._id),
      examId: String(m.examId),
      studentId: String(m.studentId),
      studentName: student?.name ?? null,
      marksObtained: m.marksObtained,
      grade: m.grade,
      remarks: m.remarks ?? null,
      createdAt: m.createdAt.toISOString(),
    };
  }));
  res.json(result);
});

router.post("/exams/:id/marks", authenticate, async (req, res): Promise<void> => {
  const examId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const exam = await Exam.findById(examId);
  if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }
  const { studentId, marksObtained, remarks } = req.body;
  const grade = calculateGrade(marksObtained, exam.totalMarks);
  const mark = await ExamMark.findOneAndUpdate(
    { examId, studentId },
    { examId, studentId, marksObtained, grade, remarks },
    { upsert: true, new: true }
  );
  const student = await Student.findById(mark.studentId).select("name");
  res.status(201).json({
    id: String(mark._id),
    examId: String(mark.examId),
    studentId: String(mark.studentId),
    studentName: student?.name ?? null,
    marksObtained: mark.marksObtained,
    grade: mark.grade,
    remarks: mark.remarks ?? null,
    createdAt: mark.createdAt.toISOString(),
  });
});

router.get("/report-card", authenticate, async (req, res): Promise<void> => {
  const { studentId, examId } = req.query as Record<string, string>;
  if (!studentId) { res.status(400).json({ error: "studentId is required" }); return; }
  const student = await Student.findById(studentId);
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }

  const filter: any = { studentId };
  let exams: any[] = [];
  if (examId) {
    exams = [await Exam.findById(examId)].filter(Boolean);
    filter.examId = examId;
  } else {
    exams = await Exam.find({ batchId: student.batchId });
    filter.examId = { $in: exams.map((e) => e._id) };
  }

  const marks = await ExamMark.find(filter);
  const examResults = await Promise.all(marks.map(async (m) => {
    const exam = exams.find((e) => String(e._id) === String(m.examId));
    const subject = exam ? await Subject.findById(exam.subjectId).select("name") : null;
    return {
      subject: subject?.name ?? "Unknown",
      totalMarks: exam?.totalMarks ?? 0,
      marksObtained: m.marksObtained,
      grade: m.grade,
    };
  }));

  const totalMarks = examResults.reduce((s, r) => s + r.totalMarks, 0);
  const obtainedMarks = examResults.reduce((s, r) => s + r.marksObtained, 0);
  const percentage = totalMarks ? Math.round((obtainedMarks / totalMarks) * 100) : 0;
  const grade = calculateGrade(obtainedMarks, totalMarks || 1);

  // Calculate rank among batch
  const batchMarks = await ExamMark.find({ examId: examId ?? { $in: exams.map((e) => e._id) } });
  const studentTotals: Record<string, number> = {};
  batchMarks.forEach((m) => {
    const sid = String(m.studentId);
    studentTotals[sid] = (studentTotals[sid] ?? 0) + m.marksObtained;
  });
  const sorted = Object.entries(studentTotals).sort((a, b) => b[1] - a[1]);
  const rank = sorted.findIndex(([sid]) => sid === studentId) + 1;

  res.json({
    studentId,
    studentName: student.name,
    enrollmentNo: student.enrollmentNo,
    examResults,
    totalMarks,
    obtainedMarks,
    percentage,
    grade,
    rank: rank > 0 ? rank : null,
    remarks: percentage >= 75 ? "Excellent" : percentage >= 50 ? "Good" : "Needs Improvement",
  });
});

export default router;
