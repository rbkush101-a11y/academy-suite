import type { Request, Response, NextFunction } from "express";
import { User, type UserRole } from "../models/User";

export const PLATFORM_ROLES = [
  "super_admin",
  "platform_admin",
  "support_admin",
  "finance_admin",
  "read_only_admin",
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const PLATFORM_PERMISSION_CATALOG = [
  { key: "platform.dashboard", actions: ["view"] },
  { key: "platform.institutes", actions: ["view", "create", "update", "delete"] },
  { key: "platform.users", actions: ["view", "create", "update", "delete", "manage_roles"] },
  { key: "platform.plans", actions: ["view", "create", "update", "delete"] },
  { key: "platform.features", actions: ["view", "create", "update", "delete"] },
  { key: "platform.subscriptions", actions: ["view", "create", "update", "delete"] },
  { key: "platform.payments", actions: ["view", "create", "update"] },
  { key: "platform.invoices", actions: ["view", "create", "update"] },
  { key: "platform.analytics", actions: ["view"] },
  { key: "platform.support", actions: ["view", "create", "update", "delete"] },
  { key: "platform.notifications", actions: ["view", "create", "update", "delete"] },
  { key: "platform.announcements", actions: ["view", "create", "update", "delete"] },
  { key: "platform.audit", actions: ["view"] },
  { key: "platform.security", actions: ["view", "manage"] },
  { key: "platform.system_health", actions: ["view"] },
  { key: "platform.settings", actions: ["view", "update"] },
] as const;

export const PLATFORM_ROLE_CATALOG: ReadonlyArray<{
  key: PlatformRole;
  name: string;
  description: string;
}> = [
  { key: "super_admin", name: "SUPER_ADMIN", description: "Full platform owner access" },
  { key: "platform_admin", name: "PLATFORM_ADMIN", description: "Platform operations without super-admin security controls" },
  { key: "support_admin", name: "SUPPORT_ADMIN", description: "Institute support and communications" },
  { key: "finance_admin", name: "FINANCE_ADMIN", description: "Plans, subscriptions, invoices, and payments" },
  { key: "read_only_admin", name: "READ_ONLY_ADMIN", description: "Read-only access to platform records" },
];

const ALL_PLATFORM_PERMISSIONS = PLATFORM_PERMISSION_CATALOG.flatMap(({ key, actions }) =>
  actions.map((action) => `${key}.${action}`),
);
const VIEW_PERMISSIONS = PLATFORM_PERMISSION_CATALOG.map(({ key }) => `${key}.view`);
const actions = (category: string, ...values: string[]) => values.map((value) => `${category}.${value}`);

export const PLATFORM_ROLE_PERMISSIONS: Readonly<Record<PlatformRole, readonly string[]>> = {
  super_admin: ALL_PLATFORM_PERMISSIONS,
  platform_admin: ALL_PLATFORM_PERMISSIONS.filter((permission) =>
    !["platform.users.manage_roles", "platform.security.manage"].includes(permission),
  ),
  support_admin: [
    ...actions("platform.dashboard", "view"), ...actions("platform.institutes", "view"),
    ...actions("platform.users", "view"), ...actions("platform.support", "view", "create", "update"),
    ...actions("platform.notifications", "view", "create", "update"),
    ...actions("platform.announcements", "view"), ...actions("platform.analytics", "view"),
    ...actions("platform.audit", "view"),
  ],
  finance_admin: [
    ...actions("platform.dashboard", "view"), ...actions("platform.institutes", "view"),
    ...actions("platform.plans", "view"), ...actions("platform.subscriptions", "view", "create", "update"),
    ...actions("platform.payments", "view", "create"), ...actions("platform.invoices", "view", "create", "update"),
    ...actions("platform.analytics", "view"), ...actions("platform.audit", "view"),
  ],
  read_only_admin: VIEW_PERMISSIONS,
};

declare global {
  namespace Express {
    interface Request {
      platformRole?: PlatformRole;
    }
  }
}

export function isPlatformRole(role: string): role is PlatformRole {
  return (PLATFORM_ROLES as readonly string[]).includes(role);
}

export function authorizePlatform(permission: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!isPlatformRole(req.user.role) || req.user.instituteId || req.user.activeBranchId || req.user.customRoleId) {
      res.status(403).json({ error: "Platform administrator scope required" });
      return;
    }

    try {
      const account = await User.findById(req.user.userId).select("role instituteId activeBranchId branchIds customRoleId isApproved");
      if (
        !account || account.role !== req.user.role || !isPlatformRole(account.role) ||
        account.instituteId || account.activeBranchId || account.branchIds?.length || account.customRoleId || account.isApproved !== true
      ) {
        res.status(403).json({ error: "Platform administrator scope required" });
        return;
      }

      const role = account.role as PlatformRole;
      const assigned = PLATFORM_ROLE_PERMISSIONS[role];
      if (!assigned.includes(permission)) {
        res.status(403).json({ error: "Forbidden: your platform role does not have this permission" });
        return;
      }

      req.platformRole = role;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function canAssignPlatformRole(actorRole: UserRole, requestedRole: PlatformRole): boolean {
  if (requestedRole === "super_admin") return actorRole === "super_admin";
  if (requestedRole === "platform_admin") return actorRole === "super_admin";
  return actorRole === "super_admin" || actorRole === "platform_admin";
}
