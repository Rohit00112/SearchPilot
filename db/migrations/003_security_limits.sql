-- Additive shared counters for authentication and on-demand audit limits.
CREATE TABLE IF NOT EXISTS security_rate_limits (
  bucket_key char(64) PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  hits integer NOT NULL DEFAULT 0 CHECK (hits >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS security_rate_limits_stale ON security_rate_limits(updated_at);
-- Maintenance may delete records older than two days; never delete sessions here.
