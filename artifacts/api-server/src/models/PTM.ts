import mongoose, { Document, Schema } from "mongoose";

export interface IPTM extends Document {
  title: string;
  batchId: mongoose.Types.ObjectId;
  scheduledDate: string;
  venue?: string;
  agenda?: string;
  status: "scheduled" | "completed" | "cancelled";
  attendees: number;
  notes?: string;
  createdAt: Date;
}

const ptmSchema = new Schema<IPTM>(
  {
    title: { type: String, required: true },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    scheduledDate: { type: String, required: true },
    venue: { type: String },
    agenda: { type: String },
    status: { type: String, enum: ["scheduled", "completed", "cancelled"], default: "scheduled" },
    attendees: { type: Number, default: 0 },
    notes: { type: String },
  },
  { timestamps: true }
);

export const PTM = mongoose.model<IPTM>("PTM", ptmSchema);
