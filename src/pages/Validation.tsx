import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Button from '../components/Button';
import { useStore } from '../lib/store';
import { generateValidation } from '../lib/mockAI';

export default function Validation() {
  const nav = useNavigate();
  const { state, setValidation } = useStore();
  const [loading, setLoading] = useState(!state.validation);
  const [showEvidenceDetail, setShowEvidenceDetail] = useState(false);

  useEffect(() => {
    if (!state.validation) {
      setLoading(true);
      generateValidation(state.profile, state.questionnaire, state.evidenceGraph || undefined).then((val) => {
        setValidation(val);
        setLoading(false);
      });
    }
  }, [state.profile, state.questionnaire, state.evidenceGraph, state.validation, setValidation]);

  const v = state.validation;
  const graph = state.evidenceGraph;

  const totalNodesCount = graph ? Object.keys(graph.evidenceNodes).length : 0;
  const verifiedClaimsCount = graph
    ? Object.values(graph.skillClaims).filter((c) => c.confidenceStatus === 'verified').length
    : 0;
  const insufficientClaimsCount = graph
    ? Object.values(graph.skillClaims).filter((c) => c.confidenceStatus === 'insufficient_evidence').length
    : 0;

  return (
    <div className="chat">
      <Sidebar />

      <main className="chat__main" style={{ overflowY: 'auto' }}>
        {loading || !v ? (
          <div className="center" style={{ minHeight: '60vh' }}>
            <div className="spinner" />
            <h2 style={{ marginTop: 20 }}>Synthesizing Validation Telemetry…</h2>
            <p style={{ color: 'var(--muted)' }}>Calculating score breakdown from Evidence Graph &amp; recency curves</p>
          </div>
        ) : (
          <div className="skills-container page-enter">
            {/* Header */}
            <header className="skills-header">
              <div>
                <span className="skills-pretitle">INTERFACE 3 • VALIDATION OUTPUT</span>
                <h1 className="skills-title">Comprehensive Profile Validation</h1>
                <p className="skills-subtitle">
                  Evidence-calibrated for <strong>{state.profile.fullName}</strong> pursuing{' '}
                  <strong>{state.profile.targetRole || 'Target Role'}</strong>
                </p>
              </div>

              <div className="validation-status-pill">
                <span className="status-dot" />
                Evidence-Grounded ({totalNodesCount} Citations Linked)
              </div>
            </header>

            {/* Top Score Banner: Circular SVG Gauge + Summary */}
            <section className="glass val-hero-card">
              <div className="gauge-wrap">
                <svg className="gauge-svg" viewBox="0 0 120 120">
                  <circle
                    className="gauge-bg"
                    cx="60"
                    cy="60"
                    r="50"
                    strokeWidth="10"
                    fill="none"
                  />
                  <circle
                    className="gauge-bar"
                    cx="60"
                    cy="60"
                    r="50"
                    strokeWidth="10"
                    fill="none"
                    strokeDasharray={2 * Math.PI * 50}
                    strokeDashoffset={2 * Math.PI * 50 * (1 - v.overallMatch / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="gauge-label">
                  <span className="gauge-num">{v.overallMatch}%</span>
                  <span className="gauge-sub">Evidence Score</span>
                </div>
              </div>

              <div className="val-hero-text">
                <h3>Executive Validation Summary</h3>
                <p>{v.summary}</p>
                <div className="val-tags">
                  <span className="val-tag">Evidence Verified</span>
                  <span className="val-tag">{verifiedClaimsCount} High-Confidence Claims</span>
                  {insufficientClaimsCount > 0 && (
                    <span className="val-tag" style={{ borderColor: '#fca5a5', color: '#fca5a5' }}>
                      ⚠️ {insufficientClaimsCount} Claim(s) Need Proof
                    </span>
                  )}
                  <span className="val-tag">Market Ready: 4–6 Months</span>
                </div>
              </div>
            </section>

            {/* Evidence Graph Telemetry Summary Card */}
            {graph && (
              <section className="glass" style={{ padding: '16px 20px', borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>
                      📊 Evidence Graph Mathematical Proof
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--muted)' }}>
                      Every score above is calculated from verifiable citations with exponential time-decay half-life curves.
                    </p>
                  </div>
                  <Button variant="glass" onClick={() => setShowEvidenceDetail(!showEvidenceDetail)}>
                    {showEvidenceDetail ? 'Hide Audit Log' : 'Inspect Citation Audit Log'}
                  </Button>
                </div>

                {showEvidenceDetail && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
                      <div className="glass" style={{ padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#7ef0ec' }}>{totalNodesCount}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Total Evidence Nodes</div>
                      </div>
                      <div className="glass" style={{ padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#34d399' }}>{verifiedClaimsCount}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Verified Skill Claims</div>
                      </div>
                      <div className="glass" style={{ padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#fca5a5' }}>{insufficientClaimsCount}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Insufficient Evidence Claims</div>
                      </div>
                    </div>

                    <div style={{ fontSize: 13, color: 'var(--muted)', background: 'rgba(0,0,0,0.25)', padding: 12, borderRadius: 8 }}>
                      <strong>Audit Trail Reasoning:</strong> {graph.overallReasoning}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* 4 Score Breakdown Cards */}
            <section className="val-grid-4">
              <div className="glass val-metric-card">
                <div className="val-metric-head">
                  <span className="val-metric-title">Technical Mastery</span>
                  <span className="val-metric-val">{v.technicalScore}%</span>
                </div>
                <div className="skill-bar-track">
                  <div
                    className="skill-bar-fill"
                    style={{
                      width: `${v.technicalScore}%`,
                      background: 'linear-gradient(90deg, #4f46e5, #7ef0ec)',
                    }}
                  />
                </div>
                <p className="val-metric-desc">Derived from code, architectural deliverables &amp; framework implementation.</p>
              </div>

              <div className="glass val-metric-card">
                <div className="val-metric-head">
                  <span className="val-metric-title">Soft Skills &amp; Leadership</span>
                  <span className="val-metric-val">{v.softScore}%</span>
                </div>
                <div className="skill-bar-track">
                  <div
                    className="skill-bar-fill"
                    style={{
                      width: `${v.softScore}%`,
                      background: 'linear-gradient(90deg, #008f94, #2fc9c6)',
                    }}
                  />
                </div>
                <p className="val-metric-desc">Derived from cross-functional alignment and technical mentorship citations.</p>
              </div>

              <div className="glass val-metric-card">
                <div className="val-metric-head">
                  <span className="val-metric-title">Experience Scale Alignment</span>
                  <span className="val-metric-val">{v.experienceScore}%</span>
                </div>
                <div className="skill-bar-track">
                  <div
                    className="skill-bar-fill"
                    style={{
                      width: `${v.experienceScore}%`,
                      background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                    }}
                  />
                </div>
                <p className="val-metric-desc">Scale of past verified deliverables vs target role demands.</p>
              </div>

              <div className="glass val-metric-card">
                <div className="val-metric-head">
                  <span className="val-metric-title">Market Demand Index</span>
                  <span className="val-metric-val">{v.marketDemandScore}%</span>
                </div>
                <div className="skill-bar-track">
                  <div
                    className="skill-bar-fill"
                    style={{
                      width: `${v.marketDemandScore}%`,
                      background: 'linear-gradient(90deg, #10b981, #34d399)',
                    }}
                  />
                </div>
                <p className="val-metric-desc">Calculated from verified benchmark role unlocks across active tech tiers.</p>
              </div>
            </section>

            {/* Strengths & Concerns Grid */}
            <section className="val-comparison-grid">
              <div className="glass val-col val-col--strengths">
                <h3>
                  <span style={{ color: '#10b981', marginRight: 8 }}>✓</span> Key Validated Strengths
                </h3>
                <ul>
                  {v.strengths.map((str, idx) => (
                    <li key={idx}>
                      <strong>Strength {idx + 1}:</strong> {str}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="glass val-col val-col--concerns">
                <h3>
                  <span style={{ color: '#f59e0b', marginRight: 8 }}>⚠</span> Identified Gaps &amp;
                  Vulnerabilities
                </h3>
                <ul>
                  {v.concerns.map((con, idx) => (
                    <li key={idx}>
                      <strong>Area {idx + 1}:</strong> {con}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* CTA to Interface 4 */}
            <div className="skills-cta-banner glass" style={{ marginTop: 32 }}>
              <div>
                <h3>Interface 4: Ideologies to Fill the Gap Between Validation &amp; Skills</h3>
                <p>
                  Explore your structured 4-phase career roadmap with auto-verifying tasks that directly feed
                  new evidence back into this validation graph.
                </p>
              </div>
              <Button onClick={() => nav('/roadmap')}>
                Explore Gap-Closing Roadmap (Interface 4) →
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
