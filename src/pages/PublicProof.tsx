import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { useStore } from '../lib/store';
import {
  ProofToken,
  VerifiedProofView,
  validateProofToken,
  generateVerifiedProofView,
  revokeProofToken,
  createProofToken,
} from '../lib/proofToken';

export default function PublicProof() {
  const { tokenId } = useParams<{ tokenId: string }>();
  const nav = useNavigate();
  const { state } = useStore();
  const currentGraph = state.evidenceGraph || state.skills?.evidenceGraph;

  const [proofView, setProofView] = useState<VerifiedProofView | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [revokedToast, setRevokedToast] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!currentGraph) {
      setErrorMsg('No evidence record currently loaded. Please complete analysis first.');
      return;
    }

    // Load token from storage or generate mock token if accessing directly
    const storedRaw = localStorage.getItem('talyntra_proof_tokens');
    let tokens: Record<string, ProofToken> = storedRaw ? JSON.parse(storedRaw) : {};

    let targetToken = tokenId ? tokens[tokenId] : null;

    if (!targetToken && tokenId) {
      // Create valid token on the fly for preview
      targetToken = createProofToken(
        state.profile.fullName ? 'usr_' + state.profile.fullName.toLowerCase().replace(/\s+/g, '_') : 'usr_alex_morgan',
        state.profile.fullName || 'Alex Morgan',
        state.profile.targetRole || 'Software Engineer',
        30
      );
    }

    if (!targetToken) {
      setErrorMsg('Verification link not found or invalid token identifier.');
      return;
    }

    const validation = validateProofToken(targetToken);
    if (!validation.valid) {
      setErrorMsg(validation.reason || 'Verification link is invalid or expired.');
      return;
    }

    try {
      const view = generateVerifiedProofView(currentGraph, targetToken);
      setProofView(view);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate verified transcript view.');
    }
  }, [tokenId, currentGraph, state.profile]);

  const handleRevoke = () => {
    if (proofView?.verificationMetadata.tokenId) {
      revokeProofToken(proofView.verificationMetadata.tokenId);
      setRevokedToast(true);
      setErrorMsg('This verification link has been permanently revoked by the candidate.');
      setProofView(null);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="aurora" style={{ minHeight: '100vh', padding: '40px 20px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ maxWidth: 840, width: '100%' }}>
        {/* Navigation Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: '#fff', fontFamily: 'var(--serif)' }}>Talyntra</span>
            <span style={{ fontSize: 11, background: 'rgba(52, 211, 153, 0.2)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.4)', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
              ✓ Official Public Proof Transcript
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="glass" onClick={() => nav('/skills')}>
              ← Back to App
            </Button>
            {proofView && (
              <Button variant="glass" onClick={handleCopyLink}>
                {copiedLink ? '✓ Copied URL' : '🔗 Copy Shareable Link'}
              </Button>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="glass" style={{ padding: 32, textAlign: 'center', borderRadius: 12, border: '1px solid rgba(239, 68, 68, 0.4)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
            <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 8 }}>Verification Link Unavailable</h2>
            <p style={{ color: 'var(--muted)', maxWidth: 480, margin: '0 auto 20px' }}>{errorMsg}</p>
            <Button onClick={() => nav('/skills')}>Return to Candidate Dashboard</Button>
          </div>
        )}

        {proofView && (
          <div className="glass" style={{ padding: '32px 36px', borderRadius: 16, border: '1px solid rgba(126, 240, 236, 0.3)' }}>
            {/* Candidate & Verification Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 24 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
                  Verified Competency Transcript
                </div>
                <h1 style={{ fontSize: 28, color: '#fff', margin: '4px 0 6px', fontFamily: 'var(--serif)' }}>
                  {proofView.candidateName}
                </h1>
                <div style={{ color: 'var(--muted)', fontSize: 14 }}>
                  Target Role: <strong style={{ color: '#fff' }}>{proofView.targetRole}</strong> • Verified as of {proofView.verifiedAt}
                </div>
              </div>

              <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.3)', padding: '12px 20px', borderRadius: 12, border: '1px solid rgba(126, 240, 236, 0.25)' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#34d399', lineHeight: 1 }}>
                  {proofView.overallVerifiedScore}%
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', marginTop: 4 }}>
                  Verified Readiness
                </div>
              </div>
            </div>

            {/* Privacy & Zero-Inflation Integrity Notice */}
            <div style={{ background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.25)', borderRadius: 8, padding: '10px 14px', margin: '20px 0', fontSize: 12, color: '#d1fae5', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>🛡️</span>
              <div>
                <strong>Talyntra Cryptographic Integrity Mandate:</strong> This transcript contains only competencies supported by verified production deliverables, code commits, or passing CI pipelines. Unverified self-claims and insufficient-evidence keywords are strictly omitted.
              </div>
            </div>

            {/* Verified Skills Ledger */}
            <h2 style={{ fontSize: 16, color: '#fff', margin: '24px 0 14px', textTransform: 'uppercase', letterSpacing: 1 }}>
              Verified Competencies ({proofView.verifiedSkills.length})
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {proofView.verifiedSkills.map((sk) => (
                <div key={sk.skillName} style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 10, padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{sk.skillName}</span>
                      <span className="skill-tag">{sk.category}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                        Retention: <strong>{sk.retentionDecayPercent}%</strong>
                      </span>
                      <span style={{ background: 'rgba(52, 211, 153, 0.2)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.4)', padding: '3px 10px', borderRadius: 14, fontSize: 12, fontWeight: 800 }}>
                        ✓ {sk.confidenceScore}% Verified
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: 13, color: 'var(--muted)', margin: '8px 0 12px' }}>
                    <strong>Mathematical Calibration:</strong> {sk.reasoning}
                  </p>

                  {/* Verifiable Citations */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
                      Linked Verifiable Citations ({sk.citations.length}):
                    </div>
                    {sk.citations.map((cite, idx) => (
                      <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', borderLeft: '3px solid #34d399', padding: '6px 12px', fontSize: 12 }}>
                        <div style={{ color: '#fff', fontStyle: 'italic' }}>"{cite.quote}"</div>
                        <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2 }}>
                          Source: {cite.context} • {cite.sourceType} • {cite.timestamp}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Cryptographic Signature Footer & Candidate Revocation Control */}
            <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, fontSize: 11, color: 'var(--muted)' }}>
              <div>
                <div>Token ID: <code>{proofView.verificationMetadata.tokenId}</code></div>
                <div>Expires: {proofView.verificationMetadata.expiresAt} • Signature: <code>{proofView.verificationMetadata.signatureFingerprint}</code></div>
              </div>

              <button
                type="button"
                onClick={handleRevoke}
                style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
              >
                🔒 Candidate Control: Revoke This Link
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

