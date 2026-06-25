import { ArrowLeft, BriefcaseBusiness, GraduationCap, Mail, MapPin, Star, UserRound } from "lucide-react";
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
    <section className="public-profile-page">
      <aside className="public-profile-sidebar">
        <div className="avatar large profile-picture">
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt={profile.name} /> : profile.name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <span className="status">Student profile</span>
          <h1>{profile.realName || profile.name}</h1>
          <p>{profile.specialty || "Specialty not set"}</p>
        </div>
        <div className="public-profile-contact">
          <span><Mail size={16} /> {profile.email}</span>
          <span><Star size={16} /> {profile.rating.toFixed(1)} rating</span>
        </div>
        {returnProjectId && (
          <button className="secondary compact" onClick={onBackToProject}>
            <ArrowLeft size={17} />
            Back to project
          </button>
        )}
      </aside>

      <div className="public-profile-main">
        <div className="public-profile-details">
          <div>
            <span>Course</span>
            <strong><GraduationCap size={17} /> {profile.course || "Not set"}</strong>
          </div>
          <div>
            <span>University</span>
            <strong><MapPin size={17} /> {profile.university || "Not set"}</strong>
          </div>
          <div>
            <span>Age</span>
            <strong>{profile.age ?? "Not set"}</strong>
          </div>
          <div>
            <span>Focus</span>
            <strong><BriefcaseBusiness size={17} /> {profile.specialty || "Not set"}</strong>
          </div>
        </div>

        <section className="public-profile-panel">
          <div className="section-title compact-title">
            <h2>About</h2>
            <span><UserRound size={14} /> Bio</span>
          </div>
          <p>{profile.bio || "No bio yet"}</p>
        </section>

        <section className="public-profile-panel">
          <div className="section-title compact-title">
            <h2>Skills</h2>
            <span>{profile.skills.length} selected</span>
          </div>
          <div className="tags">
            {profile.skills.length ? profile.skills.map((skill) => <span key={skill}>{skill}</span>) : <span>No skills yet</span>}
          </div>
        </section>
      </div>
    </section>
  );
}
