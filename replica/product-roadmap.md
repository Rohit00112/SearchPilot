# SearchPilot evidence-led roadmap

**Implementation update, 2026-10-13:** The authenticated first-party summary, guided setup/glossary, honest saved-record usage and two editable client report presets have shipped in code and passed targeted API, desktop and mobile checks. This does not establish paid plans, a network-enabled crawler, third-party SEO coverage or scheduled email. See [verification](entrepreneur-implementation.md); the remaining milestones below are not considered launched.

Baseline: Next.js 15 + PostgreSQL, workspace isolation, GSC connector UI/backend, manual SEO imports and rank observations, saved report layouts, collaboration/invitations, strategy lists, human backlink triage, and a **non-executing** crawler queue. See [implementation verification](implementation-verification-2026-10-13.md). This roadmap prioritizes independently buildable differentiation over a proprietary SEO-index imitation.

## Phase 0 — release correctness and trust (P0, weeks 1–2)

- Replace remaining illustrative metric cards on authenticated dashboards with clear verified/manual/not-available states, source/freshness and GSC disclosure. Acceptance: no metric appears measured when its only source is sample or user input.
- Run full desktop and 390px mobile Playwright/Axe flows, keyboard navigation and accessibility fixes. Acceptance: release suite green with real authenticated page screenshots and no silent network failures.
- Finish report template preview and export reliability. Acceptance: PDF/CSV totals reconcile with source API for a chosen project; no paywall surprise inside editor.
- Add product usage-counter design and plan comparison without activating payments. Acceptance: cap text and current usage visible and tested, no unstated overages.

## Phase 1 — small-business activation (P1, weeks 3–5)

- A three-step guided onboarding: connect GSC, run bounded homepage audit, create a prioritized task; glossary and examples sourced from real first-party records.
- Report template catalog for solo owner and freelance client, link-based owner-approved share with expiry and redaction.
- Consistent workspace team roles, invitation audit and reset/recovery workflow. Email invite delivery only after secure transport integration.
- Instrument privacy-respecting first-run funnel without collecting unnecessary search query content.

## Phase 2 — jobs and paid-provider optionality (P1/P2, weeks 6–9+)

- Security-review and implement an opt-in robots-aware, DNS-pinned, egress-restricted multi-page crawl worker with per-project budgets, cancellation and operator monitoring. Existing job queue is NOT a crawler.
- Introduce provider adapter contracts for licensed keyword/backlink/rank data, optional BYO API credentials, quota disclosure and observed freshness. Never relabel uploads as verified.
- Scheduled reports and digests with retries, unsubscribe, timezone, billing limits and failure logs; only when an email provider and job runner are configured.
- Pricing/billing with self-service cancellation, invoice access, data export and transparent usage. Pricing amounts require unit economics, customer interviews and provider cost estimates.

## Phase 3 — validation and commercial readiness (P2)

- Interview 12–20 solo owners and consultants and observe workflows; validate the three positioning hypotheses rather than treating 25 public passages as market-size data.
- Pricing willingness-to-pay tests, SOC/security and privacy review, backup restore drill, monitoring, support playbook, production migration checklist.
- Research additional sources until 100+ independently attributable reviews or conversations across 3+ channels, revisiting thin themes and alternative-platform changing plan terms.

## Explicit exclusions until further evidence

No proprietary Semrush data replication, invented authority/toxicity scores, autonomous disavow, fake AI visibility metrics, unsupported competitor SERP crawls, or unreviewed network crawler. These require separate market evidence, licensed inputs, and security architecture.

**Success metrics (targets, not observed results):** 80% onboarding completion in trial usability cohort; correct provenance at 100% measured-metric placements; a first verified-client report within 10 minutes of connected GSC; zero undisclosed metered charges; zero outbound crawl fetches until operator-approved worker is enabled.
