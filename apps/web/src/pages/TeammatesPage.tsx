import { GraduationCap, Search, Star } from "lucide-react";
import { useState } from "react";
import { api } from "../services/api";
import type { User } from "../types/api";

export function TeammatesPage() {
  const [teammates, setTeammates] = useState<User[]>([]);

  async function search(formData: FormData) {
    const params = new URLSearchParams();
    ["skills", "course", "rating"].forEach((field) => {
      const value = String(formData.get(field) ?? "");
      if (value) params.set(field, value);
    });
    const result = await api<{ teammates: User[] }>(`/teammates?${params}`);
    setTeammates(result.teammates);
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Teammates</h1>
          <p>Find classmates by skills, course, and rating.</p>
        </div>
      </header>
      <form
        className="toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          void search(new FormData(event.currentTarget));
        }}
      >
        <label>
          <Search size={16} />
          <input name="skills" placeholder="Skills" />
        </label>
        <input name="course" placeholder="Course" />
        <input name="rating" type="number" min="0" step="0.1" placeholder="Min rating" />
        <button>Search</button>
      </form>
      <div className="grid">
        {teammates.map((user) => (
          <article className="person-card" key={user.id}>
            <div className="person-top">
              <div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div>
              <span className="rating"><Star size={14} />{user.rating.toFixed(1)}</span>
            </div>
            <h3>{user.name}</h3>
            <p><GraduationCap size={16} /> {user.course} · {user.university}</p>
            <div className="tags">{user.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
