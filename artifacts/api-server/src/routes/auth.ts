import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { User } from "../models/User";
import { Staff } from "../models/Staff";
import { Student } from "../models/Student";
import { authenticate } from "../middlewares/auth";
import { Course } from "../models/Course";
import { Batch } from "../models/Batch";
import { UserSession } from "../models/UserSession";
import { recordAudit } from "../lib/foundation";
import { isPlatformRole } from "../lib/platform-rbac";
import { AuthEmailOutbox, AuthToken } from "../models/AuthSecurity";
import {
  clearLoginFailureThrottle,
  clearRefreshCookie,
  clearUserLoginFailures,
  getRefreshCookie,
  consumeActionRateLimit,
  encryptEmailPayload,
  hashIdentifierForAudit,
  hashValue,
  isAuthEmailDeliveryConfigured,
  isLoginRateLimited,
  issueSession,
  normalizeIdentifier,
  recordFailedLogin,
  recordSecurityEvent,
  securityEmailRetentionDate,
  setRefreshCookie,
  getRequestIp,
  getUserAgent,
  getDeviceName,
  getDeviceType,
} from "../lib/auth-security";
import { signToken } from "../lib/jwt";
import mongoose from "mongoose";
import { getInstituteAccessBlockReasonById } from "../lib/institute-access";

const router: IRouter = Router();

type LoginSource = "institute" | "platform";

function securityActor(
  user: { _id?: unknown; email?: string; role?: string } | null,
  source: LoginSource,
  sessionId?: string,
) {
  return {
    userId: user?._id ? String(user._id) : undefined,
    email: user?.email,
    role: user?.role,
    sessionId,
    scope:
      source === "platform" ||
      (user?.role ? isPlatformRole(user.role) : false)
        ? ("platform" as const)
        : ("institute" as const),
  };
}

async function failedLogin(
  req: import("express").Request,
  identifier: string,
  source: LoginSource,
  user: {
    _id?: unknown;
    email?: string;
    role?: string;
  } | null,
  reason: string,
  countAccountFailure = true,
): Promise<boolean> {
  const accountLocked =
    countAccountFailure && user?._id
      ? await recordFailedLogin(req, identifier, String(user._id))
      : await (async () => {
          await recordFailedLogin(req, identifier);
          return false;
        })();

  await recordSecurityEvent(
    req,
    "login.failed",
    "failure",
    {
      source,
      reason,
      identifierHash: hashIdentifierForAudit(identifier),
      accountLocked,
    },
    securityActor(user, source),
  );

  return accountLocked;
}

async function createLoginSession(
  req: import("express").Request,
  res: import("express").Response,
  principal: Parameters<typeof issueSession>[1],
  user: {
    _id?: unknown;
    email?: string;
    role?: string;
  },
  source: LoginSource,
) {
  if (!isPlatformRole(principal.role) && principal.instituteId) {
    const accessBlockReason = await getInstituteAccessBlockReasonById(principal.instituteId);
    if (accessBlockReason) {
      await recordSecurityEvent(req, "login.rejected_institute_status", "failure", { reason: accessBlockReason }, securityActor(user, "institute"));
      res.status(403).json({ error: accessBlockReason, code: "INSTITUTE_ACCESS_BLOCKED" });
      return;
    }
  }

  await Promise.all([
    clearLoginFailureThrottle(req, principal.email),
    ...(req.body.identifier || req.body.loginId || req.body.email
      ? [
          clearLoginFailureThrottle(
            req,
            String(
              req.body.identifier ||
                req.body.loginId ||
                req.body.email,
            ),
          ),
        ]
      : []),
  ]);

  if (principal.principalType !== "student") {
    await clearUserLoginFailures(principal.userId);
  }

  const issued = await issueSession(req, principal);

  setRefreshCookie(res, issued.refreshToken);

  try {
    await recordSecurityEvent(
      req,
      "login.success",
      "success",
      { source },
      securityActor(
        user,
        source,
        String(issued.session._id),
      ),
    );

    if (source === "institute") {
      await recordAudit(
        req,
        "auth.login",
        "session",
        String(issued.session._id),
        {},
        {
          userId: principal.userId,
          email: principal.email,
          role: principal.role,
          instituteId: principal.instituteId ?? null,
          activeBranchId: principal.activeBranchId ?? null,
        },
      );
    }
  } catch (error) {
    await UserSession.updateOne(
      {
        _id: issued.session._id,
        revokedAt: null,
      },
      {
        $set: {
          revokedAt: new Date(),
          revokeReason: "audit_failed",
        },
      },
    );

    clearRefreshCookie(res);
    throw error;
  }

  return issued;
}

function safePasswordIssue(password: string): string | null {
  if (Buffer.byteLength(password, "utf8") > 72) {
    return "Password must be at most 72 bytes.";
  }

  if (password.length < 12) {
    return "Use at least 12 characters.";
  }

  if (
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password)
  ) {
    return "Use uppercase and lowercase letters and at least one number.";
  }

  return null;
}

function sameSecret(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "hex");
  const rightBytes = Buffer.from(right, "hex");

  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  );
}

function passwordResetUrl(token: string): string {
  const configured = process.env.PUBLIC_APP_URL;

  if (!configured) {
    throw new Error(
      "PUBLIC_APP_URL is required for password recovery.",
    );
  }

  const appUrl = new URL(configured);

  if (
    appUrl.protocol !== "https:" &&
    !(
      process.env.NODE_ENV !== "production" &&
      appUrl.protocol === "http:"
    )
  ) {
    throw new Error(
      "PUBLIC_APP_URL must use HTTPS in production.",
    );
  }

  const url = new URL(
    "/super-admin/reset-password",
    appUrl.origin,
  );

  url.searchParams.set("token", token);

  return url.toString();
}

function htmlEscape(value: string): string {
  return value.replace(
    /[&<>\"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

// ============================================================
// 1. PUBLIC SIGNUP (Disabled)
// ============================================================

router.post(
  "/auth/signup",
  async (_req, res): Promise<void> => {
    res.status(403).json({
      error:
        "Public signup is disabled. Please contact administrator.",
    });
  },
);

// ============================================================
// LOGOUT
// ============================================================

router.post(
  "/auth/logout",
  authenticate,
  async (req, res): Promise<void> => {
    clearRefreshCookie(res);

    if (req.user?.sessionId) {
      await UserSession.updateOne(
        {
          _id: req.user.sessionId,
          userId: req.user.userId,
          revokedAt: null,
        },
        {
          $set: {
            revokedAt: new Date(),
            revokeReason: "logout",
          },
        },
      );
    }

    await recordSecurityEvent(
      req,
      "logout",
      "success",
      {},
      {
        userId: req.user?.userId,
        email: req.user?.email,
        role: req.user?.role,
        sessionId: req.user?.sessionId,
      },
    );

    res.sendStatus(204);
  },
);

// ============================================================
// LOGOUT ALL
// ============================================================

router.post(
  "/auth/logout-all",
  authenticate,
  async (req, res): Promise<void> => {
    clearRefreshCookie(res);

    const principalType =
      req.user!.role === "student"
        ? "student"
        : "user";

    const result = await UserSession.updateMany(
      {
        userId: req.user!.userId,
        principalType,
        revokedAt: null,
      },
      {
        $set: {
          revokedAt: new Date(),
          revokeReason: "logout_all",
        },
      },
    );

    await recordSecurityEvent(
      req,
      "logout_all",
      "success",
      {
        revokedSessions: result.modifiedCount,
      },
      {
        userId: req.user!.userId,
        email: req.user!.email,
        role: req.user!.role,
        sessionId: req.user!.sessionId,
      },
    );

    res.sendStatus(204);
  },
);

// ============================================================
// REFRESH SESSION
// ============================================================

router.post(
  "/auth/refresh",
  async (req, res): Promise<void> => {
    try {
      const [
        sessionId,
        secret,
        extra,
      ] = getRefreshCookie(req).split(".");

      if (
        !sessionId ||
        !secret ||
        extra !== undefined ||
        !/^[a-f\d]{24}$/i.test(sessionId)
      ) {
        await recordSecurityEvent(
          req,
          "session.refresh_failed",
          "failure",
          {
            reason: "malformed_refresh_cookie",
          },
        );

        clearRefreshCookie(res);

        res.status(401).json({
          error:
            "A valid session is required. Please sign in again.",
        });

        return;
      }

      const now = new Date();

      const session =
        await UserSession.findOne({
          _id: sessionId,
          revokedAt: null,
          expiresAt: { $gt: now },
        }).select(
          "+refreshTokenHash +previousRefreshTokenHash refreshRotatedAt userId principalType instituteId role branchId revokedAt expiresAt",
        );

      const presentedHash = hashValue(secret);

      if (
        session?.refreshTokenHash &&
        !sameSecret(
          session.refreshTokenHash,
          presentedHash,
        ) &&
        session.previousRefreshTokenHash &&
        sameSecret(
          session.previousRefreshTokenHash,
          presentedHash,
        ) &&
        session.refreshRotatedAt &&
        session.refreshRotatedAt.getTime() >
          now.getTime() - 30_000
      ) {
        await recordSecurityEvent(
          req,
          "session.refresh_overlap",
          "info",
          {
            reason: "concurrent_rotation",
          },
          {
            userId: session.userId,
            role: session.role,
            sessionId: String(session._id),
            scope: isPlatformRole(session.role)
              ? "platform"
              : "institute",
          },
        );

        res.status(409).json({
          error:
            "A concurrent session refresh completed. Retrying with the updated session.",
        });

        return;
      }

      if (
        !session?.refreshTokenHash ||
        !sameSecret(
          session.refreshTokenHash,
          presentedHash,
        )
      ) {
        await recordSecurityEvent(
          req,
          "session.refresh_failed",
          "failure",
          {
            reason: "invalid_refresh_token",
          },
          {
            userId: session?.userId,
            role: session?.role,
            sessionId,
            scope:
              session &&
              isPlatformRole(session.role)
                ? "platform"
                : "institute",
          },
        );

        clearRefreshCookie(res);

        res.status(401).json({
          error:
            "This session has expired or is invalid. Please sign in again.",
        });

        return;
      }

      if (!isPlatformRole(session.role) && session.instituteId) {
        const accessBlockReason = await getInstituteAccessBlockReasonById(String(session.instituteId), now);
        if (accessBlockReason) {
          await UserSession.updateMany(
            { instituteId: session.instituteId, revokedAt: null },
            { $set: { revokedAt: now, revokeReason: "institute_access_blocked" } },
          );
          await recordSecurityEvent(req, "session.refresh_rejected", "failure", { reason: accessBlockReason }, {
            userId: String(session.userId), role: session.role, sessionId: String(session._id), scope: "institute",
          });
          clearRefreshCookie(res);
          res.status(403).json({ error: accessBlockReason, code: "INSTITUTE_ACCESS_BLOCKED" });
          return;
        }
      }

      let email = "";
      let customRoleId: string | null = null;

      if (session.principalType === "student") {
        const student =
          await Student.findById(
            session.userId,
          ).select(
            "email status instituteId",
          );

        if (
          !student ||
          student.status !== "active" ||
          String(student.instituteId ?? "") !==
            String(session.instituteId ?? "")
        ) {
          await UserSession.updateOne(
            {
              _id: session._id,
              revokedAt: null,
            },
            {
              $set: {
                revokedAt: now,
                revokeReason: "account_inactive",
              },
            },
          );

          await recordSecurityEvent(
            req,
            "session.refresh_rejected",
            "failure",
            {
              reason: "account_inactive",
            },
            {
              userId: session.userId,
              email: student?.email ?? "",
              role: session.role,
              sessionId: String(
                session._id,
              ),
              scope: "institute",
            },
          );

          clearRefreshCookie(res);

          res.status(401).json({
            error:
              "This account is no longer active. Please sign in again.",
          });

          return;
        }

        email = student.email ?? "";
      } else {
        const account =
          await User.findById(
            session.userId,
          ).select(
            "email role instituteId activeBranchId customRoleId branchIds isApproved",
          );

        const platform = isPlatformRole(
          session.role,
        );

        if (
          !account ||
          account.role !== session.role ||
          account.isApproved !== true ||
          (platform &&
            (
              account.instituteId ||
              account.activeBranchId ||
              account.customRoleId ||
              account.branchIds?.length
            )) ||
          String(account.instituteId ?? "") !==
            String(session.instituteId ?? "") ||
          String(account.activeBranchId ?? "") !==
            String(session.branchId ?? "")
        ) {
          await UserSession.updateOne(
            {
              _id: session._id,
              revokedAt: null,
            },
            {
              $set: {
                revokedAt: now,
                revokeReason:
                  "account_scope_changed",
              },
            },
          );

          await recordSecurityEvent(
            req,
            "session.refresh_rejected",
            "failure",
            {
              reason:
                "account_scope_changed",
            },
            {
              userId: session.userId,
              email: account?.email ?? "",
              role: session.role,
              sessionId: String(
                session._id,
              ),
              scope: platform
                ? "platform"
                : "institute",
            },
          );

          clearRefreshCookie(res);

          res.status(401).json({
            error:
              "This account or session scope changed. Please sign in again.",
          });

          return;
        }

        email = account.email;
        customRoleId =
          account.customRoleId
            ? String(account.customRoleId)
            : null;
      }

      const nextSecret =
        randomBytes(48).toString(
          "base64url",
        );

      const nextHash =
        hashValue(nextSecret);

      const rotated =
        await UserSession.findOneAndUpdate(
          {
            _id: session._id,
            refreshTokenHash:
              session.refreshTokenHash,
            revokedAt: null,
            expiresAt: { $gt: now },
          },
          {
            $set: {
              previousRefreshTokenHash:
                session.refreshTokenHash,
              refreshTokenHash: nextHash,
              refreshRotatedAt: now,
              lastSeenAt: now,
              ipAddress:
                getRequestIp(req),
              userAgent:
                getUserAgent(req),
              deviceName:
                getDeviceName(
                  getUserAgent(req),
                ),
              deviceType:
                getDeviceType(
                  getUserAgent(req),
                ),
            },
          },
          { returnDocument: "after" },
        );

      if (!rotated) {
        await recordSecurityEvent(
          req,
          "session.refresh_failed",
          "failure",
          {
            reason:
              "refresh_token_replay_or_race",
          },
          {
            userId: session.userId,
            email,
            role: session.role,
            sessionId: String(
              session._id,
            ),
            scope: isPlatformRole(
              session.role,
            )
              ? "platform"
              : "institute",
          },
        );

        res.status(409).json({
          error:
            "A concurrent session refresh completed. Retry with the updated session.",
        });

        return;
      }

      const accessToken = signToken({
        userId: session.userId,
        email,
        role: session.role,
        instituteId: session.instituteId
          ? String(session.instituteId)
          : null,
        activeBranchId: session.branchId
          ? String(session.branchId)
          : null,
        customRoleId,
        sessionId: String(
          session._id,
        ),
      });

      setRefreshCookie(
        res,
        `${String(session._id)}.${nextSecret}`,
        session.expiresAt.getTime() -
          Date.now(),
      );

      await recordSecurityEvent(
        req,
        "session.refresh",
        "success",
        {},
        {
          userId: session.userId,
          email,
          role: session.role,
          sessionId: String(
            session._id,
          ),
          scope: isPlatformRole(
            session.role,
          )
            ? "platform"
            : "institute",
        },
      );

      res.json({
        token: accessToken,
      });
    } catch (error) {
      res.status(500).json({
        error:
          "Unable to refresh session.",
      });
    }
  },
);

// ============================================================
// SUPER ADMIN LOGIN
// ============================================================

router.post(
  "/auth/super-admin/login",
  async (req, res): Promise<void> => {
    const identifier =
      normalizeIdentifier(
        req.body?.email,
      );

    const password =
      typeof req.body?.password ===
      "string"
        ? req.body.password
        : "";

    if (
      !identifier ||
      !password ||
      identifier.length > 254 ||
      password.length > 1024
    ) {
      res.status(400).json({
        error:
          "Email and password are required.",
      });

      return;
    }

    try {
      console.log("=== SUPER ADMIN DB IDENTITY ===");
      console.log("Mongo Host:", mongoose.connection.host);
      console.log("Mongo Database:", mongoose.connection.name);
      console.log("User Collection:", User.collection.name);
      console.log("=== END SUPER ADMIN DB IDENTITY ===");

      const superAdminRateLimited = await isLoginRateLimited(
        req,
        identifier,
      );

      console.log("=== SUPER ADMIN 429 DEBUG ===");
      console.log({
        identifier,
        rateLimited: superAdminRateLimited,
        requestIp: req.ip,
      });
      console.log("=== END SUPER ADMIN 429 DEBUG ===");

      if (superAdminRateLimited) {
        await recordSecurityEvent(
          req,
          "login.rate_limited",
          "failure",
          {
            source: "platform",
          },
          {
            scope: "platform",
          },
        );

        res.status(429).json({
          error:
            "Too many sign-in attempts. Try again later.",
        });

        return;
      }

      const user = await User.findOne({ email: identifier });

      if (
        !user ||
        !isPlatformRole(user.role)
      ) {
        await failedLogin(
          req,
          identifier,
          "platform",
          null,
          "invalid_credentials",
          false,
        );

        res.status(401).json({
          error: "Invalid credentials.",
        });

        return;
      }

      const actor =
        securityActor(
          user,
          "platform",
        );

      if (
        user.lockedUntil &&
        user.lockedUntil > new Date()
      ) {
        await recordSecurityEvent(
          req,
          "login.locked",
          "failure",
          {
            source: "platform",
          },
          actor,
        );

        res.status(429).json({
          error:
            "Too many sign-in attempts. Try again later.",
        });

        return;
      }

      const envPassword = String(process.env.SUPER_ADMIN_PASSWORD || "");

      const freshHash = await bcrypt.hash(password, 12);
      const freshHashMatch = await bcrypt.compare(password, freshHash);

      const storedHashMatch = await bcrypt.compare(password, user.password);

      let storedHashRounds: number | string = "unknown";
      try {
        storedHashRounds = bcrypt.getRounds(user.password);
      } catch {
        storedHashRounds = "invalid-hash";
      }

      console.log("=== SUPER ADMIN BCRYPT DEEP DIAGNOSTIC ===");
      console.log({
        identifier,
        passwordLength: password.length,

        receivedMatchesEnv:
          envPassword.length > 0 ? password === envPassword : false,

        userFound: Boolean(user),
        userRole: user?.role,

        storedPasswordExists: Boolean(user?.password),
        storedPasswordType: typeof user?.password,
        storedPasswordLength: user?.password?.length || 0,
        storedHashRounds,

        freshHashMatch,
        storedHashMatch,

        bcryptCompareType: typeof bcrypt.compare,
        bcryptHashType: typeof bcrypt.hash,
      });
      console.log("=== END DEEP DIAGNOSTIC ===");

      const match = storedHashMatch;
        console.log("bcryptMatch:", match);
        console.log("=== END SUPER ADMIN LOGIN DIAGNOSTIC ===");

      if (!match) {
        const locked =
          await failedLogin(
            req,
            identifier,
            "platform",
            user,
            "invalid_credentials",
          );

        res
          .status(
            locked ? 429 : 401,
          )
          .json({
            error: locked
              ? "Too many sign-in attempts. Try again later."
              : "Invalid credentials.",
          });

        return;
      }

      if (
        user.instituteId ||
        user.activeBranchId ||
        user.branchIds?.length ||
        user.customRoleId ||
        user.isApproved !== true
      ) {
        await recordSecurityEvent(
          req,
          "login.rejected_scope",
          "failure",
          {
            source: "platform",
          },
          actor,
        );

        res.status(401).json({
          error:
            "Invalid credentials.",
        });

        return;
      }

      if (user.twoFactorEnabled) {
        await clearUserLoginFailures(
          String(user._id),
        );

        await recordSecurityEvent(
          req,
          "login.second_factor_required",
          "info",
          {
            source: "platform",
          },
          actor,
        );

        res.status(428).json({
          error:
            "A second-factor challenge is required for this account.",
          code: "SECOND_FACTOR_REQUIRED",
        });

        return;
      }

      const issued =
        await createLoginSession(
          req,
          res,
          {
            userId: String(
              user._id,
            ),
            email: user.email,
            role: user.role,
          },
          user,
          "platform",
        );

      if (!issued) return;
      res.json({
        token: issued.accessToken,
        user: {
          id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error: any) {
      // IMPORTANT:
      // This catch belongs to the Super Admin login route.
      // It intentionally exposes the actual development error
      // so we can identify the current 500 cause.
      console.error(
        "========================================",
      );
      console.error(
        "SUPER ADMIN LOGIN ERROR",
      );
      console.error(
        "MESSAGE:",
        error?.message,
      );
      console.error(
        "NAME:",
        error?.name,
      );
      console.error(
        "STACK:",
        error?.stack,
      );
      console.error(
        "FULL ERROR:",
        error,
      );
      console.error(
        "========================================",
      );

      res.status(500).json({
        error:
          "Unable to sign in.",
        debug:
          process.env.NODE_ENV ===
          "development"
            ? String(
                error?.message ||
                  "Unknown error",
              )
            : undefined,
      });
    }
  },
);

// ============================================================
// SUPER ADMIN FORGOT PASSWORD
// ============================================================

router.post(
  "/auth/super-admin/forgot-password",
  async (req, res): Promise<void> => {
    const email =
      normalizeIdentifier(
        req.body?.email,
      );

    if (
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email,
      )
    ) {
      res.status(400).json({
        error:
          "Enter a valid email address.",
      });

      return;
    }

    try {
      if (
        await consumeActionRateLimit(
          req,
          "password-reset",
          email,
          5,
          20,
          60 * 60 * 1000,
        )
      ) {
        await recordSecurityEvent(
          req,
          "password_reset.rate_limited",
          "failure",
          {
            source: "platform",
          },
          {
            scope: "platform",
          },
        );

        res.status(429).json({
          error:
            "Too many recovery requests. Try again later.",
        });

        return;
      }

      if (
        !await isAuthEmailDeliveryConfigured()
      ) {
        await recordSecurityEvent(
          req,
          "password_reset.request_unavailable",
          "failure",
          {
            source: "platform",
          },
          {
            scope: "platform",
          },
        );

        res.status(503).json({
          error:
            "Password recovery is not configured. Contact the platform operator.",
        });

        return;
      }

      const user =
        await User.findOne({
          email,
        }).select(
          "role name email instituteId activeBranchId branchIds customRoleId",
        );

      if (
        !user ||
        !isPlatformRole(
          user.role,
        ) ||
        user.instituteId ||
        user.activeBranchId ||
        user.customRoleId ||
        user.branchIds?.length
      ) {
        await recordSecurityEvent(
          req,
          "password_reset.request",
          "info",
          {
            source: "platform",
            eligible: false,
          },
          {
            scope: "platform",
          },
        );

        res.status(202).json({
          message:
            "If the account is eligible, password reset instructions will be sent.",
        });

        return;
      }

      await AuthToken.deleteMany({
        userId: user._id,
        purpose: "password_reset",
        consumedAt: {
          $exists: false,
        },
      });

      const token =
        randomBytes(32).toString(
          "base64url",
        );

      await AuthToken.create({
        userId: user._id,
        purpose: "password_reset",
        tokenHash: hashValue(token),
        expiresAt: new Date(
          Date.now() +
            30 * 60 * 1000,
        ),
        requestedFromIp:
          getRequestIp(req),
      });

      const link =
        passwordResetUrl(token);

      const escapedLink =
        htmlEscape(link);

      const encrypted =
        encryptEmailPayload({
          subject:
            "Reset your ParikshaDrishti platform password",
          text: `A password reset was requested for your ParikshaDrishti platform account. Reset it within 30 minutes: ${link}\n\nIf you did not request this, ignore this email.`,
          html: `<p>A password reset was requested for your ParikshaDrishti platform account.</p><p><a href="${escapedLink}">Reset password</a></p><p>This link expires in 30 minutes. If you did not request this, ignore this email.</p>`,
        });

      await AuthEmailOutbox.create({
        to: user.email,
        purpose: "password_reset",
        ...encrypted,
        expiresAt:
          securityEmailRetentionDate(),
      });

      await recordSecurityEvent(
        req,
        "password_reset.request",
        "success",
        {
          source: "platform",
        },
        securityActor(
          user,
          "platform",
        ),
      );

      res.status(202).json({
        message:
          "If the account is eligible, password reset instructions will be sent.",
      });
    } catch (error) {
      res.status(500).json({
        error:
          "Unable to process password recovery.",
      });
    }
  },
);

// ============================================================
// SUPER ADMIN RESET PASSWORD
// ============================================================

router.post(
  "/auth/super-admin/reset-password",
  async (req, res): Promise<void> => {
    const token =
      typeof req.body?.token ===
      "string"
        ? req.body.token
        : "";

    const password =
      typeof req.body?.password ===
      "string"
        ? req.body.password
        : "";

    if (
      !token ||
      token.length > 200 ||
      !password
    ) {
      res.status(400).json({
        error:
          "A valid reset token and new password are required.",
      });

      return;
    }

    const passwordIssue =
      safePasswordIssue(password);

    if (passwordIssue) {
      res.status(400).json({
        error: passwordIssue,
      });

      return;
    }

    try {
      const now = new Date();

      const resetToken =
        await AuthToken.findOne({
          tokenHash:
            hashValue(token),
          purpose: "password_reset",
          consumedAt: {
            $exists: false,
          },
          expiresAt: {
            $gt: now,
          },
        }).select("userId");

      if (!resetToken) {
        await recordSecurityEvent(
          req,
          "password_reset.completed",
          "failure",
          {
            reason:
              "invalid_or_expired_token",
          },
          {
            scope: "platform",
          },
        );

        res.status(400).json({
          error:
            "This reset link is invalid or has expired. Request a new one.",
        });

        return;
      }

      const user =
        await User.findById(
          resetToken.userId,
        ).select(
          "+password role email instituteId activeBranchId branchIds customRoleId",
        );

      if (
        !user ||
        !isPlatformRole(
          user.role,
        ) ||
        user.instituteId ||
        user.activeBranchId ||
        user.customRoleId ||
        user.branchIds?.length
      ) {
        await recordSecurityEvent(
          req,
          "password_reset.completed",
          "failure",
          {
            reason:
              "ineligible_account",
          },
          {
            scope: "platform",
          },
        );

        res.status(400).json({
          error:
            "This reset link is invalid or has expired. Request a new one.",
        });

        return;
      }

      if (
        await bcrypt.compare(
          password,
          user.password,
        )
      ) {
        await recordSecurityEvent(
          req,
          "password_reset.completed",
          "failure",
          {
            reason:
              "password_reuse",
          },
          securityActor(
            user,
            "platform",
          ),
        );

        res.status(400).json({
          error:
            "Choose a password you have not used before.",
        });

        return;
      }

      const consumed =
        await AuthToken.updateOne(
          {
            _id: resetToken._id,
            consumedAt: {
              $exists: false,
            },
            expiresAt: {
              $gt: now,
            },
          },
          {
            $set: {
              consumedAt: now,
            },
          },
        );

      if (consumed.modifiedCount !== 1) {
        await recordSecurityEvent(
          req,
          "password_reset.completed",
          "failure",
          {
            reason:
              "token_already_used",
          },
          securityActor(
            user,
            "platform",
          ),
        );

        res.status(400).json({
          error:
            "This reset link is invalid or has expired. Request a new one.",
        });

        return;
      }

      user.password =
        await bcrypt.hash(
          password,
          12,
        );

      user.failedLoginAttempts = 0;
      user.failedLoginWindowStartedAt =
        undefined;
      user.lockedUntil = undefined;

      await user.save();

      await Promise.all([
        UserSession.updateMany(
          {
            userId: String(
              user._id,
            ),
            principalType: "user",
            revokedAt: null,
          },
          {
            $set: {
              revokedAt: now,
              revokeReason:
                "password_reset",
            },
          },
        ),

        AuthToken.updateMany(
          {
            userId: user._id,
            purpose:
              "password_reset",
            consumedAt: {
              $exists: false,
            },
          },
          {
            $set: {
              consumedAt: now,
            },
          },
        ),
      ]);

      clearRefreshCookie(res);

      await recordSecurityEvent(
        req,
        "password_reset.completed",
        "success",
        {},
        securityActor(
          user,
          "platform",
        ),
      );

      res.json({
        message:
          "Password reset successfully. Sign in with your new password.",
      });
    } catch (error) {
      res.status(500).json({
        error:
          "Unable to reset the password.",
      });
    }
  },
);

router.post("/auth/institute-admin/reset-password", async (req, res): Promise<void> => {
  const token = typeof req.body?.token === "string" ? req.body.token : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!token || token.length > 200 || !password) {
    res.status(400).json({ error: "A valid reset token and new password are required." });
    return;
  }
  const passwordIssue = safePasswordIssue(password);
  if (passwordIssue) {
    res.status(400).json({ error: passwordIssue });
    return;
  }

  try {
    const now = new Date();
    const resetToken = await AuthToken.findOne({
      tokenHash: hashValue(token), purpose: "password_reset", consumedAt: { $exists: false }, expiresAt: { $gt: now },
    }).select("userId");
    const invalidLink = () => res.status(400).json({ error: "This reset link is invalid or has expired. Request a new one." });
    if (!resetToken) {
      await recordSecurityEvent(req, "password_reset.completed", "failure", { reason: "invalid_or_expired_token" }, { scope: "institute" });
      invalidLink();
      return;
    }
    const user = await User.findById(resetToken.userId).select("+password role email instituteId failedLoginAttempts failedLoginWindowStartedAt lockedUntil");
    if (!user || user.role !== "institute_admin" || !user.instituteId) {
      await recordSecurityEvent(req, "password_reset.completed", "failure", { reason: "ineligible_account" }, { scope: "institute" });
      invalidLink();
      return;
    }
    if (await bcrypt.compare(password, user.password)) {
      res.status(400).json({ error: "Choose a password you have not used before." });
      return;
    }
    const consumed = await AuthToken.updateOne(
      { _id: resetToken._id, consumedAt: { $exists: false }, expiresAt: { $gt: now } },
      { $set: { consumedAt: now } },
    );
    if (consumed.modifiedCount !== 1) {
      invalidLink();
      return;
    }
    user.password = await bcrypt.hash(password, 12);
    user.failedLoginAttempts = 0;
    user.failedLoginWindowStartedAt = undefined;
    user.lockedUntil = undefined;
    await user.save();
    await Promise.all([
      UserSession.updateMany(
        { userId: String(user._id), principalType: "user", revokedAt: null },
        { $set: { revokedAt: now, revokeReason: "password_reset" } },
      ),
      AuthToken.updateMany(
        { userId: user._id, purpose: "password_reset", consumedAt: { $exists: false } },
        { $set: { consumedAt: now } },
      ),
    ]);
    await recordSecurityEvent(req, "password_reset.completed", "success", {}, {
      userId: String(user._id), email: user.email, role: user.role, scope: "institute",
    });
    res.json({ message: "Password reset successfully. Sign in with your new password." });
  } catch {
    res.status(500).json({ error: "Unable to reset the password." });
  }
});

// ============================================================
// GET CURRENT LOGGED-IN USER PROFILE
// ============================================================

router.get(
  "/auth/me",
  authenticate,
  async (req, res): Promise<void> => {
    try {
      if (
        req.user!.role ===
        "student"
      ) {
        const student =
          await Student.findById(
            req.user!.userId,
          ).select(
            "-loginPassword",
          );

        if (!student) {
          res.status(404).json({
            error:
              "Student not found",
          });

          return;
        }

        const [
          course,
          batch,
        ] = await Promise.all([
          student.courseId
            ? Course.findById(
                student.courseId,
              ).select("name")
            : null,

          student.batchId
            ? Batch.findById(
                student.batchId,
              ).select("name")
            : null,
        ]);

        res.json({
          id: String(
            student._id,
          ),
          name: student.name,
          email:
            student.email ?? "",
          phone:
            student.phone ?? "",
          loginId:
            student.loginId ?? "",
          role: "student",

          instituteId:
            student.instituteId
              ? String(
                  student.instituteId,
                )
              : null,

          enrollmentNo:
            student.enrollmentNo,

          courseId:
            student.courseId
              ? String(
                  student.courseId,
                )
              : null,

          courseName:
            course?.name ?? "",

          batchId:
            student.batchId
              ? String(
                  student.batchId,
                )
              : null,

          batchName:
            batch?.name ?? "",

          academicYear:
            student.academicYear ??
            "",

          className:
            student.className ??
            "",

          section:
            student.section ?? "",

          board:
            student.board ?? "",

          boardOther:
            (student as any)
              .boardOther ?? "",

          schoolName:
            student.schoolName ??
            "",

          photoDataUrl:
            student.photoDataUrl ??
            "",

          dateOfBirth:
            student.dateOfBirth ??
            "",

          gender:
            student.gender ?? "",

          genderOther:
            (student as any)
              .genderOther ?? "",

          bloodGroup:
            student.bloodGroup ??
            "",

          aadhaarCard:
            (student as any)
              .aadhaarCard ?? "",

          lastClassPercentage:
            (student as any)
              .lastClassPercentage ??
            "",

          lastClassMarks:
            (student as any)
              .lastClassMarks ?? "",

          parentName:
            student.parentName ??
            "",

          parentPhone:
            student.parentPhone ??
            "",

          fatherName:
            student.fatherName ??
            "",

          fatherOccupation:
            (student as any)
              .fatherOccupation ??
            "",

          fatherPhone:
            (student as any)
              .fatherPhone ?? "",

          fatherWhatsapp:
            (student as any)
              .fatherWhatsapp ??
            "",

          motherName:
            student.motherName ??
            "",

          motherOccupation:
            (student as any)
              .motherOccupation ??
            "",

          motherPhone:
            (student as any)
              .motherPhone ?? "",

          motherWhatsapp:
            (student as any)
              .motherWhatsapp ??
            "",

          emergencyPhone:
            (student as any)
              .emergencyPhone ??
            "",

          correspondenceAddress:
            (student as any)
              .correspondenceAddress ??
            "",

          correspondenceDistrict:
            (student as any)
              .correspondenceDistrict ??
            "",

          correspondenceState:
            (student as any)
              .correspondenceState ??
            "",

          correspondencePin:
            (student as any)
              .correspondencePin ??
            "",

          permanentAddress:
            (student as any)
              .permanentAddress ??
            "",

          permanentDistrict:
            (student as any)
              .permanentDistrict ??
            "",

          permanentState:
            (student as any)
              .permanentState ??
            "",

          permanentPin:
            (student as any)
              .permanentPin ??
            "",

          createdAt:
            student.createdAt,
        });

        return;
      }

      const user =
        await User.findById(
          req.user!.userId,
        ).select("-password");

      if (!user) {
        res.status(404).json({
          error:
            "User not found",
        });

        return;
      }

      if (
        [
          "teacher",
          "staff",
          "accountant",
        ].includes(req.user!.role)
      ) {
        const userEmail =
          String(
            (user as any).email ??
              "",
          )
            .trim()
            .toLowerCase();

        const userPhone =
          String(
            (user as any).phone ??
              "",
          ).trim();

        const userLoginId =
          String(
            (user as any).loginId ??
              "",
          )
            .trim()
            .toLowerCase();

        const conditions: any[] =
          [];

        if (userEmail) {
          conditions.push({
            email: userEmail,
          });
        }

        if (userPhone) {
          conditions.push({
            phone: userPhone,
          });
        }

        if (userLoginId) {
          conditions.push({
            username: userLoginId,
          });
        }

        const staff =
          conditions.length
            ? await Staff.findOne({
                $or: conditions,
                ...(user.instituteId
                  ? {
                      instituteId:
                        user.instituteId,
                    }
                  : {}),
              })
            : null;

        if (staff) {
          const staffObj: any =
            staff.toObject();

          res.json({
            ...staffObj,

            id: String(
              staff._id,
            ),

            _id: String(
              staff._id,
            ),

            role:
              staff.role ||
              "Teacher / Faculty",

            accessLevel:
              staff.accessLevel ||
              req.user!.role,

            loginRole:
              req.user!.role,

            userId: String(
              user._id,
            ),

            loginId:
              (user as any)
                .loginId ??
              staff.username ??
              "",

            email:
              staff.email ??
              (user as any).email ??
              "",

            phone:
              staff.phone ??
              (user as any).phone ??
              "",

            instituteId:
              staff.instituteId
                ? String(
                    staff.instituteId,
                  )
                : user.instituteId
                  ? String(
                      user.instituteId,
                    )
                  : null,

            batches:
              Array.isArray(
                (staff as any)
                  .batches,
              )
                ? (
                    staff as any
                  ).batches.map(
                    (id: any) =>
                      String(id),
                  )
                : [],

            isApproved:
              user.isApproved,

            createdAt:
              staff.createdAt,
          });

          return;
        }
      }

      res.json({
        id: String(
          user._id,
        ),

        name: user.name,

        email: user.email,

        loginId:
          user.loginId ?? "",

        phone:
          (user as any).phone ??
          "",

        businessAddress:
          (user as any)
            .businessAddress ??
          "",

        businessType:
          (user as any)
            .businessType ??
          "",

        promoCode:
          (user as any)
            .promoCode ?? "",

        logoDataUrl:
          (user as any)
            .logoDataUrl ?? "",

        role: user.role,

        instituteId:
          user.instituteId
            ? String(
                user.instituteId,
              )
            : null,

        activeBranchId:
          user.activeBranchId
            ? String(
                user.activeBranchId,
              )
            : null,

        customRoleId:
          user.customRoleId
            ? String(
                user.customRoleId,
              )
            : null,

        isApproved:
          user.isApproved,

        createdAt:
          user.createdAt,
      });
    } catch (error: any) {
      res.status(500).json({
        error:
          error?.message ||
          "Failed to load user profile",
      });
    }
  },
);

// ============================================================
// UNIVERSAL LOGIN
// ============================================================

router.post(
  "/auth/login",
  async (req, res): Promise<void> => {
    try {
      const {
        email,
        loginId,
        identifier:
          rawIdentifier,
        password,
      } = req.body ?? {};

      const rawInput =
        String(
          rawIdentifier ||
            loginId ||
            email ||
            "",
        ).trim();

      const cleanLower =
        rawInput.toLowerCase();

      const cleanDigits =
        rawInput.replace(
          /\D/g,
          "",
        );

      if (
        !rawInput ||
        typeof password !==
          "string" ||
        !password ||
        rawInput.length >
          254 ||
        password.length >
          1024
      ) {
        res.status(400).json({
          error:
            "Email/Phone/Username and password are required",
        });

        return;
      }

      if (
        await isLoginRateLimited(
          req,
          rawInput,
        )
      ) {
        await recordSecurityEvent(
          req,
          "login.rate_limited",
          "failure",
          {
            source: "institute",
          },
          {
            scope: "institute",
          },
        );

        res.status(429).json({
          error:
            "Too many sign-in attempts. Try again later.",
        });

        return;
      }

      const userSearchConditions:
        any[] = [
          {
            loginId:
              cleanLower,
          },
          {
            email:
              cleanLower,
          },
          {
            phone:
              rawInput,
          },
          {
            username:
              cleanLower,
          },
        ];

      if (
        cleanDigits.length >=
        10
      ) {
        userSearchConditions.push(
          {
            phone: {
              $regex:
                cleanDigits.slice(
                  -10,
                ) + "$",
            },
          },
        );
      }

      let user =
        await User.findOne({
          $or:
            userSearchConditions,
        });

      if (!user) {
        const staff =
          await Staff.findOne({
            username:
              cleanLower,
            loginEnabled: true,
          });

        if (staff) {
          const staffEmail =
            staff.email
              ? String(
                  staff.email,
                )
                  .toLowerCase()
                  .trim()
              : "";

          const staffPhone =
            staff.phone
              ? String(
                  staff.phone,
                ).trim()
              : "";

          const staffUserConditions:
            any[] = [];

          if (staffEmail) {
            staffUserConditions.push({
              email:
                staffEmail,
            });
          }

          if (staffPhone) {
            staffUserConditions.push({
              phone:
                staffPhone,
            });
          }

          if (
            staffUserConditions.length >
            0
          ) {
            user =
              await User.findOne({
                $or:
                  staffUserConditions,
                ...(staff.instituteId
                  ? {
                      instituteId:
                        staff.instituteId,
                    }
                  : {}),
              });
          }
        }
      }

      if (
        user &&
        isPlatformRole(
          user.role,
        )
      ) {
        await failedLogin(
          req,
          rawInput,
          "platform",
          user,
          "dedicated_platform_login_required",
          false,
        );

        res.status(401).json({
          error:
            "Invalid credentials",
        });

        return;
      }

      if (user) {
        if (
          user.lockedUntil &&
          user.lockedUntil >
            new Date()
        ) {
          await recordSecurityEvent(
            req,
            "login.locked",
            "failure",
            {
              source:
                "institute",
            },
            securityActor(
              user,
              "institute",
            ),
          );

          res.status(429).json({
            error:
              "Too many sign-in attempts. Try again later.",
          });

          return;
        }

        const match =
          await bcrypt.compare(
            password,
            user.password,
          );

        if (!match) {
          const locked =
            await failedLogin(
              req,
              rawInput,
              "institute",
              user,
              "invalid_credentials",
            );

          res
            .status(
              locked ? 429 : 401,
            )
            .json({
              error: locked
                ? "Too many sign-in attempts. Try again later."
                : "Invalid credentials",
            });

          return;
        }

        if (
          user.isApproved !==
          true
        ) {
          await recordSecurityEvent(
            req,
            "login.rejected_pending",
            "failure",
            {
              source:
                "institute",
            },
            securityActor(
              user,
              "institute",
            ),
          );

          res.status(403).json({
            error:
              "Your account is pending approval. Please contact administrator.",
          });

          return;
        }

        const activeBranchId =
          user.activeBranchId
            ? String(
                user.activeBranchId,
              )
            : null;

        const customRoleId =
          user.customRoleId
            ? String(
                user.customRoleId,
              )
            : null;

        const issued =
          await createLoginSession(
            req,
            res,
            {
              userId: String(
                user._id,
              ),
              email:
                user.email,
              role:
                user.role,
              instituteId:
                user.instituteId
                  ? String(
                      user.instituteId,
                    )
                  : null,
              activeBranchId,
              customRoleId,
            },
            user,
            "institute",
          );

        if (!issued) return;
        res.json({
          token:
            issued.accessToken,

          user: {
            id: String(
              user._id,
            ),
            name: user.name,
            email:
              user.email,
            loginId:
              user.loginId ??
              "",
            role:
              user.role,
            instituteId:
              user.instituteId
                ? String(
                    user.instituteId,
                  )
                : null,
            activeBranchId,
            customRoleId,
            isApproved:
              user.isApproved,
          },
        });

        return;
      }

      const studentSearchConditions:
        any[] = [
          {
            loginId:
              cleanLower,
          },
          {
            email:
              cleanLower,
          },
          {
            phone:
              rawInput,
          },
          {
            enrollmentNo:
              cleanLower.toUpperCase(),
          },
        ];

      if (
        cleanDigits.length >=
        10
      ) {
        studentSearchConditions.push(
          {
            phone: {
              $regex:
                cleanDigits.slice(
                  -10,
                ) + "$",
            },
          },
        );
      }

      const student =
        await Student.findOne({
          $or:
            studentSearchConditions,
          status: "active",
        }).select(
          "+loginPassword",
        );

      if (
        !student ||
        !student.loginPassword
      ) {
        await failedLogin(
          req,
          rawInput,
          "institute",
          null,
          "invalid_credentials",
          false,
        );

        res.status(401).json({
          error:
            "Invalid credentials",
        });

        return;
      }

      const match =
        await bcrypt.compare(
          password,
          student.loginPassword,
        );

      if (!match) {
        await failedLogin(
          req,
          rawInput,
          "institute",
          null,
          "invalid_credentials",
          false,
        );

        res.status(401).json({
          error:
            "Invalid credentials",
        });

        return;
      }

      const issued =
        await createLoginSession(
          req,
          res,
          {
            userId: String(
              student._id,
            ),
            email:
              student.email ??
              "",
            role: "student",
            instituteId:
              String(
                student.instituteId,
              ),
            principalType:
              "student",
          },
          {
            _id: student._id,
            email:
              student.email ??
              "",
            role: "student",
          },
          "institute",
        );

      if (!issued) return;
      res.json({
        token:
          issued.accessToken,

        user: {
          id: String(
            student._id,
          ),
          name:
            student.name,
          email:
            student.email ??
            "",
          loginId:
            student.loginId ??
            "",
          role: "student",
          instituteId:
            String(
              student.instituteId,
            ),
          enrollmentNo:
            student.enrollmentNo,
          courseId:
            student.courseId
              ? String(
                  student.courseId,
                )
              : null,
          batchId:
            student.batchId
              ? String(
                  student.batchId,
                )
              : null,
        },
      });
    } catch (error: any) {
      console.error(
        "Login Error:",
        error,
      );

      res.status(500).json({
        error:
          "Unable to sign in.",
      });
    }
  },
);

// ============================================================
// STUDENT SPECIFIC LOGIN
// ============================================================

router.post(
  "/auth/student-login",
  async (req, res): Promise<void> => {
    try {
      const {
        loginId,
        password,
      } = req.body ?? {};

      if (
        !loginId ||
        typeof password !==
          "string" ||
        !password ||
        String(loginId).length >
          254 ||
        password.length >
          1024
      ) {
        res.status(400).json({
          error:
            "loginId and password are required",
        });

        return;
      }

      const rawInput =
        String(loginId).trim();

      if (
        await isLoginRateLimited(
          req,
          rawInput,
        )
      ) {
        await recordSecurityEvent(
          req,
          "login.rate_limited",
          "failure",
          {
            source: "student",
          },
          {
            scope: "institute",
          },
        );

        res.status(429).json({
          error:
            "Too many sign-in attempts. Try again later.",
        });

        return;
      }

      const cleanLower =
        rawInput.toLowerCase();

      const cleanDigits =
        rawInput.replace(
          /\D/g,
          "",
        );

      const studentSearchConditions:
        any[] = [
          {
            loginId:
              cleanLower,
          },
          {
            email:
              cleanLower,
          },
          {
            phone:
              rawInput,
          },
          {
            enrollmentNo:
              cleanLower.toUpperCase(),
          },
        ];

      if (
        cleanDigits.length >=
        10
      ) {
        studentSearchConditions.push(
          {
            phone: {
              $regex:
                cleanDigits.slice(
                  -10,
                ) + "$",
            },
          },
        );
      }

      const student =
        await Student.findOne({
          $or:
            studentSearchConditions,
          status: "active",
        }).select(
          "+loginPassword",
        );

      if (
        !student ||
        !student.loginPassword
      ) {
        await failedLogin(
          req,
          rawInput,
          "institute",
          null,
          "invalid_credentials",
          false,
        );

        res.status(401).json({
          error:
            "Invalid credentials",
        });

        return;
      }

      const match =
        await bcrypt.compare(
          password,
          student.loginPassword,
        );

      if (!match) {
        await failedLogin(
          req,
          rawInput,
          "institute",
          null,
          "invalid_credentials",
          false,
        );

        res.status(401).json({
          error:
            "Invalid credentials",
        });

        return;
      }

      const issued =
        await createLoginSession(
          req,
          res,
          {
            userId: String(
              student._id,
            ),
            email:
              student.email ??
              "",
            role: "student",
            instituteId:
              String(
                student.instituteId,
              ),
            principalType:
              "student",
          },
          {
            _id: student._id,
            email:
              student.email ??
              "",
            role: "student",
          },
          "institute",
        );

      if (!issued) return;
      res.json({
        token:
          issued.accessToken,

        user: {
          id: String(
            student._id,
          ),
          name:
            student.name,
          email:
            student.email ??
            "",
          loginId:
            student.loginId ??
            "",
          role: "student",
          instituteId:
            String(
              student.instituteId,
            ),
          enrollmentNo:
            student.enrollmentNo,
          courseId:
            student.courseId
              ? String(
                  student.courseId,
                )
              : null,
          batchId:
            student.batchId
              ? String(
                  student.batchId,
                )
              : null,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        error:
          "Unable to sign in.",
      });
    }
  },
);

// ============================================================
// UPDATE CURRENT LOGGED-IN PROFILE
// ============================================================

router.patch(
  "/auth/me",
  authenticate,
  async (req, res): Promise<void> => {
    try {
      const userId =
        req.user!.userId;

      const role =
        req.user!.role;

      const platformEmailChanged =
        isPlatformRole(role) &&
        typeof req.body.email ===
          "string" &&
        String(
          req.body.email,
        )
          .toLowerCase()
          .trim() !==
          req.user!.email;

      const updateData: any =
        {};

      let passwordChanged =
        false;

      if (
        req.body.name !==
        undefined
      ) {
        updateData.name =
          String(
            req.body.name,
          ).trim();
      }

      if (
        req.body.email !==
        undefined
      ) {
        updateData.email =
          String(
            req.body.email,
          )
            .toLowerCase()
            .trim();

        if (
          platformEmailChanged
        ) {
          updateData.emailVerifiedAt =
            null;
        }
      }

      if (
        req.body.phone !==
        undefined
      ) {
        updateData.phone =
          String(
            req.body.phone,
          ).trim();
      }

      if (
        req.body.businessAddress !==
        undefined
      ) {
        updateData.businessAddress =
          String(
            req.body.businessAddress,
          ).trim();
      }

      if (
        req.body.businessType !==
        undefined
      ) {
        updateData.businessType =
          String(
            req.body.businessType,
          ).trim();
      }

      if (
        req.body.promoCode !==
        undefined
      ) {
        updateData.promoCode =
          String(
            req.body.promoCode,
          ).trim();
      }

      if (
        req.body.logoDataUrl !==
        undefined
      ) {
        updateData.logoDataUrl =
          String(
            req.body.logoDataUrl,
          );
      }

      if (
        req.body.password &&
        String(
          req.body.password,
        ).trim().length > 0
      ) {
        const plainPassword =
          String(
            req.body.password,
          ).trim();

        if (
          isPlatformRole(role)
        ) {
          const issue =
            safePasswordIssue(
              plainPassword,
            );

          if (issue) {
            res.status(400).json({
              error: issue,
            });

            return;
          }

          const currentPassword =
            typeof req.body
              .currentPassword ===
            "string"
              ? req.body
                  .currentPassword
              : "";

          const currentAccount =
            await User.findById(
              userId,
            ).select(
              "+password email role",
            );

          if (
            !currentAccount ||
            !currentPassword ||
            !await bcrypt.compare(
              currentPassword,
              currentAccount.password,
            )
          ) {
            await recordSecurityEvent(
              req,
              "password_change",
              "failure",
              {
                reason:
                  "invalid_current_password",
              },
              {
                userId,
                email:
                  req.user!.email,
                role,
                sessionId:
                  req.user!
                    .sessionId,
                scope:
                  "platform",
              },
            );

            res.status(403).json({
              error:
                "Current password is incorrect.",
            });

            return;
          }

          if (
            await bcrypt.compare(
              plainPassword,
              currentAccount.password,
            )
          ) {
            res.status(400).json({
              error:
                "Choose a password you have not used before.",
            });

            return;
          }

          updateData.password =
            await bcrypt.hash(
              plainPassword,
              12,
            );

          passwordChanged = true;
        } else {
          if (
            plainPassword.length <
            6
          ) {
            res.status(400).json({
              error:
                "Password minimum 6 characters hona chahiye.",
            });

            return;
          }

          if (
            role ===
            "student"
          ) {
            updateData.loginPassword =
              await bcrypt.hash(
                plainPassword,
                10,
              );
          } else {
            updateData.password =
              await bcrypt.hash(
                plainPassword,
                10,
              );
          }

          passwordChanged = true;
        }
      }

      if (
        role ===
        "student"
      ) {
        const student =
          await Student.findByIdAndUpdate(
            userId,
            updateData,
            {
              returnDocument: "after",
              runValidators: true,
            },
          ).select(
            "-loginPassword",
          );

        if (!student) {
          res.status(404).json({
            error:
              "Student not found",
          });

          return;
        }

        if (passwordChanged) {
          await UserSession.updateMany(
            {
              userId,
              principalType:
                "student",
              revokedAt: null,
              ...(req.user!
                .sessionId
                ? {
                    _id: {
                      $ne: req
                        .user!
                        .sessionId,
                    },
                  }
                : {}),
            },
            {
              $set: {
                revokedAt:
                  new Date(),
              },
            },
          );

          await recordAudit(
            req,
            "auth.password_change",
            "student",
            userId,
          );
        }

        res.json({
          id: String(
            student._id,
          ),
          name:
            student.name,
          email:
            student.email ??
            "",
          phone:
            student.phone ??
            "",
          role: "student",
          instituteId:
            String(
              student.instituteId,
            ),
        });

        return;
      }

      const user =
        await User.findByIdAndUpdate(
          userId,
          updateData,
          {
            returnDocument: "after",
            runValidators: true,
          },
        ).select("-password");

      if (!user) {
        res.status(404).json({
          error:
            "User not found",
        });

        return;
      }

      if (
        passwordChanged ||
        platformEmailChanged
      ) {
        await UserSession.updateMany(
          {
            userId,
            principalType:
              "user",
            revokedAt: null,
            ...(req.user!
              .sessionId
              ? {
                  _id: {
                    $ne: req
                      .user!
                      .sessionId,
                  },
                }
              : {}),
          },
          {
            $set: {
              revokedAt:
                new Date(),
              revokeReason:
                passwordChanged
                  ? "password_change"
                  : "email_change",
            },
          },
        );

        if (passwordChanged) {
          await recordAudit(
            req,
            "auth.password_change",
            "user",
            userId,
          );
        }

        if (
          isPlatformRole(
            role,
          )
        ) {
          await recordSecurityEvent(
            req,
            passwordChanged
              ? "password_change"
              : "account_email_change",
            "success",
            {
              changedFields:
                [
                  passwordChanged
                    ? "password"
                    : null,
                  platformEmailChanged
                    ? "email"
                    : null,
                ].filter(
                  Boolean,
                ),
            },
            {
              userId,
              email:
                user.email,
              role,
              sessionId:
                req.user!
                  .sessionId,
              scope:
                "platform",
            },
          );
        }
      }

      res.json({
        id: String(
          user._id,
        ),
        name:
          user.name,
        email:
          user.email,
        loginId:
          user.loginId ??
          "",
        phone:
          (user as any)
            .phone ?? "",
        businessAddress:
          (user as any)
            .businessAddress ??
          "",
        businessType:
          (user as any)
            .businessType ??
          "",
        promoCode:
          (user as any)
            .promoCode ??
          "",
        logoDataUrl:
          (user as any)
            .logoDataUrl ??
          "",
        role:
          user.role,
        instituteId:
          user.instituteId
            ? String(
                user.instituteId,
              )
            : null,
        activeBranchId:
          user.activeBranchId
            ? String(
                user.activeBranchId,
              )
            : null,
        customRoleId:
          user.customRoleId
            ? String(
                user.customRoleId,
              )
            : null,
        isApproved:
          user.isApproved,
        createdAt:
          user.createdAt,
      });
    } catch (error: any) {
      res.status(500).json({
        error:
          error?.message ??
          "Profile update nahi hua.",
      });
    }
  },
);

export default router;
