import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Button from '../components/Button';
import { useStore } from '../lib/store';
import { analyzeCV, SkillCategory, Skill } from '../lib/mockAI';
import { mapGitHubDataToGraph, SAMPLE_GITHUB_REPOS, SAMPLE_GITHUB_PRS } from '../lib/githubEvidence';
import {
  evaluateCounterfactualROI,
  CounterfactualSkill,
  DETERMINISTIC_JOBS_CORPUS,
} from '../lib/learningROI';
import {
  fetchCounterfactualROIRemotely,
  refreshJobCorpusRemotely,
} from '../lib/apiClient';

export default function Skills() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const { state, setSkills } = useStore();
  const [loading, setLoading] = useState(!state.skills);
  const [filterCat, setFilterCat] = useState<SkillCategory | 'All' | 'Needs Proof'>('All');
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);
  const [sortByROI, setSortByROI] = useState(true);
  const [githubSyncing, setGithubSyncing] = useState(false);
  const [githubToast, setGithubToast] = useState<string | null>(null);

  // Phase 4: Counterfactual ROI & Market Corpus State
  const [cfSkills, setCfSkills] = useState<CounterfactualSkill[]>([]);
  const [expandedAssumption, setExpandedAssumption] = useState<string | null>(null);
  const [refreshingCorpus, setRefreshingCorpus] = useState(false);
  const [corpusStatusText, setCorpusStatusText] = useState('Corpus: 10 Verified Postings • Scheduled Refresh: Every 6h');
  const [simulatedSkills, setSimulatedSkills] = useState<Set<string>>(new Set());

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

  // Phase 4: Compute Counterfactual ROI on candidate Evidence Graph
  useEffect(() => {
    const currentGraph = state.evidenceGraph || state.skills?.evidenceGraph;
    if (currentGraph) {
      fetchCounterfactualROIRemotely(currentGraph).then((res) => {
        if (res && res.ranked_skills && res.ranked_skills.length > 0) {
          const mapped: CounterfactualSkill[] = res.ranked_skills.map((r: any) => ({
            skillName: r.skill_name,
            category: r.category,
            importance: r.importance,
            difficulty: r.difficulty,
            baselineRolesCount: r.baseline_roles_count,
            counterfactualRolesCount: r.counterfactual_roles_count,
            deltaRolesCount: r.delta_roles_count,
            estimatedEffortHours: r.estimated_effort_hours,
            roiScore: r.roi_score,
            roiLabel: r.roi_label,
            assumptionNote: r.assumption_note,
            unlockedJobsSample: r.unlocked_jobs_sample || [],
            why: r.why,
          }));
          setCfSkills(mapped);
        } else {
          const localResults = evaluateCounterfactualROI(currentGraph, DETERMINISTIC_JOBS_CORPUS);
          setCfSkills(localResults);
        }
      });
    }
  }, [state.evidenceGraph, state.skills]);

  const handleRefreshCorpus = async () => {
    setRefreshingCorpus(true);
    const res = await refreshJobCorpusRemotely();
    setRefreshingCorpus(false);
    if (res) {
      setCorpusStatusText(
        `Corpus: ${res.total_postings} Postings • Ingested via Remotive/Partner APIs • Next: 6h`
      );
    } else {
      setCorpusStatusText(
        'Corpus: 10 Verified Benchmark Postings • Refresh Active (6h schedule)'
      );
    }
  };

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

  const handleSyncGitHub = () => {
    if (!state.evidenceGraph) return;
    setGithubSyncing(true);

    setTimeout(() => {
      const syncResult = mapGitHubDataToGraph(
        SAMPLE_GITHUB_REPOS,
        SAMPLE_GITHUB_PRS,
        state.evidenceGraph!
      );

      // Re-map claims to UI Skill objects
      const updatedDetected: Skill[] = Object.values(syncResult.updatedGraph.skillClaims).map((claim) => {
        const linked = claim.linkedEvidenceIds
          .map((id) => syncResult.updatedGraph.evidenceNodes[id])
          .filter(Boolean);

        return {
          name: claim.skillName,
          category: claim.category,
          claimedLevel: claim.claimedLevel,
          evidencedLevel: claim.evidencedLevel,
          proficiency: claim.confidenceScore || 0,
          confidenceStatus: claim.confidenceStatus,
          evidenceCount: linked.length,
          daysElapsed: claim.daysElapsed,
          timeDecayFactor: claim.timeDecayFactor,
          lastDemonstratedDate: claim.lastDemonstratedDate,
          reasoning: claim.reasoning,
          claimId: claim.id,
          linkedEvidence: linked,
        };
      });

      const verifiedScores = updatedDetected
        .filter((s) => s.confidenceStatus !== 'insufficient_evidence')
        .map((s) => s.proficiency);

      const newOverall = verifiedScores.length
        ? Math.round(verifiedScores.reduce((a, b) => a + b, 0) / verifiedScores.length)
        : 82;

      setSkills({
        ...skills!,
        detectedSkills: updatedDetected,
        overallScore: newOverall,
        evidenceGraph: syncResult.updatedGraph,
      });

      const elevatedSummary = syncResult.elevatedSkills
        .map((s) => `"${s.skillName}" (${s.prevScore ?? 'insufficient'} → ${s.newScore}%)`)
        .join(', ');

      setGithubToast(`⚡ GitHub Connected: 3 Repos & 2 Merged PRs linked! Elevated: ${elevatedSummary}`);
      setGithubSyncing(false);
      setTimeout(() => setGithubToast(null), 8000);
    }, 600);
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
                <span className="skills-pretitle">INTERFACE 2 • EVIDENCE GRAPH ENGINE</span>
                <h1 className="skills-title">
                  {skills?.roleMatchTitle || state.profile.targetRole || 'Software Engineer'}
                </h1>
                <p className="skills-subtitle">
                  Evidence-grounded claims for <strong>{state.profile.fullName || 'Alex Morgan'}</strong> pursuing{' '}
                  <strong>{state.profile.targetRole || 'Software Engineer'}</strong> ({state.profile.experience || '3+ years'})
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Button variant="glass" onClick={handleSyncGitHub} disabled={githubSyncing}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  {githubSyncing ? 'Syncing GitHub…' : 'Sync GitHub Evidence'}
                </Button>

                <div className="skills-score-badge glass">
                  <span className="score-val">{skills?.overallScore}%</span>
                  <span className="score-lbl">Evidence Score</span>
                </div>
              </div>
            </header>

            {/* GitHub Sync Live Feedback Toast */}
            {githubToast && (
              <div className="toast-banner" style={{ background: 'rgba(16, 185, 129, 0.2)', borderColor: '#10b981', color: '#6ee7b7', marginBottom: 16 }}>
                {githubToast}
              </div>
            )}

            {/* Tabs for Interface 2 vs Interface 2.2 */}
            <div className="tab-bar">
              <button
                className={`tab ${activeTab === 'detected' ? 'tab--active' : ''}`}
                onClick={() => setParams({})}
              >
                <span className="tab-num">2.0</span>
                <span>Skill Claims &amp; Evidence ({skills?.detectedSkills.length || 0})</span>
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

            {/* Tab 1: Detected Skills with Claimed vs Evidenced & Expander */}
            {activeTab === 'detected' && (
              <section className="tab-content">
                <div className="filter-chips">
                  {(['All', 'Technical', 'Domain', 'Needs Proof'] as const).map((cat) => (
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

                        {/* Claimed Level vs Evidenced Level vs Confidence Metric Grid */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 6,
                            background: 'rgba(0,0,0,0.25)',
                            padding: '6px 8px',
                            borderRadius: 6,
                            margin: '4px 0',
                            fontSize: 12,
                            textAlign: 'center',
                          }}
                        >
                          <div>
                            <div style={{ color: 'var(--muted)', fontSize: 10, textTransform: 'uppercase' }}>Claimed</div>
                            <div style={{ fontWeight: 700, color: '#fff' }}>{sk.claimedLevel}%</div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--muted)', fontSize: 10, textTransform: 'uppercase' }}>Evidenced</div>
                            <div style={{ fontWeight: 700, color: isInsufficient ? '#fca5a5' : 'var(--accent-cyan)' }}>
                              {sk.evidencedLevel !== null ? `${sk.evidencedLevel}%` : '< 35%'}
                            </div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--muted)', fontSize: 10, textTransform: 'uppercase' }}>Confidence</div>
                            <div style={{ fontWeight: 800, color: isInsufficient ? '#fca5a5' : '#34d399' }}>
                              {sk.proficiency > 0 ? `${sk.proficiency}%` : 'NULL'}
                            </div>
                          </div>
                        </div>

                        {/* Confidence Progress Bar */}
                        <div className="skill-bar-track">
                          <div
                            className="skill-bar-fill"
                            style={{
                              width: `${isInsufficient ? 10 : sk.proficiency}%`,
                              background: isInsufficient
                                ? '#ef4444'
                                : sk.proficiency >= 80
                                ? 'linear-gradient(90deg, #008f94, #2fc9c6)'
                                : sk.proficiency >= 65
                                ? 'linear-gradient(90deg, #4f46e5, #7ef0ec)'
                                : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                            }}
                          />
                        </div>

                        {/* Recency Time-Decay Metadata */}
                        <div className="decay-meta">
                          <span>
                            🕒 Last verified: <strong>{sk.lastDemonstratedDate || 'Unverified'}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            {Math.round(sk.timeDecayFactor * 100)}% retention ({sk.daysElapsed}d ago)
                          </span>
                        </div>

                        {/* Category & "Why this score" Expander Button */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                          <span className="skill-tag">{sk.category}</span>
                          <button
                            type="button"
                            className="evidence-btn"
                            onClick={() => toggleExpand(sk.claimId)}
                            title="Inspect mathematical reasoning and linked citations"
                          >
                            <span>{isExpanded ? 'Hide Breakdown' : 'Why this score?'}</span>
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
                                      {ev.verified && <span style={{ color: '#34d399', marginLeft: 8 }}>✓ Verified Citation</span>}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div style={{ fontSize: 12, color: '#fca5a5', padding: '4px 0' }}>
                                  ⚠️ <strong>Thin Evidence:</strong> This skill was listed as a keyword with no project
                                  metrics or recent code artifacts. To verify this claim and raise confidence, complete the
                                  corresponding roadmap task in Interface 4.
                                </div>
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
                {/* Corpus Status & Scheduled Ingest Header */}
                <div className="corpus-status-bar">
                  <div className="corpus-status-left">
                    <span className="status-dot" />
                    <span>{corpusStatusText}</span>
                  </div>
                  <button
                    className="assumption-toggle-btn"
                    onClick={handleRefreshCorpus}
                    disabled={refreshingCorpus}
                    title="Poll official job API endpoints and deduplicate"
                  >
                    {refreshingCorpus ? 'Refreshing Feed...' : '↻ Run Scheduled Ingest'}
                  </button>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <p className="missing-intro" style={{ margin: 0 }}>
                    Skills ranked by <strong>Counterfactual Learning-ROI</strong> (Marginal Roles Unlocked per Deliberate Hour).
                    Simulated against active job postings where verified skills outweigh unevidenced claims.
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
                  {(cfSkills.length > 0
                    ? [...cfSkills].sort((a, b) => (sortByROI ? b.roiScore - a.roiScore : b.difficulty - a.difficulty))
                    : missingSkills.map((ms) => ({
                        skillName: ms.name,
                        category: ms.category,
                        importance: ms.importance,
                        difficulty: ms.difficulty,
                        baselineRolesCount: 2,
                        counterfactualRolesCount: 2 + ms.rolesUnlockedCount,
                        deltaRolesCount: ms.rolesUnlockedCount,
                        estimatedEffortHours: ms.estimatedEffortHours,
                        roiScore: ms.roiScore,
                        roiLabel: ms.roiLabel,
                        assumptionNote: `Assumes ~${ms.estimatedEffortHours}h deliberate practice for an engineer with CS background.`,
                        unlockedJobsSample: [
                          { title: 'Senior Backend Infrastructure Engineer', company: 'Stripe' },
                          { title: 'Staff Edge Platform Engineer', company: 'Cloudflare' },
                        ],
                        why: ms.why,
                      }))
                  ).map((ms, idx) => {
                    const isSimulated = simulatedSkills.has(ms.skillName);
                    const isAssumptionOpen = expandedAssumption === ms.skillName;

                    return (
                      <div key={ms.skillName} className="missing-card glass">
                        <div className="missing-card__header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className={`rank-badge ${idx === 0 ? '' : 'rank-badge--secondary'}`}>
                              {idx === 0 ? '★ #1 Next Best Skill' : `#${idx + 1} High-ROI Gap`}
                            </span>
                            <span className={`importance-badge importance--${ms.importance.toLowerCase()}`}>
                              {ms.importance}
                            </span>
                            <h3 className="missing-title">{ms.skillName}</h3>
                          </div>
                          <div className="difficulty-stars">
                            <span style={{ fontSize: 13, color: 'var(--muted)', marginRight: 6 }}>
                              Learning Curve:
                            </span>
                            {'★'.repeat(ms.difficulty)}
                            {'☆'.repeat(5 - ms.difficulty)}
                          </div>
                        </div>

                        {/* Counterfactual Learning-ROI Metrics Bar */}
                        <div className="roi-banner">
                          <div className="roi-pill">
                            ⚡ {ms.roiLabel}
                          </div>
                          <div className="roi-metrics-row">
                            <span className="roi-metric-item">
                              🎯 Unlocks: <strong className="roi-metric-val">+{ms.deltaRolesCount} Roles</strong> ({ms.baselineRolesCount} → {ms.counterfactualRolesCount} accessible)
                            </span>
                            <span className="roi-metric-item">
                              ⏱️ Est. Practice: <strong className="roi-metric-val">{ms.estimatedEffortHours}h</strong>
                            </span>
                            <span className="roi-metric-item">
                              📊 Leverage Score: <strong className="roi-metric-val">{(ms.roiScore * 100).toFixed(0)} pts</strong>
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button
                              type="button"
                              className="assumption-toggle-btn"
                              onClick={() => setExpandedAssumption((prev) => (prev === ms.skillName ? null : ms.skillName))}
                            >
                              ℹ️ {isAssumptionOpen ? 'Hide Assumptions' : 'Assumptions & Evidence'}
                            </button>
                            <button
                              type="button"
                              className={`simulate-btn ${isSimulated ? 'simulate-btn--active' : ''}`}
                              onClick={() => {
                                const next = new Set(simulatedSkills);
                                if (next.has(ms.skillName)) next.delete(ms.skillName);
                                else next.add(ms.skillName);
                                setSimulatedSkills(next);
                              }}
                              title="Virtually injects this skill into your graph to see match score delta"
                            >
                              {isSimulated ? '✓ Simulated (+85%)' : '+ Simulate in Graph'}
                            </button>
                          </div>
                        </div>

                        {/* Expandable Assumptions & Methodology Drawer */}
                        {isAssumptionOpen && (
                          <div className="assumption-drawer">
                            <div>
                              <strong style={{ color: '#fff' }}>📌 Deliberate Practice Assumption:</strong>{' '}
                              {ms.assumptionNote}
                            </div>
                            <div>
                              <strong style={{ color: '#fff' }}>📐 Counterfactual Methodology:</strong>{' '}
                              Formula: <code>ROI = Δ Roles / Estimated Practice Hours</code>. Evaluates candidate's Evidence Graph against the active market corpus, weighting verified citations (100%) above unevidenced keywords (40%). Match threshold \(\theta = 70\%\).
                            </div>
                            {ms.unlockedJobsSample && ms.unlockedJobsSample.length > 0 && (
                              <div>
                                <strong style={{ color: '#fff' }}>🏢 Specific Roles Unlocked:</strong>
                                <div className="unlocked-jobs-grid">
                                  {ms.unlockedJobsSample.map((j, i) => (
                                    <span key={i} className="unlocked-job-tag">
                                      ✓ {j.title} ({j.company})
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <p className="missing-why">
                          <strong>Why it matters:</strong> {ms.why}
                        </p>
                      </div>
                    );
                  })}
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
