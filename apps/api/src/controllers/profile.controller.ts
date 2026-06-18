import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { toPublicUser } from "../utils/publicUser.js";

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  bio: z.string().max(1000).nullable().optional(),
  course: z.string().nullable().optional(),
  university: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  skills: z.array(z.string()).optional()
});

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
