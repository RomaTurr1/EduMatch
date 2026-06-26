export type User = {
  id: string;
  email: string;
  name: string;
  realName?: string | null;
  age?: number | null;
  specialty?: string | null;
  bio?: string | null;
  course?: string | null;
  university?: string | null;
  avatarUrl?: string | null;
  skills: string[];
  rating: number;
  projects?: ProfileProject[];
};

export type ProfileProject = {
  id: string;
  title: string;
  description: string;
  status: Project["status"];
  techStack: string[];
  requiredSkills: string[];
  memberCount: number;
  role: string;
};

export type Project = {
  id: string;
  title: string;
  description: string;
  techStack: string[];
  requiredSkills: string[];
  status: "OPEN" | "IN_PROGRESS" | "PAUSED" | "COMPLETED" | "ARCHIVED";
  isOpenToJoin: boolean;
  inviteCode?: string | null;
  owner: User;
  members: Array<{ id: string; role: string; user: User }>;
  applications?: Application[];
  files?: ProjectFile[];
  history?: ProjectHistory[];
  messages?: ChatMessage[];
  deadlineAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  matchScore?: number;
  matchPercent?: number;
  matchSkills?: string[];
  matchReasons?: string[];
  hasPersonalInvite?: boolean;
};

export type Application = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
  note?: string | null;
  project: Project;
  user?: User;
};

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  editedAt?: string | null;
  user: User;
  files?: ProjectFile[];
};

export type ProjectFile = {
  id: string;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  isPinned: boolean;
  createdAt: string;
  uploader: User;
};

export type ProjectHistory = {
  id: string;
  action: string;
  message: string;
  createdAt: string;
  user: User;
};

export type Notification = {
  id: string;
  type: string;
  message: string;
  readAt?: string | null;
  createdAt: string;
  actor?: User | null;
  project?: Project | null;
};

export type AuthPayload = {
  user: User;
  accessToken: string;
  refreshToken: string;
};
