# SearchPilot

An original SEO analysis and monitoring workspace inspired by publicly documented patterns in modern SEO toolkits. Built with **Next.js, TypeScript, Tailwind CSS and PostgreSQL**.

Features include a responsive dashboard, project organization, keyword tracking, domain and backlink overview illustrations, report screens, and a lightweight on-demand homepage SEO audit. The project deliberately uses a distinct product name and original interface.

## Run locally

```bash
npm install
cp .env.example .env.local
docker compose up -d
npm run dev
```

Visit http://localhost:3000.

PostgreSQL initializes automatically from `db/schema.sql` when the Docker volume is first created. To apply the schema to an existing database:

```bash
docker compose exec -T postgres psql -U searchpilot -d searchpilot < db/schema.sql

# Then apply the additive local-auth migration to the SAME existing database:
docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U searchpilot -d searchpilot < db/migrations/001_local_auth_workspaces.sql
```

Configure `AUTH_SECRET` as an unpredictable 32+ character string (for example generate one with `openssl rand -hex 32`). Set `APP_ORIGIN=http://localhost:3000` for local same-origin mutation protection; set the exact public HTTPS origin behind a production proxy. Do not commit secrets. Authentication routes are `POST /api/auth/register` (`{email,password,displayName}`), `POST /api/auth/login` (`{email,password}`), `POST /api/auth/logout` (empty JSON body), and `GET /api/auth/me`. Passwords require 12–256 characters. Sessions use signed HttpOnly SameSite=Lax cookies backed by revocable database session records. Browser mutation requests must supply a same-origin `Origin` header. Responses from registration/login/me contain `{user,workspaces,activeWorkspaceId}`; `me` also returns `authenticated:true`. Provide optional `x-workspace-id` on project/keyword/audit requests to choose among authorized workspaces, otherwise the oldest membership is used. Viewers can read, while owners/editors can modify. Unknown legacy projects retain `workspace_id=NULL` and are invisible; the migration never claims them for a newly registered user.

To inspect fixture data **without any `DATABASE_URL`**, run `NODE_ENV=development SEARCHPILOT_DEMO=true npm run dev`; the read endpoints then return clearly labeled demo data. Demo writes remain unavailable, except for ephemeral on-demand audit results. With `DATABASE_URL` present, authentication is required for persisted data; an unavailable DB never falls back to private data fixtures.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## Data accuracy

Domain visibility, traffic, backlinks, estimated keyword difficulty and trend figures in the demonstration are illustrative. They are **not live search engine analytics**. Keyword values can be entered manually and stored in PostgreSQL. Site Audit performs a real, **single-page** public HTML check on request (title, description, headings, canonical, viewport and HTTPS response). It is not a full crawl or a Google rankings report.

## Project references

- [Public feature recon and screen inventory](replica/recon.md)
- [Feature matrix](replica/features.csv)
- [Architecture and phased roadmap](ARCHITECTURE.md)

## Before deploying publicly

Implement user accounts and tenant isolation, rate limiting, auditing budgets, and hardened outbound networking/SSRF protection for URL inspection. The current project is an MVP suitable for local development, not a multi-tenant public production service.
