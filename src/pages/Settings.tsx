import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Button from '../components/Button';
import { useStore } from '../lib/store';
import { logout } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';
import { isRemoteBackendConfigured } from '../lib/apiClient';

export default function Settings() {
  const nav = useNavigate();
  const { state, setAuth, resetAll } = useStore();

  const handleLogout = async () => {
    await logout();
    setAuth(null);
    nav('/login');
  };

  const handleResetData = () => {
    if (confirm('This will clear all your analysis data, questionnaire answers, and roadmap progress. Continue?')) {
      resetAll();
    }
  };

  const supabaseOk = isSupabaseConfigured();
  const backendOk = isRemoteBackendConfigured();

  return (
    <div className="chat">
      <Sidebar />

      <main className="chat__main" style={{ overflowY: 'auto' }}>
        <div className="skills-container page-enter">
          <header className="skills-header">
            <div>
              <span className="skills-pretitle">SETTINGS &amp; ARCHITECTURE</span>
              <h1 className="skills-title">Talyntra System Settings</h1>
              <p className="skills-subtitle">
                Inspect your Supabase connection, FastAPI backend, and account preferences.
              </p>
            </div>
          </header>

          {/* Target Architecture Status & Zero-Browser-Key Security */}
          <section className="glass settings-card">
            <div className="settings-card__head">
              <h3>
                <span className="sidebar__icon" style={{ display: 'inline-flex', marginRight: 8 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                    <line x1="6" y1="6" x2="6.01" y2="6" />
                    <line x1="6" y1="18" x2="6.01" y2="18" />
                  </svg>
                </span>
                Target Architecture &amp; Security
              </h3>
              <div className="status-indicator status--online">
                <span className="status-dot" />
                Zero Browser Key Exposure
              </div>
            </div>

            <p className="settings-desc">
              Talyntra adheres to strict production security standards: Google Gemini API keys live exclusively
              in server-side environment variables on the <strong>FastAPI service</strong>. No API keys are ever stored
              in <code>localStorage</code> or compiled into the client-side JavaScript bundle.
            </p>

            {/* Architecture Services Telemetry */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginTop: 8 }}>
              <div className="glass" style={{ padding: 14, borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>FastAPI AI Service</strong>
                  <span className={`confidence-badge ${backendOk ? 'confidence--verified' : 'confidence--moderate'}`}>
                    {backendOk ? 'Connected' : 'Local Engine Mode'}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  Endpoint: {backendOk ? 'Custom API Gateway' : 'http://localhost:8000'}
                </p>
              </div>

              <div className="glass" style={{ padding: 14, borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>Supabase Auth &amp; DB</strong>
                  <span className={`confidence-badge ${supabaseOk ? 'confidence--verified' : 'confidence--moderate'}`}>
                    {supabaseOk ? 'Connected' : 'Local Migration Fallback'}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  Row-Level Security &amp; Postgres schema enabled
                </p>
              </div>
            </div>
          </section>

          {/* Account */}
          <section className="glass settings-card">
            <h3>Account &amp; Session</h3>
            <div className="settings-account-row">
              <div className="avatar-circle" style={{ width: 48, height: 48, fontSize: 22 }}>
                {(state.auth?.fullName || state.profile.fullName || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <strong>{state.auth?.fullName || state.profile.fullName || 'Guest User'}</strong>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {state.auth?.email || 'demo@talyntra.ai'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--accent-cyan)', marginTop: 2 }}>
                  Auth Provider: {state.auth?.provider || 'Supabase / Local'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <Button variant="glass" onClick={handleLogout}>
                Sign Out
              </Button>
              <Button variant="glass" onClick={handleResetData}>
                Reset Local State
              </Button>
            </div>
          </section>

          {/* About */}
          <section className="glass settings-card">
            <h3>About Talyntra</h3>
            <p className="settings-desc">
              Talyntra — The Skill-Evidence Engine for Resumes.
              Powered by Evidence Graphs, exponential recency time decay, and quantitative Learning-ROI gap ranking.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
