import mongoose, { Document, Schema, Types } from "mongoose";

export const INSTITUTE_TYPES = [
  "school", "coaching", "computer_institute", "tuition_center", "academy",
  "restaurant", "gym", "hospital", "clinic", "retail_store", "salon_spa",
  "hotel", "real_estate", "other",
] as const;
export type InstituteType = (typeof INSTITUTE_TYPES)[number];
export const isInstituteType = (value: unknown): value is InstituteType =>
  typeof value === "string" && INSTITUTE_TYPES.some((type) => type === value);
export const isEducationInstituteType = (value: string) =>
  ["school", "coaching", "computer_institute", "tuition_center", "academy"].includes(value);

export type InstitutePlan = string;

export type InstituteStatus = "pending" | "active" | "trial" | "inactive" | "suspended" | "expired" | "cancelled" | "archived";

export interface IInstitute extends Document {
  instituteName: string;
  instituteType: InstituteType;
  industryLabel?: string;
  ownerName: string;
  email: string;
  phone: string;
  legalName?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  logoDataUrl?: string;
  website?: string;
  domain?: string;
  defaultBranchId?: Types.ObjectId;
  academicYear?: string;
  initialAdminId?: Types.ObjectId;
  plan: InstitutePlan;
  status: InstituteStatus;
  expiryDate?: Date;
  archivedAt?: Date;
  archivedFromStatus?: Exclude<InstituteStatus, "archived">;
  maxStudents: number;
  createdAt: Date;
  updatedAt: Date;
}

const instituteSchema = new Schema(
  {
    instituteName: {
      type: String,
      required: true,
      trim: true
    },

    instituteType: {
      type: String,
      enum: INSTITUTE_TYPES,
      required: true
    },

    industryLabel: { type: String, trim: true, maxlength: 120, default: "" },

    ownerName: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },

    phone: {
      type: String,
      required: true,
      trim: true
    },

    legalName: { type: String, trim: true, default: "" },

    address: {
      type: String,
      default: ""
    },

    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "" },
    pincode: { type: String, trim: true, default: "" },
    logoDataUrl: { type: String, default: "" },
    website: { type: String, trim: true, default: "" },
    domain: { type: String, trim: true, lowercase: true, default: undefined },
    defaultBranchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    academicYear: { type: String, trim: true, default: "" },
    initialAdminId: { type: Schema.Types.ObjectId, ref: "User" },

    plan: {
      type: String,
      trim: true,
      default: "basic"
    },

    status: {
      type: String,
      enum: ["pending", "active", "trial", "inactive", "suspended", "expired", "cancelled", "archived"],
      default: "pending",
      index: true,
    },

    expiryDate: {
      type: Date,
      required: false
    },

    archivedAt: { type: Date },
    archivedFromStatus: {
      type: String,
      enum: ["pending", "active", "trial", "inactive", "suspended", "expired", "cancelled"],
    },

    maxStudents: {
      type: Number,
      default: 100
    }
  },
  { timestamps: true }
);

instituteSchema.index({ domain: 1 }, { unique: true, partialFilterExpression: { domain: { $type: "string", $gt: "" } } });

export const Institute = mongoose.model<IInstitute>(
  "Institute",
  instituteSchema
);
