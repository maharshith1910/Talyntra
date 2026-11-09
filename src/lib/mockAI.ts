// Talyntra Mock AI Backend & Skill Validator Engine

export type SkillCategory = 'Technical' | 'Soft' | 'Domain';

export type Skill = {
  name: string;
  category: SkillCategory;
  proficiency: number; // 0 - 100
};

export type MissingSkill = {
  name: string;
  category: SkillCategory;
  importance: 'Critical' | 'Important' | 'Nice-to-have';
  why: string;
  difficulty: number; // 1 to 5
};

export type SkillAnalysis = {
  detectedSkills: Skill[];
  missingSkills: MissingSkill[];
  overallScore: number;
  extractedKeywords: string[];
  roleMatchTitle: string;
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
};

export type RoadmapAction = {
  id: string;
  text: string;
  completed: boolean;
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

// --- Role classification & heuristics ---
function normalizeRole(role: string): 'frontend' | 'backend' | 'fullstack' | 'data' | 'design' | 'product' | 'general' {
  const r = role.toLowerCase();
  if (r.includes('front') || r.includes('react') || r.includes('ui') || r.includes('web developer')) return 'frontend';
  if (r.includes('back') || r.includes('node') || r.includes('python') || r.includes('java') || r.includes('golang') || r.includes('api')) return 'backend';
  if (r.includes('full') || r.includes('fullstack') || r.includes('software engineer')) return 'fullstack';
  if (r.includes('data') || r.includes('ml') || r.includes('ai') || r.includes('machine') || r.includes('analyst')) return 'data';
  if (r.includes('design') || r.includes('ux') || r.includes('product designer')) return 'design';
  if (r.includes('product') || r.includes('pm') || r.includes('manager')) return 'product';
  return 'general';
}

export async function analyzeCV(profile: Profile): Promise<SkillAnalysis> {
  // Simulate backend parsing & LLM inference delay
  await new Promise((r) => setTimeout(r, 1400));

  const roleType = normalizeRole(profile.targetRole || '');

  switch (roleType) {
    case 'frontend':
      return {
        roleMatchTitle: 'Senior Frontend Engineer / UI Specialist',
        overallScore: 78,
        extractedKeywords: ['JavaScript', 'HTML5', 'CSS3', 'React', 'Git', 'REST APIs', 'Responsive Design', 'Tailwind CSS'],
        detectedSkills: [
          { name: 'React & React Ecosystem', category: 'Technical', proficiency: 88 },
          { name: 'JavaScript (ES6+) & TypeScript', category: 'Technical', proficiency: 82 },
          { name: 'CSS3 / Modern Styling (Flex, Grid)', category: 'Technical', proficiency: 90 },
          { name: 'Component Architecture & State', category: 'Technical', proficiency: 76 },
          { name: 'Cross-functional Communication', category: 'Soft', proficiency: 85 },
          { name: 'Agile & Sprint Planning', category: 'Domain', proficiency: 74 },
          { name: 'Code Review & Mentorship', category: 'Soft', proficiency: 70 },
          { name: 'Git & CI/CD Pipelines', category: 'Technical', proficiency: 68 },
        ],
        missingSkills: [
          {
            name: 'Web Performance Optimization (Core Web Vitals)',
            category: 'Technical',
            importance: 'Critical',
            why: 'Modern frontend roles demand deep knowledge of LCP, FID, CLS, lazy-loading, and bundle tree-shaking.',
            difficulty: 4,
          },
          {
            name: 'Automated Testing (Jest / Vitest / Playwright)',
            category: 'Technical',
            importance: 'Critical',
            why: 'Enterprise teams require robust test suites to prevent regression bugs in production releases.',
            difficulty: 3,
          },
          {
            name: 'Next.js & Server Components (SSR/SSG)',
            category: 'Technical',
            importance: 'Important',
            why: 'Industry standard for modern SEO, pre-rendering, and full-stack edge rendering.',
            difficulty: 3,
          },
          {
            name: 'Web Accessibility (WCAG 2.1 AA & a11y)',
            category: 'Domain',
            importance: 'Important',
            why: 'Crucial for compliance, legal regulations, and inclusive enterprise digital products.',
            difficulty: 2,
          },
          {
            name: 'GraphQL & State Normalization (Apollo/Relay)',
            category: 'Technical',
            importance: 'Nice-to-have',
            why: 'Highly advantageous when integrating with large distributed microservice backends.',
            difficulty: 4,
          },
        ],
      };

    case 'backend':
      return {
        roleMatchTitle: 'Backend Systems Engineer / Distributed Architect',
        overallScore: 74,
        extractedKeywords: ['Node.js', 'Python', 'SQL', 'PostgreSQL', 'Docker', 'REST API', 'Git', 'Linux'],
        detectedSkills: [
          { name: 'RESTful API Design & HTTP Protocols', category: 'Technical', proficiency: 86 },
          { name: 'Database Schema & SQL Queries', category: 'Technical', proficiency: 80 },
          { name: 'Server-side Logic & Middleware', category: 'Technical', proficiency: 82 },
          { name: 'Docker Containerization', category: 'Technical', proficiency: 72 },
          { name: 'Problem Decomposition & Root Cause Analysis', category: 'Soft', proficiency: 84 },
          { name: 'Data Modeling & Integrity', category: 'Domain', proficiency: 75 },
          { name: 'Documentation & Technical Writing', category: 'Soft', proficiency: 78 },
        ],
        missingSkills: [
          {
            name: 'High-Concurrency & Distributed Systems',
            category: 'Technical',
            importance: 'Critical',
            why: 'Target backend roles require experience handling thousands of requests/sec with minimal latency.',
            difficulty: 5,
          },
          {
            name: 'Message Queues (Kafka / RabbitMQ / SQS)',
            category: 'Technical',
            importance: 'Critical',
            why: 'Essential for asynchronous job processing, event-driven pipelines, and decoupling services.',
            difficulty: 4,
          },
          {
            name: 'Redis Caching & In-Memory Strategies',
            category: 'Technical',
            importance: 'Important',
            why: 'Critical for database offloading, rate-limiting, and session management at scale.',
            difficulty: 3,
          },
          {
            name: 'Kubernetes & Production Cloud Infrastructure',
            category: 'Domain',
            importance: 'Important',
            why: 'Expected for managing orchestrations, health checks, and self-healing deployments in AWS/GCP.',
            difficulty: 4,
          },
          {
            name: 'gRPC & Protobuf Serialization',
            category: 'Technical',
            importance: 'Nice-to-have',
            why: 'Microservice-to-microservice ultra fast binary communication standard.',
            difficulty: 3,
          },
        ],
      };

    case 'data':
      return {
        roleMatchTitle: 'Data & Applied Machine Learning Specialist',
        overallScore: 76,
        extractedKeywords: ['Python', 'SQL', 'Pandas', 'NumPy', 'Data Visualization', 'Statistics', 'Jupyter'],
        detectedSkills: [
          { name: 'Python Data Ecosystem (Pandas, NumPy)', category: 'Technical', proficiency: 88 },
          { name: 'SQL Querying & Data Extraction', category: 'Technical', proficiency: 85 },
          { name: 'Exploratory Data Analysis (EDA)', category: 'Technical', proficiency: 82 },
          { name: 'Data Storytelling & Reporting', category: 'Soft', proficiency: 78 },
          { name: 'Statistical Inference & Hypothesis Testing', category: 'Domain', proficiency: 72 },
        ],
        missingSkills: [
          {
            name: 'Production ML Pipelines (MLOps / MLflow)',
            category: 'Technical',
            importance: 'Critical',
            why: 'Transitioning from notebooks to automated model versioning, training pipelines, and artifact tracking.',
            difficulty: 5,
          },
          {
            name: 'Feature Stores & Scaled Data Processing (Spark / DuckDB)',
            category: 'Technical',
            importance: 'Critical',
            why: 'Modern data workflows require processing multi-gigabyte/terabyte datasets effectively.',
            difficulty: 4,
          },
          {
            name: 'Vector Databases & Embeddings (Pinecone / Chroma)',
            category: 'Domain',
            importance: 'Important',
            why: 'High-demand capability for modern Generative AI, RAG architectures, and semantic search.',
            difficulty: 3,
          },
          {
            name: 'A/B Testing Rigor & Causal Inference',
            category: 'Domain',
            importance: 'Important',
            why: 'Ensures measurable business validation and eliminates metric bias in production trials.',
            difficulty: 3,
          },
        ],
      };

    default: // general / fullstack / product
      return {
        roleMatchTitle: profile.targetRole || 'Full Stack Software Professional',
        overallScore: 81,
        extractedKeywords: ['Full Stack Development', 'Problem Solving', 'Architecture', 'Agile', 'Git', 'Testing'],
        detectedSkills: [
          { name: 'Core Programming & Software Design', category: 'Technical', proficiency: 85 },
          { name: 'Web Architecture & Protocols', category: 'Technical', proficiency: 80 },
          { name: 'Database Management & Persistence', category: 'Technical', proficiency: 76 },
          { name: 'Version Control & Collaborative Workflows', category: 'Technical', proficiency: 88 },
          { name: 'Critical Thinking & Problem Resolution', category: 'Soft', proficiency: 86 },
          { name: 'Stakeholder Communication', category: 'Soft', proficiency: 80 },
          { name: 'Product Sense & User Focus', category: 'Domain', proficiency: 75 },
        ],
        missingSkills: [
          {
            name: 'System Design & Scalability Principles',
            category: 'Technical',
            importance: 'Critical',
            why: 'Key requirement for senior level interviews, covering load balancing, caching, and database partitioning.',
            difficulty: 5,
          },
          {
            name: 'CI/CD Automation & Infrastructure as Code',
            category: 'Domain',
            importance: 'Critical',
            why: 'Enables autonomous ship cycles and enterprise deployment pipelines.',
            difficulty: 4,
          },
          {
            name: 'Security Best Practices (OWASP Top 10 / Auth Protocols)',
            category: 'Domain',
            importance: 'Important',
            why: 'Preventing vulnerabilities, enforcing JWT/OAuth2 flows, and maintaining privacy compliance.',
            difficulty: 3,
          },
          {
            name: 'Observability & Monitoring (Datadog / Prometheus / Sentry)',
            category: 'Technical',
            importance: 'Important',
            why: 'Quickly detecting and diagnosing production anomalies before end-users are impacted.',
            difficulty: 3,
          },
          {
            name: 'Technical Mentorship & Architectural RFCs',
            category: 'Soft',
            importance: 'Nice-to-have',
            why: 'Distinguishes senior individual contributors who elevate the engineering culture.',
            difficulty: 3,
          },
        ],
      };
  }
}

export async function generateValidation(profile: Profile, answers: QuestionnaireAnswer[]): Promise<ValidationResult> {
  await new Promise((r) => setTimeout(r, 1200));

  const role = profile.targetRole || 'Software Professional';
  const roleType = normalizeRole(role);

  // Parse hours from answers if available
  const hoursAns = answers.find((a) => a.questionId === 4)?.answer;
  const growthAreas = (answers.find((a) => a.questionId === 2)?.answer as string[]) || [];

  return {
    overallMatch: 82,
    technicalScore: 79,
    softScore: 88,
    experienceScore: 76,
    marketDemandScore: 92,
    summary: `Based on your profile, uploaded CV, and conversational preferences, your profile demonstrates strong foundational aptitude for "${role}". Your strengths in core implementation and collaborative delivery align well with contemporary market expectations. Bridging targeted gaps in performance optimization, distributed workflows, and automated testing will elevate you into top-tier candidate consideration.`,
    strengths: [
      'Solid core domain proficiency with consistent delivery patterns',
      'Strong cross-functional articulation and user-centric problem solving',
      `Clear self-awareness regarding growth areas: ${growthAreas.slice(0, 3).join(', ') || 'System Design, Modern Frameworks'}`,
      `Commitment to deliberate upskilling (${hoursAns || 'dedicated weekly study'})`,
    ],
    concerns: [
      'Gaps in high-concurrency architecture and production observability',
      'Limited formal test automation coverage documented in past projects',
      'Needs quantifiable impact metrics on project achievements (e.g. latency reduced by X%)',
      'Exposure to cloud native infra (AWS/GCP) could be highlighted more prominently',
    ],
    benchmarkJob: {
      title: `Senior ${role}`,
      company: 'TechCorp Innovations (Tier-1 Tech)',
      location: profile.location || 'Remote / Hybrid',
      salaryRange: '$125,000 - $165,000 USD / year',
      requirements: [
        '3+ years building scalable software products in fast-paced teams',
        'Proven mastery of modern component frameworks and REST/GraphQL APIs',
        'Experience with CI/CD, unit/integration testing, and production monitoring',
        'Strong architectural ownership and ability to write technical proposals',
        'Excellent written and verbal communication in distributed environments',
      ],
    },
  };
}

export async function generateRoadmap(profile: Profile, validation: ValidationResult): Promise<RoadmapPhase[]> {
  await new Promise((r) => setTimeout(r, 1000));

  const role = profile.targetRole || 'Software Professional';

  return [
    {
      phase: 1,
      title: 'Foundation & Core Alignment',
      timeline: 'Month 1 - 2',
      goal: 'Close critical technical blind spots, solidify testing fundamentals, and audit foundational syntax.',
      actions: [
        { id: 'p1-1', text: 'Audit Core Web Vitals / API latency concepts and read performance RFCs', completed: true },
        { id: 'p1-2', text: 'Set up automated unit testing suite (Jest/Vitest) on your flagship project', completed: false },
        { id: 'p1-3', text: 'Refactor state management using normalized schemas and strict TypeScript', completed: false },
        { id: 'p1-4', text: 'Earn certification or complete comprehensive deep-dive course on modern architecture', completed: false },
      ],
    },
    {
      phase: 2,
      title: 'Real-World Production Build',
      timeline: 'Month 3 - 4',
      goal: 'Build an end-to-end, high-performance reference application with enterprise-grade monitoring and CI/CD.',
      actions: [
        { id: 'p2-1', text: `Architect a full-stack ${role} showcase app with Docker, GitHub Actions & Cloud hosting`, completed: false },
        { id: 'p2-2', text: 'Integrate Sentry or Datadog for error tracking and observability metrics', completed: false },
        { id: 'p2-3', text: 'Implement authentication (OAuth2 / JWT) and secure against OWASP vulnerabilities', completed: false },
        { id: 'p2-4', text: 'Benchmark and document a 30%+ latency or bundle reduction with measurable metrics', completed: false },
      ],
    },
    {
      phase: 3,
      title: 'System Design & Social Proof',
      timeline: 'Month 5 - 6',
      goal: 'Master high-level architecture interviews, write technical blogs, and contribute to open source.',
      actions: [
        { id: 'p3-1', text: 'Practice 10 high-frequency System Design problems (URL Shortener, Feed, Notification Engine)', completed: false },
        { id: 'p3-2', text: 'Publish 2 technical breakdown articles on LinkedIn / Dev.to detailing your learnings', completed: false },
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
  await new Promise((r) => setTimeout(r, 850));

  const role = profile.targetRole || 'your target role';
  const name = profile.fullName ? profile.fullName.split(' ')[0] : 'friend';
  const p = prompt.toLowerCase();

  if (p.includes('gap') || p.includes('missing') || p.includes('improve')) {
    return `Looking at your target role as **${role}**, the highest leverage gaps to close first are **System Design**, **Automated Testing**, and **Performance Optimization**. Closing these transforms you from an implementer to an architectural owner. Would you like a targeted 30-day plan for any of these?`;
  }

  if (p.includes('salary') || p.includes('compensation') || p.includes('money')) {
    return `For **${role}** in current market tiers, competitive offers range between **$125,000 – $165,000+** base (plus equity/bonuses depending on remote vs hybrid status). Candidate profiles that highlight quantified business wins and testing rigor command top-of-band offers.`;
  }

  if (p.includes('interview') || p.includes('prep') || p.includes('question')) {
    return `Top interview themes for **${role}** right now:\n1. *Live architectural trade-offs* (e.g. CSR vs SSR vs ISR, SQL vs NoSQL)\n2. *Debugging real production incidents*\n3. *Behavioral STAR stories* showing times you resolved technical ambiguity or aligned stakeholders.\n\nShall we run a mock interview question together?`;
  }

  if (p.includes('resume') || p.includes('cv') || p.includes('bullet')) {
    return `Great CV rule of thumb: use the **Google XYZ formula**: *"Accomplished [X] as measured by [Y], by doing [Z]"*.\nInstead of "Built React dashboard", write: *"Engineered React executive analytics suite used by 12k daily users, cutting render times by 34% via memoization and virtualized tables."*`;
  }

  return `Regarding "${prompt}" in the context of **${role}**: The most effective career strategy is continuous alignment between your demonstrable portfolio and the exact pain points of hiring teams. Your profile already shows strong fundamentals; our focus is sharpening the high-demand differentiators. What area would you like to explore next?`;
}
