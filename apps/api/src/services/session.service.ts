import crypto from "node:crypto";
import { redis } from "../config/redis.js";
import { env } from "../config/env.js";

const sessionKey = (sessionId: string) => `refresh-session:${sessionId}`;

export async function createRefreshSession(userId: string) {
  const sessionId = crypto.randomUUID();
  const ttlSeconds = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;
  await redis.set(sessionKey(sessionId), userId, "EX", ttlSeconds);
  return sessionId;
}

export async function getRefreshSession(sessionId: string) {
  return redis.get(sessionKey(sessionId));
}

export async function revokeRefreshSession(sessionId: string) {
  await redis.del(sessionKey(sessionId));
}
