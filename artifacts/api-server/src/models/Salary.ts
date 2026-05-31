import mongoose, { Document, Schema } from "mongoose";

export interface ISalary extends Document {
  staffId: mongoose.Types.ObjectId;
  month: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  paidDate?: string;
  status: "pending" | "paid";
  paymentMethod?: string;
  createdAt: Date;
}

const salarySchema = new Schema<ISalary>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    month: { type: String, required: true },
    basicSalary: { type: Number, required: true },
    allowances: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    netSalary: { type: Number, required: false },
    paidDate: { type: String },
    status: { type: String, enum: ["pending", "paid"], default: "pending" },
    paymentMethod: { type: String },
  },
  { timestamps: true }
);

salarySchema.pre("save", function (next) {
  this.netSalary = this.basicSalary + (this.allowances ?? 0) - (this.deductions ?? 0);
  next();
});

export const Salary = mongoose.model<ISalary>("Salary", salarySchema);
