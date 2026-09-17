import mongoose, { Document, Schema } from "mongoose";

export interface IStudentEditLog extends Document {
  studentId: mongoose.Types.ObjectId;
  studentName: string;
  instituteId?: mongoose.Types.ObjectId;
  fieldName: string;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
  editedBy: string;
  status: "pending" | "approved" | "rejected" | "auto-approved";
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const studentEditLogSchema = new Schema<IStudentEditLog>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    studentName: { type: String, required: true },
    instituteId: { type: Schema.Types.ObjectId, ref: "Institute", required: false, index: true },
    fieldName: { type: String, required: true },
    fieldLabel: { type: String, required: true },
    oldValue: { type: String, default: "" },
    newValue: { type: String, default: "" },
    editedBy: { type: String, enum: ["student", "admin"], default: "student" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "auto-approved"],
      default: "auto-approved",
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNote: { type: String },
  },
  { timestamps: true }
);

export const StudentEditLog = mongoose.model<IStudentEditLog>(
  "StudentEditLog",
  studentEditLogSchema
);