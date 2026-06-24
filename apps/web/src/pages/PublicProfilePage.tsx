import { ArrowLeft, GraduationCap, Mail, Star, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { User } from "../types/api";

type Props = {
  userId: string;
  returnProjectId?: string | null;
  onBackToProject: () => void;
};

export function PublicProfilePage({ userId, returnProjectId, onBackToProject }: Props) {
  const [profile, setProfile] = useState<User | null>(null);

  useEffect(() => {
    api<{ user: User }>(`/teammates/${userId}`)
      .then((result) => setProfile(result.user))
      .catch(console.error);
  }, [userId]);

  if (!profile) return <p>Loading profile...</p>;

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>{profile.name}</h1>
          <p>{profile.specialty || profile.course || "Potential teammate"}</p>
        </div>
        {returnProjectId && (
          <button className="secondary compact" onClick={onBackToProject}>
            <ArrowLeft size={17} />
            Back to project
          </button>
        )}
      </header>
      <div className="profile-view">
        <div className="profile-summary">
          <div className="avatar large">
            {profile.avatarUrl ? <img src={profile.avatarUrl} alt={profile.name} /> : profile.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h2>{profile.realName || profile.name}</h2>
            <p><Mail size={16} /> {profile.email}</p>
            <p><GraduationCap size={16} /> {profile.course || "Course not set"} · {profile.university || "University not set"}</p>
            <p><Star size={16} /> {profile.rating.toFixed(1)} rating</p>
          </div>
        </div>
        <div className="member-list">
          <div><span><strong>Specialty</strong></span><span>{profile.specialty || "Not set"}</span></div>
          <div><span><strong>Age</strong></span><span>{profile.age ?? "Not set"}</span></div>
          <div><span><strong>Bio</strong></span><span>{profile.bio || "No bio yet"}</span></div>
        </div>
        <div className="section-title compact-title">
          <h2>Skills</h2>
          <span><UserRound size={14} /> Profile</span>
        </div>
        <div className="tags">
          {profile.skills.length ? profile.skills.map((skill) => <span key={skill}>{skill}</span>) : <span>No skills yet</span>}
        </div>
      </div>
    </section>
  );
}
