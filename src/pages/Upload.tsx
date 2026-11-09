import { DragEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Aurora from '../components/Aurora';
import Logo from '../components/Logo';
import Button from '../components/Button';
import { useStore } from '../lib/store';
import { analyzeCV } from '../lib/mockAI';

const ACCEPT = '.pdf,.doc,.docx';

export default function Upload() {
  const nav = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const { state, setProfile, setCvFile, setSkills } = useStore();

  const [over, setOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [analyzingProfile, setAnalyzingProfile] = useState(false);
  const [form, setForm] = useState({
    fullName: state.profile.fullName || '',
    targetRole: state.profile.targetRole || '',
    experience: state.profile.experience || '',
    location: state.profile.location || '',
    linkedIn: state.profile.linkedIn || '',
  });

  // ESC → go back to login
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        nav('/login');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [nav]);

  const handleFile = (f?: File) => {
    if (!f || !/\.(pdf|docx?)$/i.test(f.name)) return;
    setParsing(true);
    setCvFile({ name: f.name, size: f.size });

    // Simulate backend CV text parsing & keyword extraction
    setTimeout(() => {
      setParsing(false);
      // Auto-populate intelligent defaults if blank
      if (!form.fullName) {
        setForm((prev) => ({
          ...prev,
          fullName: f.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
        }));
      }
    }, 1200);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const setField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [k]: e.target.value });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const updatedProfile = {
      fullName: form.fullName.trim() || 'Alex Morgan',
      targetRole: form.targetRole.trim() || 'Senior Frontend Engineer',
      experience: form.experience.trim() || '3+ years',
      location: form.location.trim() || 'Remote',
      linkedIn: form.linkedIn.trim() || '',
      fileName: state.cvFile?.name || 'Uploaded_CV.pdf',
    };

    setProfile(updatedProfile);
    setAnalyzingProfile(true);

    try {
      const skillsResult = await analyzeCV(updatedProfile);
      setSkills(skillsResult);
      nav('/skills');
    } catch (err) {
      console.error(err);
      nav('/skills');
    } finally {
      setAnalyzingProfile(false);
    }
  };

  return (
    <Aurora className="center center--top">
      <header className="upload__head">
        <Logo size={72} />
        <div>
          <h1>Career Skill Analyzer</h1>
          <p>Upload your CV to analyze your skills</p>
        </div>
      </header>

      {/* Resume Dropzone — entire zone is clickable */}
      <section
        className={`glass dropzone ${over ? 'is-over' : ''} ${parsing ? 'dropzone--parsing' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        onClick={() => !parsing && !analyzingProfile && input.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && !parsing && !analyzingProfile && input.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload resume dropzone — click or drag and drop"
        style={{ cursor: parsing || analyzingProfile ? 'wait' : 'pointer' }}
      >
        <h2>Upload your Resume</h2>

        {parsing ? (
          <div className="parsing-indicator">
            <div className="spinner" />
            <p>Analyzing CV structure &amp; skills at backend…</p>
          </div>
        ) : state.cvFile ? (
          <div className="parsed-badge">
            <span className="parsed-check">✓</span>
            <p className="parsed-name">{state.cvFile.name}</p>
            <span className="parsed-meta">Analyzed • Ready for validation</span>
          </div>
        ) : (
          <p>
            Drag &amp; Drop or Click to Upload
            <br />
            PDF / DOCX supported
          </p>
        )}

        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          hidden
          onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
        />

        <Button
          type="button"
          onClick={(e) => { e.stopPropagation(); input.current?.click(); }}
          disabled={parsing || analyzingProfile}
        >
          {state.cvFile ? 'Replace CV' : 'Upload CV'}
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
          </svg>
        </Button>
      </section>

      {/* Basic Details Form matching Figma */}
      <form className="glass details" onSubmit={submit}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Basic Details</h2>
          <span style={{ fontSize: '13px', color: '#7ef0ec' }}>* Required for scoring</span>
        </div>

        <label>
          Full Name
          <input
            className="field"
            value={form.fullName}
            onChange={setField('fullName')}
            placeholder="e.g. Alex Morgan"
            required
          />
        </label>

        <label>
          Target Role
          <input
            className="field"
            value={form.targetRole}
            onChange={setField('targetRole')}
            placeholder="e.g. Senior Frontend Engineer"
            required
          />
        </label>

        <label>
          Experience
          <input
            className="field"
            value={form.experience}
            onChange={setField('experience')}
            placeholder="e.g. 4 years"
            required
          />
        </label>

        <label>
          Location
          <input
            className="field"
            value={form.location}
            onChange={setField('location')}
            placeholder="e.g. San Francisco, CA / Remote"
          />
        </label>

        <label>
          LinkedIn
          <input
            className="field"
            value={form.linkedIn}
            onChange={setField('linkedIn')}
            placeholder="linkedin.com/in/username (optional)"
          />
        </label>

        <Button type="submit" className="details__submit" disabled={analyzingProfile}>
          {analyzingProfile ? (
            <>
              <div className="spinner-sm" /> Analyzing Profile…
            </>
          ) : (
            'Analyze Skill Set →'
          )}
        </Button>
      </form>

      {/* Back link */}
      <button
        onClick={() => nav('/login')}
        style={{ marginTop: 8, background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer', fontSize: 14, textDecoration: 'underline' }}
      >
        ← Back to Login
      </button>
    </Aurora>
  );
}
