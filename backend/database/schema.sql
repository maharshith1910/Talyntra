-- Talyntra Supabase Schema: Single Vertical Slice (Software Engineer)
-- Tables: profiles, resumes, skills, claims, evidence, claim_evidence, confidence_scores, roadmap_tasks
-- All user tables enforce Row-Level Security (RLS) so users only access their own rows.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles (1:1 with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    target_role TEXT NOT NULL DEFAULT 'Software Engineer',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Resumes
CREATE TABLE IF NOT EXISTS public.resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Skills (Canonical skill taxonomy)
CREATE TABLE IF NOT EXISTS public.skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,             -- e.g. 'automated-testing'
    name TEXT NOT NULL,                    -- e.g. 'Automated Testing'
    category TEXT NOT NULL CHECK (category IN ('Technical', 'Soft', 'Domain')),
    default_half_life_days INT NOT NULL DEFAULT 730, -- 730 (2 yrs) or 1460 (4 yrs)
    benchmark_weight NUMERIC(3, 2) NOT NULL DEFAULT 1.00
);

-- 4. Evidence (Atomic verifiable proof items)
CREATE TABLE IF NOT EXISTS public.evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('resume_bullet', 'project_artifact', 'verified_task')),
    raw_text TEXT NOT NULL,                -- Verbatim quote from resume/deliverable
    source_context TEXT NOT NULL,          -- e.g. "Software Engineer @ Acme (2023 - 2024)"
    demonstrated_at DATE NOT NULL,         -- Date of achievement for time decay
    base_weight NUMERIC(3, 2) NOT NULL CHECK (base_weight BETWEEN 0.0 AND 1.0),
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Claims (User claim of possessing a skill)
CREATE TABLE IF NOT EXISTS public.claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    claimed_level INT CHECK (claimed_level BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, skill_id)
);

-- Join Table: Claims <-> Evidence
CREATE TABLE IF NOT EXISTS public.claim_evidence (
    claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
    evidence_id UUID NOT NULL REFERENCES public.evidence(id) ON DELETE CASCADE,
    PRIMARY KEY (claim_id, evidence_id)
);

-- 6. Confidence Scores (Deterministic evaluation with time-decay audit fields)
CREATE TABLE IF NOT EXISTS public.confidence_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID UNIQUE NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
    last_demonstrated_at DATE,
    days_elapsed INT NOT NULL DEFAULT 0,
    half_life_days INT NOT NULL,
    decay_factor NUMERIC(4, 3) NOT NULL,   -- 2^(-days_elapsed / half_life_days)
    raw_aggregate_score NUMERIC(5, 2) NOT NULL,
    final_score INT CHECK (final_score BETWEEN 0 AND 100), -- NULL if insufficient_evidence
    status TEXT NOT NULL CHECK (status IN ('verified', 'moderate', 'weak', 'insufficient_evidence')),
    reasoning TEXT NOT NULL,
    calculated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. Roadmap Tasks (Closing gaps with auto-verification)
CREATE TABLE IF NOT EXISTS public.roadmap_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    action_prompt TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    completed_at TIMESTAMPTZ,
    resulting_evidence_id UUID REFERENCES public.evidence(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. Row Level Security (RLS) Multi-Tenancy Enforcement
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confidence_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

-- Skills are globally readable by all authenticated users
CREATE POLICY "Skills are readable by all"
    ON public.skills FOR SELECT
    USING (true);

-- User-owned tables enforce auth.uid() = user_id
CREATE POLICY "Users access own profile"
    ON public.profiles FOR ALL
    USING (auth.uid() = id);

CREATE POLICY "Users access own resumes"
    ON public.resumes FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users access own evidence"
    ON public.evidence FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users access own claims"
    ON public.claims FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users access own claim_evidence"
    ON public.claim_evidence FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.claims c
            WHERE c.id = claim_evidence.claim_id AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users access own confidence_scores"
    ON public.confidence_scores FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.claims c
            WHERE c.id = confidence_scores.claim_id AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users access own roadmap"
    ON public.roadmap_tasks FOR ALL
    USING (auth.uid() = user_id);
