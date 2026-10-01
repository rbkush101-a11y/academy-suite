import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { AuditLog } from "../models/AuditLog";
import { AuthEmailOutbox, AuthSecurityEvent, LoginThrottle } from "../models/AuthSecurity";
import { User } from "../models/User";
import { UserSession, type IUserSession } from "../models/UserSession";
import { signToken, type JwtPayload } from "./jwt";

export const ACCESS_TOKEN_LIFETIME_MS = 15 * 60 * 1000;
export const REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
export const LOGIN_FAILURE_WINDOW_MS = 15 * 60 * 1000;
export const ACCOUNT_LOCK_DURATION_MS = 15 * 60 * 1000;
export const ACCOUNT_FAILURE_LIMIT = 5;
const IP_FAILURE_LIMIT = 30;
const IDENTIFIER_FAILURE_LIMIT = 8;
const EMAIL_MAX_ATTEMPTS = 5;
const EMAIL_RETENTION_MS = 48 * 60 * 60 * 1000;

export interface LoginPrincipal {
  userId: string;
  email: string;
  role: string;
  instituteId?: string | null;
  activeBranchId?: string | null;
  customRoleId?: string | null;
  principalType?: "user" | "student";
}

export interface IssuedSession {
  session: IUserSession;
  accessToken: string;
  refreshToken: string;
}

export function getRequestIp(req: Request): string {
  return String(req.ip || req.socket.remoteAddress || "").slice(0, 100);
}

export function getUserAgent(req: Request): string {
  return String(req.get("user-agent") || "").slice(0, 500);
}

export function getDeviceType(userAgent: string): "desktop" | "mobile" | "tablet" | "unknown" {
  if (!userAgent) return "unknown";
  if (/ipad|tablet|kindle|silk/i.test(userAgent)) return "tablet";
  if (/mobile|iphone|android/i.test(userAgent)) return "mobile";
  return "desktop";
}

export function getDeviceName(userAgent: string): string {
  if (!userAgent) return "Unknown device";
  const device = /ipad|tablet|kindle|silk/i.test(userAgent) ? "Tablet"
    : /mobile|iphone|android/i.test(userAgent) ? "Mobile device" : "Desktop";
  const browser = /Edg\//.test(userAgent) ? "Edge" : /Firefox\//.test(userAgent) ? "Firefox"
    : /Chrome\//.test(userAgent) ? "Chrome" : /Safari\//.test(userAgent) ? "Safari" : "Browser";
  const operatingSystem = /Windows/i.test(userAgent) ? "Windows" : /Mac OS X|Macintosh/i.test(userAgent) ? "macOS"
    : /Android/i.test(userAgent) ? "Android" : /iPhone|iPad/i.test(userAgent) ? "iOS" : /Linux/i.test(userAgent) ? "Linux" : "Unknown OS";
  return `${device} · ${operatingSystem} · ${browser}`.slice(0, 160);
}

export function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeIdentifier(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().slice(0, 254);
}

function throttlePepper(): string {
  const pepper = process.env.AUTH_THROTTLE_SECRET ?? process.env.ACCESS_TOKEN_SECRET ?? process.env.SESSION_SECRET ?? process.env.JWT_SECRET;
  if (!pepper || pepper.length < 32) throw new Error("A 32-character JWT secret is required for login throttling.");
  return pepper;
}

function throttleKey(kind: "identifier" | "ip", value: string): string {
  return hashValue(`${kind}:${value}:${throttlePepper()}`);
}

export async function isLoginRateLimited(req: Request, identifier: string): Promise<boolean> {
  const now = new Date();
  const keys = [
    { keyHash: throttleKey("identifier", `${normalizeIdentifier(identifier)}|${getRequestIp(req)}`), limit: IDENTIFIER_FAILURE_LIMIT },
    { keyHash: throttleKey("ip", getRequestIp(req)), limit: IP_FAILURE_LIMIT },
  ];
  const throttles = await LoginThrottle.find({ keyHash: { $in: keys.map(({ keyHash }) => keyHash) } }).select("+keyHash lockedUntil failureCount windowStartedAt");
  return throttles.some((item) => item.lockedUntil && item.lockedUntil > now) || throttles.some((item) => {
    const limit = keys.find((entry) => entry.keyHash === item.keyHash)?.limit ?? Number.MAX_SAFE_INTEGER;
    return item.windowStartedAt.getTime() > now.getTime() - LOGIN_FAILURE_WINDOW_MS && item.failureCount >= limit;
  });
}

async function incrementThrottle(
  keyHash: string,
  limit: number,
  now: Date,
  windowMs = LOGIN_FAILURE_WINDOW_MS,
  lockDurationMs = ACCOUNT_LOCK_DURATION_MS,
): Promise<void> {
  let current = await LoginThrottle.findOne({ keyHash }).select("+keyHash failureCount windowStartedAt");
  if (!current) {
    try {
      await LoginThrottle.create({ keyHash, failureCount: 1, windowStartedAt: now, expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) });
    } catch (error) {
      if ((error as { code?: number })?.code !== 11000) throw error;
      current = await LoginThrottle.findOne({ keyHash }).select("+keyHash failureCount windowStartedAt");
    }
    if (!current) return;
  }
  if (current.windowStartedAt.getTime() <= now.getTime() - windowMs) {
    const reset = await LoginThrottle.updateOne(
      { _id: current._id, windowStartedAt: current.windowStartedAt },
      { $set: { failureCount: 1, windowStartedAt: now, lockedUntil: null, expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) } },
    );
    if (reset.modifiedCount) return;
  }
  const updated = await LoginThrottle.findByIdAndUpdate(current._id, {
    $inc: { failureCount: 1 },
    $set: { expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
  }, { new: true }).select("failureCount");
  if (updated && updated.failureCount >= limit) {
    await LoginThrottle.updateOne({ _id: updated._id }, { $set: { lockedUntil: new Date(now.getTime() + lockDurationMs) } });
  }
}

export function hashIdentifierForAudit(identifier: string): string {
  return createHmac("sha256", throttlePepper()).update(normalizeIdentifier(identifier)).digest("hex");
}

export async function consumeActionRateLimit(
  req: Request,
  action: string,
  identifier: string,
  identifierLimit: number,
  ipLimit: number,
  windowMs: number,
): Promise<boolean> {
  const now = new Date();
  const ip = getRequestIp(req);
  const keys = [
    { keyHash: throttleKey("identifier", `${action}:${normalizeIdentifier(identifier)}|${ip}`), limit: identifierLimit },
    { keyHash: throttleKey("ip", `${action}:${ip}`), limit: ipLimit },
  ];
  await Promise.all(keys.map(({ keyHash, limit }) => incrementThrottle(keyHash, limit, now, windowMs, windowMs)));
  const rows = await LoginThrottle.find({ keyHash: { $in: keys.map(({ keyHash }) => keyHash) } })
    .select("+keyHash failureCount windowStartedAt lockedUntil");
  return rows.some((row) => {
    const limit = keys.find((key) => key.keyHash === row.keyHash)?.limit ?? Number.MAX_SAFE_INTEGER;
    return (row.lockedUntil && row.lockedUntil > now) ||
      (row.windowStartedAt.getTime() > now.getTime() - windowMs && row.failureCount >= limit);
  });
}

export async function recordLoginFailureThrottle(req: Request, identifier: string): Promise<void> {
  const now = new Date();
  await Promise.all([
    incrementThrottle(throttleKey("identifier", `${normalizeIdentifier(identifier)}|${getRequestIp(req)}`), IDENTIFIER_FAILURE_LIMIT, now),
    incrementThrottle(throttleKey("ip", getRequestIp(req)), IP_FAILURE_LIMIT, now),
  ]);
}

export async function clearLoginFailureThrottle(req: Request, identifier: string): Promise<void> {
  const keyHash = throttleKey("identifier", `${normalizeIdentifier(identifier)}|${getRequestIp(req)}`);
  await LoginThrottle.deleteOne({ keyHash });
}

export async function recordFailedLogin(req: Request, identifier: string, userId?: string): Promise<boolean> {
  const now = new Date();
  await recordLoginFailureThrottle(req, identifier);
  if (!userId) return false;

  const user = await User.findById(userId).select("failedLoginAttempts failedLoginWindowStartedAt lockedUntil");
  if (!user) return false;
  if (!user.failedLoginWindowStartedAt || user.failedLoginWindowStartedAt.getTime() <= now.getTime() - LOGIN_FAILURE_WINDOW_MS) {
    user.failedLoginAttempts = 0;
    user.failedLoginWindowStartedAt = now;
    user.lockedUntil = undefined;
    await user.save();
  }
  const updated = await User.findByIdAndUpdate(userId, { $inc: { failedLoginAttempts: 1 } }, { new: true }).select("failedLoginAttempts");
  if (!updated) return false;
  if (updated.failedLoginAttempts >= ACCOUNT_FAILURE_LIMIT) {
    await User.updateOne({ _id: userId }, { $set: { lockedUntil: new Date(now.getTime() + ACCOUNT_LOCK_DURATION_MS) } });
    return true;
  }
  return false;
}

export async function clearUserLoginFailures(userId: string): Promise<void> {
  await User.updateOne({ _id: userId }, { $set: { failedLoginAttempts: 0, lockedUntil: null }, $unset: { failedLoginWindowStartedAt: 1 } });
}

export async function issueSession(req: Request, principal: LoginPrincipal): Promise<IssuedSession> {
  const userAgent = getUserAgent(req);
  const refreshSecret = randomBytes(48).toString("base64url");
  const now = new Date();
  const session = await UserSession.create({
    userId: principal.userId,
    principalType: principal.principalType ?? "user",
    instituteId: principal.instituteId || undefined,
    role: principal.role,
    branchId: principal.activeBranchId || undefined,
    refreshTokenHash: hashValue(refreshSecret),
    ipAddress: getRequestIp(req),
    userAgent,
    deviceName: getDeviceName(userAgent),
    deviceType: getDeviceType(userAgent),
    lastLoginAt: now,
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + REFRESH_TOKEN_LIFETIME_MS),
  }) as unknown as IUserSession;
  const payload: JwtPayload = {
    userId: principal.userId,
    email: principal.email,
    role: principal.role,
    instituteId: principal.instituteId ?? null,
    activeBranchId: principal.activeBranchId ?? null,
    customRoleId: principal.customRoleId ?? null,
    sessionId: String(session._id),
  };
  return {
    session,
    accessToken: signToken(payload),
    refreshToken: `${String(session._id)}.${refreshSecret}`,
  };
}

export function setRefreshCookie(res: Response, refreshToken: string, maxAgeMs = REFRESH_TOKEN_LIFETIME_MS): void {
  res.cookie("pd_refresh", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
    maxAge: Math.max(0, maxAgeMs),
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie("pd_refresh", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
  });
}

export function getRefreshCookie(req: Request): string {
  return String(req.cookies?.pd_refresh ?? "");
}

export async function recordSecurityEvent(
  req: Request,
  event: string,
  outcome: "success" | "failure" | "info",
  details: Record<string, unknown> = {},
  actor: { userId?: string; email?: string; role?: string; sessionId?: string; scope?: "platform" | "institute" } = {},
): Promise<void> {
  const userAgent = getUserAgent(req);
  const scope = actor.scope ?? (actor.role && ["super_admin", "platform_admin", "support_admin", "finance_admin", "read_only_admin"].includes(actor.role) ? "platform" : "institute");
  const eventData = {
    scope,
    userId: actor.userId,
    email: actor.email ?? "",
    role: actor.role ?? "",
    sessionId: actor.sessionId ?? "",
    event,
    outcome,
    ipAddress: getRequestIp(req),
    userAgent,
    deviceName: getDeviceName(userAgent),
    details,
  };
  await Promise.all([
    AuthSecurityEvent.create(eventData),
    AuditLog.create({
      scope,
      actorId: actor.userId ?? "",
      actorEmail: actor.email ?? "",
      actorRole: actor.role ?? "",
      action: `auth.${event}`,
      targetType: actor.sessionId ? "session" : "authentication",
      targetId: actor.sessionId ?? actor.userId ?? "",
      ipAddress: eventData.ipAddress,
      userAgent,
      details,
    }),
  ]);
}

export async function isAuthEmailDeliveryConfigured(): Promise<boolean> {
  if (!process.env.AUTH_EMAIL_PROVIDER_URL || !process.env.AUTH_EMAIL_PROVIDER_TOKEN || !process.env.AUTH_EMAIL_FROM ||
    !process.env.AUTH_ENCRYPTION_KEY || process.env.AUTH_ENCRYPTION_KEY.length < 32 || !process.env.PUBLIC_APP_URL) return false;
  try {
    const providerUrl = new URL(process.env.AUTH_EMAIL_PROVIDER_URL);
    const publicAppUrl = new URL(process.env.PUBLIC_APP_URL);
    const validProtocol = (url: URL) => url.protocol === "https:" || (process.env.NODE_ENV !== "production" && url.protocol === "http:");
    return validProtocol(providerUrl) && validProtocol(publicAppUrl);
  } catch {
    return false;
  }
}

export function encryptEmailPayload(payload: Record<string, string>): { ciphertext: string; iv: string; authTag: string } {
  const encryptionKey = process.env.AUTH_ENCRYPTION_KEY;
  if (!encryptionKey || encryptionKey.length < 32) throw new Error("AUTH_ENCRYPTION_KEY must be configured with at least 32 characters.");
  const key = createHash("sha256").update(encryptionKey).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64url"), iv: iv.toString("base64url"), authTag: cipher.getAuthTag().toString("base64url") };
}

function decryptEmailPayload(row: { ciphertext: string; iv: string; authTag: string }): Record<string, string> {
  const encryptionKey = process.env.AUTH_ENCRYPTION_KEY;
  if (!encryptionKey || encryptionKey.length < 32) throw new Error("AUTH_ENCRYPTION_KEY must be configured with at least 32 characters.");
  const key = createHash("sha256").update(encryptionKey).digest();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(row.iv, "base64url"));
  decipher.setAuthTag(Buffer.from(row.authTag, "base64url"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(row.ciphertext, "base64url")), decipher.final()]).toString("utf8");
  return JSON.parse(decrypted) as Record<string, string>;
}

export async function processAuthEmailOutbox(): Promise<void> {
  if (!await isAuthEmailDeliveryConfigured()) return;
  for (let index = 0; index < 10; index += 1) {
    const now = new Date();
    const staleClaim = new Date(now.getTime() - 5 * 60 * 1000);
    const row = await AuthEmailOutbox.findOneAndUpdate({
      expiresAt: { $gt: now },
      $or: [
        { status: { $in: ["queued", "retry"] }, nextAttemptAt: { $lte: now } },
        { status: "sending", updatedAt: { $lt: staleClaim } },
      ],
    }, { $set: { status: "sending" }, $inc: { attempts: 1 } }, { new: true, sort: { createdAt: 1 } })
      .select("to purpose attempts +ciphertext +iv +authTag");
    if (!row) return;
    try {
      const payload = decryptEmailPayload(row);
      const providerResponse = await fetch(String(process.env.AUTH_EMAIL_PROVIDER_URL), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.AUTH_EMAIL_PROVIDER_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: process.env.AUTH_EMAIL_FROM, to: row.to, ...payload }),
        signal: AbortSignal.timeout(15000),
      });
      if (!providerResponse.ok) throw new Error(`Email provider returned HTTP ${providerResponse.status}`);
      row.status = "sent";
      row.lastError = "";
      await row.save();
    } catch (error) {
      const attempts = row.attempts;
      row.status = attempts >= EMAIL_MAX_ATTEMPTS ? "failed" : "retry";
      row.nextAttemptAt = new Date(Date.now() + Math.min(60 * 60 * 1000, 2 ** attempts * 60 * 1000));
      row.lastError = (error instanceof Error ? error.message : "Email delivery failed").slice(0, 500);
      await row.save();
    }
  }
}

export function securityEmailRetentionDate(): Date {
  return new Date(Date.now() + EMAIL_RETENTION_MS);
}
