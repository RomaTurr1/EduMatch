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
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({ user: toPublicUser(user) });
});
