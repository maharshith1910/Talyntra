// Talyntra API Client Adapter
// Communicates with FastAPI backend for server-side LLM calls & evidence extraction
// Keeping all API keys securely on the server (no browser exposure)

import { EvidenceGraph } from './evidenceGraph';
import { Profile } from './mockAI';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';

export const isRemoteBackendConfigured = (): boolean => {
  return typeof API_BASE_URL === 'string' && API_BASE_URL.trim().length > 0;
};

export async function analyzeCVRemotely(profile: Profile): Promise<EvidenceGraph | null> {
  if (!isRemoteBackendConfigured()) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/cv/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: profile.fullName,
        target_role: profile.targetRole,
        experience: profile.experience,
        file_name: profile.fileName,
      }),
    });

    if (!res.ok) {
      console.warn(`FastAPI analyze error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    return {
      evidenceNodes: data.evidence_nodes,
      skillClaims: data.skill_claims,
      missingSkillsWithROI: data.missing_skills_with_roi,
      overallMatchScore: data.overall_match_score,
      overallReasoning: data.overall_reasoning,
    };
  } catch (err) {
    console.warn('Failed to reach FastAPI backend, using client engine fallback:', err);
    return null;
  }
}

export async function verifyTaskRemotely(
  taskId: string,
  taskDescription: string,
  skillName: string
): Promise<{ success: boolean; newScore?: number } | null> {
  if (!isRemoteBackendConfigured()) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/roadmap/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task_id: taskId,
        task_description: taskDescription,
        skill_name: skillName,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return { success: data.success, newScore: data.new_confidence_score };
  } catch (err) {
    console.warn('Failed to verify task remotely:', err);
    return null;
  }
}

export async function streamChatRemotely(
  message: string,
  targetRole: string,
  callbacks: {
    onToken: (token: string) => void;
    onComplete: (fullText: string) => void;
    onError: (err: string) => void;
  }
): Promise<void> {
  if (!isRemoteBackendConfigured()) {
    callbacks.onError('Remote backend not configured');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        target_role: targetRole,
      }),
    });

    if (!response.ok || !response.body) {
      callbacks.onError(`Backend error: ${response.status}`);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const data = JSON.parse(jsonStr);
            if (data.token) {
              fullText += data.token;
              callbacks.onToken(data.token);
            }
          } catch {
            // skip malformed SSE chunk
          }
        }
      }
    }

    callbacks.onComplete(fullText);
  } catch (err) {
    callbacks.onError(err instanceof Error ? err.message : 'Network error');
  }
}

