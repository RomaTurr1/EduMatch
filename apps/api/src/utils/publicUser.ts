import type { User } from "@prisma/client";

export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    bio: user.bio,
    course: user.course,
    university: user.university,
    avatarUrl: user.avatarUrl,
    skills: user.skills,
    rating: user.rating
  };
}
