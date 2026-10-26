import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { socialPlatforms } from "./social-links";

const adminSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    avatarUrl: { type: String, default: "" },
    sessionVersion: { type: Number, default: 0, required: true },
    resetTokenHash: { type: String, select: false },
    resetExpires: { type: Date, select: false },
  },
  { timestamps: true },
);
adminSchema.index({ resetTokenHash: 1 }, { sparse: true });

const sessionSchema = new Schema({
  tokenHash: { type: String, unique: true, required: true },
  adminId: { type: Schema.Types.ObjectId, required: true, index: true },
  version: { type: Number, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});
const reviewSchema = new Schema(
  {
    clientName: { type: String, required: true, maxlength: 100 },
    company: { type: String, default: "", maxlength: 150 },
    role: { type: String, default: "", maxlength: 100 },
    email: { type: String, required: true, select: false },
    avatarUrl: { type: String, default: "" },
    avatarHash: { type: String, default: "", select: false },
    useGravatar: { type: Boolean, default: false },
    service: { type: String, default: "", maxlength: 100 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, required: true, maxlength: 5000 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      required: true,
    },
  },
  { timestamps: true },
);
reviewSchema.index({ status: 1, createdAt: -1, _id: -1 });

const projectSchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, maxlength: 180 },
    logo: { type: String, required: true },
    mediaType: {
      type: String,
      enum: ["logo", "illustration", "screenshot"],
      default: "logo",
    },
    description: { type: String, required: true, maxlength: 10000 },
    shortDescription: { type: String, default: "", maxlength: 300 },
    category: { type: String, default: "", maxlength: 100 },
    technologies: { type: [String], default: [] },
    projectUrl: { type: String, default: "" },
    sourceSlug: { type: String, default: null },
    featured: { type: Boolean, default: false },
    showOnHome: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
      required: true,
    },
    order: { type: Number, default: 0, required: true },
  },
  { timestamps: true },
);
projectSchema.index({ status: 1, order: 1, _id: 1 });
projectSchema.index({ status: 1, showOnHome: 1, order: 1, _id: 1 });

// Small, validated logos live durably in MongoDB, never the server filesystem.
const imageSchema = new Schema(
  {
    data: { type: Buffer, required: true, select: false },
    thumbnail: { type: Buffer, select: false },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    createdBy: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);
const rateSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true, expires: 0 },
});
const socialLinkSchema = new Schema(
  {
    platform: {
      type: String,
      enum: socialPlatforms,
      required: true,
      unique: true,
    },
    url: { type: String, required: true, maxlength: 2000 },
    enabled: { type: Boolean, default: false, required: true },
    order: { type: Number, default: 0, required: true, min: 0, max: 1000000 },
  },
  { timestamps: true },
);
socialLinkSchema.index({ enabled: 1, order: 1, _id: 1 });

function model<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);
}
export type ProjectRecord = InferSchemaType<typeof projectSchema>;
export type ReviewRecord = InferSchemaType<typeof reviewSchema>;
export const Admin = model("Admin", adminSchema);
export const Session = model("AdminSession", sessionSchema);
export const Review = model("Review", reviewSchema);
export const Project = model("Project", projectSchema);
export const ProjectImage = model("ProjectImage", imageSchema);
export const RateLimit = model("RateLimit", rateSchema);
export const SocialLink = model("SocialLink", socialLinkSchema);
const avatarSchema = new Schema(
  {
    data: { type: Buffer, required: true, select: false },
    createdBy: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);
export const AvatarImage = model("AvatarImage", avatarSchema);
