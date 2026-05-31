import mongoose, { Document, Schema } from "mongoose";

export interface ITimetable extends Document {
  batchId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  teacherId?: mongoose.Types.ObjectId;
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  startTime: string;
  endTime: string;
  room?: string;
  createdAt: Date;
}

const timetableSchema = new Schema<ITimetable>(
  {
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "Staff" },
    day: { type: String, enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    room: { type: String },
  },
  { timestamps: true }
);

export const Timetable = mongoose.model<ITimetable>("Timetable", timetableSchema);
