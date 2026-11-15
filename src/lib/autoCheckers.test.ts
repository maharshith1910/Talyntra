// Unit tests for Auto-Checkers Engine and Micro-Assessments
// Covers valid passes, failure states, and abuse cases (forks, fake repos, trivial READMEs, placeholder URLs)

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkRepoOwnership,
  checkTestsAndCI,
  checkReadmeQuality,
  checkDeployedUrl,
  runArtifactAutoCheck,
} from './autoCheckers.ts';
import {
  getAdaptiveQuestionsForSkill,
  evaluateAssessmentAnswers,
} from './microAssessment.ts';

test('checkRepoOwnership validates original ownership and catches abuse', () => {
  // Valid original repository
  const valid = checkRepoOwnership('https://github.com/alexmorgan/distributed-cache', 'alexmorgan', false);
  assert.equal(valid.passed, true);
  assert.equal(valid.score, 100);

  // Abuse Case 1: Owner mismatch (unowned repo)
  const mismatch = checkRepoOwnership('https://github.com/torvalds/linux', 'alexmorgan', false);
  assert.equal(mismatch.passed, false);
  assert.match(mismatch.reason, /Abuse Flag.*owned by "torvalds"/i);

  // Abuse Case 2: Detached fork
  const fork = checkRepoOwnership('https://github.com/alexmorgan/redis', 'alexmorgan', true);
  assert.equal(fork.passed, false);
  assert.match(fork.reason, /Abuse Flag.*detached fork/i);
});

test('checkTestsAndCI requires automated test suites and passing GitHub Actions', () => {
  // Valid: test files + workflow
  const validFiles = ['src/index.ts', 'src/cache.test.ts', '.github/workflows/ci.yml'];
  const valid = checkTestsAndCI(validFiles, true);
  assert.equal(valid.passed, true);
  assert.equal(valid.score, 100);

  // Abuse Case 3: No test files
  const noTests = checkTestsAndCI(['src/index.ts', '.github/workflows/ci.yml'], true);
  assert.equal(noTests.passed, false);
  assert.match(noTests.reason, /No automated test files detected/i);

  // Failing CI run
  const failingCi = checkTestsAndCI(validFiles, false);
  assert.equal(failingCi.passed, false);
  assert.match(failingCi.reason, /latest run failed/i);
});

test('checkReadmeQuality enforces depth and architecture section', () => {
  const goodReadme = `
    # Distributed Cache Proxy
    This project implements an in-memory caching tier designed for horizontal partitioning and high throughput.
    
    ## Architecture & System Design
    We utilize consistent hashing across 8 virtual nodes to balance key distribution and minimize re-sharding overhead.
    Data is stored using a multi-level LRU eviction strategy. The proxy sits behind an NGINX load balancer.
    
    ## Engineering Trade-offs
    We prioritized write throughput over strong consistency, implementing an eventual consistency model with a 500ms replication window.
    
    ## Setup and Testing
    Run npm install and npm test to execute the 45 unit and integration tests.
  `.repeat(4);

  const valid = checkReadmeQuality(goodReadme, 150);
  assert.equal(valid.passed, true);
  assert.equal(valid.score, 100);

  // Abuse Case 4: Trivial 10-word README
  const trivial = checkReadmeQuality('Simple repo. Install and run.', 150);
  assert.equal(trivial.passed, false);
  assert.match(trivial.reason, /too brief/i);

  // Long text without Architecture / Trade-offs section
  const noArch = 'This is a project description without any technical or system details. '.repeat(40);
  const missingSection = checkReadmeQuality(noArch, 150);
  assert.equal(missingSection.passed, false);
  assert.match(missingSection.reason, /missing an "Architecture/i);
});

test('checkDeployedUrl enforces secure HTTPS and blocks placeholder domains', () => {
  // Valid deployed URL
  const valid = checkDeployedUrl('https://distributed-cache-alex.vercel.app');
  assert.equal(valid.passed, true);

  // Abuse Case 5: Placeholder domains
  const placeholder = checkDeployedUrl('https://google.com');
  assert.equal(placeholder.passed, false);
  assert.match(placeholder.reason, /Abuse Flag.*placeholder/i);

  // Missing or non-HTTP URL
  const empty = checkDeployedUrl('');
  assert.equal(empty.passed, false);
});

test('runArtifactAutoCheck runs end-to-end evaluation pipeline', () => {
  const fullSubmission = {
    repoUrl: 'https://github.com/alexmorgan/distributed-cache',
    ownerUsername: 'alexmorgan',
    isFork: false,
    fileList: ['src/index.ts', 'src/cache.test.ts', '.github/workflows/ci.yml'],
    readmeContent: 'Architecture and System Design trade-offs '.repeat(50),
    deployedUrl: 'https://cache-proxy.railway.app',
    latestCiPassed: true,
    commitCount: 6,
  };

  const report = runArtifactAutoCheck(fullSubmission);
  assert.equal(report.passed, true);
  assert.equal(report.abuseFlags.length, 0);
  assert.ok(report.overallScore >= 90);
});

test('evaluateAssessmentAnswers scores answers and generates evidence node on pass', () => {
  const questions = getAdaptiveQuestionsForSkill('System Design & Scalability Principles');
  assert.equal(questions.length, 3);

  // Passing answers with technical depth and keywords
  const passingAnswers = [
    {
      questionId: questions[0].id,
      answerText: 'Hash-based sharding on user_id ensures uniform key distribution across all 16 shards, completely avoiding write hot-spot bottlenecks that occur with timestamps.',
      timeSpentSeconds: 22,
    },
    {
      questionId: questions[1].id,
      answerText: 'This is a cache stampede or thundering herd problem. We mitigate it using distributed mutex locks and probabilistic early expiration algorithms to recompute before TTL expires.',
      timeSpentSeconds: 26,
    },
    {
      questionId: questions[2].id,
      answerText: 'To guarantee exactly-once processing with Kafka, we use idempotency keys and the transactional outbox pattern to avoid duplicate charges on payment gateways.',
      timeSpentSeconds: 25,
    },
  ];

  const result = evaluateAssessmentAnswers('System Design & Scalability Principles', passingAnswers, questions, '2024-05-01');
  assert.equal(result.passed, true);
  assert.ok(result.overallScore >= 75);
  assert.ok(result.generatedEvidenceNode, 'Should generate an evidence node');
  assert.equal(result.generatedEvidenceNode.sourceType, 'verified_task');
});
