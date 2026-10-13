-- SearchPilot SEO data ingestion (additive). Apply after migrations 001-004.
-- This does not populate sample or estimated measurements. Every observation
-- is explicitly a user-supplied, UNVERIFIED import until verified by a future
-- authenticated first-party/licensed provider adapter.

CREATE TABLE seo_tracking_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES local_workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  name varchar(120) NOT NULL,
  engine varchar(12) NOT NULL CHECK(engine IN ('google','bing')),
  device varchar(12) NOT NULL CHECK(device IN ('desktop','mobile')),
  country char(2) NOT NULL CHECK(country ~ '^[A-Z]{2}$'),
  locale varchar(20) NOT NULL CHECK(locale ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
  city varchar(120),
  status varchar(12) NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','archived')),
  created_by uuid NOT NULL REFERENCES local_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id,id),
  UNIQUE(workspace_id,project_id,id),
  UNIQUE(workspace_id,project_id,name),
  CONSTRAINT seo_campaign_project_fk FOREIGN KEY (workspace_id,project_id)
    REFERENCES projects(workspace_id,id) ON DELETE CASCADE
);
CREATE INDEX seo_campaigns_project_status ON seo_tracking_campaigns(workspace_id,project_id,status,created_at DESC);

CREATE TABLE seo_tracking_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES local_workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  campaign_id uuid NOT NULL,
  phrase varchar(200) NOT NULL CHECK(length(btrim(phrase))>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id,id),
  UNIQUE(workspace_id,project_id,campaign_id,id),
  UNIQUE(workspace_id,campaign_id,phrase),
  CONSTRAINT seo_tracked_campaign_fk FOREIGN KEY (workspace_id,project_id,campaign_id)
    REFERENCES seo_tracking_campaigns(workspace_id,project_id,id) ON DELETE CASCADE
);
CREATE INDEX seo_tracking_keywords_campaign ON seo_tracking_keywords(workspace_id,campaign_id);

CREATE TABLE seo_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES local_workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  campaign_id uuid,
  kind varchar(12) NOT NULL CHECK(kind IN ('organic','keywords','backlinks')),
  source_type varchar(16) NOT NULL DEFAULT 'user_import' CHECK(source_type='user_import'),
  source_label varchar(160) NOT NULL CHECK(length(btrim(source_label))>0),
  verified boolean NOT NULL DEFAULT false CHECK(NOT verified),
  submitted_by uuid NOT NULL REFERENCES local_users(id),
  item_count smallint NOT NULL CHECK(item_count BETWEEN 1 AND 50),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id,id),
  UNIQUE(workspace_id,project_id,id),
  FOREIGN KEY (workspace_id,project_id) REFERENCES projects(workspace_id,id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id,project_id,campaign_id) REFERENCES seo_tracking_campaigns(workspace_id,project_id,id) ON DELETE CASCADE,
  CHECK ((kind='organic')=(campaign_id IS NOT NULL))
);
CREATE INDEX seo_batches_project_recent ON seo_import_batches(workspace_id,project_id,created_at DESC);

CREATE TABLE seo_organic_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES local_workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  campaign_id uuid NOT NULL,
  keyword_id uuid NOT NULL,
  batch_id uuid NOT NULL,
  position integer CHECK(position BETWEEN 1 AND 1000),
  observed_at timestamptz NOT NULL,
  landing_url varchar(2048),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id,project_id,campaign_id,keyword_id,observed_at),
  FOREIGN KEY (workspace_id,project_id,campaign_id,keyword_id)
    REFERENCES seo_tracking_keywords(workspace_id,project_id,campaign_id,id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id,project_id,batch_id)
    REFERENCES seo_import_batches(workspace_id,project_id,id) ON DELETE RESTRICT
);
CREATE INDEX seo_organic_history ON seo_organic_observations(workspace_id,project_id,campaign_id,observed_at DESC,id DESC);

CREATE TABLE seo_keyword_research (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES local_workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  batch_id uuid NOT NULL,
  phrase varchar(200) NOT NULL CHECK(length(btrim(phrase))>0),
  country char(2) NOT NULL CHECK(country ~ '^[A-Z]{2}$'),
  locale varchar(20) NOT NULL CHECK(locale ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
  volume integer CHECK(volume>=0),
  difficulty numeric(5,2) CHECK(difficulty BETWEEN 0 AND 100),
  intent varchar(16) CHECK(intent IN ('informational','navigational','commercial','transactional','mixed')),
  observed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id,project_id,phrase,country,locale,observed_at),
  FOREIGN KEY (workspace_id,project_id,batch_id)
    REFERENCES seo_import_batches(workspace_id,project_id,id) ON DELETE RESTRICT
);
CREATE INDEX seo_keyword_research_recent ON seo_keyword_research(workspace_id,project_id,country,observed_at DESC,id DESC);

CREATE TABLE seo_backlink_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES local_workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  batch_id uuid NOT NULL,
  source_url varchar(2048) NOT NULL,
  target_url varchar(2048) NOT NULL,
  source_host varchar(253) NOT NULL,
  anchor_text varchar(500),
  link_type varchar(12) NOT NULL CHECK(link_type IN ('follow','nofollow','sponsored','ugc')),
  status varchar(12) NOT NULL CHECK(status IN ('live','lost','unknown')),
  observed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id,project_id,source_url,target_url,observed_at),
  FOREIGN KEY (workspace_id,project_id,batch_id)
    REFERENCES seo_import_batches(workspace_id,project_id,id) ON DELETE RESTRICT
);
CREATE INDEX seo_backlinks_recent ON seo_backlink_observations(workspace_id,project_id,observed_at DESC,id DESC);
CREATE INDEX seo_backlinks_referrer ON seo_backlink_observations(workspace_id,project_id,source_host);
