# SearchPilot database: installed schema versus planned architecture

**There are two SQL schemas for different purposes. Do not merge or interchange them.**

| Path | What it means | Used by running application? |
| --- | --- | --- |
| `db/schema.sql` | Base PostgreSQL bootstrap: `projects`, `keywords`, `audits` | **Yes**, first step in new Docker databases |
| `db/migrations/001_*.sql` | Users, signed sessions, workspaces, permissions, tenant-scoped references | **Yes** |
| `db/migrations/002_*.sql` | Manual ranking observations and indexes | **Yes** |
| `db/migrations/003_*.sql` | Durable API rate limit counters | **Yes** |
| `db/migrations/004_*.sql` | Google Search Console connection, OAuth state, search performance | **Yes** |
| `replica/schema.sql` | 28-table **future architecture proposal** for full feature parity | **No**; greenfield reference only |

The current application requires **12 operational tables** after the four migrations. The `schema_migrations` metadata table is optionally added by the migration tool, bringing a tracked installation to 13 tables.

## Why table names differ

| Running tables | Planned design objects | Explanation |
| --- | --- | --- |
| `local_users`, `local_sessions` | `app_users` plus externally managed authentication | Password-based local login is implemented today; future architecture assumes a different identity layer |
| `local_workspaces`, `local_workspace_members` | `workspaces`, `workspace_memberships`, `workspace_invitations` | Current workspace isolation is implemented; invitation workflows are planned |
| `projects` | `site_targets` | Current projects store one domain directly; future design splits workspace and target sites |
| `keywords` | `keyword_terms`, `keyword_lists`, `rank_campaign_keywords` | Current app stores tracked terms and optional manually entered figures in one table |
| `manual_rank_observations` | `rank_observations` | Only manual position history is currently implemented |
| `audits` | `audit_campaigns`, `audit_runs`, `crawled_pages`, `audit_findings` | Today a single-page audit saves checks as JSON; a multi-page crawler is future work |
| `gsc_connections`, `gsc_oauth_states`, `gsc_performance` | `integration_connections`, `metric_snapshots` plus future jobs | Current implementation supports bounded, official GSC imports |
| `security_rate_limits` | Operational infrastructure | Rate limiting is required now; it is not modeled as a product feature in the future schema |
| No corresponding current table | `backlinks`, `referring_domains`, report definitions and scheduled jobs | Depends on licensed data providers and future implementation |

**Security:** current route handlers explicitly check workspace membership and scope queries by workspace ID. The proposed 28-table schema uses PostgreSQL row-level security, but **RLS is not installed on the current operational tables**. Do not assume changing the blueprint modifies runtime security.

## Fresh development setup

Run `docker compose up -d`. On its **first volume initialization only**, Docker applies the base schema followed by migrations 001–004 in numeric order. You do not need to execute `replica/schema.sql`.

## Existing database

After a backup, run:

```bash
npm run db:status
npm run db:migrate
npm run db:status
```

`db:status` is read-only and reports installed/missing/partially-applied migration structures. `db:migrate` uses one PostgreSQL transaction and an advisory lock, installs missing migrations in order, records SHA-256 migration checksums in `schema_migrations`, and is safe to rerun. It detects already-installed migrations that predate the tracking table and adopts them only when the expected tables, constraints, indexes and triggers exist. It refuses partial installations or edited, previously tracked scripts.

The scripts read `DATABASE_URL` from the environment or ignored `.env`/`.env.local`. Neither script ever runs `replica/schema.sql`.

**Do not delete your Docker volume to resolve migration issues.** Existing legacy records with `workspace_id IS NULL` are intentionally not automatically assigned to newly registered accounts; verified ownership backfill is a separate task.

## Moving to the future architecture

Treat `replica/schema.sql` as a planning artifact. A move to that model would require explicit incremental migrations, data mapping, server query/API changes, row-level-security roles and tests. It cannot replace `db/schema.sql` without breaking the existing application.
