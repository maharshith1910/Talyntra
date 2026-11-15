import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Button from '../components/Button';
import { useStore } from '../lib/store';
import {
  PersonaType,
  PANEL_PERSONAS,
  getCompanyPlacementModes,
  CompanyPlacementMode,
  generateInterrogationQuestion,
  evaluateInterrogationAnswer,
  generateSessionSummary,
  InterrogationEvaluationResult,
  SessionSummary,
} from '../lib/interrogationPanel';

interface PanelChatMessage {
  id: string;
  sender: string;
  role: 'user' | 'persona';
  text: string;
  timestamp: string;
  evaluation?: InterrogationEvaluationResult;
}

const uid = () => Math.random().toString(36).slice(2);

export default function Chat() {
  const nav = useNavigate();
  const { state, setEvidenceGraph } = useStore();
  const currentGraph = state.evidenceGraph || state.skills?.evidenceGraph;

  const [activePersona, setActivePersona] = useState<PersonaType>('bar_raiser');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('standard');
  const [messages, setMessages] = useState<PanelChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const companyModes = getCompanyPlacementModes();
  const activeCompany = companyModes.find((m) => m.id === selectedCompanyId) || companyModes[0];
  const activePersonaProfile = PANEL_PERSONAS[activePersona];

  // Initialize/reset conversation when persona or company mode changes
  useEffect(() => {
    if (!currentGraph) return;

    const challenge = generateInterrogationQuestion(
      currentGraph,
      activePersona,
      selectedCompanyId
    );

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const initialMsg: PanelChatMessage = {
      id: uid(),
      sender: activePersonaProfile.name,
      role: 'persona',
      text: challenge.question,
      timestamp: now,
    };

    setMessages([initialMsg]);
  }, [activePersona, selectedCompanyId, currentGraph]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isEvaluating]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activePersona]);

  const handleSendAnswer = async (e: FormEvent) => {
    e.preventDefault();
    const answer = inputText.trim();
    if (!answer || isEvaluating || !currentGraph) return;

    setInputText('');
    setIsEvaluating(true);

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Add User Message
    const userMsg: PanelChatMessage = {
      id: uid(),
      sender: state.profile.fullName || 'Candidate',
      role: 'user',
      text: answer,
      timestamp: now,
    };

    setMessages((prev) => [...prev, userMsg]);

    // 2. Evaluate answer against persona rubric
    setTimeout(() => {
      const challenge = generateInterrogationQuestion(
        currentGraph,
        activePersona,
        selectedCompanyId
      );

      const targetSkill = challenge.targetedSkill.skillName;
      const evalResult = evaluateInterrogationAnswer(
        currentGraph,
        activePersona,
        targetSkill,
        answer
      );

      // Update global Evidence Graph
      setEvidenceGraph(evalResult.updatedGraph);

      const personaReply: PanelChatMessage = {
        id: uid(),
        sender: activePersonaProfile.name,
        role: 'persona',
        text: evalResult.summaryFeedback,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        evaluation: evalResult,
      };

      setMessages((prev) => [...prev, personaReply]);
      setIsEvaluating(false);
    }, 600);
  };

  const handleOpenSummary = () => {
    if (currentGraph) {
      const summary = generateSessionSummary(currentGraph);
      setSessionSummary(summary);
      setShowSummaryModal(true);
    }
  };

  const challengeInfo = currentGraph
    ? generateInterrogationQuestion(currentGraph, activePersona, selectedCompanyId)
    : null;

  return (
    <div className="chat">
      <Sidebar />

      <section className="chat__main">
        {/* Top Controls: 3-Persona Panel Tabs & Company Mode Selector */}
        <div className="panel-top-controls">
          <div className="panel-tabs-row">
            {(['bar_raiser', 'engineering_manager', 'recruiter'] as PersonaType[]).map((pKey) => {
              const p = PANEL_PERSONAS[pKey];
              const isActive = activePersona === pKey;
              return (
                <button
                  key={pKey}
                  type="button"
                  className={`panel-tab-btn ${isActive ? 'panel-tab-btn--active' : ''}`}
                  onClick={() => setActivePersona(pKey)}
                >
                  <span className="panel-tab-avatar">{p.avatar}</span>
                  <div>
                    <div className="panel-tab-title">{p.name}</div>
                    <div className="panel-tab-badge">{p.roleBadge}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Company Placement Mode Selector */}
          <div className="company-selector-bar">
            <div className="company-selector-left">
              <span style={{ fontWeight: 700, color: '#fff' }}>🏢 Placement Mode:</span>
              <select
                className="company-select"
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
              >
                {companyModes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.company})
                  </option>
                ))}
              </select>
              <span className="company-verification-pill">
                ℹ️ {activeCompany.tier}
              </span>
            </div>

            <button
              type="button"
              className="assumption-toggle-btn"
              onClick={handleOpenSummary}
            >
              📊 Executive Panel Summary
            </button>
          </div>
        </div>

        {/* Targeted Weakness Banner */}
        {challengeInfo && (
          <div className="target-challenge-banner" style={{ marginTop: 12 }}>
            <div>
              <span style={{ color: '#fca5a5', fontWeight: 800 }}>⚡ TARGETING WEAK CLAIM:</span>{' '}
              <span className="target-skill-name">"{challengeInfo.targetedSkill.skillName}"</span>{' '}
              <span style={{ color: 'var(--muted)' }}>
                (Claimed: {challengeInfo.targetedSkill.claimedLevel}% • Confidence:{' '}
                {challengeInfo.targetedSkill.confidenceScore !== null
                  ? `${challengeInfo.targetedSkill.confidenceScore}%`
                  : 'Insufficient Evidence'}
                )
              </span>
            </div>
            <div style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
              Challenge Angle: {activePersonaProfile.focusSummary}
            </div>
          </div>
        )}

        {/* Conversation Stream */}
        <div className="chat__stream" role="log" aria-live="polite">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`bubble ${m.role === 'user' ? 'bubble--user' : 'bubble--ai'}`}
            >
              <div className="bubble-sender">{m.sender}</div>
              <div className="bubble-text">{m.text}</div>

              {/* Rubric Evaluation Breakdown on Persona Feedback */}
              {m.evaluation && (
                <div className="rubric-eval-card">
                  <div className="rubric-eval-head">
                    <span style={{ fontWeight: 700, color: '#fff' }}>
                      📋 {PANEL_PERSONAS[m.evaluation.persona].title} Rubric
                    </span>
                    <span
                      className={`rubric-score-badge ${
                        m.evaluation.passed ? 'rubric-score--pass' : 'rubric-score--fail'
                      }`}
                    >
                      {m.evaluation.passed ? '✓ PASSED' : '⚠️ REVISE'} ({m.evaluation.overallScore}%)
                    </span>
                  </div>

                  <div className="rubric-dims-grid">
                    {m.evaluation.feedbackDimensions.map((dim, i) => (
                      <div key={i} className="rubric-dim-item">
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff' }}>
                          <span>{dim.dimension}</span>
                          <strong>{dim.score}/100</strong>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          {dim.comment}
                        </div>
                      </div>
                    ))}
                  </div>

                  {m.evaluation.passed && (
                    <div style={{ marginTop: 6 }}>
                      <span className="evidence-delta-pill">
                        ✓ Evidence Graph Synced: Created <code>interview_practice</code> node (Base Weight: 0.70)
                      </span>
                    </div>
                  )}
                </div>
              )}

              <span className="bubble-ts">{m.timestamp}</span>
            </div>
          ))}

          {isEvaluating && (
            <div className="bubble bubble--ai typing" aria-label="Evaluating against rubric">
              <i />
              <i />
              <i />
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Composer */}
        <form className="composer" onSubmit={handleSendAnswer}>
          <span className="composer-plus" aria-hidden>
            +
          </span>
          <input
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Defend your claim to ${activePersonaProfile.name} (include numbers, trade-offs, and STAR structure)…`}
            aria-label="Your defense"
            disabled={isEvaluating}
          />
          <button
            type="submit"
            className="composer-send"
            disabled={isEvaluating || !inputText.trim()}
          >
            {isEvaluating ? '…' : '↑'}
          </button>
        </form>
      </section>

      {/* Session Summary Modal */}
      {showSummaryModal && sessionSummary && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 640 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, color: '#fff', margin: 0 }}>
                📊 Executive Interrogation Panel Summary
              </h2>
              <button
                type="button"
                className="chip"
                onClick={() => setShowSummaryModal(false)}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              {/* Strongest Evidence */}
              <div style={{ background: 'rgba(52, 211, 153, 0.1)', padding: 12, borderRadius: 8, border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                <div style={{ color: '#34d399', fontWeight: 800, fontSize: 12, textTransform: 'uppercase' }}>
                  🌟 Strongest Verified Evidence
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginTop: 2 }}>
                  {sessionSummary.strongestEvidence.skillName} ({sessionSummary.strongestEvidence.confidenceScore}% Verified)
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 0' }}>
                  {sessionSummary.strongestEvidence.reason}
                </p>
              </div>

              {/* Weakest Claims */}
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: 12, borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <div style={{ color: '#fca5a5', fontWeight: 800, fontSize: 12, textTransform: 'uppercase' }}>
                  ⚠️ Critical Evidence Gaps
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                  {sessionSummary.weakestClaims.map((wc, i) => (
                    <div key={i} style={{ fontSize: 13, color: '#fff' }}>
                      • <strong>{wc.skillName}</strong> ({wc.status}) —{' '}
                      <span style={{ color: 'var(--muted)', fontSize: 12 }}>{wc.reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested Roadmap Milestones */}
              <div style={{ background: 'rgba(79, 70, 229, 0.15)', padding: 12, borderRadius: 8, border: '1px solid rgba(126, 240, 236, 0.3)' }}>
                <div style={{ color: 'var(--accent-cyan)', fontWeight: 800, fontSize: 12, textTransform: 'uppercase' }}>
                  🚀 Recommended Roadmap Actions
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                  {sessionSummary.suggestedRoadmapTasks.map((task, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#fff' }}>
                      <strong>{task.title}</strong>: {task.prompt}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <Button onClick={() => nav('/roadmap')}>
                Bridge Gaps in Roadmap (Interface 4) →
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
