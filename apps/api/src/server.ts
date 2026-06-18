import http from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { redis } from "./config/redis.js";
import { registerChatSocket } from "./sockets/chat.socket.js";

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: env.WEB_ORIGIN, credentials: true }
});

registerChatSocket(io);

server.listen(env.PORT, () => {
  console.log(`EduMatch API listening on http://localhost:${env.PORT}`);
});

async function shutdown() {
  await prisma.$disconnect();
  redis.disconnect();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
