import { Router, type IRouter } from "express";
import { authenticate } from "../middlewares/auth";
import { Salary } from "../models/Salary";
import { Staff } from "../models/Staff";

const router: IRouter = Router();

async function fmtSalary(s: any) {
  const staff = await Staff.findById(s.staffId).select("name");
  return {
    id: String(s._id),
    staffId: String(s.staffId),
    staffName: staff?.name ?? null,
    month: s.month,
    basicSalary: s.basicSalary,
    allowances: s.allowances ?? 0,
    deductions: s.deductions ?? 0,
    netSalary: s.netSalary,
    paidDate: s.paidDate ?? null,
    status: s.status,
    paymentMethod: s.paymentMethod ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/hr/salaries", authenticate, async (req, res): Promise<void> => {
  const { staffId, month } = req.query as Record<string, string>;
  const filter: any = {};
  if (staffId) filter.staffId = staffId;
  if (month) filter.month = month;
  const salaries = await Salary.find(filter).sort({ createdAt: -1 });
  const result = await Promise.all(salaries.map(fmtSalary));
  res.json(result);
});

router.post("/hr/salaries", authenticate, async (req, res): Promise<void> => {
  const salary = await Salary.create(req.body);
  res.status(201).json(await fmtSalary(salary));
});

router.patch("/hr/salaries/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const body = { ...req.body };
  if (body.status === "paid" && !body.paidDate) body.paidDate = new Date().toISOString().split("T")[0];
  const salary = await Salary.findByIdAndUpdate(id, body, { new: true });
  if (!salary) { res.status(404).json({ error: "Salary record not found" }); return; }
  res.json(await fmtSalary(salary));
});

export default router;
