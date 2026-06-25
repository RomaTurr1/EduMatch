import { ArrowRight, FolderKanban, Send, Sparkles, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { ProjectCard } from "../components/ProjectCard";
import { api } from "../services/api";
import type { Application, Project } from "../types/api";

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

function formatShortDate(value?: string | null) {
  if (!value) return "No deadline";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

export function DashboardPage({ onOpenProject }: Props) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);

  useEffect(() => {
    api<Dashboard>("/dashboard").then(setDashboard).catch(console.error);
  }, []);

  const myProjects = dashboard?.myProjects ?? [];
  const myApplications = dashboard?.myApplications ?? [];
  const recommendedProjects = dashboard?.recommendedProjects ?? [];
  const featuredProject = myProjects[0] ?? recommendedProjects[0] ?? null;
  const activeProjects = myProjects.filter((project) => project.status === "OPEN" || project.status === "IN_PROGRESS").length;
  const pendingApplications = myApplications.filter((application) => application.status === "PENDING").length;
  const topRecommendations = recommendedProjects.slice(0, 3);

  return (
    <section className="dashboard-page">
      <header className="page-header dashboard-hero">
        <div>
          <span className="status">Today overview</span>
          <h1>Dashboard</h1>
          <p>Track project rooms, pending joins, and the best matches for your current skills.</p>
          <div className="dashboard-quick-stats">
            <span><FolderKanban size={15} /> {myProjects.length} rooms</span>
            <span><Send size={15} /> {pendingApplications} pending</span>
            <span><Sparkles size={15} /> {recommendedProjects.length} matches</span>
          </div>
        </div>
        {featuredProject && (
          <button className="dashboard-featured" onClick={() => onOpenProject(featuredProject)}>
            <div>
              <span>Continue working</span>
              <strong>{featuredProject.title}</strong>
              <small>{featuredProject.members.length} members · {featuredProject.status.toLowerCase().replace("_", " ")}</small>
            </div>
            <ArrowRight size={18} />
          </button>
        )}
      </header>

      <div className="dashboard-layout">
        <main className="dashboard-main">
          {myProjects.length > 0 && (
            <section className="dashboard-panel">
              <div className="section-title compact-title">
                <h2>My Projects</h2>
                <span>Rooms you own or participate in</span>
              </div>
              <div className="dashboard-project-grid">
                {myProjects.slice(0, 4).map((project) => (
                  <ProjectCard key={project.id} project={project} onOpen={onOpenProject} />
                ))}
              </div>
            </section>
          )}

          <section className="dashboard-panel">
            <div className="section-title compact-title">
              <h2>Recommended Projects</h2>
              <span>Ranked by shared skills</span>
            </div>
            {dashboard && recommendedProjects.length === 0 ? (
              <p className="empty-state">No recommendations yet. Add skills to your profile to get matches.</p>
            ) : (
              <div className="dashboard-recommendation-grid">
                {topRecommendations.map((project) => (
                  <button key={project.id} onClick={() => onOpenProject(project)}>
                    <div className="recommendation-card-top">
                      <span className="status">{project.matchPercent ?? 0}% match</span>
                      <small>{project.members.length} members</small>
                    </div>
                    <strong>{project.title}</strong>
                    <small>{project.matchReasons?.[0] ?? "Matches your profile"}</small>
                    <div className="recommendation-meta">
                      <span>{project.status.toLowerCase().replace("_", " ")}</span>
                      <span>{formatShortDate(project.deadlineAt)}</span>
                    </div>
                    <div className="recommendation-tags">
                      {(project.matchSkills?.length ? project.matchSkills : [...project.requiredSkills, ...project.techStack]).slice(0, 2).map((skill) => (
                        <span key={skill}>{skill}</span>
                      ))}
                    </div>
                    <p>{project.requiredSkills.slice(0, 2).join(", ") || project.techStack.slice(0, 2).join(", ") || "Open role"}</p>
                    <ArrowRight size={18} />
                  </button>
                ))}
              </div>
            )}
          </section>
        </main>

        <aside className="dashboard-side">
          <section className="dashboard-panel dashboard-next">
            <div className="mini-icon"><UsersRound size={20} /></div>
            <h2>Next Up</h2>
            <p>Use Students search to invite classmates into your active project rooms.</p>
          </section>

          {myApplications.length > 0 && (
            <section className="dashboard-panel">
              <div className="section-title compact-title">
                <h2>Applications</h2>
                <span>{myApplications.length} total</span>
              </div>
              <div className="dashboard-application-list">
                {myApplications.slice(0, 5).map((application) => (
                  <button key={application.id} onClick={() => onOpenProject(application.project)}>
                    <strong>{application.project.title}</strong>
                    <span className="status">{STATUS_LABEL[application.status] ?? application.status}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="dashboard-panel dashboard-snapshot">
            <h2>Workspace Snapshot</h2>
            <div><span>Active rooms</span><strong>{activeProjects}</strong></div>
            <div><span>Pending joins</span><strong>{pendingApplications}</strong></div>
            <div><span>Best matches</span><strong>{topRecommendations.length}</strong></div>
          </section>
        </aside>
      </div>

      {!dashboard && (
        <div className="dashboard-panel">
          <p className="empty-state">Loading dashboard...</p>
        </div>
      )}

      {dashboard && myProjects.length === 0 && recommendedProjects.length === 0 && myApplications.length === 0 && (
        <div className="dashboard-panel dashboard-empty">
          <Sparkles size={24} />
          <h2>Your workspace is ready</h2>
          <p>Create a project or fill out your profile skills to start seeing recommendations.</p>
        </div>
      )}
    </section>
  );
}
