import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  selectTargetClaimForPersona,
  generateInterrogationQuestion,
  evaluateInterrogationAnswer,
  getCompanyPlacementModes,
  generateSessionSummary,
  PANEL_PERSONAS,
} from './interrogationPanel.ts';
import type { EvidenceGraph } from './evidenceGraph.ts';

function createMockGraph(): EvidenceGraph {
  return {
    evidenceNodes: {
      'ev-1': {
        id: 'ev-1',
        sourceType: 'resume_bullet',
        rawText: 'Migrated 80k lines of legacy JS to strict TypeScript reducing runtime errors by 44%.',
        sourceContext: 'Senior Software Engineer (2024)',
        timestamp: '2024-03-01',
        baseWeight: 0.95,
        verified: true,
      },
    },
    skillClaims: {
      'TypeScript & Strict Types': {
        id: 'c-ts',
        skillName: 'TypeScript & Strict Types',
        category: 'Technical',
        claimedLevel: 90,
        evidencedLevel: 86,
        confidenceScore: 86,
        confidenceStatus: 'verified',
        linkedEvidenceIds: ['ev-1'],
        halfLifeMonths: 24,
        daysElapsed: 70,
        timeDecayFactor: 0.93,
        lastDemonstratedDate: '2024-03-01',
        reasoning: 'Backed by verified migration bullet.',
      },
      'Web Architecture & REST/GraphQL APIs': {
        id: 'c-api',
        skillName: 'Web Architecture & REST/GraphQL APIs',
        category: 'Technical',
        claimedLevel: 85,
        evidencedLevel: null,
        confidenceScore: null,
        confidenceStatus: 'insufficient_evidence',
        linkedEvidenceIds: [],
        halfLifeMonths: 24,
        daysElapsed: 150,
        timeDecayFactor: 0.85,
        lastDemonstratedDate: '2023-11-01',
        reasoning: 'No verified citations found.',
      },
      'System Design & Scalability Principles': {
        id: 'c-sys',
        skillName: 'System Design & Scalability Principles',
        category: 'Technical',
        claimedLevel: 85,
        evidencedLevel: null,
        confidenceScore: null,
        confidenceStatus: 'insufficient_evidence',
        linkedEvidenceIds: [],
        halfLifeMonths: 24,
        daysElapsed: 200,
        timeDecayFactor: 0.80,
        lastDemonstratedDate: '2023-09-01',
        reasoning: 'Listed as keyword without architectural deliverables.',
      },
    },
    missingSkillsWithROI: [],
    overallMatchScore: 86,
    overallReasoning: 'Mock Graph',
  };
}

test('selectTargetClaimForPersona: Bar Raiser targets insufficient_evidence claim', () => {
  const graph = createMockGraph();
  const target = selectTargetClaimForPersona(graph, 'bar_raiser');
  assert.equal(target.confidenceStatus, 'insufficient_evidence', 'Bar Raiser must target insufficient evidence claim');
});

test('selectTargetClaimForPersona: Recruiter targets unverified claim with high claimed level', () => {
  const graph = createMockGraph();
  const target = selectTargetClaimForPersona(graph, 'recruiter');
  assert.ok(target.claimedLevel >= 80, 'Recruiter must target high claimed level claim');
});

test('generateInterrogationQuestion weaves in company mode requirements', () => {
  const graph = createMockGraph();

  // Test JPMC mode (financial low-latency & transaction integrity)
  const jpmcQ = generateInterrogationQuestion(graph, 'engineering_manager', 'jpmc');
  assert.ok(jpmcQ.question.toLowerCase().includes('jpmorgan chase'), 'Must cite company context');
  assert.ok(jpmcQ.question.length > 50, 'Must produce detailed question');

  // Test Google mode (algorithmic p99 latency & concurrency)
  const googleQ = generateInterrogationQuestion(graph, 'bar_raiser', 'google');
  assert.ok(googleQ.question.toLowerCase().includes('latency') || googleQ.question.toLowerCase().includes('slo'), 'Must test p99 latency SLOs');
});

test('evaluateInterrogationAnswer: scores rubric and creates interview_practice evidence node on pass', () => {
  const graph = createMockGraph();
  const detailedAnswer =
    'At my previous role, our distributed payment API handled 15,000 req/sec. When a thundering herd hit our PostgreSQL connection pool during Black Friday, p99 latency spiked to 650ms. I implemented a Redis cache-aside layer with jittered TTL and circuit-breakers using resilience4j, reducing database load by 74% and restoring p99 latency to 42ms with zero transaction loss.';

  const result = evaluateInterrogationAnswer(
    graph,
    'bar_raiser',
    'System Design & Scalability Principles',
    detailedAnswer
  );

  assert.ok(result.passed, 'Detailed operational answer must pass');
  assert.ok(result.overallScore >= 70, `Score must be >= 70% (was ${result.overallScore}%)`);
  assert.equal(result.feedbackDimensions.length, 3, 'Must have 3 rubric feedback dimensions');

  // Verify interview_practice evidence node was created in updatedGraph
  const practiceNodes = Object.values(result.updatedGraph.evidenceNodes).filter(
    (n) => n.sourceType === 'interview_practice'
  );
  assert.ok(practiceNodes.length > 0, 'Must create interview_practice evidence node');
  assert.equal(practiceNodes[0].verified, true, 'Practice node must be verified on pass');

  // Verify target claim was elevated in updatedGraph
  const claim = Object.values(result.updatedGraph.skillClaims).find(
    (c) => c.skillName === 'System Design & Scalability Principles'
  );
  assert.ok(claim, 'Target claim must exist');
  assert.ok(claim!.confidenceScore !== null && claim!.confidenceScore > 0, 'Confidence score must be updated');
  assert.notEqual(claim!.confidenceStatus, 'insufficient_evidence', 'Confidence status must be promoted');
});

test('evaluateInterrogationAnswer: rejects brief hand-wavy answers', () => {
  const graph = createMockGraph();
  const briefAnswer = 'I know how to use databases and they are fast.';

  const result = evaluateInterrogationAnswer(
    graph,
    'bar_raiser',
    'System Design & Scalability Principles',
    briefAnswer
  );

  assert.equal(result.passed, false, 'Brief answer without metrics must fail');
  assert.ok(result.overallScore < 70, 'Score must be below 70% threshold');
});

test('getCompanyPlacementModes returns official configs with verification notes', () => {
  const modes = getCompanyPlacementModes();
  assert.ok(modes.length >= 3, 'Must include standard, jpmc, and google modes');

  const jpmc = modes.find((m) => m.id === 'jpmc');
  assert.ok(jpmc, 'Must have JPMC mode');
  assert.ok(jpmc!.officialVerificationNote.includes('MoU'), 'Must include official verification note');

  const google = modes.find((m) => m.id === 'google');
  assert.ok(google, 'Must have Google mode');
  assert.ok(google!.officialVerificationNote.includes('Google Careers'), 'Must cite official careers guideline');
});

test('generateSessionSummary returns strongest evidence, weakest gaps, and roadmap tasks', () => {
  const graph = createMockGraph();
  const summary = generateSessionSummary(graph);

  assert.ok(summary.strongestEvidence.skillName, 'Must identify strongest evidence');
  assert.ok(summary.weakestClaims.length > 0, 'Must identify weakest claims');
  assert.ok(summary.suggestedRoadmapTasks.length > 0, 'Must suggest roadmap tasks');
});

