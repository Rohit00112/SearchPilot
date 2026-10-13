# SearchPilot functional parity and layout diff — 2026-10-13

## Verdict

**NOT SHIPPABLE against the 32-screen, 15-flow recon scope.**

The installed `/replica-diff` scoring tool reports **37.1 / 100 weighted feature parity** against `replica/features.csv`: **45 scored features**, **6 of 22 must-haves complete**, 10 must-haves partial, 6 must-haves absent, and 16 must-haves not complete. Four excluded rows describe assets, data and access that SearchPilot must not transfer from Semrush.

The matrix previously scored 44.3. We revised 11 feature entries against current source: sample-only research and backlink screens do **not** perform the research job; manual keyword portfolio filters are not Keyword Magic filters; reports have no report editor; API project deletion lacks a frontend action; backend workspace roles exist without invitations; homepage audit history/filtering is implemented. This is a stricter **functional** score, not a visual-similarity or code-quality score. Scoring weights are must = 3, should = 2, could = 1, partial = 0.5, skip excluded. Numerator = 39/105; rounded 37.1%.

**Visual parity: N/A (not scored).** There are no valid original/clone pairs captured at the same screen, state and viewport. No numeric screenshot/layout aggregate or machine-generated comparison PNG has been produced; a score would be misleading. Exact-pixel/trade-dress parity is neither required nor appropriate for this original SearchPilot design.

**Evidence inspected:** `replica/recon.md`, `replica/features.csv`, `replica/build-log.md`, `replica/test-plan.md`, `replica/bug-report.md`, `replica/bugs.md`, `replica/backend.md`, current `components/workspace.tsx`, `app/api/*`, `lib/*`, tests, reference assets and clone captures. This is a source/recent-test-evidence audit, **not** a new successful end-to-end browser run.

## 1. Screen coverage (32 conceptual screens)

The generic `app/[section]/page.tsx` can render a URL without implementing that tool. This inventory checks actual components, interactions and data, not route existence.

| Screen(s) | SearchPilot coverage | Important difference / action |
| --- | --- | --- |
| S01 Marketing home | Missing | `/` opens app dashboard, no public marketing homepage. |
| S02 Account entry | Functional local subset | Register/login/logout works with local sessions; password recovery and email verification missing. |
| S03–S04 Folder list/management | Partial | Search/select/create/rename via projects; no tags/pins, sharing, folder lock semantics, or UI delete action. |
| S05 SEO Dashboard | Partial | Project context and some persisted audit/keyword counts, but organic traffic/position/visibility charts are fixed SAMPLE statistics. |
| S06 Domain Overview | Visual shell only | Domain display and illustrative metrics; no live domain intelligence or scope/country filters. |
| S07–S08 Organic Rankings/Positions | Missing | No provider-backed domain organic positions, historical winners/losers or SERP-detail table. Manual rank observations are a different data source. |
| S09 Keyword Magic | Different limited workflow | `/keywords` manages already-added keywords; no seed-query suggestions, grouping, Questions, intent or match-type research. |
| S10–S12 Overview, Strategy, Keyword Gap | Missing | No SERP research, clustering, strategic lists or competitor keyword intersection. |
| S13–S14 Site Audit overview/setup | Partial | Run bounded HTTPS **homepage-only** checks; no crawl-budget/scope/robots rules or scheduled multi-page jobs. |
| S15 My Reports builder | Missing as editor | `/reports` is a static dashboard and CSV download, not drag/drop templates, saved definitions or preview. |
| S16 Workspace permissions | Backend subset only | Owner/editor/viewer checks exist; no inviting, member-management or sharing controls. |
| S17–S19 Tracking setup/overview/table | Partial | Add tracked terms and user-entered ranks; `/api/rankings` persists manual history but charts are static SAMPLE and no engine/device/geo campaign configuration exists. |
| S20–S22 Competitors, landscape, annotations | Missing | No competitor tracking, landscape, keyword tags or event notes UI. |
| S23 Audit issues | Partial | Persisted checks, status filter, history selector and expandable recommendations; no affected-page grouping or error/warning/notice taxonomy. |
| S24–S25 Themes, crawled pages/history comparison | Missing | One-page results only; no crawl graph, pages or run-to-run issue delta. |
| S26–S27 Backlinks and referring domains | Visual shell only | Fixed illustrative cards, charts and rows; no real source-backed backlink index or link-detail workflow. |
| S28–S29 Backlink Audit and Gap | Missing | No manual link risk review, whitelist/removal state or competitor referring-domain comparisons. |
| S30 Report list/schedules | Missing as list/scheduler | Summary page and CSV, no saved gallery or delivery schedules. |
| S31 Integrations | Backend subset only | Official GSC OAuth/property/performance endpoints; no connect/property-selection UI, unverified live OAuth; GA missing. |
| S32 Organic traffic/on-page insights | Missing | Neither provider-derived organic insights nor on-page improvement workflow. |

**Screen conclusion:** 32 documented concepts, roughly 16 with some visible SearchPilot entry point or UI subset; many of these are samples or semantically different workflows, **not** 16 fully implemented Semrush-equivalent screens. Sixteen recon concepts have no meaningful corresponding tool surface. S31 has backend support but not an accessible integration screen. The screen count and feature score must not be conflated.

## 2. Behavior / journey diff (recon F01–F15)

The “Original capability” column comes from public product documentation summarized in recon, **not from walking a live Semrush account**. No original interaction counts or current proprietary states are asserted.

| Flow | Original capability documented | SearchPilot observed implementation | Decision |
| --- | --- | --- | --- |
| F01 Workspace onboarding | Create/select folder and enable tool | Local signup; project create/search/select, project edit, no frontend delete/share | **Partial**: finish management, verification and empty states |
| F02 Evaluate domain | Domain → organic rankings → position detail | Static illustrative domain overview; no rankings drilldown | **Blocked**: measured domain/organic data |
| F03 Discover new keywords | Seed → match/group/filter → detail/strategy | Search existing manually tracked terms only | **Blocked**: implement actual seed research |
| F04 Competitor keyword gap | Compare rival keyword sets | No comparison data or screens | **Absent** |
| F05 Configure rank tracking | Engine/device/locale/campaign → positions | Add manual position and keyword; static trend | **Partial**: campaign model, rank ingestion and trend UI |
| F06 Diagnose rank decline | Time range/change → tags/annotations | Manual history API exists; UI lacks data-backed changes/tags | **Partial at API layer, blocked in UI** |
| F07 Run technical audit | Crawl scope/rules/schedule → results | Interactive homepage check and persisted audit history | **Partial**: bounded multi-page scheduler |
| F08 Fix technical issue | Severity → affected URLs → recrawl/compare | Check details, recommendations and pass/issue filter | **Partial**: pages, taxonomy and comparison |
| F09 Investigate links | Authority/referrer overview → link details | SAMPLE overview and rows, no real link source | **Preview only** |
| F10 Review risky links | Review/whitelist/removal/disavow | No workflow | **Absent** |
| F11 Discover link gap | Compare competitor referrers | No workflow | **Absent** |
| F12 Deliver report | Gallery/template → preview → schedule/export | Client CSV keywords and protected backend CSV; no PDF report builder | **Partial**, CSV path needs hardening |
| F13 Share workspace | Invite and manage roles | Backend membership/roles, no invite API/UI | **Blocked** |
| F14 Connect Search Console | OAuth → select property → use measured data | GSC API routes exist, no frontend connection UI, no live consent verification | **Backend-only partial** |
| F15 Switch clients/filters | Context switch with preserved scoped content | Project picker/search and sessionStorage; browser/multi-tab behavior unverified | **Partial; retest** |

Current browser specs explicitly cover subsets of F01/F02/F03/F05/F07/F08/F09/F12/F15; **F04/F06/F10/F11/F13/F14 have no browser suite coverage**. Even covered cases are not all executed or passing.

## 3. Screenshot and layout evidence

| Reference (public KB) | Saved size | Nearest SearchPilot evidence | Why it cannot be scored |
| --- | --- | --- | --- |
| `screens/S09-keyword-magic-public-reference.jpg` | 1600×995 | `clone-screens/F03-H1-1440.png` | The saved F03 image is **login**, not Keyword Magic; mismatched state and content. |
| `screens/S13-site-audit-public-reference.png` | 1600×927 | `clone-screens/F07-H1-1440.png` | The saved F07 image is **login**, not the audit screen. |
| `screens/S15-report-builder-public-reference.png` | 2828×636 | No F12/report-builder capture | Reference is an annotated report-builder crop; matching SearchPilot editor doesn't exist. |

Five files — `F01-H1-1440.png`, `F03-H1-1440.png`, `F05-H1-1440.png`, `F07-H1-1440.png` and `F09-H1-1440.png` — have an identical SHA-256 and depict the login view despite different flow names. `F02-H1-1440.png` is 1440×1567 and displays largely **unstyled** domain content after asset loading problems. Other desktop saved shots show styled login/register. There are **eight desktop captures**, seven at 1440×900 and one full-page 1440×1567.

No successful `390×844` clone comparison captures exist in `replica/clone-screens/`. Two `390×844` failure screenshots in `replica/test-results/` concern login/register with CSS/JS HTTP 400 responses; they prove an invalid test/capture state, not healthy mobile responsiveness. Public references are historical annotated crops, not matched authenticated full-page 1440×900/390×844 views. **`imgdiff.py` correctly has no eligible input pair for quantitative analysis.**

**Qualitative layout findings only:** The S09 reference exposes seed search, match types, grouped suggestions and tabular SERP research that SearchPilot's keyword portfolio lacks; S13 exposes crawled-page counts, comparisons and thematic issue trends that the homepage checker lacks; S15 exposes a report editor absent from SearchPilot. These are **information-architecture/feature gaps**, not valid numerical pixel or edge comparisons. Source code implements a responsive sidebar/menu and scrollable keyword table, but successful 390px runtime operation is unverified. Keep SearchPilot's own design language; do not reproduce Semrush trade dress.

## 4. UX and incomplete interaction risks

1. **Broken QA screenshot conditions**: unauthenticated navigation captured login instead of target screen; a domain screenshot is missing styles. Fix stable served JS/CSS assets, seeded authentication and screenshot assertions before visual judgment.
2. **Non-functional research controls**: header “Search keywords” only filters the selected stored keyword list; keyword filters are not discovery filters. No source, country, device, time range or SERP filter semantics on research pages.
3. **Misleading fixed figures risk**: overview/domain/report/backlink metrics, ranking arrows and several audit summary counts are constant in `components/workspace.tsx`. Many are labeled SAMPLE/illustrative, but any mixed real/sample panel must label each metric clearly; avoid generic “All systems ready” while providers are disconnected.
4. **Incomplete actions**: API supports project DELETE but there is no UI action/confirmation; account lacks password recovery and user/team management; integrations lack OAuth connect/status/property controls.
5. **Rank-history disconnect**: `/api/rankings` stores timestamped manual observations with provenance; Position Tracking displays an independent hard-coded monthly chart instead of that history.
6. **CSV export inconsistency / possible spreadsheet formula injection**: `components/workspace.tsx:224` produces a client-side CSV by quoting cells but without formula neutralization, whereas `/api/reports` has a formula-escaping server path. A formula-prefixed keyword could be evaluated by some spreadsheet applications; code-level concern **not yet exploit-tested**. Route the UI export to validated tenant-scoped server output and run a regression test before release.
7. **Unverified mobile/a11y**: source includes a mobile drawer, focus management, grid breakpoints and table overflow, but browser execution at 390 has not passed; selected contrast fixes are not a full WCAG or keyboard audit.
8. **Route fallback**: `app/[section]/page.tsx` renders the generic Workspace for unknown slugs, and Workspace defaults to overview content. Unknown URLs should produce a deliberate 404, not an SEO dashboard under a nonsensical path.

## 5. Backend data, safety and deployment gaps

- **Works in scoped local tests:** local hashed-password accounts, revocable HttpOnly sessions, workspace ownership checks, projects/keywords, manual rank observations, homepage audit/history, bounded tenant CSV, OAuth/PKCE-encrypted GSC endpoints. A prior isolated two-account API suite recorded **17/17 assertion passes** after the audit UUID fix. This was **not rerun** during diff.
- **Not end-to-end integrated:** real traffic/search-volume/organic/backlink datasets; automatic SERP collection; seeded SEO research; scheduled multi-page crawler; report definitions/PDF/email; invite/member management; user-facing GSC setup and imported metric charts.
- **GSC limitations:** OAuth code exists but is unverified with actual owner credentials, and current fetch caps at 1,000 rows per request. GSC average position is not exact SERP rank and must not be merged without provenance. Google Analytics is absent.
- **Crawler limitations:** HTTPS public-domain checks, DNS-pinned IPv4 and bounded home-page read are not a robots-aware queued crawler with crawl limits, safe egress policy and scheduling.
- **Security/operations:** active `db/schema.sql` + migrations 001–004 have application-level tenant isolation, **no active PostgreSQL RLS**; the separate `replica/schema.sql` is a future blueprint and must not be applied directly. Require production role privileges, request-size caps, rate-limit/proxy review, credential provisioning, backups/restore drill, network egress controls and security review. Missing RLS alone is not a reproduced exploit.

### Existing test evidence and release gates

| Check | Recorded outcome | Confidence |
| --- | --- | --- |
| API two-user suite | 17/17 assertions pass (previous QA) | Supported for those exercised routes; not a full API security proof |
| Desktop auth UI | 2 pass, 1 skipped in prior run | Narrow |
| Mobile auth UI | 2 failed, 1 skipped in prior run | CSS/JS asset HTTP 400; environment/hydration not stable |
| Browser suite | 36 test instances discovered | Not a pass; suite not green |
| Cross-route Axe/keyboard | Some contrast findings corrected | Full routes/mobile/focus not verified |
| GSC live OAuth & data | Not performed | Requires authorized Google credentials |
| Layout diff | No eligible pairs | **N/A, not 0%** |
| Current task | Matrix/code/screenshot audit and native parity calculation | No server, external scan or database modification |

No reproduced S1 is currently reported in `replica/bugs.md`; historical S2 findings are marked corrected locally. This does **not** establish production safety, availability or zero undiscovered defects.

## 6. Prioritized next work

See **[missing-features.md](missing-features.md)** for concrete build order, user-visible acceptance criteria and all remaining must-haves. The next five development work packages are:

1. **P0 — Make browser evidence trustworthy and close user-facing integrity gaps.** Stable isolated Next asset build + seeded owner/viewer accounts, full mobile/desktop/auth captures, interactive regressions, project DELETE UX/confirmation, safe CSV export. Gate: 36 listed cases rerun to real pass/skip-with-reason; no unexplained 5xx/JS asset failures, no serious axe findings on key screens.
2. **P1 — Deliver end-to-end authorized first-party analytics.** Finish GSC connect/consent/property/disconnect/import UI and measured dashboard widgets with source/freshness badges and disconnect/empty/error states. Gate: real approved property end-to-end test and honest bounded/truncation handling.
3. **P1 — Build actual domain/organic/keyword discovery.** Independently licensed data provider or first-party source; country/seed research, groups/match/intent/volume, domain positions and dates. Gate: no invented metrics; source-backed rows, useful filter/empty/provider-error flows.
4. **P1 — Make tracking a real campaign.** Engine/device/locale configuration, legitimate observations, per-keyword trends/changes with stored provenance, comparisons and pagination. Gate: repeated measured snapshot tests and real trend rendering (not hard-coded arrays).
5. **P1 — Complete actionable audit and backlink foundations.** Robots-compliant bounded multi-page crawl jobs/schedules, categorized issues, pages and historical diffs; source-backed backlink/referring-domain index with date/freshness, real drilldowns. Gate: safe tested crawl boundaries and truthful backlink tables; split into independent deliverables when implementation begins.

### Overall release decision

Under `/replica-diff`: **not shippable** whenever any must-have remains incomplete or an S1 is open. SearchPilot has **16 incomplete must-haves** and important unverified browser/provider integrations. Continue via `/replica-build` on the above gaps, then repeat `/replica-test` and `/replica-diff` with stable capture data. No deployment or direct replacement of the active database is authorized by this report.

