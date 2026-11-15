import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProofToken, generateVerifiedProofView } from '../src/lib/proofToken.ts';
import { seedSoftwareEngineerEvidenceGraph } from '../src/lib/mockAI.ts';
import { evaluateCounterfactualROI } from '../src/lib/learningROI.ts';
import {
  PANEL_PERSONAS,
  selectTargetClaimForPersona,
  generateInterrogationQuestion,
  getCompanyPlacementModes,
} from '../src/lib/interrogationPanel.ts';

test('E2E Smoke: Candidate Main Flow Integration Pipeline', () => {
  // Step 1: Initialize Candidate Evidence Graph (Simulation of parsed CV)
  const graph = seedSoftwareEngineerEvidenceGraph();
  assert.ok(graph, 'Evidence Graph must initialize');
  assert.ok(Object.keys(graph.skillClaims).length > 0, 'Must contain skill claims');

  // Step 2: Phase 4 Learning-ROI Counterfactual Ranking
  const roiRanking = evaluateCounterfactualROI(graph);
  assert.ok(roiRanking.length > 0, 'Counterfactual engine must produce ranked skills');
  assert.ok(roiRanking[0].roiScore > 0, 'Top skill must have positive ROI score');

  // Step 3: Phase 5 Interrogation Panel targeting
  const barRaiserQ = generateInterrogationQuestion(graph, 'bar_raiser', 'jpmc');
  assert.ok(barRaiserQ.question.length > 30, 'Bar Raiser must generate pressure-test question');
  assert.ok(barRaiserQ.targetedSkill.skillName, 'Must target specific graph claim');

  // Step 4: Placement Modes verification
  const companyModes = getCompanyPlacementModes();
  assert.equal(companyModes.length, 3, 'Must load Standard, JPMC, and Google placement modes');

  // Step 5: Phase 6 Cryptographic Public Proof Generation & Strict Verified Filtering
  const token = createProofToken('usr_alex', 'Alex Morgan', 'Software Engineer', 30);
  const proofView = generateVerifiedProofView(graph, token);

  assert.equal(proofView.candidateName, 'Alex Morgan');
  assert.ok(proofView.verifiedSkills.length > 0, 'Must list verified skills');

  // Verify Rule 5 Integrity: Zero unverified claims in public proof transcript
  for (const skill of proofView.verifiedSkills) {
    assert.ok(skill.confidenceScore >= 70, `All public skills must be verified (was ${skill.confidenceScore}%)`);
    assert.ok(skill.citations.length > 0, 'All public skills must have verified citations');
  }

  // Step 6: Verify Revocation
  token.isRevoked = true;
  assert.throws(
    () => generateVerifiedProofView(graph, token),
    /revoked/,
    'Revoked token must block public view generation'
  );
});
