import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { publicUserSelect } from "../utils/selects.js";

export const getDashboard = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.userId } });
  const [myProjects, myApplications, recommendedProjects] = await Promise.all([
    prisma.project.findMany({
      where: { OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }] },
      include: { owner: { select: publicUserSelect }, members: true },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.application.findMany({
      where: { userId: user.id },
      include: { project: { include: { owner: { select: publicUserSelect } } } },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.project.findMany({
      where: {
        ownerId: { not: user.id },
        status: "OPEN",
        OR: [
          { requiredSkills: { hasSome: user.skills } },
          { techStack: { hasSome: user.skills } }
        ]
      },
      include: { owner: { select: publicUserSelect }, members: true },
      orderBy: { createdAt: "desc" },
      take: 10
    })
  ]);

  res.json({ myProjects, myApplications, recommendedProjects });
});
