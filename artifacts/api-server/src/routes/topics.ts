import { Router, type IRouter } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { Topic } from "../models/Topic";
import { Course } from "../models/Course";
import { Subject } from "../models/Subject";

const router: IRouter = Router();

function userInstituteId(req: any): string | null {
  if (req.user?.role === "super_admin") return null;
  return req.user?.instituteId ? String(req.user.instituteId) : null;
}

async function validateParents(courseId: string, subjectId: string, instituteId: string | null) {
  const courseFilter: any = { _id: courseId };
  if (instituteId) courseFilter.instituteId = instituteId;
  const course = await Course.findOne(courseFilter);
  if (!course) return { error: "Course not found or access denied." };

  const subject = await Subject.findById(subjectId).lean();
  if (!subject || String(subject.courseId) !== String(course._id)) {
    return { error: "Subject does not belong to the selected course." };
  }
  return { course, subject };
}

function fmt(topic: any) {
  const course = topic.courseId && typeof topic.courseId === "object" ? topic.courseId : null;
  const subject = topic.subjectId && typeof topic.subjectId === "object" ? topic.subjectId : null;
  return {
    id: String(topic._id),
    name: topic.name ?? "",
    code: topic.code ?? "",
    description: topic.description ?? "",
    courseId: course?._id ? String(course._id) : String(topic.courseId ?? ""),
    courseName: course?.name ?? "",
    subjectId: subject?._id ? String(subject._id) : String(topic.subjectId ?? ""),
    subjectName: subject?.name ?? "",
    status: topic.status === "Inactive" ? "Inactive" : "Active",
    createdAt: topic.createdAt?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: topic.updatedAt?.toISOString?.() ?? new Date().toISOString(),
  };
}

async function findTopic(id: string) {
  return Topic.findById(id)
    .populate("courseId", "name instituteId")
    .populate("subjectId", "name code");
}

router.get(
  "/topics",
  authenticate,
  authorize("super_admin", "institute_admin", "teacher", "staff", "student"),
  async (req, res): Promise<void> => {
    try {
      const filter: any = {};
      const instituteId = userInstituteId(req);
      const courseId = String(req.query.courseId ?? "").trim();
      const subjectId = String(req.query.subjectId ?? "").trim();
      const search = String(req.query.search ?? "").trim();

      if (instituteId) {
        const courses = await Course.find({ instituteId }).select("_id").lean();
        filter.courseId = { $in: courses.map((c) => c._id) };
      }
      if (courseId) {
        const courseFilter: any = { _id: courseId };
        if (instituteId) courseFilter.instituteId = instituteId;
        const allowedCourse = await Course.findOne(courseFilter).select("_id").lean();
        if (!allowedCourse) { res.json([]); return; }
        filter.courseId = allowedCourse._id;
      }
      if (subjectId) {
        const subject = await Subject.findById(subjectId).select("_id courseId").lean();
        if (!subject || (courseId && String(subject.courseId) !== String(courseId))) { res.json([]); return; }
        filter.subjectId = subject._id;
      }
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { code: { $regex: search, $options: "i" } },
        ];
      }

      const topics = await Topic.find(filter)
        .populate("courseId", "name instituteId")
        .populate("subjectId", "name code")
        .sort({ createdAt: -1 });

      res.json(topics.map(fmt));
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to load topics." });
    }
  }
);

router.post(
  "/topics",
  authenticate,
  authorize("super_admin", "institute_admin", "teacher", "staff"),
  async (req, res): Promise<void> => {
    try {
      const name = String(req.body?.name ?? "").trim();
      const courseId = String(req.body?.courseId ?? "").trim();
      const subjectId = String(req.body?.subjectId ?? "").trim();
      const description = String(req.body?.description ?? "").trim();
      const code = String(req.body?.code ?? "").trim();
      const status = req.body?.status === "Inactive" ? "Inactive" : "Active";

      if (!name || !courseId || !subjectId) {
        res.status(400).json({ error: "Topic Name, Course and Subject are required." });
        return;
      }

      const instituteId = userInstituteId(req);
      const parents = await validateParents(courseId, subjectId, instituteId);
      if (parents.error) { res.status(400).json({ error: parents.error }); return; }

      const duplicate = await Topic.findOne({ courseId, subjectId, name });
      if (duplicate) {
        res.status(409).json({ error: "A topic with this name already exists for the selected subject." });
        return;
      }

      const topic = await Topic.create({
        name, courseId, subjectId,
        ...(description ? { description } : {}),
        ...(code ? { code } : {}),
        status,
      });

      const populated = await findTopic(String(topic._id));
      res.status(201).json(fmt(populated));
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to create topic." });
    }
  }
);

router.patch(
  "/topics/:id",
  authenticate,
  authorize("super_admin", "institute_admin", "teacher", "staff"),
  async (req, res): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const existing = await Topic.findById(id);
      if (!existing) { res.status(404).json({ error: "Topic not found." }); return; }

      const instituteId = userInstituteId(req);
      const currentParents = await validateParents(String(existing.courseId), String(existing.subjectId), instituteId);
      if (currentParents.error) { res.status(403).json({ error: currentParents.error }); return; }

      const updates: any = {};
      if (req.body?.name !== undefined) {
        const name = String(req.body.name).trim();
        if (!name) { res.status(400).json({ error: "Topic Name is required." }); return; }
        updates.name = name;
      }
      if (req.body?.description !== undefined) updates.description = String(req.body.description ?? "").trim();
      if (req.body?.code !== undefined) updates.code = String(req.body.code ?? "").trim();
      if (req.body?.status !== undefined) updates.status = req.body.status === "Inactive" ? "Inactive" : "Active";

      const nextCourseId = req.body?.courseId !== undefined ? String(req.body.courseId).trim() : String(existing.courseId);
      const nextSubjectId = req.body?.subjectId !== undefined ? String(req.body.subjectId).trim() : String(existing.subjectId);
      if (req.body?.courseId !== undefined || req.body?.subjectId !== undefined) {
        if (!nextCourseId || !nextSubjectId) { res.status(400).json({ error: "Course and Subject are required." }); return; }
        const parents = await validateParents(nextCourseId, nextSubjectId, instituteId);
        if (parents.error) { res.status(400).json({ error: parents.error }); return; }
        updates.courseId = nextCourseId;
        updates.subjectId = nextSubjectId;
      }

      const duplicate = await Topic.findOne({
        _id: { $ne: id },
        courseId: updates.courseId ?? existing.courseId,
        subjectId: updates.subjectId ?? existing.subjectId,
        name: updates.name ?? existing.name,
      });
      if (duplicate) { res.status(409).json({ error: "A topic with this name already exists for the selected subject." }); return; }

      const updated = await Topic.findByIdAndUpdate(id, updates, { returnDocument: "after", runValidators: true })
        .populate("courseId", "name instituteId")
        .populate("subjectId", "name code");
      res.json(fmt(updated));
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to update topic." });
    }
  }
);

router.delete(
  "/topics/:id",
  authenticate,
  authorize("super_admin", "institute_admin"),
  async (req, res): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const existing = await Topic.findById(id);
      if (!existing) { res.status(404).json({ error: "Topic not found." }); return; }
      const instituteId = userInstituteId(req);
      const parents = await validateParents(String(existing.courseId), String(existing.subjectId), instituteId);
      if (parents.error) { res.status(403).json({ error: parents.error }); return; }
      await Topic.findByIdAndDelete(id);
      res.json({ message: "Topic deleted successfully." });
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to delete topic." });
    }
  }
);

export default router;
