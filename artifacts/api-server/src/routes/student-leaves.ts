import { Router, type IRouter } from "express";
import { Types } from "mongoose";
import { authenticate } from "../middlewares/auth";
import { ParentFamily } from "../models/ParentFamily";
import { Student } from "../models/Student";
import { StudentLeave } from "../models/StudentLeave";
import { User } from "../models/User";

const router: IRouter = Router();

const text = (value: unknown) => String(value ?? "").trim();

async function getAuthorizedParentChild(req: any, studentId: string) {
  if (!req.user || req.user.role !== "parent") {
    return { error: "Parent account required.", status: 403 } as const;
  }

  if (!Types.ObjectId.isValid(studentId)) {
    return { error: "Invalid student ID.", status: 400 } as const;
  }

  const parent = await User.findById(req.user.userId || req.user.id || req.user._id)
    .select("role instituteId isApproved linkedStudentIds parentFamilyId")
    .lean();

  if (!parent || parent.role !== "parent" || !parent.isApproved) {
    return { error: "Active parent account required.", status: 403 } as const;
  }

  if (!parent.instituteId) {
    return { error: "Parent account is not linked to an institute.", status: 400 } as const;
  }

  const linked = new Set(
    ((parent as any).linkedStudentIds || [])
      .map((id: unknown) => String(id || ""))
      .filter(Boolean),
  );

  if ((parent as any).parentFamilyId) {
    const family = await ParentFamily.findOne({
      _id: (parent as any).parentFamilyId,
      instituteId: parent.instituteId,
    })
      .select("studentIds")
      .lean();

    for (const id of (family as any)?.studentIds || []) {
      linked.add(String(id));
    }
  }

  if (!linked.has(studentId)) {
    return { error: "This student is not linked to this parent account.", status: 403 } as const;
  }

  const student = await Student.findOne({
    _id: studentId,
    instituteId: parent.instituteId,
    status: { $ne: "inactive" },
  })
    .select("_id name enrollmentNo className section instituteId")
    .lean();

  if (!student) {
    return { error: "Student not found or inactive.", status: 404 } as const;
  }

  return { parent, student } as const;
}

router.get(
  "/parent/children/:studentId/leaves",
  authenticate,
  async (req: any, res): Promise<void> => {
    try {
      const auth = await getAuthorizedParentChild(req, String(req.params.studentId || ""));
      if ("error" in auth) {
        res.status(auth.status ?? 403).json({ error: auth.error });
        return;
      }

      const leaves = await StudentLeave.find({
        instituteId: auth.parent.instituteId,
        studentId: auth.student._id,
      })
        .sort({ createdAt: -1 })
        .lean();

      res.json({
        leaves: leaves.map((leave: any) => ({
          id: String(leave._id),
          fromDate: leave.fromDate,
          toDate: leave.toDate,
          reason: leave.reason,
          status: leave.status,
          adminRemark: leave.adminRemark || "",
          createdAt: leave.createdAt,
          updatedAt: leave.updatedAt,
        })),
      });
    } catch (error: any) {
      console.error("Student leave list error:", error);
      res.status(500).json({ error: error?.message || "Unable to load leave requests." });
    }
  },
);

router.post(
  "/parent/children/:studentId/leaves",
  authenticate,
  async (req: any, res): Promise<void> => {
    try {
      const studentId = String(req.params.studentId || "");
      const auth = await getAuthorizedParentChild(req, studentId);
      if ("error" in auth) {
        res.status(auth.status ?? 403).json({ error: auth.error });
        return;
      }

      const fromDate = text(req.body?.fromDate);
      const toDate = text(req.body?.toDate);
      const reason = text(req.body?.reason);

      const isoDate = /^\d{4}-\d{2}-\d{2}$/;
      if (!isoDate.test(fromDate) || !isoDate.test(toDate)) {
        res.status(400).json({ error: "Valid From date and To date are required." });
        return;
      }

      const fromMs = new Date(`${fromDate}T00:00:00`).getTime();
      const toMs = new Date(`${toDate}T00:00:00`).getTime();
      if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs > toMs) {
        res.status(400).json({ error: "Invalid leave date range." });
        return;
      }

      const maxDays = 60;
      const days = Math.floor((toMs - fromMs) / 86400000) + 1;
      if (days > maxDays) {
        res.status(400).json({ error: `Leave request cannot exceed ${maxDays} days.` });
        return;
      }

      if (reason.length < 5) {
        res.status(400).json({ error: "Leave reason must be at least 5 characters." });
        return;
      }

      const overlapping = await StudentLeave.findOne({
        instituteId: auth.parent.instituteId,
        studentId: auth.student._id,
        status: { $in: ["pending", "approved"] },
        fromDate: { $lte: toDate },
        toDate: { $gte: fromDate },
      }).lean();

      if (overlapping) {
        res.status(409).json({
          error: "A pending or approved leave already exists for these dates.",
        });
        return;
      }

      const leave = await StudentLeave.create({
        instituteId: auth.parent.instituteId,
        studentId: auth.student._id,
        parentUserId: auth.parent._id,
        fromDate,
        toDate,
        reason,
        status: "pending",
      });

      res.status(201).json({
        message: "Leave request submitted successfully.",
        leave: {
          id: String(leave._id),
          fromDate: leave.fromDate,
          toDate: leave.toDate,
          reason: leave.reason,
          status: leave.status,
          adminRemark: leave.adminRemark || "",
          createdAt: leave.createdAt,
        },
      });
    } catch (error: any) {
      console.error("Student leave create error:", error);
      res.status(500).json({ error: error?.message || "Unable to submit leave request." });
    }
  },
);

router.get(
  "/parents/student-leaves",
  authenticate,
  async (req: any, res): Promise<void> => {
    try {
      if (!req.user || !["super_admin", "institute_admin"].includes(req.user.role)) {
        res.status(403).json({ error: "Institute admin account required." });
        return;
      }

      const instituteId =
        req.user.role === "super_admin"
          ? text(req.query.instituteId || req.user.instituteId)
          : text(req.user.instituteId);

      if (!Types.ObjectId.isValid(instituteId)) {
        res.status(400).json({ error: "Valid institute is required." });
        return;
      }

      const query: any = { instituteId: new Types.ObjectId(instituteId) };
      const status = text(req.query.status);
      const studentId = text(req.query.studentId);

      if (["pending", "approved", "rejected"].includes(status)) {
        query.status = status;
      }
      if (studentId && Types.ObjectId.isValid(studentId)) {
        query.studentId = new Types.ObjectId(studentId);
      }

      const leaves = await StudentLeave.find(query)
        .sort({ createdAt: -1 })
        .populate("studentId", "name enrollmentNo className section")
        .populate("parentUserId", "name phone email")
        .lean();

      res.json({ leaves });
    } catch (error: any) {
      console.error("Admin student leaves list error:", error);
      res.status(500).json({ error: error?.message || "Unable to load student leaves." });
    }
  },
);

router.patch(
  "/parents/student-leaves/:leaveId/status",
  authenticate,
  async (req: any, res): Promise<void> => {
    try {
      if (!req.user || !["super_admin", "institute_admin"].includes(req.user.role)) {
        res.status(403).json({ error: "Institute admin account required." });
        return;
      }

      const leaveId = text(req.params.leaveId);
      if (!Types.ObjectId.isValid(leaveId)) {
        res.status(400).json({ error: "Invalid leave request ID." });
        return;
      }

      const status = text(req.body?.status).toLowerCase();
      if (!["approved", "rejected"].includes(status)) {
        res.status(400).json({ error: "Status must be approved or rejected." });
        return;
      }

      const leave = await StudentLeave.findById(leaveId);
      if (!leave) {
        res.status(404).json({ error: "Leave request not found." });
        return;
      }

      const requestInstituteId = String(leave.instituteId);
      if (
        req.user.role !== "super_admin" &&
        String(req.user.instituteId || "") !== requestInstituteId
      ) {
        res.status(403).json({ error: "You cannot manage another institute's leave request." });
        return;
      }

      leave.status = status as "approved" | "rejected";
      leave.adminRemark = text(req.body?.adminRemark);
      leave.reviewedBy = new Types.ObjectId(req.user.userId || req.user.id || req.user._id);
      leave.reviewedAt = new Date();
      await leave.save();

      res.json({
        message: `Leave request ${status}.`,
        leave: {
          id: String(leave._id),
          status: leave.status,
          adminRemark: leave.adminRemark || "",
          reviewedAt: leave.reviewedAt,
        },
      });
    } catch (error: any) {
      console.error("Admin student leave review error:", error);
      res.status(500).json({ error: error?.message || "Unable to update leave request." });
    }
  },
);

export default router;
