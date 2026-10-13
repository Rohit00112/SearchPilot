-- SearchPilot ACTIVE DATABASE: bootstrap schema (v0), deliberately small.
-- New Docker volumes apply the additive files in db/migrations/ after this file.
-- Existing volumes use `npm run db:migrate`; never apply replica/schema.sql here.
-- See db/SCHEMA.md for the 12-table installed model vs. future blueprint.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  domain VARCHAR(253) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  keyword VARCHAR(200) NOT NULL,
  position INTEGER CHECK (position >= 1 AND position <= 1000),
  volume INTEGER CHECK (volume >= 0),
  difficulty INTEGER CHECK (difficulty BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, keyword)
);

CREATE INDEX IF NOT EXISTS idx_keywords_project_id ON keywords(project_id);

CREATE TABLE IF NOT EXISTS audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  domain VARCHAR(253) NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  checks JSONB NOT NULL DEFAULT '[]'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audits_project_checked ON audits(project_id, checked_at DESC);
