import { FormEvent, useEffect, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { Message } from '../lib/mockAI';
import { useStore } from '../lib/store';
import { streamChat, buildProfileContext, GeminiMessage } from '../lib/geminiAI';
import { isRemoteBackendConfigured } from '../lib/apiClient';

const uid = () => Math.random().toString(36).slice(2);

export default function Chat() {
  const { state } = useStore();
  const profile = state.profile;
  const isBackendLive = isRemoteBackendConfigured();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'ai',
      text: `Hello${profile.fullName ? ` ${profile.fullName.split(' ')[0]}` : ''}! I'm Talyntra-AI — your career intelligence engine.\n\n🟢 **Evidence Engine Active** — I evaluate your profile using verified citations, time-decay retention curves, and Learning-ROI rankings.\n\nI can help with:\n• **Evidence Audit** — identify why a skill has weak or insufficient proof\n• **Gap-Closing Strategy** — what milestones unlock the highest career leverage\n• **Interview Calibration** — architectural tradeoffs and STAR behavioral frameworks\n• **Resume Metrics** — rewrite bullet points to maximize Evidence Graph confidence\n\nWhat would you like to explore?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [history] = useState<string[]>([
    'How do I close my System Design gap?',
    'Why is my skill marked insufficient evidence?',
    'What skills have the highest Learning-ROI?',
    'Help me write quantified resume bullets',
  ]);

  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const geminiHistory = useRef<GeminiMessage[]>([]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const prompt = text.trim();
    if (!prompt || busy) return;

    setText('');
    setBusy(true);

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Add user message
    setMessages((m) => [
      ...m,
      { id: uid(), role: 'user', text: prompt, timestamp: now },
    ]);

    geminiHistory.current.push({ role: 'user', parts: [{ text: prompt }] });

    // Stream AI response
    const aiId = uid();
    setStreamingId(aiId);
    setMessages((m) => [
      ...m,
      { id: aiId, role: 'ai', text: '', timestamp: now },
    ]);

    const profileCtx = buildProfileContext(profile, state.skills);

    await streamChat(prompt, profileCtx, geminiHistory.current.slice(0, -1), {
      onToken: (token) => {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === aiId ? { ...msg, text: msg.text + token } : msg
          )
        );
      },
      onComplete: (fullText) => {
        geminiHistory.current.push({ role: 'model', parts: [{ text: fullText }] });
        setStreamingId(null);
        setBusy(false);
      },
      onError: (error) => {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === aiId
              ? { ...msg, text: `⚠️ ${error}` }
              : msg
          )
        );
        setStreamingId(null);
        setBusy(false);
      },
    });
  };

  return (
    <div className="chat">
      <Sidebar />

      <section className="chat__main">
        {/* Connection Status + Suggestions */}
        <div className="chat-suggestions">
          <div className="ai-status-pill ai-status--live">
            <span className="status-dot" />
            {isBackendLive ? 'FastAPI + Gemini Streaming' : 'Talyntra Evidence Engine'}
          </div>
          {history.map((item, idx) => (
            <button
              key={idx}
              className="chat-suggestion-chip"
              onClick={() => setText(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="chat__stream" role="log" aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className={`bubble bubble--${m.role} ${streamingId === m.id ? 'bubble--streaming' : ''}`}>
              {m.role === 'ai' && (
                <div className="bubble-sender">Talyntra-AI</div>
              )}
              <div className="bubble-text">{m.text || (streamingId === m.id ? '▍' : '')}</div>
              <span className="bubble-ts">{m.timestamp || ''}</span>
            </div>
          ))}
          {busy && !streamingId && (
            <div className="bubble bubble--ai typing" aria-label="Talyntra is thinking">
              <i /><i /><i />
            </div>
          )}
          <div ref={end} />
        </div>

        <form className="composer" onSubmit={send}>
          <span className="composer-plus" aria-hidden>+</span>
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask about your Evidence Graph, time-decay retention, or learning ROI…"
            aria-label="Message"
            disabled={busy}
          />
          <button type="submit" className="composer-send" disabled={busy || !text.trim()}>
            {busy ? '…' : '↑'}
          </button>
        </form>
      </section>
    </div>
  );
}
