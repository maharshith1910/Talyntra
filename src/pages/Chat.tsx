import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { askTalyntra, Message } from '../lib/mockAI';
import { useStore } from '../lib/store';
import { streamChat, buildProfileContext, hasApiKey, GeminiMessage } from '../lib/geminiAI';

const uid = () => Math.random().toString(36).slice(2);

export default function Chat() {
  const nav = useNavigate();
  const { state } = useStore();
  const profile = state.profile;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'ai',
      text: `Hello${profile.fullName ? ` ${profile.fullName.split(' ')[0]}` : ''}! I'm Talyntra-AI — your career intelligence engine.${
        hasApiKey() ? '\n\n🟢 **Live AI Connected** — I\'m powered by Google Gemini and ready to provide personalized career guidance.' : '\n\n⚪ **Demo Mode** — Go to Settings to connect your Gemini API key for live AI responses.'
      }\n\nI can help with:\n• **Resume feedback** — improve bullet points and quantify impact\n• **Skill gap analysis** — what to learn for your target role\n• **Interview prep** — behavioral and system design practice\n• **Career strategy** — roadmaps, salary benchmarking, and growth\n\nWhat would you like to explore?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [history] = useState<string[]>([
    'How do I close my testing gap?',
    'Help me write better resume bullets',
    'What salary should I target?',
    'Run a mock interview question',
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

  // Focus input on mount
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

    // Track Gemini conversation history
    geminiHistory.current.push({ role: 'user', parts: [{ text: prompt }] });

    if (hasApiKey()) {
      // REAL AI — Streaming Gemini response
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
                ? { ...msg, text: `⚠️ ${error}\n\nFalling back to offline mode for this response.` }
                : msg
            )
          );
          // Fallback to mock
          askTalyntra(prompt, profile).then((fallback) => {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === aiId ? { ...msg, text: fallback } : msg
              )
            );
            geminiHistory.current.push({ role: 'model', parts: [{ text: fallback }] });
            setStreamingId(null);
            setBusy(false);
          });
        },
      });
    } else {
      // MOCK AI — Offline fallback
      const reply = await askTalyntra(prompt, profile);
      setMessages((m) => [
        ...m,
        { id: uid(), role: 'ai', text: reply, timestamp: now },
      ]);
      geminiHistory.current.push({ role: 'model', parts: [{ text: reply }] });
      setBusy(false);
    }
  };

  return (
    <div className="chat">
      <Sidebar />

      <section className="chat__main">
        {/* Connection Status + Suggestions */}
        <div className="chat-suggestions">
          <div className={`ai-status-pill ${hasApiKey() ? 'ai-status--live' : 'ai-status--demo'}`}>
            <span className="status-dot" />
            {hasApiKey() ? 'Live AI (Gemini)' : 'Demo Mode'}
          </div>
          {!hasApiKey() && (
            <button className="chat-suggestion-chip" onClick={() => nav('/settings')}>
              ⚙️ Connect API Key
            </button>
          )}
          {history.slice(0, 3).map((item, idx) => (
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
            placeholder="Ask about your career, skills, interviews, or salary…"
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
