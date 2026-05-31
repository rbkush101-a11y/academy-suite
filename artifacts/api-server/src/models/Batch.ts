import mongoose, { Document, Schema } from "mongoose";

export interface IBatch extends Document {
  name: string;
  courseId: mongoose.Types.ObjectId;
  capacity: number;
  schedule: string;
  academicYear: string;
  startDate: string;
  endDate?: string;
  status: "active" | "completed" | "upcoming";
  studentIds: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const batchSchema = new Schema<IBatch>(
  {
    name: { type: String, required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    capacity: { type: Number, required: true },
    schedule: { type: String, required: true },
    academicYear: { type: String, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String },
    status: { type: String, enum: ["active", "completed", "upcoming"], default: "active" },
    studentIds: [{ type: Schema.Types.ObjectId, ref: "Student" }],
  },
  { timestamps: true }
);

export const Batch = mongoose.model<IBatch>("Batch", batchSchema);
