// Unit tests for GitHub Evidence Mapping and Confidence Elevation
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mapGitHubDataToGraph,
  SAMPLE_GITHUB_REPOS,
  SAMPLE_GITHUB_PRS,
} from './githubEvidence.ts';
import { seedSoftwareEngineerEvidenceGraph } from './mockAI.ts';

test('mapGitHubDataToGraph links repos and merged PRs into Evidence Graph', () => {
  const initialGraph = seedSoftwareEngineerEvidenceGraph();

  // Baseline check: System Design & Scalability Principles was insufficient_evidence (<35%)
  const sysDesignClaimBefore = Object.values(initialGraph.skillClaims).find(
    (c) => c.skillName === 'System Design & Scalability Principles'
  );
  assert.ok(sysDesignClaimBefore);
  assert.equal(sysDesignClaimBefore.confidenceStatus, 'insufficient_evidence');
  assert.equal(sysDesignClaimBefore.confidenceScore, null);

  // Sync GitHub Repos and Merged PRs
  const syncResult = mapGitHubDataToGraph(
    SAMPLE_GITHUB_REPOS,
    SAMPLE_GITHUB_PRS,
    initialGraph,
    '2024-05-01'
  );

  assert.ok(syncResult.mappedEvidenceCount > 0, 'Should map evidence nodes');
  assert.ok(syncResult.elevatedSkills.length > 0, 'Should elevate affected skills');

  // Verify that System Design now has verified GitHub PR & Repo evidence
  const sysDesignClaimAfter = Object.values(syncResult.updatedGraph.skillClaims).find(
    (c) => c.skillName === 'System Design & Scalability Principles'
  );
  assert.ok(sysDesignClaimAfter);
  assert.ok(sysDesignClaimAfter.linkedEvidenceIds.length > 0, 'Should have linked evidence');
  assert.equal(sysDesignClaimAfter.confidenceStatus, 'verified', 'Should be elevated from insufficient to verified');
  assert.ok(sysDesignClaimAfter.confidenceScore !== null && sysDesignClaimAfter.confidenceScore >= 70, 'Score should be high');
});

test('mapGitHubDataToGraph respects commit recency decay', () => {
  const initialGraph = seedSoftwareEngineerEvidenceGraph();

  // Test with very old repo pushed 3 years ago
  const oldRepo = [
    {
      name: 'legacy-project',
      full_name: 'user/legacy-project',
      description: 'Ancient codebase',
      html_url: 'https://github.com/user/legacy-project',
      language: 'TypeScript',
      topics: ['typescript'],
      stargazers_count: 5,
      pushed_at: '2021-01-01T00:00:00Z',
    },
  ];

  const result = mapGitHubDataToGraph(oldRepo, [], initialGraph, '2024-05-01');

  // Verified node should exist with old date
  const repoEvidenceId = 'ev-gh-repo-legacy-project-typescript';
  const node = result.updatedGraph.evidenceNodes[repoEvidenceId];
  assert.ok(node, 'Node should exist');
  assert.equal(node.timestamp, '2021-01-01');
});

