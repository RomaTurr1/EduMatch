import { Router } from "express";
import { searchTeammates } from "../controllers/teammates.controller.js";
import { requireAuth } from "../middleware/auth.js";

export const teammatesRouter = Router();

teammatesRouter.get("/", requireAuth, searchTeammates);
