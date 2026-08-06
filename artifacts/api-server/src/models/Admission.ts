import mongoose, { Document, Schema } from "mongoose";

export interface IAdmission extends Document {
  enquiryType: "academic" | "computer";
  studentName: string;
  className?: string;
  board?: string;
  phone: string;
  source?: "website" | "referral" | "social-media" | "walk-in" | "other";
  status: "new" | "contacted" | "visited" | "enrolled" | "dropped";
  remarks?: string;
  parentName?: string;
  email?: string;
  courseInterest?: string;
  followUpDate?: string;
  enquiryDate?: string;
  enquiryDay?: string;
  createdAt: Date;
}

const admissionSchema = new Schema<IAdmission>(
  {
    enquiryType: {
      type: String,
      enum: ["academic", "computer"],
      default: "academic",
      required: true,
    },
    studentName: { type: String, required: true, trim: true },
    className: { type: String, trim: true, default: "" },
    board: { type: String, trim: true, default: "" },
    phone: { type: String, required: true, trim: true },
    source: {
      type: String,
      enum: ["website", "referral", "social-media", "walk-in", "other"],
      default: "walk-in",
    },
    status: {
      type: String,
      enum: ["new", "contacted", "visited", "enrolled", "dropped"],
      default: "new",
    },
    remarks: { type: String, default: "" },
    parentName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    courseInterest: { type: String, trim: true, default: "" },
    followUpDate: { type: String },
    enquiryDate: { type: String },
    enquiryDay: { type: String },
  },
  { timestamps: true }
);

export const Admission = mongoose.model<IAdmission>("Admission", admissionSchema);
