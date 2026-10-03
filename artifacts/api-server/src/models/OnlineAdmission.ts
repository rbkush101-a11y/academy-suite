import mongoose, { Document, Schema, Types } from "mongoose";

export type OnlineAdmissionStatus =
  | "submitted"
  | "under_review"
  | "correction_required"
  | "approved"
  | "rejected"
  | "converted";

export interface IOnlineAdmissionDocument {
  name: string;
  mimeType: string;
  dataUrl: string;
}

export interface IOnlineAdmission extends Document {
  instituteId: Types.ObjectId;
  applicationNumber: string;
  status: OnlineAdmissionStatus;

  name: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";
  genderOther?: string;
  bloodGroup?: string;
  schoolName?: string;
  academicYear: string;
  photoDataUrl?: string;
  className?: string;
  section?: string;
  board?: string;
  boardOther?: string;
  lastClassPercentage?: string;
  lastClassMarks?: string;

  courseId: Types.ObjectId;
  batchId: Types.ObjectId;

  motherName?: string;
  motherOccupation?: string;
  motherPhone?: string;
  motherPhoneCode?: string;
  motherWhatsapp?: string;
  motherWhatsappCode?: string;

  fatherName?: string;
  fatherOccupation?: string;
  fatherPhone?: string;
  fatherPhoneCode?: string;
  fatherWhatsapp?: string;
  fatherWhatsappCode?: string;

  emergencyPhone?: string;
  emergencyPhoneCode?: string;
  email?: string;

  correspondenceAddress?: string;
  correspondenceState?: string;
  correspondenceDistrict?: string;
  correspondencePin?: string;

  // aadhaarCard is retained only for backward compatibility with older applications.
  aadhaarCard?: IOnlineAdmissionDocument;
  aadhaarFront?: IOnlineAdmissionDocument;
  aadhaarBack?: IOnlineAdmissionDocument;
  previousMarksheet?: IOnlineAdmissionDocument;

  reviewNote?: string;
  reviewedAt?: Date;
  reviewedBy?: Types.ObjectId;
  convertedStudentId?: Types.ObjectId;
  convertedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const uploadSchema = new Schema<IOnlineAdmissionDocument>(
  {
    name: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    dataUrl: { type: String, required: true },
  },
  { _id: false },
);

const onlineAdmissionSchema = new Schema<IOnlineAdmission>(
  {
    instituteId: {
      type: Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true,
    },
    applicationNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    status: {
      type: String,
      enum: [
        "submitted",
        "under_review",
        "correction_required",
        "approved",
        "rejected",
        "converted",
      ],
      default: "submitted",
      index: true,
    },

    name: { type: String, required: true, trim: true },
    dateOfBirth: { type: String, required: true, trim: true },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },
    genderOther: { type: String, trim: true, default: "" },
    bloodGroup: { type: String, trim: true, default: "" },
    schoolName: { type: String, trim: true, default: "" },
    academicYear: { type: String, required: true, trim: true },
    photoDataUrl: { type: String, default: "" },
    className: { type: String, trim: true, default: "" },
    section: { type: String, trim: true, default: "" },
    board: { type: String, trim: true, default: "" },
    boardOther: { type: String, trim: true, default: "" },
    lastClassPercentage: { type: String, trim: true, default: "" },
    lastClassMarks: { type: String, trim: true, default: "" },

    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },

    motherName: { type: String, trim: true, default: "" },
    motherOccupation: { type: String, trim: true, default: "" },
    motherPhone: { type: String, trim: true, default: "" },
    motherPhoneCode: { type: String, trim: true, default: "+91" },
    motherWhatsapp: { type: String, trim: true, default: "" },
    motherWhatsappCode: { type: String, trim: true, default: "+91" },

    fatherName: { type: String, trim: true, default: "" },
    fatherOccupation: { type: String, trim: true, default: "" },
    fatherPhone: { type: String, trim: true, default: "" },
    fatherPhoneCode: { type: String, trim: true, default: "+91" },
    fatherWhatsapp: { type: String, trim: true, default: "" },
    fatherWhatsappCode: { type: String, trim: true, default: "+91" },

    emergencyPhone: { type: String, trim: true, default: "" },
    emergencyPhoneCode: { type: String, trim: true, default: "+91" },
    email: { type: String, trim: true, lowercase: true, default: "" },

    correspondenceAddress: { type: String, trim: true, default: "" },
    correspondenceState: { type: String, trim: true, default: "" },
    correspondenceDistrict: { type: String, trim: true, default: "" },
    correspondencePin: { type: String, trim: true, default: "" },

    // Legacy single-side Aadhaar field (old applications only).
    aadhaarCard: { type: uploadSchema },
    aadhaarFront: { type: uploadSchema },
    aadhaarBack: { type: uploadSchema },
    previousMarksheet: { type: uploadSchema },

    reviewNote: { type: String, trim: true, default: "" },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    convertedStudentId: { type: Schema.Types.ObjectId, ref: "Student" },
    convertedAt: { type: Date },
  },
  { timestamps: true },
);

onlineAdmissionSchema.index({ instituteId: 1, createdAt: -1 });
onlineAdmissionSchema.index({ instituteId: 1, status: 1, createdAt: -1 });

export const OnlineAdmission = mongoose.model<IOnlineAdmission>(
  "OnlineAdmission",
  onlineAdmissionSchema,
);
