import { Router, type IRouter } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { Salary, StaffSalaryAssignment } from "../models/Salary";
import { Staff } from "../models/Staff";
import {
  getCycleDay,
  generateDueDates,
  getMonthInfo,
  isOverdue,
} from "../lib/feeCycle";

const router: IRouter = Router();

// ============================================================
// HELPERS
// ============================================================
function getLoggedInUser(req: any) {
  return req.user;
}

function getInstituteIdForUser(req: any): string | null {
  const user = getLoggedInUser(req);
  if (user?.role === "super_admin") return null;
  return user?.instituteId ? String(user.instituteId) : null;
}

async function fmtSalary(s: any) {
  const staff = await Staff.findById(s.staffId).select("name role positionTitle");
  return {
    id: String(s._id),
    instituteId: s.instituteId ? String(s.instituteId) : null,
    staffId: String(s.staffId),
    staffName: staff?.name ?? null,
    staffRole: staff?.role ?? null,
    staffPosition: staff?.positionTitle ?? null,
    assignmentId: s.assignmentId ? String(s.assignmentId) : null,
    month: s.month,
    monthLabel: s.monthLabel,
    basicSalary: s.basicSalary,
    allowances: s.allowances ?? 0,
    bonus: s.bonus ?? 0,
    deductions: s.deductions ?? 0,
    netSalary: s.netSalary,
    dueDate: s.dueDate,
    paidDate: s.paidDate ?? null,
    status: s.status,
    paymentMethod: s.paymentMethod ?? null,
    transactionId: s.transactionId ?? null,
    remarks: s.remarks ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

async function fmtAssignment(a: any) {
  const staff = await Staff.findById(a.staffId).select("name role positionTitle");
  return {
    id: String(a._id),
    instituteId: String(a.instituteId),
    staffId: String(a.staffId),
    staffName: staff?.name ?? null,
    staffRole: staff?.role ?? null,
    staffPosition: staff?.positionTitle ?? null,
    joinDate: a.joinDate,
    salaryCycleDay: a.salaryCycleDay,
    basicSalary: a.basicSalary,
    allowances: a.allowances,
    status: a.status,
    createdAt: a.createdAt.toISOString(),
  };
}

// ============================================================
// 🔥 STAFF SALARY ASSIGNMENT (Dynamic Cycle) 🔥
// ============================================================

/**
 * POST /hr/salary-assignments
 * ---------------------------------
 * Assign salary cycle to staff & auto-generate monthly salary records
 * based on staff joining date.
 *
 * Body: { staffId, joinDate, basicSalary, allowances?, totalMonths? }
 */
router.post(
  "/hr/salary-assignments",
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

      const {
        staffId,
        joinDate,
        basicSalary,
        allowances = 0,
        totalMonths = 12,
      } = req.body;

      const staff = await Staff.findOne({ _id: staffId, instituteId });
      if (!staff) {
        res.status(400).json({ error: "Staff not found in institute" });
        return;
      }

      // Check duplicate assignment
      const existing = await StaffSalaryAssignment.findOne({ staffId });
      if (existing) {
        res.status(400).json({
          error: "Salary assignment already exists for this staff. Please update instead.",
        });
        return;
      }

      // ================= DYNAMIC CYCLE CALCULATION =================
      const salaryCycleDay = getCycleDay(joinDate);
      const dueDates = generateDueDates(joinDate, totalMonths);

      // Create assignment
      const assignment = await StaffSalaryAssignment.create({
        instituteId,
        staffId,
        joinDate,
        salaryCycleDay,
        basicSalary: Number(basicSalary),
        allowances: Number(allowances),
        status: "active",
      });

      // Auto-generate monthly salary records
      const salaries = await Promise.all(
        dueDates.map(async (dueDate) => {
          const info = getMonthInfo(dueDate);
          return Salary.create({
            instituteId,
            staffId,
            assignmentId: assignment._id,
            month: info.month,
            monthLabel: info.label,
            basicSalary: Number(basicSalary),
            allowances: Number(allowances),
            bonus: 0,
            deductions: 0,
            dueDate,
            status: "pending",
          });
        })
      );

      res.status(201).json({
        assignment: await fmtAssignment(assignment),
        salariesGenerated: salaries.length,
        firstDueDate: dueDates[0],
        lastDueDate: dueDates[dueDates.length - 1],
      });
    } catch (error: any) {
      console.error("SALARY ASSIGNMENT ERROR:", error);
      res.status(500).json({ error: error?.message ?? "Unable to assign salary" });
    }
  }
);

router.get(
  "/hr/salary-assignments",
  authenticate,
  authorize("super_admin", "institute_admin", "accountant"),
  async (req, res): Promise<void> => {
    const user = getLoggedInUser(req);
    const instituteId = getInstituteIdForUser(req);
    const { staffId } = req.query as Record<string, string>;
    const filter: any = {};
    if (user.role !== "super_admin") {
      if (!instituteId) {
        res.status(403).json({ error: "Not linked" });
        return;
      }
      filter.instituteId = instituteId;
    }
    if (staffId) filter.staffId = staffId;
    const list = await StaffSalaryAssignment.find(filter).sort({ createdAt: -1 });
    res.json(await Promise.all(list.map(fmtAssignment)));
  }
);

router.patch(
  "/hr/salary-assignments/:id",
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
      delete updateData.staffId;

      const assignment = await StaffSalaryAssignment.findOneAndUpdate(filter, updateData, {
        new: true,
      });
      if (!assignment) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      // Also update future pending salaries with new basic/allowances
      if (updateData.basicSalary || updateData.allowances !== undefined) {
        await Salary.updateMany(
          {
            assignmentId: assignment._id,
            status: "pending",
          },
          {
            ...(updateData.basicSalary ? { basicSalary: Number(updateData.basicSalary) } : {}),
            ...(updateData.allowances !== undefined
              ? { allowances: Number(updateData.allowances) }
              : {}),
          }
        );
      }

      res.json(await fmtAssignment(assignment));
    } catch (error: any) {
      res.status(500).json({ error: error?.message });
    }
  }
);

router.delete(
  "/hr/salary-assignments/:id",
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
      const assignment = await StaffSalaryAssignment.findOne(filter);
      if (!assignment) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      // Delete pending salaries only (keep paid history)
      await Salary.deleteMany({
        assignmentId: assignment._id,
        status: { $in: ["pending", "overdue"] },
      });
      await StaffSalaryAssignment.deleteOne({ _id: assignment._id });
      res.sendStatus(204);
    } catch (error: any) {
      res.status(500).json({ error: error?.message });
    }
  }
);

// ============================================================
// SALARIES (Monthly Records)
// ============================================================
router.get(
  "/hr/salaries",
  authenticate,
  authorize("super_admin", "institute_admin", "accountant"),
  async (req, res): Promise<void> => {
    const { staffId, month, status } = req.query as Record<string, string>;
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
    if (staffId) filter.staffId = staffId;
    if (month) filter.month = month;
    if (status) filter.status = status;

    // 🔥 Auto update overdue status
    const all = await Salary.find(filter);
    for (const s of all) {
      if (s.status === "pending" && isOverdue(s.dueDate)) {
        s.status = "overdue";
        await s.save();
      }
    }

    const salaries = await Salary.find(filter).sort({ dueDate: 1 });
    res.json(await Promise.all(salaries.map(fmtSalary)));
  }
);

router.post(
  "/hr/salaries",
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

      const body = { ...req.body, instituteId };
      if (body.dueDate && !body.month) {
        const info = getMonthInfo(body.dueDate);
        body.month = info.month;
        body.monthLabel = info.label;
      }

      const salary = await Salary.create(body);
      res.status(201).json(await fmtSalary(salary));
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to create salary" });
    }
  }
);

router.patch(
  "/hr/salaries/:id",
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

      const body = { ...req.body };
      delete body.instituteId;
      delete body.staffId;

      if (body.status === "paid" && !body.paidDate) {
        body.paidDate = new Date().toISOString().split("T")[0];
      }

      const salary = await Salary.findOneAndUpdate(filter, body, { new: true });
      if (!salary) {
        res.status(404).json({ error: "Salary record not found" });
        return;
      }
      res.json(await fmtSalary(salary));
    } catch (error: any) {
      res.status(500).json({ error: error?.message });
    }
  }
);

/**
 * POST /hr/salaries/:id/pay
 * -------------------------
 * Quick pay salary
 */
router.post(
  "/hr/salaries/:id/pay",
  authenticate,
  authorize("super_admin", "institute_admin", "accountant"),
  async (req, res): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { paymentMethod, transactionId, remarks, bonus, deductions } = req.body;
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
      const salary = await Salary.findOne(filter);
      if (!salary) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      if (bonus !== undefined) salary.bonus = Number(bonus);
      if (deductions !== undefined) salary.deductions = Number(deductions);
      salary.status = "paid";
      salary.paidDate = new Date().toISOString().split("T")[0];
      if (paymentMethod) salary.paymentMethod = paymentMethod;
      if (transactionId) salary.transactionId = transactionId;
      if (remarks) salary.remarks = remarks;

      await salary.save();
      res.json(await fmtSalary(salary));
    } catch (error: any) {
      res.status(500).json({ error: error?.message });
    }
  }
);

router.delete(
  "/hr/salaries/:id",
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
    const s = await Salary.findOneAndDelete(filter);
    if (!s) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.sendStatus(204);
  }
);

// ============================================================
// SALARY SUMMARY
// ============================================================
router.get(
  "/hr/salary-summary",
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

    const salaries = await Salary.find(filter);

    const totalPaid = salaries
      .filter((s) => s.status === "paid")
      .reduce((sum, s) => sum + s.netSalary, 0);
    const totalPending = salaries
      .filter((s) => s.status === "pending")
      .reduce((sum, s) => sum + s.netSalary, 0);
    const totalOverdue = salaries
      .filter((s) => s.status === "overdue")
      .reduce((sum, s) => sum + s.netSalary, 0);

    res.json({
      totalPaid,
      totalPending,
      totalOverdue,
      totalAmount: totalPaid + totalPending + totalOverdue,
      countByStatus: {
        paid: salaries.filter((s) => s.status === "paid").length,
        pending: salaries.filter((s) => s.status === "pending").length,
        overdue: salaries.filter((s) => s.status === "overdue").length,
      },
    });
  }
);

export default router;