import mongoose, { Document, Schema } from "mongoose";

export interface IStudentAttendance extends Document {
  studentId: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  date: string;
  status: "present" | "absent" | "late";
  remarks?: string;
  createdAt: Date;
}

export interface IStaffAttendance extends Document {
  staffId: mongoose.Types.ObjectId;
  date: string;
  status: "present" | "absent" | "leave";
  checkIn?: string;
  checkOut?: string;
  remarks?: string;
  createdAt: Date;
}

const studentAttendanceSchema = new Schema<IStudentAttendance>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    date: { type: String, required: true },
    status: { type: String, enum: ["present", "absent", "late"], required: true },
    remarks: { type: String },
  },
  { timestamps: true }
);

studentAttendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

const staffAttendanceSchema = new Schema<IStaffAttendance>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    date: { type: String, required: true },
    status: { type: String, enum: ["present", "absent", "leave"], required: true },
    checkIn: { type: String },
    checkOut: { type: String },
    remarks: { type: String },
  },
  { timestamps: true }
);

staffAttendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });

export const StudentAttendance = mongoose.model<IStudentAttendance>("StudentAttendance", studentAttendanceSchema);
export const StaffAttendance = mongoose.model<IStaffAttendance>("StaffAttendance", staffAttendanceSchema);
