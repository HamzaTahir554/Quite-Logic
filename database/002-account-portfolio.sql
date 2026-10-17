BEGIN;
CREATE TABLE IF NOT EXISTS app_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS password_resets (
 token_hash text PRIMARY KEY, admin_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS resets_admin ON password_resets(admin_id);
CREATE INDEX IF NOT EXISTS resets_expiration ON password_resets(expires_at);
CREATE TABLE IF NOT EXISTS portfolio_projects (
 id uuid PRIMARY KEY, title text NOT NULL, description text NOT NULL, category text NOT NULL DEFAULT '',
 project_url text NOT NULL DEFAULT '', published boolean NOT NULL DEFAULT false, position integer NOT NULL DEFAULT 0,
 image bytea, image_path text, source_slug text UNIQUE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS portfolio_order ON portfolio_projects(published,position,id);
-- Seed the existing concepts only once. Deleted concepts must never reappear on migration.
INSERT INTO portfolio_projects(id,title,description,category,project_url,published,position,image_path,source_slug)
SELECT * FROM (VALUES
 ('10000000-0000-4000-8000-000000000001'::uuid,'Nexa / Ops','A command center for teams orchestrating AI workflows, approvals, and automations.','AI','/portfolio/nexa-ops',true,0,'/projects/nexa.svg','nexa-ops'),
 ('10000000-0000-4000-8000-000000000002'::uuid,'Pulse / CRM','A calm CRM concept that brings pipeline, activity, and customer signals into one readable view.','Web','/portfolio/pulse-crm',true,1,'/projects/pulse.svg','pulse-crm'),
 ('10000000-0000-4000-8000-000000000003'::uuid,'Atlas / Cloud','Developer-facing infrastructure interface with quick observability, deployments and system status.','Web','/portfolio/atlas-cloud',true,2,'/projects/atlas-cloud.svg','atlas-cloud')
) AS seeds(id,title,description,category,project_url,published,position,image_path,source_slug)
WHERE NOT EXISTS(SELECT 1 FROM app_migrations WHERE name='002-account-portfolio')
ON CONFLICT(id) DO NOTHING;
INSERT INTO app_migrations(name) VALUES('002-account-portfolio') ON CONFLICT DO NOTHING;
COMMIT;
