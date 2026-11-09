# Talyntra Interface Specification & Workflow Guide

This document details every screen in the user journey, covering the complete 9-page application with all micro-interactions and keyboard shortcuts.

---

## Screen Catalog

| Interface | URL Route | Description | Key Features |
|---|---|---|---|
| **Landing** | `/` | Introducing Talyntra hero + Get Started CTAs | Enter key → login |
| **Authentication** | `/login` | Register/Login with email & password | Mode toggle, demo account, ESC → home |
| **Interface 1** | `/upload` | CV Upload + Basic Details form | Dropzone click/drag, parse animation, ESC → login |
| **Interface 2** | `/skills` | Skill Set Output & Proficiencies | Category filters, animated bars |
| **Interface 2.2** | `/skills?tab=missing` | Missing Competencies & Learning Curves | Priority badges, 5-star difficulty |
| **Interface 2.3** | `/questionnaire` | 5-Step Quiz + AI Chatbot + Job Benchmark | Split screen, real Gemini streaming |
| **Interface 3** | `/validation` | Circular Score Gauge & 4-Axis Breakdown | SVG animation, comparative lists |
| **Interface 4** | `/roadmap` | 4-Phase Gap-Closing Roadmap & Resources | Interactive checklists, PDF export |
| **AI Chat** | `/chat` | Full-screen Conversational Assistant | Streaming tokens, suggestion chips |
| **Settings** | `/settings` | API Key, Account & Preferences | Validate key, logout, reset data |

---

## Detailed Interface Walkthroughs

### 1. Landing Page (`/`)
- **Brand Hero**: Large Serif headline *"Introducing Talyntra…"*
- **Mission Statement**: How Talyntra transforms career progression
- **Glass CTA Panel**: *"Get Started"* with Login and Sign Up buttons
- **Keyboard**: `Enter` key navigates directly to `/login`

### 2. Login Page (`/login`)
- **Mode Toggle**: Switch between **Sign In** and **Create Account** modes
- **Form Fields**:
  - Full Name (register mode only)
  - Email address
  - Password (min 4 characters)
- **Demo Account**: Quick-start button that auto-fills `demo@talyntra.ai` / `demo1234`
- **Error Display**: Inline error messages for validation failures and duplicate accounts
- **Auth Redirect**: Already-authenticated users are automatically redirected to `/upload`
- **Keyboard**: `Enter` submits form, `ESC` returns to home

### 3. Interface 1: CV Upload & Basic Details (`/upload`)
- **Header**: Talyntra logo + *"Career Skill Analyzer"*
- **Drag-and-Drop Dropzone**:
  - Accepts `.pdf`, `.doc`, `.docx`
  - Entire zone is clickable (opens file picker)
  - On file drop/select: activates animated spinner with *"Analyzing CV structure & skills…"*
  - Success state: green checkmark `✓` + file name + *"Analyzed • Ready for validation"*
- **Basic Details Form Card**:
  - Full Name (required)
  - Target Role (required)
  - Experience Level (required)
  - Location (optional)
  - LinkedIn Profile (optional)
- **Primary CTA**: *"Analyze Skill Set →"* — runs AI extraction and navigates to Interface 2
- **Keyboard**: `ESC` navigates to `/login`
- **Back Link**: "← Back to Login" text link at top

### 4. Interface 2: Skill Set Output (`/skills`)
- **Top Metric Header**: Candidate name, target role, circular overall match percentage
- **Tab Bar**: Switch between **Detected Skills** and **Missing Skills** tabs
- **Category Filter Chips**: All, Technical, Soft Skills, Domain Knowledge
- **Skill Proficiency Cards**:
  - Skill name + percentage value
  - Animated horizontal progress bar with color-coded gradients (cyan ≥80%, indigo ≥60%, amber <60%)
  - Category pill badge
- **Banner CTA**: Link to examine detected gaps

### 5. Interface 2.2: Missing Skills (`/skills?tab=missing`)
- **Importance Badges**:
  - 🔴 **Critical**: Must-have competencies for competitive screens
  - 🟡 **Important**: Standard expectations for mid/senior engineers
  - 🔵 **Nice-to-have**: Differentiators for senior candidates
- **Learning Curve Rating**: 1–5 star indicators quantifying expected time investment
- **Contextual Justification**: Explanation of why this skill matters in interviews
- **Banner CTA**: *"Start Questionnaire & Chatbot (2.3) →"*

### 6. Interface 2.3: Questionnaire & AI Chat (`/questionnaire`)
- **Split Screen Layout**:
  - **Left Pane (55% width)**:
    - Step-by-step 5-question wizard with slide transitions
    - Linear progress meter (`Question X of 5`)
    - Q1: Work Environment (Startup, Enterprise, Remote-first, Agency)
    - Q2: Technical Focus Areas (multi-select interactive chips)
    - Q3: Preferred Learning Habits (Projects, Video Courses, Books/RFCs, Mentorship)
    - Q4: Weekly Time Commitment (3–5 hrs, 6–10 hrs, 12–20 hrs, 20+ hrs)
    - Q5: Primary 2-Year Vision (freeform textarea)
  - **Right Pane (45% width)**:
    - Pinned **Benchmark Job Description** (*Senior Frontend Engineer at TechCorp Innovations*)
    - Real-time AI chat stream (Gemini streaming when API key available, mock fallback)
    - Bottom message composer to query the AI during the quiz
- **Primary CTA**: *"Validate Skills (Interface 3) →"*
- **Keyboard**: `ESC` goes back one question step or returns to `/skills`

### 7. Interface 3: Validation Output (`/validation`)
- **Hero Validation Banner**:
  - Animated SVG circular gauge (0–100% overall match)
  - Executive summary paragraph
- **2×2 Score Grid**:
  1. Technical Mastery Score
  2. Soft Skills & Leadership Score
  3. Experience Alignment Score
  4. Market Demand Index
- **Comparative Lists**:
  - *Key Validated Strengths* (green checkmarks)
  - *Identified Gaps & Vulnerabilities* (amber caution warnings)
- **Primary CTA**: *"Explore Gap-Closing Roadmap (Interface 4) →"*

### 8. Interface 4: Gap-Closing Roadmap (`/roadmap`)
- **Ideology Card**: *"Bridge Through Proof of Execution"*
- **4-Phase Vertical Timeline**:
  - Phase 01: Foundation & Core Alignment (Months 1–2)
  - Phase 02: Real-World Production Build (Months 3–4)
  - Phase 03: System Design & Social Proof (Months 5–6)
  - Phase 04: Market Launch & Offer Negotiation (Month 7+)
- **Interactive Checklists**: Clickable checkboxes updating phase completion percentages
- **Curated Resource Library**: System Design primers, books, testing courses, engineering communities
- **Export Roadmap PDF**: Branded file download notification
- **Chat CTA**: Routes directly to conversational assistant

### 9. AI Chat (`/chat`)
- **Connection Status Pill**: Green "Live AI (Gemini)" or gray "Demo Mode"
- **Suggestion Chips**: Pre-filled prompts (skill gaps, resume bullets, salary, mock interview)
- **Connect API Key Chip**: Shown when no API key — links to Settings
- **Streaming Messages**: Token-by-token display with cursor animation (`▍`)
- **Typing Indicator**: Three-dot animation while waiting for response
- **Message Format**: Sender label ("Talyntra-AI"), message text, timestamp
- **Fallback**: On API error, shows error message then falls back to mock response
- **Keyboard**: `Enter` sends message

### 10. Settings (`/settings`)
- **Gemini AI Connection Card**:
  - Connection status indicator (online/offline with colored dot)
  - API key input with show/hide toggle (eye emoji button)
  - Save & Verify button (validates key against Gemini API)
  - Remove Key button
  - Success/error toast notifications
  - Step-by-step instructions for getting a free API key
- **Account Card**:
  - User avatar (initial circle), full name, email
  - Session start timestamp
  - Sign Out button
  - Reset All Data button (with confirmation dialog)
- **About Card**: Version info and tagline
