import { FolderKanban, Send, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { Application, Project } from "../types/api";
import { ProjectCard } from "../components/ProjectCard";

type Props = {
  onOpenProject: (project: Project) => void;
};

type Dashboard = {
  myProjects: Project[];
  myApplications: Application[];
  recommendedProjects: Project[];
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn"
};

export function DashboardPage({ onOpenProject }: Props) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);

  useEffect(() => {
    api<Dashboard>("/dashboard").then(setDashboard).catch(console.error);
  }, []);

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Projects you own, applications in motion, and recommendations.</p>
        </div>
      </header>
      <div className="metrics">
        <div><FolderKanban size={20} /><strong>{dashboard?.myProjects.length ?? 0}</strong><span>My projects</span></div>
        <div><Send size={20} /><strong>{dashboard?.myApplications.length ?? 0}</strong><span>Applications</span></div>
        <div><Sparkles size={20} /><strong>{dashboard?.recommendedProjects.length ?? 0}</strong><span>Recommended</span></div>
      </div>

      {(dashboard?.myProjects.length ?? 0) > 0 && (
        <>
          <div className="section-title">
            <h2>My Projects</h2>
            <span>Projects you own or participate in</span>
          </div>
          <div className="grid">
            {dashboard!.myProjects.map((project) => (
              <ProjectCard key={project.id} project={project} onOpen={onOpenProject} />
            ))}
          </div>
        </>
      )}

      {(dashboard?.myApplications.length ?? 0) > 0 && (
        <>
          <div className="section-title">
            <h2>My Applications</h2>
            <span>Teams you have applied to join</span>
          </div>
          <div className="member-list" style={{ marginBottom: 24 }}>
            {dashboard!.myApplications.map((application) => (
              <div key={application.id}>
                <span
                  style={{ cursor: "pointer", fontWeight: 700 }}
                  onClick={() => onOpenProject(application.project)}
                >
                  {application.project.title}
                </span>
                <span className="status">{STATUS_LABEL[application.status] ?? application.status}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-title">
        <h2>Recommended Projects</h2>
        <span>Fresh matches for your skills</span>
      </div>
      {dashboard && dashboard.recommendedProjects.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>
          No recommendations yet — add skills to your profile to get matches.
        </p>
      ) : (
        <div className="grid">
          {dashboard?.recommendedProjects.map((project) => (
            <ProjectCard key={project.id} project={project} onOpen={onOpenProject} />
          ))}
        </div>
      )}
    </section>
  );
}
