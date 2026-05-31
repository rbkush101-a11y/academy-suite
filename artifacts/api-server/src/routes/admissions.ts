import { Router, type IRouter } from "express";
import { authenticate } from "../middlewares/auth";
import { Admission } from "../models/Admission";

const router: IRouter = Router();

function fmt(a: any) {
  return {
    id: String(a._id),
    studentName: a.studentName,
    parentName: a.parentName,
    phone: a.phone,
    email: a.email ?? null,
    courseInterest: a.courseInterest,
    source: a.source ?? null,
    status: a.status,
    followUpDate: a.followUpDate ?? null,
    remarks: a.remarks ?? null,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/admissions", authenticate, async (req, res): Promise<void> => {
  const { status } = req.query as Record<string, string>;
  const filter: any = {};
  if (status) filter.status = status;
  const admissions = await Admission.find(filter).sort({ createdAt: -1 });
  res.json(admissions.map(fmt));
});

router.post("/admissions", authenticate, async (req, res): Promise<void> => {
  const admission = await Admission.create(req.body);
  res.status(201).json(fmt(admission));
});

router.patch("/admissions/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const admission = await Admission.findByIdAndUpdate(id, req.body, { new: true });
  if (!admission) { res.status(404).json({ error: "Admission not found" }); return; }
  res.json(fmt(admission));
});

export default router;
