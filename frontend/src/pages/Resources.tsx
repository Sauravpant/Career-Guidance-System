import React, { useState } from 'react';
import { useResource } from '../hooks/useResource';
import { useRoadmap } from '../hooks/useRoadmap';
import { 
  BookOpen, 
  ExternalLink, 
  Plus, 
  Trash2, 
  X,
  Compass,
  Link
} from 'lucide-react';

export const Resources: React.FC = () => {
  const { 
    useResources, 
    useCreateResourceMutation, 
    useDeleteResourceMutation 
  } = useResource();

  const { useMyRoadmap } = useRoadmap();
  const { data: roadmap } = useMyRoadmap();

  const { data: resources, isLoading, error } = useResources();
  const createMutation = useCreateResourceMutation();
  const deleteMutation = useDeleteResourceMutation();

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'GLOBAL' | 'PHASE'>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<'GLOBAL' | 'PHASE'>('PHASE');
  const [newPhaseId, setNewPhaseId] = useState('');

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    try {
      await createMutation.mutateAsync({
        title: newTitle.trim(),
        description: newDesc.trim(),
        url: newUrl.trim(),
        type: newType,
        phaseId: newType === 'PHASE' && newPhaseId ? newPhaseId : null
      });
      setShowAddModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewUrl('');
      setNewPhaseId('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to discard this learning reference?')) return;
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
        <span style={{ color: 'var(--text-secondary)' }}>Gathering learning databases...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        Failed to fetch resources: {error.message}
      </div>
    );
  }

  // Filter resources list
  const filteredResources = resources?.filter(r => {
    if (activeFilter === 'GLOBAL') return r.type === 'GLOBAL';
    if (activeFilter === 'PHASE') return r.type === 'PHASE';
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
            All Resources
          </button>
          <button 
            onClick={() => setActiveFilter('GLOBAL')}
            className={`btn ${activeFilter === 'GLOBAL' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Global Guides
          </button>
          <button 
            onClick={() => setActiveFilter('PHASE')}
            className={`btn ${activeFilter === 'PHASE' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Phase Specifics
          </button>
        </div>

        <button 
          onClick={() => setShowAddModal(true)} 
          className="btn btn-success"
        >
          <Plus size={16} /> Add Custom Link
        </button>
      </div>

      {/* Resources list grid rendering */}
      {filteredResources.length > 0 ? (
        <div className="list-grid">
          {filteredResources.map((res) => {
            const phase = roadmap?.phases.find(ph => ph.id === res.phaseId);

            return (
              <a 
                key={res.id} 
                href={res.url} 
                target="_blank" 
                rel="noreferrer"
                className="card"
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  textDecoration: 'none',
                  minHeight: '160px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <span className={`badge ${res.type === 'GLOBAL' ? 'badge-purple' : 'badge-primary'}`}>
                      {res.type === 'GLOBAL' ? 'Global' : phase ? `Phase ${phase.phaseNumber}` : 'Roadmap Phase'}
                    </span>
                    <button 
                      onClick={(e) => handleDelete(e, res.id)} 
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.8rem', cursor: 'pointer', zIndex: 10 }}
                    >
                      Delete
                    </button>
                  </div>
                  
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Link size={16} style={{ color: 'var(--primary)' }} />
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '90%' }}>{res.title}</span>
                  </h3>
                  
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                    {res.description || 'Reference Guide'}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>{phase ? `Phase: ${phase.title.slice(0, 20)}...` : 'General Material'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', fontWeight: '600' }}>
                    Open <ExternalLink size={12} />
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ padding: '64px', textAlign: 'center' }}>
          <BookOpen size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', margin: '0 auto' }} />
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>No references saved. Tap "Add Custom Link" to link books, documentation or playlists.</p>
        </div>
      )}

      {/* ─── ADD RESOURCE MODAL ──────────────────────────────────────── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Reference Link</h3>
              <button onClick={() => setShowAddModal(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddResource}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div className="form-group">
                  <label className="form-label" htmlFor="res-title">Link Title</label>
                  <input
                    id="res-title"
                    type="text"
                    className="form-control"
                    placeholder="e.g. React Docs Hooks Guide"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="res-url">Target URL</label>
                  <input
                    id="res-url"
                    type="url"
                    className="form-control"
                    placeholder="https://react.dev/reference/react/hooks"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="res-desc">Description</label>
                  <textarea
                    id="res-desc"
                    rows={2}
                    className="form-control"
                    placeholder="Explain what is taught here..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="res-type">Category</label>
                    <select
                      id="res-type"
                      className="form-control"
                      style={{ backgroundColor: 'var(--bg-primary)' }}
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as any)}
                    >
                      <option value="PHASE">Roadmap Phase Reference</option>
                      <option value="GLOBAL">Global Syllabus reference</option>
                    </select>
                  </div>

                  {newType === 'PHASE' && roadmap && roadmap.phases.length > 0 && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="res-phase">Link to Roadmap Phase</label>
                      <select
                        id="res-phase"
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
                  Save Link
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
