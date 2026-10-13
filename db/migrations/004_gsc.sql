CREATE TABLE IF NOT EXISTS gsc_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES local_workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES local_users(id) ON DELETE CASCADE,
  refresh_token_enc text NOT NULL,
  property_uri text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id,user_id)
);
CREATE INDEX IF NOT EXISTS gsc_connections_workspace ON gsc_connections(workspace_id);
CREATE TABLE IF NOT EXISTS gsc_oauth_states (
  state_hash text PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES local_workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES local_users(id) ON DELETE CASCADE,
  verifier_enc text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gsc_oauth_states_expiry ON gsc_oauth_states(expires_at);
CREATE TABLE IF NOT EXISTS gsc_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES local_workspaces(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES gsc_connections(id) ON DELETE CASCADE,
  property_uri text NOT NULL,
  metric_date date NOT NULL,
  query text NOT NULL DEFAULT '',
  page text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  device text NOT NULL DEFAULT '',
  clicks bigint NOT NULL CHECK(clicks>=0),
  impressions bigint NOT NULL CHECK(impressions>=0),
  ctr double precision NOT NULL CHECK(ctr>=0 AND ctr<=1),
  average_position double precision NOT NULL CHECK(average_position>=0),
  collected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(connection_id,metric_date,query,page,country,device)
);
CREATE INDEX IF NOT EXISTS gsc_performance_workspace_date ON gsc_performance(workspace_id,metric_date DESC);
