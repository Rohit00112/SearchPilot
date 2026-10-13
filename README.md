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
```

If you prefer to inspect the UI without running a database, omit `.env.local` and launch `npm run dev`. Read endpoints then return clearly labeled demo data. Saving projects and keywords requires PostgreSQL; one-off site audits remain available without it.

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
