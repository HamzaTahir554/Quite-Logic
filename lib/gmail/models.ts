import "server-only";
import mongoose, { Schema } from "mongoose";
const integrationSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "official" },
    accountEmail: { type: String, required: true },
    encryptedRefreshToken: { type: String, required: true, select: false },
    scopes: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["connected", "expired"],
      default: "connected",
    },
    connectedAt: { type: Date, required: true },
  },
  { timestamps: true },
);
const stateSchema = new Schema({
  stateHash: { type: String, required: true, unique: true },
  sessionHash: { type: String, required: true },
  encryptedVerifier: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true, expires: 0 },
});
// Mail bodies and attachments remain in Gmail. This receipt only prevents repeat sends.
const sendSchema = new Schema({
  requestId: { type: String, required: true, unique: true },
  fingerprint: { type: String, required: true },
  accountEmail: { type: String, required: true },
  state: {
    type: String,
    enum: ["submitting", "sent", "uncertain"],
    required: true,
  },
  messageId: String,
  threadId: String,
  expiresAt: { type: Date, required: true, expires: 0 },
});
export const GmailIntegration =
  mongoose.models.GmailIntegration ||
  mongoose.model("GmailIntegration", integrationSchema);
export const GmailOAuthState =
  mongoose.models.GmailOAuthState ||
  mongoose.model("GmailOAuthState", stateSchema);
export const GmailSendReceipt =
  mongoose.models.GmailSendReceipt ||
  mongoose.model("GmailSendReceipt", sendSchema);
