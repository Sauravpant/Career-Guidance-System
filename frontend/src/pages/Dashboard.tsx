import React from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { useWeeklyGoal } from '../hooks/useWeeklyGoal';
import { 
  SkillGapLineChart, 
  WeeklyGoalBarChart, 
  SkillDistributionChart 
} from '../components/Charts';
import { 
  BookOpen, 
  CheckSquare, 
  TrendingUp, 
  Award, 
  ChevronRight,
  TrendingDown,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const { user } = useAuth();
  const { useDashboardData } = useDashboard();
  const { useUpdateWeeklyGoalMutation } = useWeeklyGoal();

  const { data: dashboardData, isLoading, error } = useDashboardData();
  const updateGoalMutation = useUpdateWeeklyGoalMutation();

  const handleToggleGoal = (id: string, completed: boolean) => {
    updateGoalMutation.mutate({ id, updates: { completed } });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '60vh', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <span style={{ color: 'var(--text-secondary)' }}>Assembling dashboard metrics...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="alert alert-danger">
        Failed to fetch dashboard data: {error?.message || 'Server error'}
      </div>
    );
  }

  const { kpis, charts } = dashboardData;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Welcome Banner */}
      <div className="card" style={{ padding: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Welcome back, {user?.name}!</h1>
          <p style={{ margin: 0, fontSize: '0.95rem' }}>Here is a summary of your professional career development and weekly roadmap milestones.</p>
        </div>
        {charts.roadmapProgress && (
          <div style={{ textAlign: 'right' }}>
            <span className="badge badge-primary">{charts.roadmapProgress.careerName}</span>
          </div>
        )}
      </div>

      {/* KPIs Grid */}
      <div className="kpi-grid">
        {/* Total Skills */}
        <div className="kpi-card">
          <div className="kpi-content">
            <span className="kpi-label">Active Skills</span>
            <span className="kpi-value">{kpis.totalSkills}</span>
            <span className="kpi-trend" style={{ color: 'var(--text-secondary)' }}>Identified on profile</span>
          </div>
          <div className="kpi-icon"><Award size={20} /></div>
        </div>

        {/* Roadmap Progress */}
        <div className="kpi-card">
          <div className="kpi-content">
            <span className="kpi-label">Roadmap Completion</span>
            <span className="kpi-value">{kpis.overallRoadmapProgress}%</span>
            <span className="kpi-trend" style={{ color: 'var(--text-secondary)' }}>Across all phases</span>
          </div>
          <div className="kpi-icon"><BookOpen size={20} /></div>
        </div>

        {/* Weekly Goals */}
        <div className="kpi-card">
          <div className="kpi-content">
            <span className="kpi-label">Weekly Checklist</span>
            <span className="kpi-value">{kpis.weeklyGoalsThisWeek.completionPercent}%</span>
            <span className="kpi-trend">
              {kpis.weeklyProgressTrend >= 0 ? (
                <span className="kpi-trend up">+{kpis.weeklyProgressTrend}% vs last week</span>
              ) : (
                <span className="kpi-trend down">{kpis.weeklyProgressTrend}% vs last week</span>
              )}
            </span>
          </div>
          <div className="kpi-icon"><CheckSquare size={20} /></div>
        </div>

        {/* Skill Match Ratio */}
        <div className="kpi-card">
          <div className="kpi-content">
            <span className="kpi-label">Target Skill Match</span>
            <span className="kpi-value">{kpis.latestSkillGapScore}%</span>
            <span className="kpi-trend" style={{ color: 'var(--text-secondary)' }}>Based on latest audit</span>
          </div>
          <div className="kpi-icon"><TrendingUp size={20} /></div>
        </div>
      </div>

      {/* Main Grid: Charts and Roadmap status */}
      <div className="dashboard-grid">
        
        {/* Left Column: Analytics Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Skill Gap History Trend Line Chart */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
                <span>Skill Match Trend</span>
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Historic matching audit scores</span>
            </div>
            <div className="chart-container">
              <SkillGapLineChart data={charts.skillGapHistory} />
            </div>
          </div>

          {/* Bottom row: Skill Distribution + Goal Completion Hist */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px' }}>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Skills Status</h3>
              </div>
              <div className="chart-container">
                <SkillDistributionChart distribution={charts.skillDistribution} />
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Goal History</h3>
              </div>
              <div className="chart-container">
                <WeeklyGoalBarChart data={charts.weeklyGoalHistory} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Mini-Goal List & Active Roadmap Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Active Roadmap Progress Card */}
          <div className="card" style={{ borderLeft: '2px solid var(--accent-bright)' }}>
            <div className="card-header">
              <h3 className="card-title">Active Roadmap</h3>
              <button onClick={() => setActiveTab('roadmap')} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '0.75rem' }}>
                View Full
              </button>
            </div>
            {charts.roadmapProgress ? (
              <div>
                <h4 style={{ fontSize: '1.1rem', margin: '0 0 12px 0' }}>{charts.roadmapProgress.title}</h4>
                <p style={{ fontSize: '0.85rem', marginBottom: '16px' }}>
                  Targeting: <strong>{charts.roadmapProgress.careerName}</strong>
                </p>
                
                {/* Progress bar container */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Phase {charts.roadmapProgress.completedPhases} of {charts.roadmapProgress.totalPhases}
                    </span>
                    <span style={{ fontWeight: '600' }}>
                      {Math.round(charts.roadmapProgress.progressPercent)}% Complete
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${charts.roadmapProgress.progressPercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Sub phases checklist tracker preview */}
                {charts.perPhaseProgress && charts.perPhaseProgress.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                    {charts.perPhaseProgress.slice(0, 4).map((p) => (
                      <div key={p.phaseId} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: p.completed ? 'var(--success)' : 'var(--text-secondary)' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: p.completed ? 'var(--success)' : 'var(--text-muted)' }}></div>
                        <span style={{ textDecoration: p.completed ? 'line-through' : 'none', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Phase {p.phaseNumber}: {p.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <p style={{ fontSize: '0.85rem', marginBottom: '16px' }}>You haven't initialized a learning career roadmap yet.</p>
                <button onClick={() => setActiveTab('roadmap')} className="btn btn-primary" style={{ width: '100%' }}>
                  Initialize Roadmap <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Weekly Task Quick Tracker */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <CheckSquare size={18} style={{ color: 'var(--purple)' }} />
                <span>Weekly Task Tracker</span>
              </h3>
              <button onClick={() => setActiveTab('weekly-tracker')} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '0.75rem' }}>
                Manage
              </button>
            </div>
            
            {kpis.weeklyGoalsThisWeek.total > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* List current week goals */}
                {/* Fetch via the query directly or render list, wait, we can fetch weekly goals from useWeeklyGoals hook to display them */}
                <WeeklyGoalsMiniList handleToggleGoal={handleToggleGoal} />
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)' }}>
                <p style={{ fontSize: '0.85rem', marginBottom: '16px' }}>No tasks scheduled for this week.</p>
                <button onClick={() => setActiveTab('weekly-tracker')} className="btn btn-secondary" style={{ width: '100%' }}>
                  Schedule Goals
                </button>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
};

// Mini list component to avoid polling conflicts
const WeeklyGoalsMiniList: React.FC<{ handleToggleGoal: (id: string, completed: boolean) => void }> = ({ handleToggleGoal }) => {
  const { useWeeklyGoals } = useWeeklyGoal();
  const { data: goals, isLoading } = useWeeklyGoals();

  if (isLoading) return <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading tasks...</div>;
  if (!goals || goals.length === 0) return <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No tasks for this week.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {goals.slice(0, 5).map(g => (
        <label 
          key={g.id} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            cursor: 'pointer',
            padding: '10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            backgroundColor: 'rgba(255,255,255,0.01)',
            transition: 'background 0.2s'
          }}
          hover-style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
        >
          <input 
            type="checkbox" 
            checked={g.completed}
            onChange={(e) => handleToggleGoal(g.id, e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: 'var(--purple)', cursor: 'pointer' }}
          />
          <span style={{ 
            fontSize: '0.85rem', 
            color: g.completed ? 'var(--text-muted)' : 'var(--text-primary)',
            textDecoration: g.completed ? 'line-through' : 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1
          }}>
            {g.title}
          </span>
        </label>
      ))}
      {goals.length > 5 && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          + {goals.length - 5} more tasks
        </div>
      )}
    </div>
  );
};
