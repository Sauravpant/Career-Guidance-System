import React, { useState } from 'react';
import { useUser } from '../hooks/useUser';
import { useAuth } from '../hooks/useAuth';
import { 
  Cpu, 
  HelpCircle, 
  ShieldCheck,
  Calendar,
  CheckCircle,
  Search
} from 'lucide-react';

export const CareerEngine: React.FC<{ setActiveTab: (tab: string) => void }> = ({ setActiveTab }) => {
  const { user } = useAuth();
  const { 
    useRecommendationHistory, 
    useRecommendCareerMutation,
    useExploreCareersMutation,
    useSelectCareerMutation
  } = useUser();

  const { data: historyList, isLoading } = useRecommendationHistory();
  const recommendMutation = useRecommendCareerMutation();
  const exploreMutation = useExploreCareersMutation();
  const selectCareerMutation = useSelectCareerMutation(() => {
    // Auto-navigate to roadmap after career is selected & all caches are reset
    setActiveTab('roadmap');
  });

  const [activeTab, setLocalTab] = useState<'my-recommendation' | 'explore'>('my-recommendation');
  const [skillsInput, setSkillsInput] = useState('');
  const [experienceInput, setExperienceInput] = useState('0');
  
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; careerName: string }>({ isOpen: false, careerName: '' });
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; isError?: boolean }>({ isOpen: false, message: '' });

  const handleRecommend = async () => {
    try {
      await recommendMutation.mutateAsync();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExplore = async (e: React.FormEvent) => {
    e.preventDefault();
    const skillsArray = skillsInput.split(',').map(s => s.trim()).filter(Boolean);
    const parsedExp = Number(experienceInput);

    try {
      await exploreMutation.mutateAsync({
        skills: skillsArray,
        experience: isNaN(parsedExp) ? 0 : parsedExp
      });
    } catch (err) {
      console.error(err);
    }
  };

  const openConfirmModal = (careerName: string) => {
    setConfirmModal({ isOpen: true, careerName });
  };

  const handleSelectCareer = async () => {
    const careerName = confirmModal.careerName;
    setConfirmModal({ isOpen: false, careerName: '' });
    try {
      await selectCareerMutation.mutateAsync(careerName);
      // onSuccess callback in the mutation handles navigation automatically
    } catch (err) {
      console.error(err);
      setAlertModal({ isOpen: true, message: 'Failed to select career. Please try again.', isError: true });
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '60vh', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <span style={{ color: 'var(--text-secondary)' }}>Loading Career Engine...</span>
      </div>
    );
  }

  const latestRec = historyList && historyList.length > 0 ? historyList[0] : null;

  const getTop3Array = (rec: any) => {
    if (!rec || !rec.top3) return [];
    if (Array.isArray(rec.top3)) return rec.top3;
    if (typeof rec.top3 === 'string') {
      try {
        const parsed = JSON.parse(rec.top3);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  const myTop3List = getTop3Array(latestRec);
  const exploredTop3List = exploreMutation.data ? getTop3Array(exploreMutation.data) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-color)' }}>
        <button 
          onClick={() => setLocalTab('my-recommendation')}
          style={{
            background: 'none',
            border: 'none',
            padding: '12px 16px',
            color: activeTab === 'my-recommendation' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'my-recommendation' ? '2px solid var(--primary)' : '2px solid transparent',
            fontWeight: activeTab === 'my-recommendation' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Cpu size={18} /> My Recommendations
        </button>
        <button 
          onClick={() => setLocalTab('explore')}
          style={{
            background: 'none',
            border: 'none',
            padding: '12px 16px',
            color: activeTab === 'explore' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'explore' ? '2px solid var(--primary)' : '2px solid transparent',
            fontWeight: activeTab === 'explore' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Search size={18} /> Explore Careers
        </button>
      </div>

      {activeTab === 'my-recommendation' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
          
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 8px 0' }}>Personalized Career Prediction</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Uses your profile's saved skills and experience to find the best career match.
              </p>
            </div>
            <button 
              onClick={handleRecommend}
              className="btn btn-primary"
              disabled={recommendMutation.isPending}
            >
              {recommendMutation.isPending ? 'Calculating...' : 'Refresh Prediction'}
            </button>
          </div>
          
          {recommendMutation.error && (
            <div className="alert alert-danger">
              {(recommendMutation.error as any).message || 'Failed to fetch recommendation. Please update your profile skills first.'}
            </div>
          )}

          {latestRec ? (
            <div className="card" style={{ borderTop: '4px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <span className="badge badge-primary" style={{ marginBottom: '8px' }}>Best Matching Career Direction</span>
                  <h2 style={{ fontSize: '2rem', margin: 0, fontWeight: '800' }}>{latestRec.bestCareer}</h2>
                  <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Audited on {new Date(latestRec.createdAt).toLocaleDateString()}
                  </p>
                  <button 
                    onClick={() => openConfirmModal(latestRec.bestCareer)}
                    className="btn btn-primary"
                    style={{ marginTop: '16px' }}
                    disabled={selectCareerMutation.isPending}
                  >
                    <CheckCircle size={16} /> Select as Career
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', backgroundColor: 'var(--bg-base)', padding: '16px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={22} style={{ color: 'var(--success)' }} />
                    <span style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.04em' }}>
                      {Math.round(latestRec.confidence * 100)}<span style={{ fontSize: '1.25rem', color: 'var(--text-muted)', fontWeight: '600' }}>%</span>
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500', marginTop: '4px' }}>Model Confidence Match</span>
                </div>
              </div>

              {/* Confidence Progress Ring preview */}
              <div style={{ height: '8px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden', marginBottom: '32px' }}>
                <div style={{ height: '100%', backgroundColor: 'var(--primary)', width: `${latestRec.confidence * 100}%`, transition: 'width 0.5s' }}></div>
              </div>

              {/* Top 3 breakdown */}
              {myTop3List.length > 0 && (
                <div>
                  <h3 className="card-title" style={{ fontSize: '1.05rem', marginBottom: '16px' }}>Other Suggested Career Paths</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    {myTop3List.map((item: any, idx: number) => {
                      const score = typeof item.score === 'number' ? item.score : parseFloat(item.score || 0);
                      const careerName = item.career || item.name;
                      return (
                        <div 
                          key={idx} 
                          style={{ 
                            border: '1px solid var(--border-color)', 
                            borderRadius: 'var(--radius-md)', 
                            padding: '16px',
                            backgroundColor: 'rgba(255,255,255,0.01)',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary)' }}>RANK #{idx + 1}</span>
                              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--success)' }}>
                                {Math.round(score * 100)}% Match
                              </span>
                            </div>
                            <h4 style={{ fontSize: '1rem', margin: '0 0 16px 0', fontWeight: '600', color: 'var(--text-primary)' }}>
                              {careerName}
                            </h4>
                          </div>
                          <button 
                            onClick={() => openConfirmModal(careerName)}
                            className="btn btn-secondary"
                            style={{ width: '100%' }}
                            disabled={selectCareerMutation.isPending}
                          >
                            Select
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px' }}>
              <h3 className="card-title" style={{ color: 'var(--warning)', fontSize: '1.1rem' }}>
                <HelpCircle size={18} />
                <span>No Recommendation Found</span>
              </h3>
              <p style={{ fontSize: '0.9rem', lineHeight: '1.6', margin: '12px 0 0 0' }}>
                Click "Refresh Prediction" to get your personalized career recommendation based on your profile's skills and experience.
              </p>
            </div>
          )}

          {/* History Log Table */}
          {historyList && historyList.length > 1 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Previous recommendation runs</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {historyList.slice(1).map((hist) => (
                  <div 
                    key={hist.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: '12px 16px', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(255,255,255,0.01)'
                    }}
                  >
                    <div>
                      <h4 style={{ fontSize: '0.9rem', margin: '0 0 4px 0' }}>{hist.bestCareer}</h4>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} /> {new Date(hist.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--success)' }}>
                        {Math.round(hist.confidence * 100)}% confidence
                      </div>
                      <button 
                        onClick={() => openConfirmModal(hist.bestCareer)}
                        className="btn btn-secondary"
                        disabled={selectCareerMutation.isPending}
                      >
                        Select
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'explore' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
          
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Search size={18} style={{ color: 'var(--primary)' }} />
                <span>Explore Careers</span>
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Enter custom skills and experience to see potential career matches. This is for exploration only and will not affect your profile.
            </p>

            <form onSubmit={handleExplore} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="rec-skills">Skills (Comma Separated)</label>
                <textarea
                  id="rec-skills"
                  rows={3}
                  className="form-control"
                  placeholder="e.g. JavaScript, CSS, Node.js, Git"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="rec-experience">Years of Experience</label>
                <input
                  id="rec-experience"
                  type="number"
                  min="0"
                  className="form-control"
                  value={experienceInput}
                  onChange={(e) => setExperienceInput(e.target.value)}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-secondary"
                disabled={exploreMutation.isPending || !skillsInput.trim()}
              >
                {exploreMutation.isPending ? 'Exploring...' : 'Explore Matches'}
              </button>
            </form>

            {exploreMutation.error && (
              <div className="alert alert-danger" style={{ marginTop: '16px' }}>
                {(exploreMutation.error as any).message || 'Failed to explore careers.'}
              </div>
            )}
          </div>

          <div>
            {exploreMutation.data ? (
              <div className="card" style={{ borderTop: '4px solid var(--primary)' }}>
                <span className="badge badge-primary" style={{ marginBottom: '8px' }}>Exploration Result</span>
                <h2 style={{ fontSize: '2rem', margin: '0 0 16px 0', fontWeight: '800' }}>{exploreMutation.data.bestCareer}</h2>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '24px', backgroundColor: 'var(--bg-base)', padding: '12px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                  <ShieldCheck size={24} style={{ color: 'var(--success)' }} />
                  <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                    {Math.round(exploreMutation.data.confidence * 100)}% <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: '600' }}>Match</span>
                  </span>
                </div>

                {exploredTop3List.length > 0 && (
                  <div>
                    <h3 className="card-title" style={{ fontSize: '1rem', marginBottom: '12px' }}>Other Matches</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {exploredTop3List.map((item: any, idx: number) => {
                        const score = typeof item.score === 'number' ? item.score : parseFloat(item.score || 0);
                        return (
                          <div 
                            key={idx} 
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              border: '1px solid var(--border-color)', 
                              borderRadius: 'var(--radius-md)', 
                              padding: '12px',
                              backgroundColor: 'rgba(255,255,255,0.01)'
                            }}
                          >
                            <span style={{ fontWeight: '600' }}>{item.career || item.name}</span>
                            <span style={{ color: 'var(--success)', fontWeight: '700', fontSize: '0.85rem' }}>
                              {Math.round(score * 100)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px', height: '100%' }}>
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  Submit the form to explore potential career matches.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Select Career Path</h3>
              <button onClick={() => setConfirmModal({ isOpen: false, careerName: '' })} className="modal-close">✕</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to select <strong>"{confirmModal.careerName}"</strong> as your career?</p>
              <p style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>
                Warning: This action will reset your past roadmap, tasks, and progress. Your new ecosystem will be strictly built around this career.
              </p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setConfirmModal({ isOpen: false, careerName: '' })} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSelectCareer} className="btn btn-primary">Confirm Selection</button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{alertModal.isError ? 'Error' : 'Success'}</h3>
              <button onClick={() => setAlertModal({ isOpen: false, message: '' })} className="modal-close">✕</button>
            </div>
            <div className="modal-body">
              <p>{alertModal.message}</p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setAlertModal({ isOpen: false, message: '' })} className="btn btn-primary">Okay</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
