-- Optional, time-limited bearer links to a fixed, intentionally minimal
-- metadata snapshot. Raw keywords, audits, notes, and GSC data are never copied.
CREATE TABLE report_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  report_id uuid NOT NULL,
  token_hash char(64) NOT NULL UNIQUE
    CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  snapshot_title varchar(160) NOT NULL CHECK (length(btrim(snapshot_title)) > 0),
  snapshot_domain varchar(255) NOT NULL CHECK (length(btrim(snapshot_domain)) > 0),
  snapshot_sections jsonb NOT NULL
    CHECK (jsonb_typeof(snapshot_sections) = 'array'
      AND jsonb_array_length(snapshot_sections) BETWEEN 1 AND 5),
  created_by uuid NOT NULL REFERENCES local_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CONSTRAINT report_shares_report_scope FOREIGN KEY (workspace_id, report_id)
    REFERENCES report_definitions(workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT report_shares_max_expiry
    CHECK (expires_at > created_at AND expires_at <= created_at + interval '30 days')
);

CREATE INDEX report_shares_workspace_report ON report_shares(workspace_id, report_id, created_at DESC);
CREATE INDEX report_shares_expiry ON report_shares(expires_at)
  WHERE revoked_at IS NULL;
