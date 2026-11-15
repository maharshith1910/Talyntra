import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Button from '../components/Button';
import { useStore } from '../lib/store';

interface CohortSummary {
  department: string;
  privacyStatus: string;
  sampleSize: number;
  threshold: number;
  kAnonymitySatisfied: boolean;
  message?: string;
  metrics?: {
    meanBatchReadiness: number;
    placementReadyRatePercent: number;
    topCohortSkillGaps: {
      skillName: string;
      missingStudentCount: number;
      percentageMissing: number;
    }[];
    recommendedCurriculumWorkshops: string[];
  };
}

export default function PlacementAdmin() {
  const nav = useNavigate();
  const { state } = useStore();
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [loading, setLoading] = useState(false);
  const [cohortData, setCohortData] = useState<CohortSummary | null>(null);

  // Quick role toggle for demonstration / testing
  const [currentRole, setCurrentRole] = useState<'placement_admin' | 'student'>('placement_admin');

  useEffect(() => {
    setLoading(true);
    // Simulate API query with k-anonymity threshold (k >= 5)
    setTimeout(() => {
      if (selectedDept === 'BioTech') {
        // Sub-cohort below minimum sample size k = 5
        setCohortData({
          department: 'BioTech',
          privacyStatus: 'suppressed',
          sampleSize: 1,
          threshold: 5,
          kAnonymitySatisfied: false,
          message:
            'Cohort Suppressed: Sample size (1 consenting student) is below the k-anonymity privacy threshold (k >= 5) to prevent individual deanonymization.',
        });
      } else {
        const isCSE = selectedDept === 'CSE';
        const sampleSize = isCSE ? 6 : 8;
        setCohortData({
          department: selectedDept,
          privacyStatus: 'verified_consented_aggregate',
          sampleSize,
          threshold: 5,
          kAnonymitySatisfied: true,
          metrics: {
            meanBatchReadiness: isCSE ? 83 : 79,
            placementReadyRatePercent: isCSE ? 83 : 75,
            topCohortSkillGaps: [
              { skillName: 'System Design & Scalability Principles', missingStudentCount: isCSE ? 4 : 5, percentageMissing: isCSE ? 67 : 63 },
              { skillName: 'Automated Testing (Unit & E2E)', missingStudentCount: isCSE ? 2 : 3, percentageMissing: isCSE ? 33 : 38 },
              { skillName: 'CI/CD Pipelines & Containerization', missingStudentCount: isCSE ? 1 : 2, percentageMissing: isCSE ? 17 : 25 },
              { skillName: 'Distributed Caching & Redis', missingStudentCount: 1, percentageMissing: 13 },
            ],
            recommendedCurriculumWorkshops: [
              'Hands-on Lab: Distributed Caching & System Architecture (Missing in 63%+ of batch)',
              'Interactive Session: Writing Production Test Suites with Vitest & Playwright',
              'Industry Calibration: JPMC & Google Placement Prep Mock Panels',
            ],
          },
        });
      }
      setLoading(false);
    }, 200);
  }, [selectedDept]);

  return (
    <div className="chat">
      <Sidebar />

      <section className="chat__main" style={{ overflowY: 'auto', padding: '32px clamp(16px, 4vw, 64px)' }}>
        {/* Header & Role Switcher */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
              Institutional Career Analytics
            </div>
            <h1 style={{ fontSize: 26, color: '#fff', margin: '4px 0 6px', fontFamily: 'var(--serif)' }}>
              College Placement Cell Dashboard
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>
              Cohort-level competency telemetry, curriculum gap analysis, and placement readiness benchmarks.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Active Role:</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: currentRole === 'placement_admin' ? '#34d399' : 'var(--accent-cyan)' }}>
              {currentRole === 'placement_admin' ? '🎓 placement_admin' : '👤 student'}
            </span>
            <button
              type="button"
              className="chip"
              style={{ fontSize: 11 }}
              onClick={() => setCurrentRole((r) => (r === 'placement_admin' ? 'student' : 'placement_admin'))}
            >
              Toggle Role
            </button>
          </div>
        </div>

        {/* Student Consent & FERPA Guarantee Banner */}
        <div style={{ background: 'rgba(79, 70, 229, 0.15)', border: '1px solid rgba(126, 240, 236, 0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontSize: 12, color: 'var(--ink)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: 2 }}>
            <span>🔒</span>
            <span>Student Privacy & k-Anonymity Rules:</span>
          </div>
          <div>
            Only students who explicitly grant consent (<code>placement_consent_granted = true</code>) are aggregated into batch metrics. To prevent identification, groups smaller than 5 students (\(k \ge 5\)) are automatically suppressed. Placement officers cannot inspect individual resumes or unshared evidence without explicit student unlock.
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>Filter Cohort:</span>
          {(['All', 'CSE', 'ECE', 'BioTech'] as const).map((dept) => (
            <button
              key={dept}
              type="button"
              className={`chip ${selectedDept === dept ? 'chip--active' : ''}`}
              onClick={() => setSelectedDept(dept)}
            >
              {dept === 'All' ? 'All Departments' : dept === 'BioTech' ? 'BioTech (<5 sample)' : dept}
            </button>
          ))}
        </div>

        {/* Privacy Suppressed View (k < 5) */}
        {cohortData && !cohortData.kAnonymitySatisfied && (
          <div className="glass" style={{ padding: 28, borderRadius: 12, border: '1px solid rgba(245, 158, 11, 0.4)', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
            <h3 style={{ color: '#fcd34d', fontSize: 18, marginBottom: 6 }}>Cohort Data Suppressed for Student Anonymity</h3>
            <p style={{ color: 'var(--muted)', maxWidth: 540, margin: '0 auto 16px', fontSize: 13 }}>
              {cohortData.message}
            </p>
            <Button variant="glass" onClick={() => setSelectedDept('All')}>
              View Aggregated Batch (N &ge; 5)
            </Button>
          </div>
        )}

        {/* Aggregated Cohort Telemetry View */}
        {cohortData && cohortData.kAnonymitySatisfied && cohortData.metrics && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* KPI Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div className="glass" style={{ padding: 18, borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Consented Batch Size</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginTop: 4 }}>{cohortData.sampleSize} Students</div>
                <div style={{ fontSize: 11, color: '#34d399', marginTop: 4 }}>✓ k-Anonymity Verified (k &ge; 5)</div>
              </div>

              <div className="glass" style={{ padding: 18, borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Mean Batch Readiness</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent-cyan)', marginTop: 4 }}>
                  {cohortData.metrics.meanBatchReadiness}%
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Software Engineer Benchmark</div>
              </div>

              <div className="glass" style={{ padding: 18, borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Placement-Ready Rate</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#34d399', marginTop: 4 }}>
                  {cohortData.metrics.placementReadyRatePercent}%
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Confidence Score &ge; 75%</div>
              </div>
            </div>

            {/* Top Cohort Skill Gaps */}
            <div className="glass" style={{ padding: 24, borderRadius: 12 }}>
              <h3 style={{ fontSize: 16, color: '#fff', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🎯</span> Top Cohort-Level Skill Deficiencies (Highest Impact)
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {cohortData.metrics.topCohortSkillGaps.map((gap, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#fff', fontWeight: 600 }}>{gap.skillName}</span>
                      <span style={{ color: '#fca5a5' }}>
                        {gap.percentageMissing}% Missing ({gap.missingStudentCount}/{cohortData.sampleSize} students)
                      </span>
                    </div>
                    {/* Visual Bar */}
                    <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${gap.percentageMissing}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #f87171, #ef4444)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Curriculum Interventions */}
            <div className="glass" style={{ padding: 24, borderRadius: 12 }}>
              <h3 style={{ fontSize: 16, color: '#fff', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🛠️</span> Actionable Curriculum Interventions for College
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cohortData.metrics.recommendedCurriculumWorkshops.map((w, idx) => (
                  <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: 8, borderLeft: '3px solid var(--accent-cyan)', fontSize: 13, color: '#fff' }}>
                    • {w}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

