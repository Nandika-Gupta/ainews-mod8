# Module 8 - AI News

A news discovery module for AI news — a searchable, filterable, sortable listing table plus an article detail page with an AI-generated summary, comments, and a Popular Sources / Related News sidebar. Dark UI with a purple accent, real publisher logos. Runs on a real Postgres database via Prisma, with a REST API and a standalone RSS ingestion pipeline behind it — nothing on the page is mock data.

## Features

- **News Listing** — search, column sorting, per-column source/topic filters, pagination
- **News Details** — full article view with AI summary, source link (routes to the original article, not the publisher homepage), vote/share/save, and a comment box
- **Trending News** — surfaces what's actually been published in the last 48 hours
- **Latest News** — default chronological feed, newest first
- **News Categories / Topics** — dynamic filter chips based on real topic volume, not a hardcoded list
- **Related News** and **Popular Sources** sidebar (Popular Sources links out to the publisher's homepage — the one place that's intentionally different from the article-level source links)
- **Bookmarking** — save articles for later
- Real publisher logos, resolved once per publisher and cached locally (no live logo fetching on every page load)
- Automated ingestion — RSS feeds plus a Hacker News discovery pass, crawled on a schedule, with AI summaries generated through a free-tier Gemini → Groq → Pollinations waterfall

## Tech stack

- **Next.js 15** (App Router) + **TypeScript** (strict mode) + **Tailwind CSS**
- **PostgreSQL** + **Prisma 5** — `Publisher`, `NewsArticle`, `Topic`, `Bookmark`, `Vote` models
- REST API (`/api/news`, `/api/news/:slug`, `/api/publishers`, `/api/topics`, `/api/search`)
- A modular ingestion pipeline (`ingestion/`) that parses RSS feeds and JSON-LD/OpenGraph article metadata into the database, with LLM-generated summaries
- Self-hosted fonts, no external font CDN dependency

## Running it locally

You'll need Postgres 14+ (local install, Docker, or a hosted one like Supabase/Neon).

```bash
npm install
cp .env.example .env   # then fill in DATABASE_URL (and DIRECT_URL if using a pooled connection)
npx prisma migrate dev
npm run db:seed        # seeds ~21 publishers + 200 demo articles so there's something to look at
npm run dev
```

Open http://localhost:3000 — it redirects to `/news`.

If things look stale or broken after pulling new changes:

```bash
rm -rf .next   # Windows: rmdir /s /q .next
npm run dev
```

Production build: `npm run build && npm start`

## Pulling in real news

The seed data is just a placeholder so the app isn't empty on first run. To actually crawl real articles:

```bash
npm run ingest
```

This runs `ingestion/run.ts` against whatever's configured in `ingestion/sources.ts`, plus a Hacker News front-page discovery pass for AI-relevant stories that RSS feeds miss. Per entry, it:

1. Fetches and parses the RSS/Atom feed (or, for Hacker News, the current front page).
2. Normalizes the URL, publish date, and text, and rejects known non-article sources (e.g. `youtube.com`).
3. Filters out anything not AI-relevant on general feeds (feeds already marked `aiOnly: true` skip this check).
4. If the feed description is missing or too thin to summarize well, fetches the article page directly and pulls a description from JSON-LD (`schema.org/NewsArticle`)/OpenGraph tags, or a body-text excerpt as a last resort.
5. Resolves the `Publisher` by domain — see "Publisher logos" below for how the logo gets sourced.
6. Generates a real AI summary via the Gemini → Groq → Pollinations waterfall (see `ingestion/llmSummarizer.ts`), each tier paced to stay under its real free-tier rate limit. Falls back to the raw feed description/body excerpt if every tier fails; if there's no real source text at all, the entry is skipped rather than stored with a placeholder summary.
7. Deduplicates by canonical URL and by near-duplicate title (catches the same story reported under a different headline/URL by a different publisher), then upserts. Safe to re-run — already-seen articles are skipped.
8. Prunes the table down to the 200 most recent articles, so the database doesn't grow forever.

There's no persistent worker bundled — it's a one-shot batch script by design, meant to be triggered on a schedule externally. This project uses a GitHub Actions cron (`.github/workflows/ingest.yml`, currently every 8 hours), since Vercel's serverless functions can't do persistent filesystem writes or long-running crawls. Add feeds by editing `ingestion/sources.ts` — publisher feed paths do drift over time, so check a new one actually resolves before trusting it.

## Publisher logos

Each publisher's logo gets resolved exactly once, the first time that domain shows up, and reused from then on — nothing is fetched live per page view:

1. If it's a well-known publisher with a hand-bundled brand SVG (`public/logos/`, see `lib/data/sourceLogos.ts`), that's used directly.
2. Otherwise `ingestion/logoResolver.ts` does the real work: fetch the publisher's homepage, parse every icon-shaped `<link>` in `<head>` (`icon`, `shortcut icon`, `apple-touch-icon`, etc.) plus the web manifest's `icons` array, score every candidate by resolution (SVG always wins), download the best one, and store it under `public/logos/publishers/`.
3. If that whole process fails (bot protection, no icons declared, etc.), it falls back to a live favicon-aggregator URL rather than blocking publisher creation.

To upgrade any seeded publisher to a real downloaded logo:

```bash
npm run resolve-logos
```

Safe to re-run — anything that already has a local logo gets skipped.

## Project layout

```
app/
  news/                /news listing page
    [slug]/             /news/[slug] article detail page
  api/                  REST endpoints
components/
  ui/                  generic design-system pieces (Button, SearchInput, Icon)
  news/                news-specific components
ingestion/             RSS + JSON-LD pipeline, LLM summarizer, logo resolver
prisma/
  schema.prisma
  seed.ts / seedData.ts
lib/
  data/                repository layer over Prisma
  api/                 shared API helpers
  prisma.ts
  utils/
types/
public/fonts/
public/logos/
```

## REST API

| Endpoint | Description |
|---|---|
| `GET /api/news` | Paginated article list — `page`, `perPage` (max 100), `sort` (`date`\|`title`\|`trending`), `dir`, `category`, `topic`, `publisherDomain`, `search` |
| `GET /api/news/:slug` | Single article |
| `GET /api/publishers` | All publishers with article counts |
| `GET /api/topics` | All topics with article counts |
| `GET /api/search?q=...` | Search shortcut over the same query |

## Deploying

1. Provision Postgres (Supabase/Neon/Vercel Postgres) and set `DATABASE_URL` (+ `DIRECT_URL` if pooled) in Vercel's env vars. If your database and Vercel deployment end up in different regions, pin Vercel's region to match in `vercel.json` — a mismatch there is a real, noticeable source of slow page loads.
2. Push to GitHub, import into Vercel.
3. Run `npx prisma migrate deploy` against production before/during first deploy.
4. Add `GEMINI_API_KEY` / `GROQ_API_KEY` to Vercel env vars for the full 3-tier summary waterfall. Both are optional — without them, summaries still generate through Pollinations.ai, just skipping the first two tiers.
5. Set up the GitHub Actions ingestion cron with its own repo secrets (`DATABASE_URL`, `GEMINI_API_KEY`, `GROQ_API_KEY`) — separate from Vercel's env vars.
6. Every push to the default branch auto-redeploys.
