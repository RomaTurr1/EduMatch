export type User = {
  id: string;
  email: string;
  name: string;
  bio?: string | null;
  course?: string | null;
  university?: string | null;
  avatarUrl?: string | null;
  skills: string[];
  rating: number;
};

export type Project = {
  id: string;
  title: string;
  description: string;
  techStack: string[];
  requiredSkills: string[];
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";
  owner: User;
  members: Array<{ id: string; role: string; user: User }>;
  messages?: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

export type Application = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
  note?: string | null;
  project: Project;
};

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  user: User;
};

export type AuthPayload = {
  user: User;
  accessToken: string;
  refreshToken: string;
};
