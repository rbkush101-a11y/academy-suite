import mongoose, { Document, Schema } from "mongoose";

// ============================================================
// 1. FEE STRUCTURE (Course-wise fee template)
// ============================================================
export interface IFeeStructure extends Document {
  name: string;
  instituteId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  amount: number;
  frequency: "monthly" | "quarterly" | "half-yearly" | "annually" | "one-time";  
  lateFeePerDay: number;
  dueDay: number; // Default day (fallback)
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// 2. STUDENT FEE ASSIGNMENT (Individual student ka fee cycle)
// ============================================================
export interface IStudentFeeAssignment extends Document {
  instituteId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  feeStructureId: mongoose.Types.ObjectId;
  admissionDate: string;          // "2025-09-13"
  feeCycleDay: number;             // 13 (from admissionDate)
  monthlyAmount: number;
  scholarshipPercent: number;
  totalMonths: number;             // Course duration in months
  startMonth: string;              // "2025-10" (first billing month)
  endMonth: string;                // "2026-09" (last billing month)
  status: "active" | "completed" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// 3. PAYMENT (Monthly bill / receipt)
// ============================================================
export interface IPayment extends Document {
  instituteId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  feeStructureId: mongoose.Types.ObjectId;
  assignmentId?: mongoose.Types.ObjectId;
  originalAmount: number;
  scholarshipPercent: number;
  scholarshipAmount: number;
  amount: number;
  lateFee: number;
  totalAmount: number;
  paidAmount: number;
  dueDate: string;
  paidDate?: string;
  status: "pending" | "paid" | "overdue" | "partial";
  month: string;                   // "2025-10"
  monthLabel: string;              // "Oct 2025"
  installment?: "I" | "II" | "III";
  paymentMethod?: "cash" | "online" | "cheque" | "upi";
  transactionId?: string;
  receiptNo?: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// 4. EXPENSE (Academy ka kharcha)
// ============================================================
export interface IExpense extends Document {
  instituteId: mongoose.Types.ObjectId;
  category: "rent" | "electricity" | "internet" | "supplies" | "maintenance" | "marketing" | "salary" | "other";
  title: string;
  amount: number;
  date: string;
  paymentMethod: "cash" | "online" | "cheque" | "upi";
  vendor?: string;
  invoiceNo?: string;
  recurring: boolean;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ------------------ SCHEMAS ------------------
const feeStructureSchema = new Schema<IFeeStructure>(
  {
    name: { type: String, required: true },
    instituteId: { type: Schema.Types.ObjectId, ref: "Institute", required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    amount: { type: Number, required: true },
    frequency: {
      type: String,
      enum: ["monthly", "quarterly", "half-yearly", "annually", "one-time"],
      required: true,
    },
    lateFeePerDay: { type: Number, required: true, default: 0 },
    dueDay: { type: Number, required: true, default: 10 },
  },
  { timestamps: true }
);

const studentFeeAssignmentSchema = new Schema<IStudentFeeAssignment>(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: "Institute", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    feeStructureId: { type: Schema.Types.ObjectId, ref: "FeeStructure", required: true },
    admissionDate: { type: String, required: true },
    feeCycleDay: { type: Number, required: true, min: 1, max: 31 },
    monthlyAmount: { type: Number, required: true },
    scholarshipPercent: { type: Number, default: 0, min: 0, max: 100 },
    totalMonths: { type: Number, required: true, default: 12 },
    startMonth: { type: String, required: true },
    endMonth: { type: String, required: true },
    status: { type: String, enum: ["active", "completed", "cancelled"], default: "active" },
  },
  { timestamps: true }
);

studentFeeAssignmentSchema.index({ studentId: 1, feeStructureId: 1 }, { unique: true });

const paymentSchema = new Schema<IPayment>(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: "Institute", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    feeStructureId: { type: Schema.Types.ObjectId, ref: "FeeStructure", required: true },
    assignmentId: { type: Schema.Types.ObjectId, ref: "StudentFeeAssignment" },
    originalAmount: { type: Number, required: true },
    scholarshipPercent: { type: Number, default: 0, min: 0, max: 100 },
    scholarshipAmount: { type: Number, default: 0 },
    amount: { type: Number, required: true },
    lateFee: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    dueDate: { type: String, required: true },
    paidDate: { type: String },
    status: {
      type: String,
      enum: ["pending", "paid", "overdue", "partial"],
      default: "pending",
    },
    month: { type: String, required: true },
    monthLabel: { type: String, required: true },
    installment: { type: String, enum: ["I", "II", "III"] },
    paymentMethod: { type: String, enum: ["cash", "online", "cheque", "upi"] },
    transactionId: { type: String, trim: true },
    receiptNo: { type: String, unique: true, sparse: true },
    remarks: { type: String, trim: true },
  },
  { timestamps: true }
);

paymentSchema.index({ studentId: 1, month: 1 });
paymentSchema.index({ instituteId: 1, status: 1 });

paymentSchema.pre("save", function () {
  if (!this.receiptNo) {
    this.receiptNo = "RCP-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
  }
  this.totalAmount = this.amount + (this.lateFee ?? 0);
});

const expenseSchema = new Schema<IExpense>(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: "Institute", required: true },
    category: {
      type: String,
      enum: ["rent", "electricity", "internet", "supplies", "maintenance", "marketing", "salary", "other"],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: String, required: true },
    paymentMethod: { type: String, enum: ["cash", "online", "cheque", "upi"], required: true },
    vendor: { type: String, trim: true },
    invoiceNo: { type: String, trim: true },
    recurring: { type: Boolean, default: false },
    remarks: { type: String, trim: true },
  },
  { timestamps: true }
);

// ------------------ EXPORTS ------------------
export const FeeStructure = mongoose.model<IFeeStructure>("FeeStructure", feeStructureSchema);
export const StudentFeeAssignment = mongoose.model<IStudentFeeAssignment>("StudentFeeAssignment", studentFeeAssignmentSchema);
export const Payment = mongoose.model<IPayment>("Payment", paymentSchema);
export const Expense = mongoose.model<IExpense>("Expense", expenseSchema);