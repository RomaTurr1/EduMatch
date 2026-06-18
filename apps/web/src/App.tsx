import { useEffect, useState } from "react";
import { Shell } from "./components/Shell";
import { api, clearAuth, signout } from "./services/api";
import type { AuthPayload, Project, User } from "./types/api";
import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { TeammatesPage } from "./pages/TeammatesPage";

type Theme = "dark" | "light";

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState("dashboard");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem("edumatch-theme");
    return storedTheme === "light" || storedTheme === "dark" ? storedTheme : "dark";
  });

  useEffect(() => {
    api<{ user: User }>("/profile/me")
      .then((result) => setUser(result.user))
      .catch(() => clearAuth());
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("edumatch-theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  function onAuthenticated(payload: AuthPayload) {
    setUser(payload.user);
    setView("dashboard");
  }

  function openProject(project: Project) {
    setProjectId(project.id);
    setView("project-detail");
  }

  async function handleSignout() {
    await signout();
    setUser(null);
    setView("dashboard");
  }

  if (!user) return <AuthPage theme={theme} onToggleTheme={toggleTheme} onAuthenticated={onAuthenticated} />;

  return (
    <Shell user={user} view={view} theme={theme} onToggleTheme={toggleTheme} onNavigate={setView} onSignout={handleSignout}>
      {view === "dashboard" && <DashboardPage onOpenProject={openProject} />}
      {view === "projects" && <ProjectsPage onOpenProject={openProject} />}
      {view === "teammates" && <TeammatesPage />}
      {view === "profile" && <ProfilePage user={user} onUpdate={setUser} />}
      {view === "project-detail" && projectId && <ProjectDetailPage projectId={projectId} user={user} />}
    </Shell>
  );
}
