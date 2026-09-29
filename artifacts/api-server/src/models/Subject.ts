import mongoose, { Document, Schema } from "mongoose";

export interface ISubject extends Document {
  name: string;
  code: string;
  instituteId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  teacherId?: mongoose.Types.ObjectId;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const subjectSchema = new Schema<ISubject>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    instituteId: {
      type: Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true,
    },

    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },

    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
    },

    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

/*
 * Subject code only needs to be unique inside
 * the same institute.
 *
 * Example:
 *
 * Institute A → MATH101
 * Institute B → MATH101
 *
 * Both are allowed.
 */
subjectSchema.index(
  { instituteId: 1, code: 1 },
  { unique: true },
);

export const Subject = mongoose.model<ISubject>(
  "Subject",
  subjectSchema,
);