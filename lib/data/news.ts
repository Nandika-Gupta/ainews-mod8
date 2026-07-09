import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { NewsArticle, NewsCategory, NewsFilterChip, NewsSource } from "@/types/news";
import type { NewsArticle as PrismaArticle, Publisher, Topic } from "@prisma/client";

/**
 * Repository layer over Postgres/Prisma. Every read is async and shaped to
 * match what the UI already expects (see types/news.ts), so this module is
 * the only place that changed when the mock dataset was replaced with a real
 * backend — no component call sites needed to change their own logic.
 */

type ArticleRow = PrismaArticle & { publisher: Publisher; topics: Topic[] };

/** Ranks by net votes (desc) and assigns a stable 0-100 trending score, same formula as before. */
function withTrendingScores(rows: ArticleRow[]): NewsArticle[] {
  const ranked = [...rows].sort((x, y) => y.upvotes - y.downvotes - (x.upvotes - x.downvotes));
  const scoreById = new Map<string, number>();
  const n = ranked.length;
  ranked.forEach((a, i) => {
    scoreById.set(a.id, n > 1 ? Math.round(97 - (i * (97 - 68)) / (n - 1)) : 97);
  });

  return rows.map((a) => ({
    id: a.slug,
    headline: a.title,
    dek: a.dek,
    aiSummary: a.aiSummary,
    articleUrl: a.articleUrl,
    category: a.category,
    topics: a.topics.map((t) => t.name),
    source: a.publisherId,
    hours: Math.max(0, Math.floor((Date.now() - a.publishedAt.getTime()) / 3_600_000)),
    up: a.upvotes,
    down: a.downvotes,
    filters: a.filterTags,
    score: scoreById.get(a.id) ?? 0,
  }));
}

const ARTICLE_INCLUDE = { publisher: true, topics: true } as const;

export async function getArticles(): Promise<NewsArticle[]> {
  const rows = await prisma.newsArticle.findMany({
    include: ARTICLE_INCLUDE,
    orderBy: { publishedAt: "desc" },
  });
  return withTrendingScores(rows);
}

/** Cached per-request — generateMetadata() and the page component both call this for the same slug. */
export const getArticleBySlug = cache(async (slug: string): Promise<NewsArticle | null> => {
  const row = await prisma.newsArticle.findUnique({ where: { slug }, include: ARTICLE_INCLUDE });
  if (!row) return null;
  return withTrendingScores([row])[0];
});

export async function getRelatedArticles(article: NewsArticle, limit = 4): Promise<NewsArticle[]> {
  const rows = await prisma.newsArticle.findMany({
    where: {
      slug: { not: article.id },
      OR: [{ category: article.category }, { topics: { some: { name: { in: article.topics } } } }],
    },
    include: ARTICLE_INCLUDE,
    orderBy: { publishedAt: "desc" },
    take: limit,
  });

  if (rows.length > 0) return withTrendingScores(rows);

  // Fallback: no category/topic overlap found — just show recent stories.
  const fallbackRows = await prisma.newsArticle.findMany({
    where: { slug: { not: article.id } },
    include: ARTICLE_INCLUDE,
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
  return withTrendingScores(fallbackRows);
}

/**
 * Only the most recently published slugs — used to pre-warm generateStaticParams
 * for /news/[slug]. Deliberately NOT every article: with live cron ingestion
 * adding articles continuously, pre-rendering the entire table at build time
 * both floods the DB connection pool during `next build` (hundreds of
 * concurrent queries against a pooled connection with a small connection
 * limit) and doesn't scale — new articles ingested after a deploy need a page
 * regardless, which is what dynamicParams (ISR) handles for the rest.
 */
export async function getRecentSlugs(limit = 40): Promise<string[]> {
  const rows = await prisma.newsArticle.findMany({
    select: { slug: true },
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
  return rows.map((r) => r.slug);
}

// ---- Reference/lookup data — all Prisma-backed now. ----

/** Sources map keyed by Publisher id, matching NewsArticle.source — the shape every component already expects. */
export async function getSourcesMap(): Promise<Record<string, NewsSource>> {
  const publishers = await prisma.publisher.findMany();
  return Object.fromEntries(
    publishers.map((p) => [
      p.id,
      { name: p.name, domain: p.domain, color: p.colorHex ?? "#8B8FA3", followers: p.followersLabel ?? "", logoUrl: p.logoUrl },
    ])
  );
}

export async function getCategories(): Promise<NewsCategory[]> {
  const grouped = await prisma.newsArticle.groupBy({ by: ["category"], _count: { category: true } });
  return grouped
    .sort((a, b) => b._count.category - a._count.category)
    .map((g) => ({ key: g.category, label: labelizeCategory(g.category), count: g._count.category }));
}

function labelizeCategory(key: string): string {
  const known: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google",
    meta: "Meta",
    microsoft: "Microsoft",
    research: "Research",
    robotics: "Robotics",
    agents: "Agents",
    funding: "Funding",
    opensource: "Open Source",
  };
  return known[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

/** Fixed UI vocabulary for the filter-chip row — a business rule, not article content, so it stays a constant. */
export function getFilterChips(): NewsFilterChip[] {
  return [
    { id: "all", label: "All News" },
    { id: "trending", label: "Trending" },
    { id: "research", label: "Research" },
    { id: "breakthroughs", label: "Breakthroughs" },
    { id: "startups", label: "Startups" },
    { id: "opensource", label: "Open Source" },
    { id: "funding", label: "Funding" },
  ];
}

/** Top 5 publishers by article count — a real popularity signal instead of a hardcoded list. */
export async function getPopularSources(): Promise<string[]> {
  const publishers = await prisma.publisher.findMany({
    include: { _count: { select: { articles: true } } },
    orderBy: { articles: { _count: "desc" } },
    take: 5,
  });
  return publishers.map((p) => p.id);
}
