import mongoose, { Document, Schema } from "mongoose";

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
  instituteId: mongoose.Types.ObjectId;
  role: "teacher" | "coordinator" | "admin" | "accountant" | "other";
  staffType: "academic" | "computer";
  positionTitle?: string;
  qualification?: string;
  subject?: string;
  salary: number;
  joinDate: string;
  status: "active" | "inactive";
  employeeStatus?: "full-time" | "part-time" | "casual" | "contract";
  payRateType?: "annual" | "monthly" | "hourly";
  workTimingFrom?: string;
  workTimingTo?: string;
  contractWorkDetail?: string;
  gender?: "male" | "female" | "other";
  dateOfBirth?: string;
  localAddress?: string;
  localState?: string;
  localPin?: string;
  permanentAddress?: string;
  permanentState?: string;
  permanentPin?: string;
  aadhaarNumber?: string;
  bankName?: string;
  bankBranch?: string;
  accountName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  photoDataUrl?: string;
  documents?: IStaffDocument[];
  address?: string;
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
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    homePhone: { type: String, trim: true },
    instituteId: { type: Schema.Types.ObjectId, ref: "Institute", required: true },
    role: {
      type: String,
      enum: ["teacher", "coordinator", "admin", "accountant", "other"],
      required: true,
    },

    staffType: {
      type: String,
      enum: ["academic", "computer"],
      default: "academic",
      required: true,
    },
    positionTitle: { type: String, trim: true },
    qualification: { type: String, trim: true },
    subject: { type: String, trim: true },
    salary: { type: Number, required: true, default: 0 },
    joinDate: { type: String, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    employeeStatus: { type: String, enum: ["full-time", "part-time", "casual", "contract"] },
    payRateType: { type: String, enum: ["annual", "monthly", "hourly"], default: "monthly" },
    workTimingFrom: { type: String },
    workTimingTo: { type: String },
    contractWorkDetail: { type: String, trim: true },
    gender: { type: String, enum: ["male", "female", "other"] },
    dateOfBirth: { type: String },
    localAddress: { type: String, trim: true },
    localState: { type: String, trim: true },
    localPin: { type: String, trim: true },
    permanentAddress: { type: String, trim: true },
    permanentState: { type: String, trim: true },
    permanentPin: { type: String, trim: true },
    aadhaarNumber: { type: String, trim: true },
    bankName: { type: String, trim: true },
    bankBranch: { type: String, trim: true },
    accountName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, trim: true },
    upiId: { type: String, trim: true },
    photoDataUrl: { type: String },
    documents: { type: [staffDocumentSchema], default: [] },
    address: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Staff = mongoose.model<IStaff>("Staff", staffSchema);
