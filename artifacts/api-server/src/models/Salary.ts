import mongoose, { Document, Schema } from "mongoose";

// ============================================================
// 1. STAFF SALARY ASSIGNMENT (Har staff ka salary cycle)
// ============================================================
export interface IStaffSalaryAssignment extends Document {
  instituteId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  joinDate: string;                // "2025-09-15"
  salaryCycleDay: number;          // 15 (from joinDate)
  basicSalary: number;
  allowances: number;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// 2. SALARY (Monthly salary record)
// ============================================================
export interface ISalary extends Document {
  instituteId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  assignmentId?: mongoose.Types.ObjectId;
  month: string;                   // "2025-10"
  monthLabel: string;              // "Oct 2025"
  basicSalary: number;
  allowances: number;
  bonus: number;
  deductions: number;
  netSalary: number;
  dueDate: string;
  paidDate?: string;
  status: "pending" | "paid" | "overdue";
  paymentMethod?: "cash" | "online" | "cheque" | "upi";
  transactionId?: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ------------------ SCHEMAS ------------------
const staffSalaryAssignmentSchema = new Schema<IStaffSalaryAssignment>(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: "Institute", required: true },
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true, unique: true },
    joinDate: { type: String, required: true },
    salaryCycleDay: { type: Number, required: true, min: 1, max: 31 },
    basicSalary: { type: Number, required: true, min: 0 },
    allowances: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

const salarySchema = new Schema<ISalary>(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: "Institute", required: true },
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    assignmentId: { type: Schema.Types.ObjectId, ref: "StaffSalaryAssignment" },
    month: { type: String, required: true },
    monthLabel: { type: String, required: true },
    basicSalary: { type: Number, required: true },
    allowances: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    netSalary: { type: Number, required: false },
    dueDate: { type: String, required: true },
    paidDate: { type: String },
    status: { type: String, enum: ["pending", "paid", "overdue"], default: "pending" },
    paymentMethod: { type: String, enum: ["cash", "online", "cheque", "upi"] },
    transactionId: { type: String, trim: true },
    remarks: { type: String, trim: true },
  },
  { timestamps: true }
);

salarySchema.index({ staffId: 1, month: 1 }, { unique: true });

salarySchema.pre("save", function (this: ISalary, next: () => void) {
  this.netSalary =
    this.basicSalary + (this.allowances ?? 0) + (this.bonus ?? 0) - (this.deductions ?? 0);
  next();
});

// ------------------ EXPORTS ------------------
export const StaffSalaryAssignment = mongoose.model<IStaffSalaryAssignment>(
  "StaffSalaryAssignment",
  staffSalaryAssignmentSchema
);
export const Salary = mongoose.model<ISalary>("Salary", salarySchema);