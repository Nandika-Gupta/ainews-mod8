# AI News — The AI Signal

A production-ready Next.js implementation of the AI News module: a searchable, filterable, sortable news discovery table plus an article detail page with an AI Summary, comment composer, and a Popular Sources / Related News sidebar. Dark UI with a purple accent, real publisher logos. Backed by a real PostgreSQL database via Prisma, with a REST API and a standalone RSS/JSON-LD ingestion pipeline — no mock data at runtime.

## Tech stack

- **Next.js 15** (App Router) + **TypeScript** (strict mode) + **Tailwind CSS**
- **PostgreSQL** + **Prisma 5** — `Publisher`, `NewsArticle`, `Topic`, `Bookmark`, `Vote` models
- REST API (`/api/news`, `/api/news/:slug`, `/api/publishers`, `/api/topics`, `/api/search`)
- A modular ingestion pipeline (`ingestion/`) that parses RSS feeds and JSON-LD/OpenGraph article metadata into the database
- Self-hosted fonts, no external font CDN dependency

## Run locally in VS Code

### 1. Install PostgreSQL

If you don't already have it, install PostgreSQL 14+ locally (or use any Postgres you have access to — Docker, Supabase, Neon, etc.).

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the database connection

Copy `.env.example` to `.env` and point `DATABASE_URL` at your Postgres instance:

```bash
cp .env.example .env
```

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/ainews?schema=public"
```

### 4. Run migrations and seed the database

```bash
npx prisma migrate dev
npm run db:seed
```

This creates the schema and seeds ~21 publishers plus 200 sample articles (demo content, not live-crawled news) so the site has something to show immediately.

### 5. Start the dev server

```bash
npm run dev
```

Open **http://localhost:3000** (it redirects to `/news`).

If you ever see stale/broken output after pulling changes, clear the Next.js cache and restart:

```bash
rm -rf .next   # Windows (cmd): rmdir /s /q .next
npm run dev
```

### Production build

```bash
npm run build
npm start
```

## Ingesting real news

The seed data is a starting point. To pull real articles from actual publisher RSS feeds:

```bash
npm run ingest
```

This runs `ingestion/run.ts` against the feeds configured in `ingestion/sources.ts`. It:

1. Fetches and parses each RSS/Atom feed.
2. Normalizes each entry's URL, publish date, and text.
3. Filters out non-AI-relevant items on general feeds (skipped entirely on feeds already scoped to AI, via `aiOnly: true`).
4. If an entry has no reliable publish date, fetches the article page itself and extracts `datePublished`/description from its `schema.org/NewsArticle` JSON-LD (or OpenGraph meta tags as a fallback).
5. Resolves the `Publisher` by domain, creating it on first sight — see "Publisher logos" below for exactly how its logo gets resolved.
6. Upserts the article, deduplicated by its canonical `articleUrl` — re-running is always safe, already-seen articles are skipped.

Run it on a schedule yourself (cron, a GitHub Action, etc.) — there's no persistent worker process bundled, since ingestion is a one-shot batch job by design (see `ingestion/run.ts`). Add more feeds by editing `ingestion/sources.ts`; feed paths on publisher sites do drift over time, so verify a new entry actually resolves before relying on it.

**Note on "AI Summary":** there's no LLM in this pipeline. The AI Summary field is populated from the source's own RSS description / JSON-LD description at ingestion time, not a real generated summary — wire in a summarization call in `ingestion/pipeline.ts` (`ingestEntry`) if you want genuine LLM-written summaries.

## Publisher logos

Every publisher's logo is resolved **once**, the first time that domain is seen, and reused forever after — nothing is fetched live per-article or per-request:

1. If it's a well-known publisher with a hand-bundled brand SVG in `public/logos/` (see `lib/data/sourceLogos.ts`), that's used directly.
2. Otherwise `ingestion/logoResolver.ts` runs the real resolver: fetch the publisher's homepage, parse every icon-shaped `<link>` in `<head>` (`icon`, `shortcut icon`, `apple-touch-icon`, `apple-touch-icon-precomposed`, `mask-icon`) plus the web app manifest's `icons` array if present, score every candidate by resolution (SVGs always win — they're infinitely scalable), download the best one, and store it under `public/logos/publishers/`. `Publisher.logoUrl` is updated to that local static path.
3. Only if that entire process fails (network error, no icons declared anywhere) does it fall back to a live favicon-aggregator URL, so publisher creation never hard-fails.

The seed data (`prisma/seed.ts`) populates publishers quickly using bundled SVGs where available and a favicon-aggregator URL otherwise — it doesn't run the full resolver, since seeding should be fast and offline-friendly. To upgrade every seeded publisher to a real, locally-downloaded logo, run:

```bash
npm run resolve-logos
```

This finds every `Publisher` row that doesn't yet have a local logo (`logoUrl` not under `/logos/`) and runs the real resolver against it. Safe to re-run — publishers that already have a local logo are skipped.

## Project structure

```
app/
  news/                /news — listing page (search, filters, sort, pagination)
    [slug]/             /news/[slug] — article detail page
  api/                  REST endpoints — news, news/[slug], publishers, topics, search
components/
  ui/                  Generic design-system primitives (Button, SearchInput, Icon)
  news/                News-specific components (table, cards, states, etc.)
ingestion/             RSS + JSON-LD ingestion pipeline (feedParser, metadataExtractor,
                       publisherRegistry, normalize, topicTagging, pipeline, sources, run)
prisma/
  schema.prisma        Publisher / NewsArticle / Topic / Bookmark / Vote models
  seed.ts               Seeds the DB from prisma/seedData.ts (200 demo articles)
  seedData.ts           Frozen seed-only fixture — not imported anywhere else
lib/
  data/                Repository layer over Prisma (getArticles, getSourcesMap, ...)
  api/                 Shared API query/serialization helpers
  prisma.ts             Prisma client singleton
  utils/               Pure helpers (sorting, search, date formatting)
types/                 Shared TypeScript types
public/fonts/          Self-hosted font files
public/logos/          Bundled brand SVGs for well-known publishers
```

## Routes

- `/news` — discovery table: search, filter chips (All/Trending/Research/Breakthroughs/Startups/Open Source/Funding), column sort, per-column topic/source filters, pagination (100/page). Category filtering via `?category=<key>` (e.g. `/news?category=robotics`).
- `/news/[slug]` — article detail page: title, source (linking to the **original article**, never the publisher homepage), published time, AI Summary, vote/share/save, comments, and a Related News / Popular Sources sidebar.

## REST API

| Endpoint | Description |
|---|---|
| `GET /api/news` | Paginated article list. Query params: `page`, `perPage` (max 100), `sort` (`date`\|`title`\|`trending`), `dir` (`asc`\|`desc`), `category`, `topic`, `publisherDomain`, `search`. |
| `GET /api/news/:slug` | A single article by slug. |
| `GET /api/publishers` | Every publisher with a live article count. `?sort=name` for alphabetical (default: most active first). |
| `GET /api/topics` | Every topic with its article count, most-used first. |
| `GET /api/search?q=...` | Search shortcut over the same article query (supports `page`/`perPage`/`sort`/`dir`). |

## Data layer

All content comes from PostgreSQL via Prisma. `lib/data/news.ts` is the repository layer the pages/components import from (`getArticles()`, `getArticleBySlug()`, `getSourcesMap()`, etc.) — it's async and Prisma-backed throughout; there is no mock data left in the runtime app. `prisma/seedData.ts` exists solely for `prisma/seed.ts` to seed demo content and is not imported by any app code.

## Deploying to Vercel

1. Provision a PostgreSQL database (Vercel Postgres, Supabase, Neon, etc.) and set `DATABASE_URL` in your Vercel project's environment variables.
2. Push this project to a Git repository (GitHub/GitLab/Bitbucket).
3. In the [Vercel dashboard](https://vercel.com/new), import the repository. Vercel auto-detects Next.js.
4. Run `npx prisma migrate deploy` (and `npm run db:seed` if you want the demo content) against your production database before or during your first deploy.
5. Deploy. Every push to your default branch redeploys automatically.

Or via the CLI, from this project's root:

```bash
npm install -g vercel
vercel login
vercel --prod
```
