import { Calendar, Lock, Sparkles, Unlock, UserRound, Users } from "lucide-react";
import type { Project } from "../types/api";

type Props = {
  project: Project;
  onOpen: (project: Project) => void;
};

export function ProjectCard({ project, onOpen }: Props) {
  const matchSkills = new Set(project.matchSkills?.map(normalizeTag) ?? []);
  const tags = Array.from(new Set([...project.techStack, ...project.requiredSkills])).slice(0, 8);

  return (
    <article className="project-card clickable" onClick={() => onOpen(project)} tabIndex={0} role="button" onKeyDown={(event) => event.key === "Enter" && onOpen(project)}>
      <div className="card-header">
        <span className="status">{project.status.replace("_", " ")}</span>
        <span className={`status ${project.isOpenToJoin ? "" : "muted-status"}`}>
          {project.isOpenToJoin ? <Unlock size={13} /> : <Lock size={13} />}
          {project.isOpenToJoin ? "Recruiting" : "Closed"}
        </span>
      </div>
      <h3>{project.title}</h3>
      <p>{project.description}</p>
      <div className="project-card-meta">
        <span><UserRound size={14} /> {project.owner.name}</span>
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
      <div className="card-actions">
        <span className="card-meta">
          <Users size={16} />
          {project.members?.length ?? 0}
        </span>
        <span className="card-open-label">Open project</span>
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
