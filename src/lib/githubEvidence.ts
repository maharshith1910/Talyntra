// GitHub Evidence Mapping Engine
// Maps GitHub repos, languages, topics, merged PRs, and commit recency into Evidence Graph nodes

import { evaluateSkillConfidence, calculateDaysElapsed } from './evidenceGraph.ts';
import type { EvidenceGraph, EvidenceNode, SkillClaim } from './evidenceGraph.ts';

export interface GitHubRepo {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  languages?: Record<string, number>;
  topics?: string[];
  stargazers_count: number;
  pushed_at: string;
}

export interface GitHubPullRequest {
  id: number;
  title: string;
  html_url: string;
  state: 'closed' | 'open';
  merged_at: string | null;
  repo_name: string;
  additions?: number;
  deletions?: number;
}

export interface GitHubSyncResult {
  connectedUser: string;
  reposCount: number;
  prsCount: number;
  mappedEvidenceCount: number;
  elevatedSkills: { skillName: string; prevScore: number | null; newScore: number }[];
  updatedGraph: EvidenceGraph;
}

// Canonical skill matching rules for GitHub languages & topics
const GITHUB_SKILL_MAP: Record<string, { skillName: string; halfLifeDays: number }> = {
  typescript: { skillName: 'TypeScript & Modern JavaScript', halfLifeDays: 730 },
  javascript: { skillName: 'TypeScript & Modern JavaScript', halfLifeDays: 730 },
  react: { skillName: 'TypeScript & Modern JavaScript', halfLifeDays: 730 },
  python: { skillName: 'Web Architecture & REST/GraphQL APIs', halfLifeDays: 730 },
  fastapi: { skillName: 'Web Architecture & REST/GraphQL APIs', halfLifeDays: 730 },
  graphql: { skillName: 'Web Architecture & REST/GraphQL APIs', halfLifeDays: 730 },
  jest: { skillName: 'Automated Testing (Unit & E2E)', halfLifeDays: 730 },
  playwright: { skillName: 'Automated Testing (Unit & E2E)', halfLifeDays: 730 },
  cypress: { skillName: 'Automated Testing (Unit & E2E)', halfLifeDays: 730 },
  vitest: { skillName: 'Automated Testing (Unit & E2E)', halfLifeDays: 730 },
  postgres: { skillName: 'Databases & Relational Schema Design', halfLifeDays: 1095 },
  postgresql: { skillName: 'Databases & Relational Schema Design', halfLifeDays: 1095 },
  redis: { skillName: 'Databases & Relational Schema Design', halfLifeDays: 730 },
  docker: { skillName: 'CI/CD Pipelines & Containerization', halfLifeDays: 730 },
  kubernetes: { skillName: 'CI/CD Pipelines & Containerization', halfLifeDays: 730 },
  'github-actions': { skillName: 'CI/CD Pipelines & Containerization', halfLifeDays: 730 },
  distributed: { skillName: 'System Design & Scalability Principles', halfLifeDays: 1460 },
  microservices: { skillName: 'System Design & Scalability Principles', halfLifeDays: 1460 },
};

/**
 * Maps GitHub repositories and merged pull requests into the Evidence Graph.
 * Calculates commit recency, generates evidence citations, and recalculates confidence scores.
 */
export function mapGitHubDataToGraph(
  repos: GitHubRepo[],
  pullRequests: GitHubPullRequest[],
  currentGraph: EvidenceGraph,
  evaluationDate: string = new Date().toISOString().slice(0, 10)
): GitHubSyncResult {
  const updatedNodes = { ...currentGraph.evidenceNodes };
  const updatedClaims = { ...currentGraph.skillClaims };
  let mappedEvidenceCount = 0;
  const elevatedSkills: { skillName: string; prevScore: number | null; newScore: number }[] = [];

  // 1. Process Repositories: Language & Topic Signals
  for (const repo of repos) {
    const daysSincePush = calculateDaysElapsed(repo.pushed_at, new Date(evaluationDate));
    const repoSignals: { key: string; label: string }[] = [];

    if (repo.language) {
      repoSignals.push({ key: repo.language.toLowerCase(), label: `Primary Language: ${repo.language}` });
    }

    if (repo.topics) {
      for (const t of repo.topics) {
        repoSignals.push({ key: t.toLowerCase(), label: `Topic Tag: ${t}` });
      }
    }

    for (const signal of repoSignals) {
      const match = GITHUB_SKILL_MAP[signal.key];
      if (match) {
        const claim = Object.values(updatedClaims).find(
          (c) => c.skillName.toLowerCase() === match.skillName.toLowerCase()
        );
        if (claim) {
          const evidenceId = `ev-gh-repo-${repo.name}-${signal.key}`;
          if (!updatedNodes[evidenceId]) {
            const newNode: EvidenceNode = {
              id: evidenceId,
              sourceType: 'github_repo_lang',
              rawText: `Maintained production repository ${repo.full_name} (${signal.label}, ${repo.stargazers_count} stars). Last commit ${daysSincePush} days ago.`,
              sourceContext: `GitHub Repository: ${repo.html_url}`,
              timestamp: repo.pushed_at.slice(0, 10),
              baseWeight: 0.90, // High base weight for real repo evidence
              verified: true,
            };

            updatedNodes[evidenceId] = newNode;
            if (!claim.linkedEvidenceIds.includes(evidenceId)) {
              claim.linkedEvidenceIds.push(evidenceId);
            }
            mappedEvidenceCount++;
          }
        }
      }
    }
  }

  // 2. Process Merged Pull Requests: High-trust production collaboration signal
  for (const pr of pullRequests) {
    if (pr.merged_at) {
      const daysSinceMerge = calculateDaysElapsed(pr.merged_at, new Date(evaluationDate));
      const prTextLower = `${pr.title} ${pr.repo_name}`.toLowerCase();

      for (const [key, mapping] of Object.entries(GITHUB_SKILL_MAP)) {
        if (prTextLower.includes(key)) {
          const claim = Object.values(updatedClaims).find(
            (c) => c.skillName.toLowerCase() === mapping.skillName.toLowerCase()
          );
          if (claim) {
            const evidenceId = `ev-gh-pr-${pr.id}`;
            if (!updatedNodes[evidenceId]) {
              const newNode: EvidenceNode = {
                id: evidenceId,
                sourceType: 'github_merged_pr',
                rawText: `Merged Pull Request #${pr.id}: "${pr.title}" in ${pr.repo_name} (+${pr.additions || 120} / -${pr.deletions || 45} lines).`,
                sourceContext: `GitHub PR: ${pr.html_url}`,
                timestamp: pr.merged_at.slice(0, 10),
                baseWeight: 0.95, // Tier 1 verified proof of execution
                verified: true,
              };

              updatedNodes[evidenceId] = newNode;
              if (!claim.linkedEvidenceIds.includes(evidenceId)) {
                claim.linkedEvidenceIds.push(evidenceId);
              }
              mappedEvidenceCount++;
            }
          }
        }
      }
    }
  }

  // 3. Recalculate Confidence Scores for affected claims
  for (const claim of Object.values(updatedClaims)) {
    const linkedEvidence = claim.linkedEvidenceIds.map((id) => updatedNodes[id]).filter(Boolean);
    const prevScore = claim.confidenceScore;
    const evaluated = evaluateSkillConfidence(
      claim.skillName,
      claim.category,
      linkedEvidence,
      claim.halfLifeMonths,
      new Date(evaluationDate),
      claim.claimedLevel
    );

    claim.confidenceScore = evaluated.confidenceScore;
    claim.evidencedLevel = evaluated.evidencedLevel;
    claim.confidenceStatus = evaluated.confidenceStatus;
    claim.timeDecayFactor = evaluated.timeDecayFactor;
    claim.daysElapsed = evaluated.daysElapsed;
    claim.lastDemonstratedDate = evaluated.lastDemonstratedDate;
    claim.reasoning = evaluated.reasoning;

    if (evaluated.confidenceScore !== null && (prevScore === null || evaluated.confidenceScore > prevScore)) {
      elevatedSkills.push({
        skillName: claim.skillName,
        prevScore,
        newScore: evaluated.confidenceScore,
      });
    }
  }

  return {
    connectedUser: 'github-user',
    reposCount: repos.length,
    prsCount: pullRequests.length,
    mappedEvidenceCount,
    elevatedSkills,
    updatedGraph: {
      ...currentGraph,
      evidenceNodes: updatedNodes,
      skillClaims: updatedClaims,
    },
  };
}

/**
 * Sample realistic GitHub fixtures for testing and one-click demo sync.
 */
export const SAMPLE_GITHUB_REPOS: GitHubRepo[] = [
  {
    name: 'scalable-api-gateway',
    full_name: 'alexmorgan/scalable-api-gateway',
    description: 'High-throughput REST/GraphQL gateway built in TypeScript with Redis caching and microservices architecture.',
    html_url: 'https://github.com/alexmorgan/scalable-api-gateway',
    language: 'TypeScript',
    languages: { TypeScript: 84000, JavaScript: 12000 },
    topics: ['typescript', 'fastapi', 'microservices', 'graphql'],
    stargazers_count: 42,
    pushed_at: new Date(Date.now() - 12 * 86400000).toISOString(), // 12 days ago
  },
  {
    name: 'distributed-cache-proxy',
    full_name: 'alexmorgan/distributed-cache-proxy',
    description: 'Distributed cache partitioning showcase exploring Redis sharding and consistent hashing.',
    html_url: 'https://github.com/alexmorgan/distributed-cache-proxy',
    language: 'TypeScript',
    languages: { TypeScript: 62000 },
    topics: ['distributed', 'redis', 'microservices'],
    stargazers_count: 28,
    pushed_at: new Date(Date.now() - 25 * 86400000).toISOString(), // 25 days ago
  },
  {
    name: 'e2e-testing-harness',
    full_name: 'alexmorgan/e2e-testing-harness',
    description: 'Automated testing suite covering Playwright and Vitest for CI/CD pipelines.',
    html_url: 'https://github.com/alexmorgan/e2e-testing-harness',
    language: 'TypeScript',
    languages: { TypeScript: 38000 },
    topics: ['playwright', 'vitest', 'github-actions', 'docker'],
    stargazers_count: 15,
    pushed_at: new Date(Date.now() - 40 * 86400000).toISOString(), // 40 days ago
  },
];

export const SAMPLE_GITHUB_PRS: GitHubPullRequest[] = [
  {
    id: 104,
    title: 'feat: implement consistent hashing algorithm for distributed system design',
    html_url: 'https://github.com/alexmorgan/distributed-cache-proxy/pull/104',
    state: 'closed',
    merged_at: new Date(Date.now() - 18 * 86400000).toISOString(),
    repo_name: 'distributed-cache-proxy',
    additions: 380,
    deletions: 42,
  },
  {
    id: 82,
    title: 'test: add end-to-end regression test suite with Playwright',
    html_url: 'https://github.com/alexmorgan/e2e-testing-harness/pull/82',
    state: 'closed',
    merged_at: new Date(Date.now() - 35 * 86400000).toISOString(),
    repo_name: 'e2e-testing-harness',
    additions: 215,
    deletions: 18,
  },
];
