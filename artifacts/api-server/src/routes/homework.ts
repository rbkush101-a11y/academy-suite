import { Router, type IRouter } from "express";
import { authenticate } from "../middlewares/auth";
import { Homework } from "../models/Homework";
import { Batch } from "../models/Batch";
import { Subject } from "../models/Subject";

const router: IRouter = Router();

async function fmtHw(h: any) {
  const [batch, subject] = await Promise.all([
    Batch.findById(h.batchId).select("name"),
    Subject.findById(h.subjectId).select("name"),
  ]);
  return {
    id: String(h._id),
    title: h.title,
    description: h.description,
    batchId: String(h.batchId),
    batchName: batch?.name ?? null,
    subjectId: String(h.subjectId),
    subjectName: subject?.name ?? null,
    assignedBy: h.assignedBy ? String(h.assignedBy) : null,
    dueDate: h.dueDate,
    fileUrl: h.fileUrl ?? null,
    status: h.status,
    createdAt: h.createdAt.toISOString(),
  };
}

router.get("/homework", authenticate, async (req, res): Promise<void> => {
  const { batchId, subjectId } = req.query as Record<string, string>;
  const filter: any = {};
  if (batchId) filter.batchId = batchId;
  if (subjectId) filter.subjectId = subjectId;
  const hw = await Homework.find(filter).sort({ createdAt: -1 });
  const result = await Promise.all(hw.map(fmtHw));
  res.json(result);
});

router.post("/homework", authenticate, async (req, res): Promise<void> => {
  const hw = await Homework.create(req.body);
  res.status(201).json(await fmtHw(hw));
});

router.patch("/homework/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const hw = await Homework.findByIdAndUpdate(id, req.body, { new: true });
  if (!hw) { res.status(404).json({ error: "Homework not found" }); return; }
  res.json(await fmtHw(hw));
});

router.delete("/homework/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await Homework.findByIdAndDelete(id);
  res.sendStatus(204);
});

export default router;
