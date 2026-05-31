import { Router, type IRouter } from "express";
import { authenticate } from "../middlewares/auth";
import { Notification } from "../models/Notification";

const router: IRouter = Router();

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
    createdAt: n.createdAt.toISOString(),
  };
}

router.get("/notifications", authenticate, async (req, res): Promise<void> => {
  const { type } = req.query as Record<string, string>;
  const filter: any = {};
  if (type) filter.type = type;
  const notifications = await Notification.find(filter).sort({ createdAt: -1 });
  res.json(notifications.map(fmt));
});

router.post("/notifications", authenticate, async (req, res): Promise<void> => {
  const { title, message, type, target, targetId, scheduledAt } = req.body;
  const status = scheduledAt ? "scheduled" : "sent";
  const sentAt = scheduledAt ? undefined : new Date().toISOString();
  const notif = await Notification.create({ title, message, type, target, targetId, status, scheduledAt, sentAt });
  res.status(201).json(fmt(notif));
});

router.delete("/notifications/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await Notification.findByIdAndDelete(id);
  res.sendStatus(204);
});

export default router;
