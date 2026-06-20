import { Router } from "express";
import { getMe, updateAvatar, updateMe } from "../controllers/profile.controller.js";
import { requireAuth } from "../middleware/auth.js";

export const profileRouter = Router();

profileRouter.get("/me", requireAuth, getMe);
profileRouter.patch("/me", requireAuth, updateMe);
profileRouter.post("/avatar", requireAuth, updateAvatar);
