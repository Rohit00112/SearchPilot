## Parity: 37.1 / 100

features 37.1  (45 counted, must-haves 6 of 22 done)

Not shippable yet: 16 must-have features are not done.

## By area, weakest first
- domain                         0.0  (1 features)
- organic rankings               0.0  (2 features)
- keywords                       0.0  (4 features)
- competitive research           0.0  (1 features)
- backlinks                      0.0  (4 features)
- plans                          0.0  (1 features)
- expansion                      0.0  (4 features)
- reports                       25.0  (2 features)
- tracking                      45.0  (8 features)
- workspace                     50.0  (4 features)
- overview                      50.0  (2 features)
- integrations                  50.0  (1 features)
- ui                            50.0  (1 features)
- audit                         61.1  (7 features)
- accounts                      80.0  (2 features)
- security                     100.0  (1 features)

## Missing, in build order
- [must] backlinks: Backlinks Overview metrics and visualizations, no  (P20; cards and trend use hard-coded illustrative counts; no backlink measurements, provider or live index to perform overview analysis)
- [must] backlinks: Backlinks and referring domains table, no  (P21; visible referring-domain rows are static illustrative names; no real backlinks, filters, provenance or source drilldown)
- [must] domain: Domain overview research, no  (P04; existing domain screen is illustrative only, with static traffic, authority, backlink and keyword estimates; no measured domain-research provider)
- [must] keywords: Keyword Magic seed search and groups, no  (P09/P10; the current keyword page searches existing manually added tracked terms, not new seed-derived suggestions, groups, or Questions)
- [must] organic rankings: Organic rankings overview and positions, no  (P05/P06; no independent rankings index)
- [must] tracking: Tracking campaign target engine device locale, no  (P13; existing project no engine/device/locale campaign config)
- [must] audit: Site Audit configuration and schedule, partial  (Manual single-homepage domain input with bounded HTTPS fetch; multi-page scheduled crawl absent)
- [must] audit: Site Audit issue severity and explanations, partial  (P18; recommendation text exists; no full issue taxonomy)
- [must] overview: Analytics source and freshness badges, partial  (SearchPilot-specific integrity requirement; sample badge exists)
- [must] overview: SEO overview dashboard, partial  (P03; synthetic sample metrics, no connected analytics)
- [must] tracking: Position Tracking rank snapshot dashboard, partial  (P14; local manually populated ranking, trend illustrative)
- [must] tracking: Position Tracking timeseries and rank changes, partial  (P14; tenant-scoped /api/rankings supports stored manual timestamped observations, but UI charts remain static SAMPLE and historical comparison is not wired to API)
- [must] ui: Responsiveness and accessibility states, partial  (SearchPilot design requirement; inferred exact Semrush mobile states)
- [must] workspace: Create and rename site workspaces, partial  (P02; project create and rename/update/delete available; full folder tags/sharing not implemented)
- [must] workspace: Edit and delete owned projects, partial  (PATCH/DELETE /api/projects are authorized and persistent, and editing exists in the UI, but no project delete action or confirmation is exposed through components/workspace.tsx; end-user delete flow incomplete)
- [must] workspace: Folder list, search and selection, partial  (P02; searchable projects and persistent active selection; folder tags/pins absent)
- [should] audit: Site Audit crawled pages and comparisons, no  (P17/P19; no multi-page crawl/history comparison)
- [should] audit: Site Audit thematic reports, no  (P17; technical crawlability/HTTPS etc beyond homepage)
- [should] backlinks: Backlink Audit review workflow, no  (P22/P23; toxicity is never automatically authoritative)
- [should] competitive research: Keyword Gap between competitor sites, no  (P12; separate SERP dataset required)
- [should] keywords: Keyword Magic match, intent and difficulty filters, no  (P09; existing difficulty/position filters apply only to stored tracked terms; research match type, intent and provider filters are absent)
- [should] keywords: Keyword Strategy Builder and clusters, no  (P11; pillar/topic cluster future phase)
- [should] keywords: Keyword overview SERP and difficulty, no  (P08; needs licensed SERP/volume source)
- [should] organic rankings: Organic position changes historical filters, no  (P07; requires longitudinal ranking observations)
- [should] reports: Reports gallery and templated editor, no  (P25; /reports has a static summary and CSV button, not saved reports, gallery, report templates, editable widgets or preview)
- [should] tracking: Position Tracking Landscape overview, no  (P15; no dedicated page)
- [should] tracking: Position Tracking keyword tags and notes, no  (P14; no persistent annotation model)
- [should] accounts: Account settings and sign out, partial  (Account/session display and logout; profile/password management and invitations planned)
- [should] integrations: Google Search Console and Analytics integrations, partial  (P03/S31; official GSC OAuth/properties/performance backend exists but live OAuth unverified, no connect/property UI, and Google Analytics integration absent)
- [should] reports: Report export and scheduling, partial  (Tenant-scoped CSV export keywords/manual rank history; PDF/scheduling absent)
- [should] workspace: Folder sharing and access roles, partial  (P02; backend owner/editor/viewer permissions and tenant checks exist, but no sharing/invite/member management UI or collaborator onboarding)
- [could] backlinks: Backlink Gap competitor comparison, no  (P24; licensed or independent link data required)
- [could] expansion: AI Visibility toolkit, no  (P01/P27; separate product area)
- [could] expansion: Advertising and local toolkits, no  (P01/P27; separate product area)
- [could] expansion: Content and social toolkits, no  (P01/P27; separate product area)
- [could] expansion: Traffic and market intelligence toolkit, no  (P01/P27; separate product area)
- [could] plans: Performance under plan quotas, no  (P10/P13; product-specific quota design)
- [could] tracking: Position Tracking competitor discovery, no  (P14; requires observed SERP datasets)

## Left out on purpose (not scored)
- Semrush proprietary datasets and historical metrics: Cannot transfer/use private historical indexes
- Semrush branded UI artwork and trademarks: Original product assets must be independently authored
- Authenticated internal UI and private endpoints: Public references only; no private sessions or APIs
- Existing user network and partner agreements: Not transferable to independently built SearchPilot

## Visual layout parity: not scored

There are **zero** valid public-reference vs. SearchPilot screenshot pairs at the same screen/state/viewport. Saved F03/F05/F07/F09 screenshots are login redirects, F02 is unstyled and no healthy 390×844 clone captures exist. Public reference S09/S13/S15 assets are annotated historical documentation crops. Computing an `imgdiff.py` percentage would be misleading; **N/A must not be treated as 0%**. See [diff-report.md](diff-report.md#3-screenshot-and-layout-evidence) and [diffs/README.md](diffs/README.md).

## Behavior parity: incomplete

Prior isolated two-user API regression: 17/17 checks passed; full Playwright browser suite **not green**. Key missing journeys are provider-backed domain/organic/keyword research, geo/device tracking campaign and automated ranks, multi-page audit/scheduling, real backlink index/review, report builder, workspace invitations and user-facing Google Search Console setup. See [diff-report.md](diff-report.md#2-behavior--journey-diff-recon-f01f15) for F01–F15 details.

## Priority development tasks

1. Stabilize healthy authenticated 1440×900/390×844 test states; fix UI CSV injection risk and missing project-delete control.
2. Wire verified owner-approved GSC property performance into data-backed analytics widgets with provenance/freshness.
3. Integrate independently licensed or authorized domain/organic and seed-keyword research sources.
4. Implement configured location/device/engine rank campaigns and render observed history/deltas.
5. Implement bounded, compliant scheduled multi-page audits and genuine sourced backlink analysis, as separately scoped components.

**Verdict:** **NOT SHIPPABLE** against the documented recon scope: **16 of 22 must-have feature rows are not fully implemented**, despite no currently reproduced open S1 in the bug report. Do not deploy or treat historical screenshots as measured parity. Full findings are in [diff-report.md](diff-report.md); implementation order is in [missing-features.md](missing-features.md).
