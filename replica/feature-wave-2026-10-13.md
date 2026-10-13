# SearchPilot first-party feature wave — 2026-10-13

This wave builds independently owned functionality; it is not a licensed external SEO search index, a network crawler, or legal clearance of the provisional SearchPilot product name.

## Implementations

1. **Property-scoped saved Search Console performance:** validated optional property GET filter; connection UI passes selected property and now correctly displays average position. Metrics are stored GSC imports, not live calls on every page view.
2. **First-party Search Opportunities:** date/property-filtered saved GSC query aggregates; clicks, impressions, CTR, weighted average position, limited pagination, and explicitly heuristic high-impression/low-CTR flags. No proprietary search volume, keyword difficulty or guaranteed result claims.
3. **Manual Position Tracking:** saved time-series, last-record delta, dated observations, notes and entry form for manually entered positions; authenticated charts no longer substitute sample trends.
4. **Limited expiring report-outline shares:** explicit creator consent, editor role, 1–30-day expiry, hashed one-time token, revocation and public read-only title/domain/section headings. No raw keyword, audit, author note, ranking or Google data is shared; not an email distribution service or full client report.
5. **Brand completion:** opaque 1200x630 original social card, OG/Twitter metadata, manifest icon improvements, pine-green/warm-copper shared app styling. Provisional name requires legal clearance.

## Security and production limitations

- Shared reports are bearer links; holders can view only the limited consented metadata until expiry or revocation. Noindex and no-store headers protect basic discoverability/caching but do not replace care in link sharing.
- GSC records remain scoped to authorized workspace membership. Recommendations are simple review cues, not independently observed ranking or competitor data.
- The network crawler still does not execute queued jobs. Third-party licensed data, Google OAuth live credential verification, mail/report scheduling, paid plans and complete production security/QA are not finished.
- Migration 010 was applied only to disposable sp_feature_qa, never the default or production database.

## Verification evidence

- GSC property filter regression: 5/5 isolated checks passed.
- Report-share regression: 4/4 isolated checks passed.
- Saved GSC opportunities API regression: 8/8 isolated checks passed (aggregation, provenance, filters, privacy and limits).
- Targeted desktop/mobile Playwright/Axe: 6/6 checks passed at 1440px and 390px after fixing an over-specific test assertion.
- Integrated optimized Next.js build including opportunities and report shares passed; TypeScript lint passed.
- Original-vendor brand sweep and token contrast checker passed (full component browser review remains a separate task).

SearchPilot remains not production ready or at full original-platform feature parity.
