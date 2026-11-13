import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Button from '../components/Button';
import { useStore } from '../lib/store';
import { analyzeCV, SkillCategory, Skill } from '../lib/mockAI';

export default function Skills() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const { state, setSkills } = useStore();
  const [loading, setLoading] = useState(!state.skills);
  const [filterCat, setFilterCat] = useState<SkillCategory | 'All' | 'Needs Proof'>('All');
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);
  const [sortByROI, setSortByROI] = useState(true);

  const activeTab = params.get('tab') === 'missing' ? 'missing' : 'detected';

  useEffect(() => {
    if (!state.skills) {
      setLoading(true);
      analyzeCV(state.profile).then((data) => {
        setSkills(data);
        setLoading(false);
      });
    }
  }, [state.profile, state.skills, setSkills]);

  const skills = state.skills;

  const filteredSkills =
    skills?.detectedSkills.filter((s: Skill) => {
      if (filterCat === 'Needs Proof') return s.confidenceStatus === 'insufficient_evidence';
      if (filterCat === 'All') return true;
      return s.category === filterCat;
    }) || [];

  const missingSkills = skills?.missingSkills
    ? [...skills.missingSkills].sort((a, b) => (sortByROI ? b.roiScore - a.roiScore : b.difficulty - a.difficulty))
    : [];

  const toggleExpand = (claimId: string) => {
    setExpandedSkillId((prev) => (prev === claimId ? null : claimId));
  };

  return (
    <div className="chat">
      <Sidebar />

      <main className="chat__main" style={{ overflowY: 'auto' }}>
        {loading ? (
          <div className="center" style={{ minHeight: '60vh' }}>
            <div className="spinner" />
            <h2 style={{ marginTop: 20 }}>Constructing Evidence Graph &amp; Time-Decay Telemetry…</h2>
            <p style={{ color: 'var(--muted)' }}>Linking skill claims to verified citations and recency curves</p>
          </div>
        ) : (
          <div className="skills-container page-enter">
            {/* Top Bar with Role Info */}
            <header className="skills-header">
              <div>
                <span className="skills-pretitle">INTERFACE 2 • EVIDENCE GRAPH VALIDATOR</span>
                <h1 className="skills-title">
                  {skills?.roleMatchTitle || state.profile.targetRole || 'Skill Set Output'}
                </h1>
                <p className="skills-subtitle">
                  Evidence-grounded claims from <strong>{state.profile.fileName || 'Your CV'}</strong> for candidate{' '}
                  <strong>{state.profile.fullName}</strong> ({state.profile.experience})
                </p>
              </div>

              <div className="skills-score-badge glass">
                <span className="score-val">{skills?.overallScore}%</span>
                <span className="score-lbl">Evidence Score</span>
              </div>
            </header>

            {/* Tabs for Interface 2 vs Interface 2.2 */}
            <div className="tab-bar">
              <button
                className={`tab ${activeTab === 'detected' ? 'tab--active' : ''}`}
                onClick={() => setParams({})}
              >
                <span className="tab-num">2.0</span>
                <span>Verified Claims ({skills?.detectedSkills.length || 0})</span>
              </button>

              <button
                className={`tab ${activeTab === 'missing' ? 'tab--active' : ''}`}
                onClick={() => setParams({ tab: 'missing' })}
              >
                <span className="tab-num">2.2</span>
                <span>Learning-ROI Gaps ({skills?.missingSkills.length || 0})</span>
                <span className="tab-alert-dot" />
              </button>
            </div>

            {/* Tab 1: Detected Skills with Evidence & Time Decay */}
            {activeTab === 'detected' && (
              <section className="tab-content">
                <div className="filter-chips">
                  {(['All', 'Technical', 'Soft', 'Needs Proof'] as const).map((cat) => (
                    <button
                      key={cat}
                      className={`chip ${filterCat === cat ? 'chip--active' : ''}`}
                      onClick={() => setFilterCat(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="skills-grid">
                  {filteredSkills.map((sk) => {
                    const isInsufficient = sk.confidenceStatus === 'insufficient_evidence';
                    const isExpanded = expandedSkillId === sk.claimId;

                    return (
                      <div key={sk.claimId || sk.name} className="skill-card glass">
                        <div className="skill-card__head">
                          <span className="skill-name">{sk.name}</span>
                          {isInsufficient ? (
                            <span className="confidence-badge confidence--insufficient">
                              ⚠️ Insufficient Evidence
                            </span>
                          ) : (
                            <span
                              className={`confidence-badge ${
                                sk.confidenceStatus === 'verified'
                                  ? 'confidence--verified'
                                  : sk.confidenceStatus === 'moderate'
                                  ? 'confidence--moderate'
                                  : 'confidence--weak'
                              }`}
                            >
                              {sk.confidenceStatus === 'verified' ? '✓ ' : ''}
                              {sk.proficiency}% Confidence
                            </span>
                          )}
                        </div>

                        {/* Confidence Progress Bar */}
                        <div className="skill-bar-track">
                          <div
                            className="skill-bar-fill"
                            style={{
                              width: `${isInsufficient ? 10 : sk.proficiency}%`,
                              background: isInsufficient
                                ? '#ef4444'
                                : sk.proficiency >= 85
                                ? 'linear-gradient(90deg, #008f94, #2fc9c6)'
                                : sk.proficiency >= 70
                                ? 'linear-gradient(90deg, #4f46e5, #7ef0ec)'
                                : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                            }}
                          />
                        </div>

                        {/* Recency Time-Decay Metadata */}
                        <div className="decay-meta">
                          <span>🕒 Last verified: {sk.lastDemonstratedDate || 'N/A'}</span>
                          <span>•</span>
                          <span>{Math.round(sk.timeDecayFactor * 100)}% retention</span>
                        </div>

                        {/* Category & Evidence Drawer Toggle */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                          <span className="skill-tag">{sk.category}</span>
                          <button
                            type="button"
                            className="evidence-btn"
                            onClick={() => toggleExpand(sk.claimId)}
                          >
                            <span>{isExpanded ? 'Hide Evidence' : 'Inspect Evidence'}</span>
                            <span>({sk.evidenceCount})</span>
                          </button>
                        </div>

                        {/* Expandable Evidence Drawer (Rule 4: Every score links to its evidence) */}
                        {isExpanded && (
                          <div className="evidence-drawer">
                            <div className="evidence-reasoning-box">
                              <strong>Mathematical Reasoning:</strong> {sk.reasoning}
                            </div>

                            <div className="evidence-nodes-list">
                              {sk.linkedEvidence && sk.linkedEvidence.length > 0 ? (
                                sk.linkedEvidence.map((ev) => (
                                  <div key={ev.id} className="evidence-node-item">
                                    <div className="evidence-node-head">
                                      <span
                                        className={`evidence-source-tag ${
                                          ev.sourceType === 'verified_task' ? 'evidence-source-tag--task' : ''
                                        }`}
                                      >
                                        {ev.sourceType.replace('_', ' ')}
                                      </span>
                                      <span className="evidence-date">{ev.timestamp}</span>
                                    </div>
                                    <p className="evidence-quote">"{ev.rawText}"</p>
                                    <div className="evidence-context">
                                      <span>Context: {ev.sourceContext}</span>
                                      {ev.verified && <span style={{ color: '#34d399', marginLeft: 8 }}>✓ Verified</span>}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p style={{ fontSize: 12, color: '#fca5a5' }}>
                                  No verifiable citations linked. Skill listed without documented projects or quantifiable outcomes.
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="skills-cta-banner glass" style={{ marginTop: 24 }}>
                  <div>
                    <h3>Ready to explore high-ROI competency gaps?</h3>
                    <p>
                      We identified {skills?.missingSkills.length} strategic competencies ranked by how many
                      roles they unlock per hour of effort.
                    </p>
                  </div>
                  <Button onClick={() => setParams({ tab: 'missing' })}>
                    Review Learning-ROI Gaps (2.2) →
                  </Button>
                </div>
              </section>
            )}

            {/* Tab 2: Missing Skills Ranked by Learning-ROI */}
            {activeTab === 'missing' && (
              <section className="tab-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                  <p className="missing-intro" style={{ margin: 0 }}>
                    Skills ranked by <strong>Learning-ROI</strong> (Roles Unlocked per Hour of Effort).
                    Closing high-ROI gaps gives maximum career advancement for minimum time invested.
                  </p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>Sort by:</span>
                    <button
                      className={`chip ${sortByROI ? 'chip--active' : ''}`}
                      onClick={() => setSortByROI(true)}
                    >
                      ⚡ Learning-ROI
                    </button>
                    <button
                      className={`chip ${!sortByROI ? 'chip--active' : ''}`}
                      onClick={() => setSortByROI(false)}
                    >
                      Difficulty
                    </button>
                  </div>
                </div>

                <div className="missing-list">
                  {missingSkills.map((ms) => (
                    <div key={ms.name} className="missing-card glass">
                      <div className="missing-card__header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className={`importance-badge importance--${ms.importance.toLowerCase()}`}>
                            {ms.importance}
                          </span>
                          <h3 className="missing-title">{ms.name}</h3>
                        </div>
                        <div className="difficulty-stars">
                          <span style={{ fontSize: 13, color: 'var(--muted)', marginRight: 6 }}>
                            Learning Curve:
                          </span>
                          {'★'.repeat(ms.difficulty)}
                          {'☆'.repeat(5 - ms.difficulty)}
                        </div>
                      </div>

                      {/* Learning-ROI Metrics Bar */}
                      <div className="roi-banner">
                        <div className="roi-pill">
                          ⚡ {ms.roiLabel}
                        </div>
                        <div className="roi-metrics-row">
                          <span className="roi-metric-item">
                            🎯 Unlocks: <strong className="roi-metric-val">{ms.rolesUnlockedCount} Roles</strong>
                          </span>
                          <span className="roi-metric-item">
                            ⏱️ Est. Practice: <strong className="roi-metric-val">{ms.estimatedEffortHours}h</strong>
                          </span>
                          <span className="roi-metric-item">
                            📊 Leverage Score: <strong className="roi-metric-val">{(ms.roiScore * 100).toFixed(0)} pts</strong>
                          </span>
                        </div>
                      </div>

                      <p className="missing-why">
                        <strong>Why it matters:</strong> {ms.why}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="skills-cta-banner glass" style={{ marginTop: 32 }}>
                  <div>
                    <h3>Interface 2.3: Start Questionnaire &amp; Conversational Match</h3>
                    <p>
                      Answer 5 quick preference questions and interact with Talyntra AI to validate your
                      readiness against real-world job benchmarks.
                    </p>
                  </div>
                  <Button onClick={() => nav('/questionnaire')}>
                    Start Questionnaire &amp; Chatbot (2.3) →
                  </Button>
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
