# SearchPilot QA bug report — 2026-10-13

## BUG-005 — Local registration unavailable because authentication setup was never applied

- **Severity:** S2 — account creation blocked in the existing development database
- **Flow/case:** F01-H2, registration and login
- **Screen/API:** `/register`, `POST /api/auth/register`
- **Steps:** Run the original `searchpilot` PostgreSQL database, then submit a valid account registration with the original `.env` configuration.
- **Expected:** Account, initial workspace, membership, and login session created.
- **Actual before fix:** The existing database contained only `projects`, `keywords`, `audits`; `local_users`, session and rate-limit tables were missing. `AUTH_SECRET` was also unconfigured. This made registration unavailable.
- **Fix:** Backed up the existing database, applied additive migrations 001–004, and created ignored `.env.local` containing a securely generated `AUTH_SECRET`. Existing audit data was preserved.
- **Evidence:** Table inventory before/after migration. Actual local registration HTTP 201, session HTTP 200, login HTTP 200, authenticated projects HTTP 200, duplicate account HTTP 409. `npm run lint` and `npm run build` passed.
- **Status:** **Fixed and verified locally.** Other deployment environments require their own migrations and auth secret.

Only reproduced findings are listed here. The QA target was the independent local SearchPilot application on port 3122 against an isolated PostgreSQL database. Browser traces/screenshots reside under `replica/test-results/` and `replica/clone-screens/`; test code is in `e2e/` and `tests/api-regression.mjs`.

## BUG-001 — Raw database diagnostic exposed by malformed audit project ID

- **Severity:** S2 — API error handling and internal database details exposed
- **Flow/case:** F07-N1; API regression `S2: malformed audit project ID`
- **Screen/API:** `GET /api/audit?projectId=not-a-uuid`
- **Steps:** Sign in to an isolated workspace. Request the audit history endpoint using an invalid project ID.
- **Expected:** HTTP 400 with a generic validation error and no SQL/internal database detail.
- **Actual before fix:** HTTP 400 response contained PostgreSQL error text.
- **Evidence:** `tests/api-regression.mjs`; initial 16/17 run, failed invalid-ID assertion.
- **Fix:** Validate audit IDs with `uuid()` and use sanitized `responseError()` in `app/api/audit/route.ts`.
- **Status:** **Fixed; verified** by post-build API regression (17/17 checks passed). No Git commit recorded because `/reverse` has no Git repository.

## BUG-002 — Registration form password minimum disagreed with API

- **Severity:** S3 — confusing validation, workaround is a longer password
- **Flow/case:** F01-E2
- **Screen:** `/register`
- **Steps:** Enter a valid name/email with an 8–11-character password.
- **Expected:** Client validation explains the server's 12-character minimum.
- **Actual before fix:** The form advertised/accepted an 8-character minimum, but the registration API required 12 characters.
- **Evidence:** `components/ui/auth-screen.tsx` versus `app/api/auth/register/route.ts`.
- **Fix:** Registration now requires and describes 12 characters; login does not impose the registration minimum on a previously created account.
- **Status:** **Fixed; browser form validation confirmed** in desktop auth tests.

## BUG-003 — Low-contrast dashboard and login labels

- **Severity:** S3 — accessibility regression
- **Flow/case:** F01-H2 and F01-H1
- **Screens:** `/login`, `/projects`
- **Steps:** Run `@axe-core/playwright` WCAG checks on the login page and authenticated projects page.
- **Expected:** No serious color-contrast findings.
- **Actual before fix:** Serious contrast findings for `.auth-privacy`; dashboard labels included `.nav-label`, `.sidebar-project-title`, `.upgrade p`, `.breadcrumbs`, `.ui-metric__foot`, and footer text.
- **Evidence:** `replica/test-results/` failed-case traces and Axe output; `e2e/auth.spec.ts` and `e2e/navigation.spec.ts`.
- **Fix:** Replaced light label values with semantic high-contrast tokens in `app/globals.css`.
- **Status:** **Fixed for evaluated selectors.** Login test passed after change; desktop projects test subsequently reported only HTTP 400/401 resource errors, with no axe violation. A full cross-route accessibility pass remains pending.

## BUG-004 — Invalid demo project audit request for new authenticated account

- **Severity:** S3 — unnecessary failed API request and browser console error
- **Flow/case:** F01-E1 / F15-N2
- **Screen:** `/projects`
- **Steps:** Register a new account with no projects, sign in, visit `/projects`, inspect failed API requests.
- **Expected:** No audit request until the account has a real selected project.
- **Actual before fix:** UI attempted `GET /api/audit?projectId=demo-1`, which returned HTTP 400.
- **Evidence:** Playwright response capture against local port 3122; `components/workspace.tsx`.
- **Fix:** Clear active project and stored project selection when the API returns an empty project list.
- **Status:** **Patched; full authenticated browser retest pending.**

## Environment and test setup findings

- Initial Playwright attempts failed because the local Chromium/headless-shell binary was not installed; installing both resolved the launch blocker.
- A Next.js process briefly served stale `.next` assets, causing 400 responses for JavaScript and CSS. Rebuilding and restarting resolved that test setup condition.
- Unauthenticated `GET /api/auth/me` intentionally returns 401 on public sign-in pages; the browser harness now exempts that expected session probe while continuing to report other console errors.
- Repeated QA sign-ins exhausted shared test rate-limit buckets, yielding HTTP 429. This is an expected security behavior; isolate or reset counters between QA batches.
- Browser navigation tests require a seeded account and a stable running application; 36 discovered cases are **not** equivalent to 36 completed checks.

## To check (unverified; not registered as bugs)

- Full mobile 390px click-through, keyboard navigation and screenshots for authenticated workspace pages.
- Automated onboarding of a seeded workspace and audit fixtures before full UI suite.
- GSC OAuth/provider testing with a user-owned OAuth client (unavailable).
- Missing-database and offline recovery, time zones/DST, actual external crawler response and all 15 recon flows end-to-end.
- A transient disabled Sign in control during an additional diagnostic run; requires repeatable timing/response evidence before severity assignment.

**Release status:** No reproduced open S1. The broad Playwright suite is **not yet green**; desktop auth checks and isolated API regression succeeded, while remaining browser workflows still require seeded/test-state isolation and reruns.
