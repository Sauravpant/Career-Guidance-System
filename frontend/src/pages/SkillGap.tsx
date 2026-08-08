import React, { useState } from 'react';
import { useSkillGap } from '../hooks/useSkillGap';
import {
  TrendingUp,
  CheckCircle,
  HelpCircle,
  Plus,
  Sparkles,
  Calendar,
  ChevronDown,
  RotateCcw,
  AlertCircle,
  Zap,
} from 'lucide-react';

export const SkillGap: React.FC = () => {
  const {
    useAvailableCareers,
    useSkillGapProgress,
    useSkillGapHistory,
    useRunAnalysisMutation,
    useUpsertSkillProgressMutation,
  } = useSkillGap();

  const { data: availableCareers, isLoading: isCareersLoading } = useAvailableCareers();
  const { data: progressList, isLoading: isProgressLoading } = useSkillGapProgress();
  const { data: historyList, isLoading: isHistoryLoading } = useSkillGapHistory();

  const runAnalysisMutation = useRunAnalysisMutation();
  const upsertSkillMutation = useUpsertSkillProgressMutation();

  const [selectedCareer, setSelectedCareer] = useState('');
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillStatus, setNewSkillStatus] = useState<'LEARNING' | 'COMPLETED' | 'WANT_TO_LEARN'>('COMPLETED');

  const handleRunAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCareer) return;
    try {
      await runAnalysisMutation.mutateAsync(selectedCareer);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    try {
      await upsertSkillMutation.mutateAsync({
        skillName: newSkillName.trim(),
        status: newSkillStatus,
        score: newSkillStatus === 'COMPLETED' ? 100 : newSkillStatus === 'LEARNING' ? 50 : 0,
      });
      setNewSkillName('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStatus = async (skillName: string, currentStatus: string) => {
    let nextStatus: 'LEARNING' | 'COMPLETED' | 'WANT_TO_LEARN' = 'LEARNING';
    if (currentStatus === 'WANT_TO_LEARN') nextStatus = 'LEARNING';
    else if (currentStatus === 'LEARNING') nextStatus = 'COMPLETED';
    else nextStatus = 'WANT_TO_LEARN';

    try {
      await upsertSkillMutation.mutateAsync({
        skillName,
        status: nextStatus,
        score: nextStatus === 'COMPLETED' ? 100 : nextStatus === 'LEARNING' ? 50 : 0,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const activeAudit = historyList && historyList.length > 0 ? historyList[0] : null;

  const completedCount = progressList?.filter(p => p.status === 'COMPLETED').length ?? 0;
  const learningCount = progressList?.filter(p => p.status === 'LEARNING').length ?? 0;
  const wantToLearnCount = progressList?.filter(p => p.status === 'WANT_TO_LEARN').length ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {/* ── Top Control Row ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 'var(--space-5)' }}>

        {/* Run Audit Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Sparkles size={16} style={{ color: 'var(--accent-bright)' }} />
              Run Skill Gap Audit
            </h3>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
            Select a career track to compare your current skills against its required skill pool from the system database.
          </p>

          <form onSubmit={handleRunAudit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {/* Career Dropdown */}
            <div style={{ position: 'relative' }}>
              <select
                className="form-control"
                value={selectedCareer}
                onChange={(e) => setSelectedCareer(e.target.value)}
                disabled={isCareersLoading || runAnalysisMutation.isPending}
                required
                style={{
                  appearance: 'none',
                  paddingRight: '40px',
                  backgroundColor: 'var(--bg-secondary)',
                  cursor: isCareersLoading ? 'wait' : 'pointer',
                }}
              >
                <option value="">
                  {isCareersLoading ? 'Loading career tracks...' : '— Select a career track —'}
                </option>
                {availableCareers?.map((career) => (
                  <option key={career} value={career}>
                    {career}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={runAnalysisMutation.isPending || !selectedCareer}
              style={{ alignSelf: 'flex-start' }}
            >
              <Zap size={14} />
              {runAnalysisMutation.isPending ? 'Analyzing...' : 'Run Audit'}
            </button>
          </form>

          {runAnalysisMutation.error && (
            <div className="alert alert-danger" style={{ marginTop: 'var(--space-4)' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              {(runAnalysisMutation.error as any).message || 'Analysis failed. Check backend configuration.'}
            </div>
          )}
          {runAnalysisMutation.isSuccess && (
            <div className="alert alert-success" style={{ marginTop: 'var(--space-4)' }}>
              <CheckCircle size={15} style={{ flexShrink: 0 }} />
              Audit complete — skill inventory updated below.
            </div>
          )}
        </div>

        {/* Add Skill Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Plus size={16} style={{ color: 'var(--success)' }} />
              Add Skill to Inventory
            </h3>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
            Manually add a skill and set its proficiency. <strong style={{ color: 'var(--success)' }}>Completed</strong> skills count toward the match score.
          </p>

          <form onSubmit={handleAddSkill} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. React, Docker, Python"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              required
            />
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {(['COMPLETED', 'LEARNING', 'WANT_TO_LEARN'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setNewSkillStatus(s)}
                  className="btn"
                  style={{
                    flex: 1,
                    fontSize: '0.7rem',
                    padding: '7px 8px',
                    borderColor: newSkillStatus === s
                      ? s === 'COMPLETED' ? 'var(--success)' : s === 'LEARNING' ? 'var(--accent-bright)' : 'var(--warning)'
                      : 'var(--border-subtle)',
                    backgroundColor: newSkillStatus === s
                      ? s === 'COMPLETED' ? 'var(--success-muted)' : s === 'LEARNING' ? 'var(--accent-muted)' : 'var(--warning-muted)'
                      : 'transparent',
                    color: newSkillStatus === s
                      ? s === 'COMPLETED' ? 'var(--success)' : s === 'LEARNING' ? 'var(--accent-bright)' : 'var(--warning)'
                      : 'var(--text-muted)',
                  }}
                >
                  {s === 'COMPLETED' ? '✓ Mastered' : s === 'LEARNING' ? '⟳ Learning' : '○ To Learn'}
                </button>
              ))}
            </div>
            <button
              type="submit"
              className="btn btn-secondary"
              disabled={upsertSkillMutation.isPending || !newSkillName.trim()}
            >
              Add Skill
            </button>
          </form>
        </div>

      </div>

      {/* ── Stat Row ─────────────────────────────────────────── */}
      {progressList && progressList.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
          {[
            { label: 'Mastered', count: completedCount, color: 'var(--success)', bg: 'var(--success-muted)', border: 'var(--success-border)' },
            { label: 'Learning', count: learningCount, color: 'var(--accent-bright)', bg: 'var(--accent-muted)', border: 'var(--accent-border)' },
            { label: 'To Learn', count: wantToLearnCount, color: 'var(--warning)', bg: 'var(--warning-muted)', border: 'var(--warning-border)' },
          ].map(({ label, count, color, bg, border }) => (
            <div
              key={label}
              style={{
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-4) var(--space-5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '0.8rem', color, fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Main Body ─────────────────────────────────────────── */}
      <div className="dashboard-grid">

        {/* Left: Audit Result + History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

          {/* Active Audit Result */}
          {activeAudit ? (
            <div className="card" style={{ borderLeft: '2px solid var(--accent-bright)' }}>
              <div className="card-header" style={{ alignItems: 'flex-start' }}>
                <div>
                  <span className="badge badge-success" style={{ marginBottom: '8px' }}>Latest Audit</span>
                  <h3 className="card-title" style={{ fontSize: '1.15rem' }}>{activeAudit.careerName}</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={11} />
                    {new Date(activeAudit.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    fontSize: '2.25rem',
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    color: activeAudit.score >= 60 ? 'var(--success)' : activeAudit.score >= 30 ? 'var(--warning)' : 'var(--danger)',
                    lineHeight: 1,
                  }}>
                    {Math.round(activeAudit.score)}%
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Match Score
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="progress-bar" style={{ marginBottom: 'var(--space-5)' }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${activeAudit.score}%`,
                    background: activeAudit.score >= 60
                      ? 'linear-gradient(90deg, var(--success) 0%, #4ade80 100%)'
                      : activeAudit.score >= 30
                        ? 'linear-gradient(90deg, var(--warning) 0%, #fbbf24 100%)'
                        : 'linear-gradient(90deg, var(--danger) 0%, #fb7185 100%)',
                  }}
                />
              </div>

              {/* Matching + Missing grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>

                {/* Matching Skills */}
                <div style={{
                  border: '1px solid var(--success-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-4)',
                  background: 'var(--success-muted)',
                }}>
                  <h4 style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontSize: '0.8rem', color: 'var(--success)',
                    marginBottom: 'var(--space-3)', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.06em'
                  }}>
                    <CheckCircle size={13} />
                    You Have ({activeAudit.matchingSkills?.length ?? 0})
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {activeAudit.matchingSkills?.length > 0 ? (
                      activeAudit.matchingSkills.map((sk, idx) => (
                        <span key={idx} className="badge badge-success" style={{ textTransform: 'none', fontSize: '0.75rem' }}>
                          {sk}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No matching skills yet.</span>
                    )}
                  </div>
                </div>

                {/* Missing Skills */}
                <div style={{
                  border: '1px solid var(--danger-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-4)',
                  background: 'var(--danger-muted)',
                }}>
                  <h4 style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontSize: '0.8rem', color: 'var(--danger)',
                    marginBottom: 'var(--space-3)', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.06em'
                  }}>
                    <HelpCircle size={13} />
                    Skills to Acquire ({activeAudit.missingSkills?.length ?? 0})
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {activeAudit.missingSkills?.length > 0 ? (
                      activeAudit.missingSkills.map((sk, idx) => (
                        <span key={idx} className="badge badge-danger" style={{ textTransform: 'none', fontSize: '0.75rem' }}>
                          {sk}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>
                        ✓ Complete match — all required skills covered!
                      </span>
                    )}
                  </div>
                </div>

              </div>

              {/* Note about skill sources */}
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'var(--space-4)', marginBottom: 0 }}>
                ℹ️ Match includes skills from your profile <em>and</em> skills marked as <strong>Mastered</strong> in your inventory below.
              </p>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '56px var(--space-8)' }}>
              <TrendingUp size={40} style={{ color: 'var(--text-disabled)', marginBottom: 'var(--space-4)' }} />
              <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>No audit run yet</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                Select a career track above and click <strong>Run Audit</strong> to see how your skills compare.
              </p>
            </div>
          )}

          {/* Audit History */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Audit History</h3>
            </div>

            {isHistoryLoading ? (
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Loading history...</div>
            ) : historyList && historyList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {historyList.map((hist, idx) => (
                  <div
                    key={hist.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px var(--space-4)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: idx === 0 ? 'var(--bg-overlay)' : 'transparent',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <h4 style={{ fontSize: '0.875rem', margin: 0, fontWeight: 600 }}>{hist.careerName}</h4>
                        {idx === 0 && <span className="badge badge-primary" style={{ fontSize: '0.6rem' }}>Latest</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-3)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={11} />
                          {new Date(hist.createdAt).toLocaleDateString()}
                        </span>
                        <span style={{ color: 'var(--success)' }}>✓ {hist.matchingSkills?.length ?? 0} matched</span>
                        <span style={{ color: 'var(--danger)' }}>✗ {hist.missingSkills?.length ?? 0} missing</span>
                      </div>
                    </div>
                    <div style={{
                      fontSize: '1.125rem',
                      fontWeight: 800,
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.02em',
                      color: hist.score >= 60 ? 'var(--success)' : hist.score >= 30 ? 'var(--warning)' : 'var(--danger)',
                    }}>
                      {Math.round(hist.score)}%
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>No audit logs yet.</p>
            )}
          </div>

        </div>

        {/* Right: Skill Inventory */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div className="card-header">
            <h3 className="card-title">Skill Inventory</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {progressList?.length ?? 0} skills
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
            Click any skill to cycle its status. <strong style={{ color: 'var(--success)' }}>Mastered</strong> skills count toward your audit match score.
          </p>

          {isProgressLoading ? (
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Loading inventory...</div>
          ) : progressList && progressList.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {progressList.map((p) => {
                const isCompleted = p.status === 'COMPLETED';
                const isLearning = p.status === 'LEARNING';

                const statusColor = isCompleted
                  ? 'var(--success)'
                  : isLearning
                    ? 'var(--accent-bright)'
                    : 'var(--warning)';

                const statusLabel = isCompleted ? 'Mastered' : isLearning ? 'Learning' : 'To Learn';
                const statusBadge = isCompleted ? 'badge-success' : isLearning ? 'badge-primary' : 'badge-warning';

                return (
                  <div
                    key={p.id}
                    onClick={() => handleToggleStatus(p.skillName, p.status)}
                    title="Click to cycle status"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      border: `1px solid ${isCompleted ? 'var(--success-border)' : isLearning ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s, border-color 0.15s',
                      backgroundColor: isCompleted
                        ? 'var(--success-muted)'
                        : isLearning
                          ? 'var(--accent-muted)'
                          : 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: statusColor,
                        flexShrink: 0,
                      }} />
                      <span style={{
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        color: isCompleted ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {p.skillName}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge ${statusBadge}`} style={{ fontSize: '0.6rem' }}>
                        {statusLabel}
                      </span>
                      <RotateCcw size={11} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Plus size={20} />
              </div>
              <p style={{ margin: 0, fontSize: '0.8125rem' }}>No skills in inventory yet.</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-disabled)' }}>
                Run an audit or add skills manually above.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
