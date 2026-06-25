import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { publicUserSelect } from "../utils/selects.js";

function canAccessProjectInvite(project: { ownerId?: string; members?: Array<{ userId?: string; user?: { id?: string } }> }, userId: string) {
  return project.ownerId === userId || Boolean(project.members?.some((member) => member.userId === userId || member.user?.id === userId));
}

function redactInviteCode<T extends { ownerId?: string; inviteCode?: string | null; members?: Array<{ userId?: string; user?: { id?: string } }> }>(project: T, userId: string): T {
  if (!canAccessProjectInvite(project, userId)) {
    return { ...project, inviteCode: null };
  }
  return project;
}

function normalizeCharacteristic(value: string) {
  return value.trim().toLowerCase();
}

function uniqueCharacteristics(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = normalizeCharacteristic(value);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

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
        status: { in: ["OPEN", "IN_PROGRESS"] },
        isOpenToJoin: true,
        members: { none: { userId: user.id } }
      },
      include: { owner: { select: publicUserSelect }, members: { include: { user: { select: publicUserSelect } } } },
      orderBy: { createdAt: "desc" },
      take: 50
    })
  ]);

  const userSkills = new Set(user.skills.map(normalizeCharacteristic));
  const specialty = user.specialty?.trim().toLowerCase();
  const recommendedProjects = candidateProjects
    .map((project) => {
      const requiredMatches = project.requiredSkills.filter((skill) => userSkills.has(normalizeCharacteristic(skill)));
      const techMatches = project.techStack.filter((skill) => userSkills.has(normalizeCharacteristic(skill)));
      const projectCharacteristics = uniqueCharacteristics([...project.requiredSkills, ...project.techStack]);
      const specialtyMatch = specialty
        ? [...project.requiredSkills, ...project.techStack, project.title, project.description].some((value) =>
            value.toLowerCase().includes(specialty)
          )
        : false;
      const matchSkills = Array.from(new Set([...requiredMatches, ...techMatches]));
      const matchScore = requiredMatches.length * 4 + techMatches.length * 3 + (specialtyMatch ? 2 : 0);
      const matchPercent = projectCharacteristics.length
        ? Math.round((matchSkills.length / projectCharacteristics.length) * 100)
        : 0;
      const matchReasons = [
        requiredMatches.length ? `Needed skills: ${requiredMatches.join(", ")}` : "",
        techMatches.length ? `Tech match: ${techMatches.join(", ")}` : "",
        specialtyMatch ? "Matches your specialty" : ""
      ].filter(Boolean);

      return { ...project, matchScore, matchPercent, matchSkills, matchReasons };
    })
    .filter((project) => project.matchScore > 0)
    .sort((first, second) => second.matchScore - first.matchScore || second.createdAt.getTime() - first.createdAt.getTime())
    .slice(0, 10);

  res.json({
    myProjects: myProjects.map((project) => redactInviteCode(project, user.id)),
    myApplications,
    recommendedProjects: recommendedProjects.map((project) => redactInviteCode(project, user.id))
  });
});
