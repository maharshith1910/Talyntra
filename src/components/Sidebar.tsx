import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Logo from './Logo';
import { useStore } from '../lib/store';
import { isServerAiConfigured } from '../lib/geminiAI';
import { logout } from '../lib/auth';

export default function Sidebar() {
  const nav = useNavigate();
  const location = useLocation();
  const { state, setAuth } = useStore();
  const currentPath = location.pathname;
  const currentSearch = location.search;

  const navItems = [
    {
      label: 'Upload & Profile',
      path: '/upload',
      matchPaths: ['/upload'],
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      ),
    },
    {
      label: 'Skill Analysis',
      path: '/skills',
      matchPaths: ['/skills'],
      matchExact: true,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
    {
      label: 'Gap Analysis',
      path: '/skills?tab=missing',
      matchPaths: ['/skills'],
      matchQuery: 'tab=missing',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
    {
      label: 'Questionnaire',
      path: '/questionnaire',
      matchPaths: ['/questionnaire'],
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      label: 'Validation',
      path: '/validation',
      matchPaths: ['/validation'],
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      ),
    },
    {
      label: 'Roadmap',
      path: '/roadmap',
      matchPaths: ['/roadmap'],
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" />
        </svg>
      ),
    },
    {
      label: 'AI Chat',
      path: '/chat',
      matchPaths: ['/chat'],
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M8 12h.01M12 12h.01M16 12h.01" />
        </svg>
      ),
    },
    {
      label: 'Settings',
      path: '/settings',
      matchPaths: ['/settings'],
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ];

  const initial = state.profile.fullName ? state.profile.fullName.charAt(0).toUpperCase() : 'U';
  const aiConnected = isServerAiConfigured();

  // ESC key => go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept ESC when an input/textarea is focused
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === 'Escape' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        window.history.back();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isItemActive = (item: typeof navItems[0]): boolean => {
    const pathMatches = item.matchPaths.includes(currentPath);
    if (!pathMatches) return false;
    if (item.matchQuery) return currentSearch.includes(item.matchQuery);
    if (item.matchExact) return !currentSearch.includes('tab=missing');
    return true;
  };

  const handleLogout = () => {
    logout();
    setAuth(null);
    nav('/login');
  };

  return (
    <aside className="chat__side" style={{ display: 'flex' }}>
      <div className="chat__brand" style={{ cursor: 'pointer' }} onClick={() => nav('/')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && nav('/')}>
        <Logo size={40} />
        <span>Talyntra</span>
        <div className={`sidebar-ai-dot ${aiConnected ? 'sidebar-ai-dot--live' : ''}`} title={aiConnected ? 'AI Connected' : 'Demo Mode'} />
      </div>

      <nav className="sidebar__nav" aria-label="Main navigation">
        {navItems.map((item) => {
          const active = isItemActive(item);
          return (
            <button
              key={item.label}
              className={`sidebar__item ${active ? 'sidebar__item--active' : ''}`}
              onClick={() => nav(item.path)}
              aria-current={active ? 'page' : undefined}
              title={item.label}
            >
              <span className="sidebar__icon">{item.icon}</span>
              <span className="sidebar__label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar__quick-actions">
        <div className={`sidebar__badge ${aiConnected ? 'sidebar__badge--live' : ''}`}>
          <span className="sidebar__pulse" />
          {aiConnected ? 'FastAPI + Gemini' : 'Evidence Engine'}
        </div>
      </div>

      <footer className="chat__user">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="avatar-circle">{initial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {state.profile.fullName || state.auth?.fullName || 'Guest'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {state.profile.targetRole || 'Set your target role'}
            </div>
          </div>
          <button
            className="sidebar-logout-btn"
            onClick={handleLogout}
            title="Sign out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </footer>
    </aside>
  );
}
