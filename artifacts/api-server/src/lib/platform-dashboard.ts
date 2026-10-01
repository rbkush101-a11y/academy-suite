import mongoose, { type Model } from "mongoose";
import { Branch } from "../models/Branch";
import { AuthSecurityEvent } from "../models/AuthSecurity";
import { AuditLog } from "../models/AuditLog";
import { Institute } from "../models/Institute";
import { PlatformInvoice, PlatformPayment, PlatformSubscription, PlatformSupportTicket } from "../models/Platform";
import { Staff } from "../models/Staff";
import { Student } from "../models/Student";
import { User } from "../models/User";
import { UserSession } from "../models/UserSession";
import { isAuthEmailDeliveryConfigured } from "./auth-security";

const DAY_MS = 24 * 60 * 60 * 1000;
const UPCOMING_WINDOW_DAYS = 30;

type DateRange = {
  from: Date;
  until: Date;
  startDate: string;
  endDate: string;
  interval: "day" | "month";
  dateFormat: "%Y-%m-%d" | "%Y-%m";
};

function dateOnly(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? undefined : value;
}

function getDateRange(startValue: unknown, endValue: unknown, now: Date): DateRange {
  const hasStart = startValue !== undefined;
  const hasEnd = endValue !== undefined;
  const providedStart = hasStart ? dateOnly(startValue) : undefined;
  const providedEnd = hasEnd ? dateOnly(endValue) : undefined;
  if ((hasStart && !providedStart) || (hasEnd && !providedEnd)) {
    throw new RangeError("Date filters must use the YYYY-MM-DD format.");
  }

  const today = now.toISOString().slice(0, 10);
  const endDate = providedEnd ?? today;
  const endMidnight = new Date(`${endDate}T00:00:00.000Z`);
  const startDate = providedStart ?? new Date(endMidnight.getTime() - 29 * DAY_MS).toISOString().slice(0, 10);
  const from = new Date(`${startDate}T00:00:00.000Z`);
  const until = new Date(endMidnight.getTime() + DAY_MS);
  const days = Math.ceil((until.getTime() - from.getTime()) / DAY_MS);
  if (days <= 0) throw new RangeError("The start date must be on or before the end date.");
  if (days > 366) throw new RangeError("Choose a date range of 366 days or less.");

  const interval = days > 90 ? "month" : "day";
  return { from, until, startDate, endDate, interval, dateFormat: interval === "month" ? "%Y-%m" : "%Y-%m-%d" };
}

function periodKeys(range: DateRange): string[] {
  const keys: string[] = [];
  const cursor = new Date(range.from);
  if (range.interval === "month") cursor.setUTCDate(1);
  while (cursor < range.until) {
    keys.push(range.interval === "month" ? cursor.toISOString().slice(0, 7) : cursor.toISOString().slice(0, 10));
    if (range.interval === "month") cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

async function countCreatedByPeriod(model: Model<any>, range: DateRange) {
  return model.aggregate([
    { $match: { createdAt: { $gte: range.from, $lt: range.until } } },
    { $group: { _id: { $dateToString: { format: range.dateFormat, date: "$createdAt", timezone: "UTC" } }, count: { $sum: 1 } } },
  ]);
}

async function paymentTotals(status: string, range?: { from: Date; until: Date }) {
  const pipeline: any[] = [
    { $match: { status } },
    ...(status === "succeeded" ? [{ $addFields: { metricAt: { $ifNull: ["$paidAt", "$createdAt"] } } }] : []),
    ...(range ? [{ $match: { metricAt: { $gte: range.from, $lt: range.until } } }] : []),
    { $group: { _id: { $ifNull: ["$currency", "INR"] }, amount: { $sum: "$amount" }, count: { $sum: 1 } } },
    { $project: { _id: 0, currency: "$_id", amount: 1, count: 1 } },
    { $sort: { currency: 1 } },
  ];
  return PlatformPayment.aggregate(pipeline);
}

export async function getPlatformSystemHealth(checkedAt = new Date()) {
  const [databaseHealthy, notificationConfigured] = await Promise.all([
    (async () => {
      try {
        if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) return false;
        await mongoose.connection.db.admin().ping();
        return true;
      } catch {
        return false;
      }
    })(),
    isAuthEmailDeliveryConfigured(),
  ]);
  const dbStatus = databaseHealthy ? "healthy" : "down";
  return {
    status: databaseHealthy ? "degraded" : "down",
    checkedAt: checkedAt.toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    services: [
      { id: "api", label: "API", status: "healthy", detail: "Dashboard API responded successfully." },
      { id: "database", label: "Database", status: dbStatus, detail: databaseHealthy ? "MongoDB ping succeeded." : "MongoDB is disconnected or did not answer the health ping." },
      { id: "storage", label: "Storage", status: dbStatus, detail: "Institute uploads are stored in MongoDB documents." },
      { id: "backgroundJobs", label: "Background jobs", status: "not_configured", detail: "Scheduled billing and overdue jobs are not registered in the API process." },
      { id: "notifications", label: "Notification service", status: notificationConfigured ? "configured" : "not_configured", detail: notificationConfigured ? "Auth email delivery provider is configured; provider reachability is checked when sending." : "No outbound email provider is configured." },
    ],
  };
}

function activityDateFilter(range: DateRange) {
  return { createdAt: { $gte: range.from, $lt: range.until } };
}

function populatedName(value: unknown, field: string): string {
  if (value && typeof value === "object" && field in value) return String((value as Record<string, unknown>)[field] ?? "");
  return value ? String(value) : "Unknown";
}

export async function getPlatformDashboard(startValue: unknown, endValue: unknown) {
  const now = new Date();
  const range = getDateRange(startValue, endValue, now);
  const dayStart = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const upcomingLimit = new Date(now.getTime() + UPCOMING_WINDOW_DAYS * DAY_MS);
  const activeInstituteFilter: any = {
    status: "active",
    $or: [{ expiryDate: { $exists: false } }, { expiryDate: null }, { expiryDate: { $gt: now } }],
  };
  const expiredInstituteFilter: any = { $or: [{ status: "expired" }, { expiryDate: { $lte: now } }] };
  const activeSubscriptionFilter: any = {
    status: "active",
    startsAt: { $lte: now },
    $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gt: now } }],
  };
  const trialSubscriptionFilter: any = {
    status: "trialing",
    startsAt: { $lte: now },
    $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gt: now } }],
  };
  const expiringSubscriptionFilter: any = {
    status: { $in: ["active", "trialing", "past_due"] },
    endsAt: { $gte: now, $lt: upcomingLimit },
  };
  const expiredSubscriptionFilter: any = {
    $or: [
      { status: "expired" },
      { status: { $in: ["active", "trialing", "past_due"] }, endsAt: { $lte: now } },
    ],
  };
  const createdFilter = activityDateFilter(range);

  const [
    totalInstitutes, activeInstitutes, trialInstituteIds, suspendedInstitutes, expiredInstitutes,
    totalBranches, totalStudents, totalTeachers, totalStaff, totalParents, activeUserRows,
    activeSubscriptionCount, trialSubscriptionCount, expiringSubscriptionCount, expiredSubscriptionCount, canceledSubscriptionCount,
    todayRevenue, monthRevenue, yearRevenue, pendingPayments, failedPayments, refunds,
    instituteGrowth, studentGrowth, userGrowth, subscriptionGrowth, revenueRows,
    newInstituteRows, subscriptionRows, paymentRows, adminActionRows, securityRows,
    platformUsers, openTickets, outstandingInvoices, historicalCollected,
    systemHealth,
  ] = await Promise.all([
    Institute.countDocuments(),
    Institute.countDocuments(activeInstituteFilter),
    PlatformSubscription.distinct("instituteId", trialSubscriptionFilter),
    Institute.countDocuments({ status: { $in: ["inactive", "suspended"] } }),
    Institute.countDocuments(expiredInstituteFilter),
    Branch.countDocuments(),
    Student.countDocuments(),
    Staff.countDocuments({ role: { $regex: "teacher|faculty", $options: "i" } }),
    Staff.countDocuments({ role: { $not: /teacher|faculty/i } }),
    User.countDocuments({ role: "parent" }),
    UserSession.aggregate([
      { $match: { revokedAt: null, expiresAt: { $gt: now } } },
      { $group: { _id: { userId: "$userId", principalType: "$principalType" } } },
      { $count: "count" },
    ]),
    PlatformSubscription.countDocuments(activeSubscriptionFilter),
    PlatformSubscription.countDocuments(trialSubscriptionFilter),
    PlatformSubscription.countDocuments(expiringSubscriptionFilter),
    PlatformSubscription.countDocuments(expiredSubscriptionFilter),
    PlatformSubscription.countDocuments({ status: "canceled" }),
    paymentTotals("succeeded", { from: dayStart, until: new Date(now.getTime() + 1) }),
    paymentTotals("succeeded", { from: monthStart, until: new Date(now.getTime() + 1) }),
    paymentTotals("succeeded", { from: yearStart, until: new Date(now.getTime() + 1) }),
    paymentTotals("pending"),
    paymentTotals("failed"),
    paymentTotals("refunded"),
    countCreatedByPeriod(Institute, range),
    countCreatedByPeriod(Student, range),
    countCreatedByPeriod(User, range),
    countCreatedByPeriod(PlatformSubscription, range),
    PlatformPayment.aggregate([
      { $match: { status: "succeeded" } },
      { $addFields: { metricAt: { $ifNull: ["$paidAt", "$createdAt"] } } },
      { $match: { metricAt: { $gte: range.from, $lt: range.until } } },
      { $group: {
        _id: {
          date: { $dateToString: { format: range.dateFormat, date: "$metricAt", timezone: "UTC" } },
          currency: { $ifNull: ["$currency", "INR"] },
        },
        amount: { $sum: "$amount" },
      } },
      { $project: { _id: 0, date: "$_id.date", currency: "$_id.currency", amount: 1 } },
    ]),
    Institute.find(createdFilter).sort({ createdAt: -1 }).limit(20).select("instituteName createdAt").lean(),
    PlatformSubscription.find(createdFilter).sort({ createdAt: -1 }).limit(20).populate("instituteId", "instituteName").populate("planId", "name code").lean(),
    PlatformPayment.find(createdFilter).sort({ createdAt: -1 }).limit(20).populate("instituteId", "instituteName").select("instituteId amount currency status createdAt").lean(),
    AuditLog.find({ ...createdFilter, scope: "platform" }).sort({ createdAt: -1 }).limit(20).select("action actorEmail actorRole targetType targetId createdAt").lean(),
    AuthSecurityEvent.find({ ...createdFilter, scope: "platform" }).sort({ createdAt: -1 }).limit(20).select("event outcome role createdAt").lean(),
    User.countDocuments({ role: { $in: ["super_admin", "platform_admin", "support_admin", "finance_admin", "read_only_admin"] }, instituteId: { $exists: false } }),
    PlatformSupportTicket.countDocuments({ status: { $in: ["open", "in_progress", "waiting"] } }),
    PlatformInvoice.countDocuments({ status: { $in: ["issued", "overdue"] } }),
    paymentTotals("succeeded"),
    getPlatformSystemHealth(now),
  ]);

  const keys = periodKeys(range);
  const indexCounts = (rows: Array<{ _id: string; count: number }>) => new Map(rows.map((row) => [row._id, row.count]));
  const instituteByPeriod = indexCounts(instituteGrowth);
  const studentByPeriod = indexCounts(studentGrowth);
  const userByPeriod = indexCounts(userGrowth);
  const subscriptionByPeriod = indexCounts(subscriptionGrowth);
  const growthSeries = keys.map((date) => ({
    date,
    institutes: instituteByPeriod.get(date) ?? 0,
    students: studentByPeriod.get(date) ?? 0,
    users: userByPeriod.get(date) ?? 0,
    subscriptions: subscriptionByPeriod.get(date) ?? 0,
  }));
  const currencyCodes = [...new Set(revenueRows.map((row: { currency: string }) => row.currency || "INR"))].sort();
  const revenueByDate = new Map<string, Record<string, number>>();
  for (const row of revenueRows as Array<{ date: string; currency: string; amount: number }>) {
    const values = revenueByDate.get(row.date) ?? {};
    values[row.currency || "INR"] = row.amount;
    revenueByDate.set(row.date, values);
  }
  const revenueSeries = keys.map((date) => ({ date, ...(Object.fromEntries(currencyCodes.map((currency) => [currency, revenueByDate.get(date)?.[currency] ?? 0]))) }));

  const activity = [
    ...newInstituteRows.map((item: any) => ({ id: `institute:${item._id}`, type: "institute", title: "New institute", description: item.instituteName, occurredAt: item.createdAt })),
    ...subscriptionRows.map((item: any) => ({
      id: `subscription:${item._id}`, type: "subscription", title: "Subscription purchase",
      description: `${populatedName(item.instituteId, "instituteName")} · ${populatedName(item.planId, "name")}`,
      occurredAt: item.createdAt,
    })),
    ...paymentRows.map((item: any) => ({
      id: `payment:${item._id}`, type: "payment", title: "Payment",
      description: `${populatedName(item.instituteId, "instituteName")} · ${item.status}`,
      amount: item.amount, currency: item.currency, occurredAt: item.createdAt,
    })),
    ...adminActionRows.map((item: any) => ({
      id: `admin:${item._id}`, type: "admin_action", title: "Admin action",
      description: `${String(item.action).replaceAll(/[._]/g, " ")} · ${item.actorEmail || item.actorRole || "Platform administrator"}`,
      occurredAt: item.createdAt,
    })),
    ...securityRows.map((item: any) => ({
      id: `security:${item._id}`, type: "security_event", title: "Security event",
      description: `${String(item.event).replaceAll(/[._]/g, " ")} · ${item.outcome}`,
      occurredAt: item.createdAt,
    })),
  ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, 25);

  const getCurrencyTotals = (rows: Array<{ currency: string; amount: number; count: number }>) => rows.map(({ currency, amount, count }) => ({ currency, amount, count }));
  return {
    filters: { startDate: range.startDate, endDate: range.endDate, interval: range.interval },
    platform: {
      institutes: {
        total: totalInstitutes,
        active: activeInstitutes,
        trial: trialInstituteIds.length,
        suspended: suspendedInstitutes,
        expired: expiredInstitutes,
      },
      totalBranches,
      totalStudents,
      totalTeachers,
      totalStaff,
      totalParents,
      totalActiveUsers: activeUserRows[0]?.count ?? 0,
      platformUsers,
    },
    platformUsers,
    activeSubscriptions: activeSubscriptionCount + trialSubscriptionCount,
    openTickets,
    outstandingInvoices,
    collectedByCurrency: getCurrencyTotals(historicalCollected),
    collectedAmount: historicalCollected.length <= 1 ? historicalCollected[0]?.amount ?? 0 : null,
    subscriptions: {
      active: activeSubscriptionCount,
      trial: trialSubscriptionCount,
      expiringSoon: expiringSubscriptionCount,
      expired: expiredSubscriptionCount,
      canceled: canceledSubscriptionCount,
    },
    revenue: {
      today: getCurrencyTotals(todayRevenue),
      thisMonth: getCurrencyTotals(monthRevenue),
      thisYear: getCurrencyTotals(yearRevenue),
      pendingPayments: getCurrencyTotals(pendingPayments),
      failedPayments: getCurrencyTotals(failedPayments),
      refunds: getCurrencyTotals(refunds),
      series: revenueSeries,
      currencies: currencyCodes,
      collectedByCurrency: getCurrencyTotals(historicalCollected),
      outstandingInvoices,
    },
    growth: {
      newInstitutes: instituteGrowth.reduce((sum: number, row: { count: number }) => sum + row.count, 0),
      newStudents: studentGrowth.reduce((sum: number, row: { count: number }) => sum + row.count, 0),
      newUsers: userGrowth.reduce((sum: number, row: { count: number }) => sum + row.count, 0),
      subscriptionGrowth: subscriptionGrowth.reduce((sum: number, row: { count: number }) => sum + row.count, 0),
      series: growthSeries,
    },
    systemHealth,
    recentActivity: activity,
    support: { openTickets },
  };
}
