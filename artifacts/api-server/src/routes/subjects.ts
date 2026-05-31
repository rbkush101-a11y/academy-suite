import { Router, type IRouter } from "express";
import { authenticate } from "../middlewares/auth";
import { Subject } from "../models/Subject";
import { Course } from "../models/Course";
import { Staff } from "../models/Staff";

const router: IRouter = Router();

async function fmtSubject(s: any) {
  const [course, teacher] = await Promise.all([
    Course.findById(s.courseId).select("name"),
    s.teacherId ? Staff.findById(s.teacherId).select("name") : null,
  ]);
  return {
    id: String(s._id),
    name: s.name,
    code: s.code,
    courseId: String(s.courseId),
    courseName: course?.name ?? null,
    teacherId: s.teacherId ? String(s.teacherId) : null,
    teacherName: teacher?.name ?? null,
    description: s.description ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/subjects", authenticate, async (req, res): Promise<void> => {
  const { courseId } = req.query as Record<string, string>;
  const filter: any = {};
  if (courseId) filter.courseId = courseId;
  const subjects = await Subject.find(filter).sort({ name: 1 });
  const result = await Promise.all(subjects.map(fmtSubject));
  res.json(result);
});

router.post("/subjects", authenticate, async (req, res): Promise<void> => {
  const subject = await Subject.create(req.body);
  res.status(201).json(await fmtSubject(subject));
});

router.patch("/subjects/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const subject = await Subject.findByIdAndUpdate(id, req.body, { new: true });
  if (!subject) { res.status(404).json({ error: "Subject not found" }); return; }
  res.json(await fmtSubject(subject));
});

router.delete("/subjects/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await Subject.findByIdAndDelete(id);
  res.sendStatus(204);
});

export default router;
