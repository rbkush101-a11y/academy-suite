import { Router, type IRouter } from "express";
import { authenticate } from "../middlewares/auth";
import { Timetable } from "../models/Timetable";
import { Batch } from "../models/Batch";
import { Subject } from "../models/Subject";
import { Staff } from "../models/Staff";

const router: IRouter = Router();

async function fmtEntry(t: any) {
  const [batch, subject, teacher] = await Promise.all([
    Batch.findById(t.batchId).select("name"),
    Subject.findById(t.subjectId).select("name"),
    t.teacherId ? Staff.findById(t.teacherId).select("name") : null,
  ]);
  return {
    id: String(t._id),
    batchId: String(t.batchId),
    batchName: batch?.name ?? null,
    subjectId: String(t.subjectId),
    subjectName: subject?.name ?? null,
    teacherId: t.teacherId ? String(t.teacherId) : null,
    teacherName: teacher?.name ?? null,
    day: t.day,
    startTime: t.startTime,
    endTime: t.endTime,
    room: t.room ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

router.get("/timetable", authenticate, async (req, res): Promise<void> => {
  const { batchId, day } = req.query as Record<string, string>;
  const filter: any = {};
  if (batchId) filter.batchId = batchId;
  if (day) filter.day = day;
  const entries = await Timetable.find(filter).sort({ day: 1, startTime: 1 });
  const result = await Promise.all(entries.map(fmtEntry));
  res.json(result);
});

router.post("/timetable", authenticate, async (req, res): Promise<void> => {
  const entry = await Timetable.create(req.body);
  res.status(201).json(await fmtEntry(entry));
});

router.patch("/timetable/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const entry = await Timetable.findByIdAndUpdate(id, req.body, { new: true });
  if (!entry) { res.status(404).json({ error: "Entry not found" }); return; }
  res.json(await fmtEntry(entry));
});

router.delete("/timetable/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await Timetable.findByIdAndDelete(id);
  res.sendStatus(204);
});

export default router;
