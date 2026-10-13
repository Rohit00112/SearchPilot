# SearchPilot REST API specification

**Status:** Architecture proposal, 2026-10-13. **Source of truth for currently implemented behavior:** `app/api/{projects,keywords,audit}/route.ts`, `lib/db.ts`, `lib/response.ts`, `lib/demo.ts`, `db/schema.sql`. **Requirements mapping:** `replica/recon.md` F01–F15 and S01–S32; `replica/features.csv`. This document distinguishes **LIVE** legacy routes from **PROPOSED** `/api/v1/*` routes. Nothing in the proposed catalog is implemented by this specification. SearchPilot uses original functionality and authorized/licensed data; no proprietary Semrush APIs, metrics, assets or account data.

## 1. Current implementation (LIVE, exact on-disk contracts)

Base path `/api`. JSON responses, camelCase aliases. Server runtime: Node.js. There is **no authentication, authorization, tenant identifier or tenant query filter** today. PostgreSQL persistence is enabled only if `DATABASE_URL` is set. `lib/db.ts` creates a cached `pg.Pool` (max 5 connections, 5-second connection timeout); `PGSSL=true` opts into certificate-verifying TLS. Current writes are not idempotent, have no standard pagination, and responses carry no request ID or provenance envelope. Treat routes as local development APIs; protect or replace them before deploying publicly. Both domain normalizer and audit accept hostnames such as `example.com`, trim input, lower-case `URL.hostname`, and reject invalid/non-public-looking hostnames. This is validation, not proof of ownership.

| Method and path | Auth/role today | Input | Success response and semantics | Errors | Flow / screen |
| --- | --- | --- | --- | --- | --- |
| **GET /api/projects** | None | No supported filters | **200** `{projects:[{id,name,domain,createdAt}],demo:boolean}`; newest first in DB. Without DB, two static projects and `demo:true`. | DB query failure **503** `{error:string}`. | F01, F13, F15; S03–S05, S16 |
| **POST /api/projects** | None | JSON `{name:string,domain:string}`; name trim 1–120, domain normalized host ≤253 | **201** `{project:{id,name,domain,createdAt}}`; new UUID, DB timestamp. | No DB **503** `{error:"Configure DATABASE_URL to save projects. Demo content is read-only."}`; validation/SQL **400** `{error:string}`. No uniqueness constraint on domain. | F01; S04 |
| **GET /api/keywords** | None | Optional `?projectId=<uuid>`; omit = all projects (no tenant boundary). | **200** `{keywords:[{id,projectId,keyword,position,volume,difficulty,createdAt}],demo:boolean}`; DB newest first. If no DB, static seeded rows optionally filtered by projectId. Nullable values are allowed in DB. | DB/query error **400** `{error:string}`; invalid UUID when DB is active also **400**. | F03, F05, F06, F15; S09, S17–S19, S22 |
| **POST /api/keywords** | None | JSON `{projectId:string,keyword:string,position?:number|null,volume?:number|null,difficulty?:number|null}`; keyword trim 1–200; position integer 1–1000; volume nonnegative integer; difficulty integer 0–100; omitted/null metrics saved as NULL. | **201** `{keyword:{id,projectId,keyword,position,volume,difficulty,createdAt}}`. DB `UNIQUE(project_id,keyword)` applies case-sensitive uniqueness. | No DB **503** `{error:"Configure DATABASE_URL to save keywords."}`; bad input, invalid FK, duplicates/SQL **400** `{error:string}`. No stable conflict code. | F03/F05; S17/S19 |
| **DELETE /api/keywords?id=<uuid>** | None | Required query `id`. | **200** `{deleted:boolean}`; false if no matching row. Deletes immediately, no confirmation token. | No DB **503** `{error:"Configure DATABASE_URL to modify keywords."}`; missing id **400**; SQL error **400**. | F05/F06; S19 |
| **GET /api/audit** | None | Optional `?projectId=<uuid>`; omit returns up to 40 newest DB audits across all projects, including unlinked. | **200** `{audits:[{id,projectId,domain,score,checks,checkedAt}],demo:boolean}`; DB ordered `checked_at DESC LIMIT 40`. Demo fixtures filtered by projectId if no DB. | SQL/UUID error **400**. | F07/F08/F15; S13/S23/S25 |
| **POST /api/audit** | None | JSON `{domain:string,projectId?:string|null}`; projectId optional. | **200** without DB: `{audit:{id,projectId,domain,score,checkedAt,checks, demo:false},persisted:false}`; **201** with DB: `{audit:{id,projectId,domain,score,checks,checkedAt},persisted:true}`. The nested `demo:false` on the non-persisted result denotes a **real on-demand check**, not durable storage. | Validation/DNS/fetch/DB failures **400** `{error:string}`. No dedicated timeout or rate-limit status. | F07/F08; S13/S14/S23 |

### Current audit algorithm and boundaries

`POST /api/audit` resolves all DNS addresses and rejects detected non-public IPv4/IPv6 ranges, then fetches **only** `https://<normalized-domain>/`, with `redirect:"manual"`, an 8-second fetch timeout, a SearchPilot user agent and at most 300,000 characters of HTML inspected. It checks HTTPS response, HTML title, meta description, count of H1 tags, canonical link and mobile viewport. Each check is `{name,status:"pass"|"warning"|"fail",details,recommendation}`. Score is `round((passes + warnings*0.5)/6*100)`. A one-off audit is available with no project or database; without DB it returns `persisted:false`. It does **not** crawl multiple pages, follow redirects, collect rankings, calculate backlinks, check ownership, or schedule recurring jobs. DNS lookup is separate from the subsequent request; it is **not** a hardened DNS-pinned outbound fetch. Apply egress, rebinding and IP controls before public exposure.

### Current database shape and explicit limitations

- `projects(id uuid PK, name varchar(120), domain varchar(253), created_at timestamptz)`.
- `keywords(id uuid PK, project_id uuid FK ON DELETE CASCADE, keyword varchar(200), position int nullable, volume int nullable, difficulty int nullable, created_at timestamptz, UNIQUE(project_id,keyword))`; index `project_id`.
- `audits(id uuid PK, project_id uuid nullable FK ON DELETE SET NULL, domain varchar(253), score int 0–100, checks jsonb, checked_at timestamptz)`; index `(project_id, checked_at DESC)`.
- No `user_id`, `tenant_id`, membership, OAuth credential, result provenance, crawl/run state, queue, provider observations or audit logs exist yet. Legacy `DELETE /api/keywords` is also implemented even though the architecture assignment highlights the GET/POST groups. `lib/response.ts` uniformly emits `{error:message}` at passed HTTP status, default **400**. These are observed contracts; the rest of this document is the target design.

## 2. Versioned API conventions (PROPOSED)

**Base:** `/api/v1` over HTTPS; `application/json` request/response except downloads and webhooks. Versioned handlers must require authenticated session or scoped service token, and must not automatically fall back to legacy routes. Public OAuth callback and inbound webhook are explicit exceptions with separate verification. Authenticated browser calls use HttpOnly Secure SameSite cookies and CSRF defenses for mutation; automation uses scoped OAuth/service Bearer tokens. Never accept a client-supplied `tenantId` as authorization. Derive user/tenant from trusted session + membership; resolve `workspaceId` resources within that scope on **every** query and write.

**Roles:** `guest` (registration/auth only), `viewer` (read permitted workspace data and exports where shared), `editor` (viewer + research lists, campaigns, audits, reports), `admin` (editor + membership, integration, workspace config), `owner` (admin + ownership/transfer/deletion/billing). Worker/system tokens are scoped to an exact tenant, job and capability. Research lookups are available to authenticated members subject to plan quotas; writes never occur on viewer. Workspace membership must be active and tenant-specific, not merely user existence. Private OAuth tokens accessible only to the server.

**Identifiers and fields:** UUIDv4/UUIDv7 IDs; UTC RFC3339 timestamps; domain normalized to punycode hostname, scope `domain|subdomain|url_prefix` with canonical target value; separate GSC property identifiers such as `sc-domain:example.com` versus `https://example.com/`. Country ISO 3166-1 alpha-2; search engine enum `google|bing` only when provider supported; device `desktop|mobile`; BCP-47 locale. Avoid treating GSC average position as a per-keyword live SERP rank.

**Success envelope:** regular `GET` object and list responses `{data: object|array,meta:{requestId,asOf,source,coverage,partial,query},page?:{limit,nextCursor,hasMore}}`; creation `201 {data:resource,meta}`, asynchronous start `202 {data:{jobId,status:"queued",resourceId?},meta}`, deletion `204` unless returning an undo token. Example metric `{value:1250,unit:"clicks",period:{start,end},source:{type:"google_search_console",provider:"google",connectionId,property,observedAt,ingestedAt},freshness:"fresh",isSample:false,coverage:{complete:false,reason:"provider_sampling_or_latency"}}`. A report must propagate per-metric provenance rather than replacing it with an aggregate label.

**Error envelope:** `{error:{code,message,details?:[{field,reason}],retryable:boolean},meta:{requestId}}`. Codes: `INVALID_ARGUMENT` 400; `UNAUTHENTICATED` 401; `PERMISSION_DENIED` 403; `NOT_FOUND` 404 (also for out-of-tenant IDs); `CONFLICT` 409; `PRECONDITION_FAILED` 412 (ETag/version); `UNPROCESSABLE_SCOPE` 422; `RATE_LIMITED`/`QUOTA_EXCEEDED` 429; `PROVIDER_UNAVAILABLE`/`DATABASE_UNAVAILABLE` 503; `GATEWAY_TIMEOUT` 504; `INTERNAL` 500. Include `Retry-After` on 429/503 when known. OAuth denial is redirected to UI with a short opaque error code, never token-bearing URL parameters.

**Pagination/query:** collection routes accept `limit=25` (1–100), opaque signed `cursor` (keyset: stable `(created_at,id)` or `(observed_at,id)`), `sort` allowlist, and typed `filter` keys documented per route; return `page:{limit,nextCursor,hasMore}`. A cursor is bound to tenant, resource, filter hash, sort and snapshot watermark; reject cross-query/cross-tenant reuse (400), expire at 24h. Aggregate series use `from`/`to` ISO dates, `granularity=day|week|month`, timezone explicit; include incomplete days and data delay. Exports are jobs for large results, with snapshot watermark and capped rows. No unbounded `offset`.

**Retries, idempotency and concurrency:** `GET` safe with ETag/`If-None-Match` and bounded cache; GET 502/503/504 retry with exponential backoff/jitter, observe `Retry-After`; do not retry 400/401/403/404. Mutating `POST` endpoints creating jobs, reports, invoices/invites, lists or campaign starts require `Idempotency-Key` (UUID unique by tenant+principal+method+path, 24h TTL) and request body hash: identical retries replay prior status/body; different payload yields 409. `PATCH` uses `If-Match` row version; `DELETE` idempotently returns 204 (except destructive operations that use explicit confirmation and 202 jobs). Queue has at-least-once delivery; jobs/outbox handlers dedupe by `job_id` + logical work key. Cancellation is best-effort. UI never invents successful writes on failure.

**Rate limit:** per tenant, user/IP and endpoint class, not just IP; separate independent limits for keyword lookups, provider pulls, crawling, exporting and OAuth. `429` includes retry hints and remaining quota metadata when safe. Preserve customer-owned private data by encryption at rest, field-level tokens, redact logs, and audit sensitive actions.

## 3. API catalog: future-only resources

Each row has **method path · minimum role · input · response · linked flows/screens**. All rows are **PROPOSED** and use the v1 envelopes above; `{id}` is a UUID subject to workspace membership. `GET` reads are viewer unless marked. `POST/PATCH/DELETE` are editor unless marked. A slash-separated group of methods indicates distinct endpoints with the exact same resource boundary; each is explicitly named below. All list GET endpoints paginate by convention.

### Identity, organizations and projects (F01/F13/F15)

| Method path | Role | Input → output | Flow / screen |
| --- | --- | --- | --- |
| POST `/api/v1/auth/register` | guest | `{email,password,displayName,inviteToken?}` → `{user,verificationRequired}`; email confirmation required | F01; S02 |
| POST `/api/v1/auth/login` | guest | `{email,password,totpCode?}` → session cookie + `{user,mfaRequired}` | F01; S02 |
| POST `/api/v1/auth/logout` | member | CSRF, revoke session → 204 | F01; S02 |
| POST `/api/v1/auth/password/reset-requests` | guest | `{email}` → 202 generic response; prevent enumeration | F01; S02 |
| POST `/api/v1/auth/password/resets` | guest | `{token,newPassword}` → 204 | F01; S02 |
| GET `/api/v1/me` | member | No input → user, memberships, active workspace, capabilities | F01/F15; S02/S03 |
| GET `/api/v1/workspaces` | member | `cursor,limit,search,pinned,tag` → memberships' workspace summaries | F01/F15; S03 |
| POST `/api/v1/workspaces` | member | `{name,primaryDomain?}` → workspace with owner membership | F01; S04 |
| GET `/api/v1/workspaces/{workspaceId}` | viewer | ID → workspace, allowed actions, tool cards, connected sources | F01/F15; S03/S05 |
| PATCH `/api/v1/workspaces/{workspaceId}` | admin | `{name?,pinned?,tags?}` + If-Match → updated workspace/version; domain editing restricted once locked | F01/F15; S04 |
| DELETE `/api/v1/workspaces/{workspaceId}` | owner | `{confirmationName}` → 202 deletion job; revoke tokens/children with retention policy | F01; S04 |
| POST `/api/v1/workspaces/{workspaceId}/select` | member | `{preferredDateRange?,filters?}` → active workspace preference and allowed filters | F15; S03/S05 |
| GET `/api/v1/workspaces/{workspaceId}/members` | admin | `cursor,limit,status` → members/invites/roles | F13; S16 |
| POST `/api/v1/workspaces/{workspaceId}/invitations` | admin | `{email,role:"viewer"|"editor"|"admin",expiresAt?}` → invitation, delivery job; no owner assignment | F13; S16 |
| POST `/api/v1/invitations/{token}/accept` | signed-in invitee | token → membership; verify email, expiry and workspace | F13; S16/S02 |
| PATCH `/api/v1/workspaces/{workspaceId}/members/{memberId}` | admin | `{role}` + If-Match → member/version; protect last owner | F13; S16 |
| DELETE `/api/v1/workspaces/{workspaceId}/members/{memberId}` | admin | member ID → 204; owner removal requires transfer flow | F13; S16 |
| POST `/api/v1/workspaces/{workspaceId}/ownership-transfer` | owner | `{newOwnerMemberId,reauthProof}` → pending/accepted transfer | F13; S16 |
| GET `/api/v1/workspaces/{workspaceId}/sites` | viewer | `cursor,limit` → targets | F01/F02/F07; S03/S04/S06 |
| POST `/api/v1/workspaces/{workspaceId}/sites` | editor | `{host,scope,protocol,pathPrefix?}` → normalized site target, ownershipStatus | F01/F07; S04/S14 |
| PATCH `/api/v1/workspaces/{workspaceId}/sites/{siteId}` | admin | `{displayName?,urlPrefix?}` + If-Match → target/version; cannot silently change campaign canonical scope | F01/F07; S04/S14 |
| GET `/api/v1/workspaces/{workspaceId}/dashboard` | viewer | `from,to,siteId?,sources?` → widget metrics with per-value provenance, empty/unconfigured states | F01/F15; S05 |

### Domain, organic rankings and keyword discovery (F02/F03/F04/F06)

| Method path | Role | Input → output | Flow / screen |
| --- | --- | --- | --- |
| GET `/api/v1/research/domains/overview` | member | `target,scope,country,from?,to?` → source-labelled authority/traffic/backlink/keyword metrics or unavailable fields | F02/F09; S06 |
| GET `/api/v1/research/domains/organic-rankings` | member | `target,country,device?,from,to` → summary, trend, landing pages, provider coverage | F02; S07 |
| GET `/api/v1/research/domains/positions` | member | `target,country,device?,cursor,limit,sort,positionMin?,positionMax?,intent?` → SERP position rows, URL, features, observedAt | F02/F06; S08 |
| GET `/api/v1/research/domains/position-changes` | member | `target,country,from,to,changeType=new|lost|improved|declined,cursor` → old/current/delta + provenance | F02/F06; S08 |
| GET `/api/v1/research/keywords/suggestions` | member | `seed,country,language?,match=broad|phrase|exact|related,questions?,intent?,volumeMin?,difficultyMax?,cursor,limit` → groups, suggestions, quotas, provenance | F03/F04; S09 |
| GET `/api/v1/research/keywords/overview` | member | `keyword,country,device?` → volume, difficulty, intent, SERP summary, measured/estimated flags | F03; S10 |
| GET `/api/v1/research/keywords/serp` | member | `keyword,country,device,locale?` → permitted/provider-authorized SERP features and top results, collection timestamp | F03; S10 |
| POST `/api/v1/workspaces/{workspaceId}/keyword-lists` | editor | `{name,kind:"regular"|"strategy",siteId?}` → new list | F03/F04; S11 |
| GET `/api/v1/workspaces/{workspaceId}/keyword-lists` | viewer | `cursor,limit,kind` → list summaries | F03; S11 |
| GET `/api/v1/workspaces/{workspaceId}/keyword-lists/{listId}` | viewer | ID → list, grouped clusters, item count/source | F03/F04; S11 |
| PATCH `/api/v1/workspaces/{workspaceId}/keyword-lists/{listId}` | editor | `{name?,description?}` + If-Match → list/version | F03; S11 |
| DELETE `/api/v1/workspaces/{workspaceId}/keyword-lists/{listId}` | editor | ID → 204, retain observations referenced elsewhere | F03; S11 |
| POST `/api/v1/workspaces/{workspaceId}/keyword-lists/{listId}/items` | editor | `{keywords:[{text,country?,intent?,sourceRef?}]}` (≤100 batch) → created/skipped duplicates | F03/F04; S09/S11 |
| DELETE `/api/v1/workspaces/{workspaceId}/keyword-lists/{listId}/items/{itemId}` | editor | ID → 204 | F03; S11 |
| POST `/api/v1/workspaces/{workspaceId}/keyword-lists/{listId}/clusters:generate` | editor | `{algorithmVersion,seedTopic?}` → 202 cluster generation job | F03; S11 |
| GET `/api/v1/workspaces/{workspaceId}/keyword-lists/{listId}/clusters` | viewer | `cursor,limit` → clusters with pillar/subpage roles and confidence | F03; S11 |
| GET `/api/v1/research/keyword-gap` | member | `primaryTarget,competitors:[1..4],country,device,filter=missing|weak|shared|unique,cursor` → domain keyword intersections | F04; S12 |
| GET `/api/v1/research/keyword-gap/{comparisonId}/export` | member | Saved comparison ID → 202 export job; quota applies | F04; S12 |

**Provider gate:** all research endpoints return `data:null` with `meta.source:"unavailable"` and `coverage.reason:"provider_not_configured"` (or 422 if impossible scope) until authorized datasets exist. Never synthesize search volume, competitor positions, authority or historical trends as live measurements. Cache provider lookups by country/device/query under licensed terms, isolate derived user annotations by tenant and maintain provenance.

### Rank tracking and change diagnosis (F05/F06/F15)

| Method path | Role | Input → output | Flow / screen |
| --- | --- | --- | --- |
| POST `/api/v1/workspaces/{workspaceId}/rank-campaigns` | editor | `{siteId,engine,device,country,region?,city?,postalCode?,locale?,competitorDomains?:[]}` → campaign `configStatus:"pending"` | F05; S17 |
| GET `/api/v1/workspaces/{workspaceId}/rank-campaigns` | viewer | `cursor,limit,status,siteId` → campaign summaries | F05/F15; S17/S18 |
| GET `/api/v1/workspaces/{workspaceId}/rank-campaigns/{campaignId}` | viewer | ID → campaign settings, last observation, entitlement usage | F05; S17/S18 |
| PATCH `/api/v1/workspaces/{workspaceId}/rank-campaigns/{campaignId}` | editor | `{competitorDomains?,schedule?,tags?}` + If-Match; immutable engine/device/location require new campaign | F05/F06; S17 |
| POST `/api/v1/workspaces/{workspaceId}/rank-campaigns/{campaignId}/keywords` | editor | `{keywords:[{text,tags?:[]}]}` ≤100 → added/rejected | F05; S17/S19 |
| DELETE `/api/v1/workspaces/{workspaceId}/rank-campaigns/{campaignId}/keywords/{keywordId}` | editor | ID → 204; no erasure of historical observations | F05; S19 |
| POST `/api/v1/workspaces/{workspaceId}/rank-campaigns/{campaignId}/collect` | editor | `{reason:"manual"}` + Idempotency-Key → 202 rank snapshot job (quota) | F05/F06; S18 |
| GET `/api/v1/workspaces/{workspaceId}/rank-campaigns/{campaignId}/summary` | viewer | `from,to,compareFrom?,compareTo?` → visibility, average position, source/freshness, pending state | F05/F06; S18/S21 |
| GET `/api/v1/workspaces/{workspaceId}/rank-campaigns/{campaignId}/rankings` | viewer | `asOf?,cursor,limit,positionMin?,positionMax?,tag?,changeType?,sort?` → keyword position, landing URL, delta, capture time | F05/F06; S19 |
| GET `/api/v1/workspaces/{workspaceId}/rank-campaigns/{campaignId}/history` | viewer | `from,to,granularity,keywordIds?,tags?` → sourced position/visibility series | F06; S18/S21 |
| GET `/api/v1/workspaces/{workspaceId}/rank-campaigns/{campaignId}/competitors` | viewer | `from,to,cursor` → rival comparison/share-of-voice if authorized | F05/F06; S20 |
| GET `/api/v1/workspaces/{workspaceId}/rank-campaigns/{campaignId}/landscape` | viewer | `from,to` → winners, losers, landing pages, warning trends | F06; S21 |
| GET `/api/v1/workspaces/{workspaceId}/rank-campaigns/{campaignId}/annotations` | viewer | `from,to,cursor` → timeline notes | F06; S22 |
| POST `/api/v1/workspaces/{workspaceId}/rank-campaigns/{campaignId}/annotations` | editor | `{date,text,tags?}` → annotation | F06; S22 |
| PATCH `/api/v1/workspaces/{workspaceId}/rank-campaigns/{campaignId}/annotations/{id}` | editor | `{text?,date?}` + If-Match → updated annotation | F06; S22 |
| DELETE `/api/v1/workspaces/{workspaceId}/rank-campaigns/{campaignId}/annotations/{id}` | editor | ID → 204 | F06; S22 |

Rank observation identity should be `(tenant,campaign,keyword,engine,device,location,captured_at,provider)`; repeated collection never overwrites an unrelated location or substitutes GSC aggregate average position for exact rank. Statuses `unconfigured|pending|collecting|ready|partial|failed|paused`; freshness and supported regions are explicit.

### Multi-page audit and issue resolution (F07/F08)

| Method path | Role | Input → output | Flow / screen |
| --- | --- | --- | --- |
| POST `/api/v1/workspaces/{workspaceId}/audit-campaigns` | editor | `{siteId,startUrl,crawlSource:"site"|"sitemap",pageLimit,includeRules?,excludeRules?,userAgentPolicy,schedule?}` → campaign/config | F07; S14 |
| GET `/api/v1/workspaces/{workspaceId}/audit-campaigns` | viewer | `siteId?,cursor,limit` → configured audits | F07; S13/S14 |
| GET `/api/v1/workspaces/{workspaceId}/audit-campaigns/{auditId}` | viewer | ID → campaign/last run/quotas | F07/F08; S13 |
| PATCH `/api/v1/workspaces/{workspaceId}/audit-campaigns/{auditId}` | editor | validated crawl settings + If-Match → updated config | F07; S14 |
| POST `/api/v1/workspaces/{workspaceId}/audit-campaigns/{auditId}/runs` | editor | `{scopeOverride?}` + Idempotency-Key → **202** job and run ID | F07/F08; S13/S14 |
| GET `/api/v1/workspaces/{workspaceId}/audit-campaigns/{auditId}/runs` | viewer | `cursor,limit,status` → run history, progress, scores | F07/F08; S13/S25 |
| GET `/api/v1/workspaces/{workspaceId}/audit-runs/{runId}` | viewer | ID → status, source, page count, health, started/finished, errors | F07/F08; S13 |
| GET `/api/v1/workspaces/{workspaceId}/audit-runs/{runId}/issues` | viewer | `severity?,ruleId?,status?,cursor,limit` → grouped issue count, explanation, fix hint, affected URLs | F08; S23 |
| GET `/api/v1/workspaces/{workspaceId}/audit-runs/{runId}/pages` | viewer | `status?,urlContains?,cursor,limit` → crawled pages with status/title/canonical/metadata | F08; S25 |
| GET `/api/v1/workspaces/{workspaceId}/audit-runs/{runId}/themes` | viewer | `theme=crawlability|https|links|markup|performance` → sourced thematic summary, unsupported tests explicit | F08; S24 |
| GET `/api/v1/workspaces/{workspaceId}/audit-runs/compare` | viewer | `olderRunId,newerRunId` both same tenant/target → fixed/new/regressed diff | F08; S25 |
| PATCH `/api/v1/workspaces/{workspaceId}/audit-findings/{findingId}` | editor | `{status:"open"|"acknowledged"|"false_positive"|"fixed_claimed",note?}` + If-Match → review, author/time; next crawl verifies actual fix | F08; S23 |
| POST `/api/v1/workspaces/{workspaceId}/audit-runs/{runId}/exports` | editor | `{format:"csv"|"pdf",include:"issues"|"pages"|"comparison"}` → 202 export job | F08; S25 |

Crawler guardrails: tenant-scoped ownership or explicit authority for configured targets, robots.txt and crawl-delay policies, per-host concurrency, max pages/bytes/depth/duration, normalized canonical scope, redirect-by-redirect public-IP verification with DNS pinning, block metadata/internal destinations, no arbitrary ports or credentials, no HTML script execution, encrypted data, durable cancellation/progress and consent/legal retention. Separate cheap unaffiliated public **single-page** checks from owner-configured crawls. Only completed runs contribute to finalized score; partial crawl score labelled incomplete.

### Backlinks, review and competitor gaps (F09/F10/F11)

| Method path | Role | Input → output | Flow / screen |
| --- | --- | --- | --- |
| GET `/api/v1/research/backlinks/overview` | member | `target,scope,from,to` → link/domain counts, follow/nofollow, authority **if provider supports**, source/coverage | F09; S26 |
| GET `/api/v1/research/backlinks/links` | member | `target,sourceDomain?,rel?,status?,firstSeenFrom?,cursor,limit` → sourceURL,targetURL,anchor,rel,first/lastSeen | F09/F10; S27 |
| GET `/api/v1/research/backlinks/referring-domains` | member | `target,authorityMin?,cursor,limit` → referring domains, counts, quality/source | F09; S27 |
| GET `/api/v1/research/backlink-gap` | member | `target,competitors:[1..4],cursor,limit` → missed referring sources with coverage/confidence | F11; S29 |
| POST `/api/v1/workspaces/{workspaceId}/backlink-audits` | editor | `{siteId,sourceSnapshotId}` → 202 review job; requires licensed/owned observations | F10; S28 |
| GET `/api/v1/workspaces/{workspaceId}/backlink-audits/{auditId}` | viewer | ID → review totals and snapshot provenance; heuristic score explicitly non-authoritative | F10; S28 |
| GET `/api/v1/workspaces/{workspaceId}/backlink-audits/{auditId}/items` | viewer | `verdict?,workflowStatus?,cursor,limit` → backlink and evidence | F10; S28 |
| PATCH `/api/v1/workspaces/{workspaceId}/backlink-audits/{auditId}/items/{itemId}` | editor | `{verdict:"review"|"safe"|"risky",workflowStatus:"open"|"whitelist"|"contacted"|"removed"|"disavow_candidate",note?}` + If-Match → review record | F10; S28 |
| POST `/api/v1/workspaces/{workspaceId}/backlink-audits/{auditId}/disavow-exports` | admin | `{confirmedItemIds,acknowledgedRisks:true}` → 202 downloadable plain-text suggestion; **no automatic Search Console submission** | F10; S28 |

Suspicious-link rankings are heuristics, never definitive toxicity claims; preserve reviewer decisions/history and manual confirmation. Backlink data depends on independent crawling or licensed provider; absent provider returns unavailable provenance.

### Reports, exports, schedules and notifications (F12)

| Method path | Role | Input → output | Flow / screen |
| --- | --- | --- | --- |
| GET `/api/v1/workspaces/{workspaceId}/reports` | viewer | `cursor,limit,search,template?` → report gallery | F12; S30 |
| POST `/api/v1/workspaces/{workspaceId}/reports` | editor | `{title,templateId?,siteId?,modules:[{type,config}],branding?}` → report draft | F12; S15/S30 |
| GET `/api/v1/workspaces/{workspaceId}/reports/{reportId}` | viewer | ID → layout/version/linked data source requirements | F12; S15 |
| PATCH `/api/v1/workspaces/{workspaceId}/reports/{reportId}` | editor | `{title?,modules?,branding?}` + If-Match → saved report/version | F12; S15 |
| DELETE `/api/v1/workspaces/{workspaceId}/reports/{reportId}` | editor | ID → 204; stop future schedules | F12; S30 |
| POST `/api/v1/workspaces/{workspaceId}/reports/{reportId}/preview` | viewer | `{from,to,filters?}` → resolved modules with individual provenance and missing-source warnings | F12; S15 |
| POST `/api/v1/workspaces/{workspaceId}/reports/{reportId}/exports` | editor | `{format:"pdf"|"csv",from,to,branding?}` + Idempotency-Key → 202 export job | F12; S15/S30 |
| GET `/api/v1/workspaces/{workspaceId}/reports/{reportId}/schedules` | viewer | `cursor,limit` → delivery schedules | F12; S30 |
| POST `/api/v1/workspaces/{workspaceId}/reports/{reportId}/schedules` | admin | `{rrule,timezone,recipients:[verified email],format}` → schedule, next run | F12; S30 |
| PATCH `/api/v1/workspaces/{workspaceId}/reports/{reportId}/schedules/{scheduleId}` | admin | `{rrule?,recipients?,enabled?}` + If-Match → schedule/version | F12; S30 |
| DELETE `/api/v1/workspaces/{workspaceId}/reports/{reportId}/schedules/{scheduleId}` | admin | ID → 204 | F12; S30 |
| GET `/api/v1/workspaces/{workspaceId}/notifications` | viewer | `cursor,limit,unreadOnly?` → accessible alerts | F06/F08/F12; S05/S18 |
| PATCH `/api/v1/workspaces/{workspaceId}/notifications/{id}` | viewer | `{read:true}` → notification | F06/F08/F12; S05/S18 |
| GET `/api/v1/workspaces/{workspaceId}/exports/{exportId}` | viewer if requestor/member allowed | ID → export metadata, expiry, status, provenance | F03/F08/F12; S09/S15/S25 |
| GET `/api/v1/workspaces/{workspaceId}/exports/{exportId}/download` | authorized member | ID → short-lived private signed URL redirect or streamed download; no cached public URLs | F03/F08/F12; S09/S15/S25 |

No automated report may silently include mock figures. Unavailable data modules render explanatory placeholders or fail explicitly if required. Email delivery uses verified recipient allowlists and a separate transactional mail job with delivery receipts, bounce and retry status.

### Google Search Console integration and authenticated data (F14/F02/F05/F15)

| Method path | Role | Input → output | Flow / screen |
| --- | --- | --- | --- |
| GET `/api/v1/workspaces/{workspaceId}/integrations` | viewer | `provider?` → connections summary, permissions, freshness, never credentials | F14; S31/S05 |
| POST `/api/v1/workspaces/{workspaceId}/integrations/gsc/authorize` | admin | `{returnPath?,requestedProperty?}` + CSRF → `{authorizationUrl,stateExpiresAt}` | F14; S31 |
| GET `/api/v1/integrations/gsc/oauth/callback` | **public callback**, verified OAuth state | `code,state` (or `error,state`) → verify state, exchange code server-side, encrypted token reference, redirect to safe internal settings page | F14; S31 |
| GET `/api/v1/workspaces/{workspaceId}/integrations/gsc/properties` | admin | `connectionId,cursor?,limit?` → properties from official Search Console Sites API with permission level | F14; S31 |
| POST `/api/v1/workspaces/{workspaceId}/integrations/gsc/properties` | admin | `{connectionId,siteId,propertyUri}` → linked property, ownership/permission verified | F14; S31 |
| POST `/api/v1/workspaces/{workspaceId}/integrations/gsc/syncs` | admin | `{connectionId,propertyId,startDate,endDate,dimensions:["date","query","page","country","device"]}` + Idempotency-Key → **202** sync job | F14/F02/F05; S31/S05 |
| GET `/api/v1/workspaces/{workspaceId}/integrations/gsc/syncs` | viewer | `cursor,limit,status` → jobs, last sync/coverage | F14; S31 |
| GET `/api/v1/workspaces/{workspaceId}/search-console/performance` | viewer | `propertyId,from,to,dimensions?,searchType?,country?,device?,cursor,limit` → clicks, impressions, CTR, **average** position, source/freshness | F14/F02/F06; S05/S06/S19 |
| GET `/api/v1/workspaces/{workspaceId}/search-console/pages` | viewer | `propertyId,from,to,cursor,limit` → pages with clicks/impressions/CTR/avgPosition | F14/F02; S05/S07 |
| DELETE `/api/v1/workspaces/{workspaceId}/integrations/gsc/{connectionId}` | admin | ID + reauthentication → 204; revoke token where supported, disable syncs, apply data retention policy | F14; S31 |

**Google official OAuth protocol:** Use Google OAuth 2.0 authorization-code flow, preferably PKCE plus `state` nonce bound to session, workspace, requested scopes, expiration (≤10 minutes) and post-connect return path allowlist. Request least-privilege `https://www.googleapis.com/auth/webmasters.readonly` for read-only Search Console performance; only request write scope `https://www.googleapis.com/auth/webmasters` if a future user-approved write action actually requires it. Use `access_type=offline` and consent behavior when refresh tokens are required; never assume a refresh token arrives on every exchange. Exchange code at Google's token endpoint server-side with registered redirect URI and OAuth client. Encrypt access/refresh tokens using managed secrets/KMS and rotate, never log tokens or return them to browser. List sites using official Search Console Sites API `sites.list`, verify `permissionLevel`, and fetch analytics using official Search Analytics `searchanalytics.query` with bounded date dimensions, supported `searchType`, `rowLimit`/`startRow`, Google quota/backoff policies. Google API rows may be aggregated, privacy-filtered, sampled or delayed and can omit low-volume queries; record `observedAt` and `ingestedAt`, dimensions, query criteria and actual returned count. Revalidate permissions on sync, handle HTTP 401 refresh and 403 permission/quota separately, mark `reauthorization_required` on irrecoverable revocation. A user must explicitly choose accessible properties; knowing a domain name alone does not authorize GSC access. No Google credentials are available in the present project.

**Data semantics:** Search Console's `position` is a weighted average over impressions for the selected dimensions, not the rank of a specific query at an exact moment. Keep `gsc_average_position` distinct from `rank_observation.position`, and preserve original measurement units. Google Analytics (GA4) would need its **own separate** consent/scopes/connector, e.g. future `/integrations/ga4/*`, never reuse the GSC grant.

## 4. Durable jobs and webhooks (PROPOSED)

| Method path | Role / authentication | Input → output | Flow / screen |
| --- | --- | --- | --- |
| GET `/api/v1/workspaces/{workspaceId}/jobs` | viewer | `type?,status?,cursor,limit` → tenant jobs and links | F05/F07/F12/F14; S13/S18/S30/S31 |
| GET `/api/v1/workspaces/{workspaceId}/jobs/{jobId}` | viewer | ID → `{id,type,status,progress,queuedAt,startedAt,completedAt,attempts,resourceId,errorCode?,retryAfter?,resultRef?}` | F05/F07/F12/F14; S13/S18/S30/S31 |
| POST `/api/v1/workspaces/{workspaceId}/jobs/{jobId}/cancel` | editor, admin for integration/report schedule jobs | `{reason?}` + Idempotency-Key → 202 cancel requested or 409 if terminal | F05/F07/F12; S13/S18/S30 |
| POST `/api/v1/workspaces/{workspaceId}/jobs/{jobId}/retry` | editor, admin for connection jobs | `{reason?}` + Idempotency-Key → 202 new attempt; allowed only transient failed jobs, quotas enforced | F05/F07/F12/F14 |
| GET `/api/v1/workspaces/{workspaceId}/events` | viewer | `?after=<cursor>&limit=100` → persisted progress/notification events for polling; optional SSE endpoint `/events/stream` authenticated | F05/F07/F12/F14 |
| POST `/api/v1/internal/jobs/claim` | **worker service account only** | Signed workload identity, `{workerId,capabilities,maxJobs}` → lease set for assigned tenant/job | all async flows |
| POST `/api/v1/internal/jobs/{jobId}/heartbeat` | **scoped worker lease** | `{leaseToken,progress}` → lease extension and acknowledgment | all async flows |
| POST `/api/v1/internal/jobs/{jobId}/complete` | **scoped worker lease** | `{leaseToken,resultRef,metrics}` → terminal status and outbox event, idempotent | all async flows |
| POST `/api/v1/internal/jobs/{jobId}/fail` | **scoped worker lease** | `{leaseToken,errorCode,retryable}` → retry scheduled or dead-letter | all async flows |
| POST `/api/v1/webhooks/provider/{provider}` | **provider HMAC/cryptographic verification**, no user session | Raw signed body + signature/timestamp/event ID → 2xx receipt; async dedupe/event processing | F09/F14 if approved providers support notifications |
| POST `/api/v1/webhooks/delivery/{subscriptionId}/test` | admin | `{}` + Idempotency-Key → 202 outbound test event | F12/S30 |
| GET `/api/v1/workspaces/{workspaceId}/webhook-subscriptions` | admin | `cursor,limit` → URL, subscribed event types, status, never secret | F12 |
| POST `/api/v1/workspaces/{workspaceId}/webhook-subscriptions` | admin | `{httpsUrl,eventTypes}` → subscription and one-time signing secret disclosure through safe setup | F12 |
| PATCH `/api/v1/workspaces/{workspaceId}/webhook-subscriptions/{id}` | admin | `{eventTypes?,enabled?}` + If-Match → updated subscription | F12 |
| DELETE `/api/v1/workspaces/{workspaceId}/webhook-subscriptions/{id}` | admin | ID → 204 | F12 |

Job state machine: `queued → running → succeeded|partial|failed|cancelled`; `running → retry_wait → queued` for transient failures. Events: `job.queued`, `job.progress`, `job.succeeded`, `job.failed`, `audit.completed`, `rank.snapshot.ready`, `gsc.sync.completed`, `report.export.ready`, `report.delivery.failed`. Durable queue + transactional outbox + lease locks ensure retries cannot double-count observations or duplicate sends. Report output may have presigned download URLs valid ≤15 minutes; URLs never stored in lasting app logs.

For **inbound** provider webhooks, verify exact raw body, signature, acceptable timestamp skew, replay-safe delivery ID and provider allowlist, then enqueue and return 2xx promptly. For **outbound** customer webhooks, HMAC-sign `timestamp.id.raw_body` with versioned secret, deliver over HTTPS to validated public IP destinations, rotate secret, dedupe by event ID, retry 408/429/5xx with capped exponential backoff (e.g. 1m, 5m, 30m, 2h, 12h) for ≤48h, honor Retry-After within caps, and expose attempt history. No provider webhooks are installed now; GSC Search Analytics generally requires polling/scheduled sync, not presumed push events.

## 5. Data isolation and security query rules (PROPOSED)

1. Every tenant-owned table includes immutable `workspace_id UUID NOT NULL`, creator/audit fields, timestamps and optional `version`; every membership includes `user_id,workspace_id,role,status`. For legacy `projects`, migrate existing records through an explicit owner claim/backfill; never expose orphan projects to all authenticated users. Preserve existing IDs or provide a migration map.
2. Resolve the session's authorized workspace IDs server-side; scoped queries **must** include both `workspace_id=$workspace` and child IDs, never filter by child ID alone. Example read: `SELECT k.* FROM keywords k JOIN projects p ON p.id=k.project_id WHERE p.workspace_id=$1 AND p.id=$2 AND k.id=$3`. Example delete: `DELETE FROM keywords USING projects p WHERE keywords.project_id=p.id AND p.workspace_id=$1 AND keywords.id=$2 RETURNING keywords.id`. Expose 404 for missing/out-of-scope row to avoid existence leaks.
3. Writes check membership role in the **same transaction** as mutation; foreign keys for cross-resource associations should include tenant scope (`UNIQUE(workspace_id,id)` + composite FKs) or equivalent strict constraints. Use PostgreSQL RLS as defense-in-depth: request transaction `SET LOCAL app.workspace_id` and `app.user_id`, policies for member reads/editor writes, DB app role without `BYPASSRLS`. System jobs use separately scoped trusted credentials with full audit trail. Do not depend solely on RLS with a pooled connection unless per-transaction context is guaranteed.
4. Avoid cross-tenant leakage through autocomplete, counts, owner emails, workspace search, background jobs, signed export links, provider cache, search index, audit logs or error detail. Public research source caches can be shared only for nonprivate, license-permitted raw provider data; tenant overlays remain isolated. Password and OAuth secrets encrypted; audit trail for invitations, permission changes, token connects/revokes, exports and destructive actions.
5. Require authorization on **every** subordinate association: `campaign.workspace_id`, `site.workspace_id`, `run.campaign.workspace_id`, `report.workspace_id`, `integration.workspace_id`. A foreign ID in query/body must be re-resolved under workspace, including `propertyId` and `connectionId`. Validate signed cursor bound to same tenant and request filters.
6. Crawl endpoints carry extra abuse controls: verify public resolvable destinations on every redirect and connection, pin DNS resolution/address through the TCP connection, reject special-use IPv4 and IPv6, block internal services/ports, enforce rate/bandwidth constraints, and never fetch arbitrary OAuth-provided callback URLs. Public share/export URLs are purpose-specific, expiring and read-only.

## 6. Measurement provenance, consistency and provenance-driven UI (PROPOSED)

Common metric storage `metric_snapshots(id,workspace_id,entity_id,metric_key,value,unit,source_kind,provider,provider_account_id,property_uri,source_method,scope_json,filters_json,date_start,date_end,observed_at,ingested_at,expires_at,coverage_json,is_sample,raw_ref_hash,algorithm_version)`. Permitted `source_kind`: `first_party_crawl`, `google_search_console`, `user_entered`, `licensed_provider`, `derived`, `illustrative_sample`; store `derived_from_snapshot_ids` where applicable. Preserve licenses, retention rights and provider API quotas. Rank snapshot, site audit score and Search Console performance are separate measurement families. `illustrative_sample` may be returned only in an expressly opted-in sandbox with `isSample:true`; production APIs should return source-unavailable/empty state instead of misleading fabricated data. When a metric is user-entered (legacy keyword `position/volume/difficulty`), label it `user_entered` even if numerically plausible. Domain overview and backlink charts currently contain **illustrative** values, not measured counts.

Provider status `ready|syncing|stale|disconnected|reauthorization_required|quota_limited|error`; quality `complete|partial|sampled|estimated|unknown`. Use as-of time for snapshots and invalidate caches on new observations. Chart series must share comparable source, dimensions and date granularity or explain mixed provenance. Never backfill gaps with invented zeros; represent missing as null with reason.

## 7. F01–F15 route/feature acceptance map

| Flow / key screens | Primary proposed endpoint sequence | Successful behavior / key error state |
| --- | --- | --- |
| **F01** Create workspace (S02–S05) | register/login → POST workspaces → POST sites (optional) → GET dashboard | Owner membership established; empty dashboard without connected sources; 409 locked/duplicate scope |
| **F02** Evaluate domain (S05–S08) | GET dashboard → GET research/domains/overview → GET organic-rankings → GET positions/position-changes | Country and scope preserved, cursor and evidence visible; unavailable provider reported |
| **F03** Find content keywords (S09–S11) | GET keyword suggestions → GET keyword overview/serp → POST keyword-lists → POST list/items → POST clusters:generate | Filters and match mode apply, additions idempotent, quota/empty states; licensed data only |
| **F04** Find keyword gaps (S06/S12/S09/S11) | GET domain overview → GET research/keyword-gap → GET suggestions → POST list/items | Comparison uses same market/time basis; unavailable or too-small coverage stated |
| **F05** Start tracking (S03/S17–S19) | POST rank-campaigns → POST campaign/keywords → POST campaign/collect → GET jobs/{jobId} → GET rankings | Locale/device/engine immutable identity, queue/initial pending visible |
| **F06** Diagnose decline (S18/S19/S22/S08) | GET summary/history → GET rankings → GET annotations + POST annotations → GET position-changes | Real captured time and comparison windows; lost vs missing observations explicit |
| **F07** Start audit (S03/S14/S13) | POST sites → POST audit-campaigns → POST campaign/runs → GET jobs/{jobId} → GET audit-runs/{id} | Budget/scope/robots validation, queued/partial/failed states |
| **F08** Resolve issue (S13/S23/S25) | GET run/issues → GET run/pages → PATCH audit-findings/{id} → POST campaign/runs → GET run compare | False-positive notes preserved; recrawl confirms actual fix |
| **F09** Investigate links (S06/S26/S27) | GET domain overview → GET backlinks/overview → GET backlinks/links/referring-domains | Include source/last seen, follow vs nofollow, licensed coverage |
| **F10** Review risky links (S26/S28) | POST backlink-audits → GET audit/items → PATCH item → POST disavow-exports | Human decisions and audit trail; no automated disavow submission |
| **F11** Find backlink gaps (S26/S29/S27) | GET backlinks/overview → GET backlink-gap → GET backlinks/links | Unified competitor scopes; empty coverage and provider limitations |
| **F12** Deliver report (S05/S30/S15) | GET reports → POST reports → PATCH report → POST preview → POST exports → GET jobs → GET download → POST schedules | Snapshot-accurate provenance, 202 async export/delivery and recipient consent |
| **F13** Share workspace (S03/S16) | GET members → POST invitations → POST invitation accept → PATCH/DELETE member | Viewer/editor boundaries and invitations enforce verified email |
| **F14** Connect GSC (S05/S31) | POST gsc/authorize → GET oauth/callback → GET gsc/properties → POST property → POST gsc/syncs → GET GSC performance | Official OAuth, least privilege, property permission verification, delayed/sampled status |
| **F15** Switch client (S05/S03/S05) | GET workspaces → POST workspace/select → GET workspace/dashboard + filters | Tenant cache/query keys switched; never show prior client's private data |

**Implementation recommendation:** ship the `/api/v1` identity/workspace and isolation layer first, then move legacy projects/keywords/audits behind authenticated v1 adapters with explicit provenance. Implement GSC authorization and resilient job infrastructure before replacing the sample dashboard metrics. Add multi-page crawls and licensed research providers in later phases. Protect or retire anonymous legacy APIs as part of v1 rollout; do not treat this proposal as evidence that these routes already run.

