// Talyntra Evidence Engine & Heuristics Simulator
// Backed by the Evidence Graph (Skill Claim -> Linked Evidence -> Confidence with Time Decay)
// and Learning-ROI Gap Ranking (Roles Unlocked / Effort Hours)

import {
  EvidenceGraph,
  EvidenceNode,
  SkillClaim,
  LearningROI,
  SkillCategory,
  evaluateSkillConfidence,
  calculateLearningROI,
  rankMissingSkillsByROI,
} from './evidenceGraph';

export type { SkillCategory };

export type Skill = {
  name: string;
  category: SkillCategory;
  claimedLevel: number;
  evidencedLevel: number | null;
  proficiency: number; // 0 - 100 (derived from confidence score, or 0 if insufficient)
  confidenceStatus: 'verified' | 'moderate' | 'weak' | 'insufficient_evidence';
  evidenceCount: number;
  timeDecayFactor: number; // 0.0 - 1.0 retention
  daysElapsed: number;
  lastDemonstratedDate: string | null;
  reasoning: string;
  claimId: string;
  linkedEvidence: EvidenceNode[];
};

export type MissingSkill = {
  name: string;
  category: SkillCategory;
  importance: 'Critical' | 'Important' | 'Nice-to-have';
  why: string;
  difficulty: number; // 1 to 5
  rolesUnlockedCount: number;
  estimatedEffortHours: number;
  roiScore: number;
  roiLabel: string;
};

export type SkillAnalysis = {
  detectedSkills: Skill[];
  missingSkills: MissingSkill[];
  overallScore: number;
  extractedKeywords: string[];
  roleMatchTitle: string;
  evidenceGraph: EvidenceGraph;
};

export type QuestionnaireAnswer = {
  questionId: number;
  question: string;
  answer: string | string[];
};

export type ValidationResult = {
  overallMatch: number; // 0 - 100
  technicalScore: number;
  softScore: number;
  experienceScore: number;
  marketDemandScore: number;
  summary: string;
  strengths: string[];
  concerns: string[];
  benchmarkJob: {
    title: string;
    company: string;
    location: string;
    salaryRange: string;
    requirements: string[];
  };
  evidenceBacked: boolean;
};

export type RoadmapAction = {
  id: string;
  text: string;
  completed: boolean;
  verifiesSkill?: string; // Which skill this milestone auto-verifies
};

export type RoadmapPhase = {
  phase: number;
  title: string;
  timeline: string;
  goal: string;
  actions: RoadmapAction[];
};

export type Resource = {
  title: string;
  type: 'Course' | 'Book' | 'Community' | 'Certification';
  provider: string;
  url: string;
  tag: string;
};

export type Message = {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: string;
};

export type Profile = {
  fullName: string;
  targetRole: string;
  experience: string;
  location?: string;
  linkedIn?: string;
  fileName?: string;
};

function normalizeRole(role: string): 'frontend' | 'backend' | 'fullstack' | 'data' | 'general' {
  const r = role.toLowerCase();
  if (r.includes('front') || r.includes('react') || r.includes('ui') || r.includes('web developer')) return 'frontend';
  if (r.includes('back') || r.includes('node') || r.includes('python') || r.includes('java') || r.includes('golang') || r.includes('api')) return 'backend';
  if (r.includes('data') || r.includes('ml') || r.includes('ai') || r.includes('machine') || r.includes('analyst')) return 'data';
  if (r.includes('full') || r.includes('fullstack') || r.includes('software engineer')) return 'fullstack';
  return 'general';
}

/**
 * Builds an authentic Evidence Graph from the candidate's profile context.
 * In production this will be constructed via FastAPI + Supabase parser workers.
 */
function buildMockEvidenceGraph(roleType: string, profile: Profile): EvidenceGraph {
  const evidenceNodes: Record<string, EvidenceNode> = {};
  const skillClaims: Record<string, SkillClaim> = {};
  const roleName = profile.targetRole || 'Software Professional';

  // Helper to register node and return id
  const addNode = (
    id: string,
    sourceType: EvidenceNode['sourceType'],
    rawText: string,
    sourceContext: string,
    timestamp: string,
    baseWeight: number,
    verified: boolean
  ): string => {
    evidenceNodes[id] = { id, sourceType, rawText, sourceContext, timestamp, baseWeight, verified };
    return id;
  };

  // Helper to create and evaluate a skill claim
  const addClaim = (
    id: string,
    skillName: string,
    category: SkillCategory,
    evidenceIds: string[],
    halfLifeMonths: number,
    claimedLevel: number = 85
  ) => {
    const linked = evidenceIds.map((eid) => evidenceNodes[eid]).filter(Boolean);
    const evalRes = evaluateSkillConfidence(skillName, category, linked, halfLifeMonths, undefined, claimedLevel);

    skillClaims[id] = {
      id,
      skillName,
      category,
      claimedLevel: evalRes.claimedLevel,
      evidencedLevel: evalRes.evidencedLevel,
      linkedEvidenceIds: evidenceIds,
      halfLifeMonths,
      daysElapsed: evalRes.daysElapsed,
      confidenceScore: evalRes.confidenceScore,
      confidenceStatus: evalRes.confidenceStatus,
      timeDecayFactor: evalRes.timeDecayFactor,
      lastDemonstratedDate: evalRes.lastDemonstratedDate,
      reasoning: evalRes.reasoning,
    };
  };

  if (roleType === 'frontend') {
    const e1 = addNode('ev-fe-1', 'resume_bullet', 'Architected design system in React 18 & TypeScript with 45 reusable components across 3 client web apps.', 'Senior Frontend Engineer (2024)', '2024-03', 0.95, true);
    const e2 = addNode('ev-fe-2', 'project_artifact', 'Cut initial bundle load time from 4.1s to 1.6s by implementing route-level code splitting and dynamic imports.', 'Production E-Commerce Portal', '2024-05', 0.9, true);
    const e3 = addNode('ev-fe-3', 'resume_bullet', 'Migrated 60k lines of legacy JavaScript to strict TypeScript with 100% type safety and zero any escapes.', 'FinTech Web Platform', '2023-10', 0.9, true);
    const e4 = addNode('ev-fe-4', 'resume_bullet', 'Built responsive, cross-browser fluid layout using modern CSS Grid, Flexbox, and CSS custom property theming.', 'Design System Lead', '2023-12', 0.85, true);
    const e5 = addNode('ev-fe-5', 'resume_bullet', 'Normalized client-side application state and cached asynchronous server responses using React Query and Zustand.', 'SaaS Dashboard Project', '2024-01', 0.85, true);
    const e6 = addNode('ev-fe-6', 'resume_bullet', 'Led bi-weekly architecture RFC reviews and mentored 3 junior frontend engineers on clean component decomposition.', 'Engineering Team Lead', '2024-06', 0.85, true);
    const e7 = addNode('ev-fe-7', 'resume_bullet', 'Facilitated sprint retrospectives and coordinated interface contracts with backend API engineers.', 'Agile Team', '2023-08', 0.8, true);

    // Thin evidence nodes to trigger Rule 5 ("insufficient evidence")
    const eWeakGql = addNode('ev-weak-gql', 'resume_bullet', 'Listed GraphQL in skills footer with no corresponding project deliverables, schema ownership, or resolvers.', 'Skills Section Keyword', '2021-02', 0.3, false);
    const eWeakDk = addNode('ev-weak-dk', 'resume_bullet', 'Built local Docker test container once for coursework demonstration.', 'University Lab', '2020-05', 0.25, false);

    addClaim('claim-react', 'React & React Ecosystem', 'Technical', [e1, e2], 24);
    addClaim('claim-ts', 'JavaScript (ES6+) & TypeScript', 'Technical', [e3], 24);
    addClaim('claim-css', 'CSS3 & Modern Styling (Grid/Flex)', 'Technical', [e4], 24);
    addClaim('claim-state', 'Component Architecture & State', 'Technical', [e5], 24);
    addClaim('claim-mentorship', 'Code Review & Technical Mentorship', 'Soft', [e6], 48);
    addClaim('claim-comm', 'Cross-Functional Team Collaboration', 'Soft', [e7], 48);
    // Thin evidence claims -> Insufficient Evidence
    addClaim('claim-graphql', 'GraphQL & Apollo Federation', 'Technical', [eWeakGql], 24);
    addClaim('claim-docker', 'Docker Containerization & Orchestration', 'Technical', [eWeakDk], 24);
  } else if (roleType === 'backend') {
    const e1 = addNode('ev-be-1', 'resume_bullet', 'Engineered distributed Go/Node.js RESTful microservices handling 12,000 requests/sec with p99 latency < 65ms.', 'Backend Software Engineer', '2024-02', 0.95, true);
    const e2 = addNode('ev-be-2', 'project_artifact', 'Designed PostgreSQL relational schemas with B-tree indexes, partitioning, and read-replica connection pooling.', 'FinTech Core Ledger', '2024-04', 0.9, true);
    const e3 = addNode('ev-be-3', 'resume_bullet', 'Implemented asynchronous job processing pipeline using Redis and RabbitMQ to process payment reconciliation.', 'Payment Service', '2023-09', 0.9, true);
    const e4 = addNode('ev-be-4', 'resume_bullet', 'Authored Dockerfiles and GitHub Actions workflow for automated testing and container deployment.', 'Cloud Infra', '2023-11', 0.85, true);
    const e5 = addNode('ev-be-5', 'resume_bullet', 'Presented technical design documents (RFCs) to principal architects for real-time notification engine.', 'Architecture Forum', '2024-05', 0.85, true);

    const eWeakK8s = addNode('ev-weak-k8s', 'resume_bullet', 'Mentioned Kubernetes in bullet point without cluster configuration, Helm charts, or ingress rules.', 'Course Project', '2021-03', 0.3, false);

    addClaim('claim-microservices', 'Microservices & High-Throughput APIs', 'Technical', [e1], 24);
    addClaim('claim-db', 'Relational Databases & SQL Optimization', 'Technical', [e2], 24);
    addClaim('claim-queues', 'Distributed Caching & Message Queues', 'Technical', [e3], 24);
    addClaim('claim-ci', 'Docker & CI/CD Pipelines', 'Technical', [e4], 24);
    addClaim('claim-arch', 'Technical RFCs & System Design', 'Soft', [e5], 48);
    addClaim('claim-k8s', 'Kubernetes & Service Mesh', 'Technical', [eWeakK8s], 24);
  } else {
    // Single Role Slice: Software Engineer / General
    const e1 = addNode('ev-se-1', 'resume_bullet', 'Migrated 80k lines of legacy JavaScript to strict TypeScript with zero any escapes, reducing runtime type errors by 44%.', 'Senior Software Engineer @ FinTech (2024)', '2024-03', 0.95, true);
    const e2 = addNode('ev-se-2', 'resume_bullet', 'Engineered distributed REST microservices handling 15,000 req/sec with p99 latency < 50ms using Node.js and Redis caching.', 'Backend Engineer @ CloudScale (2024)', '2024-04', 0.95, true);
    const e3 = addNode('ev-se-3', 'resume_bullet', 'Architected Vitest and Playwright test suites covering 88% of critical checkout flows, preventing production regressions.', 'Full Stack Engineer @ E-Commerce (2024)', '2024-01', 0.90, true);
    const e4 = addNode('ev-se-4', 'project_artifact', 'Normalized PostgreSQL relational schemas and implemented composite B-Tree indexes, speeding up query execution by 3.2x.', 'Software Engineer (2023)', '2023-09', 0.85, true);
    const e5 = addNode('ev-se-5', 'resume_bullet', 'Authored GitHub Actions workflows and multi-stage Docker builds to automate testing and preview deployments.', 'DevOps Contributor (2023)', '2023-11', 0.80, true);

    // Thin evidence node for System Design (triggers Rule 5)
    const eWeakSys = addNode('ev-weak-sys', 'resume_bullet', 'Mentioned system scalability in resume summary without concrete horizontal partitioning or distributed caching metrics.', 'Resume Summary Keyword', '2021-03', 0.28, false);

    addClaim('claim-ts', 'TypeScript & Modern JavaScript', 'Technical', [e1], 24, 90);
    addClaim('claim-api', 'Web Architecture & REST/GraphQL APIs', 'Technical', [e2], 24, 85);
    addClaim('claim-test', 'Automated Testing (Unit & E2E)', 'Technical', [e3], 24, 80);
    addClaim('claim-db', 'Databases & Relational Schema Design', 'Technical', [e4], 48, 75);
    addClaim('claim-cicd', 'CI/CD Pipelines & Containerization', 'Domain', [e5], 24, 70);
    addClaim('claim-sysdesign', 'System Design & Scalability Principles', 'Technical', [eWeakSys], 48, 80);
  }

  // Calculate Missing Skills with quantitative Learning-ROI
  const missingROIList: LearningROI[] = [];

  if (roleType === 'frontend') {
    missingROIList.push(
      calculateLearningROI(
        'Automated Testing (Vitest & Playwright)',
        'Technical',
        'Critical',
        28, // 28 matching benchmark roles unlocked
        40, // 40 hours effort
        'Enterprise engineering teams require automated regression test suites before pushing code to production.',
        3
      ),
      calculateLearningROI(
        'Web Performance & Core Web Vitals (LCP/CLS)',
        'Technical',
        'Critical',
        24,
        35,
        'Senior frontend roles test bundle tree-shaking, memory leaks, and lighthouse vitals optimization extensively in technical interviews.',
        4
      ),
      calculateLearningROI(
        'Next.js 14+ & React Server Components',
        'Technical',
        'Important',
        21,
        30,
        'High market demand for full-stack edge rendering, server actions, and streaming SSR.',
        3
      ),
      calculateLearningROI(
        'Web Accessibility (WCAG 2.1 AA Compliance)',
        'Domain',
        'Important',
        14,
        25,
        'Mandatory compliance standard for public sector and enterprise software procurement.',
        2
      )
    );
  } else if (roleType === 'backend') {
    missingROIList.push(
      calculateLearningROI(
        'System Design & Distributed Consensus (Raft/Paxos)',
        'Technical',
        'Critical',
        32,
        45,
        'Core evaluation criterion for senior backend compensation bands and system reliability.',
        5
      ),
      calculateLearningROI(
        'Observability & Distributed Tracing (OpenTelemetry)',
        'Technical',
        'Critical',
        26,
        30,
        'Essential for root-cause latency analysis across microservice boundaries.',
        3
      ),
      calculateLearningROI(
        'Kafka / Event-Driven Architecture at Scale',
        'Technical',
        'Important',
        22,
        35,
        'Standard pattern for decoupled high-concurrency event ingestion.',
        4
      ),
      calculateLearningROI(
        'Kubernetes Cluster Orchestration & Helm',
        'Domain',
        'Important',
        18,
        40,
        'Expected for managing cloud-native containerized workloads in AWS/GCP.',
        4
      )
    );
  } else {
    missingROIList.push(
      calculateLearningROI(
        'System Design & Horizontal Scalability',
        'Technical',
        'Critical',
        30,
        45,
        'Key requirement for senior level interviews, covering load balancing, caching, and database partitioning.',
        5
      ),
      calculateLearningROI(
        'Automated CI/CD & Infrastructure as Code (Terraform)',
        'Domain',
        'Critical',
        24,
        35,
        'Enables autonomous ship cycles and reproducible cloud environments.',
        4
      ),
      calculateLearningROI(
        'Security Best Practices (OWASP Top 10 / Auth Protocols)',
        'Domain',
        'Important',
        19,
        25,
        'Preventing vulnerabilities, enforcing JWT/OAuth2 flows, and maintaining privacy compliance.',
        3
      ),
      calculateLearningROI(
        'Production Observability & Sentry Error Tracking',
        'Technical',
        'Important',
        16,
        20,
        'Quickly diagnosing production anomalies before users encounter service degradation.',
        3
      )
    );
  }

  // Sort missing skills by Learning-ROI descending
  const sortedMissingROI = rankMissingSkillsByROI(missingROIList);

  // Compute overall match score from evaluated claims
  const verifiedClaims = Object.values(skillClaims).filter((c) => c.confidenceScore !== null);
  const overallMatchScore =
    verifiedClaims.length > 0
      ? Math.round(
          verifiedClaims.reduce((sum, c) => sum + (c.confidenceScore || 0), 0) / verifiedClaims.length
        )
      : 75;

  return {
    evidenceNodes,
    skillClaims,
    missingSkillsWithROI: sortedMissingROI,
    overallMatchScore,
    overallReasoning: `Calibrated from ${Object.keys(evidenceNodes).length} evidence nodes across ${Object.keys(skillClaims).length} skill claims for ${roleName}.`,
  };
}

export async function analyzeCV(profile: Profile): Promise<SkillAnalysis> {
  // Simulate parsing & Evidence Graph construction
  await new Promise((r) => setTimeout(r, 1200));

  const roleType = normalizeRole(profile.targetRole || '');
  const graph = buildMockEvidenceGraph(roleType, profile);

  // Transform graph claims to UI Skill objects
  const detectedSkills: Skill[] = Object.values(graph.skillClaims).map((claim) => {
    const linked = claim.linkedEvidenceIds.map((id) => graph.evidenceNodes[id]).filter(Boolean);
    return {
      name: claim.skillName,
      category: claim.category,
      claimedLevel: claim.claimedLevel,
      evidencedLevel: claim.evidencedLevel,
      proficiency: claim.confidenceScore ?? 0,
      confidenceStatus: claim.confidenceStatus,
      evidenceCount: linked.length,
      timeDecayFactor: claim.timeDecayFactor,
      daysElapsed: claim.daysElapsed,
      lastDemonstratedDate: claim.lastDemonstratedDate,
      reasoning: claim.reasoning,
      claimId: claim.id,
      linkedEvidence: linked,
    };
  });

  // Transform missing ROI items
  const missingSkills: MissingSkill[] = graph.missingSkillsWithROI.map((roi) => ({
    name: roi.skillName,
    category: roi.category,
    importance: roi.importance,
    why: roi.why,
    difficulty: roi.difficulty,
    rolesUnlockedCount: roi.rolesUnlockedCount,
    estimatedEffortHours: roi.estimatedEffortHours,
    roiScore: roi.roiScore,
    roiLabel: roi.roiLabel,
  }));

  const roleMatchTitle =
    roleType === 'frontend'
      ? 'Senior Frontend Engineer / UI Specialist'
      : roleType === 'backend'
      ? 'Senior Backend & Distributed Systems Specialist'
      : roleType === 'data'
      ? 'Data & Applied Machine Learning Specialist'
      : profile.targetRole || 'Full Stack Software Professional';

  return {
    roleMatchTitle,
    overallScore: graph.overallMatchScore ?? 75,
    extractedKeywords: ['TypeScript', 'Architecture', 'Testing', 'CI/CD', 'Git', 'Agile'],
    detectedSkills,
    missingSkills,
    evidenceGraph: graph,
  };
}

export async function generateValidation(
  profile: Profile,
  answers: QuestionnaireAnswer[],
  evidenceGraph?: EvidenceGraph
): Promise<ValidationResult> {
  await new Promise((r) => setTimeout(r, 1000));

  const role = profile.targetRole || 'Software Professional';
  const roleType = normalizeRole(role);

  // If evidenceGraph is present, derive scores dynamically from the graph claims!
  let techScore = 80;
  let softScore = 85;
  let overall = 82;

  if (evidenceGraph && Object.keys(evidenceGraph.skillClaims).length > 0) {
    const claims = Object.values(evidenceGraph.skillClaims);
    const techClaims = claims.filter((c) => c.category === 'Technical' && c.confidenceScore !== null);
    const softClaims = claims.filter((c) => c.category === 'Soft' && c.confidenceScore !== null);

    if (techClaims.length > 0) {
      techScore = Math.round(techClaims.reduce((a, b) => a + (b.confidenceScore || 0), 0) / techClaims.length);
    }
    if (softClaims.length > 0) {
      softScore = Math.round(softClaims.reduce((a, b) => a + (b.confidenceScore || 0), 0) / softClaims.length);
    }
    overall = evidenceGraph.overallMatchScore ?? Math.round((techScore + softScore) / 2);
  }

  const hoursAns = answers.find((a) => a.questionId === 4)?.answer;
  const growthAreas = (answers.find((a) => a.questionId === 2)?.answer as string[]) || [];

  return {
    overallMatch: overall,
    technicalScore: techScore,
    softScore: softScore,
    experienceScore: 78,
    marketDemandScore: 92,
    evidenceBacked: true,
    summary: `Validated from ${evidenceGraph ? Object.keys(evidenceGraph.evidenceNodes).length : 'multiple'} linked evidence citations and time-decay analysis. Your background in core implementation and collaborative delivery demonstrates verified competence for "${role}". Closing high-ROI missing competencies will elevate you into top-band compensation tiers.`,
    strengths: [
      'Documented production impact verified with quantified metrics',
      'Strong collaborative problem solving supported by cross-functional citations',
      `Targeted growth focus in: ${growthAreas.slice(0, 3).join(', ') || 'System Design, Automated Testing'}`,
      `Commitment to deliberate practice (${hoursAns || 'consistent weekly study'})`,
    ],
    concerns: [
      'Identified skill claims with insufficient evidence (e.g. keywords without verified project deliverables)',
      'Time-decay degradation on older tools requiring fresh verifiable artifacts',
      'Gaps in high-concurrency architecture and automated end-to-end testing',
    ],
    benchmarkJob: {
      title: `Senior ${role}`,
      company: 'TechCorp Innovations (Tier-1 Tech)',
      location: profile.location || 'Remote / Hybrid',
      salaryRange: '$135,000 - $175,000 USD / year',
      requirements: [
        '3+ years building scalable software products in fast-paced teams',
        'Proven mastery of modern software architecture and REST/GraphQL APIs',
        'Experience with CI/CD, unit/integration testing, and production monitoring',
        'Strong architectural ownership and ability to write technical proposals',
      ],
    },
  };
}

export async function generateRoadmap(
  profile: Profile,
  _validation: ValidationResult
): Promise<RoadmapPhase[]> {
  await new Promise((r) => setTimeout(r, 800));

  const role = profile.targetRole || 'Software Professional';

  return [
    {
      phase: 1,
      title: 'Foundation & Core Alignment',
      timeline: 'Month 1 - 2',
      goal: 'Close critical technical blind spots, solidify testing fundamentals, and produce verified artifacts.',
      actions: [
        {
          id: 'p1-1',
          text: 'Audit Core Web Vitals / API latency concepts and benchmark performance metrics',
          completed: false,
          verifiesSkill: 'Web Performance & Core Web Vitals (LCP/CLS)',
        },
        {
          id: 'p1-2',
          text: 'Set up automated unit testing suite (Vitest / Playwright) with 85%+ code coverage',
          completed: false,
          verifiesSkill: 'Automated Testing (Vitest & Playwright)',
        },
        {
          id: 'p1-3',
          text: 'Refactor state management using normalized schemas and strict TypeScript',
          completed: false,
          verifiesSkill: 'JavaScript (ES6+) & TypeScript',
        },
        {
          id: 'p1-4',
          text: 'Complete comprehensive deep-dive course on modern distributed architecture',
          completed: false,
          verifiesSkill: 'System Design & Distributed Consensus (Raft/Paxos)',
        },
      ],
    },
    {
      phase: 2,
      title: 'Real-World Production Build',
      timeline: 'Month 3 - 4',
      goal: 'Build an end-to-end, high-performance reference application with enterprise-grade monitoring and CI/CD.',
      actions: [
        {
          id: 'p2-1',
          text: `Architect a full-stack ${role} showcase app with Docker, GitHub Actions & Cloud hosting`,
          completed: false,
          verifiesSkill: 'Docker Containerization & Orchestration',
        },
        {
          id: 'p2-2',
          text: 'Integrate Sentry or Datadog for error tracking and distributed tracing',
          completed: false,
          verifiesSkill: 'Observability & Distributed Tracing (OpenTelemetry)',
        },
        {
          id: 'p2-3',
          text: 'Implement authentication (OAuth2 / JWT) and secure against OWASP vulnerabilities',
          completed: false,
          verifiesSkill: 'Security Best Practices & OWASP Protocols',
        },
        {
          id: 'p2-4',
          text: 'Benchmark and document a 30%+ latency or bundle reduction with measurable metrics',
          completed: false,
          verifiesSkill: 'Web Performance & Core Web Vitals (LCP/CLS)',
        },
      ],
    },
    {
      phase: 3,
      title: 'System Design & Social Proof',
      timeline: 'Month 5 - 6',
      goal: 'Master high-level architecture interviews, write technical blogs, and contribute to open source.',
      actions: [
        { id: 'p3-1', text: 'Practice 10 high-frequency System Design problems (URL Shortener, Feed, Notification Engine)', completed: false, verifiesSkill: 'System Design & Horizontal Scalability' },
        { id: 'p3-2', text: 'Publish 2 technical breakdown articles detailing your architecture decisions', completed: false },
        { id: 'p3-3', text: 'Submit 2 merged PRs to notable open-source repositories in your target ecosystem', completed: false },
        { id: 'p3-4', text: 'Participate in 3 peer mock interviews focusing on behavioral STAR methodology', completed: false },
      ],
    },
    {
      phase: 4,
      title: 'Market Launch & Offer Negotiation',
      timeline: 'Month 7+',
      goal: 'Launch tailored job outreach, execute flawless technical screens, and negotiate multi-offer scenarios.',
      actions: [
        { id: 'p4-1', text: 'Update LinkedIn profile, GitHub pinned repositories, and CV with quantified metrics', completed: false },
        { id: 'p4-2', text: 'Conduct targeted warm outreach to 25 engineering managers and technical leads', completed: false },
        { id: 'p4-3', text: 'Execute live coding rounds emphasizing clean modular code, edge cases, and testing', completed: false },
        { id: 'p4-4', text: 'Benchmark market compensation and leverage competing offers for senior title placement', completed: false },
      ],
    },
  ];
}

export const CURATED_RESOURCES: Resource[] = [
  {
    title: 'System Design Primer (Interactive Edition)',
    type: 'Course',
    provider: 'GitHub Open Source / Donne Martin',
    url: 'https://github.com/donnemartin/system-design-primer',
    tag: 'Architecture',
  },
  {
    title: 'Designing Data-Intensive Applications',
    type: 'Book',
    provider: "O'Reilly / Martin Kleppmann",
    url: 'https://dataintensive.net/',
    tag: 'Distributed Systems',
  },
  {
    title: 'Frontend Masters: Enterprise Architecture & Performance',
    type: 'Course',
    provider: 'Frontend Masters',
    url: 'https://frontendmasters.com',
    tag: 'Deep Dive',
  },
  {
    title: 'Testing JavaScript with Kent C. Dodds',
    type: 'Course',
    provider: 'TestingJavaScript.com',
    url: 'https://testingjavascript.com',
    tag: 'Testing & QA',
  },
  {
    title: 'Pragmatic Engineer Community & Career Newsletter',
    type: 'Community',
    provider: 'Gergely Orosz',
    url: 'https://blog.pragmaticengineer.com/',
    tag: 'Career & Industry',
  },
  {
    title: 'AWS Certified Solutions Architect Associate',
    type: 'Certification',
    provider: 'Amazon Web Services',
    url: 'https://aws.amazon.com/certification/',
    tag: 'Cloud & Infra',
  },
];

export async function askTalyntra(
  prompt: string,
  profile: Profile,
  context?: { validation?: ValidationResult; skills?: SkillAnalysis }
): Promise<string> {
  await new Promise((r) => setTimeout(r, 650));

  const role = profile.targetRole || 'your target role';
  const p = prompt.toLowerCase();

  if (p.includes('gap') || p.includes('missing') || p.includes('roi')) {
    return `In our Evidence Graph for **${role}**, skills are ranked by **Learning-ROI (roles unlocked per hour)**. Closing **Automated Testing** and **Web Performance** offers the highest leverage (unlocking ~7.0 roles for every 10 hours invested). Would you like an execution roadmap for these?`;
  }

  if (p.includes('evidence') || p.includes('insufficient') || p.includes('decay')) {
    return `Talyntra calculates skill confidence using **time-decay math** and verifiable proof. Where a skill is merely listed as a keyword with no project citations or where evidence is over 2 years old, the engine flags **"insufficient evidence"** rather than guessing. Completing roadmap milestones feeds verified proof back into your graph!`;
  }

  if (p.includes('salary') || p.includes('compensation') || p.includes('money')) {
    return `For **${role}** in current market tiers, competitive offers range between **$135,000 – $175,000+** base (plus equity/bonuses). Profiles with verified production evidence and testing rigor command top-of-band offers.`;
  }

  if (p.includes('resume') || p.includes('cv') || p.includes('bullet')) {
    return `To maximize Evidence Graph confidence, use quantified citations: *"Accomplished [X] as measured by [Y], by doing [Z]"*.\nInstead of "Built React dashboard", write: *"Engineered React executive analytics suite used by 12k daily users, cutting render times by 34% via memoization and virtualized tables."*`;
  }

  return `Regarding "${prompt}" for **${role}**: The Evidence Graph prioritizes closing your highest-ROI competency gaps through demonstrable artifacts. Which skill claim or milestone would you like to review?`;
}
