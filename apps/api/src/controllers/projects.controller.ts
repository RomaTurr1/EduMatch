import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { publicUserSelect } from "../utils/selects.js";
import { pickSafeExtension, readSingleFileUpload, saveUploadedFile } from "../utils/upload.js";

const projectSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  techStack: z.array(z.string()).default([]),
  requiredSkills: z.array(z.string()).default([]),
  status: z.enum(["OPEN", "IN_PROGRESS", "PAUSED", "COMPLETED", "ARCHIVED"]).optional(),
  isOpenToJoin: z.boolean().optional(),
  deadlineAt: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional()
});

const projectUpdateSchema = projectSchema.partial().extend({
  status: z.enum(["OPEN", "IN_PROGRESS", "PAUSED", "COMPLETED", "ARCHIVED"]).optional()
});

const fileUpdateSchema = z.object({
  isPinned: z.boolean()
});

const messageUpdateSchema = z.object({
  body: z.string().trim().min(1).max(2000)
});

const messageDeleteSchema = z.object({
  scope: z.enum(["me", "everyone"]).default("me")
});

const projectInviteSchema = z.object({
  userId: z.string().min(1)
});

const MAX_PROJECT_FILE_BYTES = 16 * 1024 * 1024;
const PROJECT_FILE_MIME_EXTENSIONS: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/zip": ".zip",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "text/plain": ".txt",
  "text/csv": ".csv",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx"
};

function projectInclude() {
  return {
    owner: { select: publicUserSelect },
    members: { include: { user: { select: publicUserSelect } } },
    applications: { include: { user: { select: publicUserSelect } }, orderBy: { updatedAt: "desc" as const } },
    files: {
      where: { isPinned: true },
      include: { uploader: { select: publicUserSelect } },
      orderBy: { createdAt: "desc" as const }
    }
  };
}

function inviteCode() {
  return randomUUID().replace(/-/g, "").slice(0, 16);
}

function canJoinProject(project: { status: string; isOpenToJoin: boolean }) {
  return project.isOpenToJoin && (project.status === "OPEN" || project.status === "IN_PROGRESS");
}

function canRequestInvite(project: { status: string }) {
  return project.status === "OPEN" || project.status === "IN_PROGRESS";
}

function canAccessProjectInvite(project: { ownerId?: string; members?: Array<{ userId?: string; user?: { id?: string } }> }, userId: string) {
  return project.ownerId === userId || Boolean(project.members?.some((member) => member.userId === userId || member.user?.id === userId));
}

function redactInviteCode<T extends { ownerId?: string; inviteCode?: string | null; members?: Array<{ userId?: string; user?: { id?: string } }> }>(project: T, userId: string): T {
  if (!canAccessProjectInvite(project, userId)) {
    return { ...project, inviteCode: null };
  }
  return project;
}

function nullableDate(value: string | null | undefined) {
  if (!value) return value === null ? null : undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw Object.assign(new Error("Invalid project date"), { status: 400 });
  }
  return date;
}

function projectData(input: z.infer<typeof projectUpdateSchema>) {
  return {
    ...input,
    deadlineAt: nullableDate(input.deadlineAt),
    startedAt: nullableDate(input.startedAt),
    completedAt: nullableDate(input.completedAt)
  };
}

function projectCreateData(input: z.infer<typeof projectSchema>) {
  return {
    title: input.title,
    description: input.description,
    techStack: input.techStack,
    requiredSkills: input.requiredSkills,
    status: input.status ?? "OPEN",
    isOpenToJoin: input.isOpenToJoin ?? true,
    deadlineAt: nullableDate(input.deadlineAt),
    startedAt: nullableDate(input.startedAt),
    completedAt: nullableDate(input.completedAt)
  };
}

async function addProjectHistory(projectId: string, userId: string, action: string, message: string) {
  await prisma.projectHistory.create({
    data: { projectId, userId, action, message }
  });
}

async function requireProjectMembership(projectId: string, userId: string) {
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } }
  });
  if (!membership) {
    throw Object.assign(new Error("Only project members can use this action"), { status: 403 });
  }
  return membership;
}

async function saveProjectUpload(req: Parameters<typeof readSingleFileUpload>[0], projectId: string) {
  const upload = await readSingleFileUpload(req, "file", MAX_PROJECT_FILE_BYTES);
  if (!upload) {
    throw Object.assign(new Error("File is required"), { status: 400 });
  }

  if (!PROJECT_FILE_MIME_EXTENSIONS[upload.mimeType]) {
    throw Object.assign(new Error("Unsupported file type"), { status: 400 });
  }

  const safeExtension = pickSafeExtension(upload.filename, upload.mimeType, PROJECT_FILE_MIME_EXTENSIONS);
  const filename = `${randomUUID()}${safeExtension}`;
  const filePath = await saveUploadedFile(upload, `projects/${projectId}`, filename);
  return { upload, filename, url: `${req.protocol}://${req.get("host")}${filePath}` };
}

export const listProjects = asyncHandler(async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  const tech = typeof req.query.tech === "string" ? req.query.tech.split(",").filter(Boolean) : [];
  const skills = typeof req.query.skills === "string" ? req.query.skills.split(",").filter(Boolean) : [];

  const projects = await prisma.project.findMany({
    where: {
      AND: [
        q ? { title: { contains: q, mode: "insensitive" } } : {},
        tech.length ? { techStack: { hasSome: tech } } : {},
        skills.length ? { requiredSkills: { hasSome: skills } } : {}
      ]
    },
    include: projectInclude(),
    orderBy: { createdAt: "desc" }
  });

  res.json({ projects: projects.map((project) => redactInviteCode(project, req.user!.userId)) });
});

export const createProject = asyncHandler(async (req, res) => {
  const input = projectSchema.parse(req.body);
  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        ...projectCreateData(input),
        inviteCode: inviteCode(),
        ownerId: req.user!.userId,
        members: { create: { userId: req.user!.userId, role: "owner" } }
      },
      include: projectInclude()
    });
    await tx.projectHistory.create({
      data: {
        projectId: created.id,
        userId: req.user!.userId,
        action: "created",
        message: "Project was created"
      }
    });
    return created;
  });
  res.status(201).json({ project: redactInviteCode(project, req.user!.userId) });
});

export const getProject = asyncHandler(async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: {
      ...projectInclude(),
      messages: {
        where: {
          hiddenFor: { none: { userId: req.user!.userId } }
        },
        include: {
          user: { select: publicUserSelect },
          files: { include: { uploader: { select: publicUserSelect } } }
        },
        orderBy: { createdAt: "asc" },
        take: 100
      },
      history: {
        include: { user: { select: publicUserSelect } },
        orderBy: { createdAt: "desc" },
        take: 30
      }
    }
  });

  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  return res.json({ project: redactInviteCode(project, req.user!.userId) });
});

export const updateProject = asyncHandler(async (req, res) => {
  const input = projectUpdateSchema.parse(req.body);
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }
  if (project.ownerId !== req.user!.userId) {
    return res.status(403).json({ message: "Only the owner can update this project" });
  }

  const updated = await prisma.project.update({
    where: { id: project.id },
    data: projectData(input),
    include: projectInclude()
  });
  await addProjectHistory(project.id, req.user!.userId, "updated", "Project details were updated");
  return res.json({ project: redactInviteCode(updated, req.user!.userId) });
});

export const deleteProject = asyncHandler(async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }
  if (project.ownerId !== req.user!.userId) {
    return res.status(403).json({ message: "Only the owner can delete this project" });
  }

  await prisma.project.delete({ where: { id: project.id } });
  return res.status(204).send();
});

export const leaveProject = asyncHandler(async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: { members: true }
  });

  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  if (project.ownerId === req.user!.userId) {
    return res.status(400).json({ message: "Project owner cannot leave their own project" });
  }

  const membership = project.members.find((member) => member.userId === req.user!.userId);
  if (!membership) {
    return res.status(404).json({ message: "Membership not found" });
  }

  await prisma.$transaction(async (tx) => {
    await tx.projectMember.deleteMany({
      where: { projectId: project.id, userId: req.user!.userId }
    });
    await tx.application
      .update({
        where: { projectId_userId: { projectId: project.id, userId: req.user!.userId } },
        data: { status: "WITHDRAWN" }
      })
      .catch(() => undefined);
    await tx.projectHistory.create({
      data: {
        projectId: project.id,
        userId: req.user!.userId,
        action: "left",
        message: "Left the project"
      }
    });
  });

  return res.status(204).send();
});

export const applyToProject = asyncHandler(async (req, res) => {
  const body = z.object({ note: z.string().max(1000).optional() }).parse(req.body);
  const application = await prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({ where: { id: req.params.id } });
    if (!project) {
      throw Object.assign(new Error("Project not found"), { status: 404 });
    }
    if (!canJoinProject(project)) {
      throw Object.assign(new Error("This project is not accepting applications"), { status: 403 });
    }

    const nextApplication = await tx.application.upsert({
      where: { projectId_userId: { projectId: req.params.id, userId: req.user!.userId } },
      update: { note: body.note, status: "ACCEPTED" },
      create: { projectId: req.params.id, userId: req.user!.userId, note: body.note, status: "ACCEPTED" }
    });

    await tx.projectMember.upsert({
      where: { projectId_userId: { projectId: req.params.id, userId: req.user!.userId } },
      update: {},
      create: { projectId: req.params.id, userId: req.user!.userId, role: "member" }
    });
    await tx.projectHistory.create({
      data: {
        projectId: req.params.id,
        userId: req.user!.userId,
        action: "joined",
        message: "Joined the project"
      }
    });

    return nextApplication;
  });
  return res.status(201).json({ application });
});

export const removeProjectMember = asyncHandler(async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: { members: true }
  });

  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  if (project.ownerId !== req.user!.userId) {
    return res.status(403).json({ message: "Only the owner can remove members" });
  }

  if (req.params.userId === project.ownerId) {
    return res.status(400).json({ message: "Project owner cannot be removed" });
  }

  const membership = project.members.find((member) => member.userId === req.params.userId);
  if (!membership) {
    return res.status(404).json({ message: "Member not found" });
  }

  await prisma.$transaction(async (tx) => {
    await tx.projectMember.deleteMany({
      where: { projectId: project.id, userId: req.params.userId }
    });
    await tx.application
      .update({
        where: { projectId_userId: { projectId: project.id, userId: req.params.userId } },
        data: { status: "REJECTED" }
      })
      .catch(() => undefined);
    await tx.projectHistory.create({
      data: {
        projectId: project.id,
        userId: req.user!.userId,
        action: "member_removed",
        message: "Removed a project member"
      }
    });
  });

  return res.status(204).send();
});

export const inviteStudentToProject = asyncHandler(async (req, res) => {
  const input = projectInviteSchema.parse(req.body);
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: { members: true }
  });

  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  if (!project.members.some((member) => member.userId === req.user!.userId)) {
    return res.status(403).json({ message: "Only project members can invite students" });
  }

  if (project.ownerId === input.userId) {
    return res.status(400).json({ message: "Project owner is already in this project" });
  }

  if (!canRequestInvite(project)) {
    return res.status(403).json({ message: "This project is not accepting invites" });
  }

  const targetUser = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!targetUser) {
    return res.status(404).json({ message: "Student not found" });
  }

  if (project.members.some((member) => member.userId === input.userId)) {
    return res.status(409).json({ message: "Student is already in this project" });
  }

  const existingNotification = await prisma.notification.findFirst({
    where: {
      userId: input.userId,
      actorId: req.user!.userId,
      projectId: project.id,
      type: "PROJECT_INVITE",
      readAt: null
    }
  });

  const notification = existingNotification ?? await prisma.notification.create({
    data: {
      userId: input.userId,
      actorId: req.user!.userId,
      projectId: project.id,
      type: "PROJECT_INVITE",
      message: "invited you to join their project"
    }
  });

  await addProjectHistory(project.id, req.user!.userId, "student_invited", `Invited ${targetUser.name} to the project`);

  return res.status(existingNotification ? 200 : 201).json({ notification });
});

export const uploadProjectFile = asyncHandler(async (req, res) => {
  await requireProjectMembership(req.params.id, req.user!.userId);
  const saved = await saveProjectUpload(req, req.params.id);

  const file = await prisma.projectFile.create({
    data: {
      projectId: req.params.id,
      uploaderId: req.user!.userId,
      originalName: saved.upload.filename,
      filename: saved.filename,
      mimeType: saved.upload.mimeType,
      size: saved.upload.size,
      url: saved.url,
      isPinned: true
    },
    include: { uploader: { select: publicUserSelect } }
  });
  await addProjectHistory(req.params.id, req.user!.userId, "file_pinned", `Pinned file: ${saved.upload.filename}`);

  return res.status(201).json({ file });
});

export const updateProjectFile = asyncHandler(async (req, res) => {
  const input = fileUpdateSchema.parse(req.body);
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }
  if (project.ownerId !== req.user!.userId) {
    return res.status(403).json({ message: "Only the owner can update project files" });
  }

  const file = await prisma.projectFile.update({
    where: { id: req.params.fileId },
    data: { isPinned: input.isPinned },
    include: { uploader: { select: publicUserSelect } }
  });
  await addProjectHistory(
    project.id,
    req.user!.userId,
    input.isPinned ? "file_pinned" : "file_unpinned",
    `${input.isPinned ? "Pinned" : "Unpinned"} file: ${file.originalName}`
  );

  return res.json({ file });
});

export const uploadChatFile = asyncHandler(async (req, res) => {
  await requireProjectMembership(req.params.id, req.user!.userId);
  const saved = await saveProjectUpload(req, req.params.id);

  const message = await prisma.chatMessage.create({
    data: {
      projectId: req.params.id,
      userId: req.user!.userId,
      body: `Shared a file: ${saved.upload.filename}`,
      files: {
        create: {
          projectId: req.params.id,
          uploaderId: req.user!.userId,
          originalName: saved.upload.filename,
          filename: saved.filename,
          mimeType: saved.upload.mimeType,
          size: saved.upload.size,
          url: saved.url
        }
      }
    },
    include: {
      user: { select: publicUserSelect },
      files: { include: { uploader: { select: publicUserSelect } } }
    }
  });
  await addProjectHistory(req.params.id, req.user!.userId, "chat_file_uploaded", `Uploaded file to chat: ${saved.upload.filename}`);

  return res.status(201).json({ message });
});

export const useProjectInvite = asyncHandler(async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { inviteCode: req.params.code },
    include: projectInclude()
  });

  if (!project) {
    return res.status(404).json({ message: "Invite link not found" });
  }

  const existingMembership = project.members.find((member) => member.userId === req.user!.userId);
  if (existingMembership) {
    return res.json({ action: "already_member", project: redactInviteCode(project, req.user!.userId) });
  }

  if (!canRequestInvite(project)) {
    return res.json({ action: "view_only", project: redactInviteCode(project, req.user!.userId) });
  }

  if (canJoinProject(project)) {
    await prisma.$transaction(async (tx) => {
      await tx.application.upsert({
        where: { projectId_userId: { projectId: project.id, userId: req.user!.userId } },
        update: { status: "ACCEPTED" },
        create: { projectId: project.id, userId: req.user!.userId, status: "ACCEPTED" }
      });
      await tx.projectMember.upsert({
        where: { projectId_userId: { projectId: project.id, userId: req.user!.userId } },
        update: {},
        create: { projectId: project.id, userId: req.user!.userId, role: "member" }
      });
    });

    const updated = await prisma.project.findUniqueOrThrow({ where: { id: project.id }, include: projectInclude() });
    return res.json({ action: "joined", project: redactInviteCode(updated, req.user!.userId) });
  }

  const application = await prisma.application.upsert({
    where: { projectId_userId: { projectId: project.id, userId: req.user!.userId } },
    update: { status: "PENDING" },
    create: { projectId: project.id, userId: req.user!.userId, status: "PENDING" }
  });

  const existingNotification = await prisma.notification.findFirst({
    where: {
      userId: project.ownerId,
      actorId: req.user!.userId,
      projectId: project.id,
      type: "INVITE_REQUEST",
      readAt: null
    }
  });

  if (!existingNotification) {
    await prisma.notification.create({
      data: {
        userId: project.ownerId,
        actorId: req.user!.userId,
        projectId: project.id,
        type: "INVITE_REQUEST",
        message: "wants to join your project via invite link"
      }
    });
  }

  return res.json({ action: "requested", application, project: redactInviteCode(project, req.user!.userId) });
});

export const regenerateProjectInvite = asyncHandler(async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }
  if (project.ownerId !== req.user!.userId) {
    return res.status(403).json({ message: "Only the owner can regenerate invite links" });
  }

  const updated = await prisma.project.update({
    where: { id: project.id },
    data: { inviteCode: inviteCode() },
    include: projectInclude()
  });

  return res.json({ project: updated });
});

export const updateProjectApplication = asyncHandler(async (req, res) => {
  const input = z.object({ status: z.enum(["ACCEPTED", "REJECTED"]) }).parse(req.body);
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }
  if (project.ownerId !== req.user!.userId) {
    return res.status(403).json({ message: "Only the owner can update applications" });
  }

  const application = await prisma.application.findUnique({
    where: { id: req.params.applicationId },
    include: { user: { select: publicUserSelect } }
  });
  if (!application || application.projectId !== project.id) {
    return res.status(404).json({ message: "Application not found" });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const nextApplication = await tx.application.update({
      where: { id: application.id },
      data: { status: input.status },
      include: { user: { select: publicUserSelect } }
    });

    if (input.status === "ACCEPTED") {
      await tx.projectMember.upsert({
        where: { projectId_userId: { projectId: project.id, userId: application.userId } },
        update: {},
        create: { projectId: project.id, userId: application.userId, role: "member" }
      });
    } else {
      await tx.projectMember.deleteMany({
        where: { projectId: project.id, userId: application.userId }
      });
    }

    await tx.notification.create({
      data: {
        userId: application.userId,
        actorId: req.user!.userId,
        projectId: project.id,
        type: input.status === "ACCEPTED" ? "APPLICATION_ACCEPTED" : "APPLICATION_REJECTED",
        message: input.status === "ACCEPTED" ? "accepted your project request" : "rejected your project request"
      }
    });

    return nextApplication;
  });

  return res.json({ application: updated });
});

export const updateChatMessage = asyncHandler(async (req, res) => {
  const input = messageUpdateSchema.parse(req.body);
  const message = await prisma.chatMessage.findUnique({
    where: { id: req.params.messageId },
    include: { project: true }
  });

  if (!message || message.projectId !== req.params.id) {
    return res.status(404).json({ message: "Message not found" });
  }

  await requireProjectMembership(message.projectId, req.user!.userId);
  if (message.userId !== req.user!.userId) {
    return res.status(403).json({ message: "Only the message author can edit this message" });
  }

  const updated = await prisma.chatMessage.update({
    where: { id: message.id },
    data: { body: input.body, editedAt: new Date() },
    include: {
      user: { select: publicUserSelect },
      files: { include: { uploader: { select: publicUserSelect } } }
    }
  });

  return res.json({ message: updated });
});

export const deleteChatMessage = asyncHandler(async (req, res) => {
  const input = messageDeleteSchema.parse(req.body);
  const message = await prisma.chatMessage.findUnique({
    where: { id: req.params.messageId },
    include: { project: true }
  });

  if (!message || message.projectId !== req.params.id) {
    return res.status(404).json({ message: "Message not found" });
  }

  await requireProjectMembership(message.projectId, req.user!.userId);
  if (input.scope === "everyone") {
    const canDeleteForEveryone = message.userId === req.user!.userId || message.project.ownerId === req.user!.userId;
    if (!canDeleteForEveryone) {
      return res.status(403).json({ message: "Only the author or project owner can delete this message for everyone" });
    }

    await prisma.chatMessage.delete({ where: { id: message.id } });
    return res.status(204).send();
  }

  await prisma.chatMessageHidden.upsert({
    where: { messageId_userId: { messageId: message.id, userId: req.user!.userId } },
    update: {},
    create: { messageId: message.id, userId: req.user!.userId }
  });

  return res.status(204).send();
});
