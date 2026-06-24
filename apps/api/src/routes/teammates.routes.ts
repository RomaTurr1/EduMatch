import { Router } from "express";
import { getTeammate, searchTeammates } from "../controllers/teammates.controller.js";
import { requireAuth } from "../middleware/auth.js";

export const teammatesRouter = Router();

teammatesRouter.get("/", requireAuth, searchTeammates);
teammatesRouter.get("/:id", requireAuth, getTeammate);
