import { Router, type IRouter } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { Homework } from "../models/Homework";
import { HomeworkSubmission } from "../models/HomeworkSubmission";
import { Student } from "../models/Student";
import { Batch } from "../models/Batch";

const router: IRouter = Router();
const clean = (value: unknown) => String(value ?? "").trim();

function instituteId(req: any) {
  return clean(req.user?.instituteId);
}

async function getStudentForRequest(req: any) {
  const id = clean(req.user?.userId);
  if (!id || req.user?.role !== "student") return null;
  return Student.findOne({ _id: id, instituteId: instituteId(req) }).select("name enrollmentNo batchId instituteId status");
}

async function formatSubmission(submission: any) {
  const student = await Student.findById(submission.studentId).select("name enrollmentNo");
  return {
    id: String(submission._id),
    homeworkId: String(submission.homeworkId),
    studentId: String(submission.studentId),
    studentName: student?.name ?? "Student",
    studentCode: student?.enrollmentNo ?? "—",
    submittedAt: submission.submittedAt?.toISOString?.() ?? new Date().toISOString(),
    createdAt: submission.createdAt?.toISOString?.() ?? submission.submittedAt?.toISOString?.(),
    status: submission.status,
    fileUrl: submission.fileUrl ?? "",
    attachmentUrl: submission.fileUrl ?? "",
    marksObtained: submission.marksObtained,
    marks: submission.marksObtained,
    gradeBadge: submission.gradeBadge ?? "",
    grade: submission.gradeBadge ?? "",
    note: submission.note ?? "",
    remarks: submission.note ?? "",
  };
}

// Teacher/admin: see all submissions for one homework.
router.get(
  "/homework/:homeworkId/submissions",
  authenticate,
  authorize("super_admin", "institute_admin", "teacher"),
  async (req, res): Promise<void> => {
    try {
      const homeworkId = clean(req.params.homeworkId);
      const homework = await Homework.findOne({ _id: homeworkId });
      if (!homework) {
        res.status(404).json({ error: "Homework not found." });
        return;
      }

      const submissions = await HomeworkSubmission.find({
        homeworkId,
        instituteId: instituteId(req),
      }).sort({ submittedAt: -1 });

      res.json(await Promise.all(submissions.map(formatSubmission)));
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to load submissions." });
    }
  }
);

// Student: create or replace their submission for a homework assignment.
router.post(
  "/homework/:homeworkId/submissions",
  authenticate,
  authorize("student"),
  async (req, res): Promise<void> => {
    try {
      const homeworkId = clean(req.params.homeworkId);
      const student = await getStudentForRequest(req);
      if (!student) {
        res.status(404).json({ error: "Student account not found." });
        return;
      }

      const homework = await Homework.findOne({ _id: homeworkId });
      if (!homework) {
        res.status(404).json({ error: "Homework not found." });
        return;
      }

      if (String(student.batchId) !== String(homework.batchId)) {
        res.status(403).json({ error: "This homework is not assigned to your batch." });
        return;
      }

      const fileUrl = clean(req.body?.fileUrl || req.body?.attachmentUrl);
      const note = clean(req.body?.note || req.body?.remarks);
      if (!fileUrl && !note) {
        res.status(400).json({ error: "Please attach a file or enter a submission note." });
        return;
      }

      const now = new Date();
      const due = homework.dueDate ? new Date(homework.dueDate) : null;
      const late = due && !Number.isNaN(due.getTime()) && now > due;

      const submission = await HomeworkSubmission.findOneAndUpdate(
        { homeworkId, studentId: student._id, instituteId: instituteId(req) },
        {
          $set: {
            fileUrl,
            note,
            status: late ? "Late" : "Submitted",
            submittedAt: now,
            marksObtained: undefined,
            gradeBadge: "",
            gradedAt: undefined,
            gradedBy: undefined,
          },
        },
        { returnDocument: "after", upsert: true, setDefaultsOnInsert: true, runValidators: true }
      );

      res.status(201).json(await formatSubmission(submission));
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to submit homework." });
    }
  }
);

// Student: see their own submission for a homework.
router.get(
  "/homework/:homeworkId/my-submission",
  authenticate,
  authorize("student"),
  async (req, res): Promise<void> => {
    try {
      const student = await getStudentForRequest(req);
      if (!student) {
        res.status(404).json({ error: "Student account not found." });
        return;
      }
      const submission = await HomeworkSubmission.findOne({
        homeworkId: clean(req.params.homeworkId),
        studentId: student._id,
        instituteId: instituteId(req),
      });
      if (!submission) {
        res.status(404).json({ error: "No submission found." });
        return;
      }
      res.json(await formatSubmission(submission));
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to load submission." });
    }
  }
);

// Teacher/admin: grade a submission.
router.patch(
  "/homework-submissions/:id",
  authenticate,
  authorize("super_admin", "institute_admin", "teacher"),
  async (req, res): Promise<void> => {
    try {
      const id = clean(req.params.id);
      const submission = await HomeworkSubmission.findOne({ _id: id, instituteId: instituteId(req) });
      if (!submission) {
        res.status(404).json({ error: "Submission not found." });
        return;
      }

      if (req.body?.marksObtained !== undefined) {
        const marks = Number(req.body.marksObtained);
        if (!Number.isFinite(marks) || marks < 0) {
          res.status(400).json({ error: "Marks must be a valid non-negative number." });
          return;
        }
        submission.marksObtained = marks;
      }
      if (req.body?.gradeBadge !== undefined || req.body?.grade !== undefined) {
        submission.gradeBadge = clean(req.body?.gradeBadge ?? req.body?.grade);
      }
      if (req.body?.note !== undefined || req.body?.remarks !== undefined) {
        submission.note = clean(req.body?.note ?? req.body?.remarks);
      }
      submission.status = "Graded";
      submission.gradedAt = new Date();
      submission.gradedBy = req.user?.userId as any;
      await submission.save();

      res.json(await formatSubmission(submission));
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to grade submission." });
    }
  }
);

export default router;
