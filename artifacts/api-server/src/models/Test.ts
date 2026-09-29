import mongoose, { Document, Schema } from "mongoose";

export type TestType =
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

export type TestStatus = "scheduled" | "ongoing" | "completed";

export interface ITestSeries extends Document {
  instituteId: mongoose.Types.ObjectId;
  title: string;
  type: TestType;
  batchId: mongoose.Types.ObjectId;
  testDate: string;
  status: TestStatus;
  instructions?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITest extends Document {
  instituteId: mongoose.Types.ObjectId;
  name: string;
  type: TestType;
  seriesId?: mongoose.Types.ObjectId | null;
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
  status: TestStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITestMark extends Document {
  instituteId: mongoose.Types.ObjectId;
  testId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  marksObtained: number;
  grade: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const testTypes: TestType[] = [
  "weekly-test",
  "monthly-test",
  "unit-test",
  "half-yearly",
  "annual",
  "practice-test",
  "scholarship-test",
  "mid-term",
  "final",
  "mock",
];

export const testStatuses: TestStatus[] = [
  "scheduled",
  "ongoing",
  "completed",
];

const testSeriesSchema = new Schema<ITestSeries>(
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
      maxlength: 200,
    },

    type: {
      type: String,
      enum: testTypes,
      default: "weekly-test",
    },

    batchId: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },

    testDate: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: testStatuses,
      default: "scheduled",
    },

    instructions: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
  },
);

const testSchema = new Schema<ITest>(
  {
    instituteId: {
      type: Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    type: {
      type: String,
      enum: testTypes,
      default: "unit-test",
    },

    seriesId: {
      type: Schema.Types.ObjectId,
      ref: "TestSeries",
      default: null,
    },

    batchId: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },

    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    date: {
      type: String,
      required: true,
      trim: true,
    },

    startTime: {
      type: String,
      default: "",
      trim: true,
    },

    endTime: {
      type: String,
      default: "",
      trim: true,
    },

    duration: {
      type: Number,
      min: 1,
    },

    totalMarks: {
      type: Number,
      required: true,
      min: 1,
    },

    passingMarks: {
      type: Number,
      required: true,
      min: 0,
    },

    room: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },

    instructions: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },

    status: {
      type: String,
      enum: testStatuses,
      default: "scheduled",
    },
  },
  {
    timestamps: true,
  },
);

const testMarkSchema = new Schema<ITestMark>(
  {
    instituteId: {
      type: Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true,
    },

    testId: {
      type: Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },

    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    marksObtained: {
      type: Number,
      required: true,
      min: 0,
    },

    grade: {
      type: String,
      required: true,
      trim: true,
    },

    remarks: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
  },
);

/*
 * Tenant-aware indexes
 */

testSeriesSchema.index({
  instituteId: 1,
  batchId: 1,
  testDate: -1,
});

testSeriesSchema.index({
  instituteId: 1,
  status: 1,
});

testSchema.index({
  instituteId: 1,
  batchId: 1,
  date: -1,
});

testSchema.index({
  instituteId: 1,
  seriesId: 1,
  subjectId: 1,
});

testSchema.index({
  instituteId: 1,
  status: 1,
});

testMarkSchema.index(
  {
    instituteId: 1,
    testId: 1,
    studentId: 1,
  },
  {
    unique: true,
  },
);

testMarkSchema.index({
  instituteId: 1,
  studentId: 1,
});

/*
 * Grade calculation
 */

export function calculateGrade(
  obtained: number,
  total: number,
): string {
  const percent = total > 0 ? (obtained / total) * 100 : 0;

  if (percent >= 90) return "A+";
  if (percent >= 80) return "A";
  if (percent >= 70) return "B";
  if (percent >= 60) return "C";
  if (percent >= 50) return "D";

  return "F";
}

export const TestSeries = mongoose.model<ITestSeries>(
  "TestSeries",
  testSeriesSchema,
);

export const Test = mongoose.model<ITest>(
  "Test",
  testSchema,
);

export const TestMark = mongoose.model<ITestMark>(
  "TestMark",
  testMarkSchema,
);