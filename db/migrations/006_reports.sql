-- Tenant-owned report definitions. Print/PDF generation remains a browser action;
-- scheduled sends require an explicitly configured mail and background-job service.
CREATE TABLE IF NOT EXISTS report_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES local_workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  created_by uuid NOT NULL REFERENCES local_users(id),
  title varchar(160) NOT NULL CHECK (length(btrim(title)) > 0),
  blocks jsonb NOT NULL DEFAULT '["overview","keywords","audit"]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id,id),
  CONSTRAINT report_definitions_project_scope FOREIGN KEY(workspace_id,project_id)
    REFERENCES projects(workspace_id,id) ON DELETE CASCADE,
  CONSTRAINT report_definitions_blocks_array CHECK(jsonb_typeof(blocks)='array')
);
CREATE INDEX IF NOT EXISTS report_definitions_workspace_project ON report_definitions(workspace_id,project_id,updated_at DESC);
