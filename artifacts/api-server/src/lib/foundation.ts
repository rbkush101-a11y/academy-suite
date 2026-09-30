import type { Request } from "express";
import { Types } from "mongoose";
import { AuditLog } from "../models/AuditLog";
import { UserSession } from "../models/UserSession";
import type { JwtPayload } from "./jwt";

export const PERMISSION_CATALOG = [
  { module: "foundation", label: "Foundation console", actions: ["view"] },
  { module: "institutes", label: "Institute administration", actions: ["view", "create", "update", "delete"] },
  { module: "dashboard", label: "Dashboard", actions: ["view"] },
  { module: "students", label: "Students", actions: ["view", "create", "update", "delete"] },
  { module: "admissions", label: "Admissions", actions: ["view", "create", "update", "delete"] },
  { module: "staff", label: "Staff", actions: ["view", "create", "update", "delete"] },
  { module: "topics", label: "Topics", actions: ["view", "create", "update", "delete"] },
  { module: "courses", label: "Courses", actions: ["view", "create", "update", "delete"] },
  { module: "subjects", label: "Subjects", actions: ["view", "create", "update", "delete"] },
  { module: "batches", label: "Batches", actions: ["view", "create", "update", "delete"] },
  { module: "timetable", label: "Timetable", actions: ["view", "create", "update", "delete"] },
  { module: "attendance", label: "Attendance", actions: ["view", "create", "update", "delete"] },
  { module: "homework", label: "Homework", actions: ["view", "create", "update", "delete"] },
  { module: "exams", label: "Exams & results", actions: ["view", "create", "update", "delete"] },
  { module: "analytics", label: "Analytics", actions: ["view"] },
  { module: "homework-submissions", label: "Homework submissions", actions: ["view", "create", "update", "delete"] },
  { module: "finance", label: "Finance", actions: ["view", "create", "update", "delete"] },
  { module: "hr", label: "HR & payroll", actions: ["view", "create", "update", "delete"] },
  { module: "ptm", label: "Parent meetings", actions: ["view", "create", "update", "delete"] },
  { module: "notifications", label: "Notifications", actions: ["view", "create", "update", "delete"] },
  { module: "branches", label: "Branches", actions: ["view", "create", "update", "delete"] },
  { module: "users", label: "Users", actions: ["view", "create", "update", "delete"] },
  { module: "roles", label: "Roles & permissions", actions: ["view", "create", "update", "delete"] },
  { module: "settings", label: "Institute settings", actions: ["view", "update"] },
  { module: "audit", label: "Audit log", actions: ["view"] },
  { module: "sessions", label: "Sessions & security", actions: ["view", "delete"] },
] as const;

export const BUILT_IN_ROLES = [
  { key: "super_admin", name: "Super Admin", description: "Platform-wide administrator" },
  { key: "institute_admin", name: "Institute Admin", description: "Manages an institute and its branches" },
  { key: "teacher", name: "Teacher", description: "Teaching and classroom access" },
  { key: "staff", name: "Staff", description: "Institute operations access" },
  { key: "accountant", name: "Accountant", description: "Finance and fee operations" },
  { key: "student", name: "Student", description: "Student portal access" },
  { key: "parent", name: "Parent", description: "Parent portal access" },
] as const;

const ALL_PERMISSIONS = PERMISSION_CATALOG.flatMap(({ module, actions }) => actions.map((action) => `${module}.${action}`));
const permission = (...items: string[]) => items;
const byModule = (module: string, ...actions: string[]) => actions.map((action) => `${module}.${action}`);

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ALL_PERMISSIONS,
  institute_admin: ALL_PERMISSIONS,
  teacher: [
    ...byModule("dashboard", "view"), ...byModule("students", "view"), ...byModule("staff", "view", "update"), ...byModule("courses", "view"),
    ...byModule("subjects", "view"), ...byModule("topics", "view", "create", "update"),
    ...byModule("batches", "view"), ...byModule("timetable", "view"), ...byModule("analytics", "view"),
    ...byModule("attendance", "view", "create", "update"), ...byModule("homework", "view", "create", "update"),
    ...byModule("exams", "view", "create", "update"), ...byModule("ptm", "view", "create", "update"),
    ...byModule("notifications", "view"), ...byModule("homework-submissions", "view", "create", "update"), ...byModule("branches", "view", "update"),
  ],
  staff: [
    ...byModule("dashboard", "view"), ...byModule("students", "view", "create", "update"),
    ...byModule("admissions", "view", "create", "update"), ...byModule("staff", "view"),
    ...byModule("courses", "view"), ...byModule("subjects", "view"), ...byModule("topics", "view"), ...byModule("batches", "view", "update"),
    ...byModule("timetable", "view"), ...byModule("attendance", "view", "create", "update"),
    ...byModule("homework", "view"), ...byModule("exams", "view"), ...byModule("finance", "view"),
    ...byModule("notifications", "view", "create"), ...byModule("branches", "view", "update"),
  ],
  accountant: [
    ...byModule("dashboard", "view"), ...byModule("students", "view"),
    ...byModule("finance", "view", "create", "update"), ...byModule("hr", "view"), ...byModule("branches", "view", "update"),
  ],
  student: [
    ...byModule("dashboard", "view"), ...byModule("courses", "view"), ...byModule("batches", "view"),
    ...byModule("timetable", "view"), ...byModule("attendance", "view"), ...byModule("homework", "view"), ...byModule("finance", "view"),
    ...byModule("exams", "view"), ...byModule("notifications", "view"), ...byModule("homework-submissions", "view", "create"),
  ],
  parent: [
    ...byModule("dashboard", "view"), ...byModule("attendance", "view"), ...byModule("finance", "view"),
    ...byModule("homework", "view"), ...byModule("exams", "view"), ...byModule("notifications", "view"),
    ...byModule("homework-submissions", "view"),
  ],
};

export function defaultPermissions(role: string): string[] {
  return DEFAULT_ROLE_PERMISSIONS[role] ?? permission(...byModule("dashboard", "view"));
}

export function requestAuditDetails(req: Request) {
  return {
    ipAddress: req.ip || req.socket.remoteAddress || "",
    userAgent: String(req.get("user-agent") || "").slice(0, 500),
  };
}

export async function recordAudit(
  req: Request,
  action: string,
  targetType = "",
  targetId = "",
  details: Record<string, unknown> = {},
  actor?: Partial<JwtPayload>,
): Promise<void> {
  const current = req.user;
  const requestInstituteId = (req.body?.instituteId || req.query?.instituteId) as string | undefined;
  const instituteId = current?.instituteId || actor?.instituteId || requestInstituteId;
  const branchId = current?.activeBranchId || actor?.activeBranchId;
  const actorRole = current?.role || actor?.role || "";
  const isPlatformActor = ["super_admin", "platform_admin", "support_admin", "finance_admin", "read_only_admin"].includes(actorRole);
  await AuditLog.create({
    scope: isPlatformActor ? "platform" : instituteId ? "institute" : undefined,
    instituteId: instituteId && Types.ObjectId.isValid(instituteId) ? instituteId : undefined,
    branchId: branchId && Types.ObjectId.isValid(branchId) ? branchId : undefined,
    actorId: current?.userId || actor?.userId || "",
    actorEmail: current?.email || actor?.email || "",
    actorRole,
    action,
    targetType,
    targetId,
    ...requestAuditDetails(req),
    details,
  });
}

export async function recordPlatformAudit(
  req: Request,
  action: string,
  targetType = "",
  targetId = "",
  details: Record<string, unknown> = {},
): Promise<void> {
  const current = req.user;
  await AuditLog.create({
    scope: "platform",
    actorId: current?.userId || "",
    actorEmail: current?.email || "",
    actorRole: current?.role || "",
    action,
    targetType,
    targetId,
    ...requestAuditDetails(req),
    details,
  });
}

export async function createUserSession(
  req: Request,
  session: { userId: string; role: string; instituteId?: string | null; principalType?: "user" | "student"; branchId?: string | null },
) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const created = await UserSession.create({
    userId: session.userId,
    role: session.role,
    principalType: session.principalType ?? "user",
    instituteId: session.instituteId && Types.ObjectId.isValid(session.instituteId) ? session.instituteId : undefined,
    branchId: session.branchId && Types.ObjectId.isValid(session.branchId) ? session.branchId : undefined,
    ...requestAuditDetails(req),
    expiresAt,
    lastSeenAt: new Date(),
  });
  return created;
}

export async function resolvePermission(baseRole: string, instituteId?: string | null, roleId?: string | null): Promise<string[] | null> {
  if (!instituteId || !Types.ObjectId.isValid(instituteId)) return null;
  const { Role } = await import("../models/Role");
  if (roleId && !Types.ObjectId.isValid(roleId)) return [];
  const query = roleId ? { _id: roleId, instituteId } : { key: baseRole, instituteId };
  const role = await Role.findOne(query).select("permissions key isSystem");
  if (!role) return roleId ? [] : defaultPermissions(baseRole);
  if (role.isSystem && role.key !== baseRole) return [];
  return role.permissions;
}
