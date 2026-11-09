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

  useEffect(() => {
    if (!state.validation) {
      setLoading(true);
      generateValidation(state.profile, state.questionnaire).then((val) => {
        setValidation(val);
        setLoading(false);
      });
    }
  }, [state.profile, state.questionnaire, state.validation, setValidation]);

  const v = state.validation;

  return (
    <div className="chat">
      <Sidebar />

      <main className="chat__main" style={{ overflowY: 'auto' }}>
        {loading || !v ? (
          <div className="center" style={{ minHeight: '60vh' }}>
            <div className="spinner" />
            <h2 style={{ marginTop: 20 }}>Synthesizing Validation Benchmarks…</h2>
            <p style={{ color: 'var(--muted)' }}>Comparing CV + responses against target role telemetry</p>
          </div>
        ) : (
          <div className="skills-container page-enter">
            {/* Header */}
            <header className="skills-header">
              <div>
                <span className="skills-pretitle">INTERFACE 3 • VALIDATION OUTPUT</span>
                <h1 className="skills-title">Comprehensive Profile Validation</h1>
                <p className="skills-subtitle">
                  Calibrated for <strong>{state.profile.fullName}</strong> pursuing{' '}
                  <strong>{state.profile.targetRole || 'Target Role'}</strong>
                </p>
              </div>

              <div className="validation-status-pill">
                <span className="status-dot" />
                Validated Against Tier-1 Benchmarks
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
                  <span className="gauge-sub">Overall Match</span>
                </div>
              </div>

              <div className="val-hero-text">
                <h3>Executive Validation Summary</h3>
                <p>{v.summary}</p>
                <div className="val-tags">
                  <span className="val-tag">High Potential</span>
                  <span className="val-tag">Targeted Upskill Required</span>
                  <span className="val-tag">Market Ready: 6–8 Months</span>
                </div>
              </div>
            </section>

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
                <p className="val-metric-desc">Syntax fluency, frameworks, and component design.</p>
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
                <p className="val-metric-desc">Clarity, stakeholder empathy, and problem breakdown.</p>
              </div>

              <div className="glass val-metric-card">
                <div className="val-metric-head">
                  <span className="val-metric-title">Experience Alignment</span>
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
                <p className="val-metric-desc">Scale of past deliverables vs target role demands.</p>
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
                <p className="val-metric-desc">Frequency of open hiring mandates across tech hubs.</p>
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
                  Explore your structured 4-phase career roadmap with curated learning milestones,
                  actionable checklists, and industry resources.
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

