import { ArrowLeft, BriefcaseBusiness, FolderKanban, GraduationCap, Mail, MapPin, Star, UserRound, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { ProfileProject, User } from "../types/api";

type Props = {
  userId: string;
  returnProjectId?: string | null;
  onBackToProject: () => void;
  onOpenProject: (projectId: string) => void;
};

export function PublicProfilePage({ userId, returnProjectId, onBackToProject, onOpenProject }: Props) {
  const [profile, setProfile] = useState<User | null>(null);

  useEffect(() => {
    api<{ user: User }>(`/teammates/${userId}`)
      .then((result) => setProfile(result.user))
      .catch(console.error);
  }, [userId]);

  if (!profile) return <p>Loading profile...</p>;
  const displayName = profile.realName || profile.name;
  const projects = profile.projects ?? [];

  return (
    <section className="public-profile-page">
      <div className="public-profile-hero">
        <div className="public-profile-hero-copy">
          <div className="public-profile-heading">
            <div className="avatar large profile-picture">
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt={profile.name} /> : profile.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1>{displayName}</h1>
              <div className="public-profile-subline">
                <p>{profile.specialty || "Specialty not set"}</p>
                <div className="public-profile-meta">
                  <span><Mail size={13} /> {profile.email}</span>
                  <span><Star size={13} /> {profile.rating.toFixed(1)} rating</span>
                </div>
              </div>
            </div>
          </div>
          <div className="public-profile-inline-panels">
            <section className="public-profile-inline-panel about">
              <div className="section-title compact-title">
                <h2>About me</h2>
              </div>
              <p>{profile.bio || "No bio yet"}</p>
            </section>
            <section className="public-profile-inline-panel skills">
              <div className="section-title compact-title">
                <h2>Skills</h2>
              </div>
              <div className="tags">
                {profile.skills.length ? profile.skills.map((skill) => <span key={skill}>{skill}</span>) : <span>No skills yet</span>}
              </div>
            </section>
          </div>
        </div>

        <aside className="public-profile-summary-card">
          <div>
            <span>Profile snapshot</span>
            <strong>{profile.university || "University not set"}</strong>
            <small>{profile.course || "Course not set"}</small>
          </div>
          <div className="public-profile-facts compact">
            <div>
              <span><GraduationCap size={16} /> Course</span>
              <strong>{profile.course || "Not set"}</strong>
            </div>
            <div>
              <span><MapPin size={16} /> University</span>
              <strong>{profile.university || "Not set"}</strong>
            </div>
            <div>
              <span><BriefcaseBusiness size={16} /> Focus</span>
              <strong>{profile.specialty || "Not set"}</strong>
            </div>
            <div>
              <span><UserRound size={16} /> Age</span>
              <strong>{profile.age ?? "Not set"}</strong>
            </div>
          </div>
          {returnProjectId && (
            <button className="secondary compact" onClick={onBackToProject}>
              <ArrowLeft size={17} />
              Back to project
            </button>
          )}
        </aside>
      </div>
      <section className="public-profile-projects">
        <div className="section-title compact-title">
          <h2>My projects</h2>
        </div>
        <div className="public-profile-project-grid">
          {projects.length ? projects.map((project) => (
            <button className="public-profile-project-card" key={project.id} type="button" onClick={() => onOpenProject(project.id)}>
              <span className="project-profile-card-top">
                <span className="mini-icon"><FolderKanban size={18} /></span>
                <span className="status">{formatStatus(project.status)}</span>
              </span>
              <strong>{project.title}</strong>
              <p>{project.description}</p>
              <span className="project-profile-card-meta">
                <span><UsersRound size={14} /> {project.memberCount} members</span>
                <span>{project.role}</span>
              </span>
              <span className="project-profile-card-tags">
                {projectTags(project).slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
              </span>
            </button>
          )) : (
            <div className="public-profile-empty-projects">
              <FolderKanban size={18} />
              <span>No public project work yet</span>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}

function formatStatus(value: ProfileProject["status"]) {
  return value.toLowerCase().replace("_", " ");
}

function projectTags(project: ProfileProject) {
  return Array.from(new Set([...project.techStack, ...project.requiredSkills].filter(Boolean)));
}
