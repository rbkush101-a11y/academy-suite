import mongoose, { Document, Schema } from "mongoose";

export interface ICourse extends Document {
  name: string;
  description: string;
  duration: string;
  fees: number;
  status: "active" | "inactive";
  createdAt: Date;
}

const courseSchema = new Schema<ICourse>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    duration: { type: String, required: true },
    fees: { type: Number, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export const Course = mongoose.model<ICourse>("Course", courseSchema);
