import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IAuditLog extends Document {
  instituteId?: Types.ObjectId;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  branchId?: Types.ObjectId;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: "Institute", index: true },
    actorId: { type: String, default: "" },
    actorEmail: { type: String, default: "" },
    actorRole: { type: String, default: "" },
    action: { type: String, required: true, index: true },
    targetType: { type: String, default: "" },
    targetId: { type: String, default: "" },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    details: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
