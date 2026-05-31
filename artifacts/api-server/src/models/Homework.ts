import mongoose, { Document, Schema } from "mongoose";

export interface IHomework extends Document {
  title: string;
  description: string;
  batchId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  assignedBy?: mongoose.Types.ObjectId;
  dueDate: string;
  fileUrl?: string;
  status: "active" | "completed";
  createdAt: Date;
}

const homeworkSchema = new Schema<IHomework>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: "Staff" },
    dueDate: { type: String, required: true },
    fileUrl: { type: String },
    status: { type: String, enum: ["active", "completed"], default: "active" },
  },
  { timestamps: true }
);

export const Homework = mongoose.model<IHomework>("Homework", homeworkSchema);
