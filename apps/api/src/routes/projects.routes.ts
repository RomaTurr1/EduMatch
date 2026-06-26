import { Router } from "express";
import {
  acceptProjectInvitationForCurrentUser,
  applyToProject,
  createProject,
  deleteProject,
  deleteChatMessage,
  getProject,
  inviteStudentToProject,
  leaveProject,
  listProjects,
  regenerateProjectInvite,
  removeProjectMember,
  updateChatMessage,
  updateProjectApplication,
  updateProject,
  updateProjectFile,
  useProjectInvite,
  uploadChatFile,
  uploadProjectFile
} from "../controllers/projects.controller.js";
import { requireAuth } from "../middleware/auth.js";

export const projectsRouter = Router();

projectsRouter.get("/", requireAuth, listProjects);
projectsRouter.post("/", requireAuth, createProject);
projectsRouter.post("/invite/:code", requireAuth, useProjectInvite);
projectsRouter.get("/:id", requireAuth, getProject);
projectsRouter.patch("/:id", requireAuth, updateProject);
projectsRouter.delete("/:id", requireAuth, deleteProject);
projectsRouter.delete("/:id/membership", requireAuth, leaveProject);
projectsRouter.post("/:id/invite/regenerate", requireAuth, regenerateProjectInvite);
projectsRouter.post("/:id/invitations", requireAuth, inviteStudentToProject);
projectsRouter.post("/:id/invitations/accept", requireAuth, acceptProjectInvitationForCurrentUser);
projectsRouter.post("/:id/applications", requireAuth, applyToProject);
projectsRouter.patch("/:id/applications/:applicationId", requireAuth, updateProjectApplication);
projectsRouter.post("/:id/files", requireAuth, uploadProjectFile);
projectsRouter.patch("/:id/files/:fileId", requireAuth, updateProjectFile);
projectsRouter.post("/:id/messages/files", requireAuth, uploadChatFile);
projectsRouter.patch("/:id/messages/:messageId", requireAuth, updateChatMessage);
projectsRouter.delete("/:id/messages/:messageId", requireAuth, deleteChatMessage);
projectsRouter.delete("/:id/members/:userId", requireAuth, removeProjectMember);
