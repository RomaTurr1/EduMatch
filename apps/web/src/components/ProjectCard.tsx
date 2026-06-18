import { MessageSquare, Star, Users } from "lucide-react";
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
        <span className="rating">
          <Star size={14} />
          {project.owner.rating.toFixed(1)}
        </span>
      </div>
      <h3>{project.title}</h3>
      <p>{project.description}</p>
      <div className="tags">
        {[...project.techStack, ...project.requiredSkills].slice(0, 8).map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <div className="card-actions">
        <span className="card-meta">
          <Users size={16} />
          {project.members?.length ?? 0}
        </span>
        <span className="card-meta">
          <MessageSquare size={16} />
          Chat
        </span>
        <button onClick={() => onOpen(project)}>Open</button>
      </div>
    </article>
  );
}
