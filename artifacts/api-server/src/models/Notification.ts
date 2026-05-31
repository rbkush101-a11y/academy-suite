import mongoose, { Document, Schema } from "mongoose";

export interface INotification extends Document {
  title: string;
  message: string;
  type: "sms" | "whatsapp" | "email" | "internal";
  target: "all-students" | "all-staff" | "batch" | "individual";
  targetId?: string;
  status: "sent" | "scheduled" | "draft" | "failed";
  scheduledAt?: string;
  sentAt?: string;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["sms", "whatsapp", "email", "internal"], required: true },
    target: { type: String, enum: ["all-students", "all-staff", "batch", "individual"], required: true },
    targetId: { type: String },
    status: { type: String, enum: ["sent", "scheduled", "draft", "failed"], default: "sent" },
    scheduledAt: { type: String },
    sentAt: { type: String },
  },
  { timestamps: true }
);

export const Notification = mongoose.model<INotification>("Notification", notificationSchema);
