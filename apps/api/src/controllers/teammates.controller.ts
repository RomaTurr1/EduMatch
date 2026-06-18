import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { toPublicUser } from "../utils/publicUser.js";

export const searchTeammates = asyncHandler(async (req, res) => {
  const skills = typeof req.query.skills === "string" ? req.query.skills.split(",").filter(Boolean) : [];
  const course = typeof req.query.course === "string" ? req.query.course : undefined;
  const minRating = typeof req.query.rating === "string" ? Number(req.query.rating) : undefined;

  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: req.user!.userId } },
        skills.length ? { skills: { hasSome: skills } } : {},
        course ? { course: { contains: course, mode: "insensitive" } } : {},
        Number.isFinite(minRating) ? { rating: { gte: minRating } } : {}
      ]
    },
    orderBy: [{ rating: "desc" }, { name: "asc" }],
    take: 50
  });

  res.json({ teammates: users.map(toPublicUser) });
});
