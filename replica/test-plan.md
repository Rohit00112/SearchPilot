# SearchPilot /replica-test plan

**System under test:** Only local SearchPilot at `http://127.0.0.1:3122`. **Recon:** `replica/recon.md` F01–F15, S01–S32. **Projects:** desktop Chromium 1440×900 and mobile emulation 390×844. **Status:** Planned/automated unless run results are explicitly recorded below. Browser tests never contact the original product.

## Test controls and reporting

- Browser specs: `e2e/navigation.spec.ts`, `e2e/auth.spec.ts`, `e2e/seo-flows.spec.ts`, and worker-1's independently owned `e2e/api-regression.spec.ts`. Common fixture: `e2e/helpers.ts`.
- Start the single local server with the prime agent; runner does **not** start or build Next. `SEARCHPILOT_E2E_URL` accepts loopback only, default port 3122. Database-backed tests need seeded local PostgreSQL and two isolated test users; provide `SEARCHPILOT_E2E_EMAIL` and `SEARCHPILOT_E2E_PASSWORD` for authenticated browser cases.
- In each browser test detect JavaScript console errors, uncaught page errors and same-origin HTTP 5xx. Axe checks WCAG 2 A/AA and 2.1 A/AA for each relevant screen, with screenshots at `replica/clone-screens/Fxx-case-390.png` or `-1440.png`. The other artifacts are `replica/test-results` and `replica/playwright-report`.
- Controls use `getByRole`, `getByLabel`, headings and other semantic selectors; structural `details` is used solely for native HTML disclosure semantics. Run keyboard-only checks with Tab/Shift+Tab, Enter, Space and Escape; verify focus restoration, drawer hidden state and dialog trap. Cover browser navigation/back, refresh, 2 tabs, network latency/offline, retained auth, permission removal, and daylight-saving boundary manually/with seeded fixtures.
- **Roles:** guest (login/register only), viewer (read workspace), editor (project/keyword/audit edits), owner (member management), unauthenticated and expired-session. Create separate users/workspaces and verify 404/403 behavior without existence leaks. Avoid testing production Google accounts and external services.
- **Expected limitations:** Research/competitor tools, sophisticated scheduled crawling, backlink scoring and team invitation UI may not be implemented. Mark test **blocked/not implemented**, never falsely passed. Baseline currently uses illustrative traffic/backlink metrics; they must say SAMPLE. Tests must avoid asserting simulated metrics as live data.
- **Severity:** S1 data leak/data loss/core security; S2 broken core functionality; S3 broken with workaround; S4 cosmetic. Reproduced defects need severity, exact steps, expected, actual, browser console/network evidence. Only verified failures count as bugs.

## F01–F15 case matrix

| Case ID | Kind | Screens | Steps / assertion |
| --- | --- | --- | --- |
| **F01-H1** | Happy | S02→S03→S04→S05 | Register/login; open Projects; add name/domain; choose site; dashboard shows it. |
| **F01-E1** | Edge | S02→S03→S04→S05 | Blank/oversize/Unicode project name; dialog Escape; double submit; mobile drawer. Test both widths, slow/offline where relevant. |
| **F01-N1** | Negative | S02→S03→S04→S05 | Wrong credentials, invalid domain, cross-tenant project ID, expired session. Confirm safe error and correct role isolation. |
| **F02-H1** | Happy | S05→S06→S07→S08 | Select project; open Domain Overview; confirm target and provenance. |
| **F02-E1** | Edge | S05→S06→S07→S08 | No projects, missing search provider, time-range change, unsupported URL scope. Test both widths, slow/offline where relevant. |
| **F02-N1** | Negative | S05→S06→S07→S08 | Out-of-scope domain and private cross-tenant data blocked. Confirm safe error and correct role isolation. |
| **F03-H1** | Happy | S09→S10→S11 | Open Keyword Research; filter tracked terms; add manually entered keyword, export list. |
| **F03-E1** | Edge | S09→S10→S11 | Empty/emoji/long seed, no result, filter reset, invalid optional integer, double submission. Test both widths, slow/offline where relevant. |
| **F03-N1** | Negative | S09→S10→S11 | CSV injection strings safe; quota/provider unavailable must not show invented results. Confirm safe error and correct role isolation. |
| **F04-H1** | Happy | S06→S12→S09 | Compare owned target with rivals when licensed provider connected. |
| **F04-E1** | Edge | S06→S12→S09 | Zero competitors, two tab comparisons, no market coverage. Test both widths, slow/offline where relevant. |
| **F04-N1** | Negative | S06→S12→S09 | Unowned competitor datasets never asserted live; out-of-scope access rejected. Confirm safe error and correct role isolation. |
| **F05-H1** | Happy | S17→S18→S19 | Add project keyword with manually entered position; view tracking table. |
| **F05-E1** | Edge | S17→S18→S19 | No tracked terms, missing rank, invalid 0/1001 positions, mobile scrolling. Test both widths, slow/offline where relevant. |
| **F05-N1** | Negative | S17→S18→S19 | Automated device/region campaign unsupported; cross-tenant keyword reference blocked. Confirm safe error and correct role isolation. |
| **F06-H1** | Happy | S18→S19→S22 | Review manually timestamped observations by keyword when available. |
| **F06-E1** | Edge | S18→S19→S22 | Same-day observation ties, date/time zone, duplicate updates, historical zero results. Test both widths, slow/offline where relevant. |
| **F06-N1** | Negative | S18→S19→S22 | No provider rank disguised as manual; reading another tenant's history denied. Confirm safe error and correct role isolation. |
| **F07-H1** | Happy | S03→S14→S13 | Run HTTPS home-page audit of authorized public domain; status shows completed checks. |
| **F07-E1** | Edge | S03→S14→S13 | Offline, slow DNS, timeout, redirect, no backend, progress, keyboard submit. Test both widths, slow/offline where relevant. |
| **F07-N1** | Negative | S03→S14→S13 | localhost/private IP/invalid host rejected; cross-tenant project rejected. Confirm safe error and correct role isolation. |
| **F08-H1** | Happy | S13→S23→S25 | Open finding; read explanation and recommendation; filter passed vs issues. |
| **F08-E1** | Edge | S13→S23→S25 | No issues; another audit; expand/collapse keyboard; refresh during audit. Test both widths, slow/offline where relevant. |
| **F08-N1** | Negative | S13→S23→S25 | No unsupported multi-page crawl claim; unknown finding ID not leaked. Confirm safe error and correct role isolation. |
| **F09-H1** | Happy | S06→S26→S27 | Open Backlink Analytics; confirm SAMPLE data and table labels. |
| **F09-E1** | Edge | S06→S26→S27 | Narrow viewport table overflow; no provider data; screen-reader links. Test both widths, slow/offline where relevant. |
| **F09-N1** | Negative | S06→S26→S27 | No fabricated source claimed measured; no unlicensed provider calls. Confirm safe error and correct role isolation. |
| **F10-H1** | Happy | S26→S28 | Review evidence/mark suspect link where workflow exists. |
| **F10-E1** | Edge | S26→S28 | False positive, duplicate review, disavow confirmation. Test both widths, slow/offline where relevant. |
| **F10-N1** | Negative | S26→S28 | Unimplemented review controls remain absent; never auto-submit disavow. Confirm safe error and correct role isolation. |
| **F11-H1** | Happy | S26→S29→S27 | Compare referring domains after licensed provider is configured. |
| **F11-E1** | Edge | S26→S29→S27 | No competitor/domain, empty intersection, differences in coverage. Test both widths, slow/offline where relevant. |
| **F11-N1** | Negative | S26→S29→S27 | No private research data or synthetic links portrayed as real. Confirm safe error and correct role isolation. |
| **F12-H1** | Happy | S05→S30→S15 | Open Reports; download CSV of selected project's keywords. |
| **F12-E1** | Edge | S05→S30→S15 | Empty CSV, Unicode, formula-prefixed keyword, 50k row cap, mid-export navigation. Test both widths, slow/offline where relevant. |
| **F12-N1** | Negative | S05→S30→S15 | 401/403 private export, expired session, cross-tenant project and spreadsheet formulas. Confirm safe error and correct role isolation. |
| **F13-H1** | Happy | S03→S16 | Owner invites viewer/editor when collaboration is implemented. |
| **F13-E1** | Edge | S03→S16 | Pending/revoked invite, long email, duplicate submit. Test both widths, slow/offline where relevant. |
| **F13-N1** | Negative | S03→S16 | Viewer cannot mutate; other tenant membership cannot be reused. Confirm safe error and correct role isolation. |
| **F14-H1** | Happy | S05→S31 | Consent through official Google OAuth; select owned property; inspect source metadata. |
| **F14-E1** | Edge | S05→S31 | Denied consent, refresh token revocation, empty property list, provider timeout. Test both widths, slow/offline where relevant. |
| **F14-N1** | Negative | S05→S31 | Forged OAuth state, wrong property/tenant, leaked tokens and credentials. Confirm safe error and correct role isolation. |
| **F15-H1** | Happy | S05→S03→S05 | Select different owned project, reopen tools, verify correct data. |
| **F15-E1** | Edge | S05→S03→S05 | Many projects, browser back, tab refresh, mobile nav Escape, two tabs. Test both widths, slow/offline where relevant. |
| **F15-N1** | Negative | S05→S03→S05 | Viewer isolation and login redirect on 401; no stale project data. Confirm safe error and correct role isolation. |

## Supplementary numbered regression scenarios

| ID | Scenario | Expected |
| --- | --- | --- |
| F01-H2 | Open /login at 390/1440, toggle password visibility, use accessible fields | No credential leakage, labelled controls, axe scan |
| F01-E2 | Invalid registration display name + short password | Inline validation; no account created |
| F01-E3 | Unknown project search | No matching projects count; no crash |
| F01-N2 | Two accounts access each other's project/keyword/audit IDs | Never return other tenant's resources |
| F03-E2 | Keyword filters by position/difficulty, reset, refresh | Results and selection persist according to UI contract |
| F03-N2 | CSV keyword beginning `=1+1`, `+CMD`, `-A1`, `@SUM()` or leading whitespace+formula | Server export wraps fields and adds neutralizing quote; no spreadsheet evaluation |
| F05-H2 | Add target keyword with optional position/volume/difficulty | Values validate and appear labelled as manually entered |
| F05-N2 | Submit position 0 or 1001, negative volume, difficulty >100 | Validation blocks, does not save invalid data |
| F07-N2 | Attempt audit of localhost, metadata service and redirects to internal IP | Request rejected, no internal fetch |
| F08-H1 | Select audit issues, expand details and recommendation | Correct findings and expected accessibility |
| F12-H1 | Export keyword CSV and inspect filename/header | Download succeeds, CSV contents scoped to project |
| F12-N2 | Unauthenticated `/api/reports?projectId=...` | 401 (or no database 503 precondition), no CSV body |
| F14-N2 | OAuth callback with expired/forged state | Reject; no token persisted or leaked |
| F15-E1 | Open narrow mobile nav, close via Escape and navigate | Expanded state, focus return, route and drawer state correct |
| F15-N2 | API 401 on DB-backed dashboard | Redirect to /login, never silently switch to demo |

## Execution strategy and release gates

1. **Static inventory:** `npx playwright test --list` validates discoverability; `npm run lint` validates TypeScript (without a Next build). Prime owns the running server.
2. **Guest smoke:** login, register, form validation and axe at 390/1440.
3. **Workspace smoke:** seed workspace; authenticate; navigate every implemented SEO screen; assert SAMPLE labels for domain and backlinks, record screenshots.
4. **Functional regression:** project/keyword creation, editing, filters, audit findings, CSV export; negative input cases.
5. **Authorization:** viewer vs editor and owner; unrelated tenant resources; expired session; request/response security.
6. **Manual evidence:** Google OAuth grants and property ownership, scheduled jobs, multi-page audits and other unimplemented flows require explicit environment setup and separate review. Do not mark these passed without execution.

**Release gate:** No unresolved S1. Core F01/F03/F05/F07/F08/F12/F15 happy path and tenant negatives should pass in both viewports, without local 5xx, console errors or serious axe violations. Attach result traces, screenshots and a reproduced-only bug log from the primary QA agent.

## Execution record (2026-10-13)

- `npm install --save-dev @playwright/test @axe-core/playwright --ignore-scripts --no-audit --no-fund`: **PASS**.
- `npx playwright test --list`: **PASS**, 36 browser instances discovered across desktop-1440 and mobile-390; API regression spec remains independently owned.
- Local `http://127.0.0.1:3122/login`: **HTTP 200**. Chromium was initially absent; the first attempt was interrupted after 14 environment-only failures, then `npx playwright install chromium` **PASS**.
- `npx playwright test e2e/auth.spec.ts --project=desktop-1440 --reporter=line`: **2 failed, 1 skipped**. Login axe found a **serious color-contrast violation at `.auth-privacy`**. Unauthenticated `GET /api/auth/me` emitted a console resource **401** error; this is surfaced by the intentional console-error gate and should be reviewed as a browser-noise issue. The register test initially had a strict selector collision with Show password; the selector was repaired **after** this run and requires rerun. The wrong-password case was skipped because a seeded login account was not supplied.
- `npm run lint` and `git diff --check`: **PASS**. No Next build was run; no app/backend files were changed by this worker.
- **Browser totals are not an application pass/fail rate:** the 36-test suite has not completed end to end. Auth tests shown above were executed; other cases remain queued/unverified. Prime to run the integrated suite once seeded credentials and screen/accessibility fixes are ready.

## Primary QA integration update

- Base SQL and migrations 001–004 successfully applied to isolated PostgreSQL `sp_qa_verify`.
- `tests/api-regression.mjs`: **17/17 API assertions passed** after fixing the reproduced malformed audit UUID data disclosure (Node test runner reports 18 including the parent suite). Scenarios cover two-account workspace isolation, role boundaries, CSRF, invalid inputs, rate limits, session revocation and project/keyword/rank/audit/history/export data separation.
- Desktop `e2e/auth.spec.ts`: **2 passed, 1 skipped** after aligning form validation, improving text contrast and excluding the expected anonymous session-probe 401 console message.
- Subsequent desktop workspace tests detected low-contrast dashboard labels and an invalid `demo-1` audit request for an empty authenticated workspace. Styles were corrected and empty-project selection cleared. A full 36-case browser suite did not reach green, so desktop/mobile screen parity remains a release blocker.
- `npm run lint` and `npm run build`: **passed** after product-side fixes. Evidence, symptoms and fix status are recorded in [bug-report.md](bug-report.md).
- The mobile-390 authentication suite was attempted: **2 failed, 1 skipped** because the test server returned HTTP 400 for Next.js static JS/CSS assets, leaving submit controls disabled while client hydration could not complete. This is a test-server build integrity blocker, not evidence that the responsive UI flow was validated or failed in a healthy build. A fresh isolated Next.js output directory is recommended for the next pass.

The initial browser-launch and stale-build failures were test-environment issues, not SearchPilot functionality results. OAuth and licensed-data features remain unverified until user-owned external credentials are connected.
