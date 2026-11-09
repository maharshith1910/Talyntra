// Talyntra Gemini AI Client — Real-time career guidance engine
// Connects to Google Gemini API for live AI responses with streaming

const GEMINI_MODEL = 'gemini-2.0-flash';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const CAREER_SYSTEM_PROMPT = `You are Talyntra-AI, a premium career intelligence engine built for ambitious professionals. You provide world-class career guidance with the depth of a senior executive coach and the precision of a technical recruiter at a FAANG company.

Your core capabilities:
1. **Resume & CV Analysis**: Identify strengths, weaknesses, missing keywords, quantifiable impact metrics, and ATS optimization strategies.
2. **Skill Gap Detection**: Compare a candidate's profile against market requirements for their target role and provide specific, actionable gap-closing recommendations.
3. **Interview Preparation**: Offer behavioral STAR method coaching, system design walkthrough frameworks, and live-coding strategy tips.
4. **Career Trajectory Planning**: Provide phase-by-phase roadmaps with concrete milestones, timelines, and resource recommendations.
5. **Salary & Compensation Intelligence**: Share market-calibrated compensation ranges and negotiation frameworks.
6. **Learning Curation**: Recommend specific courses, books, certifications, and communities tailored to the candidate's gaps.

Communication style:
- Be direct, specific, and actionable. Never give vague advice.
- Use bold formatting (**text**) for key terms and bullet points for structure.
- Keep responses concise but comprehensive (150-300 words typical).
- Always relate advice back to the candidate's specific target role and experience level.
- Use real-world examples and concrete numbers where possible.
- Be encouraging but honest about gaps.`;

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: string) => void;
}

function getApiKey(): string | null {
  try {
    return localStorage.getItem('talyntra_gemini_key');
  } catch {
    return null;
  }
}

export function setApiKey(key: string): void {
  localStorage.setItem('talyntra_gemini_key', key);
}

export function clearApiKey(): void {
  localStorage.removeItem('talyntra_gemini_key');
}

export function hasApiKey(): boolean {
  const key = getApiKey();
  return !!key && key.length > 10;
}

function buildContents(
  userMessage: string,
  profileContext: string,
  conversationHistory: GeminiMessage[] = []
): GeminiMessage[] {
  const contextPreamble: GeminiMessage = {
    role: 'user',
    parts: [{ text: `${CAREER_SYSTEM_PROMPT}\n\n---\n\nCandidate Profile Context:\n${profileContext}\n\n---\n\nPlease respond as Talyntra-AI to all following messages.` }],
  };

  const contextAck: GeminiMessage = {
    role: 'model',
    parts: [{ text: 'Understood. I am Talyntra-AI, your career intelligence engine. I have your profile context loaded. How can I help you today?' }],
  };

  const messages: GeminiMessage[] = [contextPreamble, contextAck, ...conversationHistory];

  // Add the current user message
  messages.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });

  return messages;
}

/**
 * Send a message to Gemini and get a streaming response.
 * Falls back to non-streaming if SSE fails.
 */
export async function streamChat(
  userMessage: string,
  profileContext: string,
  conversationHistory: GeminiMessage[],
  callbacks: StreamCallbacks
): Promise<void> {
  const apiKey = getApiKey();
  if (!apiKey) {
    callbacks.onError('No API key configured. Go to Settings to add your Gemini API key.');
    return;
  }

  const contents = buildContents(userMessage, profileContext, conversationHistory);

  try {
    const response = await fetch(
      `${BASE_URL}/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            topK: 40,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMsg = `API Error (${response.status})`;
      try {
        const parsed = JSON.parse(errorBody);
        errorMsg = parsed?.error?.message || errorMsg;
      } catch {
        // use default error message
      }
      callbacks.onError(errorMsg);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError('Stream not available');
      return;
    }

    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from the buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;

          try {
            const data = JSON.parse(jsonStr);
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              fullText += text;
              callbacks.onToken(text);
            }
          } catch {
            // skip malformed JSON chunks
          }
        }
      }
    }

    callbacks.onComplete(fullText);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      callbacks.onError('Network error — check your internet connection and API key.');
    } else {
      callbacks.onError(msg);
    }
  }
}

/**
 * Non-streaming single-shot call for background analysis tasks.
 */
export async function generateContent(
  prompt: string,
  profileContext: string
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('No API key');

  const response = await fetch(
    `${BASE_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${CAREER_SYSTEM_PROMPT}\n\nCandidate Profile:\n${profileContext}\n\n---\n\n${prompt}` }],
          },
        ],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Build a profile context string from the user's data.
 */
export function buildProfileContext(profile: {
  fullName: string;
  targetRole: string;
  experience: string;
  location?: string;
  linkedIn?: string;
  fileName?: string;
}, skills?: { detectedSkills?: { name: string; proficiency: number }[]; missingSkills?: { name: string; importance: string }[] } | null): string {
  let ctx = `Name: ${profile.fullName}\nTarget Role: ${profile.targetRole}\nExperience: ${profile.experience}`;
  if (profile.location) ctx += `\nLocation: ${profile.location}`;
  if (profile.fileName) ctx += `\nCV File: ${profile.fileName}`;

  if (skills?.detectedSkills?.length) {
    ctx += `\n\nDetected Skills: ${skills.detectedSkills.map(s => `${s.name} (${s.proficiency}%)`).join(', ')}`;
  }
  if (skills?.missingSkills?.length) {
    ctx += `\nMissing Skills: ${skills.missingSkills.map(s => `${s.name} [${s.importance}]`).join(', ')}`;
  }

  return ctx;
}

/**
 * Validate an API key by making a minimal test request.
 */
export async function validateApiKey(key: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${BASE_URL}/${GEMINI_MODEL}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      }
    );

    if (response.ok) {
      return { valid: true };
    }

    const body = await response.text();
    try {
      const parsed = JSON.parse(body);
      return { valid: false, error: parsed?.error?.message || `HTTP ${response.status}` };
    } catch {
      return { valid: false, error: `HTTP ${response.status}` };
    }
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

