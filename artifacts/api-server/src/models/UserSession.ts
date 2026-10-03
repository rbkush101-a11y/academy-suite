import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IUserSession extends Document {
  userId: string;
  principalType: "user" | "student";
  instituteId?: Types.ObjectId;
  role: string;
  branchId?: Types.ObjectId;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
  lastSeenAt: Date;
  refreshTokenHash?: string;
  previousRefreshTokenHash?: string;
  refreshRotatedAt?: Date;
  deviceName?: string;
  deviceType?: "desktop" | "mobile" | "tablet" | "unknown";
  lastLoginAt?: Date;
  revokeReason?: string;

  // Temporary read-only "View as Student" support session.
  supportMode?: boolean;
  supportActorId?: string;
  supportActorRole?: string;
  supportReason?: string;
}

const userSessionSchema = new Schema<IUserSession>(
  {
    userId: { type: String, required: true, index: true },
    principalType: { type: String, enum: ["user", "student"], default: "user" },
    instituteId: { type: Schema.Types.ObjectId, ref: "Institute", index: true },
    role: { type: String, required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null, index: true },
    lastSeenAt: { type: Date, default: Date.now },
    refreshTokenHash: { type: String, select: false, sparse: true },
    previousRefreshTokenHash: { type: String, select: false },
    refreshRotatedAt: { type: Date },
    deviceName: { type: String, default: "Unknown device", maxlength: 160 },
    deviceType: { type: String, enum: ["desktop", "mobile", "tablet", "unknown"], default: "unknown" },
    lastLoginAt: { type: Date },
    revokeReason: { type: String, default: "", maxlength: 80 },

    // Support / impersonation metadata. These sessions are created only by
    // institute owners or super-admins and are enforced as read-only by auth middleware.
    supportMode: { type: Boolean, default: false, index: true },
    supportActorId: { type: String, default: "", index: true, maxlength: 64 },
    supportActorRole: { type: String, default: "", maxlength: 64 },
    supportReason: { type: String, default: "", maxlength: 240 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
userSessionSchema.index({ userId: 1, principalType: 1, revokedAt: 1, expiresAt: 1 });
userSessionSchema.index({ supportActorId: 1, supportMode: 1, revokedAt: 1, expiresAt: 1 });

export const UserSession = mongoose.model<IUserSession>("UserSession", userSessionSchema);
