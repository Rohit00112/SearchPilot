# SearchPilot build log

Date: 2026-10-13. Statuses reflect actual SearchPilot implementation, not Semrush feature parity. UI samples and proprietary-data-dependent tools remain partial until independent providers supply measured results. Recon defines 32 conceptual screens; some are tabs of larger tools.

| Screen | Status | Working implementation / remaining work |
| --- | --- | --- |
| S01 Marketing home | not started | Current `/` is authenticated-workspace-style dashboard; no public marketing landing |
| S02 Account entry | done (local accounts) | Login/register connected to hashed-password sessions; recovery/email verification remain |
| S03 Folder/workspace list | partial | Searchable project list, active selection; sharing/tags not yet present |
| S04 Project creation/settings | partial | Authenticated create/rename/delete; full folder settings/sharing planned |
| S05 SEO Dashboard | partial | Live project/keyword counts, illustrative traffic charts, current audit where available |
| S06 Domain Overview | partial | Domain overview UI with demonstrative estimates; no licensed domain dataset |
| S07 Organic Rankings overview | not started | Requires sourced search performance/rank provider |
| S08 Organic Positions/changes | not started | Requires historical observations |
| S09 Keyword Magic | partial | Track keywords, search/filter/export; suggestion index unavailable |
| S10 Keyword Overview | not started | SERP volumes/difficulty require independent provider |
| S11 Keyword Strategy Builder | not started | Keyword clustering/list modeling planned |
| S12 Keyword Gap | not started | Independent competitor keyword coverage required |
| S13 Site Audit Overview | partial | Single-page homepage audit results; crawler pending |
| S14 Site Audit setup | partial | User-entered domain; multi-page scope/schedule pending |
| S15 Report builder | partial | Summary UI and CSV; editable PDF composition pending |
| S16 Workspace permissions | partial | Backend owner/editor/viewer scoping; invitations and collaborator UI planned |
| S17 Rank campaign setup | partial | Manual keyword position/volume/difficulty entry; locale/device campaigns pending |
| S18 Rank Tracking overview | partial | Manual positions and illustrative trend; actual rank collection pending |
| S19 Rank Tracking table | partial | Existing keyword positions; historical movement unavailable |
| S20 Rank Tracking competitors | not started | Provider-backed comparative positions needed |
| S21 Position landscape | not started | Dependent on rank observations |
| S22 Rank notes/tags | not started | Needs annotation persistence |
| S23 Audit issues | partial | Filterable findings and expandable recommendations; multi-page crawler pending |

## Build iteration — 2026-10-13

- Added `/login`, `/register`, `/settings`, `/account` and PostgreSQL-backed local authentication with signed, revocable sessions.
- Added `db/migrations/001_local_auth_workspaces.sql` for members and tenant-owned project, keyword and audit rows. Legacy records without owners remain inaccessible until explicitly migrated.
- Enhanced searchable/selectable projects with PATCH rename/delete, keyword position/difficulty filters, manual keyword values, audit history and detailed findings. Charts and unlicensed analytics remain labeled **sample**.
- Verified baseline plus additive schema in an isolated PostgreSQL database; anonymous projects GET returned 401; local registration 201, login 200, authenticated project GET 200 and project POST 201. `npm run lint` and `npm run build` passed.
- Not implemented: external keyword/backlink/rank datasets, scheduled crawler, team invitation UI, Google Search Console OAuth, PDF report scheduler. Browser screenshot diff and full cross-tenant end-to-end automation pending. No Git commits: `/reverse` is not a repository.
| S24 Audit themes | not started | Requires multi-page audit rules |
| S25 Crawled pages/history | not started | Single-page audit only today |
| S26 Backlinks overview | partial | Sample dashboards; independent backlink index not connected |
| S27 Backlink details/domains | partial | Sample rows, provenance label; no live index |
| S28 Backlink Audit | not started | Needs licensed source, human triage workflow |
| S29 Backlink Gap | not started | Needs licensed source |
| S30 Reports list/schedules | partial | Overview and CSV export; scheduled PDF not available |
| S31 Search Console integration | not started | Official user-authorized OAuth and import required |
| S32 Organic traffic/on-page tools | not started | Requires licensed/first-party provider integration |

## Current validation and gates

Prior `/replica-design` delivered accessible UI primitives, a `/design` showcase, semantic tokens and verified Next.js lint/build. This build stage extends these without transferring third-party assets. UI visual parity screenshots at 390px and 1440px remain pending until an authenticated browser testing session is available. A separate `replica/schema.sql` contains a greenfield 28-table blueprint; it must **not** be applied over existing `db/schema.sql`.

Next: `/replica-test` when core auth and data flows pass. Continue to `/replica-backend` for secure multi-tenant data and provider integrations where incomplete.
