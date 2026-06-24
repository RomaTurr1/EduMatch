import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { publicUserSelect } from "../utils/selects.js";

function redactInviteCode<T extends { project?: { ownerId?: string; inviteCode?: string | null } | null }>(
  notification: T,
  userId: string
) {
  if (notification.project && notification.project.ownerId !== userId) {
    return { ...notification, project: { ...notification.project, inviteCode: null } };
  }
  return notification;
}

export const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.userId },
    include: {
      actor: { select: publicUserSelect },
      project: { include: { owner: { select: publicUserSelect }, members: { include: { user: { select: publicUserSelect } } } } }
    },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  res.json({ notifications: notifications.map((notification) => redactInviteCode(notification, req.user!.userId)) });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await prisma.notification.findFirst({
    where: { id: req.params.id, userId: req.user!.userId }
  });

  if (!notification) {
    return res.status(404).json({ message: "Notification not found" });
  }

  const updated = await prisma.notification.update({
    where: { id: notification.id },
    data: { readAt: new Date() }
  });

  return res.json({ notification: updated });
});
