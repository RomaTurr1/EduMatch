import type { Server } from "socket.io";
import { prisma } from "../config/prisma.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { publicUserSelect } from "../utils/selects.js";

export function registerChatSocket(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (typeof token !== "string") {
      return next(new Error("Missing token"));
    }

    try {
      socket.data.user = verifyAccessToken(token);
      return next();
    } catch {
      return next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("project:join", async (projectId: string, ack?: (value: unknown) => void) => {
      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: socket.data.user.userId } }
      });

      if (!membership) {
        ack?.({ ok: false, message: "Only project members can join chat" });
        return;
      }

      socket.join(`project:${projectId}`);
      ack?.({ ok: true });
    });

    socket.on("message:create", async (payload: { projectId: string; body: string }, ack?: (value: unknown) => void) => {
      if (!payload.body?.trim()) {
        ack?.({ ok: false, message: "Message cannot be empty" });
        return;
      }

      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: payload.projectId, userId: socket.data.user.userId } }
      });

      if (!membership) {
        ack?.({ ok: false, message: "Only project members can send messages" });
        return;
      }

      socket.join(`project:${payload.projectId}`);
      const message = await prisma.chatMessage.create({
        data: {
          projectId: payload.projectId,
          userId: socket.data.user.userId,
          body: payload.body.trim()
        },
        include: {
          user: { select: publicUserSelect },
          files: { include: { uploader: { select: publicUserSelect } } }
        }
      });

      io.to(`project:${payload.projectId}`).emit("message:new", message);
      ack?.({ ok: true, message });
    });
  });
}
