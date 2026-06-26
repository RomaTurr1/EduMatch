import { Calendar, Lock, Sparkles, Unlock, UserRound, Users } from "lucide-react";
import type { Project, User } from "../types/api";

type Props = {
  project: Project;
  currentUser?: User;
  onOpen: (project: Project) => void;
};

export function ProjectCard({ project, currentUser, onOpen }: Props) {
  const matchSkills = new Set(project.matchSkills?.map(normalizeTag) ?? []);
  const tags = Array.from(new Set([...project.techStack, ...project.requiredSkills])).slice(0, 8);
  const isMyProject = currentUser ? project.owner.id === currentUser.id : false;

  return (
    <article className="project-card clickable" onClick={() => onOpen(project)} tabIndex={0} role="button" onKeyDown={(event) => event.key === "Enter" && onOpen(project)}>
      <div className="card-header">
        <div className="project-card-status-group">
          <span className="status">{project.status.replace("_", " ")}</span>
          {isMyProject && <span className="status project-card-my-status">MY</span>}
        </div>
        <span className={`status ${project.isOpenToJoin ? "" : "muted-status"}`}>
          {project.isOpenToJoin ? <Unlock size={13} /> : <Lock size={13} />}
          {project.isOpenToJoin ? "Recruiting" : "Closed"}
        </span>
      </div>
      <h3>{project.title}</h3>
      <p className="project-card-description">{project.description}</p>
      <div className="project-card-meta">
        <span><UserRound size={14} /> {displayName(project.owner.name)}</span>
        <span><Users size={14} /> {project.members?.length ?? 0} members</span>
        <span><Calendar size={14} /> Created {formatDate(project.createdAt)}</span>
        {project.deadlineAt && <span><Calendar size={14} /> Due {formatDate(project.deadlineAt)}</span>}
        {project.matchScore !== undefined && project.matchScore > 0 && (
          <span><Sparkles size={14} /> {project.matchScore} match points</span>
        )}
        {project.matchPercent !== undefined && project.matchPercent > 0 && (
          <span><Sparkles size={14} /> {project.matchPercent}% match</span>
        )}
      </div>
      <div className="tags">
        {tags.map((tag) => (
          <span className={matchSkills.has(normalizeTag(tag)) ? "matched" : ""} key={tag}>{tag}</span>
        ))}
      </div>
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function normalizeTag(value: string) {
  return value.trim().toLowerCase();
}

function displayName(value: string) {
  return value.length > 18 ? `${value.slice(0, 18)}...` : value;
}
