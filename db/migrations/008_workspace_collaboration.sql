-- Secure one-time invitations shared out of band. Email delivery is deliberately
-- NOT simulated; the owner must copy the invite link until a mail provider exists.
CREATE TABLE workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES local_workspaces(id) ON DELETE CASCADE,
  email text NOT NULL CHECK(length(email) BETWEEN 3 AND 320),
  role varchar(8) NOT NULL CHECK(role IN ('viewer','editor')),
  token_hash char(64) NOT NULL UNIQUE,
  invited_by uuid NOT NULL REFERENCES local_users(id),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by uuid REFERENCES local_users(id),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT (accepted_at IS NOT NULL AND revoked_at IS NOT NULL))
);
CREATE INDEX workspace_invitations_scope ON workspace_invitations(workspace_id,created_at DESC);
CREATE INDEX workspace_invitations_expiry ON workspace_invitations(expires_at) WHERE accepted_at IS NULL AND revoked_at IS NULL;
