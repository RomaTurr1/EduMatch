import { Router } from "express";
import {
  applyToProject,
  createProject,
  deleteProject,
  getProject,
  leaveProject,
  listProjects,
  removeProjectMember,
  updateProject,
  updateProjectFile,
  uploadChatFile,
  uploadProjectFile
} from "../controllers/projects.controller.js";
import { requireAuth } from "../middleware/auth.js";

export const projectsRouter = Router();

projectsRouter.get("/", requireAuth, listProjects);
projectsRouter.post("/", requireAuth, createProject);
projectsRouter.get("/:id", requireAuth, getProject);
projectsRouter.patch("/:id", requireAuth, updateProject);
projectsRouter.delete("/:id", requireAuth, deleteProject);
projectsRouter.delete("/:id/membership", requireAuth, leaveProject);
projectsRouter.post("/:id/applications", requireAuth, applyToProject);
projectsRouter.post("/:id/files", requireAuth, uploadProjectFile);
projectsRouter.patch("/:id/files/:fileId", requireAuth, updateProjectFile);
projectsRouter.post("/:id/messages/files", requireAuth, uploadChatFile);
projectsRouter.delete("/:id/members/:userId", requireAuth, removeProjectMember);
