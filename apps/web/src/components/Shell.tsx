import { Bell, BookOpen, FolderKanban, LayoutDashboard, LogOut, Moon, Palette, Search, Sun, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import type { ActiveTheme, ThemePreference } from "../App";
import type { User } from "../types/api";

type Props = {
  user: User | null;
  view: string;
  theme: ThemePreference;
  activeTheme: ActiveTheme;
  onToggleTheme: () => void;
  onNavigate: (view: string) => void;
  onSignout: () => void;
  children: ReactNode;
};

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "teammates", label: "Teammates", icon: Search }
];

function getInitials(user: User | null) {
  return (user?.name || user?.email || "?").slice(0, 1).toUpperCase();
}

export function Shell({ user, view, theme, activeTheme, onToggleTheme, onNavigate, onSignout, children }: Props) {
  const ThemeIcon = activeTheme === "light" ? Sun : Moon;
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  function navigateFromMenu(nextView: string) {
    onNavigate(nextView);
    setProfileMenuOpen(false);
  }

  function toggleThemeFromMenu() {
    onToggleTheme();
  }

  function signoutFromMenu() {
    setProfileMenuOpen(false);
    void onSignout();
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => onNavigate("dashboard")}>
          <BookOpen size={24} />
          <span>EduMatch</span>
        </button>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={view === item.id ? "active" : ""}
                onClick={() => onNavigate(item.id)}
                title={item.label}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="topbar-actions">
          <button className="notification-button" title="Notifications">
            <Bell size={18} />
            <span aria-hidden="true" />
          </button>
          <div className="profile-menu-wrap">
            <button
              className={`profile-trigger ${view === "profile" || profileMenuOpen ? "active" : ""}`}
              onClick={() => setProfileMenuOpen((open) => !open)}
              title="Profile menu"
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
            >
              <span className="profile-name">{user?.name ?? "Guest"}</span>
              <span className="profile-avatar">
                {user?.avatarUrl ? <img src={user.avatarUrl} alt={user.name} /> : getInitials(user)}
              </span>
            </button>
            {profileMenuOpen && (
              <div className="profile-menu" role="menu">
                <div className="profile-menu-user">
                  <strong>{user?.name ?? "Guest"}</strong>
                  <small>{user?.university || user?.email || "Find your next team"}</small>
                </div>
                <button role="menuitem" onClick={() => navigateFromMenu("profile")}>
                  <UserRound size={17} />
                  <span>Profile</span>
                </button>
                <div className="profile-menu-section">
                  <button role="menuitem" onClick={() => undefined} title="Coming soon">
                    <Palette size={17} />
                    <span>Customize profile</span>
                  </button>
                  <button role="menuitem" onClick={toggleThemeFromMenu}>
                    <ThemeIcon size={17} />
                    <span>Theme: {theme}</span>
                  </button>
                </div>
                {user && (
                  <button role="menuitem" onClick={signoutFromMenu}>
                    <LogOut size={17} />
                    <span>Sign out</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
