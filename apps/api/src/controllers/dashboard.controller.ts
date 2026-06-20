import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { publicUserSelect } from "../utils/selects.js";

export const getDashboard = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.userId } });
  const [myProjects, myApplications, candidateProjects] = await Promise.all([
    prisma.project.findMany({
      where: { OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }] },
      include: { owner: { select: publicUserSelect }, members: { include: { user: { select: publicUserSelect } } } },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.application.findMany({
      where: { userId: user.id },
      include: { project: { include: { owner: { select: publicUserSelect }, members: { include: { user: { select: publicUserSelect } } } } } },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.project.findMany({
      where: {
        ownerId: { not: user.id },
        status: "OPEN",
        members: { none: { userId: user.id } }
      },
      include: { owner: { select: publicUserSelect }, members: { include: { user: { select: publicUserSelect } } } },
      orderBy: { createdAt: "desc" },
      take: 50
    })
  ]);

  const userSkills = new Set(user.skills.map((skill) => skill.toLowerCase()));
  const specialty = user.specialty?.trim().toLowerCase();
  const recommendedProjects = candidateProjects
    .map((project) => {
      const requiredMatches = project.requiredSkills.filter((skill) => userSkills.has(skill.toLowerCase()));
      const techMatches = project.techStack.filter((skill) => userSkills.has(skill.toLowerCase()));
      const specialtyMatch = specialty
        ? [...project.requiredSkills, ...project.techStack, project.title, project.description].some((value) =>
            value.toLowerCase().includes(specialty)
          )
        : false;
      const matchSkills = Array.from(new Set([...requiredMatches, ...techMatches]));
      const matchScore = requiredMatches.length * 3 + techMatches.length * 2 + (specialtyMatch ? 1 : 0);
      return { ...project, matchScore, matchSkills };
    })
    .sort((first, second) => second.matchScore - first.matchScore || second.createdAt.getTime() - first.createdAt.getTime())
    .slice(0, 10);

  res.json({ myProjects, myApplications, recommendedProjects });
});
