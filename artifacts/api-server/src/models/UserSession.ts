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
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null, index: true },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const UserSession = mongoose.model<IUserSession>("UserSession", userSessionSchema);
