import mongoose, { Document, Schema } from "mongoose";

export interface IFeeStructure extends Document {
  name: string;
  instituteId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  amount: number;
  frequency: "monthly" | "quarterly" | "annually" | "one-time";
  lateFeePerDay: number;
  dueDay: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPayment extends Document {
  instituteId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  feeStructureId: mongoose.Types.ObjectId;
  originalAmount: number;
  scholarshipPercent: number;
  scholarshipAmount: number;
  amount: number;
  lateFee: number;
  totalAmount: number;
  dueDate: string;
  paidDate?: string;
  status: "pending" | "paid" | "overdue" | "partial";
  month: string;
  installment?: "I" | "II" | "III";
  paymentMethod?: "cash" | "online" | "cheque" | "upi";
  receiptNo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const feeStructureSchema = new Schema<IFeeStructure>(
  {
    name: { type: String, required: true },
    instituteId: {
      type: Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    amount: { type: Number, required: true },
    frequency: {
      type: String,
      enum: ["monthly", "quarterly", "annually", "one-time"],
      required: true,
    },
    lateFeePerDay: { type: Number, required: true, default: 0 },
    dueDay: { type: Number, required: true, default: 10 },
  },
  { timestamps: true }
);

const paymentSchema = new Schema<IPayment>(
  {
    instituteId: {
      type: Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    feeStructureId: {
      type: Schema.Types.ObjectId,
      ref: "FeeStructure",
      required: true,
    },
    originalAmount: { type: Number, required: true },
    scholarshipPercent: { type: Number, default: 0, min: 0, max: 100 },
    scholarshipAmount: { type: Number, default: 0 },
    amount: { type: Number, required: true },
    lateFee: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    dueDate: { type: String, required: true },
    paidDate: { type: String },
    status: {
      type: String,
      enum: ["pending", "paid", "overdue", "partial"],
      default: "pending",
    },
    month: { type: String, required: true },
    installment: {
      type: String,
      enum: ["I", "II", "III"],
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "online", "cheque", "upi"],
    },
    receiptNo: { type: String },
  },
  { timestamps: true }
);

paymentSchema.pre("save", function () {
  if (!this.receiptNo) {
    this.receiptNo =
      "RCP-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  }

  this.totalAmount = this.amount + (this.lateFee ?? 0);
});

export const FeeStructure = mongoose.model<IFeeStructure>(
  "FeeStructure",
  feeStructureSchema
);

export const Payment = mongoose.model<IPayment>(
  "Payment",
  paymentSchema
);
