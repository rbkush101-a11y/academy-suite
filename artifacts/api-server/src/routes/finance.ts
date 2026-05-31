import { Router, type IRouter } from "express";
import { authenticate } from "../middlewares/auth";
import { FeeStructure, Payment } from "../models/Finance";
import { Course } from "../models/Course";
import { Student } from "../models/Student";

const router: IRouter = Router();

async function fmtFeeStructure(f: any) {
  const course = await Course.findById(f.courseId).select("name");
  return {
    id: String(f._id),
    name: f.name,
    courseId: String(f.courseId),
    courseName: course?.name ?? null,
    amount: f.amount,
    frequency: f.frequency,
    lateFeePerDay: f.lateFeePerDay,
    dueDay: f.dueDay,
    createdAt: f.createdAt.toISOString(),
  };
}

async function fmtPayment(p: any) {
  const student = await Student.findById(p.studentId).select("name");
  return {
    id: String(p._id),
    studentId: String(p.studentId),
    studentName: student?.name ?? null,
    feeStructureId: String(p.feeStructureId),
    amount: p.amount,
    lateFee: p.lateFee ?? 0,
    totalAmount: p.totalAmount,
    dueDate: p.dueDate,
    paidDate: p.paidDate ?? null,
    status: p.status,
    month: p.month,
    paymentMethod: p.paymentMethod ?? null,
    receiptNo: p.receiptNo ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/finance/fee-structures", authenticate, async (_req, res): Promise<void> => {
  const fs = await FeeStructure.find().sort({ createdAt: -1 });
  const result = await Promise.all(fs.map(fmtFeeStructure));
  res.json(result);
});

router.post("/finance/fee-structures", authenticate, async (req, res): Promise<void> => {
  const fs = await FeeStructure.create(req.body);
  res.status(201).json(await fmtFeeStructure(fs));
});

router.patch("/finance/fee-structures/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const fs = await FeeStructure.findByIdAndUpdate(id, req.body, { new: true });
  if (!fs) { res.status(404).json({ error: "Fee structure not found" }); return; }
  res.json(await fmtFeeStructure(fs));
});

router.delete("/finance/fee-structures/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await FeeStructure.findByIdAndDelete(id);
  res.sendStatus(204);
});

router.get("/finance/payments", authenticate, async (req, res): Promise<void> => {
  const { studentId, status, month } = req.query as Record<string, string>;
  const filter: any = {};
  if (studentId) filter.studentId = studentId;
  if (status) filter.status = status;
  if (month) filter.month = month;
  const payments = await Payment.find(filter).sort({ createdAt: -1 });
  const result = await Promise.all(payments.map(fmtPayment));
  res.json(result);
});

router.post("/finance/payments", authenticate, async (req, res): Promise<void> => {
  const { studentId, feeStructureId, amount, dueDate, month, paymentMethod } = req.body;
  // Calculate late fee
  const fs = await FeeStructure.findById(feeStructureId);
  let lateFee = 0;
  if (fs && dueDate) {
    const due = new Date(dueDate);
    const today = new Date();
    const diffDays = Math.max(0, Math.floor((today.getTime() - due.getTime()) / (1000 * 86400)));
    lateFee = diffDays * fs.lateFeePerDay;
  }
  const payment = await Payment.create({ studentId, feeStructureId, amount, lateFee, totalAmount: amount + lateFee, dueDate, month, paymentMethod, status: "pending" });
  res.status(201).json(await fmtPayment(payment));
});

router.patch("/finance/payments/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const body = { ...req.body };
  if (body.status === "paid" && !body.paidDate) body.paidDate = new Date().toISOString().split("T")[0];
  const payment = await Payment.findByIdAndUpdate(id, body, { new: true });
  if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }
  res.json(await fmtPayment(payment));
});

router.get("/finance/summary", authenticate, async (req, res): Promise<void> => {
  const { month } = req.query as Record<string, string>;
  const filter: any = {};
  if (month) filter.month = month;
  const payments = await Payment.find(filter);
  const totalRevenue = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.totalAmount, 0);
  const totalPending = payments.filter((p) => p.status === "pending").reduce((s, p) => s + p.totalAmount, 0);
  const totalOverdue = payments.filter((p) => p.status === "overdue").reduce((s, p) => s + p.totalAmount, 0);
  const total = payments.length || 1;
  const paid = payments.filter((p) => p.status === "paid").length;
  res.json({
    totalRevenue,
    totalPending,
    totalOverdue,
    collectionRate: Math.round((paid / total) * 100),
    paymentsByStatus: {
      paid,
      pending: payments.filter((p) => p.status === "pending").length,
      overdue: payments.filter((p) => p.status === "overdue").length,
    },
  });
});

export default router;
