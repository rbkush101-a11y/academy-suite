import { Router, type IRouter } from "express";
import { authenticate } from "../middlewares/auth";
import { ExamMark, Exam, calculateGrade } from "../models/Exam";
import { Student } from "../models/Student";
import { StudentAttendance } from "../models/Attendance";

const router: IRouter = Router();

router.get("/analytics/toppers", authenticate, async (req, res): Promise<void> => {
  const { examId, batchId, limit } = req.query as Record<string, string>;
  const top = parseInt(limit ?? "10", 10);

  let marks: any[];
  if (examId) {
    marks = await ExamMark.find({ examId });
  } else if (batchId) {
    const exams = await Exam.find({ batchId });
    marks = await ExamMark.find({ examId: { $in: exams.map((e) => e._id) } });
  } else {
    marks = await ExamMark.find();
  }

  const studentTotals: Record<string, { obtained: number; total: number }> = {};
  for (const m of marks) {
    const sid = String(m.studentId);
    const exam = await Exam.findById(m.examId);
    if (!exam) continue;
    if (!studentTotals[sid]) studentTotals[sid] = { obtained: 0, total: 0 };
    studentTotals[sid].obtained += m.marksObtained;
    studentTotals[sid].total += exam.totalMarks;
  }

  const sorted = Object.entries(studentTotals)
    .map(([sid, { obtained, total }]) => ({ sid, obtained, total, pct: total ? (obtained / total) * 100 : 0 }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, top);

  const result = await Promise.all(
    sorted.map(async ({ sid, obtained, total, pct }, idx) => {
      const student = await Student.findById(sid);
      return {
        rank: idx + 1,
        studentId: sid,
        studentName: student?.name ?? "Unknown",
        enrollmentNo: student?.enrollmentNo ?? "",
        marksObtained: obtained,
        totalMarks: total,
        percentage: Math.round(pct),
        grade: calculateGrade(obtained, total || 1),
      };
    })
  );

  res.json(result);
});

router.get("/analytics/performance", authenticate, async (req, res): Promise<void> => {
  const { batchId } = req.query as Record<string, string>;

  let marks: any[];
  let attendanceFilter: any = {};
  if (batchId) {
    const exams = await Exam.find({ batchId });
    marks = await ExamMark.find({ examId: { $in: exams.map((e) => e._id) } });
    attendanceFilter.batchId = batchId;
  } else {
    marks = await ExamMark.find();
  }

  const total = marks.length || 1;
  const avgMarks = marks.reduce((s, m) => s + m.marksObtained, 0) / total;

  const grades: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  let passed = 0;
  for (const m of marks) {
    const exam = await Exam.findById(m.examId);
    if (!exam) continue;
    const g = m.grade?.[0] ?? "F";
    if (g === "A") grades.A++;
    else if (g === "B") grades.B++;
    else if (g === "C") grades.C++;
    else if (g === "D") grades.D++;
    else grades.F++;
    if (m.marksObtained >= exam.passingMarks) passed++;
  }

  // Attendance
  const attendanceRecords = await StudentAttendance.find(attendanceFilter).limit(1000);
  const presentCount = attendanceRecords.filter((r) => r.status === "present" || r.status === "late").length;
  const avgAttendance = attendanceRecords.length ? Math.round((presentCount / attendanceRecords.length) * 100) : 0;

  // Monthly trend (last 6 months)
  const monthlyTrend: { month: string; average: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthStr = d.toISOString().slice(0, 7);
    const monthMarks = marks.filter((m) => m.createdAt?.toISOString().startsWith(monthStr));
    monthlyTrend.push({
      month: monthStr,
      average: monthMarks.length ? Math.round(monthMarks.reduce((s, m) => s + m.marksObtained, 0) / monthMarks.length) : 0,
    });
  }

  res.json({
    averageAttendance: avgAttendance,
    averageMarks: Math.round(avgMarks),
    passPercentage: Math.round((passed / total) * 100),
    gradeDistribution: grades,
    monthlyTrend,
  });
});

export default router;
