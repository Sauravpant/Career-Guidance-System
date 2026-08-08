import React from "react";
import { useAuth } from "../hooks/useAuth";
import {
  Home,
  Map,
  TrendingUp,
  Cpu,
  FolderGit2,
  BookOpen,
  CheckSquare,
  User,
  LogOut,
  Compass,
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
}) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "roadmap", label: "Roadmap", icon: Map },
    { id: "skill-gap", label: "Skill Gap Analysis", icon: TrendingUp },
    { id: "career-engine", label: "Career Engine", icon: Cpu },
    { id: "projects", label: "Projects", icon: FolderGit2 },
    { id: "resources", label: "Learning Resources", icon: BookOpen },
    { id: "weekly-tracker", label: "Weekly Tracker", icon: CheckSquare },
    { id: "profile", label: "My Profile", icon: User },
  ];

  const getPageTitle = () => {
    switch (activeTab) {
      case "dashboard":
        return "Student Dashboard";
      case "roadmap":
        return "Career Roadmap";
      case "skill-gap":
        return "Skill Gap Analyzer";
      case "career-engine":
        return "Career Recommendation Engine";
      case "projects":
        return "Projects Tracker";
      case "resources":
        return "Learning Resources";
      case "weekly-tracker":
        return "Weekly Tracker";
      case "profile":
        return "My Profile";
      default:
        return "CareerPath";
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <Compass size={14} strokeWidth={2.5} />
            </div>
            <span>CareerPath</span>
          </div>
        </div>

        <ul className="sidebar-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <a
                  className={`sidebar-item ${isActive ? "active" : ""}`}
                  onClick={() => setActiveTab(item.id)}>
                  <Icon size={18} />
                  <span>{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>

        {/* Sidebar Footer User Info */}
        {user && (
          <div className="sidebar-footer">
            <div className="user-profile-summary">
              <img
                src={
                  user.avatarUrl ||
                  `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.name)}`
                }
                alt={user.name}
                className="user-avatar"
              />
              <div className="user-info">
                <div className="user-name">{user.name}</div>
                <div className="user-role">Student</div>
              </div>
              <button onClick={logout} className="logout-btn" title="Log Out">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Panel Content Area */}
      <div className="main-content">
        <header className="top-bar">
          <h2 className="page-title">{getPageTitle()}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span
              style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
              Logged in as: <strong>{user?.name}</strong>
            </span>
          </div>
        </header>

        <main className="page-container">{children}</main>
      </div>
    </div>
  );
};
