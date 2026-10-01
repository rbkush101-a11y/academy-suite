import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IAuthSecurityEvent extends Document {
  scope: "platform" | "institute";
  userId?: string;
  email?: string;
  role?: string;
  sessionId?: string;
  event: string;
  outcome: "success" | "failure" | "info";
  ipAddress: string;
  userAgent: string;
  deviceName: string;
  details: Record<string, unknown>;
  createdAt: Date;
}

const securityEventSchema = new Schema<IAuthSecurityEvent>({
  scope: { type: String, enum: ["platform", "institute"], required: true, index: true },
  userId: { type: String, index: true },
  email: { type: String, trim: true, lowercase: true, default: "" },
  role: { type: String, default: "" },
  sessionId: { type: String, default: "" },
  event: { type: String, required: true, index: true },
  outcome: { type: String, enum: ["success", "failure", "info"], required: true },
  ipAddress: { type: String, default: "" },
  userAgent: { type: String, default: "" },
  deviceName: { type: String, default: "Unknown device" },
  details: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: true, updatedAt: false } });

securityEventSchema.index({ scope: 1, createdAt: -1 });
securityEventSchema.index({ userId: 1, createdAt: -1 });
securityEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });

export interface ILoginThrottle extends Document {
  keyHash: string;
  failureCount: number;
  windowStartedAt: Date;
  lockedUntil?: Date;
  expiresAt: Date;
}

const loginThrottleSchema = new Schema<ILoginThrottle>({
  keyHash: { type: String, required: true, unique: true, select: false },
  failureCount: { type: Number, required: true, default: 0 },
  windowStartedAt: { type: Date, required: true, default: Date.now },
  lockedUntil: { type: Date },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

loginThrottleSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export interface IAuthToken extends Document {
  userId: Types.ObjectId;
  purpose: "password_reset" | "email_verification";
  tokenHash: string;
  expiresAt: Date;
  consumedAt?: Date;
  requestedFromIp: string;
  createdAt: Date;
}

const authTokenSchema = new Schema<IAuthToken>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  purpose: { type: String, enum: ["password_reset", "email_verification"], required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  expiresAt: { type: Date, required: true },
  consumedAt: { type: Date },
  requestedFromIp: { type: String, default: "" },
}, { timestamps: { createdAt: true, updatedAt: false } });

authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
authTokenSchema.index({ userId: 1, purpose: 1, consumedAt: 1 });

export interface IAuthEmailOutbox extends Document {
  to: string;
  purpose: "password_reset" | "email_verification";
  ciphertext: string;
  iv: string;
  authTag: string;
  status: "queued" | "sending" | "retry" | "sent" | "failed";
  attempts: number;
  nextAttemptAt: Date;
  lastError?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const authEmailOutboxSchema = new Schema<IAuthEmailOutbox>({
  to: { type: String, required: true, lowercase: true, trim: true },
  purpose: { type: String, enum: ["password_reset", "email_verification"], required: true },
  ciphertext: { type: String, required: true, select: false },
  iv: { type: String, required: true, select: false },
  authTag: { type: String, required: true, select: false },
  status: { type: String, enum: ["queued", "sending", "retry", "sent", "failed"], default: "queued", index: true },
  attempts: { type: Number, default: 0 },
  nextAttemptAt: { type: Date, required: true, default: Date.now, index: true },
  lastError: { type: String, default: "", maxlength: 500 },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

authEmailOutboxSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
authEmailOutboxSchema.index({ status: 1, nextAttemptAt: 1 });

export const AuthSecurityEvent = mongoose.model<IAuthSecurityEvent>("AuthSecurityEvent", securityEventSchema);
export const LoginThrottle = mongoose.model<ILoginThrottle>("LoginThrottle", loginThrottleSchema);
export const AuthToken = mongoose.model<IAuthToken>("AuthToken", authTokenSchema);
export const AuthEmailOutbox = mongoose.model<IAuthEmailOutbox>("AuthEmailOutbox", authEmailOutboxSchema);
