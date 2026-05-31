import mongoose, { Document, Schema } from "mongoose";

export interface IAdmission extends Document {
  studentName: string;
  parentName: string;
  phone: string;
  email: string;
  courseInterest: string;
  source?: "website" | "referral" | "social-media" | "walk-in" | "other";
  status: "new" | "contacted" | "visited" | "enrolled" | "dropped";
  followUpDate?: string;
  remarks?: string;
  createdAt: Date;
}

const admissionSchema = new Schema<IAdmission>(
  {
    studentName: { type: String, required: true },
    parentName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    courseInterest: { type: String, required: true },
    source: { type: String, enum: ["website", "referral", "social-media", "walk-in", "other"] },
    status: { type: String, enum: ["new", "contacted", "visited", "enrolled", "dropped"], default: "new" },
    followUpDate: { type: String },
    remarks: { type: String },
  },
  { timestamps: true }
);

export const Admission = mongoose.model<IAdmission>("Admission", admissionSchema);
