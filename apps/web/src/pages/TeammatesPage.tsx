import { ChevronDown, GraduationCap, Mail, Send, Search, UserRound, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TagSelect } from "../components/TagSelect";
import { CHARACTERISTIC_OPTIONS } from "../constants/skillOptions";
import { api } from "../services/api";
import type { Project, User } from "../types/api";

type Props = {
  user: User;
  onOpenUserProfile: (userId: string) => void;
};

const INITIAL_FILTERS = {
  q: "",
  skills: [] as string[],
  course: "",
  university: ""
};

const UNIVERSITY_OPTIONS = [
  "Astana IT University",
  "Suleyman Demirel University",
  "Kazakh-British Technical University",
  "Nazarbayev University",
  "International IT University",
  "Satbayev University",
  "Al-Farabi Kazakh National University",
  "Turan University",
  "Narxoz University",
  "KIMEP University"
];

const COURSE_OPTIONS = ["1st year", "2nd year", "3rd year", "4th year"];
const STUDENT_CARD_SKILL_ROWS = 2;

function canInviteToProject(project: Project) {
  return project.status === "OPEN" || project.status === "IN_PROGRESS";
}

function StudentSkillTags({
  skills,
  isOpen,
  projects,
  loading,
  onToggle,
  onInviteOpen
}: {
  skills: string[];
  isOpen: boolean;
  projects: Project[];
  loading: boolean;
  onToggle: () => void;
  onInviteOpen: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(skills.length);

  useLayoutEffect(() => {
    function updateVisibleSkills() {
      const container = containerRef.current;
      const measure = measureRef.current;
      if (!container || !measure) return;

      const containerWidth = container.clientWidth;
      const measuredSkills = Array.from(measure.querySelectorAll<HTMLElement>("[data-skill-measure]"));
      const moreButton = measure.querySelector<HTMLElement>("[data-more-measure]");
      const widths = measuredSkills.map((item) => item.getBoundingClientRect().width);
      const moreWidth = moreButton?.getBoundingClientRect().width ?? 0;
      const styles = window.getComputedStyle(container);
      const gap = Number.parseFloat(styles.columnGap || styles.gap || "7") || 7;

      function fits(count: number) {
        const itemWidths = [...widths.slice(0, count), moreWidth];
        let row = 1;
        let rowWidth = 0;

        for (const width of itemWidths) {
          const nextWidth = rowWidth === 0 ? width : rowWidth + gap + width;
          if (nextWidth <= containerWidth) {
            rowWidth = nextWidth;
            continue;
          }

          row += 1;
          rowWidth = width;
          if (row > STUDENT_CARD_SKILL_ROWS || width > containerWidth) return false;
        }

        return true;
      }

      let nextCount = skills.length;
      while (nextCount > 0 && !fits(nextCount)) {
        nextCount -= 1;
      }
      setVisibleCount(nextCount);
    }

    const frame = window.requestAnimationFrame(updateVisibleSkills);
    const observer = new ResizeObserver(updateVisibleSkills);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [skills]);

  const visibleSkills = skills.slice(0, visibleCount);
  const hiddenSkills = skills.slice(visibleCount);

  return (
    <>
      <div className="tags person-skill-tags" ref={containerRef}>
        {visibleSkills.map((skill) => <span key={skill}>{skill}</span>)}
        <button
          type="button"
          className={`skill-more-button ${isOpen ? "active" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
          aria-label="Open student actions"
          aria-expanded={isOpen}
        >
          ...
        </button>
        <div className="student-skill-measure" ref={measureRef} aria-hidden="true">
          {skills.map((skill) => <span data-skill-measure key={skill}>{skill}</span>)}
          <button type="button" className="skill-more-button" data-more-measure>...</button>
        </div>
      </div>
      {isOpen && (
        <div className="student-skills-menu" onClick={(event) => event.stopPropagation()}>
          <InviteSelect projects={projects} loading={loading} onOpen={onInviteOpen} />
          {hiddenSkills.length > 0 && (
            <>
              <div className="student-skills-menu-header">
                <span>More skills</span>
              </div>
              <div className="student-skills-menu-list">
                {hiddenSkills.map((skill) => <span key={skill}>{skill}</span>)}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

export function TeammatesPage({ user, onOpenUserProfile }: Props) {
  const [students, setStudents] = useState<User[]>([]);
  const [ownedProjects, setOwnedProjects] = useState<Project[]>([]);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [loading, setLoading] = useState(false);
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [inviteState, setInviteState] = useState<{ userId: string; projectId: string } | null>(null);
  const [inviteTarget, setInviteTarget] = useState<User | null>(null);
  const [skillListTarget, setSkillListTarget] = useState<User | null>(null);
  const [projectQuery, setProjectQuery] = useState("");
  const [inviteModalError, setInviteModalError] = useState("");

  async function loadStudents(nextFilters = filters) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(nextFilters).forEach(([field, value]) => {
        const text = Array.isArray(value) ? value.join(",") : value.trim();
        if (!text) return;
        params.set(field, text);
      });
      const result = await api<{ teammates: User[] }>(`/teammates?${params}`);
      setStudents(result.teammates);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudents(INITIAL_FILTERS).catch(console.error);
  }, []);

  useEffect(() => {
    api<{ projects: Project[] }>("/projects")
      .then((result) => setOwnedProjects(result.projects.filter((project) =>
        canInviteToProject(project) && (project.owner.id === user.id || project.members.some((member) => member.user.id === user.id))
      )))
      .catch(console.error);
  }, [user.id]);

  function updateFilter(field: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function toggleFilter(field: "course" | "university", value: string) {
    const nextFilters = { ...filters, [field]: filters[field] === value ? "" : value };
    setFilters(nextFilters);
    setOpenFilter(null);
    void loadStudents(nextFilters);
  }

  function updateSkillFilter(nextSkills: string[]) {
    const nextFilters = { ...filters, skills: nextSkills };
    setFilters(nextFilters);
    void loadStudents(nextFilters);
  }

  async function resetFilters() {
    setFilters(INITIAL_FILTERS);
    setOpenFilter(null);
    await loadStudents(INITIAL_FILTERS);
  }

  async function inviteStudent(studentId: string, projectId: string) {
    setInviteModalError("");
    setInviteState({ userId: studentId, projectId });
    try {
      await api(`/projects/${projectId}/invitations`, {
        method: "POST",
        body: JSON.stringify({ userId: studentId })
      });
      setInviteTarget(null);
      setProjectQuery("");
    } catch (error) {
      setInviteModalError(error instanceof Error ? error.message : "Could not send invite");
    } finally {
      setInviteState(null);
    }
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Students</h1>
          <p>Find classmates by name, characteristics, course, or university.</p>
        </div>
      </header>
      <form
        className="students-search compact-student-search"
        onSubmit={(event) => {
          event.preventDefault();
          void loadStudents();
        }}
      >
        <div className="students-search-row">
          <label>
            <Search size={16} />
            <input
              value={filters.q}
              onChange={(event) => updateFilter("q", event.target.value)}
              placeholder="Name or specialty"
            />
          </label>
          <TagSelect
            name="studentSkills"
            label="Skills"
            options={CHARACTERISTIC_OPTIONS}
            value={filters.skills}
            onChange={updateSkillFilter}
          />
          <FilterMenu
            id="university"
            label="University"
            value={filters.university}
            options={UNIVERSITY_OPTIONS}
            isOpen={openFilter === "university"}
            onToggle={() => setOpenFilter((current) => (current === "university" ? null : "university"))}
            onChange={(value) => toggleFilter("university", value)}
          />
          <FilterMenu
            id="course"
            label="Course"
            value={filters.course}
            options={COURSE_OPTIONS}
            isOpen={openFilter === "course"}
            onToggle={() => setOpenFilter((current) => (current === "course" ? null : "course"))}
            onChange={(value) => toggleFilter("course", value)}
          />
          <button type="submit">{loading ? "Searching" : "Search"}</button>
          <button type="button" className="secondary icon-only" onClick={() => void resetFilters()} title="Reset filters"><X size={18} /></button>
        </div>
        {(filters.university || filters.course) && (
          <div className="active-filters">
            {filters.university && <button type="button" onClick={() => toggleFilter("university", filters.university)}>{filters.university}<X size={14} /></button>}
            {filters.course && <button type="button" onClick={() => toggleFilter("course", filters.course)}>{filters.course}<X size={14} /></button>}
          </div>
        )}
      </form>
      <div className="section-title compact-title">
        <h2>Student Catalog</h2>
        <span>{students.length} profiles</span>
      </div>
      <div className="grid students-grid">
        {students.map((user) => (
          <article
            className={`person-card clickable ${skillListTarget?.id === user.id ? "menu-open" : ""}`}
            key={user.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpenUserProfile(user.id)}
            onKeyDown={(event) => event.key === "Enter" && onOpenUserProfile(user.id)}
          >
            <div className="person-top">
              <div className="avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt={user.name} /> : user.name.slice(0, 1).toUpperCase()}</div>
              <div className="person-heading">
                <h3>{user.realName || user.name}</h3>
              </div>
            </div>
            <p><UserRound size={16} /> {user.specialty || "Specialty not set"}</p>
            <p><GraduationCap size={16} /> {user.course || "Course not set"} · {user.university || "University not set"}</p>
            <p><Mail size={16} /> {user.email}</p>
            <StudentSkillTags
              skills={user.skills}
              isOpen={skillListTarget?.id === user.id}
              projects={ownedProjects}
              loading={inviteState?.userId === user.id}
              onToggle={() => setSkillListTarget((current) => current?.id === user.id ? null : user)}
              onInviteOpen={() => {
                setProjectQuery("");
                setInviteModalError("");
                setInviteTarget(user);
                setSkillListTarget(null);
              }}
            />
          </article>
        ))}
      </div>
      {!loading && students.length === 0 && <p className="empty-state">No students found. Try another skill or university.</p>}
      {inviteTarget && createPortal(
        <InviteProjectModal
          student={inviteTarget}
          projects={ownedProjects}
          query={projectQuery}
          error={inviteModalError}
          loadingProjectId={inviteState?.userId === inviteTarget.id ? inviteState.projectId : null}
          onQueryChange={setProjectQuery}
          onClose={() => {
            setInviteTarget(null);
            setInviteModalError("");
          }}
          onBlockedProject={(project) => setInviteModalError(`${inviteTarget.realName || inviteTarget.name} is already in ${project.title}`)}
          onInvite={(projectId) => inviteStudent(inviteTarget.id, projectId)}
        />,
        document.body
      )}
    </section>
  );
}

type InviteSelectProps = {
  projects: Project[];
  loading: boolean;
  onOpen: () => void;
};

function InviteSelect({ projects, loading, onOpen }: InviteSelectProps) {
  return (
    <div
      className="student-invite-action"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="student-invite-trigger"
        disabled={loading || projects.length === 0}
        onClick={onOpen}
      >
        <Send size={14} />
        <span>{loading ? "Sending..." : projects.length ? "Invite to..." : "No projects"}</span>
      </button>
    </div>
  );
}

type InviteProjectModalProps = {
  student: User;
  projects: Project[];
  query: string;
  error: string;
  loadingProjectId: string | null;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onBlockedProject: (project: Project) => void;
  onInvite: (projectId: string) => void;
};

function InviteProjectModal({ student, projects, query, error, loadingProjectId, onQueryChange, onClose, onBlockedProject, onInvite }: InviteProjectModalProps) {
  const normalizedQuery = query.trim().toLowerCase();
  const filteredProjects = normalizedQuery
    ? projects.filter((project) =>
        [project.title, project.description, project.status, ...project.techStack, ...project.requiredSkills]
          .some((value) => value.toLowerCase().includes(normalizedQuery))
      )
    : projects;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="invite-modal" role="dialog" aria-modal="true" aria-labelledby="invite-modal-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="status">Invite student</span>
            <h2 id="invite-modal-title">Invite {student.realName || student.name}</h2>
            <p>Choose one of your project rooms to send an invitation.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} title="Close invite modal">
            <X size={18} />
          </button>
        </div>
        <label className="invite-project-search">
          <Search size={16} />
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search your projects" autoFocus />
        </label>
        {error && <p className="invite-modal-error">{error}</p>}
        <div className="invite-project-list">
          {filteredProjects.map((project) => {
            const alreadyMember = project.members.some((member) => member.user.id === student.id);
            return (
              <button
                key={project.id}
                type="button"
                className={alreadyMember ? "already-member" : ""}
                onClick={() => alreadyMember ? onBlockedProject(project) : onInvite(project.id)}
                disabled={Boolean(loadingProjectId)}
              >
                <div>
                  <strong>{project.title}</strong>
                  <span>{project.description}</span>
                </div>
                <small className={alreadyMember ? "already-member-label" : ""}>
                  {alreadyMember ? "Already in project" : loadingProjectId === project.id ? "Sending..." : project.status.toLowerCase().replace("_", " ")}
                </small>
              </button>
            );
          })}
          {filteredProjects.length === 0 && <p className="empty-state">No projects found. Try another title or skill.</p>}
        </div>
      </section>
    </div>
  );
}

type FilterMenuProps = {
  id: string;
  label: string;
  options: string[];
  value: string;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
};

function FilterMenu({ id, label, options, value, isOpen, onToggle, onChange }: FilterMenuProps) {
  return (
    <div className="filter-menu-wrap">
      <button
        type="button"
        className={`filter-menu-trigger ${value ? "selected" : ""}`}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`${id}-menu`}
      >
        <span>{value || label}</span>
        <ChevronDown size={16} />
      </button>
      {isOpen && (
        <div className="filter-menu" id={`${id}-menu`}>
          <button type="button" className={!value ? "selected" : ""} onClick={() => onChange("")}>Any {label.toLowerCase()}</button>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={value === option ? "selected" : ""}
            onClick={() => onChange(option)}
            aria-pressed={value === option}
          >
            {option}
          </button>
        ))}
        </div>
      )}
      </div>
  );
}
