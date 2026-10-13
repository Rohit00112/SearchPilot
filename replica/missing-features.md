# SearchPilot prioritized missing-feature backlog — 2026-10-13

Source: validated `replica/features.csv`; weighted score **37.1/100**, 6/22 must-haves done. This list orders dependencies for safe development, **not** the scoring tool's automatic alphabetical-area order. See [diff-report.md](diff-report.md) for screen/flow evidence.

## P0: unblock reliable testing and truthful UX (before production)

| Priority | Task | Accept when |
| --- | --- | --- |
| P0.1 | Fix stable CSS/JS static-asset test delivery; seed isolated owner/viewer accounts, capture only correct authenticated screens, run 1440×900 and 390×844 Playwright, Axe, keyboard tests | All planned cases rerun; failures classified honestly, screenshots match route/state |
| P0.2 | Replace client-side CSV formula-risk export with authorized server CSV; add literal formula-prefix regression cases | Export cannot cause spreadsheet execution, downloads match workspace scope |
| P0.3 | Complete project-delete frontend and confirmation (API exists); improve empty/error/demo-data separation; 404 invalid tool URLs | End user can delete own project safely; viewer denied; no silent demo measurement substitution |

## P1: must-have product parity

| Order | Must-have gap | Suggested implementation and acceptance |
| --- | --- | --- |
| 1 | SEO overview / analytics provenance **partial** | Connect owner-approved GSC data to relevant widgets, make SAMPLE/source/collected time unambiguous, handle revoked/empty states |
| 2 | Domain overview research **no** | Independently authorized source-backed domain/organic metrics, geography/scope filtering, provider outage state; no static facts portrayed as measured |
| 3 | Organic rankings and positions **no** | Provider-backed ranked keywords and URL positions, sortable/date-filterable organic table with clear coverage/provenance |
| 4 | Keyword Magic seed research/groups **no** | Seed/country query producing genuine suggestions/groups/Questions (not portfolio search), add selected terms to project |
| 5 | Tracking engine/device/locale campaign **no** | Per-project target/config and consented rank provider snapshots; validate locale/device and persist config |
| 6 | Tracking snapshot, history, rank changes **partial** | Render /api/rankings histories and observed deltas with correct manual-vs-measured labels, no hard-coded chart substitution |
| 7 | Site Audit configuration/schedule **partial** | Budget/scope/robots-compliant crawl scheduling and safe queued multi-page fetch; track status and failure |
| 8 | Site Audit severity/explanations **partial** | Error/warning/notice taxonomy, affected pages, issue trends, actionable recommendations |
| 9 | Backlink overview metrics **no** | Independently licensed link index, actual referring domain counts, trustworthy dates and source metadata |
| 10 | Backlink/referring domain tables **no** | Link rows with source/target/anchor/attributes, drilldown/filter/pagination and export |
| 11 | Folder list/search/selection **partial** | Tags/pins, robust active-selection persistence/empty handling, correct owner roles |
| 12 | Create/rename site folders **partial** | Distinguish project/site from workspace permission model, add final folder semantics, validation and destructive confirmations |
| 13 | Responsive/a11y states **partial** | Full 390/1440 flows, mobile drawer/overflow, focus and keyboard + Axe evidence; no serious violations on critical screens |

Must-have incomplete count = **16**: the P1 table represents 15 scored incomplete rows (overview source + dashboard and tracking snapshot + history each combine two rows), and P0.3 covers the remaining **project edit/delete** row (API deletion exists but user-facing deletion does not). Account registration/login, manual keyword add/delete, homepage checks, persisted audit history and tenant isolation remain scored YES where applicable.

## P2: should-have parity and supporting work

- Workspace invitations/membership management (backend roles are present; end-user sharing is not).
- Keyword match/intent/difficulty research filters, standalone keyword SERP overview and strategy clusters.
- Keyword Gap and organic position-change comparisons.
- Backlink review/disavow workflow and audit themes/crawled page/run comparisons.
- Report gallery, editable templates, PDF rendering, scheduled delivery and access rules; tenant CSV is only partial.
- Live GSC integration test; Google Analytics OAuth/data integration; account recovery, profile/password settings.
- Position landscape and persistent keyword tags/notes.

## P3: optional/later

Plan quotas, competitor discovery, Backlink Gap, and broader AI Visibility, Traffic & Market, Content/Social, Advertising/Local toolkits. Use independently owned/authorized data and assets; Semrush private datasets, trademarks, accounts and partner relationships remain explicitly **excluded**, not engineering tasks.

## Gate to revisit parity

Run `/replica-build` task by task with regressions; update each exact `replica/features.csv` row only after demonstrable behavior, then `/replica-test` and the native `/replica-diff` tool again. No promised timeframe or provider licensing is assumed.
