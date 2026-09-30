import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../lib/jwt";
import { UserSession } from "../models/UserSession";
import { recordPlatformAudit, resolvePermission } from "../lib/foundation";
import { isPlatformRole } from "../lib/platform-rbac";
import { logger } from "../lib/logger";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = verifyToken(token);
    if (payload.sessionId) {
      const session = await UserSession.findOne({
        _id: payload.sessionId,
        userId: payload.userId,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      }).select("lastSeenAt branchId instituteId");
      if (!session) {
        res.status(401).json({ error: "This session has expired or was revoked. Please sign in again." });
        return;
      }
      const sessionBranchId = session.branchId ? String(session.branchId) : "";
      const tokenBranchId = payload.activeBranchId ?? "";
      const sessionInstituteId = session.instituteId ? String(session.instituteId) : "";
      const tokenInstituteId = payload.instituteId ?? "";
      if (sessionBranchId !== tokenBranchId || sessionInstituteId !== tokenInstituteId) {
        res.status(401).json({ error: "Your institute or branch context changed. Please sign in again." });
        return;
      }
      if (!session.lastSeenAt || Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
        void UserSession.updateOne({ _id: payload.sessionId }, { $set: { lastSeenAt: new Date() } }).catch(() => {});
      }
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

function permissionForRequest(req: Request): string | null {
  const path = req.originalUrl.split("?", 1)[0].replace(/^\/api\/?/, "");
  const segments = path.split("/").filter(Boolean);
  const first = segments[0] ?? "";
  const second = segments[1] ?? "";
  const module = first === "foundation"
    ? (second === "bootstrap" || second === "health" ? "foundation" : second === "active-branch" || second === "branch-context" ? "branches" : second === "institute" ? "settings" : second)
    : ["report-card", "exam-series", "tests", "my-exams"].includes(first) ? "exams"
      : first === "online-admissions" ? "admissions"
        : first === "homework" && segments.includes("submissions") ? "homework-submissions" : first;
  const actions: Record<string, string> = {
    GET: "view", HEAD: "view", POST: "create", PUT: "update", PATCH: "update", DELETE: "delete",
  };
  let action = actions[req.method.toUpperCase()];
  if (first === "batches" && segments.includes("students") && action === "create") action = "update";
  if (!action || !module) return null;
  return `${module}.${action}`;
}

export function authorize(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: "Forbidden: You do not have permission"
      });
      return;
    }

    const permission = permissionForRequest(req);
    if (permission) {
      const assigned = await resolvePermission(req.user.role, req.user.instituteId, req.user.customRoleId);
      if (assigned && !assigned.includes(permission)) {
        res.status(403).json({ error: "Forbidden: Your role does not have this permission" });
        return;
      }
    }

    // Keep audit coverage for platform owners using legacy institute modules.
    // New platform APIs and the foundation/institute admin APIs write richer events themselves.
    const path = req.originalUrl.split("?", 1)[0].replace(/^\/api\/?/, "");
    const method = req.method.toUpperCase();
    if (
      isPlatformRole(req.user.role) && ["POST", "PUT", "PATCH", "DELETE"].includes(method) &&
      !path.startsWith("v1/platform/") && !path.startsWith("institutes") && !path.startsWith("foundation/")
    ) {
      const segments = path.split("/").filter(Boolean);
      const targetType = segments[0] ?? "legacy_resource";
      const targetId = segments[1] && /^[a-f\d]{24}$/i.test(segments[1]) ? segments[1] : "";
      res.once("finish", () => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          void recordPlatformAudit(req, `platform.legacy.${targetType}.${method.toLowerCase()}`, targetType, targetId, {
            method,
            statusCode: res.statusCode,
          }).catch((error: unknown) => logger.error({ error, targetType, targetId }, "Failed to record platform audit event"));
        }
      });
    }

    next();
  };
}
