import { Router, type IRouter } from "express";
import { authenticate } from "../middlewares/auth";
import { PTM } from "../models/PTM";
import { Batch } from "../models/Batch";

const router: IRouter = Router();

async function fmt(p: any) {
  const batch = await Batch.findById(p.batchId).select("name");
  return {
    id: String(p._id),
    title: p.title,
    batchId: String(p.batchId),
    batchName: batch?.name ?? null,
    scheduledDate: p.scheduledDate,
    venue: p.venue ?? null,
    agenda: p.agenda ?? null,
    status: p.status,
    attendees: p.attendees ?? 0,
    notes: p.notes ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/ptm", authenticate, async (req, res): Promise<void> => {
  const { status, batchId } = req.query as Record<string, string>;
  const filter: any = {};
  if (status) filter.status = status;
  if (batchId) filter.batchId = batchId;
  const meetings = await PTM.find(filter).sort({ scheduledDate: -1 });
  const result = await Promise.all(meetings.map(fmt));
  res.json(result);
});

router.post("/ptm", authenticate, async (req, res): Promise<void> => {
  const ptm = await PTM.create(req.body);
  res.status(201).json(await fmt(ptm));
});

router.patch("/ptm/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const ptm = await PTM.findByIdAndUpdate(id, req.body, { new: true });
  if (!ptm) { res.status(404).json({ error: "Meeting not found" }); return; }
  res.json(await fmt(ptm));
});

router.delete("/ptm/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await PTM.findByIdAndDelete(id);
  res.sendStatus(204);
});

export default router;
