import { randomBytes, randomInt } from "node:crypto";
import { Router, type Request } from "express";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { authenticate } from "../middlewares/auth";
import { authorizePlatform, type PlatformRole } from "../lib/platform-rbac";
import { recordPlatformAudit } from "../lib/foundation";
import { encryptEmailPayload, hashValue, isAuthEmailDeliveryConfigured, securityEmailRetentionDate } from "../lib/auth-security";
import { Institute, type InstituteStatus, type InstituteType } from "../models/Institute";
import { Branch } from "../models/Branch";
import { Student } from "../models/Student";
import { Staff } from "../models/Staff";
import { User } from "../models/User";
import { UserSession } from "../models/UserSession";
import { Course } from "../models/Course";
import { InstituteSettings } from "../models/InstituteSettings";
import { AuditLog } from "../models/AuditLog";
import { AuthSecurityEvent, AuthToken, AuthEmailOutbox } from "../models/AuthSecurity";
import { Notification } from "../models/Notification";
import { PlatformInvoice, PlatformPayment, PlatformPlan, PlatformSubscription } from "../models/Platform";

const router = Router();
const ROOT = "/v1/platform/institutes";
const idOf = (req: Request, key = "id") => Array.isArray(req.params[key]) ? req.params[key][0] : req.params[key];
const text = (value: unknown, max = 240) => String(value ?? "").trim().slice(0, max);
const objectId = (value: string) => Types.ObjectId.isValid(value);
const REGEX_SPECIALS = new Set([".", "*", "+", "?", "^", "$", "{", "}", "(", ")", "|", "[", "]"]);
const safeRegex = (value: string) => [...value].map((character) => REGEX_SPECIALS.has(character) || character.charCodeAt(0) === 92 ? String.fromCharCode(92) + character : character).join("");
const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const lowerStatus = (value: unknown) => text(value, 24).toLowerCase();
const statusValues = new Set(["pending", "active", "trial", "suspended", "inactive", "expired", "cancelled", "archived"]);

function formatInstitute(institute: any) {
  const storedStatus = lowerStatus(institute.status);
  const status = storedStatus === "inactive" ? "suspended"
    : ["active", "trial"].includes(storedStatus) && institute.expiryDate && new Date(institute.expiryDate) <= new Date() ? "expired"
      : storedStatus;
  return {
    id: String(institute._id),
    instituteName: institute.instituteName,
    legalName: institute.legalName ?? "",
    instituteType: institute.instituteType,
    ownerName: institute.ownerName,
    ownerEmail: institute.email,
    ownerPhone: institute.phone,
    email: institute.email,
    phone: institute.phone,
    address: institute.address ?? "",
    city: institute.city ?? "",
    state: institute.state ?? "",
    country: institute.country ?? "",
    pincode: institute.pincode ?? "",
    logoDataUrl: institute.logoDataUrl ?? "",
    website: institute.website ?? "",
    domain: institute.domain ?? "",
    defaultBranchId: institute.defaultBranchId ? String(institute.defaultBranchId) : null,
    academicYear: institute.academicYear ?? "",
    initialAdminId: institute.initialAdminId ? String(institute.initialAdminId) : null,
    plan: institute.plan,
    status,
    expiryDate: institute.expiryDate ?? null,
    archivedAt: institute.archivedAt ?? null,
    maxStudents: institute.maxStudents,
    createdAt: institute.createdAt ?? null,
    updatedAt: institute.updatedAt ?? null,
  };
}

function serializeRows(rows: any[]) {
  return rows.map((row) => {
    const safe = { ...row, id: String(row._id ?? row.id ?? "") };
    delete safe._id;
    delete safe.password;
    delete safe.loginPassword;
    delete safe.twoFactorSecretEncrypted;
    return safe;
  });
}

function redactSettings(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSettings);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [
    key,
    /password|secret|token|credential|api.?key/i.test(key) ? "[redacted]" : redactSettings(child),
  ]));
}

function collectionName(model: { collection: { name: string } }) {
  return model.collection.name;
}

function pageValue(value: unknown, fallback: number, maximum: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

function filterDate(value: unknown, end = false): Date | undefined {
  const date = text(value, 10);
  if (!date) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const parsed = new Date(`${date}T${end ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function instituteListPipeline(req: Request) {
  const match: Record<string, unknown> = {};
  const search = text(req.query.search, 120);
  const status = lowerStatus(req.query.status);
  const statusFilter = status && status !== "all" ? status : "";
  const createdFrom = filterDate(req.query.createdFrom);
  const createdTo = filterDate(req.query.createdTo, true);
  if ((text(req.query.createdFrom) && !createdFrom) || (text(req.query.createdTo) && !createdTo)) {
    throw new RangeError("Created date filters must use the YYYY-MM-DD format.");
  }
  if (status && status !== "all") {
    if (!statusValues.has(status)) throw new RangeError("Choose a valid institute status.");
  }
  if (search) {
    const expression = new RegExp(safeRegex(search), "i");
    match.$or = [
      { instituteName: expression }, { legalName: expression }, { ownerName: expression },
      { email: expression }, { phone: expression }, { domain: expression },
      { city: expression }, { state: expression },
    ];
  }
  if (createdFrom || createdTo) {
    match.createdAt = { ...(createdFrom ? { $gte: createdFrom } : {}), ...(createdTo ? { $lte: createdTo } : {}) };
  }

  const subscription = lowerStatus(req.query.subscription);
  if (subscription && subscription !== "all" && !["active", "trialing", "past_due", "paused", "canceled", "expired", "none"].includes(subscription)) {
    throw new RangeError("Choose a valid subscription filter.");
  }
  const planCode = text(req.query.plan, 80).toLowerCase();
  const page = pageValue(req.query.page, 1, 1_000_000);
  const limit = pageValue(req.query.limit, 20, 100);
  const sortKey = text(req.query.sort, 40);
  const sortField: Record<string, string> = {
    instituteName: "instituteName", ownerName: "ownerName", status: "displayStatus", createdAt: "createdAt",
    branchCount: "branchCount", studentCount: "studentCount", lastActivity: "lastActivity",
    subscription: "currentSubscription.status", plan: "currentPlan.code",
  };
  const sort = sortField[sortKey] ?? "createdAt";
  const direction = text(req.query.direction, 4).toLowerCase() === "asc" ? 1 : -1;
  const pipeline: any[] = [
    { $match: match },
    { $lookup: { from: collectionName(Branch), let: { instituteId: "$_id" }, pipeline: [{ $match: { $expr: { $eq: ["$instituteId", "$$instituteId"] } } }, { $count: "count" }], as: "branchStats" } },
    { $lookup: { from: collectionName(Student), let: { instituteId: "$_id" }, pipeline: [{ $match: { $expr: { $eq: ["$instituteId", "$$instituteId"] } } }, { $count: "count" }], as: "studentStats" } },
    { $lookup: { from: collectionName(PlatformSubscription), let: { instituteId: "$_id" }, pipeline: [
      { $match: { $expr: { $eq: ["$instituteId", "$$instituteId"] } } }, { $sort: { createdAt: -1 } }, { $limit: 1 },
    ], as: "subscriptionRows" } },
    { $addFields: {
      branchCount: { $ifNull: [{ $arrayElemAt: ["$branchStats.count", 0] }, 0] },
      studentCount: { $ifNull: [{ $arrayElemAt: ["$studentStats.count", 0] }, 0] },
      currentSubscription: { $ifNull: [{ $arrayElemAt: ["$subscriptionRows", 0] }, null] },
    } },
    { $lookup: { from: collectionName(PlatformPlan), localField: "currentSubscription.planId", foreignField: "_id", as: "planRows" } },
    { $addFields: { currentPlan: { $ifNull: [{ $arrayElemAt: ["$planRows", 0] }, null] } } },
    { $addFields: { displayStatus: { $switch: {
      branches: [
        { case: { $eq: ["$status", "archived"] }, then: "archived" },
        { case: { $in: ["$status", ["suspended", "inactive"]] }, then: "suspended" },
        { case: { $or: [{ $eq: ["$status", "cancelled"] }, { $eq: ["$currentSubscription.status", "canceled"] }] }, then: "cancelled" },
        { case: { $or: [
          { $eq: ["$status", "expired"] }, { $eq: ["$currentSubscription.status", "expired"] },
          { $and: [
            { $in: ["$currentSubscription.status", ["active", "trialing", "past_due"]] },
            { $ne: [{ $ifNull: ["$currentSubscription.endsAt", null] }, null] },
            { $lte: ["$currentSubscription.endsAt", new Date()] },
          ] },
          { $and: [{ $ne: [{ $ifNull: ["$expiryDate", null] }, null] }, { $lte: ["$expiryDate", new Date()] }] },
        ] }, then: "expired" },
        { case: { $or: [{ $eq: ["$status", "trial"] }, { $eq: ["$currentSubscription.status", "trialing"] }] }, then: "trial" },
      ],
      default: "$status",
    } } } },
  ];
  if (statusFilter) pipeline.push({ $match: { displayStatus: statusFilter } });
  if (subscription === "none") pipeline.push({ $match: { currentSubscription: null } });
  else if (subscription && subscription !== "all") pipeline.push({ $match: { "currentSubscription.status": subscription } });
  if (planCode) pipeline.push({ $match: { $or: [{ "currentPlan.code": planCode }, { plan: planCode }] } });
  pipeline.push(
    { $lookup: { from: collectionName(UserSession), let: { instituteId: "$_id" }, pipeline: [
      { $match: { $expr: { $eq: ["$instituteId", "$$instituteId"] } } }, { $sort: { lastSeenAt: -1 } }, { $limit: 1 }, { $project: { lastSeenAt: 1 } },
    ], as: "lastSessionRows" } },
    { $lookup: { from: collectionName(AuditLog), let: { instituteId: "$_id" }, pipeline: [
      { $match: { $expr: { $eq: ["$instituteId", "$$instituteId"] } } }, { $sort: { createdAt: -1 } }, { $limit: 1 }, { $project: { createdAt: 1 } },
    ], as: "lastAuditRows" } },
    { $addFields: { lastActivity: { $max: [
      { $ifNull: [{ $arrayElemAt: ["$lastSessionRows.lastSeenAt", 0] }, null] },
      { $ifNull: [{ $arrayElemAt: ["$lastAuditRows.createdAt", 0] }, null] },
    ] } } },
    { $sort: { [sort]: direction, _id: 1 } },
    { $facet: {
      items: [
        { $skip: (page - 1) * limit }, { $limit: limit },
        { $project: {
          _id: 1, instituteName: 1, legalName: 1, instituteType: 1, ownerName: 1, email: 1, phone: 1,
          city: 1, state: 1, country: 1, domain: 1, plan: 1, status: "$displayStatus", expiryDate: 1, createdAt: 1, updatedAt: 1,
          branchCount: 1, studentCount: 1, lastActivity: 1,
          subscription: { id: "$currentSubscription._id", status: "$currentSubscription.status", endsAt: "$currentSubscription.endsAt" },
          currentPlan: { id: "$currentPlan._id", code: "$currentPlan.code", name: "$currentPlan.name" },
        } },
      ],
      meta: [{ $count: "total" }],
    } },
  );
  return { pipeline, page, limit };
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function instituteAdminResetUrl(token: string) {
  const configured = process.env.PUBLIC_APP_URL;
  if (!configured) throw new Error("PUBLIC_APP_URL is required for password recovery.");
  const appUrl = new URL(configured);
  if (appUrl.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && appUrl.protocol === "http:")) {
    throw new Error("PUBLIC_APP_URL must use HTTPS in production.");
  }
  const url = new URL("/institute-admin/reset-password", appUrl.origin);
  url.searchParams.set("token", token);
  return url.toString();
}

function generateTemporaryPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "@#$%";
  const pick = (chars: string) => chars[randomInt(chars.length)];
  const core = randomBytes(18).toString("base64url").replace(/[-_]/g, "").slice(0, 18);
  return `${pick(upper)}${pick(lower)}${pick(digits)}${pick(symbols)}${core}`;
}

async function queueAdminPasswordSetup(user: any, req: Request, isInvite: boolean) {
  if (!await isAuthEmailDeliveryConfigured()) return false;
  await AuthToken.deleteMany({ userId: user._id, purpose: "password_reset", consumedAt: { $exists: false } });
  const token = randomBytes(32).toString("base64url");
  await AuthToken.create({
    userId: user._id, purpose: "password_reset", tokenHash: hashValue(token),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000), requestedFromIp: String(req.ip ?? "").slice(0, 100),
  });
  const link = instituteAdminResetUrl(token);
  const escapedLink = escapeHtml(link);
  const subject = isInvite ? "Set up your institute administrator password" : "Reset your institute administrator password";
  const message = isInvite
    ? `Your institute administrator account is ready. Set your password within 30 minutes: ${link}`
    : `A password reset was requested by a platform administrator. Reset it within 30 minutes: ${link}`;
  const encrypted = encryptEmailPayload({ subject, text: `${message}\n\nIf you did not expect this email, contact your platform administrator.`, html: `<p>${escapeHtml(message.split(": ")[0])}.</p><p><a href="${escapedLink}">${isInvite ? "Set password" : "Reset password"}</a></p><p>This link expires in 30 minutes.</p>` });
  await AuthEmailOutbox.create({ to: user.email, purpose: "password_reset", ...encrypted, expiresAt: securityEmailRetentionDate() });
  return true;
}

router.get(ROOT, authenticate, authorizePlatform("platform.institutes.view"), async (req, res) => {
  try {
    const { pipeline, page, limit } = instituteListPipeline(req);
    const [result] = await Institute.aggregate(pipeline);
    const total = result?.meta?.[0]?.total ?? 0;
    res.json({ items: (result?.items ?? []).map((row: any) => ({ ...row, id: String(row._id), _id: undefined })), page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    if (error instanceof RangeError) { res.status(400).json({ error: error.message }); return; }
    throw error;
  }
});

router.post(ROOT, authenticate, authorizePlatform("platform.institutes.create"), async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const instituteName = text(body.instituteName, 160);
  const legalName = text(body.legalName, 180);
  const ownerName = text(body.ownerName, 120);
  const email = text(body.ownerEmail ?? body.email, 254).toLowerCase();
  const initialAdminName = text(body.initialAdminName || ownerName, 120);
  const initialAdminEmail = text(body.initialAdminEmail || email, 254).toLowerCase();
  const phone = text(body.ownerPhone ?? body.phone, 40);
  const address = text(body.address, 500);
  const city = text(body.city, 100);
  const state = text(body.state, 100);
  const country = text(body.country, 100);
  const pincode = text(body.pincode, 24);
  const website = text(body.website, 240);
  const domain = text(body.domain, 180).toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  const instituteType = text(body.instituteType, 40) as InstituteType;
  const academicYear = text(body.academicYear, 30);
  const branchName = text(body.defaultBranchName ?? body.defaultBranch, 140);
  const branchCode = text(body.defaultBranchCode, 16).toUpperCase().replace(/[^A-Z0-9-]/g, "") || "MAIN";
  const logoDataUrl = text(body.logoDataUrl ?? body.logo, 2_500_000);
  const planId = text(body.planId, 40);
  const trialDays = Number(body.trialDays ?? 0);
  const selectedStatus = lowerStatus(body.status || "pending");
  const billingCycle = text(body.billingCycle || "monthly", 16);
  if (!instituteName || !ownerName || !isEmail(email) || !initialAdminName || !isEmail(initialAdminEmail) || !phone || !address || !city || !state || !country || !pincode || !academicYear || !branchName || !planId) {
    res.status(400).json({ error: "Institute, owner, address, default branch, academic year, and subscription plan fields are required." });
    return;
  }
  if (!["school", "coaching", "computer_institute", "tuition_center", "academy"].includes(instituteType)) {
    res.status(400).json({ error: "Choose a valid institute type." }); return;
  }
  if (!objectId(planId) || !Number.isInteger(trialDays) || trialDays < 0 || trialDays > 365 || !["monthly", "yearly"].includes(billingCycle)) {
    res.status(400).json({ error: "Choose a valid plan, billing cycle, and trial duration from 0 to 365 days." }); return;
  }
  if (trialDays === 0 && !["pending", "active"].includes(selectedStatus)) {
    res.status(400).json({ error: "Choose Pending or Active when no trial is configured." }); return;
  }
  if (logoDataUrl && !/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/i.test(logoDataUrl)) {
    res.status(400).json({ error: "Logo must be a PNG, JPEG, WebP, or SVG image." }); return;
  }
  if (website) {
    try {
      const parsedWebsite = new URL(website);
      if (!["http:", "https:"].includes(parsedWebsite.protocol)) throw new Error("invalid protocol");
    } catch { res.status(400).json({ error: "Enter a valid website URL including https://." }); return; }
  }
  if (domain && !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))+$/i.test(domain)) {
    res.status(400).json({ error: "Enter a valid hostname without a path or protocol." }); return;
  }
  const [plan, existingAdmin, existingDomain] = await Promise.all([
    PlatformPlan.findOne({ _id: planId, status: "active" }),
    User.exists({ email: initialAdminEmail }),
    domain ? Institute.exists({ domain }) : Promise.resolve(null),
  ]);
  if (!plan) { res.status(400).json({ error: "The selected plan is unavailable." }); return; }
  if (existingAdmin) { res.status(409).json({ error: "The initial administrator email is already registered." }); return; }
  if (existingDomain) { res.status(409).json({ error: "That institute domain is already in use." }); return; }

  const now = new Date();
  const status = trialDays > 0 ? "trial" : selectedStatus;
  const expiryDate = trialDays > 0 ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000) : undefined;
  let createdInstitute: any;
  let createdBranch: any;
  let createdAdmin: any;
  try {
    createdInstitute = await Institute.create({
      instituteName, legalName, instituteType, ownerName, email, phone, address, city, state, country, pincode,
      logoDataUrl, website, ...(domain ? { domain } : {}), academicYear, plan: plan.code, status: status as InstituteStatus, expiryDate,
      maxStudents: plan.maxStudents,
    });
    createdBranch = await Branch.create({ instituteId: createdInstitute._id, name: branchName, code: branchCode, address, status: "active", isMain: true });
    const initialPassword = generateTemporaryPassword();
    createdAdmin = await User.create({
      name: initialAdminName, email: initialAdminEmail, phone, password: await bcrypt.hash(initialPassword, 12), role: "institute_admin",
      instituteId: createdInstitute._id, activeBranchId: createdBranch._id, branchIds: [createdBranch._id], isApproved: true,
    });
    const subscriptionStatus = trialDays > 0 ? "trialing" : "active";
    await Promise.all([
      Institute.updateOne({ _id: createdInstitute._id }, { $set: { defaultBranchId: createdBranch._id, initialAdminId: createdAdmin._id } }),
      InstituteSettings.create({ instituteId: createdInstitute._id, values: { academicYear } }),
      PlatformSubscription.create({
        instituteId: createdInstitute._id, planId: plan._id, status: subscriptionStatus, billingCycle: billingCycle as "monthly" | "yearly",
        startsAt: now, ...(expiryDate ? { endsAt: expiryDate } : {}),
      }),
    ]);
    const refreshedInstitute = await Institute.findById(createdInstitute._id);
    await recordPlatformAudit(req, "platform.institute.create", "institute", String(createdInstitute._id), {
      instituteName, initialAdminId: String(createdAdmin._id), initialAdminEmail, planId, trialDays, status,
    });
    const emailSetup = await queueAdminPasswordSetup(createdAdmin, req, true).catch(() => false);
    res.status(201).json({
      institute: formatInstitute(refreshedInstitute),
      adminPasswordSetupEmailQueued: emailSetup,
      initialAdmin: {
        id: String(createdAdmin._id),
        name: createdAdmin.name,
        email: createdAdmin.email,
        role: createdAdmin.role,
        temporaryPassword: initialPassword,
      },
    });
  } catch (error) {
    if (createdInstitute?._id) {
      await Promise.allSettled([
        ...(createdAdmin?._id ? [User.deleteOne({ _id: createdAdmin._id })] : []),
        Branch.deleteMany({ instituteId: createdInstitute._id }),
        InstituteSettings.deleteOne({ instituteId: createdInstitute._id }),
        PlatformSubscription.deleteMany({ instituteId: createdInstitute._id }),
        Institute.deleteOne({ _id: createdInstitute._id }),
      ]);
    }
    throw error;
  }
});

router.get(`${ROOT}/:id`, authenticate, authorizePlatform("platform.institutes.view"), async (req, res) => {
  const id = idOf(req);
  if (!objectId(id)) { res.status(400).json({ error: "Invalid institute id." }); return; }
  const institute = await Institute.findById(id).lean();
  if (!institute) { res.status(404).json({ error: "Institute not found." }); return; }
  const instituteId = new Types.ObjectId(id);
  const role = req.platformRole as PlatformRole;
  const canUsers = ["super_admin", "platform_admin", "support_admin", "read_only_admin"].includes(role);
  const canSubscriptions = ["super_admin", "platform_admin", "finance_admin", "read_only_admin"].includes(role);
  const canPayments = ["super_admin", "platform_admin", "finance_admin", "read_only_admin"].includes(role);
  const userFields = "name email role phone isApproved activeBranchId branchIds createdAt updatedAt";
  const [branches, users, students, staff, courses, subscriptionRows, payments, invoices, settings, auditLogs,
    branchCount, studentCount, staffCount, teacherCount, parentCount, userCount, activeUserCount] = await Promise.all([
    Branch.find({ instituteId }).sort({ isMain: -1, name: 1 }).limit(200).lean(),
    canUsers ? User.find({ instituteId }).select(userFields).sort({ createdAt: -1 }).limit(200).lean() : Promise.resolve([]),
    canUsers ? Student.find({ instituteId }).select("name email phone enrollmentNo status academicYear courseId batchId createdAt").sort({ createdAt: -1 }).limit(200).lean() : Promise.resolve([]),
    canUsers ? Staff.find({ instituteId }).select("name email phone role positionTitle staffType status createdAt").sort({ createdAt: -1 }).limit(200).lean() : Promise.resolve([]),
    canUsers ? Course.find({ instituteId }).select("name description duration fees courseType status createdAt").sort({ createdAt: -1 }).limit(200).lean() : Promise.resolve([]),
    canSubscriptions ? PlatformSubscription.find({ instituteId }).populate("planId", "code name currency monthlyPrice yearlyPrice maxStudents maxBranches").sort({ createdAt: -1 }).limit(100).lean() : Promise.resolve([]),
    canPayments ? PlatformPayment.find({ instituteId }).select("invoiceId amount currency status provider reference paidAt createdAt").sort({ createdAt: -1 }).limit(100).lean() : Promise.resolve([]),
    canPayments ? PlatformInvoice.find({ instituteId }).select("invoiceNumber subscriptionId currency subtotal taxAmount total status issuedAt dueAt paidAt createdAt").sort({ createdAt: -1 }).limit(100).lean() : Promise.resolve([]),
    InstituteSettings.findOne({ instituteId }).select("values createdAt updatedAt").lean(),
    AuditLog.find({ instituteId }).sort({ createdAt: -1 }).limit(100).lean(),
    Branch.countDocuments({ instituteId }), Student.countDocuments({ instituteId }), Staff.countDocuments({ instituteId }),
    Staff.countDocuments({ instituteId, role: { $regex: "teacher|faculty", $options: "i" } }),
    User.countDocuments({ instituteId, role: "parent" }), User.countDocuments({ instituteId }),
    UserSession.aggregate([{ $match: { instituteId, revokedAt: null, expiresAt: { $gt: new Date() } } }, { $group: { _id: { userId: "$userId", principalType: "$principalType" } } }, { $count: "count" }]),
  ]);
  const admins = canUsers ? users.filter((user: any) => user.role === "institute_admin") : [];
  const studentIds = students.map((student: any) => String(student._id));
  const userIds = users.map((user: any) => String(user._id));
  const securityEvents = canUsers && (userIds.length || studentIds.length)
    ? await AuthSecurityEvent.find({ scope: "institute", userId: { $in: [...userIds, ...studentIds] } }).sort({ createdAt: -1 }).limit(50).select("userId email role event outcome ipAddress createdAt").lean()
    : [];
  const activity = [
    ...auditLogs.map((row: any) => ({ id: `audit:${row._id}`, kind: "admin_action", action: row.action, actorEmail: row.actorEmail, actorRole: row.actorRole, createdAt: row.createdAt, details: row.details })),
    ...securityEvents.map((row: any) => ({ id: `security:${row._id}`, kind: "security_event", action: row.event, actorEmail: row.email, actorRole: row.role, createdAt: row.createdAt, outcome: row.outcome })),
  ].sort((left: any, right: any) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()).slice(0, 100);
  const currentSubscription: any = subscriptionRows.find((row: any) => ["active", "trialing", "past_due"].includes(row.status)) ?? subscriptionRows[0];
  const currentPlan: any = currentSubscription?.planId;
  const storedInstituteStatus = lowerStatus(institute.status);
  const subscriptionEnded = currentSubscription?.endsAt && new Date(currentSubscription.endsAt) <= new Date();
  const detailStatus = ["archived", "suspended", "inactive"].includes(storedInstituteStatus)
    ? storedInstituteStatus === "inactive" ? "suspended" : storedInstituteStatus
    : currentSubscription?.status === "canceled" ? "cancelled"
      : currentSubscription?.status === "expired" || subscriptionEnded || (institute.expiryDate && new Date(institute.expiryDate) <= new Date()) ? "expired"
        : currentSubscription?.status === "trialing" || storedInstituteStatus === "trial" ? "trial" : storedInstituteStatus;
  const overview = {
    branches: branchCount, students: studentCount, teachers: teacherCount, staff: Math.max(0, staffCount - teacherCount),
    parents: parentCount, users: userCount, activeUsers: activeUserCount[0]?.count ?? 0,
    admins: admins.length, courses: courses.length, currentSubscription: currentSubscription ?? null,
    usage: {
      branches: { used: branchCount, limit: currentPlan?.maxBranches ?? null },
      students: { used: studentCount, limit: currentPlan?.maxStudents ?? institute.maxStudents ?? null },
      users: { used: userCount, limit: null },
    },
  };
  res.json({
    institute: formatInstitute({ ...institute, status: detailStatus }), overview,
    sections: {
      branches: serializeRows(branches), admins: serializeRows(admins), users: serializeRows(users),
      students: serializeRows(students), teachers: serializeRows(staff.filter((row: any) => /teacher|faculty/i.test(row.role))),
      staff: serializeRows(staff.filter((row: any) => !/teacher|faculty/i.test(row.role))), parents: serializeRows(users.filter((row: any) => row.role === "parent")),
      courses: serializeRows(courses), subscriptions: serializeRows(subscriptionRows), payments: serializeRows(payments), invoices: serializeRows(invoices),
      usage: overview.usage, activity, auditLogs: serializeRows(auditLogs), settings: redactSettings(settings?.values ?? {}),
    },
  });
});

router.patch(`${ROOT}/:id`, authenticate, authorizePlatform("platform.institutes.update"), async (req, res) => {
  const id = idOf(req);
  if (!objectId(id)) { res.status(400).json({ error: "Invalid institute id." }); return; }
  const body = req.body as Record<string, unknown>;
  const allowed = ["instituteName", "legalName", "instituteType", "ownerName", "email", "phone", "address", "city", "state", "country", "pincode", "logoDataUrl", "website", "domain", "academicYear"];
  const update = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
  if (!Object.keys(update).length) { res.status(400).json({ error: "No supported profile fields were provided." }); return; }
  if (typeof update.email === "string") update.email = update.email.trim().toLowerCase();
  if (typeof update.domain === "string") update.domain = update.domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "") || undefined;
  const institute = await Institute.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  if (!institute) { res.status(404).json({ error: "Institute not found." }); return; }
  await recordPlatformAudit(req, "platform.institute.profile.update", "institute", id, { changedFields: Object.keys(update) });
  res.json(formatInstitute(institute));
});

router.post(`${ROOT}/:id/status`, authenticate, authorizePlatform("platform.institutes.update"), async (req, res) => {
  const id = idOf(req);
  if (!objectId(id)) { res.status(400).json({ error: "Invalid institute id." }); return; }
  const action = text(req.body?.action, 24).toLowerCase();
  const institute = await Institute.findById(id);
  if (!institute) { res.status(404).json({ error: "Institute not found." }); return; }
  const previousStatus = lowerStatus(institute.status);
  const now = new Date();
  if (["resume", "restore"].includes(action) && institute.expiryDate && institute.expiryDate <= now) {
    res.status(409).json({ error: "This institute subscription has expired. Change or renew its plan before restoring access." }); return;
  }
  const latestResumeSubscription = ["resume", "restore"].includes(action)
    ? await PlatformSubscription.findOne({ instituteId: institute._id }).sort({ createdAt: -1 }).select("status endsAt").lean()
    : null;
  if (["resume", "restore"].includes(action) && latestResumeSubscription && (["expired", "canceled"].includes(latestResumeSubscription.status) || (latestResumeSubscription.endsAt && latestResumeSubscription.endsAt <= now))) {
    res.status(409).json({ error: "This institute subscription has expired or was cancelled. Change or renew its plan before restoring access." }); return;
  }
  const currentStatus = lowerStatus(institute.status);
  if (action === "activate" && currentStatus !== "pending") { res.status(409).json({ error: "Only a pending institute can be activated. Use Resume for a suspended institute." }); return; }
  if (action === "suspend" && !["active", "trial"].includes(currentStatus)) { res.status(409).json({ error: "Only an active or trial institute can be suspended." }); return; }
  if (action === "resume" && !["suspended", "inactive"].includes(currentStatus)) { res.status(409).json({ error: "Only a suspended institute can be resumed." }); return; }
  if (action === "archive" && currentStatus === "archived") { res.status(409).json({ error: "This institute is already archived." }); return; }
  if (action === "restore" && currentStatus !== "archived") { res.status(409).json({ error: "Only an archived institute can be restored." }); return; }
  const restoredStatus = institute.archivedFromStatus || "active";
  if (action === "restore" && ["expired", "cancelled"].includes(restoredStatus)) {
    res.status(409).json({ error: "This institute was archived from an expired or cancelled state. Change or renew its plan before restoring access." }); return;
  }
  const states: Record<string, string> = { activate: "active", suspend: "suspended", resume: "active", archive: "archived", restore: restoredStatus };
  const nextStatus = states[action];
  if (!nextStatus) { res.status(400).json({ error: "Choose Activate, Suspend, Resume, Archive, or Restore." }); return; }
  institute.status = nextStatus as any;
  if (action === "archive") {
    institute.archivedAt = now;
    institute.archivedFromStatus = currentStatus as any;
  }
  if (["restore", "resume", "activate"].includes(action)) {
    institute.archivedAt = undefined;
    if (action === "restore") institute.archivedFromStatus = undefined;
  }
  await institute.save();
  if (["suspend", "archive"].includes(action)) {
    await UserSession.updateMany({ instituteId: institute._id, revokedAt: null }, { $set: { revokedAt: now, revokeReason: action === "archive" ? "institute_archived" : "institute_suspended" } });
  }
  await recordPlatformAudit(req, `platform.institute.${action}`, "institute", id, { previousStatus, status: nextStatus });
  res.json(formatInstitute(institute));
});

router.post(`${ROOT}/:id/trial`, authenticate, authorizePlatform("platform.institutes.update"), async (req, res) => {
  const id = idOf(req);
  if (!objectId(id)) { res.status(400).json({ error: "Invalid institute id." }); return; }
  const action = text(req.body?.action, 16).toLowerCase();
  const days = Number(req.body?.days ?? 14);
  if (!["start", "extend"].includes(action) || !Number.isInteger(days) || days < 1 || days > 365) {
    res.status(400).json({ error: "Choose a trial action and a duration from 1 to 365 days." }); return;
  }
  const institute = await Institute.findById(id);
  if (!institute) { res.status(404).json({ error: "Institute not found." }); return; }
  const initialStatus = lowerStatus(institute.status);
  if (initialStatus === "suspended" || initialStatus === "archived") {
    res.status(409).json({ error: "Resume this institute before starting or extending its trial." }); return;
  }
  const current = await PlatformSubscription.findOne({ instituteId: institute._id }).sort({ createdAt: -1 });
  if (action === "extend" && (initialStatus !== "trial" || current?.status !== "trialing")) {
    res.status(409).json({ error: "Only an active trial can be extended. Use Start trial to begin a new trial." }); return;
  }
  const planId = text(req.body?.planId, 40) || (current?.planId ? String(current.planId) : "");
  if (!objectId(planId) || !await PlatformPlan.exists({ _id: planId, status: "active" })) {
    res.status(400).json({ error: "Select an active plan before starting a trial." }); return;
  }
  const now = new Date();
  const startsAt = action === "extend" && current?.status === "trialing" ? current.startsAt : now;
  const baseDate = action === "extend" && current?.status === "trialing" && current.endsAt && current.endsAt > now ? current.endsAt : now;
  const endsAt = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
  if (current && action === "extend" && current.status === "trialing") {
    current.endsAt = endsAt;
    await current.save();
  } else if (current) {
    current.planId = new Types.ObjectId(planId);
    current.status = "trialing";
    current.startsAt = startsAt;
    current.endsAt = endsAt;
    await current.save();
  } else {
    await PlatformSubscription.create({ instituteId: institute._id, planId, status: "trialing", billingCycle: "monthly", startsAt, endsAt });
  }
  institute.status = "trial";
  institute.expiryDate = endsAt;
  institute.plan = String((await PlatformPlan.findById(planId).select("code").lean())?.code ?? institute.plan);
  institute.archivedAt = undefined;
  await institute.save();
  await recordPlatformAudit(req, `platform.institute.trial.${action}`, "institute", id, { days, planId, endsAt });
  res.json(formatInstitute(institute));
});

router.patch(`${ROOT}/:id/subscription`, authenticate, authorizePlatform("platform.subscriptions.update"), async (req, res) => {
  const id = idOf(req);
  const planId = text(req.body?.planId, 40);
  if (!objectId(id) || !objectId(planId)) { res.status(400).json({ error: "Valid institute and plan ids are required." }); return; }
  const [institute, plan] = await Promise.all([
    Institute.findById(id), PlatformPlan.findOne({ _id: planId, status: "active" }),
  ]);
  if (!institute) { res.status(404).json({ error: "Institute not found." }); return; }
  if (!plan) { res.status(400).json({ error: "The selected plan is unavailable." }); return; }
  const now = new Date();
  let subscription = await PlatformSubscription.findOne({
    instituteId: institute._id,
    status: { $in: ["active", "trialing", "past_due"] },
    $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gt: now } }],
  }).sort({ createdAt: -1 });
  if (subscription) subscription.planId = plan._id;
  else subscription = new PlatformSubscription({ instituteId: institute._id, planId: plan._id, status: "active", billingCycle: "monthly", startsAt: new Date() });
  await subscription.save();
  institute.plan = plan.code;
  institute.maxStudents = plan.maxStudents;
  const currentInstituteStatus = lowerStatus(institute.status);
  const instituteTermExpired = ["active", "trial"].includes(currentInstituteStatus) && Boolean(institute.expiryDate && institute.expiryDate <= now);
  if (["expired", "cancelled"].includes(currentInstituteStatus) || instituteTermExpired) {
    institute.status = "active";
    institute.expiryDate = subscription.endsAt && subscription.endsAt > now ? subscription.endsAt : undefined;
  }
  await institute.save();
  await recordPlatformAudit(req, "platform.institute.subscription.change_plan", "subscription", String(subscription._id), { instituteId: id, planId });
  res.json({ institute: formatInstitute(institute), subscription: subscription.toJSON() });
});

router.post(`${ROOT}/:id/admins/:adminId/password-reset`, authenticate, authorizePlatform("platform.users.update"), async (req, res) => {
  const id = idOf(req);
  const adminId = idOf(req, "adminId");
  if (!objectId(id) || !objectId(adminId)) { res.status(400).json({ error: "Invalid institute or administrator id." }); return; }

  const admin = await User.findOne({ _id: adminId, instituteId: id, role: "institute_admin" });
  if (!admin) { res.status(404).json({ error: "Institute administrator not found." }); return; }

  const temporaryPassword = generateTemporaryPassword();
  admin.password = await bcrypt.hash(temporaryPassword, 12);
  await admin.save();

  const passwordSavedCorrectly = await bcrypt.compare(
  temporaryPassword,
  admin.password,
);

  console.log("=== INSTITUTE PASSWORD RESET VERIFY ===", {
    adminId: String(admin._id),
    email: admin.email,
    temporaryPasswordLength: temporaryPassword.length,
    hashLength: admin.password.length,
    bcryptVerifyAfterSave: passwordSavedCorrectly,
  });


  // A new temporary password invalidates all existing institute-admin sessions.
  await UserSession.updateMany(
    {
      userId: String(admin._id),
      instituteId: String(id),
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
        revokeReason: "admin_password_reset",
      },
    },
  );

  const emailSetup = await queueAdminPasswordSetup(admin, req, false).catch(() => false);

  await recordPlatformAudit(req, "platform.institute_admin.password_reset", "user", adminId, {
    instituteId: id,
    email: admin.email,
    delivery: emailSetup ? "queued" : "not_configured",
    method: "temporary_password",
  });

  res.status(200).json({
    message: "A new temporary password was generated. Existing administrator sessions were revoked.",
    admin: {
      id: String(admin._id),
      name: admin.name,
      email: admin.email,
      role: admin.role,
      temporaryPassword,
      passwordSetupEmailQueued: emailSetup,
    },
  });
});

router.post(`${ROOT}/:id/announcements`, authenticate, authorizePlatform("platform.notifications.create"), async (req, res) => {
  const id = idOf(req);
  const title = text(req.body?.title, 160);
  const message = text(req.body?.message, 5000);
  if (!objectId(id)) { res.status(400).json({ error: "Invalid institute id." }); return; }
  if (!title || !message) { res.status(400).json({ error: "Announcement title and message are required." }); return; }
  if (!await Institute.exists({ _id: id })) { res.status(404).json({ error: "Institute not found." }); return; }
  const notification = await Notification.create({ instituteId: id, title, message, type: "internal", target: "all-students", status: "sent", sentAt: new Date().toISOString() });
  await recordPlatformAudit(req, "platform.institute.announcement.send", "notification", String(notification._id), { instituteId: id, title });
  res.status(201).json({ id: String(notification._id), title: notification.title, createdAt: notification.createdAt });
});

router.delete(`${ROOT}/:id`, authenticate, authorizePlatform("platform.institutes.delete"), async (req, res) => {
  const id = idOf(req);
  if (!objectId(id)) { res.status(400).json({ error: "Invalid institute id." }); return; }
  const institute = await Institute.findById(id);
  if (!institute) { res.status(404).json({ error: "Institute not found." }); return; }
  institute.status = "archived";
  institute.archivedAt = new Date();
  await institute.save();
  await UserSession.updateMany({ instituteId: institute._id, revokedAt: null }, { $set: { revokedAt: institute.archivedAt, revokeReason: "institute_archived" } });
  await recordPlatformAudit(req, "platform.institute.archive", "institute", id, { instituteName: institute.instituteName });
  res.json({ archived: true, institute: formatInstitute(institute) });
});

export default router;
