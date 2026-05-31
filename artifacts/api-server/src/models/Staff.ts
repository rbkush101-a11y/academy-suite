import mongoose, { Document, Schema } from "mongoose";

export interface IStaff extends Document {
  name: string;
  email: string;
  phone: string;
  role: "teacher" | "coordinator" | "admin" | "accountant" | "other";
  subject?: string;
  salary: number;
  joinDate: string;
  status: "active" | "inactive";
  address?: string;
  createdAt: Date;
}

const staffSchema = new Schema<IStaff>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },
    role: { type: String, enum: ["teacher", "coordinator", "admin", "accountant", "other"], required: true },
    subject: { type: String },
    salary: { type: Number, required: true },
    joinDate: { type: String, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    address: { type: String },
  },
  { timestamps: true }
);

export const Staff = mongoose.model<IStaff>("Staff", staffSchema);
