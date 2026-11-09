import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Aurora from '../components/Aurora';
import Logo from '../components/Logo';
import Button from '../components/Button';
import { login, register, isAuthenticated } from '../lib/auth';
import { useStore } from '../lib/store';

export default function Login() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { setAuth, setProfile } = useStore();

  const [isSignup, setIsSignup] = useState(params.get('mode') === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect to upload
  useEffect(() => {
    if (isAuthenticated()) {
      nav('/upload', { replace: true });
    }
  }, [nav]);

  // ESC → go back to Home
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        nav('/');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [nav]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Small delay to feel responsive
    await new Promise(r => setTimeout(r, 300));

    if (isSignup) {
      const result = register(email, password, fullName);
      if (result.success && result.session) {
        setAuth(result.session);
        setProfile({ fullName: result.session.fullName });
        nav('/upload');
      } else {
        setError(result.error || 'Registration failed');
      }
    } else {
      const result = login(email, password);
      if (result.success && result.session) {
        setAuth(result.session);
        setProfile({ fullName: result.session.fullName });
        nav('/upload');
      } else {
        setError(result.error || 'Login failed');
      }
    }

    setLoading(false);
  };

  const handleProviderLogin = () => {
    // Simulate OAuth — register/login with a demo account
    const demoEmail = 'demo@talyntra.ai';
    const demoPass = 'demo1234';
    const demoName = 'Alex Morgan';

    // Try login first, then register
    let result = login(demoEmail, demoPass);
    if (!result.success) {
      result = register(demoEmail, demoPass, demoName);
    }

    if (result.success && result.session) {
      setAuth(result.session);
      setProfile({ fullName: result.session.fullName });
      nav('/upload');
    }
  };

  return (
    <Aurora className="center">
      <div className="login">
        <Logo size={64} />
        <h1>{isSignup ? 'Create Account' : 'Welcome Back'}</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: -8, textAlign: 'center' }}>
          {isSignup ? 'Sign up to start your career analysis journey' : 'Log in to continue your career journey'}
        </p>

        {error && (
          <div className="login-error">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="login__form">
          {isSignup && (
            <input
              className="field field--tall"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              aria-label="Full name"
              placeholder="Full Name"
              autoComplete="name"
            />
          )}

          <input
            className="field field--tall"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email address"
            placeholder="you@email.com"
            autoFocus
            autoComplete="email"
          />

          <input
            className="field field--tall"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Password"
            placeholder={isSignup ? 'Create password (4+ characters)' : 'Password'}
            minLength={4}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
          />

          <Button type="submit" className="login__continue" disabled={loading}>
            {loading ? (
              <><div className="spinner-sm" /> {isSignup ? 'Creating Account…' : 'Signing In…'}</>
            ) : (
              isSignup ? 'Create Account' : 'Sign In'
            )}
          </Button>
        </form>

        <div style={{ textAlign: 'center', fontSize: 14 }}>
          <button
            onClick={() => { setIsSignup(!isSignup); setError(''); }}
            style={{ background: 'none', border: 0, color: 'var(--accent-cyan)', cursor: 'pointer', textDecoration: 'underline', fontSize: 14 }}
          >
            {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>

        <div className="divider"><span>or</span></div>

        <button className="provider" onClick={handleProviderLogin}>
          <span style={{ marginRight: 8 }}>🚀</span> Quick Start with Demo Account
        </button>
        <button className="provider" onClick={handleProviderLogin}>
          <span style={{ marginRight: 8 }}>🔵</span> Sign in with Google
        </button>
        <button className="provider" onClick={handleProviderLogin}>
          <span style={{ marginRight: 8 }}>⬜</span> Sign in with Microsoft
        </button>

        <button
          onClick={() => nav('/')}
          style={{ marginTop: 8, background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}
        >
          ← Back to Home
        </button>
      </div>
    </Aurora>
  );
}
