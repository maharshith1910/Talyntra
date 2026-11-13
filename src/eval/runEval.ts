// Talyntra Skill Extraction Evaluation Engine
// Evaluates Precision and Recall across archetypal test resumes

import * as fs from 'node:fs';
import * as path from 'node:path';

interface GroundTruthSkill {
  name: string;
  category: string;
}

interface LabeledResume {
  id: string;
  candidate: string;
  targetRole: string;
  text: string;
  groundTruthSkills: GroundTruthSkill[];
}

interface EvalDataset {
  description: string;
  archetypes: string[];
  resumes: LabeledResume[];
}

interface CategoryScore {
  tp: number;
  fp: number;
  fn: number;
}

// Canonical definitions matching extraction logic
const CANONICAL_SKILL_PATTERNS: Record<string, { category: string; keywords: string[] }> = {
  'TypeScript & Modern JavaScript': { category: 'Technical', keywords: ['typescript', 'javascript', 'es6', 'react', 'next.js', 'vue'] },
  'Web Architecture & REST/GraphQL APIs': { category: 'Architecture', keywords: ['rest', 'graphql', 'api', 'microservice', 'endpoints', 'fastapi'] },
  'Automated Testing (Unit & E2E)': { category: 'Testing', keywords: ['test', 'jest', 'cypress', 'playwright', 'vitest', 'pytest'] },
  'Databases & Relational Schema Design': { category: 'Database', keywords: ['postgres', 'postgresql', 'sql', 'redis', 'database', 'schema'] },
  'CI/CD Pipelines & Containerization': { category: 'Cloud/DevOps', keywords: ['docker', 'ci/cd', 'github actions', 'kubernetes', 'aws', 'terraform'] },
  'System Design & Scalability Principles': { category: 'Architecture', keywords: ['scalability', 'system design', 'distributed', 'partitioning', 'load balancer'] },
};

function extractSkillsFromText(text: string): { name: string; category: string }[] {
  const textLower = text.toLowerCase();
  const extracted: { name: string; category: string }[] = [];

  for (const [skillName, meta] of Object.entries(CANONICAL_SKILL_PATTERNS)) {
    if (meta.keywords.some((kw) => textLower.includes(kw))) {
      extracted.push({ name: skillName, category: meta.category });
    }
  }

  return extracted;
}

export function runEvaluation() {
  const datasetPath = path.resolve('eval/dataset.json');
  if (!fs.existsSync(datasetPath)) {
    console.error(`Dataset file not found at ${datasetPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(datasetPath, 'utf-8');
  const dataset: EvalDataset = JSON.parse(raw);

  const categoryScores: Record<string, CategoryScore> = {
    Technical: { tp: 0, fp: 0, fn: 0 },
    Architecture: { tp: 0, fp: 0, fn: 0 },
    Testing: { tp: 0, fp: 0, fn: 0 },
    Database: { tp: 0, fp: 0, fn: 0 },
    'Cloud/DevOps': { tp: 0, fp: 0, fn: 0 },
  };

  let totalTP = 0;
  let totalFP = 0;
  let totalFN = 0;

  console.log('========================================================================');
  console.log('🎯 TALYNTRA RESUME SKILL EXTRACTION EVALUATION HARNESS');
  console.log(`Evaluating ${dataset.resumes.length} labeled resumes across archetypes: ${dataset.archetypes.join(', ')}`);
  console.log('========================================================================\n');

  for (const resume of dataset.resumes) {
    const extracted = extractSkillsFromText(resume.text);
    const groundTruth = resume.groundTruthSkills;

    const gtNames = new Set(groundTruth.map((s) => s.name));
    const extractedNames = new Set(extracted.map((s) => s.name));

    // True Positives & False Positives
    for (const ext of extracted) {
      const cat = ext.category;
      if (!categoryScores[cat]) categoryScores[cat] = { tp: 0, fp: 0, fn: 0 };

      if (gtNames.has(ext.name)) {
        categoryScores[cat].tp++;
        totalTP++;
      } else {
        categoryScores[cat].fp++;
        totalFP++;
      }
    }

    // False Negatives
    for (const gt of groundTruth) {
      const cat = gt.category;
      if (!categoryScores[cat]) categoryScores[cat] = { tp: 0, fp: 0, fn: 0 };

      if (!extractedNames.has(gt.name)) {
        categoryScores[cat].fn++;
        totalFN++;
      }
    }
  }

  // Print results table
  console.log('| Skill Category       | True Pos (TP) | False Pos (FP) | False Neg (FN) | Precision | Recall   | F1 Score |');
  console.log('|:---------------------|:--------------|:---------------|:---------------|:----------|:---------|:---------|');

  for (const [cat, score] of Object.entries(categoryScores)) {
    const prec = score.tp + score.fp > 0 ? (score.tp / (score.tp + score.fp)) * 100 : 100;
    const rec = score.tp + score.fn > 0 ? (score.tp / (score.tp + score.fn)) * 100 : 100;
    const f1 = prec + rec > 0 ? (2 * (prec * rec)) / (prec + rec) : 0;

    console.log(
      `| ${cat.padEnd(20)} | ${String(score.tp).padStart(13)} | ${String(score.fp).padStart(14)} | ${String(score.fn).padStart(14)} | ${prec.toFixed(1).padStart(8)}% | ${rec.toFixed(1).padStart(7)}% | ${f1.toFixed(1).padStart(7)}% |`
    );
  }

  const overallPrecision = (totalTP / (totalTP + totalFP)) * 100;
  const overallRecall = (totalTP / (totalTP + totalFN)) * 100;
  const overallF1 = (2 * (overallPrecision * overallRecall)) / (overallPrecision + overallRecall);

  console.log('|:---------------------|:--------------|:---------------|:---------------|:----------|:---------|:---------|');
  console.log(
    `| OVERALL AGGREGATE    | ${String(totalTP).padStart(13)} | ${String(totalFP).padStart(14)} | ${String(totalFN).padStart(14)} | ${overallPrecision.toFixed(1).padStart(8)}% | ${overallRecall.toFixed(1).padStart(7)}% | ${overallF1.toFixed(1).padStart(7)}% |`
  );
  console.log('========================================================================\n');

  console.log(`Validation Target Thresholds: Precision >= 80.0%, Recall >= 75.0%`);
  console.log(`Measured Performance:        Precision = ${overallPrecision.toFixed(1)}%, Recall = ${overallRecall.toFixed(1)}%`);

  if (overallPrecision >= 80.0 && overallRecall >= 75.0) {
    console.log('\n✅ EVALUATION PASSED: Precision and Recall metrics meet all production criteria!\n');
  } else {
    console.error('\n❌ EVALUATION FAILED: Accuracy dropped below target thresholds.');
    process.exit(1);
  }
}

// Execute evaluation if executed as entry point
runEvaluation();

