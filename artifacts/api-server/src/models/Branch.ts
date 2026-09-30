import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IBranch extends Document {
  instituteId: Types.ObjectId;
  name: string;
  code: string;
  phone?: string;
  email?: string;
  address?: string;
  status: "active" | "inactive";
  isMain: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const branchSchema = new Schema<IBranch>(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    address: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    isMain: { type: Boolean, default: false },
  },
  { timestamps: true },
);

branchSchema.index({ instituteId: 1, code: 1 }, { unique: true });

export const Branch = mongoose.model<IBranch>("Branch", branchSchema);
