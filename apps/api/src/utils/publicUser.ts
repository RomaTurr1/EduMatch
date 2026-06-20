import type { User } from "@prisma/client";

export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    realName: user.realName,
    age: user.age,
    specialty: user.specialty,
    bio: user.bio,
    course: user.course,
    university: user.university,
    avatarUrl: user.avatarUrl,
    skills: user.skills,
    rating: user.rating
  };
}
