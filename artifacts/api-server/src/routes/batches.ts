import { Router, type IRouter } from "express";
import { authenticate } from "../middlewares/auth";
import { Batch } from "../models/Batch";
import { Course } from "../models/Course";

const router: IRouter = Router();

async function fmtBatch(b: any) {
  const course = await Course.findById(b.courseId).select("name");
  return {
    id: String(b._id),
    name: b.name,
    courseId: String(b.courseId),
    courseName: course?.name ?? null,
    capacity: b.capacity,
    enrolled: b.studentIds?.length ?? 0,
    schedule: b.schedule,
    academicYear: b.academicYear,
    startDate: b.startDate,
    endDate: b.endDate ?? null,
    status: b.status,
    studentIds: (b.studentIds ?? []).map(String),
    createdAt: b.createdAt.toISOString(),
  };
}

router.get("/batches", authenticate, async (req, res): Promise<void> => {
  const { courseId, academicYear } = req.query as Record<string, string>;
  const filter: any = {};
  if (courseId) filter.courseId = courseId;
  if (academicYear) filter.academicYear = academicYear;
  const batches = await Batch.find(filter).sort({ createdAt: -1 });
  const result = await Promise.all(batches.map(fmtBatch));
  res.json(result);
});

router.post("/batches", authenticate, async (req, res): Promise<void> => {
  const batch = await Batch.create({ ...req.body, studentIds: [] });
  res.status(201).json(await fmtBatch(batch));
});

router.get("/batches/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const batch = await Batch.findById(id);
  if (!batch) { res.status(404).json({ error: "Batch not found" }); return; }
  res.json(await fmtBatch(batch));
});

router.patch("/batches/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const batch = await Batch.findByIdAndUpdate(id, req.body, { new: true });
  if (!batch) { res.status(404).json({ error: "Batch not found" }); return; }
  res.json(await fmtBatch(batch));
});

router.delete("/batches/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await Batch.findByIdAndDelete(id);
  res.sendStatus(204);
});

router.post("/batches/:id/students", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { studentId } = req.body;
  const batch = await Batch.findByIdAndUpdate(
    id,
    { $addToSet: { studentIds: studentId } },
    { new: true }
  );
  if (!batch) { res.status(404).json({ error: "Batch not found" }); return; }
  res.json(await fmtBatch(batch));
});

export default router;
