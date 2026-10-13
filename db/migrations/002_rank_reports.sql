-- Apply after 001_local_auth_workspaces.sql; additive, legacy rows remain untouched.
CREATE UNIQUE INDEX IF NOT EXISTS keywords_workspace_id_id ON keywords(workspace_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS keywords_id_project_id ON keywords(id,project_id);
CREATE TABLE IF NOT EXISTS manual_rank_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES local_workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  keyword_id uuid NOT NULL,
  position integer NOT NULL CHECK (position BETWEEN 1 AND 1000),
  observed_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid NOT NULL REFERENCES local_users(id),
  source text NOT NULL DEFAULT 'manual' CHECK (source = 'manual'),
  note varchar(500),
  CONSTRAINT manual_rank_project_scope FOREIGN KEY (workspace_id,project_id)
    REFERENCES projects(workspace_id,id) ON DELETE CASCADE,
  CONSTRAINT manual_rank_keyword_scope FOREIGN KEY (workspace_id,keyword_id)
    REFERENCES keywords(workspace_id,id) ON DELETE CASCADE,
  CONSTRAINT manual_rank_keyword_project_scope FOREIGN KEY (keyword_id,project_id)
    REFERENCES keywords(id,project_id)
);
CREATE INDEX IF NOT EXISTS manual_rank_workspace_project_time
  ON manual_rank_observations(workspace_id,project_id,observed_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS manual_rank_workspace_keyword_time
  ON manual_rank_observations(workspace_id,keyword_id,observed_at DESC,id DESC);
