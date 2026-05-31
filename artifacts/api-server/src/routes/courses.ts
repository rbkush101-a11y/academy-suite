import { Router, type IRouter } from "express";
import { authenticate } from "../middlewares/auth";
import { Course } from "../models/Course";

const router: IRouter = Router();

function fmt(c: any) {
  return { id: String(c._id), name: c.name, description: c.description, duration: c.duration, fees: c.fees, status: c.status, createdAt: c.createdAt.toISOString() };
}

router.get("/courses", authenticate, async (_req, res): Promise<void> => {
  const courses = await Course.find().sort({ createdAt: -1 });
  res.json(courses.map(fmt));
});

router.post("/courses", authenticate, async (req, res): Promise<void> => {
  const course = await Course.create(req.body);
  res.status(201).json(fmt(course));
});

router.patch("/courses/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const course = await Course.findByIdAndUpdate(id, req.body, { new: true });
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  res.json(fmt(course));
});

router.delete("/courses/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await Course.findByIdAndDelete(id);
  res.sendStatus(204);
});

export default router;
