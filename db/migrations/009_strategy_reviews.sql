-- User-organized strategy and human backlink decisions. No AI scoring or
-- automatic toxicity/disavow verdicts. All content is user-supplied.
CREATE TABLE seo_strategy_lists (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id uuid NOT NULL REFERENCES local_workspaces(id) ON DELETE CASCADE,
 project_id uuid NOT NULL,
 title varchar(120) NOT NULL CHECK(length(btrim(title))>0),
 description varchar(1000),
 source_type varchar(20) NOT NULL DEFAULT 'user_manual' CHECK(source_type='user_manual'),
 created_by uuid NOT NULL REFERENCES local_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,project_id,id),
 CONSTRAINT seo_strategy_list_project_scope FOREIGN KEY(workspace_id,project_id)
 REFERENCES projects(workspace_id,id) ON DELETE CASCADE
);
CREATE INDEX seo_strategy_lists_project ON seo_strategy_lists(workspace_id,project_id,updated_at DESC);

CREATE TABLE seo_strategy_clusters (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id uuid NOT NULL,
 project_id uuid NOT NULL,
 list_id uuid NOT NULL,
 title varchar(120) NOT NULL CHECK(length(btrim(title))>0),
 notes varchar(2000),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,project_id,list_id,id),
 CONSTRAINT seo_strategy_cluster_list_scope FOREIGN KEY(workspace_id,project_id,list_id)
 REFERENCES seo_strategy_lists(workspace_id,project_id,id) ON DELETE CASCADE
);
CREATE INDEX seo_strategy_clusters_list ON seo_strategy_clusters(workspace_id,list_id,created_at);

CREATE TABLE seo_strategy_keywords (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id uuid NOT NULL,
 project_id uuid NOT NULL,
 list_id uuid NOT NULL,
 cluster_id uuid,
 phrase varchar(200) NOT NULL CHECK(length(btrim(phrase))>0),
 notes varchar(2000),
 priority smallint NOT NULL DEFAULT 3 CHECK(priority BETWEEN 1 AND 5),
 source_type varchar(20) NOT NULL DEFAULT 'user_manual' CHECK(source_type='user_manual'),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,list_id,phrase),
 CONSTRAINT seo_strategy_keyword_list_scope FOREIGN KEY(workspace_id,project_id,list_id)
 REFERENCES seo_strategy_lists(workspace_id,project_id,id) ON DELETE CASCADE,
 CONSTRAINT seo_strategy_keyword_cluster_scope FOREIGN KEY(workspace_id,project_id,list_id,cluster_id)
 REFERENCES seo_strategy_clusters(workspace_id,project_id,list_id,id) ON DELETE SET NULL (cluster_id)
);
CREATE INDEX seo_strategy_keywords_list ON seo_strategy_keywords(workspace_id,list_id,cluster_id);

CREATE TABLE seo_backlink_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id uuid NOT NULL,
 project_id uuid NOT NULL,
 backlink_id uuid NOT NULL,
 label varchar(16) NOT NULL CHECK(label IN ('unreviewed','keep','investigate','contact','ignore')),
 notes varchar(2000),
 reviewed_by uuid NOT NULL REFERENCES local_users(id),
 reviewed_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,project_id,backlink_id),
 CONSTRAINT seo_review_backlink_scope FOREIGN KEY(backlink_id)
 REFERENCES seo_backlink_observations(id) ON DELETE CASCADE
);
CREATE INDEX seo_backlink_reviews_project ON seo_backlink_reviews(workspace_id,project_id,updated_at DESC);
-- Backlink observations have single-column primary keys; enforce workspace
-- membership of reviews with a dedicated composite unique/FK.
CREATE UNIQUE INDEX seo_backlinks_workspace_project_id
 ON seo_backlink_observations(workspace_id,project_id,id);
ALTER TABLE seo_backlink_reviews ADD CONSTRAINT seo_review_backlink_tenant_scope
 FOREIGN KEY(workspace_id,project_id,backlink_id)
 REFERENCES seo_backlink_observations(workspace_id,project_id,id) ON DELETE CASCADE;
