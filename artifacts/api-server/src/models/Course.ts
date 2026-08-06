import mongoose, { Document, Schema } from "mongoose";

export interface ICourse extends Document {
  name: string;
  instituteId: mongoose.Types.ObjectId;
  description: string;
  duration: string;
  fees: number;
  courseType: "academic" | "computer";
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<ICourse>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    instituteId: {
      type: Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: String,
      required: true,
      trim: true,
    },
    fees: {
      type: Number,
      required: true,
      min: 0,
    },
    courseType: {
      type: String,
      enum: ["academic", "computer"],
      required: true,
      default: "academic",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

export const Course = mongoose.model<ICourse>("Course", courseSchema);
