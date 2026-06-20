import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { toPublicUser } from "../utils/publicUser.js";
import { pickSafeExtension, readSingleFileUpload, saveUploadedFile } from "../utils/upload.js";

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  realName: z.string().nullable().optional(),
  age: z.number().int().min(13).max(100).nullable().optional(),
  specialty: z.string().nullable().optional(),
  bio: z.string().max(1000).nullable().optional(),
  course: z.string().nullable().optional(),
  university: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  skills: z.array(z.string()).optional()
});

const MAX_AVATAR_BYTES = 8 * 1024 * 1024;
const AVATAR_MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif"
};

export const getMe = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.userId } });
  res.json({ user: toPublicUser(user) });
});

export const updateMe = asyncHandler(async (req, res) => {
  const input = updateProfileSchema.parse(req.body);
  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: input
  });
  res.json({ user: toPublicUser(user) });
});

export const updateAvatar = asyncHandler(async (req, res) => {
  const upload = await readSingleFileUpload(req, "avatar", MAX_AVATAR_BYTES);
  if (!upload) {
    return res.status(400).json({ message: "Avatar file is required" });
  }

  const extension = AVATAR_MIME_EXTENSIONS[upload.mimeType];
  if (!extension) {
    return res.status(400).json({ message: "Avatar must be a JPEG, PNG, WebP, or GIF image" });
  }

  const safeExtension = pickSafeExtension(upload.filename, upload.mimeType, AVATAR_MIME_EXTENSIONS);
  const filename = `${req.user!.userId}-${randomUUID()}${safeExtension}`;
  const filePath = await saveUploadedFile(upload, "avatars", filename);

  const avatarUrl = `${req.protocol}://${req.get("host")}${filePath}`;
  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { avatarUrl }
  });

  return res.json({ avatarUrl, user: toPublicUser(user) });
});
