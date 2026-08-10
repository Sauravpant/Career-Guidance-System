import React, { useState } from 'react';
import { useWeeklyGoal } from '../hooks/useWeeklyGoal';
import { 
  CheckSquare, 
  Plus, 
  Trash2, 
  Calendar,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';

export const WeeklyTracker: React.FC = () => {
  const {
    useWeeklyGoals,
    useCreateWeeklyGoalMutation,
    useUpdateWeeklyGoalMutation,
    useDeleteWeeklyGoalMutation
  } = useWeeklyGoal();

  // Current selected date string
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [newGoalTitle, setNewGoalTitle] = useState('');

  const { data: goals, isLoading, error } = useWeeklyGoals(selectedDate);
  const createMutation = useCreateWeeklyGoalMutation();
  const updateMutation = useUpdateWeeklyGoalMutation();
  const deleteMutation = useDeleteWeeklyGoalMutation();

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    try {
      await createMutation.mutateAsync({
        title: newGoalTitle.trim(),
        date: selectedDate
      });
      setNewGoalTitle('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleGoal = async (id: string, completed: boolean) => {
    try {
      await updateMutation.mutateAsync({ id, updates: { completed } });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      console.error(err);
    }
  };

  const totalGoals = goals?.length || 0;
  const completedGoals = goals?.filter(g => g.completed).length || 0;
  const completionPercent = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '32px' }}>
      
      {/* Left side: Checklist container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Checklist card */}
        <div className="card">
          <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
            <h3 className="card-title">
              <CheckSquare size={18} style={{ color: 'var(--primary)' }} />
              <span>Study Task Tracker</span>
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Week of {selectedDate}
            </span>
          </div>

          {/* Add Goal Input */}
          <form onSubmit={handleAddGoal} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <input
              type="text"
              className="form-control"
              style={{ flex: 1 }}
              placeholder="e.g. Complete Phase 1 Project 1 steps 1-5"
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
              required
              disabled={createMutation.isPending}
            />
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={createMutation.isPending || !newGoalTitle.trim()}
            >
              <Plus size={16} /> Add Task
            </button>
          </form>

          {/* List display */}
          {isLoading ? (
            <div style={{ padding: '24px 0', color: 'var(--text-secondary)' }}>Querying weekly items...</div>
          ) : error ? (
            <div className="alert alert-danger">Error: {error.message}</div>
          ) : goals && goals.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {goals.map((goal) => (
                <div 
                  key={goal.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'rgba(255,255,255,0.01)',
                    transition: 'all 0.2s'
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', flex: 1, minWidth: 0 }}>
                    <input 
                      type="checkbox"
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                      checked={goal.completed}
                      onChange={(e) => handleToggleGoal(goal.id, e.target.checked)}
                      disabled={updateMutation.isPending}
                    />
                    <span 
                      style={{ 
                        fontSize: '0.95rem',
                        color: goal.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                        textDecoration: goal.completed ? 'line-through' : 'none',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {goal.title}
                    </span>
                  </label>
                  
                  <button 
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="logout-btn"
                    style={{ padding: '6px', color: 'var(--text-muted)' }}
                    title="Remove Task"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
              <Clock size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px', margin: '0 auto' }} />
              <p style={{ margin: 0, fontSize: '0.9rem' }}>No tasks scheduled for this week. Enter a title above to log learning goals.</p>
            </div>
          )}

        </div>

      </div>

      {/* Right side: Summary Status & calendar selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Date Selector Card */}
        <div className="card">
          <h3 className="card-title" style={{ fontSize: '1.05rem', marginBottom: '12px' }}>
            <Calendar size={16} /> Select Week
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Choose a day; CareerPath will fetch the containing calendar week's tracker goals.</p>
          <input 
            type="date"
            className="form-control"
            style={{ width: '100%' }}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        {/* Completion Progress KPI */}
        <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <h3 className="card-title" style={{ fontSize: '1.05rem', marginBottom: '16px' }}>Week Completion</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--primary)' }}>{completionPercent}%</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{completedGoals} / {totalGoals} Tasks Done</span>
          </div>

          <div style={{ height: '8px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
            <div 
              style={{ 
                height: '100%', 
                backgroundColor: 'var(--primary)', 
                width: `${completionPercent}%`,
                transition: 'width 0.4s' 
              }}
            ></div>
          </div>
        </div>

        {/* Tip section */}
        <div className="card">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--warning)', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Sparkles size={14} /> Tracking Tip
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
            Break down massive phase chapters into daily, byte-sized checklists. Check them off here to sync with the main dashboard KPIs!
          </p>
        </div>

      </div>

    </div>
  );
};
