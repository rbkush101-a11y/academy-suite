import mongoose, { Document, Schema, Types } from "mongoose";

export type UserRole =
  | "super_admin"
  | "platform_admin"
  | "support_admin"
  | "finance_admin"
  | "read_only_admin"
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
  activeBranchId?: Types.ObjectId;
  branchIds?: Types.ObjectId[];
  customRoleId?: Types.ObjectId;
  isApproved: boolean;
  createdAt: Date;
  phone?: string;
  businessAddress?: string;
  businessType?: string;
  promoCode?: string;
  logoDataUrl?: string;
  failedLoginAttempts: number;
  failedLoginWindowStartedAt?: Date;
  lockedUntil?: Date;
  emailVerifiedAt?: Date;
  twoFactorEnabled: boolean;
  twoFactorSecretEncrypted?: string;
  linkedStudentIds?: Types.ObjectId[];
  parentFamilyId?: Types.ObjectId;
  parentRelation?: "father" | "mother" | "guardian";
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

    phone: { type: String, trim: true },
    businessAddress: { type: String, trim: true },
    businessType: { type: String, trim: true },
    promoCode: { type: String, trim: true },
    logoDataUrl: { type: String },

    password: { type: String, required: true },

    role: {
      type: String,
      enum: [
        "super_admin",
        "platform_admin",
        "support_admin",
        "finance_admin",
        "read_only_admin",
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

    activeBranchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    branchIds: [{ type: Schema.Types.ObjectId, ref: "Branch" }],
    customRoleId: { type: Schema.Types.ObjectId, ref: "Role" },

    isApproved: {
      type: Boolean,
      default: false
    },
    failedLoginAttempts: { type: Number, default: 0, min: 0 },
    failedLoginWindowStartedAt: { type: Date },
    lockedUntil: { type: Date },
    emailVerifiedAt: { type: Date },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecretEncrypted: { type: String, select: false },

    linkedStudentIds: [{ type: Schema.Types.ObjectId, ref: "Student" }],
    parentFamilyId: { type: Schema.Types.ObjectId, ref: "ParentFamily", index: true },
    parentRelation: { type: String, enum: ["father", "mother", "guardian"] },
  },
  { timestamps: true }
);

const PLATFORM_ROLES: UserRole[] = [
  "super_admin",
  "platform_admin",
  "support_admin",
  "finance_admin",
  "read_only_admin",
];

userSchema.pre("validate", function enforcePlatformScope() {
  if (PLATFORM_ROLES.includes(this.role) && (this.instituteId || this.activeBranchId || this.customRoleId || this.branchIds?.length)) {
    this.invalidate("instituteId", "Platform administrators cannot be assigned institute, branch, or institute-role scope.");
  }
});

export const User = mongoose.model<IUser>("User", userSchema);
