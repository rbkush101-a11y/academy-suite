import { Institute } from "../models/Institute";
import { PlatformSubscription } from "../models/Platform";

type InstituteAccessState = { status?: string | null; expiryDate?: Date | string | null };
type SubscriptionAccessState = { status?: string | null; endsAt?: Date | string | null };

export function getInstituteAccessBlockReason(institute: InstituteAccessState | null | undefined, now = new Date(), subscription?: SubscriptionAccessState | null): string | null {
  if (!institute) return "This institute is unavailable. Contact your platform administrator.";
  const status = String(institute.status ?? "").toLowerCase();
  if (status === "suspended" || status === "inactive") return "This institute is suspended. Contact your platform administrator.";
  if (status === "archived") return "This institute is archived and cannot be accessed.";
  if (status === "expired" || status === "cancelled") return "This institute subscription is no longer active.";
  if (status === "pending") return "This institute is awaiting activation.";
  if (status !== "active" && status !== "trial") return "This institute is unavailable. Contact your platform administrator.";
  const subscriptionStatus = String(subscription?.status ?? "").toLowerCase();
  if (subscriptionStatus === "canceled") return "This institute subscription is cancelled. Contact your platform administrator.";
  if (subscriptionStatus === "expired") return "This institute subscription has expired. Contact your platform administrator.";
  if (subscription?.endsAt && new Date(subscription.endsAt).getTime() <= now.getTime()) {
    return "This institute subscription has expired. Contact your platform administrator.";
  }
  if (institute.expiryDate && new Date(institute.expiryDate).getTime() <= now.getTime()) {
    return "This institute subscription has expired. Contact your platform administrator.";
  }
  return null;
}

export async function getInstituteAccessBlockReasonById(instituteId: string, now = new Date()): Promise<string | null> {
  const [institute, subscription] = await Promise.all([
    Institute.findById(instituteId).select("status expiryDate").lean(),
    PlatformSubscription.findOne({ instituteId }).sort({ createdAt: -1 }).select("status endsAt").lean(),
  ]);
  return getInstituteAccessBlockReason(institute, now, subscription);
}
