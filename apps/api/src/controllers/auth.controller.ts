import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { createRefreshSession, getRefreshSession, revokeRefreshSession } from "../services/session.service.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import { toPublicUser } from "../utils/publicUser.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  course: z.string().optional(),
  university: z.string().optional(),
  skills: z.array(z.string()).default([])
});

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

async function issueTokens(user: { id: string; email: string }) {
  const payload = { userId: user.id, email: user.email };
  const sessionId = await createRefreshSession(user.id);
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken({ ...payload, sessionId })
  };
}

export const signup = asyncHandler(async (req, res) => {
  const input = signupSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      name: input.name,
      course: input.course,
      university: input.university,
      skills: input.skills
    }
  });

  const tokens = await issueTokens(user);
  res.status(201).json({ user: toPublicUser(user), ...tokens });
});

export const signin = asyncHandler(async (req, res) => {
  const input = signinSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const tokens = await issueTokens(user);
  return res.json({ user: toPublicUser(user), ...tokens });
});

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  const payload = verifyRefreshToken(refreshToken);
  const sessionUserId = await getRefreshSession(payload.sessionId);

  if (sessionUserId !== payload.userId) {
    return res.status(401).json({ message: "Refresh session expired" });
  }

  await revokeRefreshSession(payload.sessionId);
  const tokens = await issueTokens({ id: payload.userId, email: payload.email });
  return res.json(tokens);
});

export const signout = asyncHandler(async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  try {
    const payload = verifyRefreshToken(refreshToken);
    await revokeRefreshSession(payload.sessionId);
  } catch {
    // Sign out is idempotent from the client perspective.
  }
  return res.status(204).send();
});
