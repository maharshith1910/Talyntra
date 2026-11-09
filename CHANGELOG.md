# Talyntra Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [2.0.0] — 2026-11-10 · "Live AI & Full Career Intelligence"

### 🤖 Real-Time AI Integration
- **Google Gemini 2.0 Flash** streaming integration via `src/lib/geminiAI.ts`
- **Token-by-token streaming** display in Chat and Questionnaire pages (SSE-based `streamGenerateContent`)
- **Profile-aware context injection**: AI receives candidate name, target role, experience, detected skills, and missing skills
- **Conversation memory**: Full multi-turn history maintained across chat session via `geminiHistory` ref
- **Graceful fallback**: Automatically falls back to offline mock responses on API errors or missing key
- **API key management**: Save, validate, and remove Gemini API keys via Settings page

### 🔐 User Authentication System
- **Register & Login** (`src/lib/auth.ts`): Email + password auth with LocalStorage persistence
- **Multi-user support**: Multiple accounts can register and log in independently
- **Session management**: Persistent sessions with `AuthSession` type, logout functionality
- **Demo account**: One-click quick-start with pre-filled demo credentials on Login page
- **Auth guards**: Login page redirects authenticated users; sidebar shows logout button

### 🆕 New Pages & Components
- **Settings Page** (`/settings`): Gemini API key input with show/hide toggle, validate & save, remove key, account info display, session timestamps, logout, reset all data, "About Talyntra" section
- **Enhanced Login** (`/login`): Register/Login mode toggle, password fields, demo account button, error display, ESC → home navigation
- **Enhanced Sidebar**: 8 navigation items including Settings gear icon, AI connection status dot (green = live, gray = demo), logout button, ESC key → back navigation

### 🎨 Typography & UI Overhaul
- **ChatGPT/Claude-style font sizing**: Base 14px, small 13px, medium 15px, large 18px, heading 24px
- **Reduced padding and margins** across all panels for denser, cleaner information display
- **Updated CSS variables**: `--fs-base`, `--fs-sm`, `--fs-md`, `--fs-lg`, `--fs-xl`, `--fs-2xl`
- **AI status indicators**: Connection status pills, streaming cursor animation, status dots
- **Settings page styles**: Card layout, field rows, help sections, toast notifications

### 🏗 Architecture Changes
- **State store rewrite** (`src/lib/store.tsx`): Added `auth: AuthSession | null`, `aiConnected: boolean`, `setAuth()`, `refreshAiStatus()` to React Context
- **State key upgraded**: `talyntra_state_v2` → `talyntra_state_v3` to avoid conflicts with v1 data
- **9 routes** in App.tsx (was 8): Added `/settings`
- **Gemini conversation builder**: `buildContents()` injects career system prompt + profile context as opening messages

---

## [2.0.0] — Interface System (carried from initial build)

### 6-Interface Career Analysis System

#### Interface 1 · `/upload` — CV Upload & Basic Details
- Animated dropzone scanning simulation with spinner, file badge, and green confirmation checkmark
- 5-field profile form: Full Name, Target Role, Experience Level, Location, LinkedIn URL
- `Analyze Skill Set` button executes heuristic matching and routes to Interface 2

#### Interface 2 · `/skills` — Skill Set Output
- Dynamic animated proficiency gauges with percentage mastery
- Taxonomy grouping: All, Technical, Soft Skills, Domain Knowledge filters
- Role match badge with real-time alignment percentage

#### Interface 2.2 · `/skills?tab=missing` — Missing Competencies
- Priority badges: Critical (red), Important (amber), Nice-to-have (blue)
- 5-star difficulty rating scale for each missing skill
- Contextual rationale explaining why hiring managers evaluate each competency

#### Interface 2.3 · `/questionnaire` — Conversational Questionnaire & Benchmark
- 5-step interactive quiz (work environment, tech focus, learning habits, time commitment, 2-year vision)
- Split-screen AI chatbot with real Gemini streaming (or mock fallback)
- Pinned benchmark job description (Senior Frontend Engineer at TechCorp)

#### Interface 3 · `/validation` — Profile Validation Output
- Animated SVG circular gauge (0–100% overall match)
- 4-axis dimensional metrics: Technical, Soft Skills, Experience, Market Demand
- Strengths vs. concerns comparative analysis

#### Interface 4 · `/roadmap` — Gap-Closing Roadmap
- "Bridge through proof of execution" ideology card
- 4-phase vertical timeline (Months 1-2, 3-4, 5-6, 7+)
- Interactive checklists with dynamic phase completion percentages
- Curated resource library with external links
- PDF export notification

---

## [1.0.0] — 2026-11-09 · "Figma Port"

- Initial Figma layout implementation: Home, Login, Upload stub, and Chat stub.
- Diamond radial aurora breathing background.
- Primary indigo buttons (`#4f46e5`) and deep variant (`#09045c`).
