# SearchPilot — provisional original brand system

**Status: visually implemented, name NOT cleared for launch.** Assessed 2026-10-13. The user requested that the existing SearchPilot name be preserved unless a clear issue exists. A clear issue exists: [searchpilot.com](https://www.searchpilot.com/) is an established SEO A/B testing company and [getsearchpilot.com](https://www.getsearchpilot.com/) also uses SearchPilot for an SEO execution SaaS. Both are active in closely related markets. SearchPilot remains a temporary project-facing name to avoid an unapproved rename and widespread migration. Do **not** purchase a domain, publish listings, sell subscriptions or launch publicly under it until counsel clears the name or the owner selects a replacement. Web checks are not trademark opinions.

## Positioning

For solo website owners, independent consultants and small agencies who want understandable SEO work instead of inflated dashboards, SearchPilot brings **first-party observations, honest data provenance and clear client reports** into one calm workspace. Promise only connected GSC records, bounded homepage checks, manually sourced keyword/rank/backlink data and saved report layouts. Do not imply proprietary search indexes or running scheduled crawls.

**Provisional brand line:** **Clear SEO. Real sources.** Supporting line: **Know what your SEO data says—and where it came from.** Brand personality: technically capable without feeling elite; practical rather than loud; transparent about what has not been measured.

## Names considered and clearance

20 ideation candidates, *none legally cleared*: descriptive — SearchLedger, SEO Ledger, SourceDesk, SignalNotes; compound — MetricHaven, ClarityDock, RankMorrow, FieldCompass, SourceHarbor, AuditNest; invented — Veyora, Naventa, Clariro, Truvanta; metaphor — BeaconField, NorthLoom, PineMarker, WaypointKit; verb/action — ChartForward, FollowSignal.

Shortlist for a **future naming decision**: ClarityDock, RankMorrow, FieldCompass, AuditNest, PineMarker. SearchPilot is **not** a cleared shortlist choice. The names are concepts, not claims of originality or domain availability.

| Name | General web screen, 2026-10-13 | US trademark 9/42 | EU trademark | Canada | WIPO | Domain WHOIS/registrar | App/Play exact search | Social handles |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SearchPilot (existing) | **Conflicting same-sector active products**: searchpilot.com and getsearchpilot.com | To run | To run | To run | To run | Existing active domains, registration availability not tested | To run | To run |
| ClarityDock | No exact conflict established by limited web screen; inconclusive | To run | To run | To run | To run | To run | To run | To run |
| RankMorrow | No exact conflict established by limited web screen; inconclusive | To run | To run | To run | To run | To run | To run | To run |
| FieldCompass | Not independently screened | To run | To run | To run | To run | To run | To run | To run |
| AuditNest | Not independently screened | To run | To run | To run | To run | To run | To run | To run |
| PineMarker | Not independently screened | To run | To run | To run | To run | To run | To run | To run |

For clearance run [USPTO Trademark Search](https://tmsearch.uspto.gov/), [EUIPO](https://www.euipo.europa.eu/), [Canadian Trademarks Database](https://ised-isde.canada.ca/site/canadian-intellectual-property-office/en/trademarks), [WIPO Global Brand Database](https://branddb.wipo.int/), relevant registrar WHOIS and exact app-store/social searches. A trademark lawyer should evaluate same-category similarity before brand commitment.

## Visual system

**Direction:** *Verdant compass* — editorial clarity and quiet navigation, deliberately distinct from the original orange/purple SaaS palette and from the previous violet clone UI.

| Role | Color | Usage |
| --- | --- | --- |
| Pine | `#172F2B` | Shell header, icon background |
| Forest | `#13664E` | Primary CTAs, link emphasis, graphs |
| Copper | `#B7773A` | One restrained directional waypoint, never bulk action text |
| Paper | `#F8F6F1` | Reading canvas and product backgrounds |
| Ink | `#1B332D` | Main text |
| White | `#FFFFFF` | Cards and high-contrast reverse type |

Implementation sources: `replica/design/tokens.json`, `replica/design/tokens.css`, and brand shell overrides in `app/globals.css`. The patched token contrast checker reports **49 passes and 0 failures** across its semantic WCAG pairs; this is **not** an exhaustive per-component visual audit. Historical CSS literal colors and third-party default utility styles remain for a future full design-system migration.

**Typography:** Inter when installed; otherwise platform sans stack. Headlines 30–42px with close tracking, body 14–16px, numeric metric labels in tabular/monospaced figures where needed; no font binaries bundled. Distinguish verified/imported/sample states by words and icons as well as color. Use clear 1.75–2px rounded Lucide strokes, restrained charts, warm surfaces, quiet borders, no stock SEO mascots or copied proprietary screens.

## Original logo and assets

**Concept:** an *open page with a navigation waypoint*. The two connected page leaves represent a readable evidence trail; a single copper location point represents the next action. It is not a magnifying glass, flaming symbol, or another SEO vendor logo.

**Composition:** square symbol + simple SearchPilot wordmark; solid dark pine background with pale leaf outline and copper waypoint. Shape survives reduction to 16px (though raster/icon perceptual review across browsers remains needed). Source assets are newly authored vector SVG, not borrowed source artwork.

Deliverables:

- SVG symbol: `public/brand/searchpilot-mark.svg` and Next favicon `app/icon.svg`.
- SVG wordmark: `public/brand/searchpilot-wordmark.svg`.
- Square 1024px opaque app icon / Apple icon: `public/brand/searchpilot-app-icon.png`, `app/apple-icon.png`.
- Original 1200×630 SVG social card: `public/brand/searchpilot-social.svg` (PNG share-card and final accessibility review remain to do).
- Web app manifest: `app/manifest.ts`; title/description/icons/Open Graph metadata in `app/layout.tsx`.

Before publication, compare the mark visually side-by-side with competitor logos, commission legal and design clearance, and regenerate the wordmark / favicon filenames if the company name changes.

## Voice: three words

**Clear**, not simplistic. **Calm**, not unambitious. **Precise**, not robotic.

| Do | Don't |
| --- | --- |
| “Connect Search Console to see observed clicks.” | “Unlock all your search traffic instantly!” |
| “No records yet. Add your first domain.” | “Nothing found. Try again.” |
| “Based on your saved homepage check.” | “Your entire site is 95% healthy.” |
| “Import source-labelled backlink observations.” | “Get an authoritative backlink index for free.” |
| “Save a report layout; print a PDF in your browser.” | “Automated reporting, done for you.” |

**Ten UI messages / voice templates** (implementation priority for remaining copy migration):

1. Create account → “Create your workspace”
2. Sign in → “Continue to your workspace”
3. Add project → “Track your first website”
4. No project → “Add a domain to begin with your own data.”
5. Empty keyword list → “No recorded keywords. Add one to start a manual tracking list.”
6. Connect Google → “Connect your Search Console property”
7. Start audit → “Check this homepage”
8. Confirm delete → “Delete this project and its saved records? This cannot be undone.”
9. Report action → “Build a source-labelled report”
10. Data unavailable → “This data source is not connected yet.”

App shell now uses the new navigation mark, actual metadata and source-first product text. Further copy cleanup in legacy demo-only screens is listed as a brand QA follow-up, not represented as complete.

## Brand sweep and remaining issues

Command: `python3 "$HOME/Library/Application Support/chat-on-steroids/skills/replica-brand/sweep.py" . --config replica/brand.json`.

Result (2026-10-13): **Clean — no Semrush names, semrush.com domain or declared original colors found in application code/assets**. By design the sweep ignores the planning documentation, which discusses competitive references. It also cannot detect visual resemblance or product-name collisions: that requires the separate trademark/logo review above.

**Launch blockers:** existing SearchPilot name conflict, unscreened replacement name/domains/store/handles, final UI snapshot and full WCAG browser review, production social PNG, and complete cleanup of older hard-coded violet demo CSS. Next handoff to `/replica-launch` only after brand clearance, ideally with a new name.
