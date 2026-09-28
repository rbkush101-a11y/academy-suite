import mongoose, { Document, Schema } from "mongoose";

export interface IHomeworkSubmission extends Document {
  homeworkId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  instituteId: mongoose.Types.ObjectId;
  fileUrl?: string;
  note?: string;
  status: "Submitted" | "Graded" | "Late";
  marksObtained?: number;
  gradeBadge?: string;
  submittedAt: Date;
  gradedAt?: Date;
  gradedBy?: mongoose.Types.ObjectId;
}

const homeworkSubmissionSchema = new Schema<IHomeworkSubmission>(
  {
    homeworkId: { type: Schema.Types.ObjectId, ref: "Homework", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    instituteId: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
    fileUrl: { type: String, default: "" },
    note: { type: String, default: "" },
    status: { type: String, enum: ["Submitted", "Graded", "Late"], default: "Submitted" },
    marksObtained: { type: Number, min: 0 },
    gradeBadge: { type: String, default: "" },
    submittedAt: { type: Date, default: Date.now },
    gradedAt: { type: Date },
    gradedBy: { type: Schema.Types.ObjectId, ref: "Staff" },
  },
  { timestamps: true }
);

homeworkSubmissionSchema.index({ homeworkId: 1, studentId: 1 }, { unique: true });

export const HomeworkSubmission = mongoose.model<IHomeworkSubmission>(
  "HomeworkSubmission",
  homeworkSubmissionSchema
);
