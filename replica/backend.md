# SearchPilot backend status — 2026-10-13

## Implemented services

| Area | API and storage | Status |
| --- | --- | --- |
| Email/password sign-in | `/api/auth/register`, `login`, `logout`, `me`; scrypt password hashes, signed HttpOnly, revocable PostgreSQL sessions | Implemented; email verification/recovery still missing |
| Workspaces | `/api/projects`; `local_workspaces` memberships and scoped rows | Implemented owner/editor/viewer checks; invitations/UI pending |
| Keywords | `/api/keywords`; nullable manual position, volume, difficulty | Implemented; user-supplied metrics are not search-engine measurements |
| Homepage audit | `/api/audit`; persisted check results by workspace | Implemented single-page rules; queued multi-page crawler pending |
| Rank observations | `/api/rankings` and migration 002 | Manual history only; no automated provider |
| Reports | `/api/reports` | Authenticated CSV exports; PDF/scheduling not implemented |
| Google Search Console | `/api/integrations/gsc/*` and migration 004 | Official OAuth integration and import built; unverified against a live Google account until configured |
| External keyword/backlink estimates | none | Requires separately licensed provider; charts are sample data |

## Google setup

The user must create their own Google Cloud OAuth client with Search Console API access, set a permitted callback URI to `https://YOUR_DOMAIN/api/integrations/gsc/callback`, and supply `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_ORIGIN`, and a 32-byte hex `GSC_ENCRYPTION_KEY` in a private environment. The app requests only `https://www.googleapis.com/auth/webmasters.readonly`, uses one-use short-lived state and PKCE, encrypts refresh tokens, permits property selection only from the authorized API listing, and imports up to 1,000 rows for one 31-day request. The `partial` flag indicates when the 1,000-row cap was hit; complete extraction requires further paginated synchronization. Google OAuth verification and quota approvals may be required before broad public usage. Imported GSC **average position** is an aggregate, not an exact daily SERP ranking.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/integrations/gsc/connect` | Get Google consent URL |
| GET | `/api/integrations/gsc/callback` | Validate one-time OAuth state and save encrypted refresh token |
| GET / PATCH / DELETE | `/api/integrations/gsc` | Connection status / select permitted property / disconnect |
| GET | `/api/integrations/gsc/properties` | List Google-permitted properties |
| GET / POST | `/api/integrations/gsc/performance` | Read stored metrics / import selected date range |

## Migrations and operations

The target `replica/schema.sql` is **not** the installed schema. The current model is `db/schema.sql` followed by migrations 001–004. Back up the database, then use the tracked migration runner:

```sh
npm run db:status
npm run db:migrate
npm run db:status
```

The runner checks expected tables, indexes and constraints and tracks immutable migration checksums. Migration 001 leaves legacy unowned rows invisible until ownership is verified. See [db/SCHEMA.md](../db/SCHEMA.md) for current vs future structure; production database/networking still needs separate operational controls.

## Security checklist

- [x] No third-party credentials committed; `.env*` excluded from source control except examples
- [x] Password hashing and revocable HttpOnly session cookies
- [x] Session-based workspace authorization on persisted projects, keywords and audits
- [x] External GSC OAuth state/PKCE and encrypted refresh-token storage
- [x] Database constraints for records and tenant foreign keys in additive migrations
- [x] Empty/unavailable data is not silently replaced with a successful save
- [ ] Email ownership verification, password recovery and sign-out-everywhere UI
- [ ] Complete automated two-user isolation regression suite covering every route
- [ ] Production crawler egress controls, DNS pinning and robots-aware queued multi-page crawling
- [ ] Full Google API live connection with real developer credentials and pagination beyond 1,000 rows
- [ ] Rate-limit load testing, abuse monitoring and distributed proxy correctness
- [ ] Backups/restore drill and scheduled retention/purge
- [ ] Privacy policy and processor inventory before launch
- [ ] Dependency audit issues and production security review closed

## Not in scope

Payments, subscriptions and outbound email delivery are not implemented because SearchPilot's initial SEO product scope has no payment or transactional email requirements configured. No Stripe/webhook endpoints exist. Do not claim Google, keyword or backlink provider connectivity without real credentials and measured results.

Next: `/replica-test` for full API/security and browser flows, then production preparation once externally dependent integrations are configured.
