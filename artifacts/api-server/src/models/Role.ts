import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IRole extends Document {
  instituteId: Types.ObjectId;
  key: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
    key: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    permissions: { type: [String], default: [] },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true },
);

roleSchema.index({ instituteId: 1, key: 1 }, { unique: true });

export const Role = mongoose.model<IRole>("Role", roleSchema);
