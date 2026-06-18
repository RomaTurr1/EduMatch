import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { publicUserSelect } from "../utils/selects.js";

const projectSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  techStack: z.array(z.string()).default([]),
  requiredSkills: z.array(z.string()).default([])
});

const projectUpdateSchema = projectSchema.partial().extend({
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "ARCHIVED"]).optional()
});

function projectInclude() {
  return {
    owner: { select: publicUserSelect },
    members: { include: { user: { select: publicUserSelect } } },
    applications: true
  };
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

  res.json({ projects });
});

export const createProject = asyncHandler(async (req, res) => {
  const input = projectSchema.parse(req.body);
  const project = await prisma.project.create({
    data: {
      ...input,
      ownerId: req.user!.userId,
      members: { create: { userId: req.user!.userId, role: "owner" } }
    },
    include: projectInclude()
  });
  res.status(201).json({ project });
});

export const getProject = asyncHandler(async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: {
      ...projectInclude(),
      messages: { include: { user: { select: publicUserSelect } }, orderBy: { createdAt: "asc" }, take: 100 }
    }
  });

  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  return res.json({ project });
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
    data: input,
    include: projectInclude()
  });
  return res.json({ project: updated });
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

export const applyToProject = asyncHandler(async (req, res) => {
  const body = z.object({ note: z.string().max(1000).optional() }).parse(req.body);
  const application = await prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({ where: { id: req.params.id } });
    if (!project) {
      throw Object.assign(new Error("Project not found"), { status: 404 });
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
  });

  return res.status(204).send();
});
