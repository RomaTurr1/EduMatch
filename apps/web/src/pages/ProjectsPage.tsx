import { Plus, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ProjectCard } from "../components/ProjectCard";
import { TagSelect } from "../components/TagSelect";
import { SKILL_OPTIONS, TECH_STACK_OPTIONS } from "../constants/skillOptions";
import { api } from "../services/api";
import type { Project, User } from "../types/api";

type Props = {
  user: User;
  onOpenProject: (project: Project) => void;
};

export function ProjectsPage({ user, onOpenProject }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filters, setFilters] = useState({ q: "", tech: [] as string[], skills: [] as string[] });
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState("");
  const visibleProjects = projects.filter((project) => !isUserProject(project, user.id));

  async function loadProjects(nextFilters = filters) {
    const params = new URLSearchParams();
    Object.entries(nextFilters).forEach(([key, value]) => {
      const text = Array.isArray(value) ? value.join(",") : value.trim();
      if (!text) return;
      params.set(key, text);
    });
    const result = await api<{ projects: Project[] }>(`/projects?${params}`);
    setProjects(result.projects);
  }

  useEffect(() => {
    loadProjects().catch(console.error);
  }, []);

  function updateProjectTagFilter(field: "tech" | "skills", value: string[]) {
    const nextFilters = { ...filters, [field]: value };
    setFilters(nextFilters);
    void loadProjects(nextFilters);
  }

  async function resetFilters() {
    const nextFilters = { q: "", tech: [] as string[], skills: [] as string[] };
    setFilters(nextFilters);
    await loadProjects(nextFilters);
  }

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
      <form
        className="students-search compact-student-search"
        onSubmit={(event) => {
          event.preventDefault();
          void loadProjects();
        }}
      >
        <div className="students-search-row projects-search-row">
          <label>
            <Search size={16} />
            <input
              value={filters.q}
              onChange={(event) => setFilters({ ...filters, q: event.target.value })}
              placeholder="Title"
            />
          </label>
          <TagSelect
            name="projectTechStack"
            label="Tech stack"
            options={TECH_STACK_OPTIONS}
            value={filters.tech}
            onChange={(value) => updateProjectTagFilter("tech", value)}
          />
          <TagSelect
            name="projectSkills"
            label="Skills"
            options={SKILL_OPTIONS}
            value={filters.skills}
            onChange={(value) => updateProjectTagFilter("skills", value)}
          />
          <button type="submit">Search</button>
          <button type="button" className="secondary icon-only" onClick={() => void resetFilters()} title="Reset filters"><X size={18} /></button>
        </div>
      </form>
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
        {visibleProjects.map((project) => (
          <ProjectCard key={project.id} project={project} currentUser={user} onOpen={onOpenProject} />
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

function isUserProject(project: Project, userId: string) {
  return project.owner.id === userId || project.members.some((member) => member.user.id === userId);
}
