import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useUser } from '../hooks/useUser';
import { 
  User, 
  Mail, 
  GraduationCap, 
  Briefcase, 
  Award, 
  Plus, 
  X, 
  Check,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const { useUpdateProfileMutation } = useUser();
  const updateMutation = useUpdateProfileMutation();

  const [name, setName] = useState(user?.name || '');
  const [education, setEducation] = useState(user?.education || '');
  const [experience, setExperience] = useState(String(user?.experience || 0));
  const [skills, setSkills] = useState<string[]>(user?.skills || []);
  const [skillInput, setSkillInput] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Sync state if user changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEducation(user.education || '');
      setExperience(String(user.experience || 0));
      setSkills(user.skills || []);
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = skillInput.trim();
    if (clean && !skills.includes(clean)) {
      setSkills([...skills, clean]);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await updateMutation.mutateAsync({
        name: name.trim(),
        education: education.trim() || null,
        experience: Number(experience),
        skills,
        avatarUrl: avatarUrl.trim() || null
      });
      setSuccessMsg('Profile updated successfully!');
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.');
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Banner with Profile Image Preview */}
        <div className="card" style={{ padding: 0, overflow: 'visible', marginBottom: '16px' }}>
          <div style={{ height: '120px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--purple) 100%)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}></div>
          <div style={{ padding: '0 24px 24px 24px', display: 'flex', alignItems: 'flex-end', marginTop: '-50px', gap: '20px', flexWrap: 'wrap' }}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar Preview"
                style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--bg-secondary)', backgroundColor: 'var(--bg-tertiary)', flexShrink: 0 }}
              />
            ) : (
              <div
                style={{ 
                  width: '100px', height: '100px', borderRadius: '50%', 
                  border: '4px solid var(--bg-secondary)', backgroundColor: 'var(--primary)', 
                  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: '3rem', fontWeight: 600,
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0, paddingBottom: '10px' }}>
              <h2 style={{ fontSize: '1.5rem', margin: '0 0 4px 0' }}>{user?.name}</h2>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem' }}>{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Notices */}
        {successMsg && (
          <div className="alert alert-info">
            <Check size={16} style={{ color: 'var(--success)' }} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="alert alert-danger">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Main profile inputs */}
        <div className="card">
          <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px' }}>
            <h3 className="card-title">General Information</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Full Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="profile-name">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
                <input
                  id="profile-name"
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '45px', width: '100%' }}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Avatar URL */}
            <div className="form-group">
              <label className="form-label" htmlFor="profile-avatar">Avatar Image URL (Optional)</label>
              <div style={{ position: 'relative' }}>
                <ImageIcon size={16} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
                <input
                  id="profile-avatar"
                  type="url"
                  className="form-control"
                  style={{ paddingLeft: '45px', width: '100%' }}
                  placeholder="https://images.unsplash.com/photo-..."
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                />
              </div>
            </div>

            {/* Split row: Education & Experience */}
            <div className="form-row">
              {/* Education */}
              <div className="form-group">
                <label className="form-label" htmlFor="profile-edu">Education Details</label>
                <div style={{ position: 'relative' }}>
                  <GraduationCap size={16} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
                  <input
                    id="profile-edu"
                    type="text"
                    className="form-control"
                    style={{ paddingLeft: '45px', width: '100%' }}
                    placeholder="B.Sc. in Computer Science"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                  />
                </div>
              </div>

              {/* Experience */}
              <div className="form-group">
                <label className="form-label" htmlFor="profile-exp">Years of Experience</label>
                <div style={{ position: 'relative' }}>
                  <Briefcase size={16} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
                  <input
                    id="profile-exp"
                    type="number"
                    min="0"
                    className="form-control"
                    style={{ paddingLeft: '45px', width: '100%' }}
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Skill tags editor */}
        <div className="card">
          <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px' }}>
            <h3 className="card-title">
              <Award size={18} style={{ color: 'var(--primary)' }} />
              <span>Skill Inventory Registry</span>
            </h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            List programming languages, tools, frameworks or methodologies you possess. These will be evaluated in the Career Engine and Skill Gap Analyzer.
          </p>

          {/* Add skill tag form */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <input
              type="text"
              className="form-control"
              style={{ flex: 1 }}
              placeholder="e.g. Next.js, Redux, Kubernetes"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const clean = skillInput.trim();
                  if (clean && !skills.includes(clean)) {
                    setSkills([...skills, clean]);
                    setSkillInput('');
                  }
                }
              }}
            />
            <button 
              type="button" 
              onClick={handleAddSkill} 
              className="btn btn-secondary"
              disabled={!skillInput.trim()}
            >
              <Plus size={16} /> Add tag
            </button>
          </div>

          {/* Render current tags */}
          <div className="skills-list" style={{ minHeight: '60px', padding: '12px', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
            {skills.length > 0 ? (
              skills.map(s => (
                <span key={s} className="skill-tag">
                  <span>{s}</span>
                  <X 
                    size={12} 
                    style={{ cursor: 'pointer', color: 'var(--danger)' }} 
                    onClick={() => handleRemoveSkill(s)}
                  />
                </span>
              ))
            ) : (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No tags registered. Enter one above or press enter.</span>
            )}
          </div>
        </div>

        {/* Submit */}
        <button 
          type="submit" 
          className="btn btn-primary"
          style={{ padding: '14px', width: '100%', fontSize: '1rem' }}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? 'Saving profile changes...' : 'Save Profile Details'}
        </button>

      </form>
    </div>
  );
};
