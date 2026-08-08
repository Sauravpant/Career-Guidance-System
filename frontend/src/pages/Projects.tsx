import React, { useState } from 'react';
import { useProject } from '../hooks/useProject';
import { useRoadmap } from '../hooks/useRoadmap';
import { 
  FolderGit2, 
  CheckSquare, 
  Square, 
  Tag, 
  ExternalLink,
  Plus,
  Layers,
  X,
  PlusCircle
} from 'lucide-react';

export const Projects: React.FC = () => {
  const { 
    useProjects, 
    useCreateProjectMutation, 
    useUpdateProjectMutation, 
    useDeleteProjectMutation 
  } = useProject();

  const { useMyRoadmap } = useRoadmap();
  const { data: roadmap } = useMyRoadmap();

  const { data: projects, isLoading, error } = useProjects();
  const createMutation = useCreateProjectMutation();
  const updateMutation = useUpdateProjectMutation();
  const deleteMutation = useDeleteProjectMutation();

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'GLOBAL' | 'PHASE'>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSteps, setNewSteps] = useState('');
  const [newType, setNewType] = useState<'GLOBAL' | 'PHASE'>('PHASE');
  const [newPhaseId, setNewPhaseId] = useState('');

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await createMutation.mutateAsync({
        title: newTitle.trim(),
        description: newDesc.trim(),
        steps: newSteps.trim(),
        type: newType,
        phaseId: newType === 'PHASE' && newPhaseId ? newPhaseId : null
      });
      setShowAddModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewSteps('');
      setNewPhaseId('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to discard this project?')) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '60vh', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <span style={{ color: 'var(--text-secondary)' }}>Retrieving your project repository...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        Failed to fetch projects: {error.message}
      </div>
    );
  }

  // Filter projects list
  const filteredProjects = projects?.filter(p => {
    if (activeFilter === 'GLOBAL') return p.type === 'GLOBAL';
    if (activeFilter === 'PHASE') return p.type === 'PHASE';
    return true;
  }) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Filtering header controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setActiveFilter('ALL')}
            className={`btn ${activeFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
          >
            All Projects
          </button>
          <button 
            onClick={() => setActiveFilter('GLOBAL')}
            className={`btn ${activeFilter === 'GLOBAL' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Capstone Projects
          </button>
          <button 
            onClick={() => setActiveFilter('PHASE')}
            className={`btn ${activeFilter === 'PHASE' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Phase Projects
          </button>
        </div>

        <button 
          onClick={() => setShowAddModal(true)} 
          className="btn btn-success"
        >
          <Plus size={16} /> Add Custom Project
        </button>
      </div>

      {/* Projects list grid rendering */}
      {filteredProjects.length > 0 ? (
        <div className="list-grid">
          {filteredProjects.map((proj) => {
            const stepsList = proj.steps ? proj.steps.split('\n').filter(Boolean) : [];
            const phase = roadmap?.phases.find(ph => ph.id === proj.phaseId);

            return (
              <div key={proj.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <span className={`badge ${proj.type === 'GLOBAL' ? 'badge-purple' : 'badge-primary'}`}>
                      {proj.type === 'GLOBAL' ? 'Capstone' : phase ? `Phase ${phase.phaseNumber}` : 'Roadmap Phase'}
                    </span>
                    <button 
                      onClick={() => handleDelete(proj.id)} 
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </div>
                  
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    {proj.title}
                  </h3>
                  
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
                    {proj.description}
                  </p>

                  {/* Render steps check list */}
                  {stepsList.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '12px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary)', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                        IMPLEMENTATION GUIDES ({stepsList.length})
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                        {stepsList.map((step, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', alignItems: 'flex-start' }}>
                            <span style={{ color: 'var(--primary)', fontWeight: '700' }}>{idx + 1}.</span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {phase && (
                  <div style={{ marginTop: '20px', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                    Linked Phase: <strong>{phase.title}</strong>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ padding: '64px', textAlign: 'center' }}>
          <FolderGit2 size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', margin: '0 auto' }} />
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>No projects matching the filter. Click "Add Custom Project" to set up your own repository.</p>
        </div>
      )}

      {/* ─── ADD PROJECT MODAL ────────────────────────────────────────── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Custom Project</h3>
              <button onClick={() => setShowAddModal(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddProject}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div className="form-group">
                  <label className="form-label" htmlFor="proj-title">Project Name</label>
                  <input
                    id="proj-title"
                    type="text"
                    className="form-control"
                    placeholder="e.g. Portfolio Website"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="proj-desc">Description</label>
                  <textarea
                    id="proj-desc"
                    rows={3}
                    className="form-control"
                    placeholder="Provide a brief project summary..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="proj-steps">Development Steps (One step per line)</label>
                  <textarea
                    id="proj-steps"
                    rows={4}
                    className="form-control"
                    placeholder="Set up index.html&#10;Write style.css&#10;Configure JavaScript router"
                    value={newSteps}
                    onChange={(e) => setNewSteps(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="proj-type">Category</label>
                    <select
                      id="proj-type"
                      className="form-control"
                      style={{ backgroundColor: 'var(--bg-primary)' }}
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as any)}
                    >
                      <option value="PHASE">Roadmap Phase Project</option>
                      <option value="GLOBAL">Capstone Project</option>
                    </select>
                  </div>

                  {newType === 'PHASE' && roadmap && roadmap.phases.length > 0 && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="proj-phase">Link to Roadmap Phase</label>
                      <select
                        id="proj-phase"
                        className="form-control"
                        style={{ backgroundColor: 'var(--bg-primary)' }}
                        value={newPhaseId}
                        onChange={(e) => setNewPhaseId(e.target.value)}
                      >
                        <option value="">-- Choose Phase --</option>
                        {roadmap.phases.map(ph => (
                          <option key={ph.id} value={ph.id}>
                            Phase {ph.phaseNumber}: {ph.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-success" disabled={createMutation.isPending}>
                  Create Project
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
