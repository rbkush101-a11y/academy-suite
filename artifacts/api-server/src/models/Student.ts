import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IStudentDocument {
  label: string;
  name: string;
  dataUrl: string;
  mimeType: string;
}

export interface IStudent extends Document {
  name: string;
  email?: string;
  phone: string;
  enrollmentNo: string;
  instituteId: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  status: "active" | "inactive" | "graduated";
  academicYear: string;

  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  genderOther?: string;
  bloodGroup?: string;
  schoolName?: string;
  className?: string;
  section?: string;
  board?: string;
  boardOther?: string;
  lastClassPercentage?: string;
  lastClassMarks?: string;
  photoDataUrl?: string;
  documents?: IStudentDocument[];

  aadhaarCard?: string;
  previousMarksheet?: string;

  parentName?: string;
  parentPhone?: string;
  motherName?: string;
  motherOccupation?: string;
  motherPhone?: string;
  motherWhatsapp?: string;
  fatherName?: string;
  fatherOccupation?: string;
  fatherPhone?: string;
  fatherWhatsapp?: string;
  emergencyPhone?: string;

  correspondenceAddress?: string;
  correspondenceDistrict?: string;
  correspondenceState?: string;
  correspondencePin?: string;
  permanentAddress?: string;
  permanentDistrict?: string;
  permanentState?: string;
  permanentPin?: string;
  loginId?: string;
  loginPassword?: string;
  createdAt: Date;
  updatedAt: Date;
}

const studentDocumentSchema = new Schema<IStudentDocument>(
  {
    label: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    dataUrl: { type: String, required: true },
    mimeType: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const studentSchema = new Schema<IStudent>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    enrollmentNo: { type: String, unique: true },
    instituteId: { type: Schema.Types.ObjectId, ref: "Institute", required: true },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    status: { type: String, enum: ["active", "inactive", "graduated"], default: "active" },
    academicYear: { type: String, required: true },
    dateOfBirth: { type: String },
    gender: { type: String, enum: ["male", "female", "other"] },
    genderOther: { type: String, trim: true },
    bloodGroup: { type: String, trim: true },
    schoolName: { type: String, trim: true },
    className: { type: String, trim: true },
    section: { type: String, trim: true },
    board: { type: String, trim: true },
    boardOther: { type: String, trim: true },
    lastClassPercentage: { type: String, trim: true },
    lastClassMarks: { type: String, trim: true },
    photoDataUrl: { type: String },
    documents: { type: [studentDocumentSchema], default: [] },

    aadhaarCard: { type: String },
    previousMarksheet: { type: String },

    parentName: { type: String, trim: true },
    parentPhone: { type: String, trim: true },
    motherName: { type: String, trim: true },
    motherOccupation: { type: String, trim: true },
    motherPhone: { type: String, trim: true },
    motherWhatsapp: { type: String, trim: true },
    fatherName: { type: String, trim: true },
    fatherOccupation: { type: String, trim: true },
    fatherPhone: { type: String, trim: true },
    fatherWhatsapp: { type: String, trim: true },
    emergencyPhone: { type: String, trim: true },
    correspondenceAddress: { type: String, trim: true },
    correspondenceDistrict: { type: String, trim: true },
    correspondenceState: { type: String, trim: true },
    correspondencePin: { type: String, trim: true },
    permanentAddress: { type: String, trim: true },
    permanentDistrict: { type: String, trim: true },
    permanentState: { type: String, trim: true },
    permanentPin: { type: String, trim: true },
    loginId: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      sparse: true,
    },
    loginPassword: {
      type: String,
      select: false,
    },
  },
  { timestamps: true }
);

studentSchema.pre("save", async function () {
  if (!this.enrollmentNo) {
    const count = await Student.countDocuments({ instituteId: this.instituteId });
    this.enrollmentNo = "STU" + String(count + 1).padStart(4, "0");
  }

  if (
    this.loginPassword &&
    this.isModified("loginPassword") &&
    !this.loginPassword.startsWith("$2")
  ) {
    this.loginPassword = await bcrypt.hash(this.loginPassword, 10);
  }
});

studentSchema.pre("findOneAndUpdate", async function () {
  const update = this.getUpdate() as any;
  if (!update) return;

  const data = update.$set ?? update;

  if (data.loginPassword === "") {
    delete data.loginPassword;
  }

  if (
    data.loginPassword &&
    typeof data.loginPassword === "string" &&
    !data.loginPassword.startsWith("$2")
  ) {
    data.loginPassword = await bcrypt.hash(data.loginPassword, 10);
  }
});

export const Student = mongoose.model<IStudent>("Student", studentSchema);