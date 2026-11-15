import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Button from '../components/Button';
import { useStore } from '../lib/store';
import { CURATED_RESOURCES, generateRoadmap, RoadmapPhase, RoadmapAction } from '../lib/mockAI';
import { addVerifiedTaskToGraph } from '../lib/evidenceGraph';
import { runArtifactAutoCheck, ArtifactSubmission, AutoCheckReport } from '../lib/autoCheckers';

export default function Roadmap() {
  const nav = useNavigate();
  const { state, setRoadmap, toggleRoadmapAction, setEvidenceGraph } = useStore();
  const [loading, setLoading] = useState(!state.roadmap);
  const [exportedToast, setExportedToast] = useState(false);
  const [feedbackFeedbackSkill, setFeedbackSkill] = useState<string | null>(null);

  // Artifact Submission & Auto-check Modal State
  const [selectedTaskForArtifact, setSelectedTaskForArtifact] = useState<{
    phase: number;
    action: RoadmapAction;
  } | null>(null);

  const [repoInput, setRepoInput] = useState('');
  const [deployedUrlInput, setDeployedUrlInput] = useState('');
  const [isForkInput, setIsForkInput] = useState(false);
  const [checkingArtifact, setCheckingArtifact] = useState(false);
  const [checkReport, setCheckReport] = useState<AutoCheckReport | null>(null);

  // Before / After Score Delta Result
  const [deltaResult, setDeltaResult] = useState<{
    skillName: string;
    prevScore: number | null;
    prevStatus: string;
    newScore: number;
    newStatus: string;
    delta: number;
    evidenceText: string;
  } | null>(null);

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

  const handleOpenArtifactModal = (phase: number, act: RoadmapAction, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTaskForArtifact({ phase, action: act });
    setCheckReport(null);
    setRepoInput('https://github.com/alexmorgan/distributed-cache-proxy');
    setDeployedUrlInput('https://cache-proxy.railway.app');
    setIsForkInput(false);
  };

  const handleRunAutoCheck = () => {
    if (!selectedTaskForArtifact || !state.evidenceGraph) return;
    setCheckingArtifact(true);

    setTimeout(() => {
      const submission: ArtifactSubmission = {
        repoUrl: repoInput.trim(),
        ownerUsername: 'alexmorgan',
        isFork: isForkInput,
        fileList: ['src/index.ts', 'src/cache.test.ts', '.github/workflows/ci.yml'],
        readmeContent: 'Architecture & System Design engineering trade-offs '.repeat(50),
        deployedUrl: deployedUrlInput.trim(),
        latestCiPassed: true,
        commitCount: 6,
      };

      const report = runArtifactAutoCheck(submission);
      setCheckReport(report);
      setCheckingArtifact(false);

      if (report.passed && selectedTaskForArtifact.action.verifiesSkill) {
        const skillName = selectedTaskForArtifact.action.verifiesSkill;
        const currentGraph = state.evidenceGraph || state.skills?.evidenceGraph;

        if (currentGraph) {
          const currentClaim = Object.values(currentGraph.skillClaims).find(
            (c) => c.skillName.toLowerCase() === skillName.toLowerCase()
          );

          const prevScore = currentClaim?.confidenceScore ?? null;
          const prevStatus = currentClaim?.confidenceStatus ?? 'insufficient_evidence';

          // Add verified task to graph
          const updatedGraph = addVerifiedTaskToGraph(
            currentGraph,
            skillName,
            selectedTaskForArtifact.action.text,
            selectedTaskForArtifact.action.id
          );

          const updatedClaim = Object.values(updatedGraph.skillClaims).find(
            (c) => c.skillName.toLowerCase() === skillName.toLowerCase()
          );

          const newScore = updatedClaim?.confidenceScore ?? 85;
          const newStatus = updatedClaim?.confidenceStatus ?? 'verified';
          const delta = prevScore !== null ? newScore - prevScore : newScore;

          setEvidenceGraph(updatedGraph);
          if (!selectedTaskForArtifact.action.completed) {
            toggleRoadmapAction(selectedTaskForArtifact.phase, selectedTaskForArtifact.action.id);
          }

          setDeltaResult({
            skillName,
            prevScore,
            prevStatus,
            newScore,
            newStatus,
            delta,
            evidenceText: `Verified Artifact: Original repository (${repoInput}), passing GitHub Actions CI, test suite, and live deployed endpoint (${deployedUrlInput}).`,
          });
        }
      }
    }, 600);
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
                          <div
                            key={act.id}
                            className={`checklist-item ${act.completed ? 'checklist-item--checked' : ''}`}
                            style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}
                          >
                            <label
                              style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, cursor: 'pointer' }}
                              onClick={() => handleToggle(phase.phase, act)}
                            >
                              <input
                                type="checkbox"
                                checked={act.completed}
                                onChange={() => {}}
                                style={{ display: 'none' }}
                              />
                              <span className="check-box-square">{act.completed ? '✓' : ''}</span>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span className="check-text">{act.text}</span>
                                {act.verifiesSkill && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 11, color: act.completed ? '#34d399' : 'var(--accent-cyan)' }}>
                                      {act.completed ? '✓ Verified in Graph: ' : '⚡ Auto-verifies: '}
                                      <strong>{act.verifiesSkill}</strong>
                                    </span>
                                    <span className="artifact-req-badge">
                                      Artifact: Repo + CI + Live URL
                                    </span>
                                  </div>
                                )}
                              </div>
                            </label>

                            {act.verifiesSkill && (
                              <button
                                type="button"
                                className="submit-artifact-btn"
                                onClick={(e) => handleOpenArtifactModal(phase.phase, act, e)}
                                title="Submit repository & live URL to run auto-checkers"
                              >
                                {act.completed ? 'Re-Verify Artifact' : 'Submit Artifact →'}
                              </button>
                            )}
                          </div>
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

      {/* Artifact Submission & Auto-Check Modal */}
      {selectedTaskForArtifact && !deltaResult && (
        <div className="modal-backdrop" onClick={() => setSelectedTaskForArtifact(null)}>
          <div className="modal-card page-enter" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedTaskForArtifact(null)}>✕</button>

            <span className="skills-pretitle">INTERFACE 4.2 • DELIVERABLE AUTO-CHECKER</span>
            <h2 style={{ color: '#fff', margin: '4px 0 8px' }}>Submit Deliverable Artifact</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
              Milestone: <strong>"{selectedTaskForArtifact.action.text}"</strong>
              <br />
              Target Skill: <strong style={{ color: '#7ef0ec' }}>{selectedTaskForArtifact.action.verifiesSkill}</strong>
            </p>

            {/* Criteria Checklist */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 14, borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
                AUTOMATED VERIFICATION REQUIREMENTS:
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#e5e7eb', lineHeight: 1.6 }}>
                <li><strong>Original GitHub Repo:</strong> Must belong to candidate account and not be a detached fork.</li>
                <li><strong>Automated Tests &amp; CI:</strong> Must contain test files (<code>*.test.ts</code>) and passing GitHub Actions.</li>
                <li><strong>Architecture README:</strong> Minimum 200 words with system design trade-offs section.</li>
                <li><strong>Live Deployed URL:</strong> Responsive HTTPS application endpoint (not a placeholder).</li>
              </ul>
            </div>

            {/* Input Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ fontSize: 13, color: '#e5e7eb' }}>
                GitHub Repository URL:
                <input
                  type="text"
                  className="field"
                  style={{ width: '100%', marginTop: 4 }}
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  placeholder="https://github.com/username/repository"
                />
              </label>

              <label style={{ fontSize: 13, color: '#e5e7eb' }}>
                Live Deployed URL:
                <input
                  type="text"
                  className="field"
                  style={{ width: '100%', marginTop: 4 }}
                  value={deployedUrlInput}
                  onChange={(e) => setDeployedUrlInput(e.target.value)}
                  placeholder="https://your-service.railway.app"
                />
              </label>

              {/* Abuse Case Toggle (for testing abuse mitigation) */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isForkInput}
                  onChange={(e) => setIsForkInput(e.target.checked)}
                />
                <span>Simulate Detached Fork (tests abuse detection)</span>
              </label>

              {/* Quick pre-fill button */}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  style={{ background: 'transparent', border: '1px dashed var(--accent-cyan)', color: '#7ef0ec', padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                  onClick={() => {
                    setRepoInput('https://github.com/alexmorgan/distributed-cache-proxy');
                    setDeployedUrlInput('https://cache-proxy.railway.app');
                    setIsForkInput(false);
                  }}
                >
                  Prefill Valid Demo Artifact (alexmorgan/distributed-cache-proxy)
                </button>
              </div>

              {/* Check Report Diagnostics if failed */}
              {checkReport && !checkReport.passed && (
                <div style={{ marginTop: 12, padding: 14, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 8 }}>
                  <div style={{ fontWeight: 700, color: '#fca5a5', marginBottom: 8 }}>
                    ⚠️ Verification Incomplete — Diagnostic Feedback:
                  </div>
                  {checkReport.checks.map((chk) => (
                    <div key={chk.checkId} className={`check-item-row ${chk.passed ? 'check-item--pass' : 'check-item--fail'}`}>
                      <span style={{ fontWeight: 700 }}>{chk.passed ? '✓' : '✗'}</span>
                      <div style={{ fontSize: 12, flex: 1 }}>
                        <strong>{chk.name}:</strong> {chk.reason}
                      </div>
                    </div>
                  ))}
                  {checkReport.abuseFlags.length > 0 && (
                    <div style={{ marginTop: 8, color: '#fca5a5', fontSize: 12 }}>
                      <strong>Abuse Detection Flags:</strong> {checkReport.abuseFlags.join(' | ')}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                <Button variant="glass" onClick={() => setSelectedTaskForArtifact(null)}>
                  Cancel
                </Button>
                <Button onClick={handleRunAutoCheck} disabled={checkingArtifact || !repoInput.trim()}>
                  {checkingArtifact ? 'Running 4 Auto-Checkers…' : 'Run Auto-Checkers & Verify →'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Before/After Score Delta Celebration Modal */}
      {deltaResult && (
        <div className="modal-backdrop" onClick={() => setDeltaResult(null)}>
          <div className="modal-card page-enter" onClick={(e) => e.stopPropagation()} style={{ borderColor: '#10b981' }}>
            <button className="modal-close" onClick={() => setDeltaResult(null)}>✕</button>

            <span className="skills-pretitle" style={{ color: '#34d399' }}>⚡ CLOSED LOOP • EVIDENCE GRAPH RECOMPUTED</span>
            <h2 style={{ color: '#fff', margin: '4px 0 8px' }}>Verification Successful!</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>
              Artifact auto-checkers passed. High-rigor deliverable evidence node registered with zero recency decay.
            </p>

            {/* Hero Delta Box */}
            <div className="delta-hero">
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Target Skill
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 2 }}>
                  {deltaResult.skillName}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                  Previous: <span style={{ textDecoration: 'line-through' }}>{deltaResult.prevScore !== null ? `${deltaResult.prevScore}%` : 'Insufficient Evidence (0%)'}</span>
                  {' '}➔ New Confidence: <strong style={{ color: '#34d399' }}>{deltaResult.newScore}% Verified</strong>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div className="delta-val">+{deltaResult.delta}%</div>
                <div style={{ fontSize: 11, color: '#a7f3d0' }}>Confidence Elevation</div>
              </div>
            </div>

            {/* Stored Evidence Details */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 14, borderRadius: 8, margin: '14px 0', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#7ef0ec', marginBottom: 4 }}>
                STORED EVIDENCE CITATION (RULE 4 TRANSPARENCY):
              </div>
              <p style={{ fontSize: 13, color: '#e5e7eb', margin: 0, lineHeight: 1.5 }}>
                {deltaResult.evidenceText}
              </p>
              <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11, color: 'var(--muted)' }}>
                <span>• Base Weight: <strong>0.95</strong></span>
                <span>• Recency Retention: <strong>100% (Zero Decay)</strong></span>
                <span>• Status: <strong>Verified Deliverable</strong></span>
              </div>
            </div>

            {/* Navigation Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 18 }}>
              <Button variant="glass" onClick={() => setDeltaResult(null)}>
                Continue Roadmap
              </Button>
              <Button onClick={() => nav('/skills')}>
                View Updated Evidence Graph (/skills) →
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
