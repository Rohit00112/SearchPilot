-- Additive only: legacy projects/keywords/audits remain unclaimed and invisible.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS local_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  display_name varchar(120) NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(email)
);
CREATE UNIQUE INDEX IF NOT EXISTS local_users_email_ci ON local_users(lower(email));
CREATE TABLE IF NOT EXISTS local_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  owner_id uuid NOT NULL REFERENCES local_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id,owner_id)
);
CREATE TABLE IF NOT EXISTS local_workspace_members (
  workspace_id uuid NOT NULL REFERENCES local_workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES local_users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','editor','viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(workspace_id,user_id)
);
CREATE INDEX IF NOT EXISTS local_workspace_members_user ON local_workspace_members(user_id,workspace_id);
CREATE TABLE IF NOT EXISTS local_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES local_users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS local_sessions_active ON local_sessions(user_id,expires_at) WHERE revoked_at IS NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES local_workspaces(id);
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES local_workspaces(id);
ALTER TABLE audits ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES local_workspaces(id);
CREATE UNIQUE INDEX IF NOT EXISTS projects_workspace_id_id ON projects(workspace_id,id);
CREATE INDEX IF NOT EXISTS projects_workspace_created ON projects(workspace_id,created_at DESC) WHERE workspace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS keywords_workspace_project ON keywords(workspace_id,project_id);
CREATE INDEX IF NOT EXISTS audits_workspace_project_checked ON audits(workspace_id,project_id,checked_at DESC);
-- Keep existing FK and add tenant-consistent FK for all NEW/claimed records.
ALTER TABLE keywords ADD CONSTRAINT keywords_workspace_project_fk
  FOREIGN KEY (workspace_id,project_id) REFERENCES projects(workspace_id,id);
ALTER TABLE audits ADD CONSTRAINT audits_workspace_project_fk
  FOREIGN KEY (workspace_id,project_id) REFERENCES projects(workspace_id,id);
CREATE FUNCTION prevent_workspace_reassignment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.workspace_id IS DISTINCT FROM NEW.workspace_id AND OLD.workspace_id IS NOT NULL THEN
    RAISE EXCEPTION 'workspace reassignment forbidden';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER projects_workspace_immutable BEFORE UPDATE OF workspace_id ON projects FOR EACH ROW EXECUTE FUNCTION prevent_workspace_reassignment();
CREATE TRIGGER keywords_workspace_immutable BEFORE UPDATE OF workspace_id ON keywords FOR EACH ROW EXECUTE FUNCTION prevent_workspace_reassignment();
CREATE TRIGGER audits_workspace_immutable BEFORE UPDATE OF workspace_id ON audits FOR EACH ROW EXECUTE FUNCTION prevent_workspace_reassignment();
