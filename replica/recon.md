# SearchPilot research: Semrush publicly documented SEO platform

**Reviewed:** 2026-10-13. **Platform:** web. **Target:** independently implemented SearchPilot using Next.js, TypeScript, Tailwind CSS and PostgreSQL.

**Scope:** SEO toolchain: website workspaces, SEO Dashboard, domain and organic ranking research, keyword research, custom rank tracking, site auditing, backlink intelligence and reporting. Adjacent toolkits are mapped for navigation but excluded from the first implementation slice.

**Audience:** independent marketers, agencies, small businesses and website owners.

**Method:** public product pages, public knowledge-base manuals and selected screenshots embedded in those manuals. No Semrush account was accessed, no protected pages or source code were read, no private APIs were used, and no network calls were recorded.

**Evidence notation:** **C** = directly described in a linked public Semrush article; **I** = reasonable UX/design inference or recommended SearchPilot behavior not independently observed; **R** = an internal research screenshot from a public help article. The screenshots are historical illustrations, not verified screenshots of the current authenticated interface.

## Sources

| ID | Public source | URL | What it confirms |
| --- | --- | --- | --- |
| P01 | Public marketing navigation | https://www.semrush.com/ | top-level product groups |
| P02 | Folders | https://www.semrush.com/kb/243-managing-a-folder | folder creation, tags, permissions and locked domain |
| P03 | SEO Dashboard | https://www.semrush.com/kb/1195-seo-dashboard | project widgets, drill-down, GA/GSC integration |
| P04 | Domain Overview | https://www.semrush.com/kb/254-domain-overview | organic/paid/AI/backlink indicators and domain scopes |
| P05 | Organic Rankings | https://www.semrush.com/kb/890-Organic-Rankings-Overview | research summary, positions and competitors |
| P06 | Organic Positions | https://www.semrush.com/kb/494-organic-rankings-positions-report | rankings table and per-keyword row interactions |
| P07 | Organic Position Changes | https://www.semrush.com/kb/495-organic-rankings-position-changes-report | improved/declined and historical filters |
| P08 | Keyword Overview | https://www.semrush.com/kb/257-keyword-overview | volume, difficulty, intent and SERP data |
| P09 | Keyword Magic Tool | https://www.semrush.com/kb/617-keyword-magic-tool-manual | match types, groups, question search, columns and export |
| P10 | Keyword Magic limits | https://www.semrush.com/kb/262-keyword-magic-tool | subscription-based result/export limits |
| P11 | Keyword Strategy Builder | https://www.semrush.com/kb/1058-keyword-strategy-builder | structured/regular lists, clusters, pillar/subpages |
| P12 | Keyword Gap | https://www.semrush.com/kb/28-keyword-gap | portfolio intersections and comparison filters |
| P13 | Tracking configuration | https://www.semrush.com/kb/548-configuring-position-tracking | device, engine, location, import, configuration constraints |
| P14 | Tracking overview | https://www.semrush.com/kb/549-position-tracking-overview-manual | visibility trends, ranks, competitors, notes, exports |
| P15 | Tracking landscape | https://www.semrush.com/kb/923-position-tracking-landscape | top-level KPIs, landing pages, loss signals |
| P16 | Site Audit configuration | https://www.semrush.com/kb/539-configuring-site-audit | crawl scope, source, budget, schedule, user agent |
| P17 | Site Audit overview | https://www.semrush.com/kb/540-site-audit-overview | site health, AI health, issues and thematic reports |
| P18 | Site Audit issues | https://www.semrush.com/kb/541-site-audit-issues-report | error/warning/notice categories and issue trends |
| P19 | Site Audit exporting | https://www.semrush.com/kb/905-exporting-site-audit | crawled-pages, issues, compare crawls exports |
| P20 | Backlinks overview | https://www.semrush.com/kb/500-backlinks-overview-report | authority, anchors, types, domains, competitor comparison |
| P21 | Backlinks report | https://www.semrush.com/kb/501-backlinks-report-manual | backlink row filtering and export |
| P22 | Backlink Audit overview | https://www.semrush.com/kb/1090-backlink-audit-overview | toxicity, profile insights, removal status |
| P23 | Backlink Audit workflow | https://www.semrush.com/kb/580-auditing-your-backlinks | review, whitelist, remove and disavow workflow |
| P24 | Backlink Gap | https://www.semrush.com/kb/773-backlink-gap | competitors and missing opportunities |
| P25 | My Reports builder | https://www.semrush.com/kb/1625-creating-a-pdf-report | templates, drag/drop widgets, branding, cloning |
| P26 | Terms of Service | https://www.semrush.com/company/legal/terms-of-service/ | Section 3 restrictions and IP ownership |
| P27 | Semrush SEO feature directory | https://www.semrush.com/kb/540-site-audit-overview | verified SEO category list in sidebar documentation |

**Terms finding (P26, Section 3.3):** the terms restrict use of its services to build a similar/competing work, reverse derivation of source code, scraping, mirroring, and use of Semrush outputs for AI development. Our analysis is limited to reading publicly published documentation for general functional patterns. SearchPilot must use original assets, original layouts, independent algorithms and independently authorized or licensed datasets. This research is not legal clearance to use Semrush subscriptions, account data or outputs for a competitor.

## Core loop

Create or select a website workspace → inspect SEO performance → find keyword and competitor opportunities → track a defined set of rankings and technical findings → prioritize fixes → compare trends and share reports. **C:** tool capabilities and cross-tool entry points [P02–P25]. **I:** this exact end-to-end ordering and click count.

## Navigation and information architecture

**Confirmed public marketing navigation (P01):** Product, Pricing, Solutions, Resources, Enterprise, Log In and Sign Up. Product content is organized by Discover, Create and optimize, and Track.

**Confirmed knowledge-base toolkit navigation (P17/P27):** SEO; AI Visibility; Traffic & Market; Local; Advertising; Content; Social; AI PR; My Reports; Folders; App Center; Integrations. The SEO topic lists SEO Dashboard, Site Audit, Position Tracking, Domain Overview, Organic Rankings, Top Pages, Compare Domains, Keyword Gap, Backlink Gap, Keyword Overview, Keyword Magic Tool, Keyword Strategy Builder, SEO Writing Assistant, Topic Research, Backlinks, Referring Domains, Backlink Audit, On Page SEO Checker and Organic Traffic Insights. This is a **documentation taxonomy**; it is not proof of identical authenticated sidebar placement or ordering.

**Confirmed workspace concept (P02):** Semrush renamed *Projects* to *Folders*. A folder can be created with a name and **optional** website, includes cards for configured tools, can be selected from many tool pages, and supports search, tags, pinning, sharing and settings. A domain becomes locked after attaching a website and configuring a tool. Paid users can share Viewer/Editor access under eligibility rules. Folder delete removes associated tool data.

**SearchPilot proposed main sidebar (I):**

| Group | Items | Rationale |
| --- | --- | --- |
| Workspace | Overview / Websites / Settings | Start with one owned client or site |
| Discover | Domain Research / Organic Rankings / Keyword Research / Keyword Gap | Opportunity research |
| Track | Position Tracking / Rank History / Alerts | Ongoing measurement |
| Optimize | Site Audit / Issues / Backlinks / Backlink Audit | Actionable fixes |
| Deliver | Reports / Integrations | Results and collaboration |

Desktop: stable app shell, workspace selector, contextual page title, filters and data range. Narrow screens: drawer navigation, vertically stacked KPI cards, horizontal tables, keyboard-accessible menus (**I** until independently validated).

## Screen inventory

**Screen IDs are stable.** C confirms a capability exists in the named documentation; I denotes UX, state, sequence or implementation behavior inferred without authenticated app access. Routes are conceptual entry points, not guaranteed public URL paths. For all authenticated views, loading, empty, denied, failure and mobile states are **SearchPilot requirements (I)** unless otherwise cited.

| ID | Screen | Route / entry | Purpose and essential components | Confirmed evidence | States / edge cases (I unless cited) |
| --- | --- | --- | --- | --- | --- |
| S01 | Marketing home | public root | Pitch, top navigation, product CTA | P01 C | mobile, guest, locale |
| S02 | Account entry | Log In / Sign Up | Authentication, account recovery | P01 C | validation, redirect, session expiry |
| S03 | Folders / workspaces | workspace home | folder cards, search, tags, pins, tool widgets | P02 C | no folders, permissions, many folders |
| S04 | Folder creation / settings | S03 create/menu | name, optional domain, invite roles, pin, rename, delete | P02 C | duplicate, locked domain, destructive action |
| S05 | SEO Dashboard | folder tool card | overview widgets, links to audit, tracking, GA/GSC | P03 C | disconnected provider, no campaigns, loading |
| S06 | Domain Overview | SEO / enter domain | authority, organic/paid traffic, keywords, backlinks, geography, competitor panels | P04 C | unsupported scope, low data, country changes |
| S07 | Organic Rankings overview | S06 or SEO | organic keywords, estimated traffic, pages, trend panels | P05 C | no terms, historical window |
| S08 | Organic Positions and changes | S07 positions | ranking table with filters, featured SERP fields, position changes | P06–P07 C | lost/new positions, sorting, row detail |
| S09 | Keyword Magic Tool | SEO / Keyword Magic Tool | seed search, country, keyword groups, broad/phrase/exact/related/questions, intent/volume/KD, add/export | P09–P10 C; R01 | zero results, empty seed, gated export, changing filters |
| S10 | Keyword Overview | keyword lookup | volume, KD, intent, related questions, SERP analysis | P08 C | ambiguous phrase, no monthly data |
| S11 | Keyword Strategy Builder | SEO / Keyword Strategy Builder | lists, clusters, topics, pillar/subpages, keyword actions | P11 C | draft, group selection, zero topics |
| S12 | Keyword Gap | SEO / Keyword Gap | domain comparison, missing/weak/shared keyword filters | P12 C | competitor missing, range differences |
| S13 | Site Audit Overview | project / Site Audit | health score, errors/warnings/notices, trends, crawl status, thematic reports | P17 C; R02 | no crawl, partial, completed, failed, historical compare |
| S14 | Site Audit configuration | create/reconfigure audit | source, page limit, rules, schedule, agent, restrictions | P16 C | invalid scope, inaccessible domain, quota |
| S15 | My Reports builder | My Reports / create | template or blank report, modules, branding, drag/drop, preview/export | P25 C; R03 | empty report, scheduled send, export failure |
| S16 | Workspace permissions | S03 share/settings | collaborators, Viewer/Editor, folder access | P02 C | no rights, invited, revoked, deletion |
| S17 | Position Tracking setup | folder / Position Tracking | target URL, search engine, country, city/ZIP, device, keywords, competitors | P13 C | zero keywords, change targeting, quota |
| S18 | Position Tracking overview | Position Tracking / overview | visibility, estimated traffic, average position, charts, trend/snapshot | P14–P15 C | no campaign, data delay, no rankings |
| S19 | Position Tracking rankings | S18 rankings/tables | tracked keywords, rank deltas, SERP features, landing URLs | P14 C | new/lost, location/device, filtered set |
| S20 | Position Tracking competitors | S18 competition | discovery/comparison, share of voice | P14 C | no rivals, many rivals |
| S21 | Position Tracking landscape | S18 landscape | top-level visibility, winners/losers, pages, competitors | P15 C | new campaign, low sample |
| S22 | Position Tracking tags/notes | S18 filters/notes | segment tracked keywords, annotate trends | P14 C | missing tags, date range, conflicting annotation |
| S23 | Site Audit issues | S13 / Issues | issue groups, severity, affected page URLs, why/fix guidance | P18 C | no issues, filtered zero, false-positive review |
| S24 | Site Audit thematic reports | S13 thematic cards | crawlability, HTTPS, internal linking, performance, markup | P17 C | unsupported tests, many pages |
| S25 | Site Audit crawled pages/history | S13 / crawled pages | pages, response/metadata findings, rerun/compare/export | P17, P19 C | redirect, crawl stop, blocked pages |
| S26 | Backlinks Overview | SEO / Backlinks | authority, links/domains, follows, anchors, category trend | P20 C | empty index, date filters |
| S27 | Backlinks / referring domains | S26 drilldown | source/target URLs, anchors, authority, link attributes, filter/export | P20–P21 C | nofollow, recently lost, broken link |
| S28 | Backlink Audit | SEO / Backlink Audit | audit score, suspect link review, whitelist/remove/disavow tracking | P22–P23 C | disputed toxicity, outbound removal requests |
| S29 | Backlink Gap | SEO / Backlink Gap | compare referring domains for competitors, prospect list | P24 C | no shared sources, incomplete coverage |
| S30 | Report gallery / schedules | My Reports landing | saved reports, templates, scheduled distribution | P25 C | zero reports, error, access rules |
| S31 | Integrations | dashboard setup/connect | GA/GSC integrations and setup state | P03 C | disconnected, revoked token, permission denied |
| S32 | Organic traffic / on-page tooling | SEO side category | organic traffic insights and on-page improvement recommendations | P27 C (category); exact UI I | unconfigured, provider unavailable |

**SearchPilot MVP screen mapping:** `/` → S05 (overview), `/projects` → S03–S04, `/domain-overview` → S06, `/keywords` → partial S09/S19, `/position-tracking` → partial S18, `/site-audit` → simplified S13/S23, `/backlinks` → illustrative S26, `/reports` → partial S15/S30, `/onboarding` → guided setup (SearchPilot invention). Do not mark the richer Semrush research tools implemented merely because a route or sample chart exists.

## User flows

**Click counts are target estimates (I), not observed Semrush telemetry.** Campaign screens and multi-step setup differ by entitlement and previous configuration.

| ID | User goal | Screen sequence | Target interactions (I) | Important edge cases |
| --- | --- | --- | --- | --- |
| F01 | Start a website workspace | S02 → S03 → S04 → S05 | 4–6 | no account, missing domain, locked domain, no tool configured |
| F02 | Evaluate a domain | S05 → S06 → S07 → S08 | 3–5 | no historical data, country scope, URL/subfolder mode |
| F03 | Find new content keywords | S09 → S10 → S11 | 4–7 | empty seed, quota, irrelevant suggestions, intents |
| F04 | Find competitor keyword gaps | S06 → S12 → S09 → S11 | 5–8 | nonexistent rival, small overlap, country mismatch |
| F05 | Set up rank tracking | S03 → S17 → S18 → S19 | 6–10 | location, device, engine, few keywords, delayed initial crawl |
| F06 | Diagnose falling rankings | S18 → S19 → S22 → S08 | 4–7 | new vs lost, date misalignment, algorithm notes |
| F07 | Start technical audit | S03 → S14 → S13 | 5–9 | robots restrictions, timeout, budget/plan, redirect |
| F08 | Resolve a technical issue | S13 → S23 → S25 → S13 | 4–7 | transient issue, missing access, recrawl delay |
| F09 | Investigate backlinks | S06 → S26 → S27 | 3–5 | stale index, removed links, source redirects |
| F10 | Review risky backlinks | S26 → S28 → review/whitelist/removal | 5–9 | false-positive, external site unresponsive |
| F11 | Identify referring-domain gaps | S26 → S29 → S27 | 4–6 | weak comparison domain, source unavailable |
| F12 | Deliver performance report | S05 → S30 → S15 → preview/export | 5–9 | missing module data, access, export/schedule failure |
| F13 | Share workspace | S03 → S16 → invite | 3–6 | viewer vs editor, invite pending, quota |
| F14 | Connect Search Console | S05 → S31 → OAuth → S05 | 4–7 | no property, permission denied, expired authorization |
| F15 | Switch clients and filters | S05 → S03 selector → S05 | 2–3 | no folders, inactive campaign, filter persistence |

### Interaction walkthroughs for independent implementation

**Keyword research (F03).** Enter seed + country → select match type or Questions → choose a keyword group → filter intent, monthly volume and difficulty → inspect SERP or detailed overview → select terms → add to the strategy list/track list or export. Confirmed components: P08–P11. **I:** exact click sequence, save confirmation and keyboard shortcuts.

**Position tracking (F05–F06).** Configure campaign target, search engine/device/location, import terms, optionally set competitors → wait for rankings → review visibility trend and average position → compare dates/segments → inspect keyword movements and winners/losers. Confirmed P13–P15. **I:** first-run skeleton/progress behavior and notification wording.

**Site auditing (F07–F08).** Set crawl source, limits and schedule → initiate crawl → inspect health and issue counts → drill into severity group → review affected page list and fix guidance → re-run or compare later crawls. Confirmed P16–P19. **I:** click totals and error message text. Do not confuse SearchPilot's current single-page HTML checker with a full multi-page crawl.

**Backlink analysis (F09–F11).** Enter target domain → inspect authority/referring domains/backlink growth → filter source and link attributes → optionally inspect risky links or compare competitors. Confirmed P20–P24. **I:** exact transitions between independent tools.

## Dashboard layout and design interactions

| Zone | Observed functional role | Proposed SearchPilot implementation | Evidence |
| --- | --- | --- | --- |
| Toolkit navigator | tool/category selection | persistent desktop nav; mobile drawer | P01/P27 C; placement I |
| Workspace context | folder/current site, switch and permissions | selector with domain and active-project state | P02 C |
| Page header | report title, scope/domain, dates or device/location | reusable heading, search controls, date range | P03–P25 C for report filters; shared visual layout I |
| KPI summary | top-line health, rankings/visibility, traffic, authority | cards with metric unit, period delta, provenance badge | P03/P04/P14/P17/P20 C |
| Primary visualization | traffic/visibility/health trend | time series or bar chart with hover legend and empty state | P03/P14/P17 C; precise chart styling I |
| Detail area | rankings/issues/referrer tables and related widgets | filterable, sortable table with detail drawer | P06/P09/P18/P21 C |
| Actions | create folder, run audit, configure tracker, export | context-aware primary/secondary buttons | P02/P13/P16/P25 C |
| Feedback | missing rights, configuration, timeouts, limits | nonblocking alerts, retry, skeleton, disable state | I; quotas C P10/P13 |

**Cross-screen state contract (SearchPilot, I):** idle → fetching → populated; unconfigured/first-use; empty/no matches; validation failure; unreachable domain; access denied; plan quota exceeded; data not yet collected; external integration disconnected; partial results; background processing; stale results; exported/complete. Show data freshness and source labels on every metric. User-supplied and illustrative values must be visually distinguished from live independently obtained data.

## Component inventory

| Component | Variants / controls | States | Reused on |
| --- | --- | --- | --- |
| Global navigation | sidebar sections, search, workspace switcher | active, collapsed, keyboard focus, mobile drawer | S03–S32 |
| Folder selector and cards | name, domain, pinned, tags, permission | unconfigured, active, unavailable | S03–S05, S16 |
| Domain lookup | scope (domain/subdomain/path), country database | invalid, loading, no data, success | S06–S08, S26 |
| Keyword search | seed, locale, matching mode and questions | no seed, empty group, searching, results | S09–S12 |
| Filter bar | multiselect, range slider/input, chips, reset | default, selected, empty filtered | S08–S12, S19, S23, S27 |
| Date/device/location selector | custom range, compare dates, markets | changed, unsupported, historical | S06–S08, S18–S22 |
| KPI card | metric, variance, tooltip, source/time label | loading, zero, unavailable, delta | S05–S08, S13, S18, S26 |
| Trend chart | area/line/stacked bar, hover, toggle series | loading, sparse, no history | S05–S08, S13, S18, S26 |
| Data table | sort, pagination, row action, export, selection | no rows, loading, filtered, selected | S08–S12, S19, S23, S27–S29 |
| Severity/health indicator | error, warning, notice, pass | progress, resolved, regressed | S13, S23–S25 |
| Audit setup form | source, scope, pages, user agent, schedule | invalid, saving, scheduled, failed | S14 |
| Audit detail row | finding, affected URLs, why/how fix | expanded, filtered, fixed | S23–S25 |
| Keyword list manager | tags, groups, add/remove/export | empty, partial selection, conflict | S11, S17, S22 |
| Report canvas | module library, drag/drop, preview, export | blank, editing, dirty, saving, exported | S15/S30 |
| Modal, toast and banner | create, edit, permission, error, confirmation | open, disabled, submitting, error, success | all authenticated flows |

## Inferred data model for SearchPilot (not Semrush's schema)

| Entity | Important proposed fields | Relationship | Evidence / confidence |
| --- | --- | --- | --- |
| User | id, email, display_name, auth_subject, created_at | joins workspaces via memberships | P02, P25; **medium** |
| Workspace | id, name, primary_domain, owner_id, created_at | has projects/campaigns and reports | P02; **high conceptual**, field choice I |
| Membership | user_id, workspace_id, role, invite_status | many-to-many user/workspace | P02; **high conceptual** |
| SiteTarget | id, workspace_id, normalized_host, scope, protocol | underlies domain/audit campaigns | P02/P04/P16; **medium** |
| Keyword | id, text, locale, intent, volume, difficulty, source | associated with lists and observations | P08/P09; **high conceptual** |
| KeywordList | id, workspace_id, name, kind, created_at | many keywords, possibly clusters | P11; **high conceptual** |
| KeywordCluster | id, list_id, topic, parent_id, role | groups list keywords | P11; **medium** |
| RankCampaign | id, workspace_id, target_id, engine, device, region, status | monitors tracked keywords | P13; **high conceptual** |
| RankObservation | id, campaign_id, keyword_id, captured_at, rank, url, serp_data | time series per campaign/keyword | P14; **high conceptual** |
| CompetitorTarget | id, workspace_id, domain, type | used in comparisons | P12/P14/P24; **medium** |
| AuditCampaign | id, target_id, page_limit, crawl_source, schedule, config_json | launches crawl runs | P16; **high conceptual** |
| AuditRun | id, audit_campaign_id, started_at, finished_at, health_score, status | has crawled pages and findings | P17–P19; **high conceptual** |
| CrawledPage | id, audit_run_id, url, status_code, canonical, title, h1, response_ms | findings per URL | P18/P19; **medium** |
| AuditFinding | id, audit_run_id, page_id, rule_id, severity, explanation, fix_hint | flagged pages and rule instances | P18; **high conceptual** |
| ReferringDomain | id, host, authority_estimate, first_seen_at | has backlinks | P20/P21; **medium** |
| BacklinkObservation | id, source_url, target_url, anchor, rel, first_seen, last_seen, status | belongs to source and target | P21; **high conceptual** |
| BacklinkReview | id, backlink_id, verdict, workflow_status, notes | moderation/disavow review | P22/P23; **medium** |
| ReportDefinition | id, workspace_id, title, layout_json, template_id, schedule, recipient_policy | snapshots/report jobs | P25; **high conceptual** |
| IntegrationCredential | id, workspace_id, provider, subject, token_ref, expires_at | GSC/GA connections | P03; **medium**, sensitive fields I |
| MetricSnapshot | id, provider, scope, observed_at, value_json, provenance | auditable source of KPI charts | product requirement; **guess** |

**Entity relationship summary:** User N:M Workspace through Membership; Workspace 1:N SiteTarget, RankCampaign, AuditCampaign and ReportDefinition; Keyword N:M KeywordList; RankCampaign + Keyword 1:N RankObservation; AuditCampaign 1:N AuditRun 1:N CrawledPage and AuditFinding; SiteTarget 1:N BacklinkObservation; ReferringDomain 1:N BacklinkObservation. These are proposed implementation relationships, not reverse-derived private tables.

**Existing local implementation:** PostgreSQL `projects`, `keywords`, `audits`, with manually entered ranking fields and limited live homepage HTML checks. These are a simplified subset; detailed entities are future architecture recommendations.

## Feature matrix and priority policy

See [features.csv](features.csv). **must** enables the core closed-loop research/track/act workflow, **should** improves useful SEO coverage and collaboration, **could** expands toolkits or advanced capabilities, **skip** requires Semrush-proprietary or other unauthorized assets/data. `original` is public documentation status. `clone` is the **current** SearchPilot implementation state (`yes`, `partial`, `no`, `skip`) as assessed from current source/routes and prior implementation records, not an assertion of Semrush parity.

## Public visual references

Images are stored for **research only**, never imported into SearchPilot. They are public Semrush knowledge-base illustrations as of their publication, so can differ from live authenticated UI. Each must be deleted before packaging/deployment.

| Ref | File | Public source | Visual use |
| --- | --- | --- | --- |
| R01 | `screens/S09-keyword-magic-public-reference.jpg` | P09 / https://static.semrush.com/kb/uploads/2025/05/16/image-20250516122250-1.jpg | keyword groups, controls and result density |
| R02 | `screens/S13-site-audit-public-reference.png` | P17 / https://static.semrush.com/kb/uploads/2025/11/21/image-20251121190538-1.png | audit cards, metrics and issue hierarchy |
| R03 | `screens/S15-report-builder-public-reference.png` | P25 / https://static.semrush.com/kb/uploads/2025/06/18/Screenshot%202025-06-18%20at%2012.08.18PM.png | public report-building illustration |

## What cannot be cloned

- Semrush proprietary keyword-volume indexes, backlink graph, historical ranking databases, calculated analytics, curated metrics, account/project data and private APIs.
- Semrush marks, copyrighted layouts/screenshots, logos, iconography and images in the shipped application.
- The existing network of Semrush customers, app partnerships, commercial data feeds and paid entitlements.
- Third-party platform accounts, Google property data or OAuth authorizations without the end user's consent.

**Terms:** public Semrush Terms [P26] include restrictions on use of services and outputs to develop similar competing works; SearchPilot work must stay independent and legal review is prudent before commercial deployment. The screenshots here are private reference files, not product assets.

## Effort and delivery size

**Research scope:** 32 conceptual screens, 15 flows, 19 proposed entities, 27 public source entries (including one navigational cross-reference), 3 internal-only visual references. All conceptual UI details and click counts without screenshot/account evidence are explicitly labeled inferred.

| Phase | Outcome | Complexity | Main dependency |
| --- | --- | --- | --- |
| MVP baseline (existing) | workspace CRUD, custom keyword list, single-page audit, illustrative dashboard | **M** | PostgreSQL/Next.js |
| Complete first-party SEO workflow | multi-page crawler, issue tracking, authentic GSC/GA data, rank history, role separation | **L** | OAuth, data collection jobs, query isolation |
| Research platform | keyword/competitor gap, backlink index, locale-specific volume, historical SERPs | **XL** | licensed/independently developed search data |
| All Semrush toolkits | SEO + AI visibility + traffic market + content + ads/social/local | **XL; rescope** | multiple separate products |

**Three hardest parts:** (1) trustworthy global keyword/competitor/backlink data without Semrush's private index, (2) repeatable distributed crawling and safe schedule/queue, and (3) longitudinal rank tracking across location, device and engine with transparent freshness/provenance.

**Next skill:** `/replica-architect` — turn the feature matrix and proposed entities into a scoped schema, API/data-provider contracts, authentication boundary, crawler architecture and phased implementation specifications.
