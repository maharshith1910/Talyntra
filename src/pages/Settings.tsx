import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Button from '../components/Button';
import { useStore } from '../lib/store';
import { hasApiKey, setApiKey, clearApiKey, validateApiKey } from '../lib/geminiAI';
import { logout } from '../lib/auth';

export default function Settings() {
  const nav = useNavigate();
  const { state, setAuth, refreshAiStatus, resetAll } = useStore();

  const [keyInput, setKeyInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showKey, setShowKey] = useState(false);

  const currentKeyExists = hasApiKey();

  const handleSaveKey = async () => {
    const key = keyInput.trim();
    if (!key) return;

    setTesting(true);
    setTestResult(null);

    const result = await validateApiKey(key);
    if (result.valid) {
      setApiKey(key);
      refreshAiStatus();
      setTestResult({ ok: true, msg: 'API key verified and saved. Talyntra AI is now live!' });
      setKeyInput('');
    } else {
      setTestResult({ ok: false, msg: result.error || 'Invalid API key' });
    }
    setTesting(false);
  };

  const handleRemoveKey = () => {
    clearApiKey();
    refreshAiStatus();
    setTestResult({ ok: true, msg: 'API key removed. Talyntra will use offline mode.' });
  };

  const handleLogout = () => {
    logout();
    setAuth(null);
    nav('/login');
  };

  const handleResetData = () => {
    if (confirm('This will clear all your analysis data, questionnaire answers, and roadmap progress. Continue?')) {
      resetAll();
    }
  };

  return (
    <div className="chat">
      <Sidebar />

      <main className="chat__main" style={{ overflowY: 'auto' }}>
        <div className="skills-container page-enter">
          <header className="skills-header">
            <div>
              <span className="skills-pretitle">SETTINGS & CONFIGURATION</span>
              <h1 className="skills-title">Talyntra Settings</h1>
              <p className="skills-subtitle">
                Configure your AI connection, account, and preferences.
              </p>
            </div>
          </header>

          {/* AI Connection */}
          <section className="glass settings-card">
            <div className="settings-card__head">
              <h3>
                <span className="sidebar__icon" style={{ display: 'inline-flex', marginRight: 8 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10a9.96 9.96 0 0 1-5-1.34L2 22l1.34-5A9.96 9.96 0 0 1 2 12C2 6.48 6.48 2 12 2z" />
                  </svg>
                </span>
                Gemini AI Connection
              </h3>
              <div className={`status-indicator ${state.aiConnected ? 'status--online' : 'status--offline'}`}>
                <span className="status-dot" />
                {state.aiConnected ? 'Connected — Live AI' : 'Offline — Mock Responses'}
              </div>
            </div>

            <p className="settings-desc">
              Connect your Google Gemini API key to enable real-time AI-powered career guidance,
              streaming responses, and intelligent skill analysis. Without a key, Talyntra operates
              in offline demo mode with pre-generated responses.
            </p>

            <div className="settings-field-row">
              <input
                className="field settings-key-input"
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={currentKeyExists ? '••••••••••••••••• (key saved)' : 'Paste your Gemini API key here…'}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
              />
              <button
                className="settings-eye-btn"
                onClick={() => setShowKey(!showKey)}
                title={showKey ? 'Hide' : 'Show'}
                type="button"
              >
                {showKey ? '🙈' : '👁'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              <Button onClick={handleSaveKey} disabled={testing || !keyInput.trim()}>
                {testing ? (
                  <><div className="spinner-sm" /> Validating…</>
                ) : (
                  'Save & Verify Key'
                )}
              </Button>
              {currentKeyExists && (
                <Button variant="glass" onClick={handleRemoveKey}>
                  Remove Key
                </Button>
              )}
            </div>

            {testResult && (
              <div className={`settings-toast ${testResult.ok ? 'settings-toast--ok' : 'settings-toast--err'}`}>
                {testResult.ok ? '✓' : '✗'} {testResult.msg}
              </div>
            )}

            <div className="settings-help">
              <strong>How to get a free Gemini API key:</strong>
              <ol>
                <li>Go to <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a></li>
                <li>Sign in with your Google account</li>
                <li>Click "Create API Key" and copy it</li>
                <li>Paste it above and click "Save & Verify"</li>
              </ol>
            </div>
          </section>

          {/* Account */}
          <section className="glass settings-card">
            <h3>Account</h3>
            <div className="settings-account-row">
              <div className="avatar-circle" style={{ width: 48, height: 48, fontSize: 22 }}>
                {(state.auth?.fullName || state.profile.fullName || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <strong>{state.auth?.fullName || state.profile.fullName || 'Guest'}</strong>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {state.auth?.email || 'Not logged in'}
                </div>
                {state.auth?.loggedInAt && (
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Session started: {new Date(state.auth.loggedInAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <Button variant="glass" onClick={handleLogout}>
                Sign Out
              </Button>
              <Button variant="glass" onClick={handleResetData}>
                Reset All Data
              </Button>
            </div>
          </section>

          {/* About */}
          <section className="glass settings-card">
            <h3>About Talyntra</h3>
            <p className="settings-desc">
              Talyntra v2.0 — Intelligent Career & CV Skill Validator.
              Built with React 18, TypeScript, Vite, and Google Gemini AI.
            </p>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
              Upload your CV. Discover your edge. Close your gaps.
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

