import { Router } from "express";
import {
  applyToProject,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  removeProjectMember,
  updateProject
} from "../controllers/projects.controller.js";
import { requireAuth } from "../middleware/auth.js";

export const projectsRouter = Router();

projectsRouter.get("/", requireAuth, listProjects);
projectsRouter.post("/", requireAuth, createProject);
projectsRouter.get("/:id", requireAuth, getProject);
projectsRouter.patch("/:id", requireAuth, updateProject);
projectsRouter.delete("/:id", requireAuth, deleteProject);
projectsRouter.post("/:id/applications", requireAuth, applyToProject);
projectsRouter.delete("/:id/members/:userId", requireAuth, removeProjectMember);
