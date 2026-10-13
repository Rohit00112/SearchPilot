# SearchPilot implementation roadmap

**Status:** proposed next work after the existing MVP. References [recon.md](recon.md), [features.csv](features.csv), [architecture.md](architecture.md), [schema.sql](schema.sql), and [api-spec.md](api-spec.md). Existing application and `db/schema.sql` are preserved.

## Milestones and build order

| Step | Priority/status | Screens, flows | Tables and API scope | Acceptance |
| --- | --- | --- | --- | --- |
| M0 Baseline | existing | S03/S05/S06/S09/S13/S18/S26/S30 partial | current `projects`, `keywords`, `audits`; `/api/projects`, `/api/keywords`, `/api/audit` | Preserve current compilation and one-page audit |
| M1 Authenticated vertical slice | first new **must** | S02–S05/S09/S13/S23; F01/F07/F08 | users, workspaces, memberships, site targets, keyword tracking, audit runs/jobs; new authenticated `/api/v1/workspaces/*` | Login → create workspace → add keyword → run safe one-page audit → see results; second user cannot access it |
| M2 Bounded crawler | must to complete audit | S14/S13/S23–S25; F07/F08 | crawl configs, jobs, pages, findings; audit campaigns/runs/pages APIs | robots rules, size/depth/time budgets, public-IP-only pinned connections, retries, compare runs |
| M3 Google Search Console | should/high value | S31/S05/S06; F02/F14 | connections, properties, performance, sync cursors; `/api/v1/integrations/google/*` | Official consent, property selection, daily import, freshness, token revoke, source labels |
| M4 Rank campaigns/history | must | S17–S22; F05/F06 | rank campaigns, tracked terms, observations; tracking APIs | Target country/device/engine, NULL unranked, history from a real provider; distinguish GSC average position |
| M5 Keyword research | must/should | S06–S12; F02–F04 | keyword catalog, lists, clusters, competitor comparisons; research APIs | Independently licensed metrics, filters, list persistence, honest no-data states |
| M6 Backlink intelligence | must/should | S26–S29; F09–F11 | referring domains, link observations, reviews; backlink APIs | Licensed source, new/lost changes, manual reviews and safe decisions |
| M7 Reports/team | should | S15/S16/S30; F12/F13/F15 | invitations, report definitions/deliveries; report APIs | Viewer cannot mutate, PDF source labels, deduplicated scheduled email |
| M8 Optional suites | could | future | separate feature modules | Only after accurate core measurement and provider economics |

## The M1 thin vertical slice

1. Introduce Auth.js sessions with supported OIDC (e.g., Google) and user records. Create each workspace and owner membership in one transaction. Guest stays outside user data.
2. Implement `requireWorkspaceRole(userId, workspaceId, minimumRole)` in the data layer and make all tenant queries constrain `workspace_id`. Never trust user ID or role from JSON. An unauthorized tenant ID returns 404; viewer edits return 403.
3. Build keyword create/list/delete and audit-run endpoints for a chosen workspace. Unique keywords within a campaign, robust input validation, and `NULL` for unranked metrics. Demo data remains distinctly labeled.
4. Enqueue one restricted homepage audit, save run status and results, show pending/completed/failed without inventing success. Enforce bounded SSRF-protected egress.
5. Update existing frontend selectively to the new API while retaining old UI behavior in local development. Deploy public endpoints only after blocking all legacy unscoped URLs.
6. Backup and migrate old project IDs with explicit ownership mapping. Do not silently assign legacy records to an arbitrary account.

**M1 tests:** anonymous access denied; owner/editor/viewer matrix; cross-workspace object ID guesses cannot read/update/delete; duplicate tracking returns 409; malformed input returns 422; repeated audit creation is idempotent; private and DNS-rebinding targets blocked; session expiry handled; mobile keyboard navigation works; original routes still compile.

## Data and operations gates

**Migration:** `replica/schema.sql` is a greenfield review blueprint, **not an in-place migration**. Keep bootstrapping `db/schema.sql`; introduce `db/migrations/` additive revisions with a tracked schema version, backup, dry-run and rollback. Backfill owner/workspace IDs in verified batches, shadow read, switch APIs, enforce NOT NULL and composite tenant FKs after validation, then remove old routes. Never apply the greenfield SQL over populated production tables.

**Provider decisions:** GSC offers verified property queries/pages/clicks/impressions/CTR/average position but neither global competitor keyword-volume indexes nor a backlink graph. M4–M6 require separate, authorized rank and licensed research feeds. Verify contract cost, locale coverage, freshness, rate limits and retention before promising those features.

**Worker:** PostgreSQL durable job table and Node worker process in the same repository; `FOR UPDATE SKIP LOCKED`, unique idempotency keys, leases, retry budget, dead-letter state, per-origin concurrency, graceful shutdown and health metrics. Scheduled jobs use target timezone with DST-aware date scheduling; events/exports must not be emailed twice.

**Security/release:** rate limits per actor/tenant/domain, JSON size limits, tenant-safe caches, CSP/HSTS/TLS, protected refresh tokens, auditable membership changes, dependency upgrades, privacy export/deletion, backup/restore tests, secrets out of logs, outbound allow/deny network policy, URL rebinding tests. Pagination defaults to 25 (max 100) and uses keyset for large date-series tables. Every metric exposes provider, observed_at, collected_at and whether demo/manual/live/licensed.

**Verification at each stage:** SQL migration tests, permission tests, idempotency/duplicate tests, crawl safety tests, meaningful integration tests, `npm run lint`, `npm run build`, reverse-proxy smoke tests and data correctness checks.

**Next:** `/replica-design` for original SearchPilot component tokens and states, then M1 authenticated vertical slice.
