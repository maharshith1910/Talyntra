-- Talyntra Supabase Schema: Evidence Graph, Vector Search, and Multi-Tenancy
-- Enable pgvector extension for semantic role benchmarking & skill matching
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. User Profiles (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    target_role TEXT NOT NULL,
    experience_level TEXT NOT NULL,
    location TEXT,
    linkedin_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 2. Stored Resumes / CV Artifacts
CREATE TABLE IF NOT EXISTS public.resume_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL, -- Path in Supabase Storage bucket 'resumes'
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    raw_extracted_text TEXT,
    parsed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 3. Evidence Nodes (Atomic verifiable proof items)
CREATE TYPE evidence_source_type AS ENUM (
    'resume_bullet',
    'project_artifact',
    'github_commit',
    'credential',
    'verified_task'
);

CREATE TABLE IF NOT EXISTS public.evidence_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    resume_artifact_id UUID REFERENCES public.resume_artifacts(id) ON DELETE SET NULL,
    source_type evidence_source_type NOT NULL,
    raw_text TEXT NOT NULL,
    source_context TEXT NOT NULL,
    demonstrated_date DATE NOT NULL,
    base_weight NUMERIC(3, 2) NOT NULL CHECK (base_weight >= 0.0 AND base_weight <= 1.0),
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 4. Skill Claims
CREATE TYPE skill_category AS ENUM ('Technical', 'Soft', 'Domain');
CREATE TYPE confidence_status AS ENUM ('verified', 'moderate', 'weak', 'insufficient_evidence');

CREATE TABLE IF NOT EXISTS public.skill_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    category skill_category NOT NULL,
    half_life_months INT NOT NULL DEFAULT 24,
    confidence_score INT CHECK (confidence_score >= 0 AND confidence_score <= 100),
    confidence_status confidence_status NOT NULL DEFAULT 'insufficient_evidence',
    time_decay_factor NUMERIC(3, 2) NOT NULL DEFAULT 1.0,
    last_demonstrated_date DATE,
    mathematical_reasoning TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE(user_id, skill_name)
);

-- 5. Skill Claim <-> Evidence Node Join Table
CREATE TABLE IF NOT EXISTS public.skill_evidence_links (
    skill_claim_id UUID NOT NULL REFERENCES public.skill_claims(id) ON DELETE CASCADE,
    evidence_node_id UUID NOT NULL REFERENCES public.evidence_nodes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    PRIMARY KEY (skill_claim_id, evidence_node_id)
);

-- 6. Role Benchmarks with Vector Embeddings (768-dim for Gemini embeddings)
CREATE TABLE IF NOT EXISTS public.role_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_title TEXT NOT NULL,
    seniority_tier TEXT NOT NULL,
    market_demand_index INT NOT NULL CHECK (market_demand_index >= 0 AND market_demand_index <= 100),
    typical_salary_min INT,
    typical_salary_max INT,
    required_skills JSONB NOT NULL DEFAULT '[]'::JSONB,
    role_embedding vector(768),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 7. Missing Skills & Learning-ROI
CREATE TABLE IF NOT EXISTS public.user_skill_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    category skill_category NOT NULL,
    importance TEXT NOT NULL,
    roles_unlocked_count INT NOT NULL DEFAULT 1,
    estimated_effort_hours INT NOT NULL DEFAULT 20,
    roi_score NUMERIC(5, 3) NOT NULL,
    why_it_matters TEXT NOT NULL,
    difficulty_rating INT NOT NULL CHECK (difficulty_rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 8. Roadmap Action Milestones (Auto-Verification & Feedback Loop)
CREATE TABLE IF NOT EXISTS public.user_roadmap_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    phase_number INT NOT NULL,
    title TEXT NOT NULL,
    verifies_skill_name TEXT,
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    completed_at TIMESTAMPTZ,
    resulting_evidence_node_id UUID REFERENCES public.evidence_nodes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 9. Row Level Security (RLS) Multi-Tenancy Enforcement
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_evidence_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skill_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roadmap_tasks ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view and update their own profile
CREATE POLICY "Users can manage own profile"
    ON public.profiles FOR ALL
    USING (auth.uid() = id);

-- Resume Artifacts: Users can view and manage their own resumes
CREATE POLICY "Users can manage own resumes"
    ON public.resume_artifacts FOR ALL
    USING (auth.uid() = user_id);

-- Evidence Nodes: Users can view and manage own evidence
CREATE POLICY "Users can manage own evidence nodes"
    ON public.evidence_nodes FOR ALL
    USING (auth.uid() = user_id);

-- Skill Claims: Users can view and manage own claims
CREATE POLICY "Users can manage own skill claims"
    ON public.skill_claims FOR ALL
    USING (auth.uid() = user_id);

-- Roadmap Tasks: Users can manage own roadmap
CREATE POLICY "Users can manage own roadmap tasks"
    ON public.user_roadmap_tasks FOR ALL
    USING (auth.uid() = user_id);
