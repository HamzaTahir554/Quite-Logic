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
export const GET = endpoint(async (request) => {
  const { skip, limit, page } = pagination(request);
  await connectDB();
  const filter = { status: "approved" };
  const [records, total] = await Promise.all([
    Review.find(filter)
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
  const input = await body(request, reviewSchema);
  await rateLimit(`review-email:${input.email}`, 3, 86400);
  const { website: _honeypot, ...data } = input;
  void _honeypot;
  await Review.create({ ...data, status: "pending" });
  return json({ message: "Thank you. Your review is pending approval." }, 201);
});
