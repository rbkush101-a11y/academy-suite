import { Router, type Request } from "express";
import { Types } from "mongoose";
import bcrypt from "bcryptjs";
import { authenticate } from "../middlewares/auth";
import { authorizePlatform, canAssignPlatformRole, isPlatformRole, PLATFORM_PERMISSION_CATALOG, PLATFORM_ROLE_CATALOG, PLATFORM_ROLE_PERMISSIONS, type PlatformRole } from "../lib/platform-rbac";
import { recordPlatformAudit } from "../lib/foundation";
import { getPlatformDashboard, getPlatformSystemHealth } from "../lib/platform-dashboard";
import { Institute } from "../models/Institute";
import { User } from "../models/User";
import { UserSession } from "../models/UserSession";
import { AuditLog } from "../models/AuditLog";
import { AuthSecurityEvent } from "../models/AuthSecurity";
import { clearRefreshCookie, recordSecurityEvent } from "../lib/auth-security";
import { PlatformAnnouncement, PlatformFeature, PlatformInvoice, PlatformNotification, PlatformPayment, PlatformPlan, PlatformSetting, PlatformSubscription, PlatformSupportTicket } from "../models/Platform";

const router = Router();
const ROOT = "/v1/platform";
const idOf = (req: Request, key = "id") => Array.isArray(req.params[key]) ? req.params[key][0] : req.params[key];
const isValidId = (value: string) => Types.ObjectId.isValid(value);
const cleanText = (value: unknown) => String(value ?? "").trim();
const hasStrongPassword = (password: string) =>
  Buffer.byteLength(password, "utf8") <= 72 && password.length >= 12 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);
const PLATFORM_ROLE_KEYS: PlatformRole[] = ["super_admin", "platform_admin", "support_admin", "finance_admin", "read_only_admin"];
const ALLOWED_PLATFORM_SETTINGS = new Set(["platformName", "supportEmail", "supportUrl", "maintenanceMode", "defaultCurrency", "defaultLocale", "billingContactEmail"]);

async function reconcileInvoice(invoiceId: string): Promise<void> {
  const invoice = await PlatformInvoice.findById(invoiceId).select("total status");
  if (!invoice || invoice.status === "void") return;
  const totals = await PlatformPayment.aggregate([
    { $match: { invoiceId: invoice._id, status: "succeeded" } },
    { $group: { _id: null, paid: { $sum: "$amount" } } },
  ]);
  const isPaid = (totals[0]?.paid ?? 0) >= invoice.total;
  invoice.status = isPaid ? "paid" : "issued";
  invoice.paidAt = isPaid ? new Date() : undefined;
  await invoice.save();
}

function formatInstitute(institute: any) {
  return {
    id: String(institute._id), instituteName: institute.instituteName, instituteType: institute.instituteType,
    ownerName: institute.ownerName, email: institute.email, phone: institute.phone, address: institute.address ?? "",
    plan: institute.plan, status: institute.status, expiryDate: institute.expiryDate ?? null, maxStudents: institute.maxStudents,
    createdAt: institute.createdAt ?? null, updatedAt: institute.updatedAt ?? null,
  };
}

function formatPlatformUser(user: any) {
  return {
    id: String(user._id), name: user.name, email: user.email, loginId: user.loginId ?? "", role: user.role,
    instituteId: user.instituteId ? String(user.instituteId) : null, isApproved: user.isApproved,
    createdAt: user.createdAt ?? null,
  };
}

router.get(`${ROOT}/roles`, authenticate, authorizePlatform("platform.users.view"), (req, res) => {
  res.json(PLATFORM_ROLE_CATALOG.map((role) => ({
    ...role,
    permissions: PLATFORM_ROLE_PERMISSIONS[role.key],
    assignable: canAssignPlatformRole(req.platformRole!, role.key),
  })));
});

router.get(`${ROOT}/permissions`, authenticate, authorizePlatform("platform.users.view"), (_req, res) => {
  res.json(PLATFORM_PERMISSION_CATALOG);
});

router.get(`${ROOT}/dashboard`, authenticate, authorizePlatform("platform.dashboard.view"), async (req, res) => {
  try {
    res.json(await getPlatformDashboard(req.query.startDate, req.query.endDate));
  } catch (error) {
    if (error instanceof RangeError) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }
});

router.get(`${ROOT}/institutes`, authenticate, authorizePlatform("platform.institutes.view"), async (req, res) => {
  const filter: Record<string, unknown> = {};
  const search = cleanText(req.query.search);
  if (req.query.status) filter.status = req.query.status;
  if (req.query.plan) filter.plan = req.query.plan;
  if (search) filter.$or = [
    { instituteName: { $regex: search, $options: "i" } },
    { ownerName: { $regex: search, $options: "i" } },
    { email: { $regex: search, $options: "i" } },
  ];
  const institutes = await Institute.find(filter).sort({ createdAt: -1 }).limit(500);
  res.json(institutes.map(formatInstitute));
});

router.post(`${ROOT}/institutes`, authenticate, authorizePlatform("platform.institutes.create"), async (req, res) => {
  const { instituteName, instituteType, ownerName, email, phone, address, plan, status, expiryDate, maxStudents } = req.body;
  if (![instituteName, instituteType, ownerName, email, phone].every((value) => cleanText(value))) {
    res.status(400).json({ error: "instituteName, instituteType, ownerName, email and phone are required" });
    return;
  }
  const institute = await Institute.create({ instituteName, instituteType, ownerName, email: cleanText(email).toLowerCase(), phone, address, plan, status, expiryDate, maxStudents });
  await recordPlatformAudit(req, "platform.institute.create", "institute", String(institute._id), { instituteName: institute.instituteName });
  res.status(201).json(formatInstitute(institute));
});

router.patch(`${ROOT}/institutes/:id`, authenticate, authorizePlatform("platform.institutes.update"), async (req, res) => {
  const id = idOf(req);
  if (!isValidId(id)) { res.status(400).json({ error: "Invalid institute id" }); return; }
  const allowed = ["instituteName", "instituteType", "ownerName", "email", "phone", "address", "plan", "status", "expiryDate", "maxStudents"];
  const update = Object.fromEntries(Object.entries(req.body as Record<string, unknown>).filter(([key]) => allowed.includes(key)));
  if (!Object.keys(update).length) { res.status(400).json({ error: "No supported institute fields were provided" }); return; }
  if (typeof update.email === "string") update.email = update.email.trim().toLowerCase();
  const institute = await Institute.findByIdAndUpdate(id, update, { returnDocument: "after", runValidators: true });
  if (!institute) { res.status(404).json({ error: "Institute not found" }); return; }
  await recordPlatformAudit(req, "platform.institute.update", "institute", id, { changedFields: Object.keys(update) });
  res.json(formatInstitute(institute));
});

router.delete(`${ROOT}/institutes/:id`, authenticate, authorizePlatform("platform.institutes.delete"), async (req, res) => {
  const id = idOf(req);
  if (!isValidId(id)) { res.status(400).json({ error: "Invalid institute id" }); return; }
  const institute = await Institute.findByIdAndUpdate(id, { status: "inactive" }, { returnDocument: "after", runValidators: true });
  if (!institute) { res.status(404).json({ error: "Institute not found" }); return; }
  await recordPlatformAudit(req, "platform.institute.deactivate", "institute", id, { instituteName: institute.instituteName });
  res.sendStatus(204);
});

router.post(`${ROOT}/institutes/:id/admin`, authenticate, authorizePlatform("platform.users.create"), async (req, res) => {
  const instituteId = idOf(req);
  if (!isValidId(instituteId)) { res.status(400).json({ error: "Invalid institute id" }); return; }
  const name = cleanText(req.body.name);
  const email = cleanText(req.body.email).toLowerCase();
  const password = String(req.body.password ?? "");
  if (!name || !email || password.length < 10) { res.status(400).json({ error: "name and email are required; password must contain at least 10 characters" }); return; }
  const institute = await Institute.findById(instituteId);
  if (!institute) { res.status(404).json({ error: "Institute not found" }); return; }
  if (await User.exists({ email })) { res.status(409).json({ error: "Email already registered" }); return; }
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 12), role: "institute_admin", instituteId: institute._id, isApproved: true });
  await recordPlatformAudit(req, "platform.institute_admin.create", "user", String(user._id), { instituteId, email });
  res.status(201).json(formatPlatformUser(user));
});

router.get(`${ROOT}/users`, authenticate, authorizePlatform("platform.users.view"), async (req, res) => {
  const filter: Record<string, unknown> = {};
  const role = cleanText(req.query.role);
  if (role) filter.role = role;
  if (req.query.instituteId) {
    const instituteId = cleanText(req.query.instituteId);
    if (!isValidId(instituteId)) { res.status(400).json({ error: "Invalid institute id" }); return; }
    filter.instituteId = instituteId;
  }
  const search = cleanText(req.query.search);
  if (search) filter.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }];
  const users = await User.find(filter).select("name email loginId role instituteId isApproved createdAt").sort({ createdAt: -1 }).limit(500);
  await recordPlatformAudit(req, "platform.users.list", "user", "", { count: users.length, instituteScoped: Boolean(req.query.instituteId) });
  res.json(users.map(formatPlatformUser));
});

router.post(`${ROOT}/users`, authenticate, authorizePlatform("platform.users.create"), async (req, res) => {
  const name = cleanText(req.body.name);
  const email = cleanText(req.body.email).toLowerCase();
  const password = String(req.body.password ?? "");
  const role = cleanText(req.body.role);
  if (!name || !email || !hasStrongPassword(password) || !isPlatformRole(role)) {
    res.status(400).json({ error: "name, email, a platform role, and a 12+ character password with upper/lowercase letters and a number are required" });
    return;
  }
  if (!canAssignPlatformRole(req.platformRole!, role)) { res.status(403).json({ error: "You cannot assign this platform role" }); return; }
  if (await User.exists({ email })) { res.status(409).json({ error: "Email already registered" }); return; }
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 12), role, isApproved: true });
  await recordPlatformAudit(req, "platform.user.create", "user", String(user._id), { email, role });
  res.status(201).json(formatPlatformUser(user));
});

router.patch(`${ROOT}/users/:id`, authenticate, authorizePlatform("platform.users.update"), async (req, res) => {
  const id = idOf(req);
  if (!isValidId(id)) { res.status(400).json({ error: "Invalid user id" }); return; }
  const user = await User.findById(id);
  if (!user || user.instituteId || !isPlatformRole(user.role)) { res.status(404).json({ error: "Platform user not found" }); return; }
  const update: Record<string, unknown> = {};
  let emailChanged = false;
  let roleChanged = false;
  if (req.body.name !== undefined) update.name = cleanText(req.body.name);
  if (req.body.email !== undefined) {
    update.email = cleanText(req.body.email).toLowerCase();
    emailChanged = update.email !== user.email;
    if (emailChanged) update.emailVerifiedAt = null;
  }
  if (req.body.isApproved !== undefined) update.isApproved = Boolean(req.body.isApproved);
  if (req.body.role !== undefined) {
    if (!isPlatformRole(cleanText(req.body.role)) || !PLATFORM_ROLE_PERMISSIONS[req.platformRole!].includes("platform.users.manage_roles")) {
      res.status(403).json({ error: "Your platform role cannot change platform roles" }); return;
    }
    const nextRole = cleanText(req.body.role) as PlatformRole;
    if (!canAssignPlatformRole(req.platformRole!, nextRole)) { res.status(403).json({ error: "You cannot assign this platform role" }); return; }
    roleChanged = nextRole !== user.role;
    update.role = nextRole;
  }
  if (!Object.keys(update).length) { res.status(400).json({ error: "No supported user fields were provided" }); return; }
  Object.assign(user, update);
  await user.save();
  if (roleChanged || emailChanged || update.isApproved === false) {
    const revokeReason = roleChanged ? "role_changed" : emailChanged ? "email_changed" : "account_deactivated";
    await UserSession.updateMany({ userId: id, principalType: "user", revokedAt: null }, { $set: { revokedAt: new Date(), revokeReason } });
  }
  await recordPlatformAudit(req, "platform.user.update", "user", id, { changedFields: Object.keys(update), role: user.role });
  res.json(formatPlatformUser(user));
});

router.delete(`${ROOT}/users/:id`, authenticate, authorizePlatform("platform.users.delete"), async (req, res) => {
  const id = idOf(req);
  if (!isValidId(id)) { res.status(400).json({ error: "Invalid user id" }); return; }
  const user = await User.findById(id);
  if (!user || user.instituteId || !isPlatformRole(user.role)) { res.status(404).json({ error: "Platform user not found" }); return; }
  if (user.role === "super_admin" && req.platformRole !== "super_admin") { res.status(403).json({ error: "Only SUPER_ADMIN can deactivate a SUPER_ADMIN" }); return; }
  if (user.role === "platform_admin" && req.platformRole !== "super_admin") { res.status(403).json({ error: "Only SUPER_ADMIN can deactivate a PLATFORM_ADMIN" }); return; }
  user.isApproved = false;
  await user.save();
  await UserSession.updateMany({ userId: id, principalType: "user", revokedAt: null }, { $set: { revokedAt: new Date(), revokeReason: "account_deactivated" } });
  await recordPlatformAudit(req, "platform.user.deactivate", "user", id, { email: user.email, role: user.role });
  res.sendStatus(204);
});

router.get(`${ROOT}/plans`, authenticate, authorizePlatform("platform.plans.view"), async (_req, res) => {
  res.json(await PlatformPlan.find().sort({ createdAt: -1 }).lean());
});
router.post(`${ROOT}/plans`, authenticate, authorizePlatform("platform.plans.create"), async (req, res) => {
  const plan = await PlatformPlan.create(req.body);
  await recordPlatformAudit(req, "platform.plan.create", "plan", String(plan._id), { code: plan.code });
  res.status(201).json(plan);
});
router.patch(`${ROOT}/plans/:id`, authenticate, authorizePlatform("platform.plans.update"), async (req, res) => {
  const id = idOf(req);
  if (!isValidId(id)) { res.status(400).json({ error: "Invalid plan id" }); return; }
  const fields = ["name", "description", "currency", "monthlyPrice", "yearlyPrice", "maxStudents", "maxBranches", "features", "status"];
  const update = Object.fromEntries(Object.entries(req.body as Record<string, unknown>).filter(([key]) => fields.includes(key)));
  const plan = await PlatformPlan.findByIdAndUpdate(id, update, { returnDocument: "after", runValidators: true });
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
  await recordPlatformAudit(req, "platform.plan.update", "plan", id, { changedFields: Object.keys(update) });
  res.json(plan);
});
router.delete(`${ROOT}/plans/:id`, authenticate, authorizePlatform("platform.plans.delete"), async (req, res) => {
  const id = idOf(req);
  if (!isValidId(id)) { res.status(400).json({ error: "Invalid plan id" }); return; }
  const plan = await PlatformPlan.findByIdAndUpdate(id, { status: "archived" }, { returnDocument: "after" });
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
  await recordPlatformAudit(req, "platform.plan.archive", "plan", id, { code: plan.code });
  res.sendStatus(204);
});

router.get(`${ROOT}/features`, authenticate, authorizePlatform("platform.features.view"), async (_req, res) => {
  res.json(await PlatformFeature.find().sort({ key: 1 }).lean());
});
router.post(`${ROOT}/features`, authenticate, authorizePlatform("platform.features.create"), async (req, res) => {
  const feature = await PlatformFeature.create(req.body);
  await recordPlatformAudit(req, "platform.feature.create", "feature", String(feature._id), { key: feature.key });
  res.status(201).json(feature);
});
router.patch(`${ROOT}/features/:id`, authenticate, authorizePlatform("platform.features.update"), async (req, res) => {
  const id = idOf(req);
  if (!isValidId(id)) { res.status(400).json({ error: "Invalid feature id" }); return; }
  const fields = ["name", "description", "enabled"];
  const update = Object.fromEntries(Object.entries(req.body as Record<string, unknown>).filter(([key]) => fields.includes(key)));
  const feature = await PlatformFeature.findByIdAndUpdate(id, update, { returnDocument: "after", runValidators: true });
  if (!feature) { res.status(404).json({ error: "Feature not found" }); return; }
  await recordPlatformAudit(req, "platform.feature.update", "feature", id, { changedFields: Object.keys(update) });
  res.json(feature);
});
router.delete(`${ROOT}/features/:id`, authenticate, authorizePlatform("platform.features.delete"), async (req, res) => {
  const id = idOf(req);
  if (!isValidId(id)) { res.status(400).json({ error: "Invalid feature id" }); return; }
  const feature = await PlatformFeature.findByIdAndDelete(id);
  if (!feature) { res.status(404).json({ error: "Feature not found" }); return; }
  await recordPlatformAudit(req, "platform.feature.delete", "feature", id, { key: feature.key });
  res.sendStatus(204);
});

router.get(`${ROOT}/subscriptions`, authenticate, authorizePlatform("platform.subscriptions.view"), async (req, res) => {
  const filter: Record<string, unknown> = {};
  if (req.query.instituteId) filter.instituteId = req.query.instituteId;
  if (req.query.status) filter.status = req.query.status;
  res.json(await PlatformSubscription.find(filter).populate("planId", "code name currency monthlyPrice yearlyPrice").sort({ createdAt: -1 }).limit(500).lean());
});
router.post(`${ROOT}/subscriptions`, authenticate, authorizePlatform("platform.subscriptions.create"), async (req, res) => {
  const instituteId = cleanText(req.body.instituteId);
  const planId = cleanText(req.body.planId);
  if (!isValidId(instituteId) || !isValidId(planId)) { res.status(400).json({ error: "Valid instituteId and planId are required" }); return; }
  const [institute, plan] = await Promise.all([Institute.exists({ _id: instituteId }), PlatformPlan.exists({ _id: planId, status: "active" })]);
  if (!institute || !plan) { res.status(400).json({ error: "An active platform plan and existing institute are required" }); return; }
  const subscription = await PlatformSubscription.create({ instituteId, planId, billingCycle: req.body.billingCycle, status: req.body.status, startsAt: req.body.startsAt, endsAt: req.body.endsAt, externalReference: req.body.externalReference });
  await recordPlatformAudit(req, "platform.subscription.create", "subscription", String(subscription._id), { instituteId, planId, status: subscription.status });
  res.status(201).json(subscription);
});
router.patch(`${ROOT}/subscriptions/:id`, authenticate, authorizePlatform("platform.subscriptions.update"), async (req, res) => {
  const id = idOf(req);
  if (!isValidId(id)) { res.status(400).json({ error: "Invalid subscription id" }); return; }
  const fields = ["planId", "status", "billingCycle", "startsAt", "endsAt", "externalReference"];
  const update = Object.fromEntries(Object.entries(req.body as Record<string, unknown>).filter(([key]) => fields.includes(key)));
  if (update.planId && (!isValidId(cleanText(update.planId)) || !await PlatformPlan.exists({ _id: update.planId, status: "active" }))) { res.status(400).json({ error: "planId must identify an active platform plan" }); return; }
  const subscription = await PlatformSubscription.findByIdAndUpdate(id, update, { returnDocument: "after", runValidators: true });
  if (!subscription) { res.status(404).json({ error: "Subscription not found" }); return; }
  await recordPlatformAudit(req, "platform.subscription.update", "subscription", id, { changedFields: Object.keys(update) });
  res.json(subscription);
});
router.delete(`${ROOT}/subscriptions/:id`, authenticate, authorizePlatform("platform.subscriptions.delete"), async (req, res) => {
  const id = idOf(req);
  if (!isValidId(id)) { res.status(400).json({ error: "Invalid subscription id" }); return; }
  const subscription = await PlatformSubscription.findByIdAndUpdate(id, { status: "canceled", endsAt: new Date() }, { returnDocument: "after", runValidators: true });
  if (!subscription) { res.status(404).json({ error: "Subscription not found" }); return; }
  await recordPlatformAudit(req, "platform.subscription.cancel", "subscription", id, { instituteId: String(subscription.instituteId) });
  res.sendStatus(204);
});

router.get(`${ROOT}/payments`, authenticate, authorizePlatform("platform.payments.view"), async (req, res) => {
  const filter: Record<string, unknown> = {};
  if (req.query.instituteId) filter.instituteId = req.query.instituteId;
  if (req.query.status) filter.status = req.query.status;
  res.json(await PlatformPayment.find(filter).sort({ createdAt: -1 }).limit(500).lean());
});
router.post(`${ROOT}/payments`, authenticate, authorizePlatform("platform.payments.create"), async (req, res) => {
  const instituteId = cleanText(req.body.instituteId);
  if (!isValidId(instituteId) || !await Institute.exists({ _id: instituteId })) { res.status(400).json({ error: "An existing instituteId is required" }); return; }
  if (req.body.invoiceId && !isValidId(cleanText(req.body.invoiceId))) { res.status(400).json({ error: "Invalid invoiceId" }); return; }
  if (req.body.invoiceId && !await PlatformInvoice.exists({ _id: req.body.invoiceId, instituteId })) { res.status(400).json({ error: "invoiceId must belong to the selected institute" }); return; }
  const payment = await PlatformPayment.create({ instituteId, invoiceId: req.body.invoiceId || undefined, amount: req.body.amount, currency: req.body.currency, status: req.body.status, provider: req.body.provider, reference: req.body.reference, paidAt: req.body.paidAt });
  if (payment.invoiceId) await reconcileInvoice(String(payment.invoiceId));
  await recordPlatformAudit(req, "platform.payment.create", "payment", String(payment._id), { instituteId, amount: payment.amount, status: payment.status });
  res.status(201).json(payment);
});
router.patch(`${ROOT}/payments/:id`, authenticate, authorizePlatform("platform.payments.update"), async (req, res) => {
  const id = idOf(req);
  if (!isValidId(id)) { res.status(400).json({ error: "Invalid payment id" }); return; }
  const fields = ["status", "provider", "reference", "paidAt"];
  const update = Object.fromEntries(Object.entries(req.body as Record<string, unknown>).filter(([key]) => fields.includes(key)));
  const payment = await PlatformPayment.findByIdAndUpdate(id, update, { returnDocument: "after", runValidators: true });
  if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }
  if (payment.invoiceId) await reconcileInvoice(String(payment.invoiceId));
  await recordPlatformAudit(req, "platform.payment.update", "payment", id, { changedFields: Object.keys(update) });
  res.json(payment);
});

router.get(`${ROOT}/invoices`, authenticate, authorizePlatform("platform.invoices.view"), async (req, res) => {
  const filter: Record<string, unknown> = {};
  if (req.query.instituteId) filter.instituteId = req.query.instituteId;
  if (req.query.status) filter.status = req.query.status;
  res.json(await PlatformInvoice.find(filter).sort({ createdAt: -1 }).limit(500).lean());
});
router.post(`${ROOT}/invoices`, authenticate, authorizePlatform("platform.invoices.create"), async (req, res) => {
  const instituteId = cleanText(req.body.instituteId);
  const invoiceNumber = cleanText(req.body.invoiceNumber);
  if (!isValidId(instituteId) || !await Institute.exists({ _id: instituteId }) || !invoiceNumber) { res.status(400).json({ error: "Existing instituteId and invoiceNumber are required" }); return; }
  const items = Array.isArray(req.body.lineItems) ? req.body.lineItems as Array<Record<string, unknown>> : [];
  if (!items.length || items.some((item) => !cleanText(item.description) || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0 || !Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) < 0)) {
    res.status(400).json({ error: "At least one valid invoice line item is required" }); return;
  }
  const lineItems = items.map((item) => ({ description: cleanText(item.description), quantity: Number(item.quantity), unitPrice: Number(item.unitPrice), amount: Number(item.quantity) * Number(item.unitPrice) }));
  const subscriptionId = req.body.subscriptionId ? cleanText(req.body.subscriptionId) : "";
  if (subscriptionId && (!isValidId(subscriptionId) || !await PlatformSubscription.exists({ _id: subscriptionId, instituteId }))) { res.status(400).json({ error: "subscriptionId must belong to the selected institute" }); return; }
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = Number(req.body.taxAmount ?? 0);
  if (!Number.isFinite(taxAmount) || taxAmount < 0) { res.status(400).json({ error: "taxAmount must be a non-negative number" }); return; }
  const invoice = await PlatformInvoice.create({ invoiceNumber, instituteId, subscriptionId: subscriptionId || undefined, currency: req.body.currency, lineItems, subtotal, taxAmount, total: subtotal + taxAmount, status: "issued", issuedAt: req.body.issuedAt ?? new Date(), dueAt: req.body.dueAt });
  await recordPlatformAudit(req, "platform.invoice.create", "invoice", String(invoice._id), { invoiceNumber, instituteId, total: invoice.total });
  res.status(201).json(invoice);
});
router.patch(`${ROOT}/invoices/:id`, authenticate, authorizePlatform("platform.invoices.update"), async (req, res) => {
  const id = idOf(req);
  if (!isValidId(id)) { res.status(400).json({ error: "Invalid invoice id" }); return; }
  const fields = ["status", "dueAt", "issuedAt"];
  const update = Object.fromEntries(Object.entries(req.body as Record<string, unknown>).filter(([key]) => fields.includes(key)));
  if (update.status === "paid") { res.status(400).json({ error: "An invoice is marked paid through successful payment records" }); return; }
  const invoice = await PlatformInvoice.findByIdAndUpdate(id, update, { returnDocument: "after", runValidators: true });
  if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }
  await recordPlatformAudit(req, "platform.invoice.update", "invoice", id, { changedFields: Object.keys(update) });
  res.json(invoice);
});

router.get(`${ROOT}/analytics`, authenticate, authorizePlatform("platform.analytics.view"), async (_req, res) => {
  const [institutesByStatus, subscriptionsByStatus, paymentTotals, invoiceTotals, newInstitutes] = await Promise.all([
    Institute.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    PlatformSubscription.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    PlatformPayment.aggregate([{ $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$amount" } } }]),
    PlatformInvoice.aggregate([{ $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$total" } } }]),
    Institute.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
  ]);
  res.json({ institutesByStatus, subscriptionsByStatus, paymentTotals, invoiceTotals, newInstitutesLast30Days: newInstitutes });
});

router.get(`${ROOT}/support`, authenticate, authorizePlatform("platform.support.view"), async (req, res) => {
  const filter: Record<string, unknown> = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.priority) filter.priority = req.query.priority;
  res.json(await PlatformSupportTicket.find(filter).sort({ createdAt: -1 }).limit(500).lean());
});
router.post(`${ROOT}/support`, authenticate, authorizePlatform("platform.support.create"), async (req, res) => {
  const ticketNumber = cleanText(req.body.ticketNumber);
  const subject = cleanText(req.body.subject);
  const message = cleanText(req.body.message);
  const requesterEmail = cleanText(req.body.requesterEmail).toLowerCase();
  if (!ticketNumber || !subject || !message || !requesterEmail) { res.status(400).json({ error: "ticketNumber, subject, message and requesterEmail are required" }); return; }
  const instituteId = req.body.instituteId ? cleanText(req.body.instituteId) : "";
  if (instituteId && (!isValidId(instituteId) || !await Institute.exists({ _id: instituteId }))) { res.status(400).json({ error: "instituteId must identify an existing institute" }); return; }
  const ticket = await PlatformSupportTicket.create({ ticketNumber, subject, message, requesterEmail, instituteId: instituteId || undefined, priority: req.body.priority });
  await recordPlatformAudit(req, "platform.support.create", "support_ticket", String(ticket._id), { ticketNumber, instituteId: instituteId || null });
  res.status(201).json(ticket);
});
router.patch(`${ROOT}/support/:id`, authenticate, authorizePlatform("platform.support.update"), async (req, res) => {
  const id = idOf(req);
  if (!isValidId(id)) { res.status(400).json({ error: "Invalid ticket id" }); return; }
  const fields = ["status", "priority", "assignedTo"];
  const update = Object.fromEntries(Object.entries(req.body as Record<string, unknown>).filter(([key]) => fields.includes(key)));
  if (update.assignedTo) {
    const assigneeId = cleanText(update.assignedTo);
    if (!isValidId(assigneeId) || !await User.exists({ _id: assigneeId, role: { $in: PLATFORM_ROLE_KEYS }, instituteId: { $exists: false }, isApproved: true })) {
      res.status(400).json({ error: "assignedTo must identify an approved platform administrator" }); return;
    }
    update.assignedTo = assigneeId;
  }
  const ticket = await PlatformSupportTicket.findByIdAndUpdate(id, update, { returnDocument: "after", runValidators: true });
  if (!ticket) { res.status(404).json({ error: "Support ticket not found" }); return; }
  await recordPlatformAudit(req, "platform.support.update", "support_ticket", id, { changedFields: Object.keys(update), status: ticket.status });
  res.json(ticket);
});
router.delete(`${ROOT}/support/:id`, authenticate, authorizePlatform("platform.support.delete"), async (req, res) => {
  const id = idOf(req);
  if (!isValidId(id)) { res.status(400).json({ error: "Invalid ticket id" }); return; }
  const ticket = await PlatformSupportTicket.findByIdAndUpdate(id, { status: "closed" }, { returnDocument: "after", runValidators: true });
  if (!ticket) { res.status(404).json({ error: "Support ticket not found" }); return; }
  await recordPlatformAudit(req, "platform.support.close", "support_ticket", id, { ticketNumber: ticket.ticketNumber });
  res.sendStatus(204);
});

router.get(`${ROOT}/notifications`, authenticate, authorizePlatform("platform.notifications.view"), async (_req, res) => {
  res.json(await PlatformNotification.find().sort({ createdAt: -1 }).limit(500).lean());
});
router.post(`${ROOT}/notifications`, authenticate, authorizePlatform("platform.notifications.create"), async (req, res) => {
  const notification = await PlatformNotification.create({ ...req.body, createdBy: req.user!.userId });
  await recordPlatformAudit(req, "platform.notification.create", "platform_notification", String(notification._id), { audience: notification.audience, status: notification.status, channel: notification.channel });
  res.status(201).json(notification);
});
router.patch(`${ROOT}/notifications/:id`, authenticate, authorizePlatform("platform.notifications.update"), async (req, res) => {
  const id = idOf(req);
  if (!isValidId(id)) { res.status(400).json({ error: "Invalid notification id" }); return; }
  const fields = ["title", "message", "audience", "channel", "status", "scheduledAt"];
  const update = Object.fromEntries(Object.entries(req.body as Record<string, unknown>).filter(([key]) => fields.includes(key)));
  const notification = await PlatformNotification.findByIdAndUpdate(id, update, { returnDocument: "after", runValidators: true });
  if (!notification) { res.status(404).json({ error: "Notification not found" }); return; }
  await recordPlatformAudit(req, "platform.notification.update", "platform_notification", id, { changedFields: Object.keys(update) });
  res.json(notification);
});
router.delete(`${ROOT}/notifications/:id`, authenticate, authorizePlatform("platform.notifications.delete"), async (req, res) => {
  const id = idOf(req);
  if (!isValidId(id)) { res.status(400).json({ error: "Invalid notification id" }); return; }
  const notification = await PlatformNotification.findByIdAndDelete(id);
  if (!notification) { res.status(404).json({ error: "Notification not found" }); return; }
  await recordPlatformAudit(req, "platform.notification.delete", "platform_notification", id);
  res.sendStatus(204);
});

router.get(`${ROOT}/announcements`, authenticate, authorizePlatform("platform.announcements.view"), async (_req, res) => {
  res.json(await PlatformAnnouncement.find().sort({ createdAt: -1 }).limit(500).lean());
});
router.post(`${ROOT}/announcements`, authenticate, authorizePlatform("platform.announcements.create"), async (req, res) => {
  const announcement = await PlatformAnnouncement.create({ ...req.body, createdBy: req.user!.userId });
  await recordPlatformAudit(req, "platform.announcement.create", "announcement", String(announcement._id), { audience: announcement.audience, status: announcement.status });
  res.status(201).json(announcement);
});
router.patch(`${ROOT}/announcements/:id`, authenticate, authorizePlatform("platform.announcements.update"), async (req, res) => {
  const id = idOf(req);
  if (!isValidId(id)) { res.status(400).json({ error: "Invalid announcement id" }); return; }
  const fields = ["title", "message", "audience", "status", "scheduledAt", "publishedAt"];
  const update = Object.fromEntries(Object.entries(req.body as Record<string, unknown>).filter(([key]) => fields.includes(key)));
  const announcement = await PlatformAnnouncement.findByIdAndUpdate(id, update, { returnDocument: "after", runValidators: true });
  if (!announcement) { res.status(404).json({ error: "Announcement not found" }); return; }
  await recordPlatformAudit(req, "platform.announcement.update", "announcement", id, { changedFields: Object.keys(update) });
  res.json(announcement);
});
router.delete(`${ROOT}/announcements/:id`, authenticate, authorizePlatform("platform.announcements.delete"), async (req, res) => {
  const id = idOf(req);
  if (!isValidId(id)) { res.status(400).json({ error: "Invalid announcement id" }); return; }
  const announcement = await PlatformAnnouncement.findByIdAndDelete(id);
  if (!announcement) { res.status(404).json({ error: "Announcement not found" }); return; }
  await recordPlatformAudit(req, "platform.announcement.delete", "announcement", id);
  res.sendStatus(204);
});

router.get(`${ROOT}/audit`, authenticate, authorizePlatform("platform.audit.view"), async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const filter: Record<string, unknown> = { scope: "platform" };
  if (req.query.action) filter.action = req.query.action;
  if (req.query.actorId) filter.actorId = req.query.actorId;
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ items, page, limit, total });
});

router.get(`${ROOT}/security/profile`, authenticate, authorizePlatform("platform.security.view"), async (req, res) => {
  const user = await User.findById(req.user!.userId).select("email emailVerifiedAt twoFactorEnabled createdAt").lean();
  if (!user) { res.status(404).json({ error: "Platform account not found" }); return; }
  res.json({ email: user.email, emailVerifiedAt: user.emailVerifiedAt ?? null, twoFactorEnabled: user.twoFactorEnabled, accountCreatedAt: user.createdAt });
});

router.get(`${ROOT}/security/sessions`, authenticate, authorizePlatform("platform.security.view"), async (req, res) => {
  const possiblePlatformUsers = await User.find({ role: { $in: PLATFORM_ROLE_KEYS }, instituteId: { $exists: false } }).select("_id name email role activeBranchId branchIds customRoleId").lean();
  const platformUsers = possiblePlatformUsers.filter((user) => !user.activeBranchId && !user.customRoleId && !user.branchIds?.length);
  const userIds = platformUsers.map((user) => String(user._id));
  const sessions = userIds.length ? await UserSession.find({ userId: { $in: userIds }, principalType: "user", instituteId: { $exists: false }, revokedAt: null, expiresAt: { $gt: new Date() } }).sort({ lastSeenAt: -1 }).limit(500).lean() : [];
  const usersById = new Map(platformUsers.map((user) => [String(user._id), user]));
  await recordPlatformAudit(req, "platform.security.sessions_view", "session", "", { count: sessions.length });
  res.json(sessions.map((session) => ({
    ...session,
    current: String(session._id) === req.user!.sessionId,
    user: usersById.get(session.userId) ?? null,
  })));
});
router.post(`${ROOT}/security/sessions/:id/revoke`, authenticate, authorizePlatform("platform.security.manage"), async (req, res) => {
  const id = idOf(req);
  if (!isValidId(id)) { res.status(400).json({ error: "Invalid session id" }); return; }
  const possiblePlatformUsers = await User.find({ role: { $in: PLATFORM_ROLE_KEYS }, instituteId: { $exists: false } }).select("_id activeBranchId branchIds customRoleId").lean();
  const platformUsers = possiblePlatformUsers.filter((user) => !user.activeBranchId && !user.customRoleId && !user.branchIds?.length);
  const userIds = platformUsers.map((user) => String(user._id));
  const session = await UserSession.findOneAndUpdate({ _id: id, userId: { $in: userIds }, principalType: "user", instituteId: { $exists: false }, revokedAt: null }, { $set: { revokedAt: new Date(), revokeReason: "platform_admin_revoke" } }, { returnDocument: "after" });
  if (!session) { res.status(404).json({ error: "Active platform session not found" }); return; }
  if (String(session._id) === req.user!.sessionId) clearRefreshCookie(res);
  await recordSecurityEvent(req, "session.revoked_by_admin", "success", { targetUserId: session.userId }, {
    userId: req.user!.userId, email: req.user!.email, role: req.user!.role, sessionId: String(session._id), scope: "platform",
  });
  await recordPlatformAudit(req, "platform.security.session_revoke", "session", id, { userId: session.userId });
  res.json({ id: String(session._id), revokedAt: session.revokedAt });
});

router.post(`${ROOT}/security/logout-all`, authenticate, authorizePlatform("platform.security.manage"), async (req, res) => {
  clearRefreshCookie(res);
  const result = await UserSession.updateMany(
    { userId: req.user!.userId, principalType: "user", instituteId: { $exists: false }, revokedAt: null },
    { $set: { revokedAt: new Date(), revokeReason: "logout_all" } },
  );
  await recordSecurityEvent(req, "logout_all", "success", { revokedSessions: result.modifiedCount, source: "platform_security" }, {
    userId: req.user!.userId, email: req.user!.email, role: req.user!.role, sessionId: req.user!.sessionId, scope: "platform",
  });
  res.sendStatus(204);
});

router.get(`${ROOT}/security/login-history`, authenticate, authorizePlatform("platform.security.view"), async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const filter = { scope: "platform" as const, userId: req.user!.userId };
  const [items, total] = await Promise.all([
    AuthSecurityEvent.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select("event outcome ipAddress userAgent deviceName sessionId details createdAt").lean(),
    AuthSecurityEvent.countDocuments(filter),
  ]);
  await recordPlatformAudit(req, "platform.security.login_history_view", "auth_security_event", "", { page, limit });
  res.json({ items, page, limit, total });
});

router.get(`${ROOT}/system-health`, authenticate, authorizePlatform("platform.system_health.view"), async (_req, res) => {
  res.json(await getPlatformSystemHealth());
});

router.get(`${ROOT}/settings`, authenticate, authorizePlatform("platform.settings.view"), async (_req, res) => {
  const settings = await PlatformSetting.find().sort({ key: 1 }).lean();
  res.json(Object.fromEntries(settings.map(({ key, value }) => [key, value])));
});
router.patch(`${ROOT}/settings`, authenticate, authorizePlatform("platform.settings.update"), async (req, res) => {
  const settings = req.body.settings;
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) { res.status(400).json({ error: "settings must be an object of key-value pairs" }); return; }
  const entries = Object.entries(settings as Record<string, unknown>);
  if (!entries.length || entries.some(([key, value]) => !ALLOWED_PLATFORM_SETTINGS.has(key) || (typeof value !== "string" && typeof value !== "boolean") || (typeof value === "string" && value.length > 500))) {
    res.status(400).json({ error: "Only supported platform settings with string or boolean values are accepted" }); return;
  }
  for (const [key, value] of entries) {
    await PlatformSetting.findOneAndUpdate({ key }, { $set: { value, updatedBy: req.user!.userId } }, { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true });
  }
  await recordPlatformAudit(req, "platform.settings.update", "platform_setting", "", { changedKeys: entries.map(([key]) => key) });
  res.json({ updated: entries.map(([key]) => key) });
});

export default router;
