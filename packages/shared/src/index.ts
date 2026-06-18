export type Skill = string;

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  course?: string | null;
  university?: string | null;
  avatarUrl?: string | null;
  rating: number;
  skills: string[];
};

export type ProjectStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";

export type ProjectSummary = {
  id: string;
  title: string;
  description: string;
  techStack: string[];
  requiredSkills: string[];
  status: ProjectStatus;
  owner: PublicUser;
  memberCount: number;
};
