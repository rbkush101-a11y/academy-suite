import mongoose, { Document, Schema } from "mongoose";

export interface IStudent extends Document {
  name: string;
  email: string;
  phone: string;
  enrollmentNo: string;
  batchId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  status: "active" | "inactive" | "graduated";
  academicYear: string;
  parentName?: string;
  parentPhone?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  createdAt: Date;
}

const studentSchema = new Schema<IStudent>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },
    enrollmentNo: { type: String, unique: true },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    status: { type: String, enum: ["active", "inactive", "graduated"], default: "active" },
    academicYear: { type: String, required: true },
    parentName: { type: String },
    parentPhone: { type: String },
    address: { type: String },
    dateOfBirth: { type: String },
    gender: { type: String, enum: ["male", "female", "other"] },
  },
  { timestamps: true }
);

studentSchema.pre("save", async function (this: IStudent & { _id: unknown }, next: () => void) {
  if (!this.enrollmentNo) {
    const count = await Student.countDocuments();
    this.enrollmentNo = `STU${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

export const Student = mongoose.model<IStudent>("Student", studentSchema);
