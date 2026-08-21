import mongoose, { Document, Schema, Types } from "mongoose";

export type UserRole =
  | "super_admin"
  | "institute_admin"
  | "teacher"
  | "student"
  | "parent"
  | "staff"
  | "accountant";

export interface IUser extends Document {
  name: string;
  email: string;
  loginId?: string;
  password: string;
  role: UserRole;
  instituteId?: Types.ObjectId;
  isApproved: boolean;
  createdAt: Date;
}

const userSchema = new Schema(
  {
    name: { type: String, required: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    loginId: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },

    password: { type: String, required: true },

    role: {
      type: String,
      enum: [
        "super_admin",
        "institute_admin",
        "teacher",
        "student",
        "parent",
        "staff",
        "accountant"
      ],
      default: "student"
    },

    instituteId: {
      type: Schema.Types.ObjectId,
      ref: "Institute",
      required: false
    },

    isApproved: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", userSchema);