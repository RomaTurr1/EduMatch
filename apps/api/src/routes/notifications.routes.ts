import { Router } from "express";
import { clearNotifications, markNotificationRead, listNotifications } from "../controllers/notifications.controller.js";
import { requireAuth } from "../middleware/auth.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", requireAuth, listNotifications);
notificationsRouter.delete("/", requireAuth, clearNotifications);
notificationsRouter.patch("/:id/read", requireAuth, markNotificationRead);
