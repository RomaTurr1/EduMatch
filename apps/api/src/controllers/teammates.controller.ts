import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { toPublicUser } from "../utils/publicUser.js";

export const searchTeammates = asyncHandler(async (req, res) => {
  const skills = typeof req.query.skills === "string" ? req.query.skills.split(",").map((skill) => skill.trim()).filter(Boolean) : [];
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  const course = typeof req.query.course === "string" ? req.query.course : undefined;
  const university = typeof req.query.university === "string" ? req.query.university : undefined;
  const minRating = typeof req.query.rating === "string" ? Number(req.query.rating) : undefined;

  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: req.user!.userId } },
        q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { realName: { contains: q, mode: "insensitive" } },
                { specialty: { contains: q, mode: "insensitive" } }
              ]
            }
          : {},
        skills.length ? { skills: { hasEvery: skills } } : {},
        course ? { course: { contains: course, mode: "insensitive" } } : {},
        university ? { university: { contains: university, mode: "insensitive" } } : {},
        Number.isFinite(minRating) ? { rating: { gte: minRating } } : {}
      ]
    },
    orderBy: [{ rating: "desc" }, { name: "asc" }],
    take: 50
  });

  res.json({ teammates: users.map(toPublicUser) });
});

export const getTeammate = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      ownedProjects: {
        include: { members: true },
        orderBy: { updatedAt: "desc" },
        take: 6
      },
      memberships: {
        include: { project: { include: { members: true } } },
        orderBy: { joinedAt: "desc" },
        take: 8
      }
    }
  });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const projectsById = new Map<string, {
    id: string;
    title: string;
    description: string;
    status: string;
    techStack: string[];
    requiredSkills: string[];
    memberCount: number;
    role: string;
    updatedAt: Date;
  }>();

  for (const project of user.ownedProjects) {
    projectsById.set(project.id, {
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      techStack: project.techStack,
      requiredSkills: project.requiredSkills,
      memberCount: project.members.length,
      role: "owner",
      updatedAt: project.updatedAt
    });
  }

  for (const membership of user.memberships) {
    if (projectsById.has(membership.project.id)) continue;
    projectsById.set(membership.project.id, {
      id: membership.project.id,
      title: membership.project.title,
      description: membership.project.description,
      status: membership.project.status,
      techStack: membership.project.techStack,
      requiredSkills: membership.project.requiredSkills,
      memberCount: membership.project.members.length,
      role: membership.role,
      updatedAt: membership.project.updatedAt
    });
  }

  const projects = Array.from(projectsById.values())
    .sort((first, second) => second.updatedAt.getTime() - first.updatedAt.getTime())
    .slice(0, 6)
    .map(({ updatedAt: _updatedAt, ...project }) => project);

  res.json({ user: { ...toPublicUser(user), projects } });
});
