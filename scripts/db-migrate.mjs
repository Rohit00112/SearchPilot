#!/usr/bin/env node
// SearchPilot's installed schema is db/schema.sql + these additive migrations.
// The independent replica/schema.sql is a future design and is never loaded.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const names = [
  '001_local_auth_workspaces',
  '002_rank_reports',
  '003_security_limits',
  '004_gsc',
];
const base = { tables: ['projects', 'keywords', 'audits'] };
const expected = {
  '001_local_auth_workspaces': {
    tables: ['local_users', 'local_workspaces', 'local_workspace_members', 'local_sessions'],
    columns: ['projects.workspace_id', 'keywords.workspace_id', 'audits.workspace_id'],
    indexes: ['local_users_email_ci', 'local_workspace_members_user', 'local_sessions_active',
      'projects_workspace_id_id', 'projects_workspace_created', 'keywords_workspace_project', 'audits_workspace_project_checked'],
    constraints: ['keywords_workspace_project_fk', 'audits_workspace_project_fk'],
    triggers: ['projects_workspace_immutable', 'keywords_workspace_immutable', 'audits_workspace_immutable'],
  },
  '002_rank_reports': {
    tables: ['manual_rank_observations'],
    indexes: ['keywords_workspace_id_id', 'keywords_id_project_id', 'manual_rank_workspace_project_time', 'manual_rank_workspace_keyword_time'],
    constraints: ['manual_rank_project_scope', 'manual_rank_keyword_scope', 'manual_rank_keyword_project_scope'],
  },
  '003_security_limits': {
    tables: ['security_rate_limits'],
    indexes: ['security_rate_limits_stale'],
  },
  '004_gsc': {
    tables: ['gsc_connections', 'gsc_oauth_states', 'gsc_performance'],
    indexes: ['gsc_connections_workspace', 'gsc_oauth_states_expiry', 'gsc_performance_workspace_date'],
  },
};
const migrationFiles = names.map(name => ({
  name,
  sql: readFileSync(join(root, 'db', 'migrations', name + '.sql'), 'utf8'),
}));
for (const item of migrationFiles) {
  item.checksum = createHash('sha256').update(item.sql).digest('hex');
}

async function catalog(client) {
  // One pg.Client cannot safely execute parallel queries (pg 9 disallows it).
  const tables = await client.query("SELECT tablename AS name FROM pg_tables WHERE schemaname='public'");
  const cols = await client.query("SELECT table_name || '.' || column_name AS name FROM information_schema.columns WHERE table_schema='public'");
  const indexes = await client.query("SELECT indexname AS name FROM pg_indexes WHERE schemaname='public'");
  const constraints = await client.query("SELECT conname AS name FROM pg_constraint WHERE connamespace='public'::regnamespace");
  const triggers = await client.query("SELECT tgname AS name FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN (SELECT oid FROM pg_class WHERE relnamespace='public'::regnamespace)");
  return {
    tables: new Set(tables.rows.map(r => r.name)),
    columns: new Set(cols.rows.map(r => r.name)),
    indexes: new Set(indexes.rows.map(r => r.name)),
    constraints: new Set(constraints.rows.map(r => r.name)),
    triggers: new Set(triggers.rows.map(r => r.name)),
  };
}
function state(catalogue, spec) {
  const missing = Object.entries(spec).flatMap(([kind, names]) =>
    names.filter(name => !catalogue[kind].has(name)).map(name => kind + ':' + name));
  const total = Object.values(spec).reduce((sum, names) => sum + names.length, 0);
  return { kind: missing.length === 0 ? 'present' : missing.length === total ? 'absent' : 'partial', missing };
}
async function ledger(client, catalogue) {
  if (!catalogue.tables.has('schema_migrations')) return new Map();
  const { rows } = await client.query('SELECT version, checksum, adopted_existing FROM schema_migrations');
  return new Map(rows.map(r => [r.version, r]));
}
const mode = process.argv[2] ?? 'status';
if (!['status', 'migrate'].includes(mode)) {
  console.error('Usage: npm run db:status OR npm run db:migrate');
  process.exit(2);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required; no database changes were made.');
  process.exit(2);
}
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  if (mode === 'status') {
    const found = await catalog(client);
    const existing = await ledger(client, found);
    let failed = false;
    const b = state(found, base);
    console.log('Current SearchPilot schema: db/schema.sql + db/migrations/*.sql');
    console.log('Base schema: ' + b.kind);
    if (b.kind === 'partial') failed = true;
    for (const item of migrationFiles) {
      const s = state(found, expected[item.name]);
      const recorded = existing.get(item.name);
      const mismatch = recorded && recorded.checksum !== item.checksum;
      const broken = s.kind === 'partial' || (recorded && s.kind !== 'present') || mismatch;
      console.log(item.name + ': ' + s.kind +
        (recorded ? ' (tracked)' : s.kind === 'present' ? ' (applied before tracking)' : '') +
        (mismatch ? ' [CHECKSUM MISMATCH]' : '') +
        (s.kind === 'partial' ? ' [missing: ' + s.missing.join(', ') + ']' : ''));
      if (broken) failed = true;
    }
    console.log('Future blueprint: replica/schema.sql (NOT installed)');
    if (failed) process.exitCode = 1;
  } else {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(718275402)');
    let found = await catalog(client);
    let b = state(found, base);
    if (b.kind === 'partial') throw new Error('Incomplete base schema; refusing automatic repair. Review database before migrating.');
    if (b.kind === 'absent') {
      await client.query(readFileSync(join(root, 'db', 'schema.sql'), 'utf8'));
      found = await catalog(client);
      b = state(found, base);
      if (b.kind !== 'present') throw new Error('Base schema initialization failed.');
      console.log('Installed base schema.');
    }
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      checksum char(64) NOT NULL,
      adopted_existing boolean NOT NULL DEFAULT false,
      installed_at timestamptz NOT NULL DEFAULT now()
    )`);
    found = await catalog(client);
    const tracked = await ledger(client, found);
    for (const item of migrationFiles) {
      let s = state(found, expected[item.name]);
      const alreadyPresent = s.kind === 'present';
      const previous = tracked.get(item.name);
      if (previous && previous.checksum !== item.checksum) {
        throw new Error(item.name + ': stored checksum differs; never rewrite an applied migration.');
      }
      if (s.kind === 'partial') {
        throw new Error(item.name + ': partially applied (missing ' + s.missing.join(', ') + '); review manually.');
      }
      if (previous && s.kind !== 'present') {
        throw new Error(item.name + ': migration tracked but database objects missing.');
      }
      if (s.kind === 'absent') {
        await client.query(item.sql);
        found = await catalog(client);
        s = state(found, expected[item.name]);
        if (s.kind !== 'present') throw new Error(item.name + ': verification failed after migration.');
      }
      if (!previous) {
        // Externally installed migrations are adopted only after verifying objects.
        await client.query('INSERT INTO schema_migrations(version,checksum,adopted_existing) VALUES($1,$2,$3)',
          [item.name, item.checksum, alreadyPresent]);
      }
      console.log(item.name + ': ' + (previous ? 'already tracked' : 'verified and recorded'));
    }
    await client.query('COMMIT');
    console.log('Database schema is current. replica/schema.sql remains future-only.');
  }
} catch (error) {
  if (mode === 'migrate') await client.query('ROLLBACK').catch(() => {});
  console.error('Schema check failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
