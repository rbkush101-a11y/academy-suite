import mongoose, { Document, Schema, Types } from "mongoose";

export type StudentLeaveStatus = "pending" | "approved" | "rejected";

export interface IStudentLeave extends Document {
  instituteId: Types.ObjectId;
  studentId: Types.ObjectId;
  parentUserId: Types.ObjectId;
  fromDate: string;
  toDate: string;
  reason: string;
  status: StudentLeaveStatus;
  adminRemark?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const studentLeaveSchema = new Schema<IStudentLeave>(
  {
    instituteId: {
      type: Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    parentUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fromDate: { type: String, required: true, trim: true },
    toDate: { type: String, required: true, trim: true },
    reason: { type: String, required: true, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    adminRemark: { type: String, trim: true, default: "", maxlength: 1000 },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
);

studentLeaveSchema.index({ instituteId: 1, studentId: 1, createdAt: -1 });
studentLeaveSchema.index({ instituteId: 1, status: 1, createdAt: -1 });

export const StudentLeave =
  mongoose.models.StudentLeave ||
  mongoose.model<IStudentLeave>("StudentLeave", studentLeaveSchema);
