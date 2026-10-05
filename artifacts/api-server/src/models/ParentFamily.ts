import mongoose, { Document, Schema, Types } from "mongoose";

export interface IParentFamily extends Document {
  instituteId: Types.ObjectId;
  fatherName?: string;
  fatherPhone?: string;
  motherName?: string;
  motherPhone?: string;
  studentIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const parentFamilySchema = new Schema<IParentFamily>(
  {
    instituteId: {
      type: Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true,
    },
    fatherName: { type: String, trim: true, default: "" },
    fatherPhone: { type: String, trim: true, default: "" },
    motherName: { type: String, trim: true, default: "" },
    motherPhone: { type: String, trim: true, default: "" },
    studentIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Student",
        required: true,
      },
    ],
  },
  { timestamps: true },
);

parentFamilySchema.index({ instituteId: 1, updatedAt: -1 });
parentFamilySchema.index({ instituteId: 1, studentIds: 1 });

export const ParentFamily = mongoose.model<IParentFamily>(
  "ParentFamily",
  parentFamilySchema,
);
