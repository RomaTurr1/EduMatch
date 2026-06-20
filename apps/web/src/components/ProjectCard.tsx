import { ArrowRight, Calendar, Sparkles, Users } from "lucide-react";
import type { Project } from "../types/api";

type Props = {
  project: Project;
  onOpen: (project: Project) => void;
};

export function ProjectCard({ project, onOpen }: Props) {
  return (
    <article className="project-card">
      <div className="card-header">
        <span className="status">{project.status.replace("_", " ")}</span>
      </div>
      <h3>{project.title}</h3>
      <p>{project.description}</p>
      <div className="project-card-meta">
        <span><Calendar size={14} /> Created {formatDate(project.createdAt)}</span>
        {project.deadlineAt && <span><Calendar size={14} /> Due {formatDate(project.deadlineAt)}</span>}
        {project.matchScore !== undefined && project.matchScore > 0 && (
          <span><Sparkles size={14} /> {project.matchScore} match points</span>
        )}
      </div>
      <div className="tags">
        {[...project.techStack, ...project.requiredSkills].slice(0, 8).map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
        {project.matchSkills?.map((tag) => (
          <span key={`match-${tag}`}>Match: {tag}</span>
        ))}
      </div>
      <div className="card-actions">
        <span className="card-meta">
          <Users size={16} />
          {project.members?.length ?? 0}
        </span>
        <button onClick={() => onOpen(project)}>Open <ArrowRight size={16} /></button>
      </div>
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
