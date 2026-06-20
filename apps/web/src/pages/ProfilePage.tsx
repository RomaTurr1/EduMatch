import { Bell, GraduationCap, Palette, Pencil, Save, Settings, UserRound } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { api, apiFormData } from "../services/api";
import type { User } from "../types/api";

type Props = {
  user: User;
  onUpdate: (user: User) => void;
};

export function ProfilePage({ user, onUpdate }: Props) {
  const [avatarPreview, setAvatarPreview] = useState(user.avatarUrl ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    setSaveError("");
    setSaveMessage("");

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  async function save(formData: FormData) {
    setSaveError("");
    setSaveMessage("");

    try {
      let nextAvatarUrl = avatarPreview || null;
      if (avatarFile) {
        const avatarData = new FormData();
        avatarData.set("avatar", avatarFile);
        const upload = await apiFormData<{ avatarUrl: string; user: User }>("/profile/avatar", avatarData);
        nextAvatarUrl = upload.avatarUrl;
        setAvatarFile(null);
        setAvatarPreview(upload.avatarUrl);
      }

      const result = await api<{ user: User }>("/profile/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: String(formData.get("name")),
          realName: nullableString(formData.get("realName")),
          age: nullableNumber(formData.get("age")),
          specialty: nullableString(formData.get("specialty")),
          bio: String(formData.get("bio")),
          course: String(formData.get("course")),
          university: String(formData.get("university")),
          avatarUrl: nextAvatarUrl,
          skills: String(formData.get("skills") || "")
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean)
        })
      });
      onUpdate(result.user);
      setSaveMessage("Profile saved");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save profile");
    }
  }

  return (
    <section className="profile-settings-page">
      <aside className="settings-sidebar">
        <div className="settings-user">
          <div className="avatar">
            {avatarPreview ? <img src={avatarPreview} alt={user.name} /> : user.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>
        </div>
        <nav aria-label="Profile settings">
          <button className="active" type="button"><UserRound size={17} />Public profile</button>
          <button type="button"><Settings size={17} />Account</button>
          <button type="button"><Palette size={17} />Appearance</button>
          <button type="button"><Bell size={17} />Notifications</button>
        </nav>
      </aside>
      <form
        className="profile-form"
        onSubmit={(event) => {
          event.preventDefault();
          void save(new FormData(event.currentTarget));
        }}
      >
        <div className="settings-form-header">
          <div>
            <h1>Public profile</h1>
            <p>Update the information teammates see when they find you.</p>
          </div>
        </div>
        <div className="settings-form-grid">
          <div className="settings-fields">
            <label>
              <span>Name</span>
              <input name="name" defaultValue={user.name} placeholder="Name" />
            </label>
            <label>
              <span>Real name</span>
              <input name="realName" defaultValue={user.realName ?? ""} placeholder="Full name" />
            </label>
            <label>
              <span>Age</span>
              <input name="age" type="number" min={13} max={100} defaultValue={user.age ?? ""} placeholder="Age" />
            </label>
            <label>
              <span>Specialty</span>
              <input name="specialty" defaultValue={user.specialty ?? ""} placeholder="Frontend, Backend, Data Science" />
            </label>
            <label>
              <span>Course</span>
              <input name="course" defaultValue={user.course ?? ""} placeholder="Course" />
            </label>
            <label>
              <span>University</span>
              <input name="university" defaultValue={user.university ?? ""} placeholder="University" />
            </label>
            <label>
              <span>Bio</span>
              <textarea name="bio" defaultValue={user.bio ?? ""} placeholder="Tell teammates a little about yourself" />
            </label>
            <label>
              <span>Skills</span>
              <input name="skills" defaultValue={user.skills.join(", ")} placeholder="React, Node, UI" />
            </label>
          </div>
          <aside className="profile-picture-panel">
            <h2>Profile picture</h2>
            <div className="profile-picture-control">
              <div className="avatar large profile-picture">
                {avatarPreview ? <img src={avatarPreview} alt={user.name} /> : user.name.slice(0, 1).toUpperCase()}
              </div>
              <label className="avatar-edit-button">
                <Pencil size={16} />
                <span>Edit</span>
                <input name="avatarFile" type="file" accept="image/*" onChange={handleAvatarChange} />
              </label>
            </div>
            <p><GraduationCap size={16} /> {user.course || "Course not set"} · {user.university || "University not set"}</p>
          </aside>
        </div>
        <div className="settings-actions">
          <button className="primary compact" type="submit"><Save size={18} />Save profile</button>
        </div>
        {saveError && <p className="error">{saveError}</p>}
        {saveMessage && <p className="success-text">{saveMessage}</p>}
      </form>
    </section>
  );
}

function nullableString(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function nullableNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? Number(text) : null;
}
