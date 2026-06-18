import { BookOpen, FolderKanban, LayoutDashboard, LogOut, Moon, Search, Sun, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import type { User } from "../types/api";

type Props = {
  user: User | null;
  view: string;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onNavigate: (view: string) => void;
  onSignout: () => void;
  children: ReactNode;
};

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "teammates", label: "Teammates", icon: Search },
  { id: "profile", label: "Profile", icon: UserRound }
];

export function Shell({ user, view, theme, onToggleTheme, onNavigate, onSignout, children }: Props) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
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
        <div className="sidebar-footer">
          <div>
            <strong>{user?.name ?? "Guest"}</strong>
            <small>{user?.university ?? "Find your next team"}</small>
          </div>
          <button className="icon-button" onClick={onToggleTheme} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {user && (
            <button className="icon-button" onClick={onSignout} title="Sign out">
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
