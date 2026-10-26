/** Retained avatar checks, independent of the removed scheduling experiment. */
import assert from "node:assert/strict";
import mongoose from "mongoose";
import sharp from "sharp";
import { MongoMemoryServer } from "mongodb-memory-server";
import { windowsTestMongoBinary } from "./test-mongo-binary.mjs";
import { normalizeAvatar, saveAvatar } from "../lib/avatar-storage";
import { AvatarImage } from "../lib/models";
import { publicReview } from "../lib/public-data";
let database: MongoMemoryServer | undefined;
try {
  database = await MongoMemoryServer.create({
    binary: { systemBinary: await windowsTestMongoBinary() },
  });
  process.env.MONGODB_URI = database.getUri();
  await mongoose.connect(process.env.MONGODB_URI);
  const png = await sharp({
    create: { width: 32, height: 20, channels: 3, background: "#2f80fe" },
  })
    .png()
    .toBuffer();
  const data = await normalizeAvatar(
    new File([new Uint8Array(png)], "photo.png", { type: "image/png" }),
  );
  const metadata = await sharp(data).metadata();
  assert.equal(metadata.width, 256);
  assert.equal(metadata.height, 256);
  assert.equal(metadata.format, "webp");
  await assert.rejects(
    normalizeAvatar(
      new File([new Uint8Array(png)], "fake.jpg", { type: "image/jpeg" }),
    ),
  );
  await assert.rejects(
    normalizeAvatar(
      new File(["<svg/>"], "fake.svg", { type: "image/svg+xml" }),
    ),
  );
  await assert.rejects(
    normalizeAvatar(
      new File([new Uint8Array(2 * 1024 * 1024 + 1)], "huge.png", {
        type: "image/png",
      }),
    ),
  );
  const avatarUrl = await saveAvatar(data, new mongoose.Types.ObjectId());
  assert.match(avatarUrl, /^\/api\/avatars\//);
  assert.equal(await AvatarImage.countDocuments(), 1);
  const dto = publicReview({
    _id: "test",
    clientName: "Hamza Tahir",
    company: "",
    role: "",
    service: "",
    rating: 5,
    review: "Thoughtful software.",
    createdAt: new Date(),
    email: "private@example.test",
    avatarUrl,
    avatarHash: "",
    useGravatar: false,
  } as Parameters<typeof publicReview>[0]);
  assert.equal(dto.image_url, avatarUrl);
  assert.ok(!JSON.stringify(dto).includes("private@example.test"));
  console.log(
    "PASS: 10 avatar format, size, crop, storage and privacy assertions.",
  );
} finally {
  await mongoose.disconnect();
  await database?.stop();
}
