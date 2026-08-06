import mongoose, { Document, Schema } from "mongoose";

export type InstituteType =
  | "school"
  | "coaching"
  | "computer_institute"
  | "tuition_center"
  | "academy";

export type InstitutePlan = "basic" | "standard" | "premium";

export type InstituteStatus = "active" | "inactive" | "expired";

export interface IInstitute extends Document {
  instituteName: string;
  instituteType: InstituteType;
  ownerName: string;
  email: string;
  phone: string;
  address?: string;
  plan: InstitutePlan;
  status: InstituteStatus;
  expiryDate?: Date;
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
      enum: [
        "school",
        "coaching",
        "computer_institute",
        "tuition_center",
        "academy"
      ],
      required: true
    },

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

    address: {
      type: String,
      default: ""
    },

    plan: {
      type: String,
      enum: ["basic", "standard", "premium"],
      default: "basic"
    },

    status: {
      type: String,
      enum: ["active", "inactive", "expired"],
      default: "active"
    },

    expiryDate: {
      type: Date,
      required: false
    },

    maxStudents: {
      type: Number,
      default: 100
    }
  },
  { timestamps: true }
);

export const Institute = mongoose.model<IInstitute>(
  "Institute",
  instituteSchema
);