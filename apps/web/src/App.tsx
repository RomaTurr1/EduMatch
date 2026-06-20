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

export type ThemePreference = "dark" | "light" | "system";
export type ActiveTheme = "dark" | "light";

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState("dashboard");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemePreference>(() => {
    const storedTheme = localStorage.getItem("edumatch-theme");
    return storedTheme === "light" || storedTheme === "dark" || storedTheme === "system" ? storedTheme : "system";
  });
  const [systemTheme, setSystemTheme] = useState<"dark" | "light">(getSystemTheme);
  const activeTheme: ActiveTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    api<{ user: User }>("/profile/me")
      .then((result) => setUser(result.user))
      .catch(() => clearAuth());
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const syncSystemTheme = () => setSystemTheme(media.matches ? "light" : "dark");
    syncSystemTheme();
    media.addEventListener("change", syncSystemTheme);
    return () => media.removeEventListener("change", syncSystemTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = activeTheme;
    localStorage.setItem("edumatch-theme", theme);
  }, [activeTheme, theme]);

  function toggleTheme() {
    setTheme((current) => (current === "system" ? "dark" : current === "dark" ? "light" : "system"));
  }

  function onAuthenticated(payload: AuthPayload) {
    setUser(payload.user);
    setView("dashboard");
  }

  function openProject(project: Project) {
    setProjectId(project.id);
    setView("project-detail");
  }

  function closeProjectDetail() {
    setProjectId(null);
    setView("projects");
  }

  async function handleSignout() {
    await signout();
    setUser(null);
    setView("dashboard");
  }

  if (!user) return <AuthPage theme={theme} activeTheme={activeTheme} onToggleTheme={toggleTheme} onAuthenticated={onAuthenticated} />;

  return (
    <Shell user={user} view={view} theme={theme} activeTheme={activeTheme} onToggleTheme={toggleTheme} onNavigate={setView} onSignout={handleSignout}>
      {view === "dashboard" && <DashboardPage onOpenProject={openProject} />}
      {view === "projects" && <ProjectsPage onOpenProject={openProject} />}
      {view === "teammates" && <TeammatesPage />}
      {view === "profile" && <ProfilePage user={user} onUpdate={setUser} />}
      {view === "project-detail" && projectId && <ProjectDetailPage projectId={projectId} user={user} onClose={closeProjectDetail} />}
    </Shell>
  );
}
