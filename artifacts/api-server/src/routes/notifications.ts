import { Router, type IRouter } from "express";
import mongoose from "mongoose";
import { authenticate, authorize } from "../middlewares/auth";
import { authorizePlatform, isPlatformRole } from "../lib/platform-rbac";
import { recordAudit, recordPlatformAudit } from "../lib/foundation";
import { Institute } from "../models/Institute";
import { Notification } from "../models/Notification";
import { PlatformAnnouncement } from "../models/Platform";

const router: IRouter = Router();

function notificationPermission(platformPermission: string, instituteRoles: string[]) {
return (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction): void => {
  if (isPlatformRole(req.user?.role ?? "")) {
    void authorizePlatform(platformPermission)(req, res, next).catch(next);
    return;
  }
  if (!req.user?.instituteId) {
    res.status(403).json({ error: "Institute scope is required" });
    return;
  }
  void authorize(...instituteRoles)(req, res, next).catch(next);
};
}

function fmt(n: any) {
return {
id: String(n._id),
title: n.title,
message: n.message,
type: n.type,
target: n.target,
targetId: n.targetId ?? null,
status: n.status,
scheduledAt: n.scheduledAt ?? null,
sentAt: n.sentAt ?? null,
createdAt: n.createdAt.toISOString()
};
}

router.get(
"/notifications/platform-announcements",
authenticate,
authorize("institute_admin", "teacher", "student", "parent", "staff", "accountant"),
async (_req, res): Promise<void> => {
  const instituteId = _req.user?.instituteId;
  const [announcements, instituteNotices] = await Promise.all([PlatformAnnouncement.find({
    audience: "all_institutes",
    status: "published",
    publishedAt: { $lte: new Date() },
  })
    .sort({ publishedAt: -1 })
    .limit(100)
    .select("title message publishedAt createdAt")
    .lean(), instituteId ? Notification.find({ instituteId, type: "internal", target: "all-students", status: "sent" })
      .sort({ createdAt: -1 }).limit(100).select("title message sentAt createdAt").lean() : Promise.resolve([])]);

  const all = [
    ...announcements.map((announcement) => ({
    id: String(announcement._id),
    title: announcement.title,
    message: announcement.message,
    publishedAt: announcement.publishedAt ?? announcement.createdAt,
    createdAt: announcement.createdAt,
    })),
    ...instituteNotices.map((notice) => ({
      id: `institute:${String(notice._id)}`,
      title: notice.title,
      message: notice.message,
      publishedAt: notice.sentAt ?? notice.createdAt,
      createdAt: notice.createdAt,
    })),
  ].sort((left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime()).slice(0, 100);
  res.json(all);
},
);

router.get(
"/notifications",
authenticate,
notificationPermission("platform.notifications.view", ["institute_admin", "teacher", "student", "parent", "staff"]),
async (req, res): Promise<void> => {
const { type } = req.query as Record<string, string>;


const filter: Record<string, unknown> = {};

if (!isPlatformRole(req.user!.role)) filter.instituteId = req.user!.instituteId;
else if (req.query.instituteId) {
  const instituteId = String(req.query.instituteId);
  if (!mongoose.Types.ObjectId.isValid(instituteId)) { res.status(400).json({ error: "Invalid instituteId" }); return; }
  filter.instituteId = instituteId;
}

if (type) filter.type = type;

const notifications = await Notification.find(filter).sort({ createdAt: -1 });

res.json(notifications.map(fmt));


}
);

router.post(
"/notifications",
authenticate,
notificationPermission("platform.notifications.create", ["institute_admin", "teacher", "staff"]),
async (req, res): Promise<void> => {
const { title, message, type, target, targetId, scheduledAt } = req.body;

const instituteId = isPlatformRole(req.user!.role) ? String(req.body.instituteId ?? "") : String(req.user!.instituteId ?? "");
if (!mongoose.Types.ObjectId.isValid(instituteId) || !await Institute.exists({ _id: instituteId })) {
  res.status(400).json({ error: "A valid instituteId is required" });
  return;
}


const status = scheduledAt ? "scheduled" : "sent";
const sentAt = scheduledAt ? undefined : new Date().toISOString();

const notification = await Notification.create({
  instituteId,
  title,
  message,
  type,
  target,
  targetId,
  status,
  scheduledAt,
  sentAt
});

if (isPlatformRole(req.user!.role)) await recordPlatformAudit(req, "platform.institute_notification.create", "notification", String(notification._id), { instituteId });
else await recordAudit(req, "notification.create", "notification", String(notification._id));

res.status(201).json(fmt(notification));


}
);

router.delete(
"/notifications/:id",
authenticate,
notificationPermission("platform.notifications.delete", ["institute_admin"]),
async (req, res): Promise<void> => {
const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

const filter: Record<string, unknown> = { _id: id };
if (!isPlatformRole(req.user!.role)) filter.instituteId = req.user!.instituteId;
const deleted = await Notification.findOneAndDelete(filter);
if (!deleted) { res.status(404).json({ error: "Notification not found" }); return; }

if (isPlatformRole(req.user!.role)) await recordPlatformAudit(req, "platform.institute_notification.delete", "notification", String(deleted._id), { instituteId: String(deleted.instituteId) });
else await recordAudit(req, "notification.delete", "notification", String(deleted._id));

res.sendStatus(204);


}
);

export default router;
