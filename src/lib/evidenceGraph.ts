// Talyntra Evidence Graph Engine
// Implements: Skill Claim -> Linked Evidence -> Confidence Score with Time Decay
// and Learning-ROI Gap Ranking (Roles Unlocked / Effort Hours)

export type EvidenceSourceType =
  | 'resume_bullet'
  | 'project_artifact'
  | 'github_commit'
  | 'github_repo_lang'
  | 'github_topic'
  | 'github_merged_pr'
  | 'credential'
  | 'verified_task';

export type SkillCategory = 'Technical' | 'Soft' | 'Domain';

export interface EvidenceNode {
  id: string;
  sourceType: EvidenceSourceType;
  rawText: string;
  sourceContext: string; // e.g. "Staff Engineer @ Acme Corp (2023 - 2024)"
  timestamp: string; // ISO date string or YYYY-MM
  baseWeight: number; // 0.0 to 1.0 based on rigor (quantified metric = 0.9+, keyword mention = 0.35)
  verified: boolean;
}

export type ConfidenceStatus = 'verified' | 'moderate' | 'weak' | 'insufficient_evidence';

export interface SkillClaim {
  id: string;
  skillName: string;
  category: SkillCategory;
  claimedLevel: number; // Self-claimed / stated level (0 - 100)
  evidencedLevel: number | null; // Raw evidence level before or after decay
  linkedEvidenceIds: string[];
  halfLifeMonths: number; // 24 for fast-moving tech, 48 for fundamentals
  daysElapsed: number;
  confidenceScore: number | null; // 0-100 or null if insufficient
  confidenceStatus: ConfidenceStatus;
  timeDecayFactor: number; // 0.0 - 1.0 (recency retention of most recent evidence)
  lastDemonstratedDate: string | null;
  reasoning: string;
}

export interface LearningROI {
  skillName: string;
  category: SkillCategory;
  importance: 'Critical' | 'Important' | 'Nice-to-have';
  rolesUnlockedCount: number; // How many target/benchmark roles require this skill
  estimatedEffortHours: number; // Estimated hours of deliberate practice to reach competence
  roiScore: number; // rolesUnlockedCount / estimatedEffortHours
  roiLabel: string; // formatted e.g. "0.60 roles/hr"
  why: string;
  difficulty: number; // 1-5 scale
}

export interface EvidenceGraph {
  evidenceNodes: Record<string, EvidenceNode>;
  skillClaims: Record<string, SkillClaim>;
  missingSkillsWithROI: LearningROI[];
  overallMatchScore: number | null;
  overallReasoning: string;
}

// Default half-life in months
export const HALF_LIFE_MAP: Record<SkillCategory, number> = {
  Technical: 24, // Fast changing frameworks & tools
  Domain: 36, // Industry regulations & architecture
  Soft: 48, // Fundamental leadership & communication
};

/**
 * Calculates months elapsed between evidence timestamp and reference date.
 */
export function calculateMonthsElapsed(
  evidenceDateStr: string,
  referenceDate: Date = new Date()
): number {
  const evDate = new Date(evidenceDateStr);
  if (isNaN(evDate.getTime())) return 12; // fallback 1 year if unparseable

  const yearsDiff = referenceDate.getFullYear() - evDate.getFullYear();
  const monthsDiff = referenceDate.getMonth() - evDate.getMonth();
  const totalMonths = yearsDiff * 12 + monthsDiff;
  return Math.max(0, totalMonths);
}

/**
 * Calculates days elapsed between evidence timestamp and reference date.
 */
export function calculateDaysElapsed(
  evidenceDateStr: string,
  referenceDate: Date = new Date()
): number {
  const evDate = new Date(evidenceDateStr);
  if (isNaN(evDate.getTime())) return 365;
  const diffTime = Math.abs(referenceDate.getTime() - evDate.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Computes exponential time-decay factor: e^(-lambda * deltaT)
 * where lambda = ln(2) / halfLifeMonths.
 */
export function computeTimeDecay(monthsElapsed: number, halfLifeMonths: number): number {
  if (halfLifeMonths <= 0) return 1.0;
  const lambda = Math.LN2 / halfLifeMonths;
  const factor = Math.exp(-lambda * monthsElapsed);
  return Math.min(1.0, Math.max(0.01, factor));
}

/**
 * Computes confidence score and status for a skill claim given linked evidence.
 * Rule 4: Every score links to its evidence or reasoning.
 * Rule 5: Where evidence is thin, return "insufficient evidence" instead of guessing.
 */
export function evaluateSkillConfidence(
  skillName: string,
  category: SkillCategory,
  evidenceList: EvidenceNode[],
  halfLifeMonths: number = HALF_LIFE_MAP[category],
  referenceDate: Date = new Date(),
  claimedLevel: number = 85
): {
  claimedLevel: number;
  evidencedLevel: number | null;
  confidenceScore: number | null;
  confidenceStatus: ConfidenceStatus;
  timeDecayFactor: number;
  daysElapsed: number;
  lastDemonstratedDate: string | null;
  reasoning: string;
} {
  if (!evidenceList || evidenceList.length === 0) {
    return {
      claimedLevel,
      evidencedLevel: null,
      confidenceScore: null,
      confidenceStatus: 'insufficient_evidence',
      timeDecayFactor: 0,
      daysElapsed: 0,
      lastDemonstratedDate: null,
      reasoning: `Insufficient evidence: No documented projects, achievements, or credentials found for "${skillName}".`,
    };
  }

  // Find most recent evidence date
  let mostRecentDateStr: string | null = null;
  let mostRecentDateMs = -Infinity;

  for (const ev of evidenceList) {
    const t = new Date(ev.timestamp).getTime();
    if (!isNaN(t) && t > mostRecentDateMs) {
      mostRecentDateMs = t;
      mostRecentDateStr = ev.timestamp;
    }
  }

  // Calculate decayed contribution of each piece of evidence
  const contributions: { node: EvidenceNode; months: number; decay: number; effectiveWeight: number }[] = [];

  for (const ev of evidenceList) {
    const months = calculateMonthsElapsed(ev.timestamp, referenceDate);
    const decay = computeTimeDecay(months, halfLifeMonths);
    const effectiveWeight = ev.baseWeight * decay;
    contributions.push({ node: ev, months, decay, effectiveWeight });
  }

  // Time decay of the most recent item represents recency retention
  const latestMonths = mostRecentDateStr ? calculateMonthsElapsed(mostRecentDateStr, referenceDate) : 24;
  const latestDays = mostRecentDateStr ? calculateDaysElapsed(mostRecentDateStr, referenceDate) : 730;
  const latestDecayFactor = computeTimeDecay(latestMonths, halfLifeMonths);

  // Aggregate independent evidence with diminishing returns:
  // P(competent) = 1 - product(1 - 0.5 * effectiveWeight_i)
  let unreliability = 1.0;
  for (const c of contributions) {
    const factor = c.node.verified ? 0.65 : 0.5;
    unreliability *= Math.max(0.05, 1.0 - factor * c.effectiveWeight);
  }

  const rawScore = Math.round(Math.min(100, (1.0 - unreliability) * 100));

  // Enforce Rule 5: If rawScore < 35, classify as insufficient evidence
  if (rawScore < 35) {
    return {
      claimedLevel,
      evidencedLevel: rawScore,
      confidenceScore: null,
      confidenceStatus: 'insufficient_evidence',
      timeDecayFactor: Number(latestDecayFactor.toFixed(2)),
      daysElapsed: latestDays,
      lastDemonstratedDate: mostRecentDateStr,
      reasoning: `Insufficient evidence: Found ${evidenceList.length} weak or dated citation(s) for "${skillName}" (decayed score of ${rawScore}% is below the 35% confidence threshold). Demonstrable proof or refreshed artifact required.`,
    };
  }

  const confidenceStatus: ConfidenceStatus =
    rawScore >= 75 ? 'verified' : rawScore >= 55 ? 'moderate' : 'weak';

  const bulletsCount = evidenceList.filter((e) => e.sourceType === 'resume_bullet').length;
  const verifiedCount = evidenceList.filter((e) => e.verified).length;

  const reasoning = `Computed from ${evidenceList.length} evidence citation(s) (${bulletsCount} resume bullet(s), ${verifiedCount} verified). Last demonstrated ~${latestMonths} mo. ago (${Math.round(latestDecayFactor * 100)}% retention across ${halfLifeMonths}-mo. half-life). Evidenced level: ${rawScore}% vs. Claimed: ${claimedLevel}%.`;

  return {
    claimedLevel,
    evidencedLevel: rawScore,
    confidenceScore: rawScore,
    confidenceStatus,
    timeDecayFactor: Number(latestDecayFactor.toFixed(2)),
    daysElapsed: latestDays,
    lastDemonstratedDate: mostRecentDateStr,
    reasoning,
  };
}

/**
 * Calculates Learning-ROI for a missing skill:
 * ROI = Roles Unlocked / Estimated Effort Hours
 */
export function calculateLearningROI(
  skillName: string,
  category: SkillCategory,
  importance: 'Critical' | 'Important' | 'Nice-to-have',
  rolesUnlockedCount: number,
  estimatedEffortHours: number,
  why: string,
  difficulty: number
): LearningROI {
  const effort = Math.max(1, estimatedEffortHours);
  const roi = rolesUnlockedCount / effort;
  const roiScore = Number(roi.toFixed(3));
  const roiLabel = `${(roi * 10).toFixed(1)} roles / 10 hrs`;

  return {
    skillName,
    category,
    importance,
    rolesUnlockedCount,
    estimatedEffortHours: effort,
    roiScore,
    roiLabel,
    why,
    difficulty,
  };
}

/**
 * Sorts missing skills by Learning-ROI in descending order (highest leverage first).
 */
export function rankMissingSkillsByROI(missing: LearningROI[]): LearningROI[] {
  return [...missing].sort((a, b) => b.roiScore - a.roiScore);
}

/**
 * Adds a new verified task node to the Evidence Graph and updates the targeted Skill Claim in real-time.
 */
export function addVerifiedTaskToGraph(
  graph: EvidenceGraph,
  skillName: string,
  taskDescription: string,
  taskId: string,
  referenceDate: Date = new Date()
): EvidenceGraph {
  const evidenceId = `ev_task_${taskId}_${Date.now()}`;
  const nowIso = referenceDate.toISOString().slice(0, 7); // YYYY-MM

  const newEvidenceNode: EvidenceNode = {
    id: evidenceId,
    sourceType: 'verified_task',
    rawText: `Completed Roadmap Milestone: ${taskDescription}`,
    sourceContext: 'Talyntra Verified Task Execution',
    timestamp: nowIso,
    baseWeight: 0.95, // High weight for verified actionable task
    verified: true,
  };

  const updatedEvidenceNodes = {
    ...graph.evidenceNodes,
    [evidenceId]: newEvidenceNode,
  };

  // Find or create the skill claim
  const existingClaimEntry = Object.entries(graph.skillClaims).find(
    ([, claim]) => claim.skillName.toLowerCase() === skillName.toLowerCase()
  );

  let targetClaim: SkillClaim;
  let claimKey: string;

  if (existingClaimEntry) {
    [claimKey, targetClaim] = existingClaimEntry;
    targetClaim = {
      ...targetClaim,
      linkedEvidenceIds: [...targetClaim.linkedEvidenceIds, evidenceId],
    };
  } else {
    claimKey = `claim_${skillName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    targetClaim = {
      id: claimKey,
      skillName,
      category: 'Technical',
      claimedLevel: 80,
      evidencedLevel: null,
      linkedEvidenceIds: [evidenceId],
      halfLifeMonths: 24,
      daysElapsed: 0,
      confidenceScore: null,
      confidenceStatus: 'insufficient_evidence',
      timeDecayFactor: 1.0,
      lastDemonstratedDate: nowIso,
      reasoning: '',
    };
  }

  // Recalculate confidence for this claim
  const linkedNodes = targetClaim.linkedEvidenceIds
    .map((id) => updatedEvidenceNodes[id])
    .filter(Boolean);

  const evalResult = evaluateSkillConfidence(
    targetClaim.skillName,
    targetClaim.category,
    linkedNodes,
    targetClaim.halfLifeMonths,
    referenceDate,
    targetClaim.claimedLevel
  );

  const updatedClaim: SkillClaim = {
    ...targetClaim,
    claimedLevel: evalResult.claimedLevel,
    evidencedLevel: evalResult.evidencedLevel,
    confidenceScore: evalResult.confidenceScore,
    confidenceStatus: evalResult.confidenceStatus,
    timeDecayFactor: evalResult.timeDecayFactor,
    daysElapsed: evalResult.daysElapsed,
    lastDemonstratedDate: evalResult.lastDemonstratedDate,
    reasoning: evalResult.reasoning,
  };

  const updatedSkillClaims = {
    ...graph.skillClaims,
    [claimKey]: updatedClaim,
  };

  // Recalculate overall score across all verified/evaluated claims
  const scores = Object.values(updatedSkillClaims)
    .map((c) => c.confidenceScore)
    .filter((s): s is number => s !== null);

  const overallMatchScore =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  return {
    ...graph,
    evidenceNodes: updatedEvidenceNodes,
    skillClaims: updatedSkillClaims,
    overallMatchScore,
    overallReasoning: `Aggregated across ${scores.length} verified skill claim(s) in Evidence Graph.`,
  };
}
