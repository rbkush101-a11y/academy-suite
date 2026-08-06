import mongoose, { Document, Schema } from "mongoose";

export type ExamType =
  | "weekly-test"
  | "monthly-test"
  | "unit-test"
  | "half-yearly"
  | "annual"
  | "practice-test"
  | "scholarship-test"
  | "mid-term"
  | "final"
  | "mock";

export interface IExamSeries extends Document {
  title: string;
  type: ExamType;
  batchId: mongoose.Types.ObjectId;
  testDate: string;
  status: "scheduled" | "ongoing" | "completed";
  instructions?: string;
  createdAt: Date;
}

export interface IExam extends Document {
  name: string;
  type: ExamType;
  seriesId?: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  date: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  totalMarks: number;
  passingMarks: number;
  room?: string;
  instructions?: string;
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

const types: ExamType[] = [
  "weekly-test", "monthly-test", "unit-test", "half-yearly", "annual",
  "practice-test", "scholarship-test", "mid-term", "final", "mock",
];

const examSeriesSchema = new Schema<IExamSeries>(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: types, default: "weekly-test" },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    testDate: { type: String, required: true },
    status: { type: String, enum: ["scheduled", "ongoing", "completed"], default: "scheduled" },
    instructions: { type: String, default: "" },
  },
  { timestamps: true }
);

const examSchema = new Schema<IExam>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: types, default: "unit-test" },
    seriesId: { type: Schema.Types.ObjectId, ref: "ExamSeries", default: null },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    date: { type: String, required: true },
    startTime: { type: String, default: "" },
    endTime: { type: String, default: "" },
    duration: { type: Number },
    totalMarks: { type: Number, required: true, min: 1 },
    passingMarks: { type: Number, required: true, min: 0 },
    room: { type: String, default: "" },
    instructions: { type: String, default: "" },
    status: { type: String, enum: ["scheduled", "ongoing", "completed"], default: "scheduled" },
  },
  { timestamps: true }
);

const examMarkSchema = new Schema<IExamMark>(
  {
    examId: { type: Schema.Types.ObjectId, ref: "Exam", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    marksObtained: { type: Number, required: true, min: 0 },
    grade: { type: String, required: true },
    remarks: { type: String, default: "" },
  },
  { timestamps: true }
);

examSeriesSchema.index({ batchId: 1, testDate: -1 });
examSchema.index({ seriesId: 1, subjectId: 1 });
examMarkSchema.index({ examId: 1, studentId: 1 }, { unique: true });

export function calculateGrade(obtained: number, total: number): string {
  const percent = total > 0 ? (obtained / total) * 100 : 0;
  if (percent >= 90) return "A+";
  if (percent >= 80) return "A";
  if (percent >= 70) return "B";
  if (percent >= 60) return "C";
  if (percent >= 50) return "D";
  return "F";
}

export const ExamSeries = mongoose.model<IExamSeries>("ExamSeries", examSeriesSchema);
export const Exam = mongoose.model<IExam>("Exam", examSchema);
export const ExamMark = mongoose.model<IExamMark>("ExamMark", examMarkSchema);
