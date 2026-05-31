import { Router, type IRouter } from "express";
import { authenticate } from "../middlewares/auth";
import { Staff } from "../models/Staff";

const router: IRouter = Router();

function formatStaff(s: any) {
  return {
    id: String(s._id),
    name: s.name,
    email: s.email,
    phone: s.phone,
    role: s.role,
    subject: s.subject ?? null,
    salary: s.salary,
    joinDate: s.joinDate,
    status: s.status,
    address: s.address ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/staff", authenticate, async (req, res): Promise<void> => {
  const { search, role } = req.query as Record<string, string>;
  const filter: any = {};
  if (search) filter.$or = [{ name: new RegExp(search, "i") }, { email: new RegExp(search, "i") }];
  if (role) filter.role = role;
  const staff = await Staff.find(filter).sort({ createdAt: -1 });
  res.json(staff.map(formatStaff));
});

router.post("/staff", authenticate, async (req, res): Promise<void> => {
  const staff = await Staff.create(req.body);
  res.status(201).json(formatStaff(staff));
});

router.get("/staff/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const staff = await Staff.findById(id);
  if (!staff) { res.status(404).json({ error: "Staff not found" }); return; }
  res.json(formatStaff(staff));
});

router.patch("/staff/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const staff = await Staff.findByIdAndUpdate(id, req.body, { new: true });
  if (!staff) { res.status(404).json({ error: "Staff not found" }); return; }
  res.json(formatStaff(staff));
});

router.delete("/staff/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await Staff.findByIdAndDelete(id);
  res.sendStatus(204);
});

export default router;
