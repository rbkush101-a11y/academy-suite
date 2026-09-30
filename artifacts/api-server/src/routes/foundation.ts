import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import mongoose, { Types } from "mongoose";
import { authenticate, authorize } from "../middlewares/auth";
import { Institute } from "../models/Institute";
import { Branch } from "../models/Branch";
import { InstituteSettings } from "../models/InstituteSettings";
import { Role } from "../models/Role";
import { User } from "../models/User";
import { UserSession } from "../models/UserSession";
import { AuditLog } from "../models/AuditLog";
import { BUILT_IN_ROLES, defaultPermissions, PERMISSION_CATALOG, recordAudit } from "../lib/foundation";
import { signToken } from "../lib/jwt";

const router = Router();
router.use((req, res, next) => {
  const path = req.originalUrl.split("?", 1)[0].replace(/^\/api\/?/, "");
  if (path === "/foundation/active-branch" || path === "/foundation/branch-context") {
    next();
    return;
  }
  void authenticate(req, res, () => {
    void authorize("super_admin", "institute_admin")(req, res, next).catch(next);
  });
});

const ADMIN_ROLE_REQUIREMENTS = [
  "foundation.view", "roles.view", "roles.create", "roles.update", "roles.delete",
  "users.view", "users.create", "users.update", "users.delete",
  "branches.view", "branches.create", "branches.update", "branches.delete",
  "settings.view", "settings.update", "audit.view", "sessions.view", "sessions.delete",
];

function hasAdminControls(roleKey: string, permissions: string[]): boolean {
  return roleKey !== "institute_admin" && roleKey !== "super_admin" || ADMIN_ROLE_REQUIREMENTS.every((permission) => permissions.includes(permission));
}

function getInstituteId(req: Request, res: Response, requested?: unknown): Types.ObjectId | null {
  const current = req.user?.instituteId;
  const rawId = req.user?.role === "super_admin" ? String(requested || current || "") : String(current || "");
  if (!rawId || !Types.ObjectId.isValid(rawId)) {
    res.status(400).json({ error: "Select a valid institute to manage foundation settings" });
    return null;
  }
  if (req.user?.role !== "super_admin" && current !== rawId) {
    res.status(403).json({ error: "You can only manage your own institute" });
    return null;
  }
  return new Types.ObjectId(rawId);
}

function idOf(value: unknown): string {
  return value ? String(value) : "";
}

function formatBranch(branch: any) {
  return {
    id: idOf(branch._id), name: branch.name, code: branch.code,
    phone: branch.phone ?? "", email: branch.email ?? "", address: branch.address ?? "",
    status: branch.status, isMain: Boolean(branch.isMain),
    createdAt: branch.createdAt?.toISOString?.() ?? null,
  };
}

function formatRole(role: any) {
  return {
    id: idOf(role._id), key: role.key, name: role.name,
    description: role.description ?? "", permissions: role.permissions ?? [],
    isSystem: Boolean(role.isSystem),
  };
}

function safeUser(user: any) {
  return {
    id: idOf(user._id), name: user.name, email: user.email,
    loginId: user.loginId ?? "", phone: user.phone ?? "", role: user.role,
    customRoleId: user.customRoleId ? idOf(user.customRoleId) : "",
    branchIds: (user.branchIds ?? []).map(idOf),
    activeBranchId: user.activeBranchId ? idOf(user.activeBranchId) : "",
    isApproved: Boolean(user.isApproved), createdAt: user.createdAt?.toISOString?.() ?? null,
  };
}

async function ensureSystemRoles(instituteId: Types.ObjectId) {
  await Promise.all(BUILT_IN_ROLES.map((role) => Role.findOneAndUpdate(
    { instituteId, key: role.key },
    { $setOnInsert: { ...role, instituteId, isSystem: true, permissions: defaultPermissions(role.key) } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )));
}

router.get("/foundation/bootstrap", async (req, res): Promise<void> => {
  const instituteId = getInstituteId(req, res, req.query.instituteId);
  if (!instituteId) return;
  const [institute, branches, settings, users] = await Promise.all([
    Institute.findById(instituteId).select("instituteName instituteType ownerName email phone address status plan"),
    Branch.find({ instituteId }).sort({ isMain: -1, name: 1 }),
    InstituteSettings.findOne({ instituteId }).select("values updatedAt"),
    User.find({ instituteId }).select("-password").sort({ name: 1 }).limit(200),
  ]);
  await ensureSystemRoles(instituteId);
  const roles = await Role.find({ instituteId }).sort({ isSystem: -1, name: 1 });
  res.json({
    institute: institute ? {
      id: idOf(institute._id), instituteName: institute.instituteName,
      instituteType: institute.instituteType, ownerName: institute.ownerName,
      email: institute.email, phone: institute.phone, address: institute.address ?? "",
      status: institute.status, plan: institute.plan,
    } : null,
    branches: branches.map(formatBranch),
    settings: settings?.values ?? {},
    settingsUpdatedAt: settings?.updatedAt?.toISOString?.() ?? null,
    users: users.map(safeUser),
    roles: roles.map(formatRole),
    permissions: PERMISSION_CATALOG,
    activeBranchId: req.user?.activeBranchId ?? "",
    currentUserId: req.user?.userId ?? "",
  });
});

router.post("/foundation/branches", async (req, res): Promise<void> => {
  const instituteId = getInstituteId(req, res, req.body.instituteId);
  if (!instituteId) return;
  const name = String(req.body.name ?? "").trim();
  const code = String(req.body.code ?? name.replace(/[^a-z0-9]/gi, "").slice(0, 8)).trim().toUpperCase();
  if (!name || !code) {
    res.status(400).json({ error: "Branch name and code are required" });
    return;
  }
  try {
    const branch = await Branch.create({
      instituteId, name, code, phone: String(req.body.phone ?? "").trim(),
      email: String(req.body.email ?? "").trim().toLowerCase(),
      address: String(req.body.address ?? "").trim(), status: "active",
      isMain: (await Branch.countDocuments({ instituteId })) === 0,
    });
    await recordAudit(req, "branch.create", "branch", idOf(branch._id), { name: branch.name, code: branch.code });
    res.status(201).json(formatBranch(branch));
  } catch (error: any) {
    if (error?.code === 11000) {
      res.status(409).json({ error: "That branch code is already in use" });
      return;
    }
    throw error;
  }
});

router.patch("/foundation/branches/:id", async (req, res): Promise<void> => {
  const instituteId = getInstituteId(req, res, req.body.instituteId);
  if (!instituteId) return;
  const currentBranch = await Branch.findOne({ _id: req.params.id, instituteId });
  if (!currentBranch) {
    res.status(404).json({ error: "Branch not found" });
    return;
  }
  const patch: Record<string, unknown> = {};
  for (const field of ["name", "code", "phone", "email", "address", "status"] as const) {
    if (req.body[field] !== undefined) {
      const value = String(req.body[field]).trim();
      if (field === "code") patch[field] = value.toUpperCase();
      else if (field === "email") patch[field] = value.toLowerCase();
      else patch[field] = value;
    }
  }
  if (patch.status && !["active", "inactive"].includes(String(patch.status))) {
    res.status(400).json({ error: "Branch status must be active or inactive" });
    return;
  }
  if (patch.status === "inactive") {
    if (currentBranch.isMain || await Branch.countDocuments({ instituteId, status: "active" }) <= 1) {
      res.status(400).json({ error: "The main or last active branch cannot be deactivated" });
      return;
    }
    if (await UserSession.exists({ branchId: currentBranch._id, revokedAt: null, expiresAt: { $gt: new Date() } })) {
      res.status(409).json({ error: "Switch active sessions to another branch before deactivating this one" });
      return;
    }
  }
  try {
    const branch = await Branch.findOneAndUpdate({ _id: req.params.id, instituteId }, patch, { new: true, runValidators: true });
    if (!branch) {
      res.status(404).json({ error: "Branch not found" });
      return;
    }
    if (branch.status === "inactive") {
      await Promise.all([
        User.updateMany({ instituteId, activeBranchId: branch._id }, { $unset: { activeBranchId: "" } }),
        UserSession.updateMany({ branchId: branch._id }, { $unset: { branchId: "" } }),
      ]);
    }
    await recordAudit(req, "branch.update", "branch", idOf(branch._id), patch);
    res.json(formatBranch(branch));
  } catch (error: any) {
    if (error?.code === 11000) {
      res.status(409).json({ error: "That branch code is already in use" });
      return;
    }
    throw error;
  }
});

router.delete("/foundation/branches/:id", async (req, res): Promise<void> => {
  const instituteId = getInstituteId(req, res, req.query.instituteId);
  if (!instituteId) return;
  const branch = await Branch.findOne({ _id: req.params.id, instituteId });
  if (!branch) {
    res.status(404).json({ error: "Branch not found" });
    return;
  }
  if (branch.isMain || (branch.status === "active" && await Branch.countDocuments({ instituteId, status: "active" }) <= 1)) {
    res.status(400).json({ error: "The main or last active branch cannot be removed" });
    return;
  }
  if (await UserSession.exists({ branchId: branch._id, revokedAt: null, expiresAt: { $gt: new Date() } })) {
    res.status(409).json({ error: "Switch active sessions to another branch before removing this one" });
    return;
  }
  await Promise.all([
    Branch.deleteOne({ _id: branch._id, instituteId }),
    User.updateMany({ instituteId }, { $pull: { branchIds: branch._id } }),
    User.updateMany({ instituteId, activeBranchId: branch._id }, { $unset: { activeBranchId: "" } }),
    UserSession.updateMany({ branchId: branch._id }, { $unset: { branchId: "" } }),
  ]);
  await recordAudit(req, "branch.delete", "branch", idOf(branch._id), { name: branch.name, code: branch.code });
  res.sendStatus(204);
});

router.patch("/foundation/active-branch", authenticate, authorize("super_admin", "institute_admin", "teacher", "staff", "accountant"), async (req, res): Promise<void> => {
  const instituteId = getInstituteId(req, res, req.body.instituteId);
  if (!instituteId) return;
  const branchId = String(req.body.branchId ?? "");
  if (!Types.ObjectId.isValid(branchId)) {
    res.status(400).json({ error: "Select a valid branch" });
    return;
  }
  const [branch, user] = await Promise.all([
    Branch.findOne({ _id: branchId, instituteId, status: "active" }),
    req.user!.role === "super_admin" ? Promise.resolve(null) : User.findOne({ _id: req.user!.userId, instituteId }).select("branchIds"),
  ]);
  if (!branch) {
    res.status(404).json({ error: "Active branch not found" });
    return;
  }
  if (!user && req.user!.role !== "super_admin") {
    res.status(403).json({ error: "Only institute users can set an active branch" });
    return;
  }
  if (user?.branchIds?.length && !user.branchIds.some((id) => String(id) === branchId)) {
    res.status(403).json({ error: "You do not have access to this branch" });
    return;
  }
  if (user) {
    user.activeBranchId = branch._id;
    await user.save();
  }
  if (req.user!.sessionId) {
    await UserSession.updateOne({ _id: req.user!.sessionId }, { $set: { branchId: branch._id, instituteId } });
  }
  const token = signToken({ ...req.user!, instituteId: String(instituteId), activeBranchId: branchId });
  await recordAudit(req, "branch.switch", "branch", branchId, { name: branch.name }, {
    ...req.user!, instituteId: String(instituteId), activeBranchId: branchId,
  });
  res.json({ token, activeBranchId: branchId, branch: formatBranch(branch) });
});

router.get("/foundation/branch-context", authenticate, authorize("super_admin", "institute_admin", "teacher", "staff", "accountant"), async (req, res): Promise<void> => {
  const instituteId = getInstituteId(req, res, req.query.instituteId);
  if (!instituteId) return;
  const user = req.user!.role === "super_admin"
    ? null
    : await User.findOne({ _id: req.user!.userId, instituteId }).select("branchIds activeBranchId");
  if (!user && req.user!.role !== "super_admin") {
    res.status(403).json({ error: "Institute user not found" });
    return;
  }
  const branchFilter: any = { instituteId, status: "active" };
  if (user?.branchIds?.length) branchFilter._id = { $in: user.branchIds };
  const branches = await Branch.find(branchFilter).sort({ isMain: -1, name: 1 });
  const tokenBranch = req.user!.activeBranchId ?? "";
  const activeBranchId = branches.some((branch) => String(branch._id) === tokenBranch)
    ? tokenBranch
    : user?.activeBranchId && branches.some((branch) => String(branch._id) === String(user.activeBranchId))
      ? String(user.activeBranchId)
      : "";
  res.json({ branches: branches.map(formatBranch), activeBranchId });
});

router.patch("/foundation/settings", async (req, res): Promise<void> => {
  const instituteId = getInstituteId(req, res, req.body.instituteId);
  if (!instituteId) return;
  if (!req.body.settings || typeof req.body.settings !== "object" || Array.isArray(req.body.settings)) {
    res.status(400).json({ error: "settings must be an object" });
    return;
  }
  const values = Object.fromEntries(Object.entries(req.body.settings).filter(([key, value]) =>
    /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(key) && !["__proto__", "constructor", "prototype"].includes(key) &&
    (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null),
  ));
  const updated = await InstituteSettings.findOneAndUpdate(
    { instituteId },
    { $set: { values, updatedBy: req.user!.userId } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
  await recordAudit(req, "settings.update", "institute_settings", String(instituteId), { keys: Object.keys(values) });
  res.json({ settings: updated.values, updatedAt: updated.updatedAt });
});

router.patch("/foundation/institute", async (req, res): Promise<void> => {
  const instituteId = getInstituteId(req, res, req.body.instituteId);
  if (!instituteId) return;
  const institute = await Institute.findById(instituteId);
  if (!institute) {
    res.status(404).json({ error: "Institute not found" });
    return;
  }
  const fields = ["instituteName", "instituteType", "ownerName", "email", "phone", "address"] as const;
  for (const field of fields) {
    if (req.body[field] === undefined) continue;
    const value = String(req.body[field]).trim();
    if (field === "email") (institute as any)[field] = value.toLowerCase();
    else (institute as any)[field] = value;
  }
  if (!institute.instituteName || !institute.ownerName || !institute.email || !institute.phone) {
    res.status(400).json({ error: "Institute name, owner, email, and phone are required" });
    return;
  }
  await institute.save();
  await recordAudit(req, "institute.update", "institute", String(institute._id), { fields: fields.filter((field) => req.body[field] !== undefined) });
  res.json({
    id: String(institute._id), instituteName: institute.instituteName, instituteType: institute.instituteType,
    ownerName: institute.ownerName, email: institute.email, phone: institute.phone, address: institute.address ?? "",
    status: institute.status, plan: institute.plan,
  });
});

router.get("/foundation/roles", async (req, res): Promise<void> => {
  const instituteId = getInstituteId(req, res, req.query.instituteId);
  if (!instituteId) return;
  await ensureSystemRoles(instituteId);
  const roles = await Role.find({ instituteId }).sort({ isSystem: -1, name: 1 });
  res.json({ roles: roles.map(formatRole), permissions: PERMISSION_CATALOG });
});

router.post("/foundation/roles", async (req, res): Promise<void> => {
  const instituteId = getInstituteId(req, res, req.body.instituteId);
  if (!instituteId) return;
  const name = String(req.body.name ?? "").trim();
  const key = String(req.body.key ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")).trim().toLowerCase();
  const allowedPermissions = new Set(PERMISSION_CATALOG.flatMap(({ module, actions }) => actions.map((action) => `${module}.${action}`)));
  const permissions = Array.isArray(req.body.permissions) ? req.body.permissions.filter((p: unknown): p is string => typeof p === "string" && allowedPermissions.has(p)) : [];
  if (!name || !/^[a-z0-9][a-z0-9-]{1,39}$/.test(key)) {
    res.status(400).json({ error: "Enter a role name and a key with 2–40 lowercase letters, numbers, or hyphens" });
    return;
  }
  if (BUILT_IN_ROLES.some((role) => role.key === key)) {
    res.status(409).json({ error: "That key is reserved for a built-in role" });
    return;
  }
  try {
    const role = await Role.create({ instituteId, key, name, description: String(req.body.description ?? "").trim(), permissions, isSystem: false });
    await recordAudit(req, "role.create", "role", idOf(role._id), { key, name });
    res.status(201).json(formatRole(role));
  } catch (error: any) {
    if (error?.code === 11000) {
      res.status(409).json({ error: "A role with that key already exists" });
      return;
    }
    throw error;
  }
});

router.patch("/foundation/roles/:id", async (req, res): Promise<void> => {
  const instituteId = getInstituteId(req, res, req.body.instituteId);
  if (!instituteId) return;
  const role = await Role.findOne({ _id: req.params.id, instituteId });
  if (!role) {
    res.status(404).json({ error: "Role not found" });
    return;
  }
  if (req.body.name !== undefined) role.name = String(req.body.name).trim();
  if (req.body.description !== undefined) role.description = String(req.body.description).trim();
  if (req.body.permissions !== undefined) {
    if (!Array.isArray(req.body.permissions)) {
      res.status(400).json({ error: "permissions must be an array" });
      return;
    }
    const allowed = new Set(PERMISSION_CATALOG.flatMap(({ module, actions }) => actions.map((action) => `${module}.${action}`)));
    if (req.body.permissions.some((item: unknown) => typeof item !== "string" || !allowed.has(item))) {
      res.status(400).json({ error: "One or more permission keys are invalid" });
      return;
    }
    role.permissions = [...new Set(req.body.permissions)];
  }
  if (role.isSystem && !hasAdminControls(role.key, role.permissions)) {
    res.status(400).json({ error: "Administrator roles must retain the permissions needed to manage users, roles, settings, sessions, and the audit log" });
    return;
  }
  await role.save();
  await recordAudit(req, "role.update", "role", idOf(role._id), { name: role.name, permissionCount: role.permissions.length });
  res.json(formatRole(role));
});

router.delete("/foundation/roles/:id", async (req, res): Promise<void> => {
  const instituteId = getInstituteId(req, res, req.query.instituteId);
  if (!instituteId) return;
  const role = await Role.findOne({ _id: req.params.id, instituteId });
  if (!role) {
    res.status(404).json({ error: "Role not found" });
    return;
  }
  if (role.isSystem) {
    res.status(400).json({ error: "Built-in roles cannot be removed" });
    return;
  }
  if (await User.exists({ instituteId, customRoleId: role._id })) {
    res.status(409).json({ error: "Reassign users before removing this role" });
    return;
  }
  await role.deleteOne();
  await recordAudit(req, "role.delete", "role", idOf(role._id), { name: role.name, key: role.key });
  res.sendStatus(204);
});

router.get("/foundation/users", async (req, res): Promise<void> => {
  const instituteId = getInstituteId(req, res, req.query.instituteId);
  if (!instituteId) return;
  const users = await User.find({ instituteId }).select("-password").sort({ name: 1 }).limit(200);
  res.json({ users: users.map(safeUser) });
});

router.post("/foundation/users", async (req, res): Promise<void> => {
  const instituteId = getInstituteId(req, res, req.body.instituteId);
  if (!instituteId) return;
  const name = String(req.body.name ?? "").trim();
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");
  const role = String(req.body.role ?? "staff");
  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email, and password are required" });
    return;
  }
  if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    res.status(400).json({ error: "Use at least 8 characters with a lowercase letter, uppercase letter, and number" });
    return;
  }
  const validRoles = ["institute_admin", "teacher", "staff", "accountant", "parent"];
  if (!validRoles.includes(role)) {
    res.status(400).json({ error: "Select a valid institute role" });
    return;
  }
  if (role === "institute_admin" && req.user!.role !== "super_admin") {
    res.status(403).json({ error: "Only a platform admin can create institute administrators" });
    return;
  }
  const requestedRole = req.body.customRoleId ? String(req.body.customRoleId) : "";
  const branchIds = Array.isArray(req.body.branchIds) ? req.body.branchIds.map(String) : [];
  if (branchIds.some((id: string) => !Types.ObjectId.isValid(id)) || (requestedRole && !Types.ObjectId.isValid(requestedRole))) {
    res.status(400).json({ error: "Select valid roles and branches" });
    return;
  }
  const [roleDoc, branches] = await Promise.all([
    requestedRole ? Role.findOne({ _id: requestedRole, instituteId }) : null,
    Branch.find({ _id: { $in: branchIds }, instituteId }).select("_id"),
  ]);
  if (requestedRole && !roleDoc) {
    res.status(400).json({ error: "The selected role does not belong to this institute" });
    return;
  }
  if (roleDoc?.isSystem && roleDoc.key !== role) {
    res.status(400).json({ error: "A built-in permission profile must match the user's portal role" });
    return;
  }
  if (role === "institute_admin" && roleDoc && !hasAdminControls(role, roleDoc.permissions)) {
    res.status(400).json({ error: "The selected profile does not retain the required administrator permissions" });
    return;
  }
  if (branches.length !== new Set(branchIds).size) {
    res.status(400).json({ error: "One or more selected branches do not belong to this institute" });
    return;
  }
  try {
    const user = await User.create({
      name, email, phone: String(req.body.phone ?? "").trim(),
      password: await bcrypt.hash(password, 12), role, instituteId,
      customRoleId: roleDoc?._id,
      branchIds: branches.map((branch) => branch._id),
      isApproved: req.body.isApproved !== false,
    });
    await recordAudit(req, "user.create", "user", idOf(user._id), { email: user.email, role: user.role });
    res.status(201).json(safeUser(user));
  } catch (error: any) {
    if (error?.code === 11000) {
      res.status(409).json({ error: "That email or login ID is already registered" });
      return;
    }
    throw error;
  }
});

router.patch("/foundation/users/:id", async (req, res): Promise<void> => {
  const instituteId = getInstituteId(req, res, req.body.instituteId);
  if (!instituteId) return;
  if (String(req.params.id) === req.user!.userId && req.body.isApproved === false) {
    res.status(400).json({ error: "You cannot deactivate your own account" });
    return;
  }
  const user = await User.findOne({ _id: req.params.id, instituteId });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  let securityChanged = false;
  if (req.body.role !== undefined) {
    const validRoles = ["institute_admin", "teacher", "staff", "accountant", "parent"];
    if (!validRoles.includes(String(req.body.role)) || (req.body.role === "institute_admin" && req.user!.role !== "super_admin")) {
      res.status(400).json({ error: "Select a valid institute role" });
      return;
    }
    securityChanged ||= user.role !== req.body.role;
    user.role = req.body.role;
  }
  if (req.body.isApproved !== undefined) {
    securityChanged ||= user.isApproved !== Boolean(req.body.isApproved);
    user.isApproved = Boolean(req.body.isApproved);
  }
  if (req.body.customRoleId !== undefined) {
    const roleId = req.body.customRoleId ? String(req.body.customRoleId) : "";
    if (roleId && (!Types.ObjectId.isValid(roleId) || !await Role.exists({ _id: roleId, instituteId }))) {
      res.status(400).json({ error: "The selected role does not belong to this institute" });
      return;
    }
    if (roleId) {
      const roleDoc = await Role.findOne({ _id: roleId, instituteId });
      if (!roleDoc) {
        res.status(400).json({ error: "The selected role does not belong to this institute" });
        return;
      }
      if (roleDoc.isSystem && roleDoc.key !== user.role) {
        res.status(400).json({ error: "A built-in permission profile must match the user's base role" });
        return;
      }
      if (user.role === "institute_admin" && !hasAdminControls(user.role, roleDoc.permissions)) {
        res.status(400).json({ error: "The selected profile does not retain the required administrator permissions" });
        return;
      }
    }
    securityChanged ||= String(user.customRoleId ?? "") !== roleId;
    user.customRoleId = roleId ? new Types.ObjectId(roleId) : undefined;
  }
  if (req.body.branchIds !== undefined) {
    if (!Array.isArray(req.body.branchIds) || req.body.branchIds.some((id: unknown) => typeof id !== "string" || !Types.ObjectId.isValid(id))) {
      res.status(400).json({ error: "branchIds must be a list of valid branch ids" });
      return;
    }
    const branchIds = [...new Set(req.body.branchIds as string[])];
    const branches = await Branch.find({ _id: { $in: branchIds }, instituteId }).select("_id");
    if (branches.length !== branchIds.length) {
      res.status(400).json({ error: "One or more selected branches do not belong to this institute" });
      return;
    }
    user.branchIds = branches.map((branch) => branch._id);
    securityChanged = true;
    if (user.activeBranchId && !branches.some((branch) => String(branch._id) === String(user.activeBranchId))) {
      user.activeBranchId = undefined;
    }
  }
  await user.save();
  if (securityChanged) {
    await UserSession.updateMany(
      { userId: String(user._id), principalType: "user", revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }
  await recordAudit(req, "user.update", "user", idOf(user._id), { role: user.role, isApproved: user.isApproved });
  res.json(safeUser(user));
});

router.get("/foundation/sessions", async (req, res): Promise<void> => {
  const instituteId = getInstituteId(req, res, req.query.instituteId);
  if (!instituteId) return;
  const sessions = await UserSession.find({ instituteId, revokedAt: null, expiresAt: { $gt: new Date() } })
    .sort({ lastSeenAt: -1 }).limit(100).lean();
  const userIds = [...new Set(sessions.filter((session) => session.principalType !== "student").map((session) => session.userId))];
  const users = await User.find({ _id: { $in: userIds } }).select("name email").lean();
  const byId = new Map(users.map((user) => [String(user._id), user]));
  res.json({ sessions: sessions.map((session) => ({
    id: idOf(session._id), userId: session.userId,
    name: byId.get(session.userId)?.name ?? "Student account",
    email: byId.get(session.userId)?.email ?? "",
    role: session.role, ipAddress: session.ipAddress ?? "", userAgent: session.userAgent ?? "",
    branchId: session.branchId ? idOf(session.branchId) : "",
    createdAt: session.createdAt, lastSeenAt: session.lastSeenAt, expiresAt: session.expiresAt,
    isCurrent: session._id.toString() === req.user!.sessionId,
  })) });
});

router.delete("/foundation/sessions/:id", async (req, res): Promise<void> => {
  const instituteId = getInstituteId(req, res, req.query.instituteId);
  if (!instituteId) return;
  const session = await UserSession.findOneAndUpdate(
    { _id: req.params.id, instituteId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
    { new: true },
  );
  if (!session) {
    res.status(404).json({ error: "Active session not found" });
    return;
  }
  await recordAudit(req, "session.revoke", "session", idOf(session._id), { targetUserId: session.userId });
  res.sendStatus(204);
});

router.get("/foundation/audit", async (req, res): Promise<void> => {
  const instituteId = getInstituteId(req, res, req.query.instituteId);
  if (!instituteId) return;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const logs = await AuditLog.find({ instituteId }).sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ logs: logs.map((log) => ({
    id: idOf(log._id), actorId: log.actorId, actorEmail: log.actorEmail, actorRole: log.actorRole,
    action: log.action, targetType: log.targetType, targetId: log.targetId,
    branchId: log.branchId ? idOf(log.branchId) : "", ipAddress: log.ipAddress,
    details: log.details ?? {}, createdAt: log.createdAt,
  })) });
});

router.get("/foundation/health", async (_req, res): Promise<void> => {
  res.json({ database: mongoose.connection.readyState === 1 ? "connected" : "disconnected", timestamp: new Date().toISOString() });
});

export default router;
