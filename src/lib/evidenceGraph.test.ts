// Unit tests for Talyntra Evidence Graph Engine
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeTimeDecay,
  calculateDaysElapsed,
  evaluateSkillConfidence,
  calculateLearningROI,
  rankMissingSkillsByROI,
  addVerifiedTaskToGraph,
} from './evidenceGraph.ts';
import type { EvidenceNode, EvidenceGraph } from './evidenceGraph.ts';

test('computeTimeDecay respects exponential half-life', () => {
  // At 0 months elapsed, retention is 1.0
  assert.equal(computeTimeDecay(0, 24), 1.0);

  // At exactly 24 months with 24-month half-life, retention should be exactly 0.5
  const halfLifeVal = computeTimeDecay(24, 24);
  assert.ok(Math.abs(halfLifeVal - 0.5) < 0.001);

  // At 48 months with 24-month half-life, retention should be ~0.25
  const quarterVal = computeTimeDecay(48, 24);
  assert.ok(Math.abs(quarterVal - 0.25) < 0.001);
});

test('calculateDaysElapsed calculates calendar days difference', () => {
  const refDate = new Date('2026-01-15');
  const days = calculateDaysElapsed('2026-01-05', refDate);
  assert.equal(days, 10);
});

test('evaluateSkillConfidence returns insufficient_evidence when evidence is empty (Rule 5)', () => {
  const result = evaluateSkillConfidence('Kubernetes', 'Technical', [], 24, new Date(), 90);
  assert.equal(result.confidenceStatus, 'insufficient_evidence');
  assert.equal(result.confidenceScore, null);
  assert.equal(result.claimedLevel, 90);
  assert.equal(result.evidencedLevel, null);
  assert.match(result.reasoning, /insufficient evidence/i);
});

test('evaluateSkillConfidence returns insufficient_evidence when evidence is too dated/weak', () => {
  const anchorDate = new Date('2026-01-01');
  const datedEvidence: EvidenceNode = {
    id: 'ev-1',
    sourceType: 'resume_bullet',
    rawText: 'Mentioned Docker once in coursework',
    sourceContext: 'Intern (2018)',
    timestamp: '2018-01',
    baseWeight: 0.3, // weak mention
    verified: false,
  };

  const result = evaluateSkillConfidence('Docker', 'Technical', [datedEvidence], 24, anchorDate, 80);
  assert.equal(result.confidenceStatus, 'insufficient_evidence');
  assert.equal(result.confidenceScore, null);
  assert.equal(result.claimedLevel, 80);
  assert.ok(result.evidencedLevel !== null && result.evidencedLevel < 35);
});

test('evaluateSkillConfidence produces high verified score with claimed vs evidenced levels', () => {
  const anchorDate = new Date('2026-01-01');
  const freshEvidence: EvidenceNode[] = [
    {
      id: 'ev-fresh-1',
      sourceType: 'resume_bullet',
      rawText: 'Architected React micro-frontend serving 150k DAU, cutting LCP by 45%',
      sourceContext: 'Senior Frontend Engineer @ Vercel (2025)',
      timestamp: '2025-06',
      baseWeight: 0.95,
      verified: true,
    },
    {
      id: 'ev-fresh-2',
      sourceType: 'github_commit',
      rawText: 'Merged 24 pull requests to core state management and performance telemetry',
      sourceContext: 'GitHub open source',
      timestamp: '2025-09',
      baseWeight: 0.85,
      verified: true,
    },
  ];

  const result = evaluateSkillConfidence('React', 'Technical', freshEvidence, 24, anchorDate, 90);
  assert.equal(result.confidenceStatus, 'verified');
  assert.equal(result.claimedLevel, 90);
  assert.ok(result.confidenceScore !== null && result.confidenceScore >= 75);
  assert.equal(result.evidencedLevel, result.confidenceScore);
  assert.ok(result.reasoning.includes('Evidenced level:'));
});

test('calculateLearningROI computes roles unlocked per effort hour', () => {
  const testingROI = calculateLearningROI(
    'Automated Testing (Playwright)',
    'Technical',
    'Critical',
    18, // 18 roles unlocked
    30, // 30 hours effort
    'High interview frequency requirement',
    3
  );

  assert.equal(testingROI.rolesUnlockedCount, 18);
  assert.equal(testingROI.estimatedEffortHours, 30);
  assert.equal(testingROI.roiScore, 0.6); // 18 / 30 = 0.60
  assert.equal(testingROI.roiLabel, '6.0 roles / 10 hrs');
});

test('rankMissingSkillsByROI sorts descending by roiScore', () => {
  const itemA = calculateLearningROI('Skill A', 'Technical', 'Important', 5, 50, '', 3); // 0.10
  const itemB = calculateLearningROI('Skill B', 'Technical', 'Critical', 20, 20, '', 3); // 1.00
  const itemC = calculateLearningROI('Skill C', 'Domain', 'Important', 15, 30, '', 3); // 0.50

  const sorted = rankMissingSkillsByROI([itemA, itemB, itemC]);
  assert.equal(sorted[0].skillName, 'Skill B');
  assert.equal(sorted[1].skillName, 'Skill C');
  assert.equal(sorted[2].skillName, 'Skill A');
});

test('addVerifiedTaskToGraph feeds back into evidence graph and updates skill confidence', () => {
  const anchorDate = new Date('2026-01-01');
  const initialGraph: EvidenceGraph = {
    evidenceNodes: {},
    skillClaims: {
      claim_testing: {
        id: 'claim_testing',
        skillName: 'Automated Testing',
        category: 'Technical',
        claimedLevel: 80,
        evidencedLevel: null,
        linkedEvidenceIds: [],
        halfLifeMonths: 24,
        daysElapsed: 0,
        confidenceScore: null,
        confidenceStatus: 'insufficient_evidence',
        timeDecayFactor: 0,
        lastDemonstratedDate: null,
        reasoning: 'No prior evidence',
      },
    },
    missingSkillsWithROI: [],
    overallMatchScore: null,
    overallReasoning: '',
  };

  const updatedGraph = addVerifiedTaskToGraph(
    initialGraph,
    'Automated Testing',
    'Implemented comprehensive Vitest and Playwright suite with 92% coverage',
    'task-p1-2',
    anchorDate
  );

  const updatedClaim = updatedGraph.skillClaims['claim_testing'];
  assert.ok(updatedClaim);
  assert.equal(updatedClaim.linkedEvidenceIds.length, 1);
  assert.ok(updatedClaim.confidenceScore !== null && updatedClaim.confidenceScore > 40);
  assert.equal(updatedClaim.claimedLevel, 80);
  assert.ok(updatedGraph.overallMatchScore !== null);
  assert.ok(Object.keys(updatedGraph.evidenceNodes).length === 1);
});
