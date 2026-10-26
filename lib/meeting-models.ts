import mongoose, { Schema } from "mongoose";

// The unique slot prevents duplicate requests across processes. Only untouched,
// pre-submission holds expire; an ambiguous external POST must never auto-retry.
const meetingSchema = new Schema(
  {
    requestId: { type: String, required: true, unique: true },
    fingerprint: { type: String, required: true, select: false },
    eventType: { type: String, required: true },
    host: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    timezone: { type: String, required: true },
    phone: String,
    company: String,
    message: String,
    projectType: String,
    state: {
      type: String,
      enum: ["holding", "submitting", "pending", "confirmed", "cancelled"],
      required: true,
    },
    eventUri: String,
    inviteeUri: String,
    cancelUrl: String,
    rescheduleUrl: String,
    expiresAt: { type: Date, expires: 0 },
  },
  { timestamps: true },
);
meetingSchema.index(
  { eventType: 1, startTime: 1 },
  {
    unique: true,
    partialFilterExpression: {
      state: { $in: ["holding", "submitting", "pending", "confirmed"] },
    },
  },
);
meetingSchema.index({ state: 1, startTime: -1 });
const lockSchema = new Schema({
  _id: String,
  owner: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});
export const Meeting =
  mongoose.models.Meeting || mongoose.model("Meeting", meetingSchema);
export const MeetingLock =
  mongoose.models.MeetingLock || mongoose.model("MeetingLock", lockSchema);
