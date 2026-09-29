import mongoose, { Document, Schema } from "mongoose";

export interface IHomework extends Document {
  instituteId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  batchId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  assignedBy?: mongoose.Types.ObjectId;
  dueDate: string;
  fileUrl?: string;
  status: "active" | "completed";
  createdAt: Date;
  updatedAt: Date;
}

const homeworkSchema = new Schema<IHomework>(
  {
    instituteId: {
      type: Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    batchId: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },

    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },

    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      index: true,
    },

    dueDate: {
      type: String,
      required: true,
      trim: true,
    },

    fileUrl: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

/**
 * Tenant-aware indexes
 */
homeworkSchema.index({
  instituteId: 1,
  createdAt: -1,
});

homeworkSchema.index({
  instituteId: 1,
  batchId: 1,
  createdAt: -1,
});

homeworkSchema.index({
  instituteId: 1,
  subjectId: 1,
  createdAt: -1,
});

homeworkSchema.index({
  instituteId: 1,
  status: 1,
  createdAt: -1,
});

export const Homework = mongoose.model<IHomework>(
  "Homework",
  homeworkSchema,
);