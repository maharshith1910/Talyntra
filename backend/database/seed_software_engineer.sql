-- Seed Data for Single Role Slice: Software Engineer
-- Populates the 6 canonical benchmark skills with default half-lives

INSERT INTO public.skills (slug, name, category, default_half_life_days, benchmark_weight)
VALUES
    ('typescript-javascript', 'TypeScript & Modern JavaScript', 'Technical', 730, 1.00),
    ('web-architecture-apis', 'Web Architecture & REST/GraphQL APIs', 'Technical', 730, 0.95),
    ('automated-testing', 'Automated Testing (Unit & E2E)', 'Technical', 730, 0.90),
    ('system-design-scalability', 'System Design & Scalability Principles', 'Technical', 1460, 0.95),
    ('databases-sql', 'Databases & Relational Schema Design', 'Technical', 1460, 0.90),
    ('ci-cd-devops', 'CI/CD Pipelines & Containerization', 'Domain', 730, 0.85)
ON CONFLICT (slug) DO UPDATE
SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    default_half_life_days = EXCLUDED.default_half_life_days,
    benchmark_weight = EXCLUDED.benchmark_weight;
