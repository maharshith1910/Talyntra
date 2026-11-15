// Talyntra Phase 4: Counterfactual Learning-ROI Engine
// Computes marginal role unlock delta and ROI: ROI = Delta Roles / Estimated Effort Hours
// Evaluates candidate Evidence Graph against job postings, weighting evidenced skills above unevidenced claims.

import type { EvidenceGraph } from './evidenceGraph.ts';

export interface BenchmarkJobPosting {
  externalId: string;
  source: string;
  title: string;
  company: string;
  location: string;
  targetRole: string;
  requiredSkills: string[];
  preferredSkills: string[];
  rawText: string;
  contentHash: string;
}

export interface CounterfactualSkill {
  skillName: string;
  category: string;
  importance: 'Critical' | 'Important' | 'Nice-to-have';
  difficulty: number;
  baselineRolesCount: number;
  counterfactualRolesCount: number;
  deltaRolesCount: number;
  estimatedEffortHours: number;
  roiScore: number;
  roiLabel: string;
  assumptionNote: string;
  unlockedJobsSample: { title: string; company: string }[];
  why: string;
}

export const SKILL_EFFORT_BENCHMARKS: Record<
  string,
  {
    hours: number;
    difficulty: number;
    category: string;
    importance: 'Critical' | 'Important' | 'Nice-to-have';
    why: string;
    assumption: string;
  }
> = {
  'System Design & Scalability Principles': {
    hours: 35,
    difficulty: 4,
    category: 'Architecture',
    importance: 'Critical',
    why: 'Crucial requirement for Senior & Staff engineering roles; unlocks distributed systems and microservice architectures.',
    assumption: 'Assumes ~35 hours of focused system design exercises, capacity planning, and failure-domain trade-offs.',
  },
  'Automated Testing (Unit & E2E)': {
    hours: 20,
    difficulty: 2,
    category: 'Testing',
    importance: 'Critical',
    why: 'Non-negotiable quality gate in all modern CI/CD software pipelines.',
    assumption: 'Assumes ~20 hours authoring mock unit suites and Playwright/Cypress end-to-end integration flows.',
  },
  'Distributed Caching & Redis': {
    hours: 25,
    difficulty: 3,
    category: 'Architecture',
    importance: 'Important',
    why: 'Required across high-throughput systems to prevent database exhaustion and hit sub-50ms p99 response times.',
    assumption: 'Assumes ~25 hours implementing cache-aside, write-through patterns, and TTL invalidation semantics.',
  },
  'CI/CD Pipelines & Containerization': {
    hours: 25,
    difficulty: 3,
    category: 'Cloud/DevOps',
    importance: 'Important',
    why: 'Universal standard for automated container packaging and continuous deployment workflows.',
    assumption: 'Assumes ~25 hours authoring multi-stage Dockerfiles and GitHub Actions workflow matrices.',
  },
  'Databases & Relational Schema Design': {
    hours: 30,
    difficulty: 3,
    category: 'Database',
    importance: 'Critical',
    why: 'Core foundation for transactional ACID guarantees and query performance optimization.',
    assumption: 'Assumes ~30 hours mastering relational 3NF normalization, B-Tree indexing, and transaction isolation.',
  },
  'Web Architecture & REST/GraphQL APIs': {
    hours: 25,
    difficulty: 2,
    category: 'Technical',
    importance: 'Critical',
    why: 'Baseline contract for distributed microservices and front-end integration.',
    assumption: 'Assumes ~25 hours engineering idempotent REST/GraphQL services with auth and rate limiting.',
  },
  'TypeScript & Strict Types': {
    hours: 20,
    difficulty: 2,
    category: 'Technical',
    importance: 'Critical',
    why: 'Industry standard for compile-time safety across enterprise codebases.',
    assumption: 'Assumes ~20 hours mastering generics, utility types, and strict type migration.',
  },
};

/**
 * 10 Deterministic Benchmark Tech Postings for Reproducible Testing & Client Evaluation
 */
export const DETERMINISTIC_JOBS_CORPUS: BenchmarkJobPosting[] = [
  {
    externalId: 'stripe-backend-001',
    source: 'official_feed',
    title: 'Senior Backend Infrastructure Engineer',
    company: 'Stripe',
    location: 'Remote / San Francisco',
    targetRole: 'Software Engineer',
    requiredSkills: [
      'System Design & Scalability Principles',
      'Web Architecture & REST/GraphQL APIs',
      'Databases & Relational Schema Design',
      'Automated Testing (Unit & E2E)',
    ],
    preferredSkills: ['Distributed Caching & Redis', 'CI/CD Pipelines & Containerization'],
    rawText: 'Architecting global payment rails handling billions in volume.',
    contentHash: 'hash-stripe-001',
  },
  {
    externalId: 'cloudflare-systems-002',
    source: 'official_feed',
    title: 'Staff Edge Platform Engineer',
    company: 'Cloudflare',
    location: 'Remote / Austin',
    targetRole: 'Software Engineer',
    requiredSkills: [
      'System Design & Scalability Principles',
      'Distributed Caching & Redis',
      'CI/CD Pipelines & Containerization',
    ],
    preferredSkills: ['Automated Testing (Unit & E2E)', 'TypeScript & Strict Types'],
    rawText: 'Building next-generation edge compute with extreme low-latency caching.',
    contentHash: 'hash-cloudflare-002',
  },
  {
    externalId: 'vercel-fullstack-003',
    source: 'official_feed',
    title: 'Full Stack Platform Engineer',
    company: 'Vercel',
    location: 'Remote',
    targetRole: 'Software Engineer',
    requiredSkills: [
      'TypeScript & Strict Types',
      'Web Architecture & REST/GraphQL APIs',
      'Automated Testing (Unit & E2E)',
    ],
    preferredSkills: ['CI/CD Pipelines & Containerization', 'Distributed Caching & Redis'],
    rawText: 'Building developer experience platform and serverless edge functions.',
    contentHash: 'hash-vercel-003',
  },
  {
    externalId: 'datadog-devops-004',
    source: 'official_feed',
    title: 'Cloud Platform & SRE Engineer',
    company: 'Datadog',
    location: 'Remote / New York',
    targetRole: 'Software Engineer',
    requiredSkills: [
      'CI/CD Pipelines & Containerization',
      'Automated Testing (Unit & E2E)',
      'System Design & Scalability Principles',
    ],
    preferredSkills: ['Databases & Relational Schema Design'],
    rawText: 'Scaling continuous deployment pipelines and container clusters.',
    contentHash: 'hash-datadog-004',
  },
  {
    externalId: 'snowflake-data-005',
    source: 'official_feed',
    title: 'Backend Database Systems Engineer',
    company: 'Snowflake',
    location: 'San Mateo / Remote',
    targetRole: 'Software Engineer',
    requiredSkills: [
      'Databases & Relational Schema Design',
      'System Design & Scalability Principles',
      'Automated Testing (Unit & E2E)',
    ],
    preferredSkills: ['Distributed Caching & Redis'],
    rawText: 'Designing high-performance analytical query engines.',
    contentHash: 'hash-snowflake-005',
  },
  {
    externalId: 'figma-frontend-006',
    source: 'official_feed',
    title: 'Frontend Systems Engineer',
    company: 'Figma',
    location: 'Remote / San Francisco',
    targetRole: 'Software Engineer',
    requiredSkills: [
      'TypeScript & Strict Types',
      'Web Architecture & REST/GraphQL APIs',
      'Automated Testing (Unit & E2E)',
    ],
    preferredSkills: ['System Design & Scalability Principles'],
    rawText: 'Multiplayer collaborative canvas engine and client-side state.',
    contentHash: 'hash-figma-006',
  },
  {
    externalId: 'uber-microservices-007',
    source: 'official_feed',
    title: 'Senior Distributed Services Engineer',
    company: 'Uber',
    location: 'Remote / Seattle',
    targetRole: 'Software Engineer',
    requiredSkills: [
      'System Design & Scalability Principles',
      'Distributed Caching & Redis',
      'Web Architecture & REST/GraphQL APIs',
      'Databases & Relational Schema Design',
    ],
    preferredSkills: ['CI/CD Pipelines & Containerization'],
    rawText: 'Real-time dispatch microservices and distributed caching.',
    contentHash: 'hash-uber-007',
  },
  {
    externalId: 'airbnb-testing-008',
    source: 'official_feed',
    title: 'Core Reliability & Automation Engineer',
    company: 'Airbnb',
    location: 'Remote',
    targetRole: 'Software Engineer',
    requiredSkills: [
      'Automated Testing (Unit & E2E)',
      'CI/CD Pipelines & Containerization',
      'TypeScript & Strict Types',
    ],
    preferredSkills: ['Web Architecture & REST/GraphQL APIs'],
    rawText: 'Automated test suites and CI workflow governance.',
    contentHash: 'hash-airbnb-008',
  },
  {
    externalId: 'netflix-streaming-009',
    source: 'official_feed',
    title: 'Distributed Cache & Edge Services Engineer',
    company: 'Netflix',
    location: 'Los Gatos / Remote',
    targetRole: 'Software Engineer',
    requiredSkills: [
      'Distributed Caching & Redis',
      'System Design & Scalability Principles',
      'CI/CD Pipelines & Containerization',
    ],
    preferredSkills: ['Automated Testing (Unit & E2E)'],
    rawText: 'Edge caching layers delivering 4K video metadata at global scale.',
    contentHash: 'hash-netflix-009',
  },
  {
    externalId: 'jpmc-fintech-010',
    source: 'official_feed',
    title: 'Software Engineer - Enterprise Trading Systems',
    company: 'JPMorgan Chase',
    location: 'Remote / New York',
    targetRole: 'Software Engineer',
    requiredSkills: [
      'Databases & Relational Schema Design',
      'Automated Testing (Unit & E2E)',
      'Web Architecture & REST/GraphQL APIs',
      'System Design & Scalability Principles',
    ],
    preferredSkills: ['Distributed Caching & Redis'],
    rawText: 'High-volume transactional order processing with strict ACID integrity.',
    contentHash: 'hash-jpmc-010',
  },
];

/**
 * Computes Match Score M(G, j) between candidate Evidence Graph and a Job Posting.
 * Weighting: Evidenced skills (1.0) strictly outweigh merely claimed skills (0.40).
 */
export function scoreJobMatch(
  graph: EvidenceGraph,
  posting: BenchmarkJobPosting
): number {
  const claims = graph.skillClaims || {};
  let totalWeight = 0;
  let weightedScore = 0;

  // 1. Required skills (Weight = 1.0)
  for (const req of posting.requiredSkills) {
    const weight = 1.0;
    totalWeight += weight;

    // Find claim (case-insensitive)
    const claim = Object.values(claims).find(
      (c) => c.skillName.toLowerCase() === req.toLowerCase()
    );

    if (claim) {
      if (claim.confidenceScore !== null && claim.confidenceScore > 0) {
        // Evidenced / verified in graph
        weightedScore += weight * (claim.confidenceScore / 100);
      } else {
        // Claimed without evidence (Rule 5: discounted by 60%)
        weightedScore += weight * (0.4 * ((claim.claimedLevel || 50) / 100));
      }
    } else {
      weightedScore += 0;
    }
  }

  // 2. Preferred skills (Weight = 0.40)
  for (const pref of posting.preferredSkills) {
    const weight = 0.4;
    totalWeight += weight;

    const claim = Object.values(claims).find(
      (c) => c.skillName.toLowerCase() === pref.toLowerCase()
    );

    if (claim) {
      if (claim.confidenceScore !== null && claim.confidenceScore > 0) {
        weightedScore += weight * (claim.confidenceScore / 100);
      } else {
        weightedScore += weight * (0.4 * ((claim.claimedLevel || 50) / 100));
      }
    } else {
      weightedScore += 0;
    }
  }

  return totalWeight > 0 ? weightedScore / totalWeight : 0;
}

/**
 * Evaluates the counterfactual impact of adding each missing skill to the Evidence Graph.
 * Marginal Delta = N_cf(X) - N_base
 * Learning-ROI = Delta Roles / Estimated Effort Hours
 */
export function evaluateCounterfactualROI(
  graph: EvidenceGraph,
  corpus: BenchmarkJobPosting[] = DETERMINISTIC_JOBS_CORPUS,
  threshold: number = 0.70
): CounterfactualSkill[] {
  // Step 1: Calculate baseline matched roles
  const baselineMatches = corpus.filter(
    (job) => scoreJobMatch(graph, job) >= threshold
  );
  const nBase = baselineMatches.length;

  // Candidate skills to evaluate counterfactually
  const candidateSkills = [
    'System Design & Scalability Principles',
    'Automated Testing (Unit & E2E)',
    'Distributed Caching & Redis',
    'CI/CD Pipelines & Containerization',
  ];

  const results: CounterfactualSkill[] = [];

  for (const skill of candidateSkills) {
    // Construct Virtual Counterfactual Graph G' = G U {skill}
    const cfGraph: EvidenceGraph = JSON.parse(JSON.stringify(graph));
    if (!cfGraph.skillClaims) cfGraph.skillClaims = {};

    // Inject skill as verified (85% confidence score)
    cfGraph.skillClaims[`claim_cf_${skill}`] = {
      id: `claim_cf_${skill}`,
      skillName: skill,
      category: 'Technical',
      claimedLevel: 85,
      evidencedLevel: 85,
      confidenceScore: 85,
      confidenceStatus: 'verified',
      linkedEvidenceIds: ['ev_cf_virtual'],
      halfLifeMonths: 24,
      daysElapsed: 0,
      timeDecayFactor: 1.0,
      lastDemonstratedDate: new Date().toISOString().slice(0, 10),
      reasoning: 'Virtually injected counterfactual node for ROI simulation.',
    };

    // Calculate counterfactual matches
    const cfMatches: BenchmarkJobPosting[] = [];
    const newlyUnlocked: { title: string; company: string }[] = [];

    for (const job of corpus) {
      const score = scoreJobMatch(cfGraph, job);
      if (score >= threshold) {
        cfMatches.push(job);
        if (!baselineMatches.some((b) => b.externalId === job.externalId)) {
          newlyUnlocked.push({ title: job.title, company: job.company });
        }
      }
    }

    const nCf = cfMatches.length;
    const delta = Math.max(0, nCf - nBase);
    const meta = SKILL_EFFORT_BENCHMARKS[skill] || {
      hours: 30,
      difficulty: 3,
      category: 'Technical',
      importance: 'Important' as const,
      why: 'Increases versatility across target software roles.',
      assumption: 'Assumes ~30h deliberate practice for an engineer with CS background.',
    };

    const roiScore = Number((delta / Math.max(meta.hours, 1)).toFixed(3));
    const roiLabel = `${(roiScore * 10).toFixed(1)} roles / 10 hrs`;

    results.push({
      skillName: skill,
      category: meta.category,
      importance: meta.importance,
      difficulty: meta.difficulty,
      baselineRolesCount: nBase,
      counterfactualRolesCount: nCf,
      deltaRolesCount: delta,
      estimatedEffortHours: meta.hours,
      roiScore,
      roiLabel,
      assumptionNote: meta.assumption,
      unlockedJobsSample: newlyUnlocked.slice(0, 4),
      why: meta.why,
    });
  }

  // Sort descending by Learning-ROI score
  return results.sort((a, b) => b.roiScore - a.roiScore);
}
