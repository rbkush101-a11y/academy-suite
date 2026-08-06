import { Router, type IRouter } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { Subject } from "../models/Subject";

const router: IRouter = Router();

function fmt(subject: any) {
  const course = subject.courseId && typeof subject.courseId === "object" ? subject.courseId : null;
  const teacher = subject.teacherId && typeof subject.teacherId === "object" ? subject.teacherId : null;

  return {
    id: String(subject._id),
    name: subject.name ?? "",
    code: subject.code ?? "",
    courseId: course?._id ? String(course._id) : String(subject.courseId ?? ""),
    courseName: course?.name ?? "",
    teacherId: teacher?._id ? String(teacher._id) : (subject.teacherId ? String(subject.teacherId) : ""),
    teacherName: teacher?.name ?? "",
    createdAt: subject.createdAt?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: subject.updatedAt?.toISOString?.() ?? new Date().toISOString(),
  };
}

async function findSubject(id: string) {
  return Subject.findById(id)
    .populate("courseId", "name")
    .populate("teacherId", "name");
}

router.get(
  "/subjects",
  authenticate,
  authorize("super_admin", "institute_admin", "staff"),
  async (_req, res): Promise<void> => {
    try {
      const subjects = await Subject.find()
        .populate("courseId", "name")
        .populate("teacherId", "name")
        .sort({ createdAt: -1 });

      res.json(subjects.map(fmt));
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to load subjects." });
    }
  }
);

router.post(
  "/subjects",
  authenticate,
  authorize("super_admin", "institute_admin", "staff"),
  async (req, res): Promise<void> => {
    try {
      const name = String(req.body?.name ?? "").trim();
      const code = String(req.body?.code ?? "").trim().toUpperCase();
      const courseId = String(req.body?.courseId ?? "").trim();
      const teacherId = String(req.body?.teacherId ?? "").trim();

      if (!name || !code || !courseId) {
        res.status(400).json({ error: "Subject Name, Subject Code and Course are required." });
        return;
      }

      const existingCode = await Subject.findOne({ code });
      if (existingCode) {
        res.status(409).json({
          error: `Subject Code "${code}" already exists. Please use a different Subject Code.`,
        });
        return;
      }

      const subject = await Subject.create({
        name,
        code,
        courseId,
        ...(teacherId ? { teacherId } : {}),
      });

      const populated = await findSubject(String(subject._id));
      res.status(201).json(fmt(populated));
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to save subject." });
    }
  }
);

router.patch(
  "/subjects/:id",
  authenticate,
  authorize("super_admin", "institute_admin", "staff"),
  async (req, res): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const existing = await Subject.findById(id);

      if (!existing) {
        res.status(404).json({ error: "Subject not found." });
        return;
      }

      const updates: any = {};

      if (req.body?.name !== undefined) {
        const name = String(req.body.name).trim();
        if (!name) {
          res.status(400).json({ error: "Subject Name is required." });
          return;
        }
        updates.name = name;
      }

      if (req.body?.code !== undefined) {
        const code = String(req.body.code).trim().toUpperCase();
        if (!code) {
          res.status(400).json({ error: "Subject Code is required." });
          return;
        }

        const duplicate = await Subject.findOne({ code, _id: { $ne: id } });
        if (duplicate) {
          res.status(409).json({
            error: `Subject Code "${code}" already exists. Please use a different Subject Code.`,
          });
          return;
        }
        updates.code = code;
      }

      if (req.body?.courseId !== undefined) {
        const courseId = String(req.body.courseId).trim();
        if (!courseId) {
          res.status(400).json({ error: "Course is required." });
          return;
        }
        updates.courseId = courseId;
      }

      if (req.body?.teacherId !== undefined) {
        const teacherId = String(req.body.teacherId).trim();
        updates.teacherId = teacherId || null;
      }

      const subject = await Subject.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true,
      })
        .populate("courseId", "name")
        .populate("teacherId", "name");

      res.json(fmt(subject));
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to update subject." });
    }
  }
);

router.delete(
  "/subjects/:id",
  authenticate,
  authorize("super_admin", "institute_admin"),
  async (req, res): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const subject = await Subject.findByIdAndDelete(id);

      if (!subject) {
        res.status(404).json({ error: "Subject not found." });
        return;
      }

      res.json({ message: "Subject deleted successfully." });
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to delete subject." });
    }
  }
);

export default router;
