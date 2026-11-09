import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Button from '../components/Button';
import { useStore } from '../lib/store';
import { askTalyntra, generateValidation, Message, QuestionnaireAnswer } from '../lib/mockAI';
import { streamChat, buildProfileContext, hasApiKey, GeminiMessage } from '../lib/geminiAI';

interface QuestionDef {
  id: number;
  title: string;
  subtitle: string;
  type: 'single' | 'multi' | 'text';
  options?: string[];
}

const QUESTIONS: QuestionDef[] = [
  {
    id: 1,
    title: 'What type of work environment excites you most?',
    subtitle: 'This helps calibrate which organizational competencies carry the most weight.',
    type: 'single',
    options: [
      'High-growth Startup (High autonomy, rapid iteration, wearing multiple hats)',
      'Tier-1 Enterprise / Tech Giant (Deep scale, formal governance, specialization)',
      'Remote-First Global Team (Async documentation, independent execution)',
      'Consultancy / Digital Agency (Diverse client stacks, rapid switching)',
    ],
  },
  {
    id: 2,
    title: 'Which technical areas are you most interested in mastering?',
    subtitle: 'Select all that apply — we will prioritize closing gaps in these topics first.',
    type: 'multi',
    options: [
      'High-Performance Frontend & Web Vitals',
      'Distributed Systems & Event-Driven Architecture',
      'System Design & Microservices Scalability',
      'Automated Testing & End-to-End Reliability',
      'AI / LLM Integration & Modern Agentic Workflows',
      'Cloud Native Infrastructure (Kubernetes / AWS / CI/CD)',
    ],
  },
  {
    id: 3,
    title: 'What is your preferred learning and upskilling style?',
    subtitle: 'We craft your gap-closing roadmap based on how you retain concepts best.',
    type: 'single',
    options: [
      'Project-Driven: Building real production apps with zero hand-holding',
      'Deep Dive Video Courses & Guided Walkthroughs (e.g. Frontend Masters)',
      'Reading Official Documentation, RFCs, and Architecture Books',
      'Interactive Coding Challenges & Pair Mentorship',
    ],
  },
  {
    id: 4,
    title: 'How many hours per week can you realistically dedicate to upskilling?',
    subtitle: 'Realistic timelines prevent burnout and guarantee consistent momentum.',
    type: 'single',
    options: [
      '3 - 5 hours / week (Steady weekend pace)',
      '6 - 10 hours / week (Balanced weeknight + weekend plan)',
      '12 - 20 hours / week (Aggressive career pivot mode)',
      '20+ hours / week (Full-time intensive preparation)',
    ],
  },
  {
    id: 5,
    title: 'What is your primary 2-year career vision?',
    subtitle: 'Describe the title, compensation, or impact you want to achieve.',
    type: 'text',
  },
];

export default function Questionnaire() {
  const nav = useNavigate();
  const { state, addQuestionnaireAnswer, setValidation } = useStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedSingle, setSelectedSingle] = useState<string>('');
  const [selectedMulti, setSelectedMulti] = useState<string[]>([]);
  const [textAnswer, setTextAnswer] = useState<string>('');

  const [validating, setValidating] = useState(false);

  // Conversational Chatbot State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      role: 'ai',
      text: `Hello ${
        state.profile.fullName ? state.profile.fullName.split(' ')[0] : 'there'
      }! I'm Talyntra's conversational career intelligence engine.\n\nI've matched your profile against our **Benchmark Role: Senior ${
        state.profile.targetRole || 'Software Professional'
      }**. Complete the 5 questions on the left, or ask me anything directly below!`,
      timestamp: 'Just now',
    },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [busy, setBusy] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const geminiHistory = useRef<GeminiMessage[]>([]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  // ESC → go back one step; if at step 0, go to /skills
  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (currentStep > 0) {
        setCurrentStep((c) => c - 1);
      } else {
        nav('/skills?tab=missing');
      }
    }
  }, [currentStep, nav]);

  useEffect(() => {
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [handleEsc]);

  const currentQ = QUESTIONS[currentStep];

  // Sync selected answers when moving steps
  useEffect(() => {
    const existing = state.questionnaire.find((q) => q.questionId === currentQ.id);
    if (existing) {
      if (Array.isArray(existing.answer)) {
        setSelectedMulti(existing.answer);
      } else {
        setSelectedSingle(existing.answer);
        setTextAnswer(existing.answer);
      }
    } else {
      setSelectedSingle('');
      setSelectedMulti([]);
      setTextAnswer('');
    }
  }, [currentStep, currentQ.id, state.questionnaire]);

  const handleNext = () => {
    let answerValue: string | string[] = '';
    if (currentQ.type === 'single') answerValue = selectedSingle;
    else if (currentQ.type === 'multi') answerValue = selectedMulti;
    else answerValue = textAnswer;

    if (
      (currentQ.type === 'single' && !selectedSingle) ||
      (currentQ.type === 'multi' && selectedMulti.length === 0)
    ) {
      alert('Please select an option to continue.');
      return;
    }

    const recorded: QuestionnaireAnswer = {
      questionId: currentQ.id,
      question: currentQ.title,
      answer: answerValue,
    };
    addQuestionnaireAnswer(recorded);

    // AI reacts in chat
    const aiNote =
      currentQ.type === 'multi'
        ? `Noted your interest in: ${(answerValue as string[]).slice(0, 2).join(' and ')}. I'm factoring these directly into your validation benchmark.`
        : `Got it: "${typeof answerValue === 'string' ? answerValue.slice(0, 50) : ''}…". Next question ready!`;

    setMessages((prev) => [
      ...prev,
      {
        id: `q-${Date.now()}`,
        role: 'ai',
        text: aiNote,
        timestamp: 'Just now',
      },
    ]);

    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep((c) => c + 1);
    }
  };

  const handleFinishAndValidate = async () => {
    let answerValue: string | string[] = textAnswer || 'Reach Staff/Senior level and lead major architectures';
    if (currentQ.type === 'text') {
      const recorded: QuestionnaireAnswer = {
        questionId: currentQ.id,
        question: currentQ.title,
        answer: answerValue,
      };
      addQuestionnaireAnswer(recorded);
    }

    setValidating(true);
    try {
      const allAnswers = [...state.questionnaire];
      const result = await generateValidation(state.profile, allAnswers);
      setValidation(result);
      nav('/validation');
    } catch (e) {
      console.error(e);
      nav('/validation');
    } finally {
      setValidating(false);
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const prompt = inputVal.trim();
    if (!prompt || busy) return;

    setInputVal('');
    setBusy(true);

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text: prompt, timestamp: now };
    setMessages((m) => [...m, userMsg]);

    geminiHistory.current.push({ role: 'user', parts: [{ text: prompt }] });

    if (hasApiKey()) {
      const aiId = `a-${Date.now()}`;
      setMessages((m) => [...m, { id: aiId, role: 'ai', text: '', timestamp: now }]);
      const profileCtx = buildProfileContext(state.profile, state.skills);

      await streamChat(prompt, profileCtx, geminiHistory.current.slice(0, -1), {
        onToken: (token) => {
          setMessages((m) => m.map((msg) => msg.id === aiId ? { ...msg, text: msg.text + token } : msg));
        },
        onComplete: (fullText) => {
          geminiHistory.current.push({ role: 'model', parts: [{ text: fullText }] });
          setBusy(false);
        },
        onError: () => {
          askTalyntra(prompt, state.profile).then((fallback) => {
            setMessages((m) => m.map((msg) => msg.id === aiId ? { ...msg, text: fallback } : msg));
            setBusy(false);
          });
        },
      });
    } else {
      const reply = await askTalyntra(prompt, state.profile);
      const aiMsg: Message = { id: `a-${Date.now()}`, role: 'ai', text: reply, timestamp: now };
      setMessages((m) => [...m, aiMsg]);
      geminiHistory.current.push({ role: 'model', parts: [{ text: reply }] });
      setBusy(false);
    }
  };

  return (
    <div className="chat">
      <Sidebar />

      <main className="questionnaire-layout">
        {/* Left Side: 5-Step Questionnaire */}
        <div className="q-left-pane">
          <div className="q-header">
            <span className="skills-pretitle">INTERFACE 2.3 • CONVERSATIONAL QUESTIONNAIRE</span>
            <h2>Personalize Your Career Trajectory</h2>
            <p>Tell us what drives you, and let our validator benchmark your skills.</p>

            {/* Step Progress Bar */}
            <div className="q-progress-bar">
              <div
                className="q-progress-fill"
                style={{ width: `${((currentStep + 1) / QUESTIONS.length) * 100}%` }}
              />
            </div>
            <div className="q-step-indicator">
              Question {currentStep + 1} of {QUESTIONS.length}
            </div>
          </div>

          <div className="q-card glass page-enter">
            <h3 className="q-title">{currentQ.title}</h3>
            <p className="q-subtitle">{currentQ.subtitle}</p>

            {/* Single Select */}
            {currentQ.type === 'single' && (
              <div className="q-options">
                {currentQ.options?.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`q-option-btn ${selectedSingle === opt ? 'q-option-btn--active' : ''}`}
                    onClick={() => setSelectedSingle(opt)}
                  >
                    <span className="q-radio-dot" />
                    <span>{opt}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Multi Select */}
            {currentQ.type === 'multi' && (
              <div className="q-options">
                {currentQ.options?.map((opt) => {
                  const active = selectedMulti.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      className={`q-option-btn ${active ? 'q-option-btn--active' : ''}`}
                      onClick={() => {
                        setSelectedMulti((prev) =>
                          active ? prev.filter((o) => o !== opt) : [...prev, opt]
                        );
                      }}
                    >
                      <span className={`q-check-box ${active ? 'q-check-box--checked' : ''}`}>
                        {active ? '✓' : ''}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Text Input */}
            {currentQ.type === 'text' && (
              <div style={{ marginTop: 16 }}>
                <textarea
                  className="field q-textarea"
                  rows={4}
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="e.g. In 2 years I want to lead frontend architecture at a Series-B startup, earning $150k+ while mentoring a team of 4 engineers."
                />
              </div>
            )}

            {/* Controls */}
            <div className="q-actions">
              {currentStep > 0 && (
                <Button variant="glass" onClick={() => setCurrentStep((c) => c - 1)}>
                  ← Back
                </Button>
              )}

              {currentStep < QUESTIONS.length - 1 ? (
                <Button onClick={handleNext}>Next Question →</Button>
              ) : (
                <Button onClick={handleFinishAndValidate} disabled={validating}>
                  {validating ? (
                    <>
                      <div className="spinner-sm" /> Running Validation…
                    </>
                  ) : (
                    'Validate Skills (Interface 3) →'
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Chatbot + Dummy Job Description Benchmark */}
        <div className="q-right-pane">
          {/* Dummy Job Description Card (matching prompt) */}
          <div className="job-benchmark-card glass">
            <div className="job-badge">BENCHMARK JOB PROFILE</div>
            <h4 style={{ margin: '6px 0 2px', fontSize: 18, color: '#fff' }}>
              Senior {state.profile.targetRole || 'Frontend Engineer'}
            </h4>
            <div style={{ fontSize: 13, color: '#7ef0ec', marginBottom: 8 }}>
              TechCorp Innovations Inc. • Remote / Hybrid • $125k – $165k
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.4 }}>
              <strong>Core Requirements:</strong> 3+ yrs experience, high-performance web vitals,
              CI/CD automation, testing coverage &gt;80%, and system architecture ownership.
            </p>
          </div>

          {/* Chat Stream */}
          <div className="q-chat-stream" role="log">
            {messages.map((m) => (
              <div key={m.id} className={`bubble bubble--${m.role}`}>
                <div style={{ whiteSpace: 'pre-line' }}>{m.text}</div>
                <span className="bubble-ts">{m.timestamp}</span>
              </div>
            ))}
            {busy && (
              <div className="bubble bubble--ai typing">
                <i />
                <i />
                <i />
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Composer */}
          <form className="composer q-composer" onSubmit={handleSendMessage}>
            <span aria-hidden>+</span>
            <input
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ask Talyntra AI about this role or your skills…"
            />
            <button type="submit" className="composer-send" disabled={busy}>
              Send
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

