// Talyntra AI Client Adapter
// SECURITY: Gemini API calls are processed exclusively on the FastAPI backend.
// API keys are stored in server environment variables only and NEVER exposed to the browser.

import { streamChatRemotely, isRemoteBackendConfigured } from './apiClient';
import { askTalyntra } from './mockAI';

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: string) => void;
}

export function isServerAiConfigured(): boolean {
  return isRemoteBackendConfigured();
}

export function buildProfileContext(
  profile: {
    fullName: string;
    targetRole: string;
    experience: string;
    location?: string;
    linkedIn?: string;
    fileName?: string;
  },
  skills?: {
    detectedSkills?: { name: string; proficiency: number }[];
    missingSkills?: { name: string; importance: string }[];
  } | null
): string {
  let ctx = `Name: ${profile.fullName}\nTarget Role: ${profile.targetRole}\nExperience: ${profile.experience}`;
  if (profile.location) ctx += `\nLocation: ${profile.location}`;
  if (profile.fileName) ctx += `\nCV File: ${profile.fileName}`;

  if (skills?.detectedSkills?.length) {
    ctx += `\n\nDetected Skills: ${skills.detectedSkills
      .map((s) => `${s.name} (${s.proficiency}%)`)
      .join(', ')}`;
  }
  if (skills?.missingSkills?.length) {
    ctx += `\nMissing Skills: ${skills.missingSkills
      .map((s) => `${s.name} [${s.importance}]`)
      .join(', ')}`;
  }

  return ctx;
}

/**
 * Stream conversational AI responses through the FastAPI backend.
 * Falls back to local streaming mock if backend is not currently running.
 */
export async function streamChat(
  userMessage: string,
  profileContext: string,
  _conversationHistory: GeminiMessage[],
  callbacks: StreamCallbacks
): Promise<void> {
  // 1. If remote backend is configured, try streaming via FastAPI service
  if (isRemoteBackendConfigured()) {
    let receivedTokens = false;
    try {
      await streamChatRemotely(userMessage, 'Software Engineer', {
        onToken: (token) => {
          receivedTokens = true;
          callbacks.onToken(token);
        },
        onComplete: (fullText) => {
          receivedTokens = true;
          callbacks.onComplete(fullText);
        },
        onError: (err) => {
          console.warn('FastAPI backend stream failed or offline:', err);
        },
      });

      if (receivedTokens) {
        return;
      }
    } catch (err) {
      console.warn('Remote stream call encountered error, falling back to local engine:', err);
    }
  }

  // 2. Offline fallback streaming generator
  try {
    const fullText = await askTalyntra(userMessage, {
      fullName: 'Alex Morgan',
      targetRole: 'Software Engineer',
      experience: '3+ years',
    });

    // Simulate streaming tokens smoothly
    const words = fullText.split(' ');
    for (let i = 0; i < words.length; i++) {
      const token = (i === 0 ? '' : ' ') + words[i];
      callbacks.onToken(token);
      await new Promise((r) => setTimeout(r, 25));
    }
    callbacks.onComplete(fullText);
  } catch (err) {
    callbacks.onError(err instanceof Error ? err.message : 'Chat error');
  }
}
