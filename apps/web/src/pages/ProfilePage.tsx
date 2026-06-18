import { GraduationCap, Save, Sparkles } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { api } from "../services/api";
import type { User } from "../types/api";

type Props = {
  user: User;
  onUpdate: (user: User) => void;
};

export function ProfilePage({ user, onUpdate }: Props) {
  const [avatarPreview, setAvatarPreview] = useState(user.avatarUrl ?? "");

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  async function save(formData: FormData) {
    const result = await api<{ user: User }>("/profile/me", {
      method: "PATCH",
      body: JSON.stringify({
        name: String(formData.get("name")),
        bio: String(formData.get("bio")),
        course: String(formData.get("course")),
        university: String(formData.get("university")),
        avatarUrl: avatarPreview || null,
        skills: String(formData.get("skills") || "")
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean)
      })
    });
    onUpdate(result.user);
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Profile</h1>
          <p>Keep your student profile current for better matches.</p>
        </div>
      </header>
      <form
        className="profile-form"
        onSubmit={(event) => {
          event.preventDefault();
          void save(new FormData(event.currentTarget));
        }}
      >
        <div className="profile-summary">
          <div className="avatar large">
            {avatarPreview ? <img src={avatarPreview} alt={user.name} /> : user.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <span className="eyebrow"><Sparkles size={15} /> Match profile</span>
            <h2>{user.name}</h2>
            <p><GraduationCap size={16} /> {user.course || "Course not set"} · {user.university || "University not set"}</p>
          </div>
        </div>
        <label className="file-upload">
          <span>Upload profile photo</span>
          <input name="avatarFile" type="file" accept="image/*" onChange={handleAvatarChange} />
        </label>
        <div className="form-grid">
          <input name="name" defaultValue={user.name} placeholder="Name" />
          <input name="course" defaultValue={user.course ?? ""} placeholder="Course" />
          <input name="university" defaultValue={user.university ?? ""} placeholder="University" />
        </div>
        <textarea name="bio" defaultValue={user.bio ?? ""} placeholder="Bio" />
        <input name="skills" defaultValue={user.skills.join(", ")} placeholder="Skills" />
        <button className="primary" type="submit"><Save size={18} />Save profile</button>
      </form>
    </section>
  );
}
