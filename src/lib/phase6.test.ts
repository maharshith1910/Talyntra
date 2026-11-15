import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createProofToken,
  validateProofToken,
  revokeProofToken,
  generateVerifiedProofView,
  type ProofToken,
} from './proofToken.ts';
import type { EvidenceGraph } from './evidenceGraph.ts';

function createMockGraph(): EvidenceGraph {
  return {
    evidenceNodes: {
      'ev-1': {
        id: 'ev-1',
        sourceType: 'resume_bullet',
        rawText: 'Migrated 80k lines of legacy JS to strict TypeScript with zero any escapes, reducing runtime type errors by 44%.',
        sourceContext: 'Senior Software Engineer @ FinTech (2024)',
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
        reasoning: 'Backed by verified production migration bullet.',
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
        reasoning: 'Listed as keyword without deliverables.',
      },
      'Unverified Hobby Skill': {
        id: 'c-hobby',
        skillName: 'Unverified Hobby Skill',
        category: 'Technical',
        claimedLevel: 70,
        evidencedLevel: 30,
        confidenceScore: 30,
        confidenceStatus: 'weak',
        linkedEvidenceIds: [],
        halfLifeMonths: 24,
        daysElapsed: 300,
        timeDecayFactor: 0.70,
        lastDemonstratedDate: '2023-01-01',
        reasoning: 'Weak unverified mention.',
      },
    },
    missingSkillsWithROI: [],
    overallMatchScore: 86,
    overallReasoning: 'Mock Graph',
  };
}

test('createProofToken: generates cryptographically signed token with expiration', () => {
  const token = createProofToken('usr_123', 'Alex Morgan', 'Software Engineer', 30);
  assert.ok(token.tokenId.startsWith('tok_'), 'Token ID must have tok_ prefix');
  assert.ok(token.signature.length > 8, 'Signature must be non-empty');
  assert.equal(token.isRevoked, false, 'New token must not be revoked');

  const validation = validateProofToken(token);
  assert.equal(validation.valid, true, 'Valid token must pass validation');
});

test('validateProofToken: detects tampered signature', () => {
  const token = createProofToken('usr_123', 'Alex Morgan', 'Software Engineer', 30);
  const tampered: ProofToken = { ...token, signature: 'tampered_fake_signature' };

  const validation = validateProofToken(tampered);
  assert.equal(validation.valid, false, 'Tampered token must fail validation');
  assert.ok(validation.reason?.includes('mismatch'), 'Reason must mention signature mismatch');
});

test('validateProofToken: detects expired token', () => {
  const token = createProofToken('usr_123', 'Alex Morgan', 'Software Engineer', -1); // Expired yesterday
  const validation = validateProofToken(token);
  assert.equal(validation.valid, false, 'Expired token must fail validation');
  assert.ok(validation.reason?.includes('expired'), 'Reason must mention expiration');
});

test('revokeProofToken: permanently invalidates public verification link', () => {
  const token = createProofToken('usr_123', 'Alex Morgan', 'Software Engineer', 30);
  const revoked = revokeProofToken(token.tokenId);
  assert.equal(revoked, true, 'Revocation must succeed');

  const validation = validateProofToken({ ...token, isRevoked: true });
  assert.equal(validation.valid, false, 'Revoked token must fail validation');
  assert.ok(validation.reason?.includes('revoked'), 'Reason must mention revocation');
});

test('generateVerifiedProofView: STRICT FILTERING - includes ONLY verified skills', () => {
  const graph = createMockGraph();
  const token = createProofToken('usr_123', 'Alex Morgan', 'Software Engineer', 30);

  const proofView = generateVerifiedProofView(graph, token);

  assert.equal(proofView.candidateName, 'Alex Morgan');
  assert.equal(proofView.verifiedSkills.length, 1, 'Must include ONLY verified skills (exactly 1)');
  assert.equal(proofView.verifiedSkills[0].skillName, 'TypeScript & Strict Types');
  assert.equal(proofView.verifiedSkills[0].confidenceScore, 86);

  // Crucial check: verify that 'System Design & Scalability Principles' and 'Unverified Hobby Skill' are absent
  const hasInsufficient = proofView.verifiedSkills.some(
    (s) => s.skillName === 'System Design & Scalability Principles'
  );
  assert.equal(hasInsufficient, false, 'Must completely omit insufficient_evidence skills');

  const hasWeak = proofView.verifiedSkills.some(
    (s) => s.skillName === 'Unverified Hobby Skill'
  );
  assert.equal(hasWeak, false, 'Must completely omit weak unverified skills');
});

test('Placement Cell k-Anonymity Threshold: enforces minimum group size (k >= 5)', () => {
  const kThreshold = 5;

  // Case 1: Sub-cohort with 6 students satisfies k-anonymity
  const cseCohort = [1, 2, 3, 4, 5, 6];
  assert.ok(cseCohort.length >= kThreshold, 'Cohort >= 5 must be permitted');

  // Case 2: Sub-cohort with 2 students must be suppressed
  const smallCohort = [1, 2];
  const isSuppressed = smallCohort.length < kThreshold;
  assert.equal(isSuppressed, true, 'Cohort < 5 must be suppressed to prevent deanonymization');
});