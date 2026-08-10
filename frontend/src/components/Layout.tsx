import React, { useState } from "react";
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
  Menu,
  X
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="app-container">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-overlay" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isMobileMenuOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <Compass size={14} strokeWidth={2.5} />
            </div>
            <span>CareerPath</span>
          </div>
          <button 
            className="mobile-close-btn"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <ul className="sidebar-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <a
                  className={`sidebar-item ${isActive ? "active" : ""}`}
                  onClick={() => handleTabClick(item.id)}>
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
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="user-avatar"
                />
              ) : (
                <div 
                  className="user-avatar" 
                  style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    backgroundColor: 'var(--primary)', color: 'white', 
                    fontWeight: 600, fontSize: '1.2rem' 
                  }}
                >
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
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
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button 
              className="mobile-menu-btn"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h2 className="page-title">{getPageTitle()}</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span
              className="logged-in-user"
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
