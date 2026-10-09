import { Router, type IRouter } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import {
  FeeStructure,
  Payment,
  StudentFeeAssignment,
  Expense,
  FeePaymentApproval,
} from "../models/Finance";
import { Course } from "../models/Course";
import { Batch } from "../models/Batch";
import { Student } from "../models/Student";
import {
  getCycleDay,
  generateDueDates,
  getMonthInfo,
  calculateLateFee,
  isOverdue,
} from "../lib/feeCycle";
import { runOverdueCheckNow } from "../lib/cronJobs";
import { recordAudit } from "../lib/foundation";

const router: IRouter = Router();

// ============================================================
// HELPERS
// ============================================================

// Date-only helpers use business dates in Asia/Kolkata, never UTC midnight or
// the machine timezone (otherwise late fee can shift by one day).
const FEE_DAY = /^\d{4}-\d{2}-\d{2}$/;
function todayInIndia(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}
function feeDayTime(date: string): number | null {
  if (!FEE_DAY.test(date)) return null;
  const [y, m, d] = date.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > new Date(Date.UTC(y, m, 0)).getUTCDate()) return null;
  return Date.UTC(y, m - 1, d);
}
function paymentQuote(payment: any, dailyRate: number, receivedDate: string) {
  const dueMs = feeDayTime(String(payment.dueDate));
  const receivedMs = feeDayTime(receivedDate);
  if (dueMs === null || receivedMs === null) throw new Error("Invalid payment/due date");
  const rate = Math.max(0, Number.isFinite(Number(dailyRate)) ? Number(dailyRate) : 0);
  const daysLate = Math.max(0, Math.round((receivedMs - dueMs) / 86400000));
  const lateFee = Math.round(daysLate * rate * 100) / 100;
  const totalPayable = Math.round((Number(payment.amount || 0) + lateFee) * 100) / 100;
  return {
    dueDate: String(payment.dueDate), receivedDate, daysLate,
    lateFeePerDay: rate, lateFee, totalPayable,
    alreadyPaid: Number(payment.paidAmount || 0),
    remainingBalance: Math.max(0, totalPayable - Number(payment.paidAmount || 0)),
    needsApproval: receivedDate < todayInIndia(),
    entryDate: todayInIndia(),
  };
}
function ensureValidReceivedDate(date: unknown): string | null {
  const receivedDate = String(date ?? todayInIndia()).trim();
  const receivedMs = feeDayTime(receivedDate);
  if (receivedMs === null || receivedDate > todayInIndia()) return null;
  return receivedDate;
}
const allowedPaymentMethods = ["cash", "upi", "online", "cheque"] as const;
function validMethod(value: unknown): value is typeof allowedPaymentMethods[number] {
  return allowedPaymentMethods.includes(value as typeof allowedPaymentMethods[number]);
}
async function settleFullBill(payment: any, quote: ReturnType<typeof paymentQuote>, data: {
  paymentMethod: "cash" | "upi" | "online" | "cheque";
  transactionId?: string; remarks?: string; reason?: string; supportingReference?: string; userId: string;
}) {
  // Atomic claim: only one concurrent payment can turn this bill from unpaid to paid.
  // The settled amount is based on the SAME quote returned/validated by the API.
  return Payment.findOneAndUpdate({
    _id: payment._id,
    instituteId: payment.instituteId,
    status: { $in: ["pending", "overdue"] },
    amount: payment.amount,
    dueDate: payment.dueDate,
    paidAmount: { $in: [0, null] },
  }, { $set: {
    status: "paid",
    lateFee: quote.lateFee,
    totalAmount: quote.totalPayable,
    paidAmount: quote.totalPayable,
    paidDate: quote.receivedDate,
    receivedAt: quote.receivedDate,
    recordedAt: new Date(),
    collectedBy: data.userId,
    backdateReason: data.reason ?? "",
    supportingReference: data.supportingReference ?? "",
    paymentMethod: data.paymentMethod,
    transactionId: data.transactionId ?? "",
    remarks: data.remarks ?? "",
  } }, { returnDocument: "after", runValidators: true });
}

function getLoggedInUser(req: any) {
  return req.user;
}

function getInstituteIdForUser(req: any): string | null {
  const user = getLoggedInUser(req);
  if (user?.role === "super_admin") return null;
  return user?.instituteId ? String(user.instituteId) : null;
}

async function fmtFeeStructure(fs: any) {
  const course = await Course.findById(fs.courseId).select("name");
  return {
    id: String(fs._id),
    name: fs.name,
    instituteId: fs.instituteId ? String(fs.instituteId) : null,
    courseId: String(fs.courseId),
    courseName: course?.name ?? null,
    amount: fs.amount,
    frequency: fs.frequency,
    lateFeePerDay: fs.lateFeePerDay,
    dueDay: fs.dueDay,
    createdAt: fs.createdAt.toISOString(),
  };
}

async function fmtPayment(p: any) {
  const structure = await FeeStructure.findById(p.feeStructureId).select("lateFeePerDay").lean();
  const quote = p.status === "paid" || p.status === "partial" ? null :
    paymentQuote(p, Number(structure?.lateFeePerDay ?? 0), todayInIndia());
  const student = await Student.findById(p.studentId).select(
    "name enrollmentNo className board courseId batchId academicYear"
  );
  const course = student?.courseId
    ? await Course.findById(student.courseId).select("name")
    : null;
  const batch = student?.batchId
    ? await Batch.findById(student.batchId).select("name")
    : null;

  return {
    id: String(p._id),
    instituteId: p.instituteId ? String(p.instituteId) : null,
    studentId: String(p.studentId),
    studentName: student?.name ?? null,
    studentEnrollmentNo: student?.enrollmentNo ?? null,
    studentClassName: student?.className ?? null,
    studentBoard: student?.board ?? null,
    studentAcademicYear: student?.academicYear ?? null,
    studentBatchName: batch?.name ?? null,
    courseId: student?.courseId ? String(student.courseId) : null,
    courseName: course?.name ?? null,
    feeStructureId: String(p.feeStructureId),
    assignmentId: p.assignmentId ? String(p.assignmentId) : null,
    originalAmount: p.originalAmount ?? p.amount,
    scholarshipPercent: p.scholarshipPercent ?? 0,
    scholarshipAmount: p.scholarshipAmount ?? 0,
    amount: p.amount,
    lateFee: p.lateFee ?? 0,
    totalAmount: p.totalAmount,
    paidAmount: p.paidAmount ?? 0,
    dueDate: p.dueDate,
    paidDate: p.paidDate ?? null,
    receivedAt: p.receivedAt ?? p.paidDate ?? null,
    recordedAt: p.recordedAt ? new Date(p.recordedAt).toISOString() : null,
    collectedBy: p.collectedBy ? String(p.collectedBy) : null,
    backdateReason: p.backdateReason ?? "",
    supportingReference: p.supportingReference ?? "",
    lateFeePreview: quote,
    status: p.status,
    month: p.month,
    monthLabel: p.monthLabel,
    installment: p.installment ?? null,
    paymentMethod: p.paymentMethod ?? null,
    transactionId: p.transactionId ?? null,
    receiptNo: p.receiptNo ?? null,
    remarks: p.remarks ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

async function fmtAssignment(a: any) {
  const student = await Student.findById(a.studentId).select("name enrollmentNo");
  const fs = await FeeStructure.findById(a.feeStructureId).select("name amount");
  return {
    id: String(a._id),
    instituteId: String(a.instituteId),
    studentId: String(a.studentId),
    studentName: student?.name ?? null,
    studentEnrollmentNo: student?.enrollmentNo ?? null,
    feeStructureId: String(a.feeStructureId),
    feeStructureName: fs?.name ?? null,
    admissionDate: a.admissionDate,
    feeCycleDay: a.feeCycleDay,
    monthlyAmount: a.monthlyAmount,
    scholarshipPercent: a.scholarshipPercent,
    totalMonths: a.totalMonths,
    startMonth: a.startMonth,
    endMonth: a.endMonth,
    status: a.status,
    createdAt: a.createdAt.toISOString(),
  };
}

function fmtExpense(e: any) {
  return {
    id: String(e._id),
    instituteId: String(e.instituteId),
    category: e.category,
    title: e.title,
    amount: e.amount,
    date: e.date,
    paymentMethod: e.paymentMethod,
    vendor: e.vendor ?? null,
    invoiceNo: e.invoiceNo ?? null,
    recurring: e.recurring,
    remarks: e.remarks ?? null,
    createdAt: e.createdAt.toISOString(),
  };
}

// ============================================================
// FEE STRUCTURES (Existing - unchanged)
// ============================================================
router.get(
  "/finance/fee-structures",
  authenticate,
  authorize("super_admin", "institute_admin", "accountant"),
  async (req, res): Promise<void> => {
    const user = getLoggedInUser(req);
    const instituteId = getInstituteIdForUser(req);
    const filter: any = {};
    if (user.role !== "super_admin") {
      if (!instituteId) {
        res.status(403).json({ error: "Your account is not linked to an institute" });
        return;
      }
      filter.instituteId = instituteId;
    }
    const list = await FeeStructure.find(filter).sort({ createdAt: -1 });
    res.json(await Promise.all(list.map(fmtFeeStructure)));
  }
);

router.post(
  "/finance/fee-structures",
  authenticate,
  authorize("super_admin", "institute_admin"),
  async (req, res): Promise<void> => {
    try {
      const user = getLoggedInUser(req);
      let instituteId = getInstituteIdForUser(req);

      if (user.role === "super_admin") {
        // Super Admin ke liye course se instituteId nikalo
        const course = await Course.findById(req.body.courseId);

        if (!course) {
          res.status(400).json({
            error: "Selected course was not found",
          });
          return;
        }

        instituteId = String(course.instituteId);
      }

      if (!instituteId) {
        res.status(400).json({
          error: "Could not determine institute. Please select a valid course.",
        });
        return;
      }

      const course = await Course.findOne({
        _id: req.body.courseId,
        instituteId,
      });

      if (!course) {
        res.status(400).json({
          error: "Selected course does not belong to this institute",
        });
        return;
      }

      const fs = await FeeStructure.create({
        ...req.body,
        instituteId,
      });

      res.status(201).json(await fmtFeeStructure(fs));
    } catch (error: any) {
      console.error("FEE STRUCTURE CREATE ERROR:", error);
      res.status(500).json({
        error: error?.message ?? "Unable to create fee structure",
      });
    }
  }
);

router.patch(
  "/finance/fee-structures/:id",
  authenticate,
  authorize("super_admin", "institute_admin"),
  async (req, res): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const user = getLoggedInUser(req);
      const instituteId = getInstituteIdForUser(req);
      const filter: any = { _id: id };
      if (user.role !== "super_admin") {
        if (!instituteId) {
          res.status(403).json({ error: "Not linked to institute" });
          return;
        }
        filter.instituteId = instituteId;
      }
      const updateData = { ...req.body };
      delete updateData.instituteId;
      const fs = await FeeStructure.findOneAndUpdate(filter, updateData, {
        returnDocument: "after",
        runValidators: true,
      });
      if (!fs) {
        res.status(404).json({ error: "Fee structure not found" });
        return;
      }
      res.json(await fmtFeeStructure(fs));
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to update" });
    }
  }
);

router.delete(
  "/finance/fee-structures/:id",
  authenticate,
  authorize("super_admin", "institute_admin"),
  async (req, res): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = getLoggedInUser(req);
    const instituteId = getInstituteIdForUser(req);
    const filter: any = { _id: id };
    if (user.role !== "super_admin") {
      if (!instituteId) {
        res.status(403).json({ error: "Not linked" });
        return;
      }
      filter.instituteId = instituteId;
    }
    const fs = await FeeStructure.findOneAndDelete(filter);
    if (!fs) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.sendStatus(204);
  }
);

// ============================================================
// 🔥 STUDENT FEE ASSIGNMENT (Dynamic Cycle) 🔥
// ============================================================

/**
 * POST /finance/fee-assignments
 * ---------------------------------
 * Assign fee structure to a student & auto-generate monthly payments
 * based on the student's admission date.
 *
 * Body: { studentId, feeStructureId, admissionDate, totalMonths, scholarshipPercent? }
 */
router.post(
  "/finance/fee-assignments",
  authenticate,
  authorize("super_admin", "institute_admin", "accountant"),
  async (req, res): Promise<void> => {
    try {
      const user = getLoggedInUser(req);
      let instituteId = getInstituteIdForUser(req);

      if (user.role === "super_admin") {
        const studentDoc = await Student.findById(req.body.studentId);

        if (!studentDoc) {
          res.status(400).json({ error: "Student not found" });
          return;
        }

        instituteId = String(studentDoc.instituteId);
      }

      if (!instituteId) {
        res.status(400).json({
          error: "Could not determine institute. Please select a valid student.",
        });
        return;
      }

      const {
        studentId,
        feeStructureId,
        admissionDate,
        totalMonths = 12,
        scholarshipPercent = 0,
      } = req.body;

      const student = await Student.findOne({ _id: studentId, instituteId });
      if (!student) {
        res.status(400).json({ error: "Student not found in institute" });
        return;
      }

      const feeStructure = await FeeStructure.findOne({ _id: feeStructureId, instituteId });
      if (!feeStructure) {
        res.status(400).json({ error: "Fee structure not found" });
        return;
      }

      // Check duplicate assignment
      const existing = await StudentFeeAssignment.findOne({ studentId, feeStructureId });
      if (existing) {
        res.status(400).json({ error: "This fee structure is already assigned to this student" });
        return;
      }

      // ================= DYNAMIC CYCLE CALCULATION =================
      const feeCycleDay = getCycleDay(admissionDate);
      const dueDates = generateDueDates(admissionDate, totalMonths);
      const startInfo = getMonthInfo(dueDates[0]!);
      const endInfo = getMonthInfo(dueDates[dueDates.length - 1]!);

      const scholarshipAmount = Math.round((feeStructure.amount * scholarshipPercent) / 100);
      const monthlyAmount = Math.max(0, feeStructure.amount - scholarshipAmount);

      // Create assignment
      const assignment = await StudentFeeAssignment.create({
        instituteId,
        studentId,
        feeStructureId,
        admissionDate,
        feeCycleDay,
        monthlyAmount,
        scholarshipPercent,
        totalMonths,
        startMonth: startInfo.month,
        endMonth: endInfo.month,
        status: "active",
      });

      // Auto-generate monthly payment records
      const payments = await Promise.all(
        dueDates.map(async (dueDate) => {
          const info = getMonthInfo(dueDate);
          return Payment.create({
            instituteId,
            studentId,
            feeStructureId,
            assignmentId: assignment._id,
            originalAmount: feeStructure.amount,
            scholarshipPercent,
            scholarshipAmount,
            amount: monthlyAmount,
            lateFee: 0,
            totalAmount: monthlyAmount,
            paidAmount: 0,
            dueDate,
            month: info.month,
            monthLabel: info.label,
            status: "pending",
          });
        })
      );

      res.status(201).json({
        assignment: await fmtAssignment(assignment),
        paymentsGenerated: payments.length,
        firstDueDate: dueDates[0],
        lastDueDate: dueDates[dueDates.length - 1],
      });
    } catch (error: any) {
      console.error("FEE ASSIGNMENT ERROR:", error);
      res.status(500).json({ error: error?.message ?? "Unable to assign fee" });
    }
  }
);

router.get(
  "/finance/fee-assignments",
  authenticate,
  authorize("super_admin", "institute_admin", "accountant"),
  async (req, res): Promise<void> => {
    const user = getLoggedInUser(req);
    const instituteId = getInstituteIdForUser(req);
    const { studentId } = req.query as Record<string, string>;
    const filter: any = {};
    if (user.role !== "super_admin") {
      if (!instituteId) {
        res.status(403).json({ error: "Not linked" });
        return;
      }
      filter.instituteId = instituteId;
    }
    if (studentId) filter.studentId = studentId;
    const list = await StudentFeeAssignment.find(filter).sort({ createdAt: -1 });
    res.json(await Promise.all(list.map(fmtAssignment)));
  }
);

router.delete(
  "/finance/fee-assignments/:id",
  authenticate,
  authorize("super_admin", "institute_admin"),
  async (req, res): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const user = getLoggedInUser(req);
      const instituteId = getInstituteIdForUser(req);
      const filter: any = { _id: id };
      if (user.role !== "super_admin") {
        if (!instituteId) {
          res.status(403).json({ error: "Not linked" });
          return;
        }
        filter.instituteId = instituteId;
      }
      const assignment = await StudentFeeAssignment.findOne(filter);
      if (!assignment) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      // Delete pending payments only (keep paid history)
      await Payment.deleteMany({
        assignmentId: assignment._id,
        status: { $in: ["pending", "overdue"] },
      });
      await StudentFeeAssignment.deleteOne({ _id: assignment._id });
      res.sendStatus(204);
    } catch (error: any) {
      res.status(500).json({ error: error?.message });
    }
  }
);

// ============================================================
// STUDENT PORTAL — My Fee Payments
// ============================================================
router.get(
  "/finance/my-payments",
  authenticate,
  authorize("student", "parent"),
  async (req, res): Promise<void> => {
    try {
      const studentId = req.user!.userId;

      const payments = await Payment.find({
        studentId,
      }).sort({ dueDate: 1 });

      // Auto update overdue
      for (const payment of payments) {
        if (payment.status === "pending" && isOverdue(payment.dueDate)) {
          payment.status = "overdue";
          await payment.save();
        }
      }

      const updated = await Payment.find({
        studentId,
      }).sort({ dueDate: 1 });

      res.json(await Promise.all(updated.map(fmtPayment)));
    } catch (error: any) {
      res.status(500).json({
        error: error?.message ?? "Unable to load student fee payments",
      });
    }
  }
);

// ============================================================
// PAYMENTS
// ============================================================
router.get(
  "/finance/payments",
  authenticate,
  authorize("super_admin", "institute_admin", "accountant"),
  async (req, res): Promise<void> => {
    const { studentId, status, month } = req.query as Record<string, string>;
    const user = getLoggedInUser(req);
    const instituteId = getInstituteIdForUser(req);
    const filter: any = {};
    if (user.role !== "super_admin") {
      if (!instituteId) {
        res.status(403).json({ error: "Not linked" });
        return;
      }
      filter.instituteId = instituteId;
    }
    if (studentId) filter.studentId = studentId;
    if (status) filter.status = status;
    if (month) filter.month = month;

    // 🔥 Auto update overdue status
    const allPayments = await Payment.find(filter).sort({ dueDate: 1 });
    for (const p of allPayments) {
      if (p.status === "pending" && isOverdue(p.dueDate)) {
        p.status = "overdue";
        await p.save();
      }
    }

    const updated = await Payment.find(filter).sort({ dueDate: 1 });
    res.json(await Promise.all(updated.map(fmtPayment)));
  }
);

router.post(
  "/finance/payments",
  authenticate,
  authorize("super_admin", "institute_admin", "accountant"),
  async (req, res): Promise<void> => {
    try {
      const user = getLoggedInUser(req);
      let instituteId = getInstituteIdForUser(req);

      if (user.role === "super_admin") {
        // Super Admin ke liye student se instituteId nikalo
        const student = await Student.findById(req.body.studentId);

        if (!student) {
          res.status(400).json({ error: "Student not found" });
          return;
        }

        instituteId = String(student.instituteId);
      }

      if (!instituteId) {
        res.status(400).json({
          error: "Could not determine institute. Please select a valid student.",
        });
        return;
      }

      const {
        studentId,
        feeStructureId,
        amount,
        dueDate,
        month,
        installment,
        scholarshipPercent = 0,
        paymentMethod,
      } = req.body;

      const student = await Student.findOne({ _id: studentId, instituteId });

      if (!student) {
        res.status(400).json({ error: "Student not found in this institute" });
        return;
      }

      const fs = await FeeStructure.findOne({ _id: feeStructureId, instituteId });

      if (!fs) {
        res.status(400).json({ error: "Fee structure not found in this institute" });
        return;
      }

      const originalAmount = Number(amount);
      const scholarshipAmount = Math.round((originalAmount * scholarshipPercent) / 100);
      const payableAmount = Math.max(0, originalAmount - scholarshipAmount);
      const lateFee = dueDate ? calculateLateFee(dueDate, fs.lateFeePerDay) : 0;
      const info = month ? { month, label: month } : getMonthInfo(dueDate);

      const payment = await Payment.create({
        instituteId,
        studentId,
        feeStructureId,
        originalAmount,
        scholarshipPercent,
        scholarshipAmount,
        amount: payableAmount,
        lateFee,
        totalAmount: payableAmount + lateFee,
        dueDate,
        month: info.month,
        monthLabel: info.label,
        ...(installment ? { installment } : {}),
        paymentMethod,
        status: "pending",
      });

      res.status(201).json(await fmtPayment(payment));
    } catch (error: any) {
      console.error("PAYMENT CREATE ERROR:", error);
      res.status(500).json({
        error: error?.message ?? "Unable to create payment",
      });
    }
  }
);

/**
 * PATCH /finance/payments/:id
 * ---------------------------
 * Mark payment as paid / update fields
 */
router.patch(
  "/finance/payments/:id",
  authenticate,
  authorize("super_admin", "institute_admin", "accountant"),
  async (req, res): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const user = getLoggedInUser(req);
      const instituteId = getInstituteIdForUser(req);
      const filter: any = { _id: id };
      if (user.role !== "super_admin") {
        if (!instituteId) {
          res.status(403).json({ error: "Not linked" });
          return;
        }
        filter.instituteId = instituteId;
      }
      const existing = await Payment.findOne(filter);
      if (!existing) {
        res.status(404).json({ error: "Payment not found" });
        return;
      }
      if (existing.status === "paid" || existing.status === "partial" ||
          ["paid", "partial"].includes(String(req.body?.status ?? ""))) {
        res.status(409).json({ error: "Use the verified fee collection workflow to record payments. Paid/partial bills cannot be edited here." });
        return;
      }
      if (await FeePaymentApproval.exists({ paymentId: existing._id, status: "pending" })) {
        res.status(409).json({ error: "An admin approval is pending for this bill. Resolve it before editing." });
        return;
      }
      const updateData = { ...req.body };
      for (const protectedKey of [
        "paidAmount", "lateFee", "totalAmount", "paidDate", "receivedAt",
        "recordedAt", "collectedBy", "backdateReason", "supportingReference",
      ]) delete updateData[protectedKey];
      delete updateData.instituteId;
      delete updateData.studentId;
      delete updateData.feeStructureId;
      delete updateData.receiptNo;

      if (
        updateData.installment === "" ||
        updateData.installment === null
      ) {
        delete updateData.installment;
      }

      if (
        updateData.paymentMethod === "" ||
        updateData.paymentMethod === null
      ) {
        delete updateData.paymentMethod;
      }

      // Recalculate late fee if marking pending
      if (updateData.status === "paid" && !updateData.paidDate) {
        updateData.paidDate = new Date().toISOString().split("T")[0];
        updateData.paidAmount = existing.totalAmount;
      }
      if (updateData.status === "partial" && updateData.paidAmount) {
        updateData.paidAmount = Number(updateData.paidAmount);
      }

      const payment = await Payment.findOneAndUpdate(filter, updateData, {
        returnDocument: "after",
        runValidators: true,
      });
      if (!payment) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json(await fmtPayment(payment));
    } catch (error: any) {
      console.error("PAYMENT UPDATE ERROR:", error);
      res.status(500).json({ error: error?.message ?? "Unable to update" });
    }
  }
);

/** GET /finance/payments/:id/quote?receivedDate=YYYY-MM-DD — read-only, authoritative preview */
router.get("/finance/payments/:id/quote", authenticate,
  authorize("super_admin", "institute_admin", "accountant"), async (req, res): Promise<void> => {
  try {
    const user = getLoggedInUser(req);
    const instituteId = getInstituteIdForUser(req);
    if (user.role !== "super_admin" && !instituteId) { res.status(403).json({ error: "Not linked" }); return; }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const payment = await Payment.findOne({ _id: id, ...(user.role === "super_admin" ? {} : { instituteId }) });
    if (!payment) { res.status(404).json({ error: "Bill not found" }); return; }
    if (!["pending", "overdue"].includes(payment.status) || Number(payment.paidAmount || 0) > 0) {
      res.status(409).json({ error: "Only unpaid bills can be fully collected here" }); return;
    }
    const receivedDate = ensureValidReceivedDate(req.query.receivedDate);
    if (!receivedDate) { res.status(400).json({ error: "Choose a valid payment received date, not in the future" }); return; }
    const fs = await FeeStructure.findOne({ _id: payment.feeStructureId, instituteId: payment.instituteId });
    const quote = paymentQuote(payment, Number(fs?.lateFeePerDay || 0), receivedDate);
    res.json({ paymentId: String(payment._id), ...quote, approvalRequired: quote.needsApproval && user.role === "accountant" });
  } catch (error: any) {
    res.status(500).json({ error: "Unable to calculate fee quote" });
  }
});

/** POST /finance/payments/:id/pay — validated full settlement or approval request */
router.post("/finance/payments/:id/pay", authenticate,
  authorize("super_admin", "institute_admin", "accountant"), async (req, res): Promise<void> => {
  try {
    const user = getLoggedInUser(req);
    const instituteId = getInstituteIdForUser(req);
    if (user.role !== "super_admin" && !instituteId) { res.status(403).json({ error: "Not linked" }); return; }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const payment = await Payment.findOne({ _id: id, ...(user.role === "super_admin" ? {} : { instituteId }) });
    if (!payment) { res.status(404).json({ error: "Bill not found" }); return; }
    if (!["pending", "overdue"].includes(payment.status) || Number(payment.paidAmount || 0) > 0) {
      res.status(409).json({ error: "Bill has already been settled or partially paid" }); return;
    }
    const receivedDate = ensureValidReceivedDate(req.body?.receivedDate);
    if (!receivedDate) { res.status(400).json({ error: "Invalid payment received date; future date is not allowed" }); return; }
    const paymentMethod = req.body?.paymentMethod;
    if (!validMethod(paymentMethod)) { res.status(400).json({ error: "Select a valid payment method" }); return; }
    const transactionId = String(req.body?.transactionId ?? "").trim();
    const remarks = String(req.body?.remarks ?? "").trim().slice(0, 1000);
    const reason = String(req.body?.backdateReason ?? "").trim().slice(0, 1000);
    const supportingReference = String(req.body?.supportingReference ?? "").trim().slice(0, 200);
    if (paymentMethod !== "cash" && !transactionId) {
      res.status(400).json({ error: "UPI/bank/cheque reference is required" }); return;
    }
    const fs = await FeeStructure.findOne({ _id: payment.feeStructureId, instituteId: payment.instituteId });
    const quote = paymentQuote(payment, Number(fs?.lateFeePerDay || 0), receivedDate);
    const expectedTotal = Number(req.body?.expectedTotal);
    if (req.body?.expectedTotal !== undefined && (!Number.isFinite(expectedTotal) || Math.abs(expectedTotal - quote.totalPayable) > 0.009)) {
      res.status(409).json({ error: "Fee amount changed. Refresh the preview before confirming." }); return;
    }
    if (quote.needsApproval && reason.length < 10) {
      res.status(400).json({ error: "Backdated entry requires a reason of at least 10 characters" }); return;
    }
    if (quote.needsApproval && supportingReference.length < 3) {
      res.status(400).json({ error: "Backdated payment requires a register/receipt number or verifiable payment reference" }); return;
    }
    if (quote.needsApproval && user.role === "accountant") {
      const existing = await FeePaymentApproval.findOne({ paymentId: payment._id, status: "pending" });
      if (existing) { res.status(409).json({ error: "A backdated approval request for this bill is already pending" }); return; }
      const request = await FeePaymentApproval.create({
        instituteId: payment.instituteId, paymentId: payment._id, requestedBy: user.userId,
        receivedDate, paymentMethod, transactionId, remarks, reason, supportingReference,
        expectedTotal: quote.totalPayable, status: "pending",
      });
      try { await recordAudit(req, "fee.backdate.request", "payment", String(payment._id), {
        approvalRequestId: String(request._id), receivedDate, reason, supportingReference, expectedTotal: quote.totalPayable,
      }); } catch (auditError) { console.error("Fee audit log error:", auditError); }
      res.status(202).json({ approvalRequired: true, status: "pending", requestId: String(request._id), message: "Sent for admin approval. Bill is not paid yet." });
      return;
    }
    if (await FeePaymentApproval.exists({ paymentId: payment._id, status: "pending" })) {
      res.status(409).json({ error: "A backdated payment approval is pending. Resolve it before another payment." }); return;
    }
    const settled = await settleFullBill(payment, quote, {
      paymentMethod, transactionId, remarks, reason, supportingReference, userId: String(user.userId),
    });
    if (!settled) { res.status(409).json({ error: "Payment was already recorded or bill changed. Reload." }); return; }
    try { await recordAudit(req, "fee.payment.collect", "payment", String(payment._id), {
      amount: quote.totalPayable, lateFee: quote.lateFee, receivedDate, supportingReference,
      recordedAt: new Date().toISOString(), backdateReason: reason || null,
    }); } catch (auditError) { console.error("Fee audit log error:", auditError); }
    res.json(await fmtPayment(settled));
  } catch (error: any) {
    if (error?.code === 11000) { res.status(409).json({ error: "A pending approval request already exists" }); return; }
    console.error("FEE PAY ERROR:", error);
    res.status(500).json({ error: "Unable to record fee payment" });
  }
});

/** Pending requests are visible to an institute admin (and to the requesting accountant). */
router.get("/finance/backdated-payments", authenticate,
  authorize("super_admin", "institute_admin", "accountant"), async (req, res): Promise<void> => {
  try {
    const user = getLoggedInUser(req);
    const instituteId = getInstituteIdForUser(req);
    if (user.role !== "super_admin" && !instituteId) { res.status(403).json({ error: "Not linked" }); return; }
    const filter: any = { status: "pending" };
    if (user.role !== "super_admin") filter.instituteId = instituteId;
    if (user.role === "accountant") filter.requestedBy = user.userId;
    const approvals = await FeePaymentApproval.find(filter).sort({ requestedAt: -1 }).limit(100).lean();
    const paymentIds = approvals.map((entry) => entry.paymentId);
    const bills = await Payment.find({ _id: { $in: paymentIds } }).select("studentId month dueDate status").lean();
    const billById = new Map(bills.map((bill) => [String(bill._id), bill]));
    const studentIds = bills.map((bill) => bill.studentId);
    const students = await Student.find({ _id: { $in: studentIds } }).select("name enrollmentNo").lean();
    const studentById = new Map(students.map((student) => [String(student._id), student]));
    res.json(approvals.map((entry) => {
      const bill = billById.get(String(entry.paymentId));
      const student = bill ? studentById.get(String(bill.studentId)) : null;
      return {
        id: String(entry._id), paymentId: String(entry.paymentId), status: entry.status,
        studentName: student?.name ?? "Student", studentEnrollmentNo: student?.enrollmentNo ?? "",
        month: bill?.month ?? "", billStatus: bill?.status ?? "",
        receivedDate: entry.receivedDate, paymentMethod: entry.paymentMethod,
        transactionId: entry.transactionId ?? "", reason: entry.reason,
        remarks: entry.remarks ?? "", supportingReference: entry.supportingReference, expectedTotal: entry.expectedTotal,
        requestedAt: entry.requestedAt, requestedBy: String(entry.requestedBy),
      };
    }));
  } catch (error: any) {
    res.status(500).json({ error: "Unable to load approvals" });
  }
});

router.post("/finance/backdated-payments/:id/review", authenticate,
  authorize("super_admin", "institute_admin"), async (req, res): Promise<void> => {
  try {
    const user = getLoggedInUser(req);
    const instituteId = getInstituteIdForUser(req);
    if (user.role !== "super_admin" && !instituteId) { res.status(403).json({ error: "Not linked" }); return; }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const action = String(req.body?.action ?? "");
    const reviewNote = String(req.body?.reviewNote ?? "").trim().slice(0, 1000);
    if (!["approve", "reject"].includes(action)) {
      res.status(400).json({ error: "Choose approve or reject" }); return;
    }
    const request = await FeePaymentApproval.findOne({ _id: id, status: "pending", ...(user.role === "super_admin" ? {} : { instituteId }) });
    if (!request) { res.status(404).json({ error: "Pending request not found" }); return; }
    if (String(request.requestedBy) === String(user.userId)) {
      res.status(403).json({ error: "You cannot approve your own backdated request" }); return;
    }
    if (action === "reject") {
      const updated = await FeePaymentApproval.findOneAndUpdate({ _id: request._id, status: "pending" }, {
        $set: { status: "rejected", reviewedBy: user.userId, reviewedAt: new Date(), reviewNote },
      }, { returnDocument: "after" });
      if (!updated) { res.status(409).json({ error: "Request already reviewed" }); return; }
      try { await recordAudit(req, "fee.backdate.reject", "payment", String(request.paymentId), { requestId: id, reviewNote }); } catch (auditError) { console.error("Fee audit log error:", auditError); }
      res.json({ status: "rejected" }); return;
    }
    const payment = await Payment.findOne({ _id: request.paymentId, instituteId: request.instituteId });
    if (!payment || !["pending", "overdue"].includes(payment.status) || Number(payment.paidAmount || 0) > 0) {
      res.status(409).json({ error: "Bill is no longer unpaid" }); return;
    }
    const fs = await FeeStructure.findOne({ _id: payment.feeStructureId, instituteId: payment.instituteId });
    const quote = paymentQuote(payment, Number(fs?.lateFeePerDay || 0), request.receivedDate);
    if (Math.abs(quote.totalPayable - request.expectedTotal) > 0.009) {
      res.status(409).json({ error: "Fee configuration changed. Reject and ask accountant to resubmit." }); return;
    }
    // Claim request before settlement to prevent simultaneous approvals.
    const claimed = await FeePaymentApproval.findOneAndUpdate({ _id: request._id, status: "pending" }, {
      $set: { status: "approved", reviewedBy: user.userId, reviewedAt: new Date(), reviewNote },
    }, { returnDocument: "after" });
    if (!claimed) { res.status(409).json({ error: "Request already reviewed" }); return; }
    const settled = await settleFullBill(payment, quote, {
      paymentMethod: request.paymentMethod, transactionId: request.transactionId,
      remarks: request.remarks, reason: request.reason, supportingReference: request.supportingReference, userId: String(request.requestedBy),
    });
    if (!settled) {
      await FeePaymentApproval.updateOne({ _id: claimed._id, status: "approved" }, {
        $set: { status: "rejected", reviewNote: "Automatic reversal: bill modified during approval." },
      });
      res.status(409).json({ error: "Bill was modified during approval; request has been rejected. Reload." }); return;
    }
    try { await recordAudit(req, "fee.backdate.approve", "payment", String(payment._id), {
      requestId: id, receivedDate: request.receivedDate, recordedAt: new Date().toISOString(),
      reason: request.reason, supportingReference: request.supportingReference, amount: quote.totalPayable, lateFee: quote.lateFee,
    }); } catch (auditError) { console.error("Fee audit log error:", auditError); }
    res.json({ status: "approved", payment: await fmtPayment(settled) });
  } catch (error: any) {
    console.error("BACKDATED PAYMENT REVIEW ERROR:", error);
    res.status(500).json({ error: "Unable to review request" });
  }
});

router.delete(
  "/finance/payments/:id",
  authenticate,
  authorize("super_admin", "institute_admin", "accountant"),
  async (req, res): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = getLoggedInUser(req);
    const instituteId = getInstituteIdForUser(req);
    const filter: any = { _id: id };
    if (user.role !== "super_admin") {
      if (!instituteId) {
        res.status(403).json({ error: "Not linked" });
        return;
      }
      filter.instituteId = instituteId;
    }
    const p = await Payment.findOne(filter);
    if (!p) { res.status(404).json({ error: "Not found" }); return; }
    if (p.status === "paid" || p.status === "partial" || Number(p.paidAmount || 0) > 0) {
      res.status(409).json({ error: "A bill with received payments cannot be deleted" }); return;
    }
    const activeApproval = await FeePaymentApproval.exists({ paymentId: p._id, status: "pending" });
    if (activeApproval) { res.status(409).json({ error: "Resolve the pending payment approval before deleting this bill" }); return; }
    await Payment.deleteOne({ _id: p._id, status: { $in: ["pending", "overdue"] } });
    res.sendStatus(204);
  }
);

// ============================================================
// EXPENSES
// ============================================================
router.get(
  "/finance/expenses",
  authenticate,
  authorize("super_admin", "institute_admin", "accountant"),
  async (req, res): Promise<void> => {
    const user = getLoggedInUser(req);
    const instituteId = getInstituteIdForUser(req);
    const { category, from, to } = req.query as Record<string, string>;
    const filter: any = {};
    if (user.role !== "super_admin") {
      if (!instituteId) {
        res.status(403).json({ error: "Not linked" });
        return;
      }
      filter.instituteId = instituteId;
    }
    if (category) filter.category = category;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }
    const list = await Expense.find(filter).sort({ date: -1 });
    res.json(list.map(fmtExpense));
  }
);

router.post(
  "/finance/expenses",
  authenticate,
  authorize("super_admin", "institute_admin", "accountant"),
  async (req, res): Promise<void> => {
    try {
      const user = getLoggedInUser(req);
      let instituteId = getInstituteIdForUser(req);
      if (user.role === "super_admin") {
        instituteId = req.body.instituteId ? String(req.body.instituteId) : null;
      }
      if (!instituteId) {
        res.status(400).json({ error: "instituteId required" });
        return;
      }
      const expense = await Expense.create({ ...req.body, instituteId });
      res.status(201).json(fmtExpense(expense));
    } catch (error: any) {
      res.status(500).json({ error: error?.message });
    }
  }
);

router.patch(
  "/finance/expenses/:id",
  authenticate,
  authorize("super_admin", "institute_admin", "accountant"),
  async (req, res): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const user = getLoggedInUser(req);
      const instituteId = getInstituteIdForUser(req);
      const filter: any = { _id: id };
      if (user.role !== "super_admin") {
        if (!instituteId) {
          res.status(403).json({ error: "Not linked" });
          return;
        }
        filter.instituteId = instituteId;
      }
      const updateData = { ...req.body };
      delete updateData.instituteId;
      const expense = await Expense.findOneAndUpdate(filter, updateData, { returnDocument: "after" });
      if (!expense) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json(fmtExpense(expense));
    } catch (error: any) {
      res.status(500).json({ error: error?.message });
    }
  }
);

router.delete(
  "/finance/expenses/:id",
  authenticate,
  authorize("super_admin", "institute_admin"),
  async (req, res): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = getLoggedInUser(req);
    const instituteId = getInstituteIdForUser(req);
    const filter: any = { _id: id };
    if (user.role !== "super_admin") {
      if (!instituteId) {
        res.status(403).json({ error: "Not linked" });
        return;
      }
      filter.instituteId = instituteId;
    }
    const e = await Expense.findOneAndDelete(filter);
    if (!e) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.sendStatus(204);
  }
);

// ============================================================
// SUMMARY / DASHBOARD
// ============================================================
router.get(
  "/finance/summary",
  authenticate,
  authorize("super_admin", "institute_admin", "accountant"),
  async (req, res): Promise<void> => {
    const { month } = req.query as Record<string, string>;
    const user = getLoggedInUser(req);
    const instituteId = getInstituteIdForUser(req);

    const filter: any = {};

    if (user.role !== "super_admin") {
      if (!instituteId) {
        res.status(403).json({ error: "Not linked" });
        return;
      }
      filter.instituteId = instituteId;
    }

    if (month) filter.month = month;

    // Today's date for due-date comparison
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const payments = await Payment.find(filter);
    const expenses = await Expense.find({
      ...(filter.instituteId ? { instituteId: filter.instituteId } : {}),
    });

    const studentsWithDue = new Set(
      payments
        .filter((p) => p.status !== "paid")
        .map((p) => String(p.studentId))
    ).size;

    // 1. Total Revenue = paid fees
    const totalRevenue = payments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.totalAmount, 0);

    // 2. Current Due = pending fees jinki due date aa chuki hai (aaj tak)
    const currentDue = payments
      .filter(
        (p) =>
          (p.status === "pending" || p.status === "overdue") &&
          p.dueDate <= today
      )
      .reduce((sum, p) => sum + p.totalAmount, 0);

    // 3. Overdue = due date nikal chuki, pay nahi hui
    const totalOverdue = payments
      .filter(
        (p) =>
          (p.status === "overdue" ||
            (p.status === "pending" && p.dueDate < today))
      )
      .reduce((sum, p) => sum + p.totalAmount, 0);

    // 4. Total Outstanding = poore saal ki saari baaki fees (future included)
    const totalOutstanding = payments
      .filter((p) => p.status !== "paid")
      .reduce((sum, p) => sum + p.totalAmount, 0);

    // 5. Upcoming = future me aane wali fees (due date abhi nahi aayi)
    const upcomingFees = payments
      .filter((p) => p.status === "pending" && p.dueDate > today)
      .reduce((sum, p) => sum + p.totalAmount, 0);

    // 6. Total Expenses
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // 7. Net Income = revenue - expenses
    const netIncome = totalRevenue - totalExpenses;

    // 8. Collection Rate = paid bills / total bills
    const total = payments.length || 1;
    const paid = payments.filter((p) => p.status === "paid").length;

    res.json({
      totalRevenue,
      currentDue,
      totalOverdue,
      totalOutstanding,
      upcomingFees,
      totalExpenses,
      netIncome,
      studentsWithDue,
      collectionRate: Math.round((paid / total) * 100),
      paymentsByStatus: {
        paid,
        pending: payments.filter((p) => p.status === "pending").length,
        overdue: payments.filter((p) => p.status === "overdue").length,
      },
    });
  }
);

/**
 * GET /finance/overdue-students
 * ----------------------------
 * List of students with overdue fees
 */
router.get(
  "/finance/overdue-students",
  authenticate,
  authorize("super_admin", "institute_admin", "accountant"),
  async (req, res): Promise<void> => {
    const user = getLoggedInUser(req);
    const instituteId = getInstituteIdForUser(req);
    const filter: any = { status: { $in: ["overdue", "pending"] } };
    if (user.role !== "super_admin") {
      if (!instituteId) {
        res.status(403).json({ error: "Not linked" });
        return;
      }
      filter.instituteId = instituteId;
    }

    // Auto-update overdue status first
    const pendings = await Payment.find(filter);
    for (const p of pendings) {
      if (p.status === "pending" && isOverdue(p.dueDate)) {
        p.status = "overdue";
        await p.save();
      }
    }

    const overdue = await Payment.find({ ...filter, status: "overdue" }).sort({ dueDate: 1 });
    res.json(await Promise.all(overdue.map(fmtPayment)));
  }
);

// ============================================================
// MANUAL CRON TRIGGER (For testing)
// ============================================================
router.post(
  "/finance/run-overdue-check",
  authenticate,
  authorize("super_admin", "institute_admin"),
  async (_req, res): Promise<void> => {
    try {
      const result = await runOverdueCheckNow();
      res.json({
        success: true,
        message: "Overdue check completed",
        ...result,
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message });
    }
  }
);


export default router;