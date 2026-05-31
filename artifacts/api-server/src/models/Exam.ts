import mongoose, { Document, Schema } from "mongoose";

export interface IExam extends Document {
  name: string;
  type: "unit-test" | "mid-term" | "final" | "mock";
  batchId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  date: string;
  totalMarks: number;
  passingMarks: number;
  duration?: number;
  status: "scheduled" | "ongoing" | "completed";
  createdAt: Date;
}

export interface IExamMark extends Document {
  examId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  marksObtained: number;
  grade: string;
  remarks?: string;
  createdAt: Date;
}

const examSchema = new Schema<IExam>(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ["unit-test", "mid-term", "final", "mock"], default: "unit-test" },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    date: { type: String, required: true },
    totalMarks: { type: Number, required: true },
    passingMarks: { type: Number, required: true },
    duration: { type: Number },
    status: { type: String, enum: ["scheduled", "ongoing", "completed"], default: "scheduled" },
  },
  { timestamps: true }
);

const examMarkSchema = new Schema<IExamMark>(
  {
    examId: { type: Schema.Types.ObjectId, ref: "Exam", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    marksObtained: { type: Number, required: true },
    grade: { type: String, required: true },
    remarks: { type: String },
  },
  { timestamps: true }
);

examMarkSchema.index({ examId: 1, studentId: 1 }, { unique: true });

function calculateGrade(obtained: number, total: number): string {
  const pct = (obtained / total) * 100;
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
}

export { calculateGrade };

export const Exam = mongoose.model<IExam>("Exam", examSchema);
export const ExamMark = mongoose.model<IExamMark>("ExamMark", examMarkSchema);
