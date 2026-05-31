import mongoose, { Document, Schema } from "mongoose";

export interface IFeeStructure extends Document {
  name: string;
  courseId: mongoose.Types.ObjectId;
  amount: number;
  frequency: "monthly" | "quarterly" | "annually" | "one-time";
  lateFeePerDay: number;
  dueDay: number;
  createdAt: Date;
}

export interface IPayment extends Document {
  studentId: mongoose.Types.ObjectId;
  feeStructureId: mongoose.Types.ObjectId;
  amount: number;
  lateFee: number;
  totalAmount: number;
  dueDate: string;
  paidDate?: string;
  status: "pending" | "paid" | "overdue" | "partial";
  month: string;
  paymentMethod?: "cash" | "online" | "cheque" | "upi";
  receiptNo?: string;
  createdAt: Date;
}

const feeStructureSchema = new Schema<IFeeStructure>(
  {
    name: { type: String, required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    amount: { type: Number, required: true },
    frequency: { type: String, enum: ["monthly", "quarterly", "annually", "one-time"], required: true },
    lateFeePerDay: { type: Number, required: true, default: 0 },
    dueDay: { type: Number, required: true, default: 10 },
  },
  { timestamps: true }
);

const paymentSchema = new Schema<IPayment>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    feeStructureId: { type: Schema.Types.ObjectId, ref: "FeeStructure", required: true },
    amount: { type: Number, required: true },
    lateFee: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    dueDate: { type: String, required: true },
    paidDate: { type: String },
    status: { type: String, enum: ["pending", "paid", "overdue", "partial"], default: "pending" },
    month: { type: String, required: true },
    paymentMethod: { type: String, enum: ["cash", "online", "cheque", "upi"] },
    receiptNo: { type: String },
  },
  { timestamps: true }
);

paymentSchema.pre("save", function (this: IPayment, next: () => void) {
  if (!this.receiptNo) {
    this.receiptNo = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
  this.totalAmount = this.amount + (this.lateFee ?? 0);
  next();
});

export const FeeStructure = mongoose.model<IFeeStructure>("FeeStructure", feeStructureSchema);
export const Payment = mongoose.model<IPayment>("Payment", paymentSchema);
