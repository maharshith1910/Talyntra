import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Button from '../components/Button';
import { useStore } from '../lib/store';
import { CURATED_RESOURCES, generateRoadmap, RoadmapPhase } from '../lib/mockAI';

export default function Roadmap() {
  const nav = useNavigate();
  const { state, setRoadmap, toggleRoadmapAction } = useStore();
  const [loading, setLoading] = useState(!state.roadmap);
  const [exportedToast, setExportedToast] = useState(false);

  useEffect(() => {
    if (!state.roadmap) {
      setLoading(true);
      generateRoadmap(state.profile, state.validation || ({} as any)).then((rm) => {
        setRoadmap(rm);
        setLoading(false);
      });
    }
  }, [state.profile, state.validation, state.roadmap, setRoadmap]);

  const roadmap = state.roadmap;

  const handleExportPDF = () => {
    setExportedToast(true);
    setTimeout(() => setExportedToast(false), 3000);
  };

  return (
    <div className="chat">
      <Sidebar />

      <main className="chat__main" style={{ overflowY: 'auto' }}>
        {loading || !roadmap ? (
          <div className="center" style={{ minHeight: '60vh' }}>
            <div className="spinner" />
            <h2 style={{ marginTop: 20 }}>Synthesizing Gap-Closing Ideology…</h2>
            <p style={{ color: 'var(--muted)' }}>Formulating personalized milestones and resource tracks</p>
          </div>
        ) : (
          <div className="skills-container page-enter">
            {/* Header */}
            <header className="skills-header">
              <div>
                <span className="skills-pretitle">INTERFACE 4 • GAP-CLOSING IDEOLOGY &amp; ROADMAP</span>
                <h1 className="skills-title">Personalized Career Growth Blueprint</h1>
                <p className="skills-subtitle">
                  Bridging the delta between your current skill set and{' '}
                  <strong>Senior {state.profile.targetRole || 'Professional'}</strong> benchmarks.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <Button variant="glass" onClick={handleExportPDF}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export Roadmap PDF
                </Button>
              </div>
            </header>

            {exportedToast && (
              <div className="toast-banner">
                ✓ Roadmap export generated: <strong>Talyntra_Career_Blueprint_{state.profile.fullName.replace(/\s+/g, '_')}.pdf</strong>
              </div>
            )}

            {/* Core Ideology Banner */}
            <section className="glass roadmap-ideology-card">
              <div className="ideology-icon">💡</div>
              <div>
                <h3>The Talyntra Ideology: Bridge Through Proof of Execution</h3>
                <p>
                  Transitioning to senior tiers is not about collecting passive certifications; it requires{' '}
                  <em>verifiable artifacts of competence</em>. This roadmap is structured into 4 distinct phases
                  that systematically eliminate your vulnerabilities through deliberate building, public architecture
                  critique, and rigorous interview calibration.
                </p>
              </div>
            </section>

            {/* Main Content Layout: Timeline (left 65%) + Resources (right 35%) */}
            <div className="roadmap-layout">
              {/* Left Timeline */}
              <div className="timeline-col">
                {roadmap.map((phase: RoadmapPhase) => {
                  const completedCount = phase.actions.filter((a) => a.completed).length;
                  const totalCount = phase.actions.length;

                  return (
                    <div key={phase.phase} className="phase-card glass">
                      <div className="phase-head">
                        <div className="phase-badge">Phase 0{phase.phase}</div>
                        <div className="phase-time">{phase.timeline}</div>
                      </div>

                      <h3 className="phase-title">{phase.title}</h3>
                      <p className="phase-goal">
                        <strong>Strategic Goal:</strong> {phase.goal}
                      </p>

                      <div className="phase-progress-row">
                        <span style={{ fontSize: 13, color: '#7ef0ec' }}>
                          Milestones: {completedCount}/{totalCount} Completed
                        </span>
                        <div className="skill-bar-track" style={{ width: 140, height: 6 }}>
                          <div
                            className="skill-bar-fill"
                            style={{
                              width: `${(completedCount / totalCount) * 100}%`,
                              background: '#7ef0ec',
                            }}
                          />
                        </div>
                      </div>

                      <div className="actions-checklist">
                        {phase.actions.map((act) => (
                          <label
                            key={act.id}
                            className={`checklist-item ${act.completed ? 'checklist-item--checked' : ''}`}
                            onClick={() => toggleRoadmapAction(phase.phase, act.id)}
                          >
                            <input
                              type="checkbox"
                              checked={act.completed}
                              onChange={() => {}}
                              style={{ display: 'none' }}
                            />
                            <span className="check-box-square">{act.completed ? '✓' : ''}</span>
                            <span className="check-text">{act.text}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Resources Column */}
              <div className="resources-col">
                <div className="glass resources-card">
                  <h3>Curated Learning Tracks</h3>
                  <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
                    High-leverage resources selected for your specific gap profile.
                  </p>

                  <div className="resources-list">
                    {CURATED_RESOURCES.map((res) => (
                      <a
                        key={res.title}
                        href={res.url}
                        target="_blank"
                        rel="noreferrer"
                        className="resource-item"
                      >
                        <div className="res-top">
                          <span className="res-tag">{res.tag}</span>
                          <span className="res-type">{res.type}</span>
                        </div>
                        <h4 className="res-title">{res.title}</h4>
                        <div className="res-provider">{res.provider}</div>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Final Chatbot CTA */}
                <div className="glass consult-banner">
                  <h4>Have questions about your roadmap?</h4>
                  <p>Our conversational AI is ready to advise you on any phase or architectural challenge.</p>
                  <Button onClick={() => nav('/chat')}>Chat with Talyntra AI →</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

