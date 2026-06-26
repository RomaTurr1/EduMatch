import { useEffect, useState } from "react";
import { Shell } from "./components/Shell";
import { api, clearAuth, signout } from "./services/api";
import type { AuthPayload, Project, User } from "./types/api";
import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { PublicProfilePage } from "./pages/PublicProfilePage";
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
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [returnProjectId, setReturnProjectId] = useState<string | null>(null);
  const [pendingInviteCode, setPendingInviteCode] = useState(() => {
    const match = window.location.pathname.match(/^\/invite\/([^/]+)/);
    return match?.[1] ?? "";
  });
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

  useEffect(() => {
    if (!user || !pendingInviteCode) return;
    api<{ action: string; project: Project }>(`/projects/invite/${pendingInviteCode}`, { method: "POST" })
      .then((result) => {
        setProjectId(result.project.id);
        setView("project-detail");
        window.history.replaceState(null, "", "/");
      })
      .catch(console.error)
      .finally(() => setPendingInviteCode(""));
  }, [user, pendingInviteCode]);

  function toggleTheme() {
    setTheme((current) => (current === "light" ? "dark" : current === "dark" ? "system" : "light"));
  }

  function onAuthenticated(payload: AuthPayload) {
    setUser(payload.user);
    setView("dashboard");
  }

  function openProject(project: Project) {
    setProjectId(project.id);
    setView("project-detail");
  }

  function openProjectById(nextProjectId: string) {
    setProjectId(nextProjectId);
    setView("project-detail");
  }

  function openUserProfile(userId: string, nextReturnProjectId?: string | null) {
    setProfileUserId(userId);
    setReturnProjectId(nextReturnProjectId ?? null);
    setView("public-profile");
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
    <Shell user={user} view={view} theme={theme} activeTheme={activeTheme} onToggleTheme={toggleTheme} onNavigate={setView} onSignout={handleSignout} onOpenUserProfile={openUserProfile} onOpenProject={openProjectById}>
      {view === "dashboard" && <DashboardPage user={user} onOpenProject={openProject} />}
      {view === "projects" && <ProjectsPage user={user} onOpenProject={openProject} />}
      {view === "teammates" && <TeammatesPage user={user} onOpenUserProfile={openUserProfile} />}
      {view === "profile" && <ProfilePage user={user} onUpdate={setUser} />}
      {view === "public-profile" && profileUserId && <PublicProfilePage userId={profileUserId} returnProjectId={returnProjectId} onBackToProject={() => returnProjectId && openProjectById(returnProjectId)} onOpenProject={openProjectById} />}
      {view === "project-detail" && projectId && <ProjectDetailPage projectId={projectId} user={user} onClose={closeProjectDetail} />}
    </Shell>
  );
}
