import React, { useState } from 'react';
import { useRoadmap } from '../hooks/useRoadmap';
import { 
  Compass, 
  Lock, 
  CheckCircle2, 
  Circle, 
  ExternalLink, 
  ChevronRight, 
  X,
  FileCode2,
  Calendar,
  AlertCircle
} from 'lucide-react';

export const Roadmap: React.FC = () => {
  const { 
    useMyRoadmap, 
    useGenerateRoadmapMutation, 
    useTogglePhaseProgressMutation 
  } = useRoadmap();

  const { data: roadmap, isLoading, error } = useMyRoadmap();
  const generateMutation = useGenerateRoadmapMutation();
  const toggleProgressMutation = useTogglePhaseProgressMutation();

  const [careerInput, setCareerInput] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<any>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!careerInput.trim()) return;
    try {
      await generateMutation.mutateAsync(careerInput.trim());
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleCompletion = async (phaseId: string, currentCompleted: boolean) => {
    try {
      await toggleProgressMutation.mutateAsync({ phaseId, completed: !currentCompleted });
      
      // Update selected phase state if modal is open to reflect live changes
      if (selectedPhase && selectedPhase.id === phaseId) {
        setSelectedPhase((prev: any) => ({
          ...prev,
          completed: !currentCompleted
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '60vh', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <span style={{ color: 'var(--text-secondary)' }}>Retrieving your career path...</span>
      </div>
    );
  }

  // ─── CASE A: USER HAS NO ROADMAP YET (SETUP MODE) ──────────────────
  if (!roadmap) {
    return (
      <div className="card" style={{ maxWidth: '640px', margin: '40px auto', padding: '40px', textAlign: 'center' }}>
        <div style={{ background: 'var(--primary-glow)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <Compass size={32} style={{ color: 'var(--primary)' }} />
        </div>
        <h2 style={{ fontSize: '1.6rem', marginBottom: '12px' }}>Initialize Career Roadmap</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.95rem' }}>
          Select or search your target career path. Our system will generate a detailed, 8-phase curriculum mapped against your experience and missing skills.
        </p>

        {generateMutation.error && (
          <div className="alert alert-danger" style={{ marginBottom: '20px', textAlign: 'left' }}>
            {(generateMutation.error as any).message || 'Generation failed. Make sure your ML service is running.'}
          </div>
        )}

        <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="target-career">Enter Target Career Name</label>
            <input
              id="target-career"
              type="text"
              className="form-control"
              placeholder="e.g. Full Stack Developer, Machine Learning Engineer, DevOps"
              value={careerInput}
              onChange={(e) => setCareerInput(e.target.value)}
              required
              disabled={generateMutation.isPending}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {['Full Stack Developer', 'Data Scientist', 'DevOps Specialist', 'Frontend Engineer', 'Backend Developer'].map(c => (
              <button
                key={c}
                type="button"
                className="skill-tag clickable"
                onClick={() => setCareerInput(c)}
                disabled={generateMutation.isPending}
              >
                {c}
              </button>
            ))}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px' }}
            disabled={generateMutation.isPending || !careerInput.trim()}
          >
            {generateMutation.isPending ? 'Generating 8-Phase Core Curriculum (takes up to 20s)...' : 'Generate Roadmap'}
          </button>
        </form>
      </div>
    );
  }

  // Compute percentage completed
  const completedPhasesCount = roadmap.phases.filter(p => p.progress[0]?.completed === true).length;
  const progressPercent = roadmap.phases.length > 0 ? (completedPhasesCount / roadmap.phases.length) * 100 : 0;

  // ─── CASE B: ROADMAP IS ACTIVELY GENERATED & RENDERED ──────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Header Info */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <span className="badge badge-primary" style={{ marginBottom: '8px' }}>Active Curriculum</span>
          <h2 style={{ fontSize: '1.6rem', margin: 0 }}>{roadmap.title}</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0 0', fontSize: '0.9rem' }}>
            Career: <strong>{roadmap.career.name}</strong> • Created at {new Date(roadmap.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div style={{ minWidth: '240px', flex: 1, maxWidth: '320px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Curriculum Lock</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontWeight: '600' }}>
              <Lock size={12} /> Roadmap Locked
            </span>
          </div>
          <div style={{ height: '8px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
            <div 
              style={{ 
                height: '100%', 
                backgroundColor: 'var(--success)', 
                width: `${progressPercent}%`,
                transition: 'width 0.5s' 
              }}
            ></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span>{completedPhasesCount} of {roadmap.phases.length} Phases Done</span>
            <span>{Math.round(progressPercent)}% Complete</span>
          </div>
        </div>
      </div>

      {/* Main Roadmap Timeline grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '32px' }}>
        
        {/* Timeline Path */}
        <div>
          <div className="roadmap-timeline">
            {roadmap.phases.map((phase) => {
              const isCompleted = phase.progress[0]?.completed === true;
              return (
                <div 
                  key={phase.id}
                  className={`roadmap-step ${isCompleted ? 'completed' : ''}`}
                  onClick={() => setSelectedPhase({
                    ...phase,
                    completed: isCompleted
                  })}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="step-number" style={{ color: isCompleted ? 'var(--success)' : 'var(--primary)' }}>
                      PHASE {phase.phaseNumber}
                    </span>
                    {isCompleted ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '0.8rem', fontWeight: '600' }}>
                        <CheckCircle2 size={14} /> Completed
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        <Circle size={14} /> Pending
                      </span>
                    )}
                  </div>
                  <h3 className="step-title">{phase.title}</h3>
                  <p className="step-desc" style={{ display: '-webkit-box', WebkitLineBreak: 'auto', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {phase.description}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                        {phase.resources?.length || 0} Resources
                      </span>
                      <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                        {phase.projects?.length || 0} Projects
                      </span>
                    </div>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.8rem', color: 'var(--primary)' }}>
                      Details <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Curriculum Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <h3 className="card-title" style={{ fontSize: '1.05rem', marginBottom: '12px' }}>Capstone Projects</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>These ultimate full-stack capstone projects are meant to be completed after mastering phases.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {roadmap.globalProjects?.map((proj) => (
                <div key={proj.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '12px', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                  <h4 style={{ fontSize: '0.85rem', margin: '0 0 4px 0' }}>{proj.title}</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{proj.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="card-title" style={{ fontSize: '1.05rem', marginBottom: '12px' }}>Global Study Material</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Course books, documentation databases and references useful for all learning phases.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {roadmap.globalResources?.map((res) => (
                <a 
                  key={res.id} 
                  href={res.url} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', textDecoration: 'none', backgroundColor: 'rgba(255,255,255,0.01)', transition: 'background 0.2s' }}
                  hover-style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                >
                  <div style={{ minWidth: 0, flex: 1, paddingRight: '8px' }}>
                    <h4 style={{ fontSize: '0.85rem', margin: '0 0 2px 0', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{res.title}</h4>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>{res.description || 'Reference Guide'}</p>
                  </div>
                  <ExternalLink size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </a>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ─── PHASE DETAILS MODAL OVERLAY ──────────────────────────────── */}
      {selectedPhase && (
        <div className="modal-overlay" onClick={() => setSelectedPhase(null)}>
          <div className="modal-content" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="badge badge-purple" style={{ fontSize: '0.7rem', marginBottom: '6px' }}>PHASE {selectedPhase.phaseNumber}</span>
                <h3 className="modal-title">{selectedPhase.title}</h3>
              </div>
              <button onClick={() => setSelectedPhase(null)} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Description */}
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Phase Context</h4>
                <p style={{ fontSize: '0.95rem', margin: 0, lineHeight: '1.6' }}>{selectedPhase.description}</p>
              </div>

              {/* Topics tags list */}
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Key Topics to Master</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedPhase.topics?.map((topic: string, i: number) => (
                    <span key={i} className="skill-tag" style={{ fontSize: '0.8rem' }}>{topic}</span>
                  ))}
                </div>
              </div>

              {/* Phase Resources links */}
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Curated Study Material</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedPhase.resources?.map((res: any) => (
                    <a 
                      key={res.id} 
                      href={res.url} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', textDecoration: 'none', backgroundColor: 'rgba(255,255,255,0.01)' }}
                    >
                      <div>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>{res.title}</span>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>{res.description}</p>
                      </div>
                      <ExternalLink size={14} style={{ color: 'var(--text-muted)' }} />
                    </a>
                  ))}
                </div>
              </div>

              {/* Phase Projects list */}
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Required Projects (2)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {selectedPhase.projects?.map((proj: any) => (
                    <div key={proj.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                      <span className="badge badge-primary" style={{ fontSize: '0.65rem', marginBottom: '6px' }}>Project Target</span>
                      <h5 style={{ fontSize: '0.95rem', margin: '0 0 8px 0' }}>{proj.title}</h5>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>{proj.description}</p>
                      
                      {/* Steps breakdown rendering */}
                      {proj.steps && (
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--purple)', display: 'block', marginBottom: '6px' }}>IMPLEMENTATION STEPS</span>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '100px', overflowY: 'auto' }}>
                            {proj.steps.split('\n').map((step: string, idx: number) => (
                              <div key={idx} style={{ display: 'flex', gap: '4px' }}>
                                <span>{idx + 1}.</span>
                                <span>{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="modal-footer">
              <button 
                onClick={() => handleToggleCompletion(selectedPhase.id, selectedPhase.completed)}
                className={`btn ${selectedPhase.completed ? 'btn-secondary' : 'btn-success'}`}
                disabled={toggleProgressMutation.isPending}
              >
                {selectedPhase.completed ? 'Mark Phase Incomplete' : 'Mark Phase Completed ✓'}
              </button>
              <button onClick={() => setSelectedPhase(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
