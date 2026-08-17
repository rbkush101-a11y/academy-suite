import { Router, type IRouter } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { ExamMark, Exam, calculateGrade } from "../models/Exam";
import { Student } from "../models/Student";
import { StudentAttendance } from "../models/Attendance";

const router: IRouter = Router();

router.get(
"/analytics/toppers",
authenticate,
authorize("super_admin", "institute_admin", "teacher"),
async (req, res): Promise<void> => {
const { examId, batchId, limit } = req.query as Record<string, string>;
const top = parseInt(limit ?? "10", 10);


let marks: any[];

if (examId) {
  marks = await ExamMark.find({ examId });
} else if (batchId) {
  const exams = await Exam.find({ batchId });
  marks = await ExamMark.find({
    examId: { $in: exams.map((exam) => exam._id) }
  });
} else {
  marks = await ExamMark.find();
}

const studentTotals: Record<string, { obtained: number; total: number }> = {};

for (const mark of marks) {
  const studentId = String(mark.studentId);
  const exam = await Exam.findById(mark.examId);

  if (!exam) continue;

  if (!studentTotals[studentId]) {
    studentTotals[studentId] = {
      obtained: 0,
      total: 0
    };
  }

  studentTotals[studentId].obtained += mark.marksObtained;
  studentTotals[studentId].total += exam.totalMarks;
}

const sorted = Object.entries(studentTotals)
  .map(([studentId, data]) => ({
    studentId,
    obtained: data.obtained,
    total: data.total,
    percentage: data.total ? (data.obtained / data.total) * 100 : 0
  }))
  .sort((a, b) => b.percentage - a.percentage)
  .slice(0, top);

const result = await Promise.all(
  sorted.map(async (item, index) => {
    const student = await Student.findById(item.studentId);

    return {
      rank: index + 1,
      studentId: item.studentId,
      studentName: student?.name ?? "Unknown",
      enrollmentNo: student?.enrollmentNo ?? "",
      marksObtained: item.obtained,
      totalMarks: item.total,
      percentage: Math.round(item.percentage),
      grade: calculateGrade(item.obtained, item.total || 1)
    };
  })
);

res.json(result);


}
);

router.get(
"/analytics/performance",
authenticate,
authorize("super_admin", "institute_admin", "teacher"),
async (req, res): Promise<void> => {
const { batchId } = req.query as Record<string, string>;


let marks: any[];
const attendanceFilter: any = {};

if (batchId) {
  const exams = await Exam.find({ batchId });

  marks = await ExamMark.find({
    examId: { $in: exams.map((exam) => exam._id) }
  });

  attendanceFilter.batchId = batchId;
} else {
  marks = await ExamMark.find();
}

const total = marks.length || 1;
const avgMarks =
  marks.reduce((sum, mark) => sum + mark.marksObtained, 0) / total;

const grades: Record<string, number> = {
  A: 0,
  B: 0,
  C: 0,
  D: 0,
  F: 0
};

let passed = 0;

for (const mark of marks) {
  const exam = await Exam.findById(mark.examId);

  if (!exam) continue;

  const grade = mark.grade?.[0] ?? "F";

  if (grade === "A") grades.A++;
  else if (grade === "B") grades.B++;
  else if (grade === "C") grades.C++;
  else if (grade === "D") grades.D++;
  else grades.F++;

  if (mark.marksObtained >= exam.passingMarks) {
    passed++;
  }
}

const attendanceRecords = await StudentAttendance.find(attendanceFilter).limit(
  1000
);

const presentCount = attendanceRecords.filter(
  (record) => record.status === "present" || record.status === "late"
).length;

const avgAttendance = attendanceRecords.length
  ? Math.round((presentCount / attendanceRecords.length) * 100)
  : 0;

const monthlyTrend: { month: string; average: number }[] = [];

for (let i = 5; i >= 0; i--) {
  const date = new Date();
  date.setMonth(date.getMonth() - i);

  const month = date.toISOString().slice(0, 7);

  const monthMarks = marks.filter((mark) =>
    mark.createdAt?.toISOString().startsWith(month)
  );

  const average = monthMarks.length
    ? Math.round(
        monthMarks.reduce((sum, mark) => sum + mark.marksObtained, 0) /
          monthMarks.length
      )
    : 0;

  monthlyTrend.push({
    month,
    average
  });
}

res.json({
  averageAttendance: avgAttendance,
  averageMarks: Math.round(avgMarks),
  passPercentage: Math.round((passed / total) * 100),
  gradeDistribution: grades,
  monthlyTrend
});


}
);

export default router;
