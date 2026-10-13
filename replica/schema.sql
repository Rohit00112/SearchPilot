-- SearchPilot future PostgreSQL architecture blueprint (PostgreSQL 17+).
--
-- GREENFIELD ONLY. This is NOT a migration and MUST NOT be executed against
-- the running SearchPilot database. Current app/api routes rely on the existing
-- db/schema.sql (projects, keywords, audits); preserve those tables and data.
-- A separate, reviewed, backwards-compatible migration + backfill + API
-- cutover plan is required before adopting any of these tables in production.
-- Execute this file only in a newly created disposable or future database.
--
-- Original SearchPilot schema inferred from replica/recon.md. Research content
-- is functional inspiration; no proprietary vendor dataset, index or schema.
-- 28 normalized tables cover workspace sharing, keyword lists and campaigns,
-- rank observations, crawls/issues, backlinks, reports, and source-labeled KPIs.
--
-- SECURITY CONTRACT:
--   1. API must authenticate each caller, and SET LOCAL app.user_id to that
--      verified UUID on EVERY transaction. Never accept user_id from request
--      parameters, and never expose database connections to untrusted clients.
--   2. Use a non-owner connection role inheriting searchpilot_app. Table
--      owners and SUPERUSER bypass ordinary RLS; never run HTTP queries as
--      the migration/owner role. Do not grant BYPASSRLS to the app role.
--   3. searchpilot_auth is for trusted identity provisioning; ingest is for
--      trusted crawl/ranking/report jobs, never ordinary API requests.
--   4. RLS controls record access and composite FKs prevent cross-workspace
--      foreign references. Request handlers MUST additionally check quotas,
--      URL safety, OAuth scopes, provider licenses, ownership, and rate limits.
--   5. Never store OAuth access/refresh tokens here. token_reference points
--      to an encrypted secret vault and is visible only to workspace owners.
--   6. Collected metrics require explicit source_type/is_sample/data_as_of
--      fields; do not infer genuine rankings or backlinks from demo fixtures.
--
-- One time setup in a separate clean database; role names are privileges,
-- not credentials. Provision login roles and grant membership outside SQL.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='searchpilot_app') THEN
    CREATE ROLE searchpilot_app NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='searchpilot_auth') THEN
    CREATE ROLE searchpilot_auth NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='searchpilot_ingest') THEN
    CREATE ROLE searchpilot_ingest NOLOGIN;
  END IF;
END $$;

-- 01. Identities are provider-verified by the trusted auth service.
CREATE TABLE app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_subject text NOT NULL UNIQUE,
  email text NOT NULL,
  display_name varchar(160) NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','pending')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(btrim(auth_subject)) BETWEEN 3 AND 255),
  CHECK (position('@' IN email)>1)
);
CREATE UNIQUE INDEX uq_app_users_email_ci ON app_users (lower(email));

-- 02. A workspace is a collaboration/tenant boundary.
CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  name varchar(160) NOT NULL,
  slug varchar(90) NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id,slug),
  CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
CREATE INDEX idx_workspaces_owner ON workspaces(owner_id,created_at DESC);

-- 03. Owner is immutable workspaces.owner_id; memberships are editor/viewer.
CREATE TABLE workspace_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('editor','viewer')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,user_id)
);
CREATE INDEX idx_workspace_memberships_user ON workspace_memberships(user_id,status,workspace_id);

-- 04. Invitations carry only a one-way token digest, never a cleartext token.
CREATE TABLE workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  invited_email text NOT NULL CHECK (position('@' IN invited_email)>1),
  role text NOT NULL CHECK (role IN ('editor','viewer')),
  token_sha256 char(64) NOT NULL UNIQUE CHECK (token_sha256 ~ '^[0-9a-f]{64}$'),
  invited_by uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  accepted_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status='accepted') = (accepted_at IS NOT NULL)),
  CHECK (expires_at>created_at)
);
CREATE UNIQUE INDEX uq_workspace_invitations_pending ON workspace_invitations(workspace_id,lower(invited_email)) WHERE status='pending';
CREATE INDEX idx_workspace_invitations_expiry ON workspace_invitations(expires_at) WHERE status='pending';

-- 05. Domain/subdomain/prefix scope can be attached after workspace creation.
CREATE TABLE site_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  display_name varchar(160) NOT NULL,
  hostname varchar(253) NOT NULL,
  protocol text NOT NULL DEFAULT 'https' CHECK (protocol IN ('https','http')),
  scope text NOT NULL DEFAULT 'domain' CHECK (scope IN ('domain','subdomain','url_prefix')),
  url_prefix varchar(2048),
  is_primary boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,id),
  CHECK (hostname=lower(hostname) AND length(hostname)>3 AND hostname !~ '\.\.'),
  CHECK (hostname ~ '^[a-z0-9][a-z0-9.-]*[a-z0-9]$'),
  CHECK ((scope='url_prefix')=(url_prefix IS NOT NULL))
);
CREATE UNIQUE INDEX uq_site_targets_primary ON site_targets(workspace_id) WHERE is_primary;
CREATE INDEX idx_site_targets_host ON site_targets(workspace_id,hostname);

-- 06. Tags apply to sites and can also organize campaigns in later phases.
CREATE TABLE project_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name varchar(70) NOT NULL,
  color_hex char(7) CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,id)
);
CREATE UNIQUE INDEX uq_project_tags_name ON project_tags(workspace_id,lower(name));

-- 07. Tag association keeps explicit identity and timestamps for auditability.
CREATE TABLE site_target_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  site_target_id uuid NOT NULL,
  project_tag_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,site_target_id,project_tag_id),
  FOREIGN KEY (workspace_id,site_target_id) REFERENCES site_targets(workspace_id,id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id,project_tag_id) REFERENCES project_tags(workspace_id,id) ON DELETE CASCADE
);
CREATE INDEX idx_site_target_tags_tag ON site_target_tags(workspace_id,project_tag_id);

-- 08. Keyword research facts are tenant-owned and dated; no vendor index copy.
CREATE TABLE keyword_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  phrase varchar(240) NOT NULL,
  locale varchar(35) NOT NULL DEFAULT 'en',
  country char(2) NOT NULL DEFAULT 'US',
  intent text CHECK (intent IN ('informational','navigational','commercial','transactional','mixed')),
  volume integer CHECK (volume>=0),
  difficulty numeric(5,2) CHECK (difficulty BETWEEN 0 AND 100),
  source_type text NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual','licensed','search_console','sample')),
  source_reference text,
  measured_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,id),
  CHECK (length(btrim(phrase))>0),
  CHECK (country ~ '^[A-Z]{2}$'),
  CHECK (locale ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
  CHECK (source_type='sample' OR source_reference IS NOT NULL OR volume IS NULL)
);
CREATE UNIQUE INDEX uq_keyword_terms_key ON keyword_terms(workspace_id,lower(btrim(phrase)),locale,country);
CREATE INDEX idx_keyword_terms_volume ON keyword_terms(workspace_id,country,volume DESC);

-- 09. Strategy lists are explicit content-planning containers.
CREATE TABLE keyword_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title varchar(160) NOT NULL,
  kind text NOT NULL DEFAULT 'regular' CHECK (kind IN ('regular','strategy')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,id),
  UNIQUE (workspace_id,title)
);

-- 10. Keywords can be reused across many independent lists.
CREATE TABLE keyword_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  keyword_list_id uuid NOT NULL,
  keyword_term_id uuid NOT NULL,
  priority smallint NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  stage text NOT NULL DEFAULT 'idea' CHECK (stage IN ('idea','planned','published','paused')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,keyword_list_id,keyword_term_id),
  FOREIGN KEY (workspace_id,keyword_list_id) REFERENCES keyword_lists(workspace_id,id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id,keyword_term_id) REFERENCES keyword_terms(workspace_id,id) ON DELETE RESTRICT
);
CREATE INDEX idx_keyword_list_items_term ON keyword_list_items(workspace_id,keyword_term_id);

-- 11. Hierarchical topic clusters are constrained to their parent list.
CREATE TABLE keyword_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  keyword_list_id uuid NOT NULL,
  parent_cluster_id uuid,
  topic varchar(200) NOT NULL,
  kind text NOT NULL DEFAULT 'subtopic' CHECK (kind IN ('pillar','subtopic')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,id),
  UNIQUE (workspace_id,keyword_list_id,id),
  FOREIGN KEY (workspace_id,keyword_list_id) REFERENCES keyword_lists(workspace_id,id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id,keyword_list_id,parent_cluster_id)
    REFERENCES keyword_clusters(workspace_id,keyword_list_id,id) ON DELETE RESTRICT,
  CHECK (parent_cluster_id IS NULL OR parent_cluster_id<>id)
);
CREATE INDEX idx_keyword_clusters_parent ON keyword_clusters(workspace_id,keyword_list_id,parent_cluster_id);

-- 12. A tracking campaign fixes engine/device/location as an explicit scope.
CREATE TABLE rank_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  site_target_id uuid NOT NULL,
  name varchar(160) NOT NULL,
  engine text NOT NULL DEFAULT 'google' CHECK (engine IN ('google','bing','other')),
  device text NOT NULL DEFAULT 'desktop' CHECK (device IN ('desktop','mobile','tablet')),
  country char(2) NOT NULL,
  locale varchar(35) NOT NULL DEFAULT 'en',
  city varchar(150),
  postal_code varchar(20),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,id),
  UNIQUE (workspace_id,name),
  FOREIGN KEY (workspace_id,site_target_id) REFERENCES site_targets(workspace_id,id) ON DELETE RESTRICT,
  CHECK (country ~ '^[A-Z]{2}$'),
  CHECK (locale ~ '^[a-z]{2,3}(-[A-Z]{2})?$')
);
CREATE INDEX idx_rank_campaigns_site_status ON rank_campaigns(workspace_id,site_target_id,status);

-- 13. Campaign/keyword junction is also the tenant-safe observation parent.
CREATE TABLE rank_campaign_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  rank_campaign_id uuid NOT NULL,
  keyword_term_id uuid NOT NULL,
  note text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,rank_campaign_id,keyword_term_id),
  FOREIGN KEY (workspace_id,rank_campaign_id) REFERENCES rank_campaigns(workspace_id,id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id,keyword_term_id) REFERENCES keyword_terms(workspace_id,id) ON DELETE RESTRICT
);
CREATE INDEX idx_rank_campaign_keywords_term ON rank_campaign_keywords(workspace_id,keyword_term_id);

-- 14. Rank observations are measured events, never generated sample trends.
CREATE TABLE rank_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  rank_campaign_id uuid NOT NULL,
  keyword_term_id uuid NOT NULL,
  observed_at timestamptz NOT NULL,
  position integer CHECK (position BETWEEN 1 AND 1000),
  outcome text NOT NULL CHECK (outcome IN ('ranked','not_found','unavailable')),
  landing_url varchar(2048),
  serp_features jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(serp_features)='array'),
  source_type text NOT NULL CHECK (source_type IN ('manual','search_console','licensed','sample')),
  source_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,rank_campaign_id,keyword_term_id,observed_at),
  FOREIGN KEY (workspace_id,rank_campaign_id,keyword_term_id)
    REFERENCES rank_campaign_keywords(workspace_id,rank_campaign_id,keyword_term_id) ON DELETE CASCADE,
  CHECK ((outcome='ranked')=(position IS NOT NULL)),
  CHECK (source_type='sample' OR source_reference IS NOT NULL)
);
CREATE INDEX idx_rank_observations_history ON rank_observations(workspace_id,rank_campaign_id,observed_at DESC);

-- 15. Comparison targets have distinct provenance from first-party sites.
CREATE TABLE competitor_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  hostname varchar(253) NOT NULL,
  kind text NOT NULL DEFAULT 'organic' CHECK (kind IN ('organic','backlink','tracking')),
  display_name varchar(160),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,id),
  UNIQUE (workspace_id,hostname,kind),
  CHECK (hostname=lower(hostname) AND hostname ~ '^[a-z0-9][a-z0-9.-]*[a-z0-9]$')
);

-- 16. An audit campaign defines permitted crawl scope and rate ceilings.
CREATE TABLE audit_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  site_target_id uuid NOT NULL,
  name varchar(160) NOT NULL,
  crawl_source text NOT NULL DEFAULT 'sitemap' CHECK (crawl_source IN ('sitemap','website','url_list')),
  page_limit integer NOT NULL DEFAULT 100 CHECK (page_limit BETWEEN 1 AND 100000),
  user_agent text NOT NULL DEFAULT 'SearchPilotAuditBot/1.0',
  obey_robots boolean NOT NULL DEFAULT true CHECK (obey_robots),
  schedule_cron varchar(120),
  schedule_timezone varchar(80) NOT NULL DEFAULT 'UTC',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,id),
  UNIQUE (workspace_id,site_target_id,name),
  FOREIGN KEY (workspace_id,site_target_id) REFERENCES site_targets(workspace_id,id) ON DELETE RESTRICT
);
CREATE INDEX idx_audit_campaigns_status ON audit_campaigns(workspace_id,status);

-- 17. Each crawl is a discrete, comparable run with bounded progress.
CREATE TABLE audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  audit_campaign_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','cancelled')),
  started_at timestamptz,
  finished_at timestamptz,
  pages_crawled integer NOT NULL DEFAULT 0 CHECK (pages_crawled>=0),
  health_score numeric(5,2) CHECK (health_score BETWEEN 0 AND 100),
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,id),
  FOREIGN KEY (workspace_id,audit_campaign_id) REFERENCES audit_campaigns(workspace_id,id) ON DELETE CASCADE,
  CHECK (finished_at IS NULL OR started_at IS NULL OR finished_at>=started_at),
  CHECK (status <> 'completed' OR (finished_at IS NOT NULL AND health_score IS NOT NULL))
);
CREATE INDEX idx_audit_runs_campaign_created ON audit_runs(workspace_id,audit_campaign_id,created_at DESC);

-- 18. URL digests avoid oversized B-tree keys while retaining original URLs.
CREATE TABLE crawled_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  audit_run_id uuid NOT NULL,
  url varchar(2048) NOT NULL,
  url_sha256 bytea GENERATED ALWAYS AS (digest(url,'sha256')) STORED,
  http_status integer CHECK (http_status BETWEEN 100 AND 599),
  response_ms integer CHECK (response_ms>=0),
  page_title text,
  meta_description text,
  canonical_url varchar(2048),
  h1_count integer CHECK (h1_count>=0),
  crawled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,id),
  UNIQUE (workspace_id,audit_run_id,id),
  UNIQUE (workspace_id,audit_run_id,url_sha256),
  FOREIGN KEY (workspace_id,audit_run_id) REFERENCES audit_runs(workspace_id,id) ON DELETE CASCADE,
  CHECK (url ~ '^https?://')
);
CREATE INDEX idx_crawled_pages_status ON crawled_pages(workspace_id,audit_run_id,http_status);

-- 19. Workspace-owned rules have stable codes and human-readable guidance.
CREATE TABLE audit_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code varchar(90) NOT NULL,
  name varchar(160) NOT NULL,
  severity text NOT NULL CHECK (severity IN ('error','warning','notice')),
  explanation text NOT NULL,
  fix_hint text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,id),
  UNIQUE (workspace_id,code),
  CHECK (code ~ '^[a-z][a-z0-9_]*$')
);

-- 20. Findings can represent site-wide checks or a specific crawled page.
CREATE TABLE audit_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  audit_run_id uuid NOT NULL,
  crawled_page_id uuid,
  audit_rule_id uuid NOT NULL,
  severity text NOT NULL CHECK (severity IN ('error','warning','notice')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','fixed','ignored')),
  observed_details text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (workspace_id,audit_run_id,crawled_page_id,audit_rule_id),
  FOREIGN KEY (workspace_id,audit_run_id) REFERENCES audit_runs(workspace_id,id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id,audit_run_id,crawled_page_id)
    REFERENCES crawled_pages(workspace_id,audit_run_id,id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id,audit_rule_id) REFERENCES audit_rules(workspace_id,id) ON DELETE RESTRICT
);
CREATE INDEX idx_audit_findings_filter ON audit_findings(workspace_id,audit_run_id,severity,status);

-- 21. A referring domain is contextualized to a given customer workspace.
CREATE TABLE referring_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  hostname varchar(253) NOT NULL,
  authority_estimate numeric(5,2) CHECK (authority_estimate BETWEEN 0 AND 100),
  source_type text NOT NULL CHECK (source_type IN ('licensed','manual','sample')),
  source_reference text,
  first_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,id),
  UNIQUE (workspace_id,hostname),
  CHECK (hostname=lower(hostname) AND hostname ~ '^[a-z0-9][a-z0-9.-]*[a-z0-9]$'),
  CHECK (source_type='sample' OR source_reference IS NOT NULL)
);
CREATE INDEX idx_referring_domains_authority ON referring_domains(workspace_id,authority_estimate DESC);

-- 22. Link observations retain first/last sightings and original evidence.
CREATE TABLE backlinks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  site_target_id uuid NOT NULL,
  referring_domain_id uuid NOT NULL,
  source_url varchar(2048) NOT NULL,
  target_url varchar(2048) NOT NULL,
  link_digest bytea GENERATED ALWAYS AS (digest(source_url||chr(31)||target_url,'sha256')) STORED,
  anchor_text text,
  rel_type text NOT NULL DEFAULT 'follow' CHECK (rel_type IN ('follow','nofollow','sponsored','ugc')),
  status text NOT NULL DEFAULT 'live' CHECK (status IN ('live','lost','unknown')),
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  source_type text NOT NULL CHECK (source_type IN ('licensed','manual','sample')),
  source_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,id),
  UNIQUE (workspace_id,site_target_id,link_digest),
  FOREIGN KEY (workspace_id,site_target_id) REFERENCES site_targets(workspace_id,id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id,referring_domain_id) REFERENCES referring_domains(workspace_id,id) ON DELETE RESTRICT,
  CHECK (source_url ~ '^https?://' AND target_url ~ '^https?://'),
  CHECK (last_seen_at IS NULL OR first_seen_at IS NULL OR last_seen_at>=first_seen_at),
  CHECK (source_type='sample' OR source_reference IS NOT NULL)
);
CREATE INDEX idx_backlinks_referrer ON backlinks(workspace_id,referring_domain_id);
CREATE INDEX idx_backlinks_recent ON backlinks(workspace_id,site_target_id,first_seen_at DESC);

-- 23. Manual backlink review explicitly avoids automatic toxicity verdicts.
CREATE TABLE backlink_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  backlink_id uuid NOT NULL,
  reviewed_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  verdict text NOT NULL DEFAULT 'unreviewed' CHECK (verdict IN ('unreviewed','keep','investigate','remove')),
  workflow_status text NOT NULL DEFAULT 'open' CHECK (workflow_status IN ('open','contacted','whitelisted','disavow_candidate','closed')),
  notes text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,backlink_id),
  FOREIGN KEY (workspace_id,backlink_id) REFERENCES backlinks(workspace_id,id) ON DELETE CASCADE
);
CREATE INDEX idx_backlink_reviews_queue ON backlink_reviews(workspace_id,workflow_status,created_at DESC);

-- 24. A saved report controls visibility and delivery scheduling.
CREATE TABLE report_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  title varchar(160) NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  schedule_cron varchar(120),
  schedule_timezone varchar(80) NOT NULL DEFAULT 'UTC',
  recipient_policy jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(recipient_policy)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,id)
);
CREATE INDEX idx_report_definitions_status ON report_definitions(workspace_id,status,created_at DESC);

-- 25. Report modules are normalized ordered children with typed settings.
CREATE TABLE report_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  report_definition_id uuid NOT NULL,
  ordinal integer NOT NULL CHECK (ordinal>=0),
  module_key varchar(100) NOT NULL,
  title varchar(160),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(settings)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,report_definition_id,ordinal),
  FOREIGN KEY (workspace_id,report_definition_id) REFERENCES report_definitions(workspace_id,id) ON DELETE CASCADE,
  CHECK (module_key ~ '^[a-z][a-z0-9_]*$')
);

-- 26. Generated artifacts are stored externally; only references live here.
CREATE TABLE report_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  report_definition_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed')),
  data_as_of timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  artifact_reference text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id,report_definition_id) REFERENCES report_definitions(workspace_id,id) ON DELETE CASCADE,
  CHECK (finished_at IS NULL OR started_at IS NULL OR finished_at>=started_at),
  CHECK (status <> 'completed' OR (finished_at IS NOT NULL AND artifact_reference IS NOT NULL))
);
CREATE INDEX idx_report_runs_history ON report_runs(workspace_id,report_definition_id,created_at DESC);

-- 27. Tokens stay in an external encrypted store, never this SQL database.
CREATE TABLE integration_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('google_search_console','google_analytics','other')),
  external_account_id varchar(240) NOT NULL,
  token_reference text NOT NULL,
  granted_scopes text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected','reauthorization_required','revoked','error')),
  expires_at timestamptz,
  last_sync_at timestamptz,
  connected_by uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,id),
  UNIQUE (workspace_id,provider,external_account_id),
  CHECK (length(token_reference)>0)
);
CREATE INDEX idx_integrations_state ON integration_connections(workspace_id,provider,status);

-- 28. Every KPI point has units, freshness, and verifiable provenance.
CREATE TABLE metric_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  site_target_id uuid,
  rank_campaign_id uuid,
  integration_connection_id uuid,
  metric_key varchar(100) NOT NULL,
  channel text NOT NULL DEFAULT 'organic' CHECK (channel IN ('organic','paid','technical','backlink','other')),
  measured_at timestamptz NOT NULL,
  value numeric(20,6) NOT NULL,
  unit varchar(40) NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('search_console','google_analytics','licensed','manual','derived','sample')),
  source_reference text,
  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id,site_target_id) REFERENCES site_targets(workspace_id,id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id,rank_campaign_id) REFERENCES rank_campaigns(workspace_id,id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id,integration_connection_id) REFERENCES integration_connections(workspace_id,id) ON DELETE SET NULL (integration_connection_id),
  CHECK (num_nonnulls(site_target_id,rank_campaign_id)<=1),
  CHECK (is_sample=(source_type='sample')),
  CHECK (source_type='sample' OR source_reference IS NOT NULL),
  CHECK (metric_key ~ '^[a-z][a-z0-9_]*$')
);
CREATE INDEX idx_metric_snapshots_site ON metric_snapshots(workspace_id,site_target_id,metric_key,measured_at DESC);
CREATE INDEX idx_metric_snapshots_campaign ON metric_snapshots(workspace_id,rank_campaign_id,metric_key,measured_at DESC);

-- === Automatic timestamps and immutable tenant ownership ===
CREATE FUNCTION searchpilot_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
  NEW.updated_at := statement_timestamp();
  RETURN NEW;
END $$;

CREATE FUNCTION searchpilot_preserve_workspace_id() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
  IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
    RAISE EXCEPTION 'workspace_id cannot be changed';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION searchpilot_preserve_owner_id() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'workspace owner transfer requires a separate privileged workflow';
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'app_users','workspaces','workspace_memberships','workspace_invitations',
    'site_targets','project_tags','site_target_tags','keyword_terms',
    'keyword_lists','keyword_list_items','keyword_clusters','rank_campaigns',
    'rank_campaign_keywords','rank_observations','competitor_targets',
    'audit_campaigns','audit_runs','crawled_pages','audit_rules','audit_findings',
    'referring_domains','backlinks','backlink_reviews','report_definitions',
    'report_sections','report_runs','integration_connections','metric_snapshots'
  ] LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION searchpilot_touch_updated_at()', 'touch_'||table_name,table_name);
    IF table_name NOT IN ('app_users','workspaces') THEN
      EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OF workspace_id ON %I FOR EACH ROW EXECUTE FUNCTION searchpilot_preserve_workspace_id()', 'preserve_tenant_'||table_name,table_name);
    END IF;
  END LOOP;
END $$;
CREATE TRIGGER preserve_workspace_owner BEFORE UPDATE OF owner_id ON workspaces
  FOR EACH ROW EXECUTE FUNCTION searchpilot_preserve_owner_id();

-- === Verified identity and tenant access check ===
CREATE FUNCTION searchpilot_current_user_id() RETURNS uuid
LANGUAGE sql STABLE SET search_path=pg_catalog,public AS $$
  SELECT NULLIF(current_setting('app.user_id',true),'')::uuid
$$;

-- Security definer avoids RLS recursion through memberships. Function owner
-- is the migration role; the non-owner app role receives EXECUTE only.
CREATE FUNCTION searchpilot_has_workspace_role(tenant uuid, roles text[]) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspaces w
    JOIN public.app_users u ON u.id=public.searchpilot_current_user_id() AND u.status='active'
    WHERE w.id=tenant AND w.status='active'
      AND (
        (w.owner_id=u.id AND 'owner'=ANY(roles))
        OR EXISTS (
          SELECT 1 FROM public.workspace_memberships m
          WHERE m.workspace_id=w.id AND m.user_id=u.id
            AND m.status='active' AND m.role=ANY(roles)
        )
      )
  )
$$;
REVOKE ALL ON FUNCTION searchpilot_has_workspace_role(uuid,text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION searchpilot_current_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION searchpilot_current_user_id(),searchpilot_has_workspace_role(uuid,text[])
  TO searchpilot_app;

-- === Row-level security ===
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_users_self_read ON app_users FOR SELECT TO searchpilot_app
  USING (id=searchpilot_current_user_id());
CREATE POLICY app_users_self_display ON app_users FOR UPDATE TO searchpilot_app
  USING (id=searchpilot_current_user_id()) WITH CHECK (id=searchpilot_current_user_id());
CREATE POLICY auth_service_provision ON app_users FOR ALL TO searchpilot_auth
  USING (true) WITH CHECK (true);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspaces_read ON workspaces FOR SELECT TO searchpilot_app
  USING (searchpilot_has_workspace_role(id,ARRAY['owner','editor','viewer']));
CREATE POLICY workspaces_create ON workspaces FOR INSERT TO searchpilot_app
  WITH CHECK (
    owner_id=searchpilot_current_user_id()
    AND EXISTS(SELECT 1 FROM app_users WHERE id=owner_id AND status='active')
  );
CREATE POLICY workspaces_update ON workspaces FOR UPDATE TO searchpilot_app
  USING (searchpilot_has_workspace_role(id,ARRAY['owner']))
  WITH CHECK (searchpilot_has_workspace_role(id,ARRAY['owner']));
CREATE POLICY workspaces_delete ON workspaces FOR DELETE TO searchpilot_app
  USING (searchpilot_has_workspace_role(id,ARRAY['owner']));

ALTER TABLE workspace_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY memberships_read ON workspace_memberships FOR SELECT TO searchpilot_app
  USING (searchpilot_has_workspace_role(workspace_id,ARRAY['owner','editor','viewer']));
CREATE POLICY memberships_create ON workspace_memberships FOR INSERT TO searchpilot_app
  WITH CHECK (searchpilot_has_workspace_role(workspace_id,ARRAY['owner']));
CREATE POLICY memberships_update ON workspace_memberships FOR UPDATE TO searchpilot_app
  USING (searchpilot_has_workspace_role(workspace_id,ARRAY['owner']))
  WITH CHECK (searchpilot_has_workspace_role(workspace_id,ARRAY['owner']));
CREATE POLICY memberships_delete ON workspace_memberships FOR DELETE TO searchpilot_app
  USING (searchpilot_has_workspace_role(workspace_id,ARRAY['owner']));
-- Auth service alone may provision an accepted invitation into membership.
-- It must verify matching recipient identity and unexpired token before write.
CREATE POLICY memberships_auth ON workspace_memberships FOR ALL TO searchpilot_auth
  USING (true) WITH CHECK (true);

ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY invitations_owner ON workspace_invitations FOR ALL TO searchpilot_app
  USING (searchpilot_has_workspace_role(workspace_id,ARRAY['owner']))
  WITH CHECK (searchpilot_has_workspace_role(workspace_id,ARRAY['owner']));
-- Invitation acceptance must be a one-time verified operation by trusted
-- auth service, which validates token digest, expiry, email and status.
CREATE POLICY invitations_auth ON workspace_invitations FOR ALL TO searchpilot_auth
  USING (true) WITH CHECK (true);

-- Standard tenant-owned tables. Read for viewer+, write for editor+.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'site_targets','project_tags','site_target_tags','keyword_terms',
    'keyword_lists','keyword_list_items','keyword_clusters','rank_campaigns',
    'rank_campaign_keywords','competitor_targets','audit_campaigns','audit_rules',
    'backlink_reviews','report_definitions','report_sections'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT TO searchpilot_app USING (searchpilot_has_workspace_role(workspace_id,ARRAY[''owner'',''editor'',''viewer'']))',
      table_name||'_read',table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT TO searchpilot_app WITH CHECK (searchpilot_has_workspace_role(workspace_id,ARRAY[''owner'',''editor'']))',
      table_name||'_create',table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE TO searchpilot_app USING (searchpilot_has_workspace_role(workspace_id,ARRAY[''owner'',''editor''])) WITH CHECK (searchpilot_has_workspace_role(workspace_id,ARRAY[''owner'',''editor'']))',
      table_name||'_update',table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR DELETE TO searchpilot_app USING (searchpilot_has_workspace_role(workspace_id,ARRAY[''owner'',''editor'']))',
      table_name||'_delete',table_name);
  END LOOP;
END $$;

-- Credential metadata belongs to owners. Vault secrets are never returned.
ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY connections_owner ON integration_connections FOR ALL TO searchpilot_app
  USING (searchpilot_has_workspace_role(workspace_id,ARRAY['owner']))
  WITH CHECK (searchpilot_has_workspace_role(workspace_id,ARRAY['owner']));

-- Trusted ingestion workers need scope configuration SELECT to resolve their
-- tenant jobs. Job queue controls which workspace they are allowed to process.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'workspaces','site_targets','rank_campaigns','rank_campaign_keywords',
    'keyword_terms','audit_campaigns','audit_rules','report_definitions',
    'integration_connections'
  ] LOOP
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO searchpilot_ingest USING (true)',
      table_name||'_ingest_read',table_name);
  END LOOP;
END $$;

-- Ingestion tables: visible to members, never directly writable by end users.
-- The trusted ingest role has cross-tenant access for scheduled jobs; queries
-- MUST bind target workspace_id and run out of a private service environment.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'rank_observations','audit_runs','crawled_pages','audit_findings',
    'referring_domains','backlinks','report_runs','metric_snapshots'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT TO searchpilot_app USING (searchpilot_has_workspace_role(workspace_id,ARRAY[''owner'',''editor'',''viewer'']))',
      table_name||'_read',table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO searchpilot_ingest USING (true) WITH CHECK (true)',
      table_name||'_ingest',table_name);
  END LOOP;
END $$;

-- Non-login roles must be inherited by separate scoped login roles.
GRANT USAGE ON SCHEMA public TO searchpilot_app,searchpilot_auth,searchpilot_ingest;
GRANT SELECT ON app_users,workspaces,workspace_memberships,workspace_invitations,
  site_targets,project_tags,site_target_tags,keyword_terms,keyword_lists,
  keyword_list_items,keyword_clusters,rank_campaigns,rank_campaign_keywords,
  rank_observations,competitor_targets,audit_campaigns,audit_runs,crawled_pages,
  audit_rules,audit_findings,referring_domains,backlinks,backlink_reviews,
  report_definitions,report_sections,report_runs,integration_connections,
  metric_snapshots TO searchpilot_app;
GRANT UPDATE(display_name) ON app_users TO searchpilot_app;
GRANT INSERT,UPDATE,DELETE ON workspaces,workspace_memberships,workspace_invitations,
  site_targets,project_tags,site_target_tags,keyword_terms,keyword_lists,
  keyword_list_items,keyword_clusters,rank_campaigns,rank_campaign_keywords,
  competitor_targets,audit_campaigns,audit_rules,backlink_reviews,
  report_definitions,report_sections,integration_connections TO searchpilot_app;
GRANT SELECT,INSERT,UPDATE ON app_users TO searchpilot_auth;
GRANT SELECT,INSERT,UPDATE,DELETE ON workspace_invitations,workspace_memberships
  TO searchpilot_auth;
GRANT SELECT,INSERT,UPDATE,DELETE ON rank_observations,audit_runs,crawled_pages,
  audit_findings,referring_domains,backlinks,report_runs,metric_snapshots
  TO searchpilot_ingest;
-- Trusted ingest jobs may need read access to scoped parent configuration.
GRANT SELECT ON workspaces,site_targets,rank_campaigns,rank_campaign_keywords,
  keyword_terms,audit_campaigns,audit_rules,report_definitions,
  integration_connections TO searchpilot_ingest;
-- NOTE: Membership and invite creation is a privileged owner action. Service
-- requests should validate invited_by/created_by/reviewed_by are current user.
-- REVOKE defaults on future tables; explicitly grant only intended operations.
