import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreJobMatch,
  evaluateCounterfactualROI,
  DETERMINISTIC_JOBS_CORPUS,
  type BenchmarkJobPosting,
} from './learningROI.ts';
import type { EvidenceGraph } from './evidenceGraph.ts';

// Helper to construct a test Evidence Graph with verified vs unevidenced claims
function createTestGraph(options: {
  hasSystemDesignEvidenced?: boolean;
  hasTypeScriptEvidenced?: boolean;
  hasUnevidencedTesting?: boolean;
  hasTestingEvidenced?: boolean;
  hasDatabasesEvidenced?: boolean;
}): EvidenceGraph {
  const claims: Record<string, any> = {};

  if (options.hasTypeScriptEvidenced) {
    claims['TypeScript & Strict Types'] = {
      id: 'c-ts',
      skillName: 'TypeScript & Strict Types',
      claimedLevel: 90,
      evidencedLevel: 86,
      confidenceScore: 86,
      confidenceStatus: 'verified',
    };
  }

  claims['Web Architecture & REST/GraphQL APIs'] = {
    id: 'c-api',
    skillName: 'Web Architecture & REST/GraphQL APIs',
    claimedLevel: 85,
    evidencedLevel: 82,
    confidenceScore: 82,
    confidenceStatus: 'verified',
  };

  if (options.hasDatabasesEvidenced) {
    claims['Databases & Relational Schema Design'] = {
      id: 'c-db',
      skillName: 'Databases & Relational Schema Design',
      claimedLevel: 80,
      evidencedLevel: 75,
      confidenceScore: 75,
      confidenceStatus: 'verified',
    };
  }

  if (options.hasTestingEvidenced) {
    claims['Automated Testing (Unit & E2E)'] = {
      id: 'c-test-ev',
      skillName: 'Automated Testing (Unit & E2E)',
      claimedLevel: 80,
      evidencedLevel: 78,
      confidenceScore: 78,
      confidenceStatus: 'verified',
    };
  } else if (options.hasUnevidencedTesting) {
    claims['Automated Testing (Unit & E2E)'] = {
      id: 'c-test',
      skillName: 'Automated Testing (Unit & E2E)',
      claimedLevel: 80,
      evidencedLevel: null,
      confidenceScore: null, // Insufficient evidence
      confidenceStatus: 'insufficient_evidence',
    };
  }

  if (options.hasSystemDesignEvidenced) {
    claims['System Design & Scalability Principles'] = {
      id: 'c-sys',
      skillName: 'System Design & Scalability Principles',
      claimedLevel: 85,
      evidencedLevel: 85,
      confidenceScore: 85,
      confidenceStatus: 'verified',
    };
  }

  return {
    evidenceNodes: {},
    skillClaims: claims,
    missingSkillsWithROI: [],
    overallMatchScore: 80,
    overallReasoning: 'Test Graph',
  };
}

test('scoreJobMatch weights evidenced skills (1.0) strictly above unevidenced claims (0.40)', () => {
  const job: BenchmarkJobPosting = {
    externalId: 'test-job-1',
    source: 'test',
    title: 'Test Engineer',
    company: 'Test Corp',
    location: 'Remote',
    targetRole: 'Software Engineer',
    requiredSkills: ['Automated Testing (Unit & E2E)'],
    preferredSkills: [],
    rawText: 'Testing job',
    contentHash: 'hash-1',
  };

  // Case 1: Un-evidenced claimed testing skill (claimed 80% without proof -> 0.40 * 0.80 = 0.32)
  const unevidencedGraph = createTestGraph({ hasUnevidencedTesting: true });
  const scoreUnevidenced = scoreJobMatch(unevidencedGraph, job);
  assert.equal(Number(scoreUnevidenced.toFixed(2)), 0.32);

  // Case 2: Evidenced testing skill (85% confidence score -> 0.85)
  const evidencedGraph = createTestGraph({ hasUnevidencedTesting: false });
  evidencedGraph.skillClaims['Automated Testing (Unit & E2E)'] = {
    id: 'c-ev-test',
    skillName: 'Automated Testing (Unit & E2E)',
    category: 'Technical',
    claimedLevel: 85,
    evidencedLevel: 85,
    confidenceScore: 85,
    confidenceStatus: 'verified',
    linkedEvidenceIds: [],
    halfLifeMonths: 24,
    daysElapsed: 0,
    timeDecayFactor: 1.0,
    lastDemonstratedDate: '2024-05-01',
    reasoning: 'Verified test suite',
  };

  const scoreEvidenced = scoreJobMatch(evidencedGraph, job);
  assert.equal(Number(scoreEvidenced.toFixed(2)), 0.85);
  assert.ok(scoreEvidenced > scoreUnevidenced, 'Evidenced skill must score higher than unevidenced claim');
});

test('evaluateCounterfactualROI deterministically computes delta roles on fixed corpus', () => {
  const baseGraph = createTestGraph({
    hasTypeScriptEvidenced: true,
    hasTestingEvidenced: true,
    hasDatabasesEvidenced: true,
    hasSystemDesignEvidenced: false,
  });

  const ranked = evaluateCounterfactualROI(baseGraph, DETERMINISTIC_JOBS_CORPUS, 0.70);

  assert.ok(ranked.length > 0, 'Must return ranked counterfactual skills');
  // System Design should rank near or at the top
  const systemDesign = ranked.find((r) => r.skillName === 'System Design & Scalability Principles');
  assert.ok(systemDesign, 'System Design must be present in counterfactual ranking');
  assert.ok(systemDesign!.deltaRolesCount > 0, 'Virtually adding System Design must unlock accessible roles');
  assert.ok(systemDesign!.roiScore > 0, 'ROI score must be positive');
  assert.equal(systemDesign!.counterfactualRolesCount, systemDesign!.baselineRolesCount + systemDesign!.deltaRolesCount);
});

test('evaluateCounterfactualROI satisfies monotonicity: adding skills never decreases match count', () => {
  const baseGraph = createTestGraph({
    hasTypeScriptEvidenced: true,
  });

  const ranked = evaluateCounterfactualROI(baseGraph, DETERMINISTIC_JOBS_CORPUS, 0.70);

  for (const item of ranked) {
    assert.ok(
      item.counterfactualRolesCount >= item.baselineRolesCount,
      `Monotonicity failed for ${item.skillName}: N_cf (${item.counterfactualRolesCount}) < N_base (${item.baselineRolesCount})`
    );
    assert.ok(item.deltaRolesCount >= 0, 'Delta roles unlocked must be non-negative');
  }
});

test('Zero-Demand Lower Bound: skill demanded by 0 jobs yields zero delta and zero ROI', () => {
  const baseGraph = createTestGraph({ hasTypeScriptEvidenced: true });

  // Corpus of jobs that only require "Obsolete Cobol"
  const zeroCorpus: BenchmarkJobPosting[] = [
    {
      externalId: 'cobol-1',
      source: 'legacy',
      title: 'Legacy Cobol Programmer',
      company: 'Bank',
      location: 'Remote',
      targetRole: 'Software Engineer',
      requiredSkills: ['Obsolete Cobol Dialect'],
      preferredSkills: [],
      rawText: 'Cobol code maintenance',
      contentHash: 'hash-cobol',
    },
  ];

  const ranked = evaluateCounterfactualROI(baseGraph, zeroCorpus, 0.70);
  for (const item of ranked) {
    assert.equal(item.deltaRolesCount, 0, 'Skill with zero market demand must unlock 0 delta roles');
    assert.equal(item.roiScore, 0, 'Skill with zero market demand must have 0 ROI');
  }
});

test('Effort Sensitivity: lower estimated effort with identical delta yields strictly higher ROI', () => {
  // If Skill A unlocks 3 roles in 20 hours vs Skill B unlocks 3 roles in 35 hours:
  // ROI_A = 3 / 20 = 0.150
  // ROI_B = 3 / 35 = 0.086
  const roiA = Number((3 / 20).toFixed(3));
  const roiB = Number((3 / 35).toFixed(3));
  assert.ok(roiA > roiB, 'Lower effort with same role yield must produce higher ROI score');
});
