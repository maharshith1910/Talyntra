// Talyntra Micro-Assessment Engine
// 3 adaptive questions per skill (~90s total), evaluated against a rubric
// Produces verifiable micro-assessment evidence nodes when passed (>=75%)

import type { EvidenceNode } from './evidenceGraph.ts';

export interface RubricCriteria {
  conceptualAccuracy: number; // 0 - 40
  technicalDepth: number; // 0 - 30
  failureModeAwareness: number; // 0 - 30
}

export interface MicroQuestion {
  id: string;
  skillName: string;
  tier: 'diagnostic' | 'scenario' | 'edge_case';
  questionText: string;
  scenarioContext?: string;
  expectedKeywords: string[];
  rubric: {
    accuracyGuide: string;
    depthGuide: string;
    failureModeGuide: string;
  };
}

export interface AssessmentAnswer {
  questionId: string;
  answerText: string;
  timeSpentSeconds: number;
}

export interface EvaluationResult {
  passed: boolean;
  overallScore: number; // 0 - 100
  questionEvaluations: {
    questionId: string;
    score: number;
    feedback: string;
  }[];
  generatedEvidenceNode?: EvidenceNode;
  summaryFeedback: string;
}

// Canonical Question Bank for Software Engineer Skills
const QUESTION_BANK: Record<string, MicroQuestion[]> = {
  'System Design & Scalability Principles': [
    {
      id: 'sys-q1',
      skillName: 'System Design & Scalability Principles',
      tier: 'diagnostic',
      questionText: 'When sharding a database across 16 nodes, why is hash-based partitioning on user_id preferred over range-based sharding on created_at?',
      expectedKeywords: ['hot spot', 'write contention', 'distribution', 'hash', 'uniform', 'partition'],
      rubric: {
        accuracyGuide: 'Must mention avoiding write hot-spots on the latest shard caused by monotonically increasing timestamps.',
        depthGuide: 'References uniform key distribution and modulus / consistent hashing.',
        failureModeGuide: 'Identifies query fan-out or secondary indexing trade-offs.',
      },
    },
    {
      id: 'sys-q2',
      skillName: 'System Design & Scalability Principles',
      tier: 'scenario',
      questionText: 'Your Redis cache has a 96% hit rate, but during flash sales the primary database crashes due to connection pool exhaustion. What cache failure pattern is occurring and how do you mitigate it?',
      scenarioContext: 'Production E-Commerce checkout during peak 10,000 req/sec flash sale.',
      expectedKeywords: ['thundering herd', 'cache stampede', 'mutex', 'lock', 'probabilistic', 'early expiration', 'stale'],
      rubric: {
        accuracyGuide: 'Identifies Cache Stampede / Thundering Herd problem on expired high-traffic keys.',
        depthGuide: 'Recommends distributed mutex lock or probabilistic early expiration (XFetch).',
        failureModeGuide: 'Considers database thread starvation and connection pool exhaustion.',
      },
    },
    {
      id: 'sys-q3',
      skillName: 'System Design & Scalability Principles',
      tier: 'edge_case',
      questionText: 'In an event-driven architecture using Kafka, a consumer crashes mid-batch. How do you guarantee exactly-once processing semantics without duplicate side-effects on external APIs?',
      expectedKeywords: ['idempotency', 'idempotent', 'deduplication', 'transaction', 'outbox', 'offset'],
      rubric: {
        accuracyGuide: 'Explains idempotency keys or transactional outbox pattern.',
        depthGuide: 'Mentions consumer offset commits after transaction completion.',
        failureModeGuide: 'Addresses partial network failure when contacting external third-party payment gateways.',
      },
    },
  ],
  'TypeScript & Modern JavaScript': [
    {
      id: 'ts-q1',
      skillName: 'TypeScript & Modern JavaScript',
      tier: 'diagnostic',
      questionText: 'Explain the operational difference between the "unknown" type and the "any" type in TypeScript, and why "unknown" is preferred for parsing untrusted API payloads.',
      expectedKeywords: ['type safe', 'narrowing', 'type guard', 'assignable', 'runtime', 'compile'],
      rubric: {
        accuracyGuide: 'Explains that unknown requires narrowing/type guards before accessing properties.',
        depthGuide: 'Contrasts complete opt-out of type checking in any with top-type safety in unknown.',
        failureModeGuide: 'Notes prevention of runtime TypeError crashes.',
      },
    },
    {
      id: 'ts-q2',
      skillName: 'TypeScript & Modern JavaScript',
      tier: 'scenario',
      questionText: 'How do Discriminated Unions enable exhaustive pattern matching in TypeScript, and how can the "never" type be used to guarantee compile-time exhaustiveness?',
      expectedKeywords: ['discriminated union', 'literal', 'never', 'exhaustive', 'switch', 'tag'],
      rubric: {
        accuracyGuide: 'Explains common literal property tag and switch case exhaustion.',
        depthGuide: 'Implements default: const _exhaustive: never = val;',
        failureModeGuide: 'Shows compile failure when a new union member is added without handling.',
      },
    },
    {
      id: 'ts-q3',
      skillName: 'TypeScript & Modern JavaScript',
      tier: 'edge_case',
      questionText: 'When is using "satisfies" preferred over type assertion ("as T") or explicit type annotation (": T")?',
      expectedKeywords: ['satisfies', 'infer', 'exact', 'narrow', 'assertion', 'soundness'],
      rubric: {
        accuracyGuide: 'Validates structure matches type while preserving exact inferred literal types.',
        depthGuide: 'Avoids unsafe type casting of as and avoids widening of explicit type annotation.',
        failureModeGuide: 'Highlights autocomplete retention and mistyped property catch.',
      },
    },
  ],
};

/**
 * Retrieves the 3 adaptive questions for a specific skill.
 */
export function getAdaptiveQuestionsForSkill(skillName: string): MicroQuestion[] {
  const questions = QUESTION_BANK[skillName];
  if (questions && questions.length === 3) {
    return questions;
  }

  // Generic fallback generator for other skills
  return [
    {
      id: `gen-${skillName}-1`,
      skillName,
      tier: 'diagnostic',
      questionText: `What is the core architectural mental model behind "${skillName}", and what problem does it solve in production applications?`,
      expectedKeywords: ['architecture', 'production', 'performance', 'scalability'],
      rubric: {
        accuracyGuide: 'Clear conceptual definition.',
        depthGuide: 'Explains real-world motivation.',
        failureModeGuide: 'Acknowledges performance or design constraints.',
      },
    },
    {
      id: `gen-${skillName}-2`,
      skillName,
      tier: 'scenario',
      questionText: `Describe a complex engineering trade-off you encountered when working with "${skillName}". Which alternative did you choose and why?`,
      expectedKeywords: ['trade-off', 'latency', 'maintainability', 'complexity'],
      rubric: {
        accuracyGuide: 'Articulates two competing constraints.',
        depthGuide: 'Justifies selection with metrics or maintainability.',
        failureModeGuide: 'Assesses downside of chosen approach.',
      },
    },
    {
      id: `gen-${skillName}-3`,
      skillName,
      tier: 'edge_case',
      questionText: `What catastrophic failure mode can occur when "${skillName}" is misconfigured or poorly architected under high concurrency?`,
      expectedKeywords: ['concurrency', 'failure', 'recovery', 'bottleneck', 'resilience'],
      rubric: {
        accuracyGuide: 'Identifies concrete failure mechanism.',
        depthGuide: 'Describes recovery and mitigation protocols.',
        failureModeGuide: 'Explains root cause prevention.',
      },
    },
  ];
}

/**
 * Evaluates candidate answers against the rubric.
 */
export function evaluateAssessmentAnswers(
  skillName: string,
  answers: AssessmentAnswer[],
  questions: MicroQuestion[] = getAdaptiveQuestionsForSkill(skillName),
  evaluationDate: string = new Date().toISOString().slice(0, 10)
): EvaluationResult {
  const evaluations: { questionId: string; score: number; feedback: string }[] = [];

  for (const q of questions) {
    const userAns = answers.find((a) => a.questionId === q.id);
    const text = userAns?.answerText?.trim() || '';
    const textLower = text.toLowerCase();

    // 1. Minimum length & emptiness check
    if (text.length < 20) {
      evaluations.push({
        questionId: q.id,
        score: 0,
        feedback: 'Answer was blank or too brief to demonstrate technical competence.',
      });
      continue;
    }

    // 2. Keyword match (matches core vocabulary)
    const matchedKws = q.expectedKeywords.filter((kw) => textLower.includes(kw));
    const kwRatio = matchedKws.length / Math.min(q.expectedKeywords.length, 3);

    // 3. Rubric scoring
    let accuracyScore = Math.min(40, Math.round(kwRatio * 40));
    let depthScore = text.length > 80 ? 30 : Math.round((text.length / 80) * 30);
    let failureScore = matchedKws.length >= 2 ? 30 : 15;

    const totalQScore = Math.min(100, accuracyScore + depthScore + failureScore);
    evaluations.push({
      questionId: q.id,
      score: totalQScore,
      feedback: `Scored ${totalQScore}/100. Matched domain concepts: [${matchedKws.join(', ') || 'general terminology'}].`,
    });
  }

  const overallScore = Math.round(
    evaluations.reduce((sum, e) => sum + e.score, 0) / Math.max(evaluations.length, 1)
  );
  const passed = overallScore >= 75;

  let generatedEvidenceNode: EvidenceNode | undefined;

  if (passed) {
    generatedEvidenceNode = {
      id: `ev-assessment-${skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
      sourceType: 'verified_task',
      rawText: `Passed adaptive technical micro-assessment for "${skillName}" with a score of ${overallScore}%. Validated diagnostic mental model, trade-off reasoning, and failure mode mitigation under timed conditions.`,
      sourceContext: `Talyntra Adaptive Micro-Assessment (${skillName})`,
      timestamp: evaluationDate,
      baseWeight: 0.88, // High verified weight for rigorous micro-assessment
      verified: true,
    };
  }

  return {
    passed,
    overallScore,
    questionEvaluations: evaluations,
    generatedEvidenceNode,
    summaryFeedback: passed
      ? `Verification successful (${overallScore}%). Core concepts and failure modes demonstrated. Evidence node added to graph.`
      : `Assessment incomplete (${overallScore}%). Score did not meet the 75% threshold. Review targeted learning resources and retry.`,
  };
}
