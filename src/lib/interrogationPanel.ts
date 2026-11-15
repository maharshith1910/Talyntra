// Talyntra Phase 5: Interrogation-Style Panel Engine
// Personas: Recruiter, Engineering Manager, Bar Raiser
// Systematically challenges weakly-evidenced claims and feeds back into Evidence Graph

import { addInterviewPracticeToGraph, type EvidenceGraph, type SkillClaim } from './evidenceGraph.ts';
import { COMPANY_PLACEMENT_MODES, type CompanyPlacementMode } from '../data/companyPlacementModes.ts';
export type { CompanyPlacementMode };

export type PersonaType = 'recruiter' | 'engineering_manager' | 'bar_raiser';

export interface PersonaProfile {
  id: PersonaType;
  name: string;
  title: string;
  roleBadge: string;
  avatar: string;
  tone: string;
  focusSummary: string;
  rubricDimensions: { name: string; weight: number; description: string }[];
}

export const PANEL_PERSONAS: Record<PersonaType, PersonaProfile> = {
  recruiter: {
    id: 'recruiter',
    name: 'Sarah Jenkins',
    title: 'Lead Talent Partner & Senior Technical Recruiter',
    roleBadge: 'Recruiter Screen (Round 1)',
    avatar: '👩‍💼',
    tone: 'Perceptive, professional, skeptical of resume buzzwords',
    focusSummary: 'Screens for scope truthfulness, STAR communication clarity, and unquantified buzzwords.',
    rubricDimensions: [
      { name: 'Role Ownership & Scope', weight: 40, description: 'Clearly states what they personally built vs. team contribution.' },
      { name: 'STAR Communication', weight: 30, description: 'Follows Situation, Task, Action, Result with concrete business metrics.' },
      { name: 'Authenticity vs. Inflation', weight: 30, description: 'Absence of rehearsed evasiveness; honest acknowledgment of limits.' },
    ],
  },
  engineering_manager: {
    id: 'engineering_manager',
    name: 'Marcus Vance',
    title: 'Engineering Director, Platform & Core Services',
    roleBadge: 'EM Delivery & Operations (Round 2)',
    avatar: '👨‍💻',
    tone: 'Battle-tested, pragmatic, zero tolerance for theoretical hand-waving',
    focusSummary: 'Probes operational reliability, production rollbacks, incident post-mortems, and delivery trade-offs.',
    rubricDimensions: [
      { name: 'Production Realism', weight: 40, description: 'Understands failure domains: connection exhaustion, memory leaks, rollbacks.' },
      { name: 'Engineering Tradeoffs', weight: 30, description: 'Defends architecture decisions considering latency, maintainability, and tech debt.' },
      { name: 'Accountability & Post-Mortems', weight: 30, description: 'Takes blameless ownership of defects and systemic preventative fixes.' },
    ],
  },
  bar_raiser: {
    id: 'bar_raiser',
    name: 'Dr. Elena Rostova',
    title: 'Principal Systems Architect & Corporate Bar Raiser',
    roleBadge: 'Bar Raiser (Final Pressure-Test)',
    avatar: '🔬',
    tone: 'Forensic, rigorous, deeply technical, relentlessly challenging happy-path assumptions',
    focusSummary: 'Identifies insufficient-evidence claims and attacks failure modes, p99 latency spikes, and architectural boundaries.',
    rubricDimensions: [
      { name: 'Architectural Invariants', weight: 40, description: 'Mathematical correctness of ACID, serialization, idempotency, consensus.' },
      { name: 'Failure-Domain Rigor', weight: 35, description: 'Proactive mitigation of split-brain, thundering herds, and cascading failures.' },
      { name: 'Tradeoff Defense', weight: 25, description: 'Justifies technology choices with concrete quantitative constraints.' },
    ],
  },
};

export function getCompanyPlacementModes(): CompanyPlacementMode[] {
  return COMPANY_PLACEMENT_MODES;
}

/**
 * Selects the specific claim in the candidate's Evidence Graph that this persona should target.
 */
export function selectTargetClaimForPersona(
  graph: EvidenceGraph,
  persona: PersonaType,
  companyModeId: string = 'standard'
): SkillClaim {
  const claims = Object.values(graph.skillClaims || {});
  if (claims.length === 0) {
    return {
      id: 'default-claim',
      skillName: 'System Design & Scalability Principles',
      category: 'Technical',
      claimedLevel: 85,
      evidencedLevel: null,
      confidenceScore: null,
      confidenceStatus: 'insufficient_evidence',
      linkedEvidenceIds: [],
      halfLifeMonths: 24,
      daysElapsed: 90,
      timeDecayFactor: 0.90,
      lastDemonstratedDate: '2024-01-01',
      reasoning: 'Default claim target',
    };
  }

  const mode = getCompanyPlacementModes().find((m) => m.id === companyModeId);
  const prioritySkills = mode ? mode.prioritySkills : [];

  // Bar Raiser: targets 'insufficient_evidence' claims or lowest confidence score
  if (persona === 'bar_raiser') {
    const insufficient = claims.find(
      (c) =>
        c.confidenceStatus === 'insufficient_evidence' &&
        (prioritySkills.length === 0 || prioritySkills.includes(c.skillName))
    );
    if (insufficient) return insufficient;

    const lowest = [...claims].sort((a, b) => (a.confidenceScore || 0) - (b.confidenceScore || 0))[0];
    return lowest || claims[0];
  }

  // Engineering Manager: targets claims with high time decay or unevidenced operational skills
  if (persona === 'engineering_manager') {
    const highDecay = [...claims].sort((a, b) => b.daysElapsed - a.daysElapsed)[0];
    const operational = claims.find((c) =>
      ['Web Architecture & REST/GraphQL APIs', 'CI/CD Pipelines & Containerization', 'Automated Testing (Unit & E2E)'].includes(c.skillName)
    );
    return operational || highDecay || claims[0];
  }

  // Recruiter: targets claims where claimed level is high but evidenced level is low/unverified
  const unverifiedClaim = claims.find(
    (c) => c.claimedLevel >= 80 && (c.confidenceScore === null || c.confidenceScore < 60)
  );
  if (unverifiedClaim) return unverifiedClaim;

  const priorityClaim = claims.find((c) => prioritySkills.includes(c.skillName));
  return priorityClaim || claims[0];
}

/**
 * Generates an interrogation question tailored to the chosen persona and targeted skill claim.
 */
export function generateInterrogationQuestion(
  graph: EvidenceGraph,
  persona: PersonaType,
  companyModeId: string = 'standard'
): { question: string; targetedSkill: SkillClaim; personaProfile: PersonaProfile } {
  const personaProfile = PANEL_PERSONAS[persona];
  const targetedSkill = selectTargetClaimForPersona(graph, persona, companyModeId);
  const skill = targetedSkill.skillName;
  const isInsufficient = targetedSkill.confidenceStatus === 'insufficient_evidence';

  let question = '';

  if (persona === 'recruiter') {
    if (isInsufficient) {
      question = `You claimed an advanced proficiency of ${targetedSkill.claimedLevel}% in "${skill}", yet our Evidence Graph flags zero verifiable code artifacts or production metrics for this competency. Walk me through the largest project where you utilized this: What was your specific personal ownership versus the rest of your team, and what measurable business metric did you move?`;
    } else {
      question = `On your profile, you highlight "${skill}" with a ${targetedSkill.confidenceScore}% confidence rating. In 60 seconds using the STAR framework (Situation, Task, Action, Result), tell me about a time you had to deliver a critical milestone with ${skill} under strict deadlines. What trade-off did you negotiate with leadership?`;
    }
  } else if (persona === 'engineering_manager') {
    if (companyModeId === 'jpmc') {
      question = `In financial systems at JPMorgan Chase, transaction integrity and low-latency throughput are non-negotiable. Regarding "${skill}" (last demonstrated ~${targetedSkill.daysElapsed} days ago): Describe the most catastrophic production issue or data inconsistency you have ever encountered. How did you diagnose the root cause, what rollback or circuit-breaker did you trigger, and what automated regression test did you write to guarantee it never happens again?`;
    } else {
      question = `Regarding your claim in "${skill}": Anyone can read documentation, but production systems fail in dirty ways. Walk me through the worst regression or performance bottleneck you introduced or debugged with ${skill}. How did you detect it before your customers complained, and what systemic post-mortem fix did you implement?`;
    }
  } else {
    // Bar Raiser
    if (companyModeId === 'google') {
      question = `I'm probing your foundational depth in "${skill}". Suppose our service experiences a sudden 15x traffic surge causing p99 latencies to breach our 100ms SLO. Your initial instinct might be horizontal scaling, but the database connection pool is already saturated. Walk me through the exact algorithmic and concurrency invariants you would adjust. Why does this solution maintain consistency without causing cascading deadlocks?`;
    } else {
      question = `Our Evidence Graph currently marks your "${skill}" competency as "${targetedSkill.confidenceStatus}" (${targetedSkill.confidenceScore ?? '0'}% verified). Let's pressure-test this right now: Walk me through how you design an architectural barrier against split-brain scenarios and thundering herds using ${skill}. What specific metrics (p99 latency, memory footprint, cache hit ratios) prove your architecture holds under a partial network partition?`;
    }
  }

  return { question, targetedSkill, personaProfile };
}

export interface InterrogationEvaluationResult {
  persona: PersonaType;
  skillName: string;
  overallScore: number;
  passed: boolean;
  feedbackDimensions: { dimension: string; score: number; comment: string }[];
  updatedGraph: EvidenceGraph;
  summaryFeedback: string;
}

/**
 * Scores the candidate's answer against the persona's rubric and updates the Evidence Graph.
 */
export function evaluateInterrogationAnswer(
  graph: EvidenceGraph,
  persona: PersonaType,
  skillName: string,
  candidateAnswer: string
): InterrogationEvaluationResult {
  const profile = PANEL_PERSONAS[persona];
  const answer = candidateAnswer.trim();
  const words = answer.split(/\s+/).filter(Boolean);

  let totalScore = 0;
  const feedbackDimensions: { dimension: string; score: number; comment: string }[] = [];

  // Depth heuristics
  const hasNumbers = /\d+/.test(answer);
  const hasTradeoffs = /trade-off|latency|bottleneck|partition|rollback|failover|metric|cache|inconsistent|incident/i.test(answer);
  const isLengthy = words.length >= 35;

  profile.rubricDimensions.forEach((dim) => {
    let dimScore = 50; // baseline

    if (words.length < 15) {
      dimScore = 30;
    } else {
      if (hasNumbers) dimScore += 20;
      if (hasTradeoffs) dimScore += 20;
      if (isLengthy) dimScore += 10;
    }

    dimScore = Math.min(100, Math.max(25, dimScore));
    totalScore += (dimScore * dim.weight) / 100;

    let comment = 'Adequate explanation provided.';
    if (dimScore >= 80) comment = 'Strong operational depth and quantified technical metrics.';
    else if (dimScore < 50) comment = 'Too brief or hand-waving; lacked concrete metrics and failure analysis.';

    feedbackDimensions.push({
      dimension: dim.name,
      score: Math.round(dimScore),
      comment,
    });
  });

  const finalScore = Math.round(totalScore);
  const passed = finalScore >= 70;

  // Add interview practice node into the Evidence Graph
  const updatedGraph = addInterviewPracticeToGraph(
    graph,
    skillName,
    profile.name,
    finalScore,
    answer
  );

  const summaryFeedback = passed
    ? `✓ ${profile.name} passed your defense of "${skillName}" (${finalScore}%). Verified interview evidence citation appended to your graph.`
    : `⚠️ ${profile.name} noted gaps in your defense of "${skillName}" (${finalScore}%). Focus on failure modes and specific metrics to elevate confidence.`;

  return {
    persona,
    skillName,
    overallScore: finalScore,
    passed,
    feedbackDimensions,
    updatedGraph,
    summaryFeedback,
  };
}

export interface SessionSummary {
  strongestEvidence: { skillName: string; confidenceScore: number; reason: string };
  weakestClaims: { skillName: string; status: string; reason: string }[];
  suggestedRoadmapTasks: { title: string; skill: string; prompt: string }[];
}

/**
 * Generates an executive interview session summary highlighting strongest proof, weakest claims, and next roadmap tasks.
 */
export function generateSessionSummary(graph: EvidenceGraph): SessionSummary {
  const claims = Object.values(graph.skillClaims || {});

  // Strongest claim
  const verified = [...claims]
    .filter((c) => c.confidenceScore !== null)
    .sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0));

  const strongest = verified[0] || {
    skillName: 'TypeScript & Strict Types',
    confidenceScore: 86,
    reasoning: 'Backed by verified production migrations and automated PR checks.',
  };

  // Weakest claims
  const weakest = [...claims]
    .filter((c) => c.confidenceStatus === 'insufficient_evidence' || (c.confidenceScore || 0) < 65)
    .slice(0, 3)
    .map((c) => ({
      skillName: c.skillName,
      status: c.confidenceStatus,
      reason: c.reasoning || 'Lacks verifiable production deliverables or code repository proof.',
    }));

  // Suggested roadmap tasks
  const suggestedRoadmapTasks = weakest.map((w) => ({
    title: `Implement and Deploy ${w.skillName} Deliverable`,
    skill: w.skillName,
    prompt: `Build an original GitHub project demonstrating ${w.skillName} with automated CI testing and live HTTPS demo.`,
  }));

  return {
    strongestEvidence: {
      skillName: strongest.skillName,
      confidenceScore: strongest.confidenceScore || 80,
      reason: strongest.reasoning,
    },
    weakestClaims: weakest,
    suggestedRoadmapTasks,
  };
}
