import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { dashboardRouter } from "./dashboard.routes.js";
import { profileRouter } from "./profile.routes.js";
import { projectsRouter } from "./projects.routes.js";
import { teammatesRouter } from "./teammates.routes.js";
import { notificationsRouter } from "./notifications.routes.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => res.json({ ok: true }));
apiRouter.use("/auth", authRouter);
apiRouter.use("/profile", profileRouter);
apiRouter.use("/projects", projectsRouter);
apiRouter.use("/teammates", teammatesRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/notifications", notificationsRouter);
