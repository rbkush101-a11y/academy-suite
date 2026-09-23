import mongoose, { Schema, Document, Types } from "mongoose";

export interface IStaffDocument {
  label: string;
  name: string;
  dataUrl: string;
  mimeType: string;
}

export interface IStaff extends Document {
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone: string;
  homePhone?: string;
  instituteId?: Types.ObjectId;
  role: string;
  staffType: "academic" | "computer";
  positionTitle?: string;
  qualification?: string;
  subject?: string;
  experience?: string;
  salary: number;
  joinDate: string;
  status: "active" | "inactive";
  employeeStatus?: string;
  payRateType?: string;
  workTimingFrom?: string;
  workTimingTo?: string;
  contractWorkDetail?: string;
  gender?: string;
  dateOfBirth?: string;

  // Address
  localAddress?: string;
  localState?: string;
  localDistrict?: string;
  localPin?: string;
  permanentAddress?: string;
  permanentState?: string;
  permanentDistrict?: string;
  permanentPin?: string;
  address?: string;

  // Identity & Bank
  aadhaarNumber?: string;
  panNumber?: string;
  bloodGroup?: string;
  bankName?: string;
  bankBranch?: string;
  accountName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;

  photoDataUrl?: string;
  documents?: IStaffDocument[];

  // Employee Code (form generated - EMP-001)
  empId?: string;
  employeeId?: string;

  // Portal Login
  loginEnabled: boolean;
  username?: string;
  accessLevel?: string;

  // Payroll
  employmentType?: "full_time" | "contractual" | "hybrid" | "hourly";
  monthlySalary?: number;
  perClassRate?: number;
  baseSalary?: number;
  hourlyRate?: number;
  pfDeduction?: number;
  tdsDeduction?: number;

  createdAt: Date;
  updatedAt: Date;
}

const staffDocumentSchema = new Schema<IStaffDocument>(
  {
    label: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    dataUrl: { type: String, required: true },
    mimeType: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const staffSchema = new Schema<IStaff>(
  {
    name: { type: String, required: true, trim: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    homePhone: { type: String, trim: true },
    instituteId: { type: Schema.Types.ObjectId, ref: "Institute", index: true },
    role: { type: String, required: true, trim: true },
    staffType: { type: String, enum: ["academic", "computer"], default: "academic" },
    positionTitle: { type: String, trim: true },
    qualification: { type: String, trim: true },
    subject: { type: String, trim: true },
    experience: { type: String, trim: true },
    salary: { type: Number, required: true, default: 0 },
    joinDate: { type: String, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    employeeStatus: { type: String, trim: true },
    payRateType: { type: String, default: "monthly" },
    workTimingFrom: { type: String },
    workTimingTo: { type: String },
    contractWorkDetail: { type: String },
    gender: { type: String },
    dateOfBirth: { type: String },

    // Address
    localAddress: { type: String },
    localState: { type: String },
    localDistrict: { type: String },
    localPin: { type: String },
    permanentAddress: { type: String },
    permanentState: { type: String },
    permanentDistrict: { type: String },
    permanentPin: { type: String },
    address: { type: String },

    // Identity & Bank
    aadhaarNumber: { type: String, trim: true },
    panNumber: { type: String, trim: true },
    bloodGroup: { type: String, trim: true },
    bankName: { type: String, trim: true },
    bankBranch: { type: String, trim: true },
    accountName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, trim: true },
    upiId: { type: String, trim: true },

    photoDataUrl: { type: String },
    documents: { type: [staffDocumentSchema], default: [] },

    // 🔑 Employee Code (Form generated)
    empId: { type: String, trim: true, index: true },
    employeeId: { type: String, trim: true },

    // 🔑 Portal Login
    loginEnabled: { type: Boolean, default: false },
    username: { type: String, trim: true, lowercase: true },
    accessLevel: { type: String, default: "staff" },

    // Payroll
    employmentType: {
      type: String,
      enum: ["full_time", "contractual", "hybrid", "hourly"],
      default: "full_time",
    },
    monthlySalary: { type: Number, default: 0 },
    perClassRate: { type: Number, default: 0 },
    baseSalary: { type: Number, default: 0 },
    hourlyRate: { type: Number, default: 0 },
    pfDeduction: { type: Number, default: 12 },
    tdsDeduction: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Staff = mongoose.model<IStaff>("Staff", staffSchema);  