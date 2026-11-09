import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Button from '../components/Button';
import { useStore } from '../lib/store';
import { analyzeCV, SkillCategory } from '../lib/mockAI';

export default function Skills() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const { state, setSkills } = useStore();
  const [loading, setLoading] = useState(!state.skills);
  const [filterCat, setFilterCat] = useState<SkillCategory | 'All'>('All');

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
    skills?.detectedSkills.filter(
      (s) => filterCat === 'All' || s.category === filterCat
    ) || [];

  return (
    <div className="chat">
      <Sidebar />

      <main className="chat__main" style={{ overflowY: 'auto' }}>
        {loading ? (
          <div className="center" style={{ minHeight: '60vh' }}>
            <div className="spinner" />
            <h2 style={{ marginTop: 20 }}>Analyzing Profile &amp; Benchmarking Market Skills…</h2>
            <p style={{ color: 'var(--muted)' }}>Matching with industry role requirements</p>
          </div>
        ) : (
          <div className="skills-container page-enter">
            {/* Top Bar with Role Info */}
            <header className="skills-header">
              <div>
                <span className="skills-pretitle">INTERFACE 2 • SKILL SET VALIDATOR</span>
                <h1 className="skills-title">
                  {skills?.roleMatchTitle || state.profile.targetRole || 'Skill Set Output'}
                </h1>
                <p className="skills-subtitle">
                  Parsed from <strong>{state.profile.fileName || 'Your CV'}</strong> for candidate{' '}
                  <strong>{state.profile.fullName}</strong> ({state.profile.experience})
                </p>
              </div>

              <div className="skills-score-badge glass">
                <span className="score-val">{skills?.overallScore}%</span>
                <span className="score-lbl">Profile Match</span>
              </div>
            </header>

            {/* Tabs for Interface 2 vs Interface 2.2 */}
            <div className="tab-bar">
              <button
                className={`tab ${activeTab === 'detected' ? 'tab--active' : ''}`}
                onClick={() => setParams({})}
              >
                <span className="tab-num">2.0</span>
                <span>Detected Skill Set ({skills?.detectedSkills.length || 0})</span>
              </button>

              <button
                className={`tab ${activeTab === 'missing' ? 'tab--active' : ''}`}
                onClick={() => setParams({ tab: 'missing' })}
              >
                <span className="tab-num">2.2</span>
                <span>Missing Competencies ({skills?.missingSkills.length || 0})</span>
                <span className="tab-alert-dot" />
              </button>
            </div>

            {/* Tab 1: Detected Skills (Interface 2) */}
            {activeTab === 'detected' && (
              <section className="tab-content">
                <div className="filter-chips">
                  {(['All', 'Technical', 'Soft', 'Domain'] as const).map((cat) => (
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
                  {filteredSkills.map((sk) => (
                    <div key={sk.name} className="skill-card glass">
                      <div className="skill-card__head">
                        <span className="skill-name">{sk.name}</span>
                        <span className="skill-pct">{sk.proficiency}%</span>
                      </div>
                      <div className="skill-bar-track">
                        <div
                          className="skill-bar-fill"
                          style={{
                            width: `${sk.proficiency}%`,
                            background:
                              sk.proficiency >= 85
                                ? 'linear-gradient(90deg, #008f94, #2fc9c6)'
                                : sk.proficiency >= 75
                                ? 'linear-gradient(90deg, #4f46e5, #7ef0ec)'
                                : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                          }}
                        />
                      </div>
                      <span className="skill-tag">{sk.category}</span>
                    </div>
                  ))}
                </div>

                <div className="skills-cta-banner glass">
                  <div>
                    <h3>Ready to check missing skills &amp; start validation?</h3>
                    <p>
                      We identified {skills?.missingSkills.length} key competencies that top
                      employers look for in this role.
                    </p>
                  </div>
                  <Button onClick={() => setParams({ tab: 'missing' })}>
                    Review Missing Skills (2.2) →
                  </Button>
                </div>
              </section>
            )}

            {/* Tab 2: Missing Skills (Interface 2.2) */}
            {activeTab === 'missing' && (
              <section className="tab-content">
                <div className="missing-intro">
                  <p>
                    These competencies are standard requirements for senior-tier{' '}
                    <strong>{state.profile.targetRole}</strong> positions. Closing these specific gaps
                    gives you the highest ROI.
                  </p>
                </div>

                <div className="missing-list">
                  {skills?.missingSkills.map((ms) => (
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

