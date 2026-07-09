/**
 * Orchestrator: fetch a feed -> parse entries -> normalize -> resolve
 * publisher -> upsert NewsArticle, deduplicated by canonical articleUrl (and,
 * within a single run, by fuzzy title match across publishers — see
 * RecentTitleIndex below).
 *
 * This replaces GraphOne's filter_and_push()/submit_news() combo, minus the
 * company-logo attribution it did (see publisherRegistry.ts) and minus the
 * hard "must be ≤1 day old" gate (is_valid_news) — freshness here is a sort
 * concern, not a rejection rule.
 */
import { prisma } from "../lib/prisma";
import { parseFeed, type FeedEntry } from "./feedParser";
import { normalizeUrl, domainFromUrl, robustParseDate, slugify, cleanText, titleTokens, titleSimilarity } from "./normalize";
import { resolvePublisher } from "./publisherRegistry";
import { deriveTopics, isAiRelevant } from "./topicTagging";
import { extractArticleMetadata } from "./metadataExtractor";
import { discoverFromHackerNews } from "./hnDiscovery";
import { generateAiSummary } from "./llmSummarizer";
import type { FeedSource } from "./sources";

/**
 * Feeds don't always carry a reliable pubDate — and Hacker-News-discovered
 * entries (see hnDiscovery.ts) don't carry a real description at all. Rather
 * than guess, fetch the article page itself and pull `datePublished`/
 * description straight from its JSON-LD or OpenGraph metadata — the same
 * technique GraphOne's tests demonstrated for schema.org/Product, retargeted
 * at NewsArticle.
 */
async function enrichFromArticlePage(articleUrl: string): Promise<{ publishedAt: Date | null; description: string | null }> {
  try {
    const res = await fetch(articleUrl, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return { publishedAt: null, description: null };
    const html = await res.text();
    const meta = extractArticleMetadata(html);
    return {
      publishedAt: robustParseDate(meta.datePublished),
      description: meta.description,
    };
  } catch {
    return { publishedAt: null, description: null };
  }
}

export interface PipelineResult {
  source: string;
  fetched: number;
  created: number;
  skippedDuplicate: number;
  skippedNearDuplicate: number;
  skippedNotAiRelevant: number;
  skippedInvalid: number;
  errors: string[];
}

/**
 * In-memory index of recently-published titles (last 48h), used to catch
 * the same story reported by two different publishers under different
 * headlines and URLs — exact-articleUrl dedup alone misses this once
 * multiple overlapping feeds are in play. Shared across a whole ingestAll()
 * run (including concurrent sources) so cross-source duplicates within a
 * single run are caught too, not just duplicates against DB history.
 *
 * Adapted from the *technique* in GraphOne's deduplication.py
 * (DeduplicationEngine.dedupe_events, fuzzy string similarity) — reimplemented
 * as Jaccard similarity over word-token sets rather than porting their
 * SequenceMatcher-based implementation.
 */
export interface RecentTitleIndex {
  tokensByTitle: { title: string; tokens: Set<string> }[];
}

const NEAR_DUPLICATE_THRESHOLD = 0.6;
const RECENT_TITLE_WINDOW_MS = 48 * 60 * 60 * 1000;

export async function loadRecentTitleIndex(): Promise<RecentTitleIndex> {
  const rows = await prisma.newsArticle.findMany({
    where: { publishedAt: { gte: new Date(Date.now() - RECENT_TITLE_WINDOW_MS) } },
    select: { title: true },
    take: 1000,
  });
  return { tokensByTitle: rows.map((r) => ({ title: r.title, tokens: titleTokens(r.title) })) };
}

function isNearDuplicateTitle(index: RecentTitleIndex, title: string): boolean {
  const tokens = titleTokens(title);
  return index.tokensByTitle.some((entry) => titleSimilarity(tokens, entry.tokens) >= NEAR_DUPLICATE_THRESHOLD);
}

function recordTitle(index: RecentTitleIndex, title: string): void {
  index.tokensByTitle.push({ title, tokens: titleTokens(title) });
}

async function uniqueSlug(base: string): Promise<string> {
  const slug = slugify(base);
  const existing = await prisma.newsArticle.findUnique({ where: { slug } });
  if (!existing) return slug;
  // Collision (two different articles produced the same slug) — suffix with
  // a short piece of the current time so it stays stable enough to dedupe on
  // articleUrl while still being unique.
  return `${slug}-${Date.now().toString(36).slice(-5)}`;
}

async function ingestEntry(
  entry: FeedEntry,
  source: FeedSource,
  titleIndex: RecentTitleIndex
): Promise<"created" | "duplicate" | "near-duplicate" | "not-relevant" | "invalid"> {
  const articleUrl = normalizeUrl(entry.link);
  if (!articleUrl) return "invalid";

  const domain = domainFromUrl(articleUrl);
  if (!domain) return "invalid";

  if (!source.aiOnly && !isAiRelevant(entry.title, entry.summary)) {
    return "not-relevant";
  }

  const existing = await prisma.newsArticle.findUnique({ where: { articleUrl } });
  if (existing) return "duplicate";

  const title = cleanText(entry.title);
  if (isNearDuplicateTitle(titleIndex, title)) return "near-duplicate";

  let publishedAt = robustParseDate(entry.publishedRaw);
  let summary = entry.summary;
  if (!publishedAt || !summary) {
    const enriched = await enrichFromArticlePage(articleUrl);
    publishedAt = publishedAt ?? enriched.publishedAt ?? new Date();
    if (!summary && enriched.description) summary = enriched.description;
  }

  // "discovery" sources (e.g. Hacker News — see hnDiscovery.ts) link to
  // arbitrary other sites, so their own `name` describes the discovery
  // mechanism, not the linked publisher — never use it as a name hint. Real
  // feed sources link back to their own site, so `name` is a safe hint for
  // a newly-discovered domain.
  const nameHint = source.kind === "discovery" ? null : source.name;
  const publisher = await resolvePublisher(domain, nameHint);
  const slug = await uniqueSlug(title);
  const topics = deriveTopics(entry.title, summary);

  // Real LLM summary via the free-tier waterfall (see llmSummarizer.ts) —
  // never blocks or fails ingestion: generateAiSummary() returns null on any
  // failure (missing keys, all three tiers down, bad response), and the raw
  // RSS/OpenGraph description is used as-is when that happens.
  const aiSummary = (await generateAiSummary(title, summary)) ?? summary;

  await prisma.newsArticle.create({
    data: {
      slug,
      title,
      dek: summary,
      aiSummary,
      articleUrl,
      publisherId: publisher.id,
      category: source.category,
      filterTags: [],
      publishedAt,
      topics: {
        connectOrCreate: topics.map((name) => ({ where: { name }, create: { name } })),
      },
    },
  });

  recordTitle(titleIndex, title);
  return "created";
}

function newPipelineResult(source: string): PipelineResult {
  return {
    source,
    fetched: 0,
    created: 0,
    skippedDuplicate: 0,
    skippedNearDuplicate: 0,
    skippedNotAiRelevant: 0,
    skippedInvalid: 0,
    errors: [],
  };
}

/** Runs every entry through ingestEntry sequentially — entries within one source stay serial so the exact-URL/slug dedup checks can't race against each other. */
async function ingestEntries(entries: FeedEntry[], source: FeedSource, titleIndex: RecentTitleIndex): Promise<PipelineResult> {
  const result = newPipelineResult(source.name);
  result.fetched = entries.length;

  for (const entry of entries) {
    try {
      const outcome = await ingestEntry(entry, source, titleIndex);
      if (outcome === "created") result.created++;
      else if (outcome === "duplicate") result.skippedDuplicate++;
      else if (outcome === "near-duplicate") result.skippedNearDuplicate++;
      else if (outcome === "not-relevant") result.skippedNotAiRelevant++;
      else result.skippedInvalid++;
    } catch (err) {
      result.errors.push(`"${entry.title}": ${(err as Error).message}`);
    }
  }

  return result;
}

export async function ingestSource(source: FeedSource, limit = 30, titleIndex?: RecentTitleIndex): Promise<PipelineResult> {
  const index = titleIndex ?? (await loadRecentTitleIndex());

  let entries: FeedEntry[];
  try {
    entries = await parseFeed(source.feedUrl, limit);
  } catch (err) {
    const result = newPipelineResult(source.name);
    result.errors.push(`feed fetch failed: ${(err as Error).message}`);
    return result;
  }

  return ingestEntries(entries, source, index);
}

/**
 * A synthetic "source" for Hacker-News-discovered entries — not a real feed
 * (feedUrl unused), just the display name/category/aiOnly-gate ingestEntry
 * needs. aiOnly is false because a query like "NVIDIA AI" can surface
 * hits with no real AI relevance, so every hit still passes through the
 * same isAiRelevant() gate a general RSS feed would.
 */
const HN_DISCOVERY_SOURCE: FeedSource = {
  name: "Hacker News Discovery",
  feedUrl: "",
  category: "research",
  aiOnly: false,
  kind: "discovery",
};

/** Discovers AI company announcements via Hacker News (see hnDiscovery.ts) and runs them through the same ingest path as an RSS source. */
export async function ingestHackerNewsDiscovery(titleIndex?: RecentTitleIndex): Promise<PipelineResult> {
  const index = titleIndex ?? (await loadRecentTitleIndex());

  let entries: FeedEntry[];
  try {
    entries = await discoverFromHackerNews();
  } catch (err) {
    const result = newPipelineResult(HN_DISCOVERY_SOURCE.name);
    result.errors.push(`HN discovery failed: ${(err as Error).message}`);
    return result;
  }

  return ingestEntries(entries, HN_DISCOVERY_SOURCE, index);
}

/** Runs a bounded number of async jobs concurrently — mirrors the semaphore-bounded fetching GraphOne's crawler.py does, sized conservatively so we don't hammer 19+ independent publisher domains at once. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

const SOURCE_CONCURRENCY = 4;

export async function ingestAll(sources: FeedSource[], limit = 30, titleIndex?: RecentTitleIndex): Promise<PipelineResult[]> {
  const index = titleIndex ?? (await loadRecentTitleIndex());
  return mapWithConcurrency(sources, SOURCE_CONCURRENCY, (source) => ingestSource(source, limit, index));
}
