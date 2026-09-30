import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IInstituteSettings extends Document {
  instituteId: Types.ObjectId;
  values: Record<string, unknown>;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const instituteSettingsSchema = new Schema<IInstituteSettings>(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: "Institute", required: true, unique: true },
    values: { type: Schema.Types.Mixed, default: {} },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const InstituteSettings = mongoose.model<IInstituteSettings>("InstituteSettings", instituteSettingsSchema);
