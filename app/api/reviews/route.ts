import {
  endpoint,
  json,
  pagination,
  body,
  checkOrigin,
  clientAddress,
  rateLimit,
} from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { Review } from "@/lib/models";
import { publicReview } from "@/lib/public-data";
import { reviewSchema } from "@/lib/admin-validation";
import { createHash } from "node:crypto";
import { boundedForm, normalizeAvatar, saveAvatar } from "@/lib/avatar-storage";
export const GET = endpoint(async (request) => {
  const { skip, limit, page } = pagination(request);
  await connectDB();
  const filter = { status: "approved" };
  const [records, total] = await Promise.all([
    Review.find(filter)
      .select("+avatarHash")
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);
  return json({ reviews: records.map(publicReview), total, page, limit });
});
export const POST = endpoint(async (request) => {
  checkOrigin(request);
  await rateLimit(`review-ip:${clientAddress(request)}`, 10, 3600);
  let image: Buffer | undefined;
  let input;
  if (request.headers.get("content-type")?.startsWith("multipart/form-data")) {
    const form = await boundedForm(request);
    const file = form.get("profileImage");
    if (file instanceof File && file.size) image = await normalizeAvatar(file);
    const values = Object.fromEntries(form);
    delete values.profileImage;
    input = reviewSchema.parse({
      ...values,
      rating: Number(values.rating),
      useGravatar: values.useGravatar === "on",
    });
  } else input = await body(request, reviewSchema);
  await rateLimit(`review-email:${input.email}`, 3, 86400);
  const { website: _honeypot, ...data } = input;
  void _honeypot;
  const review = await Review.create({
    ...data,
    avatarHash: input.useGravatar
      ? createHash("sha256")
          .update(input.email.trim().toLowerCase())
          .digest("hex")
      : "",
    status: "pending",
  });
  if (image)
    try {
      review.avatarUrl = await saveAvatar(image, review._id);
      await review.save();
    } catch (e) {
      await Review.deleteOne({ _id: review._id });
      throw e;
    }
  return json({ message: "Thank you. Your review is pending approval." }, 201);
});
