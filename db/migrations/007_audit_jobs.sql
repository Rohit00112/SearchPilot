-- Additive, persistent crawl jobs. No network work happens in an API request.
-- Worker must be launched explicitly; default CRAWL_NETWORK_ENABLED is off.
-- All crawl limits are enforced in SQL as well as in the worker. Never use
-- this migration to claim or backfill unknown legacy project ownership.

CREATE TABLE seo_crawl_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES local_workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  requested_by uuid NOT NULL REFERENCES local_users(id) ON DELETE RESTRICT,
  root_host varchar(253) NOT NULL,
  status varchar(12) NOT NULL DEFAULT 'queued'
    CHECK(status IN ('queued','running','completed','partial','failed','cancelled')),
  max_pages smallint NOT NULL DEFAULT 10 CHECK(max_pages BETWEEN 1 AND 10),
  max_depth smallint NOT NULL DEFAULT 2 CHECK(max_depth BETWEEN 0 AND 2),
  pages_crawled smallint NOT NULL DEFAULT 0 CHECK(pages_crawled BETWEEN 0 AND 10),
  issues_found smallint NOT NULL DEFAULT 0 CHECK(issues_found BETWEEN 0 AND 100),
  failed_pages smallint NOT NULL DEFAULT 0 CHECK(failed_pages BETWEEN 0 AND 10),
  robots_policy varchar(14) NOT NULL DEFAULT 'unchecked'
    CHECK(robots_policy IN ('unchecked','allowed','missing','disallowed','unavailable')),
  failure_reason varchar(400),
  worker_id uuid,
  attempts smallint NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 2),
  started_at timestamptz,
  finished_at timestamptz,
  lease_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id,id),
  UNIQUE(workspace_id,project_id,id),
  CONSTRAINT seo_crawl_project_scope FOREIGN KEY(workspace_id,project_id)
    REFERENCES projects(workspace_id,id) ON DELETE CASCADE,
  CHECK(pages_crawled<=max_pages),
  CHECK(failed_pages<=pages_crawled),
  CHECK(root_host=lower(root_host) AND root_host ~ '^[a-z0-9][a-z0-9.-]*[a-z0-9]$'),
  CHECK(status<>'running' OR (started_at IS NOT NULL AND worker_id IS NOT NULL AND lease_until IS NOT NULL)),
  CHECK(status NOT IN ('completed','partial','failed','cancelled') OR finished_at IS NOT NULL),
  CHECK(status<>'completed' OR (failed_pages=0 AND pages_crawled>0)),
  CHECK(status<>'partial' OR (failed_pages>0 AND pages_crawled>0))
);
CREATE INDEX seo_crawl_jobs_queue ON seo_crawl_jobs(status,created_at)
  WHERE status='queued';
CREATE INDEX seo_crawl_jobs_project ON seo_crawl_jobs(workspace_id,project_id,created_at DESC);
CREATE UNIQUE INDEX seo_crawl_jobs_active_project ON seo_crawl_jobs(workspace_id,project_id)
  WHERE status IN ('queued','running');

CREATE TABLE seo_crawl_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  project_id uuid NOT NULL,
  job_id uuid NOT NULL,
  url varchar(2048) NOT NULL,
  depth smallint NOT NULL CHECK(depth BETWEEN 0 AND 2),
  status varchar(10) NOT NULL CHECK(status IN ('fetched','failed')),
  http_status smallint CHECK(http_status BETWEEN 100 AND 599),
  page_title varchar(300),
  meta_description varchar(500),
  h1_count smallint CHECK(h1_count BETWEEN 0 AND 100),
  discovered_links smallint NOT NULL DEFAULT 0 CHECK(discovered_links BETWEEN 0 AND 100),
  failure_reason varchar(300),
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id,job_id,url),
  UNIQUE(workspace_id,project_id,job_id,id),
  CONSTRAINT seo_crawl_pages_job_scope FOREIGN KEY(workspace_id,project_id,job_id)
    REFERENCES seo_crawl_jobs(workspace_id,project_id,id) ON DELETE CASCADE,
  CHECK(url ~ '^https://'),
  CHECK((status='fetched' AND http_status BETWEEN 200 AND 299 AND failure_reason IS NULL)
     OR (status='failed' AND failure_reason IS NOT NULL))
);
CREATE INDEX seo_crawl_pages_job ON seo_crawl_pages(workspace_id,job_id,depth);

CREATE TABLE seo_crawl_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  project_id uuid NOT NULL,
  job_id uuid NOT NULL,
  page_id uuid NOT NULL,
  issue_code varchar(30) NOT NULL CHECK(issue_code IN
    ('missing_title','missing_description','missing_h1','multiple_h1','fetch_failed')),
  severity varchar(8) NOT NULL CHECK(severity IN ('error','warning')),
  details varchar(300) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id,job_id,page_id,issue_code),
  CONSTRAINT seo_crawl_issues_page_scope FOREIGN KEY(workspace_id,project_id,job_id,page_id)
    REFERENCES seo_crawl_pages(workspace_id,project_id,job_id,id) ON DELETE CASCADE
);
CREATE INDEX seo_crawl_issues_job ON seo_crawl_issues(workspace_id,job_id,issue_code);

-- Guard even trusted worker bugs from storing >max_pages or >max_depth.
CREATE FUNCTION seo_crawl_guard_page() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE config seo_crawl_jobs%ROWTYPE;
BEGIN
  SELECT * INTO config FROM seo_crawl_jobs
    WHERE workspace_id=NEW.workspace_id AND project_id=NEW.project_id AND id=NEW.job_id
    FOR UPDATE;
  IF NOT FOUND OR config.status<>'running' OR NEW.depth>config.max_depth OR
     (SELECT count(*) FROM seo_crawl_pages WHERE job_id=NEW.job_id)>=config.max_pages THEN
    RAISE EXCEPTION 'crawl page exceeds active job limits';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER seo_crawl_page_limit BEFORE INSERT ON seo_crawl_pages
  FOR EACH ROW EXECUTE FUNCTION seo_crawl_guard_page();
