import { Router, type IRouter } from "express";
import { authenticate } from "../middlewares/auth";
import { Student } from "../models/Student";
import { Batch } from "../models/Batch";
import { Course } from "../models/Course";

const router: IRouter = Router();

async function populateStudent(s: any) {
  const [batch, course] = await Promise.all([
    Batch.findById(s.batchId).select("name"),
    Course.findById(s.courseId).select("name"),
  ]);
  return {
    id: String(s._id),
    name: s.name,
    email: s.email,
    phone: s.phone,
    enrollmentNo: s.enrollmentNo,
    batchId: String(s.batchId),
    batchName: batch?.name ?? null,
    courseId: String(s.courseId),
    courseName: course?.name ?? null,
    status: s.status,
    academicYear: s.academicYear,
    parentName: s.parentName ?? null,
    parentPhone: s.parentPhone ?? null,
    address: s.address ?? null,
    dateOfBirth: s.dateOfBirth ?? null,
    gender: s.gender ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/students", authenticate, async (req, res): Promise<void> => {
  const { search, batchId, status } = req.query as Record<string, string>;
  const filter: any = {};
  if (search) filter.$or = [{ name: new RegExp(search, "i") }, { email: new RegExp(search, "i") }, { enrollmentNo: new RegExp(search, "i") }];
  if (batchId) filter.batchId = batchId;
  if (status) filter.status = status;
  const students = await Student.find(filter).sort({ createdAt: -1 });
  const result = await Promise.all(students.map(populateStudent));
  res.json(result);
});

router.post("/students", authenticate, async (req, res): Promise<void> => {
  const student = await Student.create(req.body);
  res.status(201).json(await populateStudent(student));
});

router.get("/students/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const student = await Student.findById(id);
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }
  res.json(await populateStudent(student));
});

router.patch("/students/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const student = await Student.findByIdAndUpdate(id, req.body, { new: true });
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }
  res.json(await populateStudent(student));
});

router.delete("/students/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await Student.findByIdAndDelete(id);
  res.sendStatus(204);
});

export default router;
