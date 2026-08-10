import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Roadmap } from './pages/Roadmap';
import { SkillGap } from './pages/SkillGap';
import { CareerEngine } from './pages/CareerEngine';
import { Projects } from './pages/Projects';
import { Resources } from './pages/Resources';
import { WeeklyTracker } from './pages/WeeklyTracker';
import { Profile } from './pages/Profile';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Loading state
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: '0.95rem' }}>Synchronizing secure session...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not authenticated -> show login/register tabs
  if (!isAuthenticated) {
    return <Landing />;
  }

  // Authenticated -> show layouts and conditional tabs
  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'roadmap':
        return <Roadmap />;
      case 'skill-gap':
        return <SkillGap />;
      case 'career-engine':
        return <CareerEngine setActiveTab={setActiveTab} />;
      case 'projects':
        return <Projects />;
      case 'resources':
        return <Resources />;
      case 'weekly-tracker':
        return <WeeklyTracker />;
      case 'profile':
        return <Profile />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderPage()}
    </Layout>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
