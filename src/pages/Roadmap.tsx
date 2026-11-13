import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Button from '../components/Button';
import { useStore } from '../lib/store';
import { CURATED_RESOURCES, generateRoadmap, RoadmapPhase, RoadmapAction } from '../lib/mockAI';

export default function Roadmap() {
  const nav = useNavigate();
  const { state, setRoadmap, toggleRoadmapAction } = useStore();
  const [loading, setLoading] = useState(!state.roadmap);
  const [exportedToast, setExportedToast] = useState(false);
  const [feedbackFeedbackSkill, setFeedbackSkill] = useState<string | null>(null);

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
    const prevTitle = document.title;
    const cleanName = (state.profile.fullName || 'Candidate').replace(/\s+/g, '_');
    const targetRole = (state.profile.targetRole || 'Software_Engineer').replace(/\s+/g, '_');
    document.title = `Talyntra_Career_Blueprint_${cleanName}_${targetRole}`;
    setExportedToast(true);

    setTimeout(() => {
      window.print();
      document.title = prevTitle;
      setTimeout(() => setExportedToast(false), 3500);
    }, 150);
  };

  const handleToggle = (phase: number, act: RoadmapAction) => {
    toggleRoadmapAction(phase, act.id);
    if (!act.completed && act.verifiesSkill) {
      setFeedbackSkill(act.verifiesSkill);
      setTimeout(() => setFeedbackSkill(null), 4000);
    }
  };

  // Count verified task nodes in Evidence Graph
  const verifiedTasksCount = state.evidenceGraph
    ? Object.values(state.evidenceGraph.evidenceNodes).filter((n) => n.sourceType === 'verified_task').length
    : 0;

  return (
    <div className="chat">
      <Sidebar />

      <main className="chat__main" style={{ overflowY: 'auto' }}>
        {loading || !roadmap ? (
          <div className="center" style={{ minHeight: '60vh' }}>
            <div className="spinner" />
            <h2 style={{ marginTop: 20 }}>Synthesizing Gap-Closing Ideology…</h2>
            <p style={{ color: 'var(--muted)' }}>Formulating personalized milestones with automated evidence-graph feedback</p>
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

            {/* Real-time Feedback Toast */}
            {feedbackFeedbackSkill && (
              <div className="toast-banner" style={{ background: 'rgba(16,185,129,0.2)', borderColor: '#10b981', color: '#6ee7b7' }}>
                ⚡ Auto-Verification Active: Generated verified evidence node for <strong>"{feedbackFeedbackSkill}"</strong>. Confidence score updated live in Evidence Graph!
              </div>
            )}

            {exportedToast && (
              <div className="toast-banner">
                ✓ Roadmap export generated: <strong>Talyntra_Career_Blueprint_{state.profile.fullName.replace(/\s+/g, '_')}.pdf</strong>
              </div>
            )}

            {/* Core Ideology Banner */}
            <section className="glass roadmap-ideology-card">
              <div className="ideology-icon">💡</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <h3>The Talyntra Ideology: Bridge Through Proof of Execution</h3>
                  <span className="ai-status-pill ai-status--live" style={{ fontSize: 11 }}>
                    <span className="status-dot" />
                    Evidence Graph Sync Active ({verifiedTasksCount} Tasks Verified)
                  </span>
                </div>
                <p style={{ marginTop: 6 }}>
                  Transitioning to senior tiers is not about collecting passive certifications; it requires{' '}
                  <em>verifiable artifacts of competence</em>. Completing milestones below generates high-confidence
                  evidence citations with zero recency decay, automatically elevating your Evidence Graph scores.
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
                            onClick={() => handleToggle(phase.phase, act)}
                          >
                            <input
                              type="checkbox"
                              checked={act.completed}
                              onChange={() => {}}
                              style={{ display: 'none' }}
                            />
                            <span className="check-box-square">{act.completed ? '✓' : ''}</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span className="check-text">{act.text}</span>
                              {act.verifiesSkill && (
                                <span style={{ fontSize: 11, color: act.completed ? '#34d399' : 'var(--accent-cyan)' }}>
                                  {act.completed ? '✓ Verified in Graph: ' : '⚡ Auto-verifies: '}
                                  <strong>{act.verifiesSkill}</strong>
                                </span>
                              )}
                            </div>
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
                  <h4>Inspect your updated Evidence Score?</h4>
                  <p>Check how your completed milestones elevated your profile confidence.</p>
                  <Button variant="glass" onClick={() => nav('/skills')}>View Updated Skills (2.0) →</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
