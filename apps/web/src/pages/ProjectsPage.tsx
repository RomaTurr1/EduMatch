import { Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { ProjectCard } from "../components/ProjectCard";
import { TagSelect } from "../components/TagSelect";
import { SKILL_OPTIONS, TECH_STACK_OPTIONS } from "../constants/skillOptions";
import { api } from "../services/api";
import type { Project } from "../types/api";

type Props = {
  onOpenProject: (project: Project) => void;
};

export function ProjectsPage({ onOpenProject }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filters, setFilters] = useState({ q: "", tech: "", skills: "" });
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState("");

  async function loadProjects() {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    const result = await api<{ projects: Project[] }>(`/projects?${params}`);
    setProjects(result.projects);
  }

  useEffect(() => {
    loadProjects().catch(console.error);
  }, []);

  async function createProject(formData: FormData) {
    setCreateError("");
    try {
      await api<{ project: Project }>("/projects", {
        method: "POST",
        body: JSON.stringify({
          title: String(formData.get("title")),
          description: String(formData.get("description")),
          techStack: selectedList(formData, "techStack"),
          requiredSkills: selectedList(formData, "requiredSkills"),
          status: String(formData.get("status") || "OPEN"),
          isOpenToJoin: formData.get("isOpenToJoin") === "on",
          deadlineAt: nullableDate(formData.get("deadlineAt")),
          startedAt: nullableDate(formData.get("startedAt")),
          completedAt: nullableDate(formData.get("completedAt"))
        })
      });
      setShowCreate(false);
      await loadProjects();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Could not create project");
    }
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Projects</h1>
          <p>Search by title, technology stack, or skills.</p>
        </div>
        <button className="primary compact" onClick={() => setShowCreate((value) => !value)} title="Create project">
          <Plus size={18} />
          New
        </button>
      </header>
      <div className="toolbar">
        <label>
          <Search size={16} />
          <input
            value={filters.q}
            onChange={(event) => setFilters({ ...filters, q: event.target.value })}
            placeholder="Title"
          />
        </label>
        <input
          value={filters.tech}
          onChange={(event) => setFilters({ ...filters, tech: event.target.value })}
          placeholder="Tech stack"
        />
        <input
          value={filters.skills}
          onChange={(event) => setFilters({ ...filters, skills: event.target.value })}
          placeholder="Skills"
        />
        <button onClick={loadProjects}>Filter</button>
      </div>
      {showCreate && (
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            void createProject(new FormData(event.currentTarget));
          }}
        >
          <input name="title" placeholder="Project title" required minLength={3} />
          <textarea name="description" placeholder="Description, at least 10 characters" required minLength={10} />
          <TagSelect name="techStack" label="Tech stack" options={TECH_STACK_OPTIONS} />
          <TagSelect name="requiredSkills" label="Required skills" options={SKILL_OPTIONS} />
          <div className="form-grid">
            <label>
              <span>Status</span>
              <select name="status" defaultValue="OPEN">
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="PAUSED">Paused</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>
            <label className="checkbox-row">
              <input name="isOpenToJoin" type="checkbox" defaultChecked />
              <span>Open to join</span>
            </label>
          </div>
          <div className="form-grid">
            <label>
              <span>Started</span>
              <input name="startedAt" type="date" />
            </label>
            <label>
              <span>Deadline</span>
              <input name="deadlineAt" type="date" />
            </label>
            <label>
              <span>Completed</span>
              <input name="completedAt" type="date" />
            </label>
          </div>
          {createError && <p className="error">{createError}</p>}
          <button className="primary" type="submit">Create</button>
        </form>
      )}
      <div className="grid">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} onOpen={onOpenProject} />
        ))}
      </div>
    </section>
  );
}

function selectedList(formData: FormData, field: string) {
  return formData
    .getAll(field)
    .map((item) => String(item).trim())
    .filter(Boolean);
}

function nullableDate(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}
