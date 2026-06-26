import { Bell, BookOpen, FolderKanban, LayoutDashboard, LogOut, Moon, Palette, Search, Sun, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { ActiveTheme, ThemePreference } from "../App";
import { api } from "../services/api";
import type { Notification, User } from "../types/api";

type Props = {
  user: User | null;
  view: string;
  theme: ThemePreference;
  activeTheme: ActiveTheme;
  onToggleTheme: () => void;
  onNavigate: (view: string) => void;
  onSignout: () => void;
  onOpenUserProfile: (userId: string, returnProjectId?: string | null) => void;
  onOpenProject: (projectId: string) => void;
  children: ReactNode;
};

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "teammates", label: "Students", icon: Search }
];

function getInitials(user: User | null) {
  return (user?.name || user?.email || "?").slice(0, 1).toUpperCase();
}

function displayName(value?: string | null) {
  const name = value || "Guest";
  return name.length > 18 ? `${name.slice(0, 18)}...` : name;
}

export function Shell({ user, view, theme, activeTheme, onToggleTheme, onNavigate, onSignout, onOpenUserProfile, onOpenProject, children }: Props) {
  const ThemeIcon = activeTheme === "light" ? Sun : Moon;
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  async function loadNotifications() {
    const result = await api<{ notifications: Notification[] }>("/notifications");
    setNotifications(result.notifications);
  }

  useEffect(() => {
    loadNotifications().catch(console.error);
  }, []);

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

  async function clearNotifications() {
    await api("/notifications", { method: "DELETE" });
    setNotifications([]);
  }

  async function openNotification(notification: Notification) {
    setNotificationsOpen(false);
    if (notification.type === "PROJECT_INVITE" && notification.project?.id) {
      const result = await api<{ project: { id: string } }>(`/projects/${notification.project.id}/invitations/accept`, { method: "POST" });
      onOpenProject(result.project.id);
      void loadNotifications();
      return;
    }
    if (!notification.readAt) {
      await api(`/notifications/${notification.id}/read`, { method: "PATCH" }).catch(() => undefined);
      setNotifications((current) => current.map((item) => (item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item)));
    }
    if (notification.actor?.id) {
      onOpenUserProfile(notification.actor.id, notification.project?.id);
    }
  }

  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

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
          <button className="notification-button" title="Notifications" onClick={() => {
            setProfileMenuOpen(false);
            setNotificationsOpen((open) => !open);
            void loadNotifications();
          }}>
            <Bell size={18} />
            {unreadCount > 0 && <span aria-hidden="true" />}
          </button>
          {notificationsOpen && (
            <div className="notifications-menu">
              <div className="notifications-header">
                <div>
                  <strong>Notifications</strong>
                  <small>{unreadCount} unread</small>
                </div>
                {notifications.length > 0 && (
                  <button className="notifications-clear" type="button" onClick={() => void clearNotifications()}>
                    Clear
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p>No notifications yet</p>
              ) : (
                notifications.map((notification) => (
                  <button key={notification.id} className={notification.readAt ? "" : "unread"} onClick={() => void openNotification(notification)}>
                    <strong>{notification.actor?.name ?? "EduMatch"}</strong>
                    <span>{notification.message}</span>
                    {notification.project && <small>{notification.project.title}</small>}
                  </button>
                ))
              )}
            </div>
          )}
          <div className="profile-menu-wrap">
            <button
              className={`profile-trigger ${view === "profile" || profileMenuOpen ? "active" : ""}`}
              onClick={() => {
                setNotificationsOpen(false);
                setProfileMenuOpen((open) => !open);
              }}
              title="Profile menu"
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
            >
              <span className="profile-name">{displayName(user?.name)}</span>
              <span className="profile-avatar">
                {user?.avatarUrl ? <img src={user.avatarUrl} alt={user.name} /> : getInitials(user)}
              </span>
            </button>
            {profileMenuOpen && (
              <div className="profile-menu" role="menu">
                <div className="profile-menu-user">
                  <strong>{displayName(user?.name)}</strong>
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
