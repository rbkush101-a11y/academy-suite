import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IPlatformPlan extends Document {
  code: string;
  name: string;
  description?: string;
  currency: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxStudents: number;
  maxBranches: number;
  features: string[];
  status: "active" | "archived";
  createdAt: Date;
  updatedAt: Date;
}

const planSchema = new Schema<IPlatformPlan>({
  code: { type: String, required: true, trim: true, lowercase: true, unique: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: "" },
  currency: { type: String, required: true, uppercase: true, default: "INR" },
  monthlyPrice: { type: Number, required: true, min: 0 },
  yearlyPrice: { type: Number, required: true, min: 0 },
  maxStudents: { type: Number, required: true, min: 0 },
  maxBranches: { type: Number, required: true, min: 0 },
  features: { type: [String], default: [] },
  status: { type: String, enum: ["active", "archived"], default: "active", index: true },
}, { timestamps: true });

export interface IPlatformFeature extends Document {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const featureSchema = new Schema<IPlatformFeature>({
  key: { type: String, required: true, trim: true, lowercase: true, unique: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: "" },
  enabled: { type: Boolean, default: true, index: true },
}, { timestamps: true });

export interface IPlatformSubscription extends Document {
  instituteId: Types.ObjectId;
  planId: Types.ObjectId;
  status: "trialing" | "active" | "past_due" | "paused" | "canceled" | "expired";
  billingCycle: "monthly" | "yearly";
  startsAt: Date;
  endsAt?: Date;
  externalReference?: string;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<IPlatformSubscription>({
  instituteId: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
  planId: { type: Schema.Types.ObjectId, ref: "PlatformPlan", required: true, index: true },
  status: { type: String, enum: ["trialing", "active", "past_due", "paused", "canceled", "expired"], default: "trialing", index: true },
  billingCycle: { type: String, enum: ["monthly", "yearly"], required: true },
  startsAt: { type: Date, required: true, default: Date.now },
  endsAt: { type: Date },
  externalReference: { type: String, trim: true, default: "" },
}, { timestamps: true });

export interface IPlatformPayment extends Document {
  instituteId: Types.ObjectId;
  invoiceId?: Types.ObjectId;
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  provider?: string;
  reference?: string;
  paidAt?: Date;
  createdAt: Date;
}

const paymentSchema = new Schema<IPlatformPayment>({
  instituteId: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
  invoiceId: { type: Schema.Types.ObjectId, ref: "PlatformInvoice", index: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, uppercase: true, default: "INR" },
  status: { type: String, enum: ["pending", "succeeded", "failed", "refunded"], required: true, default: "pending", index: true },
  provider: { type: String, trim: true, default: "manual" },
  reference: { type: String, trim: true, default: "" },
  paidAt: { type: Date },
}, { timestamps: { createdAt: true, updatedAt: false } });

export interface IPlatformInvoice extends Document {
  invoiceNumber: string;
  instituteId: Types.ObjectId;
  subscriptionId?: Types.ObjectId;
  currency: string;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number; amount: number }>;
  subtotal: number;
  taxAmount: number;
  total: number;
  status: "draft" | "issued" | "paid" | "void" | "overdue";
  issuedAt?: Date;
  dueAt?: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new Schema<IPlatformInvoice>({
  invoiceNumber: { type: String, required: true, trim: true, unique: true },
  instituteId: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
  subscriptionId: { type: Schema.Types.ObjectId, ref: "PlatformSubscription" },
  currency: { type: String, required: true, uppercase: true, default: "INR" },
  lineItems: [{ description: { type: String, required: true }, quantity: { type: Number, min: 0, required: true }, unitPrice: { type: Number, min: 0, required: true }, amount: { type: Number, min: 0, required: true } }],
  subtotal: { type: Number, required: true, min: 0 },
  taxAmount: { type: Number, required: true, min: 0, default: 0 },
  total: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["draft", "issued", "paid", "void", "overdue"], default: "draft", index: true },
  issuedAt: { type: Date },
  dueAt: { type: Date },
  paidAt: { type: Date },
}, { timestamps: true });

export interface IPlatformSupportTicket extends Document {
  instituteId?: Types.ObjectId;
  ticketNumber: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "waiting" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  requesterEmail: string;
  assignedTo?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new Schema<IPlatformSupportTicket>({
  instituteId: { type: Schema.Types.ObjectId, ref: "Institute", index: true },
  ticketNumber: { type: String, required: true, trim: true, unique: true },
  subject: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  status: { type: String, enum: ["open", "in_progress", "waiting", "resolved", "closed"], default: "open", index: true },
  priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal", index: true },
  requesterEmail: { type: String, required: true, lowercase: true, trim: true },
  assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

export interface IPlatformAnnouncement extends Document {
  title: string;
  message: string;
  audience: "all_institutes" | "platform_admins";
  status: "draft" | "scheduled" | "published" | "archived";
  scheduledAt?: Date;
  publishedAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<IPlatformAnnouncement>({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  audience: { type: String, enum: ["all_institutes", "platform_admins"], default: "all_institutes" },
  status: { type: String, enum: ["draft", "scheduled", "published", "archived"], default: "draft", index: true },
  scheduledAt: { type: Date },
  publishedAt: { type: Date },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

export interface IPlatformNotification extends Document {
  title: string;
  message: string;
  audience: "all_institutes" | "platform_admins";
  channel: "in_app" | "email";
  status: "draft" | "scheduled";
  scheduledAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const platformNotificationSchema = new Schema<IPlatformNotification>({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  audience: { type: String, enum: ["all_institutes", "platform_admins"], default: "all_institutes" },
  channel: { type: String, enum: ["in_app", "email"], default: "in_app" },
  status: { type: String, enum: ["draft", "scheduled"], default: "draft" },
  scheduledAt: { type: Date },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

export interface IPlatformSetting extends Document {
  key: string;
  value: unknown;
  updatedBy: Types.ObjectId;
  updatedAt: Date;
}

const platformSettingSchema = new Schema<IPlatformSetting>({
  key: { type: String, required: true, trim: true, unique: true },
  value: { type: Schema.Types.Mixed, required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

export const PlatformPlan = mongoose.model<IPlatformPlan>("PlatformPlan", planSchema);
export const PlatformFeature = mongoose.model<IPlatformFeature>("PlatformFeature", featureSchema);
export const PlatformSubscription = mongoose.model<IPlatformSubscription>("PlatformSubscription", subscriptionSchema);
export const PlatformPayment = mongoose.model<IPlatformPayment>("PlatformPayment", paymentSchema);
export const PlatformInvoice = mongoose.model<IPlatformInvoice>("PlatformInvoice", invoiceSchema);
export const PlatformSupportTicket = mongoose.model<IPlatformSupportTicket>("PlatformSupportTicket", ticketSchema);
export const PlatformAnnouncement = mongoose.model<IPlatformAnnouncement>("PlatformAnnouncement", announcementSchema);
export const PlatformNotification = mongoose.model<IPlatformNotification>("PlatformNotification", platformNotificationSchema);
export const PlatformSetting = mongoose.model<IPlatformSetting>("PlatformSetting", platformSettingSchema);
