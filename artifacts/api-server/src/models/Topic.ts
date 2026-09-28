import mongoose, { Document, Schema } from "mongoose";

export interface ITopic extends Document {
  name: string;
  code?: string;
  description?: string;
  courseId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  status: "Active" | "Inactive";
  createdAt: Date;
  updatedAt: Date;
}

const topicSchema = new Schema<ITopic>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    description: { type: String, trim: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true, index: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

topicSchema.index({ courseId: 1, subjectId: 1, name: 1 });

export const Topic = mongoose.model<ITopic>("Topic", topicSchema);
