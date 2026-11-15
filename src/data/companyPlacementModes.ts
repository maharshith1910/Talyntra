export interface CompanyPlacementMode {
  id: string;
  name: string;
  company: string;
  tier: string;
  description: string;
  rounds: { name: string; focus: string; duration: string }[];
  prioritySkills: string[];
  officialVerificationNote: string;
}

export const COMPANY_PLACEMENT_MODES: CompanyPlacementMode[] = [
  {
    id: 'standard',
    name: 'Standard Tech Loop',
    company: 'Industry Benchmark',
    tier: 'Mid-to-Senior Engineering',
    description: 'Standard 3-stage loop: Recruiter resume screen, Engineering Manager delivery alignment, and Bar Raiser systems pressure-test.',
    rounds: [
      { name: 'Stage 1: Recruiter Screen', focus: 'Trajectory, scope, and STAR communication', duration: '30 mins' },
      { name: 'Stage 2: Engineering Manager', focus: 'Production delivery, incident post-mortems, and tradeoffs', duration: '45 mins' },
      { name: 'Stage 3: Bar Raiser', focus: 'System architecture, edge cases, and non-functional requirements', duration: '60 mins' },
    ],
    prioritySkills: [
      'System Design & Scalability Principles',
      'Web Architecture & REST/GraphQL APIs',
      'Automated Testing (Unit & E2E)',
    ],
    officialVerificationNote: 'Calibrated against Tier-1 tech industry hiring bars.',
  },
  {
    id: 'jpmc',
    name: 'JPMorgan Chase (Campus Track)',
    company: 'JPMorgan Chase & Co.',
    tier: 'Software Engineer (Entry Level / Code for Good)',
    description: 'Financial enterprise campus hiring pipeline emphasizing high-throughput reliability, ACID database integrity, and structured behavioral alignment.',
    rounds: [
      { name: 'Round 1: HackerRank OA', focus: '2 Data Structures & Algorithms coding challenges (Array, Trees, Hash Maps)', duration: '60 mins' },
      { name: 'Round 2: HireVue Behavioral', focus: '2 automated video prompts assessing teamwork, ethical integrity, and problem solving', duration: '15 mins' },
      { name: 'Round 3A: Technical Interview', focus: 'OOP principles, SQL queries/transactions, microservice APIs, and automated testing', duration: '45 mins' },
      { name: 'Round 3B: Culture & Fit', focus: 'Collaboration under tight deadlines, financial regulations awareness, and code ownership', duration: '30 mins' },
    ],
    prioritySkills: [
      'Databases & Relational Schema Design',
      'Web Architecture & REST/GraphQL APIs',
      'Automated Testing (Unit & E2E)',
      'System Design & Scalability Principles',
    ],
    officialVerificationNote: 'Mandatory official verification: Check official university placement MoU for minimum CGPA cutoff and HackerRank test platform constraints. Do not trust unofficial forum rumors.',
  },
  {
    id: 'google',
    name: 'Google (Campus SWE)',
    company: 'Google LLC',
    tier: 'University Graduate / SWE Intern',
    description: 'Rigorous algorithmic engineering funnel focusing on mathematical foundations, clean code without IDE assistance, and Googleyness leadership principles.',
    rounds: [
      { name: 'Round 1: Google Online Challenge (GOC)', focus: '2 algorithmic challenges on Google platform (Graphs, Dynamic Programming, Greedy)', duration: '60 mins' },
      { name: 'Round 2: Technical Phone Screen', focus: '45 mins live coding in Google Docs/Canvas with strict time/space complexity proof', duration: '45 mins' },
      { name: 'Round 3: Onsite Algorithms (x3)', focus: '3 deep technical rounds testing edge cases, invariant preservation, and clean abstractions', duration: '3 x 45 mins' },
      { name: 'Round 4: Googleyness & Leadership', focus: 'Navigating ambiguity, doing the right thing, intellectual humility, and user-first empathy', duration: '45 mins' },
    ],
    prioritySkills: [
      'TypeScript & Strict Types',
      'System Design & Scalability Principles',
      'Automated Testing (Unit & E2E)',
      'Distributed Caching & Redis',
    ],
    officialVerificationNote: 'Mandatory official verification: Check official Google Careers guidelines (careers.google.com/how-we-hire). Verify plain text editor format and prohibition of external third-party libraries.',
  },
];

