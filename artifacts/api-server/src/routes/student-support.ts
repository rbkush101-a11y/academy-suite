import { Router, type IRouter, type Request, type Response } from "express";
import mongoose from "mongoose";
import { authenticate } from "../middlewares/auth";
import { authorizePlatform } from "../lib/platform-rbac";
import { Student } from "../models/Student";
import { UserSession } from "../models/UserSession";
import { signToken } from "../lib/jwt";
import { recordAudit, recordPlatformAudit } from "../lib/foundation";
import { getRequestIp, getUserAgent, getDeviceName, getDeviceType } from "../lib/auth-security";

const router: IRouter = Router();

const SUPPORT_SESSION_MINUTES = 15;

function cleanReason(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 240) : "";
}

function cleanId(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function createReadOnlyStudentSupportSession(
  req: Request,
  res: Response,
  options: { platform: boolean },
): Promise<void> {
  try {
    const actor = req.user!;
    const studentId = cleanId(req.body?.studentId);
    const reason = cleanReason(req.body?.reason);

    if (!mongoose.isValidObjectId(studentId)) {
      res.status(400).json({ error: "A valid student is required." });
      return;
    }

    if (reason.length < 5) {
      res.status(400).json({ error: "Please enter a short support reason (minimum 5 characters)." });
      return;
    }

    const studentFilter: Record<string, unknown> = {
      _id: studentId,
      status: "active",
    };

    if (!options.platform) {
      if (actor.role !== "institute_admin" || !actor.instituteId) {
        res.status(403).json({ error: "Only the institute owner/admin can start Student Support Mode." });
        return;
      }
      studentFilter.instituteId = actor.instituteId;
    } else if (actor.role !== "super_admin") {
      res.status(403).json({ error: "Only SUPER_ADMIN can start cross-institute Student Support Mode." });
      return;
    }

    const student = await Student.findOne(studentFilter).select(
      "name email enrollmentNo instituteId batchId courseId status",
    );

    if (!student) {
      res.status(404).json({ error: "Active student not found in your allowed scope." });
      return;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + SUPPORT_SESSION_MINUTES * 60 * 1000);
    const userAgent = getUserAgent(req);

    // Revoke older support sessions created by this same admin so only the latest one is active.
    await UserSession.updateMany(
      {
        supportMode: true,
        supportActorId: actor.userId,
        revokedAt: null,
        expiresAt: { $gt: now },
      },
      {
        $set: {
          revokedAt: now,
          revokeReason: "support_session_replaced",
        },
      },
    );

    const supportSession = await UserSession.create({
      userId: String(student._id),
      principalType: "student",
      instituteId: student.instituteId,
      role: "student",
      ipAddress: getRequestIp(req),
      userAgent,
      deviceName: `Support Mode · ${getDeviceName(userAgent)}`,
      deviceType: getDeviceType(userAgent),
      lastLoginAt: now,
      lastSeenAt: now,
      expiresAt,
      supportMode: true,
      supportActorId: actor.userId,
      supportActorRole: actor.role,
      supportReason: reason,
    });

    const supportToken = signToken({
      userId: String(student._id),
      email: student.email ?? "",
      role: "student",
      instituteId: String(student.instituteId),
      activeBranchId: null,
      customRoleId: null,
      sessionId: String(supportSession._id),
    });

    const details = {
      reason,
      supportSessionId: String(supportSession._id),
      expiresAt: expiresAt.toISOString(),
      readOnly: true,
      studentName: student.name,
      studentEnrollmentNo: student.enrollmentNo,
      studentInstituteId: String(student.instituteId),
    };

    if (options.platform) {
      await recordPlatformAudit(
        req,
        "student.support.start",
        "student",
        String(student._id),
        details,
      );
    } else {
      await recordAudit(
        req,
        "student.support.start",
        "student",
        String(student._id),
        details,
      );
    }

    res.json({
      token: supportToken,
      sessionId: String(supportSession._id),
      expiresAt: expiresAt.toISOString(),
      readOnly: true,
      student: {
        id: String(student._id),
        name: student.name,
        enrollmentNo: student.enrollmentNo,
        instituteId: String(student.instituteId),
        batchId: student.batchId ? String(student.batchId) : null,
        courseId: student.courseId ? String(student.courseId) : null,
      },
    });
  } catch (error: any) {
    console.error("Student support start error:", error);
    res.status(500).json({ error: error?.message || "Unable to start Student Support Mode." });
  }
}

async function endReadOnlyStudentSupportSession(
  req: Request,
  res: Response,
  options: { platform: boolean },
): Promise<void> {
  try {
    const actor = req.user!;
    const sessionId = cleanId(req.body?.sessionId);

    if (!mongoose.isValidObjectId(sessionId)) {
      res.status(400).json({ error: "A valid support session is required." });
      return;
    }

    if (!options.platform) {
      if (actor.role !== "institute_admin" || !actor.instituteId) {
        res.status(403).json({ error: "Only the institute owner/admin can end this support session." });
        return;
      }
    } else if (actor.role !== "super_admin") {
      res.status(403).json({ error: "Only SUPER_ADMIN can end this platform support session." });
      return;
    }

    const session = await UserSession.findOne({
      _id: sessionId,
      supportMode: true,
      supportActorId: actor.userId,
    });

    if (!session) {
      res.status(404).json({ error: "Support session not found." });
      return;
    }

    if (!options.platform && String(session.instituteId || "") !== String(actor.instituteId || "")) {
      res.status(403).json({ error: "This support session belongs to another institute." });
      return;
    }

    if (!session.revokedAt) {
      session.revokedAt = new Date();
      session.revokeReason = "support_mode_exit";
      await session.save();
    }

    const details = {
      supportSessionId: String(session._id),
      reason: session.supportReason || "",
      studentId: session.userId,
    };

    if (options.platform) {
      await recordPlatformAudit(
        req,
        "student.support.end",
        "student",
        session.userId,
        details,
      );
    } else {
      await recordAudit(
        req,
        "student.support.end",
        "student",
        session.userId,
        details,
      );
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Student support end error:", error);
    res.status(500).json({ error: error?.message || "Unable to end Student Support Mode." });
  }
}

// Institute owner/admin: can view students only inside their own institute.
router.post(
  "/student-support/start",
  authenticate,
  async (req, res) => createReadOnlyStudentSupportSession(req, res, { platform: false }),
);

router.post(
  "/student-support/end",
  authenticate,
  async (req, res) => endReadOnlyStudentSupportSession(req, res, { platform: false }),
);

// Platform owner: SUPER_ADMIN can support students across institutes.
router.post(
  "/v1/platform/student-support/start",
  authenticate,
  authorizePlatform("platform.support.create"),
  async (req, res) => createReadOnlyStudentSupportSession(req, res, { platform: true }),
);

router.post(
  "/v1/platform/student-support/end",
  authenticate,
  authorizePlatform("platform.support.update"),
  async (req, res) => endReadOnlyStudentSupportSession(req, res, { platform: true }),
);

export default router;
