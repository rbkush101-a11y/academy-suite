import mongoose, { Document, Schema } from "mongoose";

export interface IStudentAttendance extends Document {
  instituteId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  date: string;
  status: "present" | "absent" | "late";
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStaffAttendance extends Document {
  instituteId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  date: string;
  status: "present" | "absent" | "leave";
  checkIn?: string;
  checkOut?: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const studentAttendanceSchema =
  new Schema<IStudentAttendance>(
    {
      instituteId: {
        type: Schema.Types.ObjectId,
        ref: "Institute",
        required: true,
        index: true,
      },

      studentId: {
        type: Schema.Types.ObjectId,
        ref: "Student",
        required: true,
        index: true,
      },

      batchId: {
        type: Schema.Types.ObjectId,
        ref: "Batch",
        required: true,
        index: true,
      },

      date: {
        type: String,
        required: true,
        trim: true,
      },

      status: {
        type: String,
        enum: [
          "present",
          "absent",
          "late",
        ],
        required: true,
      },

      remarks: {
        type: String,
        trim: true,
      },
    },
    {
      timestamps: true,
    },
  );

/*
 * One attendance record per student,
 * per date, inside an institute.
 */
studentAttendanceSchema.index(
  {
    instituteId: 1,
    studentId: 1,
    date: 1,
  },
  {
    unique: true,
  },
);

studentAttendanceSchema.index({
  instituteId: 1,
  batchId: 1,
  date: 1,
});

studentAttendanceSchema.index({
  instituteId: 1,
  date: 1,
});

const staffAttendanceSchema =
  new Schema<IStaffAttendance>(
    {
      instituteId: {
        type: Schema.Types.ObjectId,
        ref: "Institute",
        required: true,
        index: true,
      },

      staffId: {
        type: Schema.Types.ObjectId,
        ref: "Staff",
        required: true,
        index: true,
      },

      date: {
        type: String,
        required: true,
        trim: true,
      },

      status: {
        type: String,
        enum: [
          "present",
          "absent",
          "leave",
        ],
        required: true,
      },

      checkIn: {
        type: String,
        trim: true,
      },

      checkOut: {
        type: String,
        trim: true,
      },

      remarks: {
        type: String,
        trim: true,
      },
    },
    {
      timestamps: true,
    },
  );

/*
 * One attendance record per staff member,
 * per date, inside an institute.
 */
staffAttendanceSchema.index(
  {
    instituteId: 1,
    staffId: 1,
    date: 1,
  },
  {
    unique: true,
  },
);

staffAttendanceSchema.index({
  instituteId: 1,
  date: 1,
});

export const StudentAttendance =
  mongoose.model<IStudentAttendance>(
    "StudentAttendance",
    studentAttendanceSchema,
  );

export const StaffAttendance =
  mongoose.model<IStaffAttendance>(
    "StaffAttendance",
    staffAttendanceSchema,
  );