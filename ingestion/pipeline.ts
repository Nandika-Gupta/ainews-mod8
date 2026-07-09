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
async function enrichFromArticlePage(articleUrl: string): Promise<{ publishedAt: Date | null; description: string | null; bodyExcerpt: string | null }> {
  try {
    const res = await fetch(articleUrl, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return { publishedAt: null, description: null, bodyExcerpt: null };
    const html = await res.text();
    const meta = extractArticleMetadata(html);
    return {
      publishedAt: robustParseDate(meta.datePublished),
      description: meta.description,
      bodyExcerpt: meta.bodyExcerpt,
    };
  } catch {
    return { publishedAt: null, description: null, bodyExcerpt: null };
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

/**
 * Domains that are never a valid news source regardless of which feed or
 * discovery mechanism surfaced them — a video/social-post URL isn't a
 * published article, even when Hacker News discovery (see hnDiscovery.ts)
 * surfaces one as a "story" link.
 */
const BLOCKED_DOMAINS = new Set(["youtube.com"]);

interface PreparedEntry {
  entry: FeedEntry;
  articleUrl: string;
  domain: string;
  title: string;
  summary: string;
  bodyExcerpt: string | null;
  publishedAt: Date;
  nameHint: string | null;
}

type PrepareOutcome = { kind: "prepared"; data: PreparedEntry } | { kind: "duplicate" | "near-duplicate" | "not-relevant" | "invalid" };

/**
 * Fast, sequential-safe checks + real-content gathering — validation,
 * exact-URL/near-duplicate-title dedup, and enrichment, but no LLM call and
 * no DB write. Must stay sequential (entry N's checks complete before entry
 * N+1's) so two entries can't race on the near-duplicate-title index; the
 * slow LLM step is deliberately NOT here — see summarizePrepared() below,
 * which is safe to run concurrently since it touches no shared/DB state.
 */
async function prepareEntry(entry: FeedEntry, source: FeedSource, titleIndex: RecentTitleIndex, seenInBatch: Set<string>): Promise<PrepareOutcome> {
  const articleUrl = normalizeUrl(entry.link);
  if (!articleUrl) return { kind: "invalid" };
  if (seenInBatch.has(articleUrl)) return { kind: "duplicate" };

  const domain = domainFromUrl(articleUrl);
  if (!domain) return { kind: "invalid" };
  if (BLOCKED_DOMAINS.has(domain)) return { kind: "invalid" };

  if (!source.aiOnly && !isAiRelevant(entry.title, entry.summary)) {
    return { kind: "not-relevant" };
  }

  const existing = await prisma.newsArticle.findUnique({ where: { articleUrl } });
  if (existing) return { kind: "duplicate" };

  const title = cleanText(entry.title);
  if (isNearDuplicateTitle(titleIndex, title)) return { kind: "near-duplicate" };

  let publishedAt = robustParseDate(entry.publishedRaw);
  let summary = entry.summary;
  let bodyExcerpt: string | null = null;
  if (!publishedAt || !summary) {
    const enriched = await enrichFromArticlePage(articleUrl);
    publishedAt = publishedAt ?? enriched.publishedAt ?? new Date();
    if (!summary && enriched.description) summary = enriched.description;
    bodyExcerpt = enriched.bodyExcerpt;
  }

  // "discovery" sources (e.g. Hacker News — see hnDiscovery.ts) link to
  // arbitrary other sites, so their own `name` describes the discovery
  // mechanism, not the linked publisher — never use it as a name hint. Real
  // feed sources link back to their own site, so `name` is a safe hint for
  // a newly-discovered domain.
  const nameHint = source.kind === "discovery" ? null : source.name;

  seenInBatch.add(articleUrl);
  recordTitle(titleIndex, title);

  return {
    kind: "prepared",
    data: { entry, articleUrl, domain, title, summary, bodyExcerpt, publishedAt: publishedAt ?? new Date(), nameHint },
  };
}

/**
 * The slow part — a real LLM call — run concurrently across many prepared
 * entries (see SUMMARY_CONCURRENCY below). Fallback chain: LLM summary ->
 * raw RSS/OG description -> article body excerpt -> a plainly-labeled "no
 * summary" string. The title is NEVER used as a stand-in summary — feeding a
 * title-only "description" to the LLM invites it to hallucinate
 * plausible-sounding but unverified details (confirmed live), so the LLM is
 * only called when there's real source text that isn't just the headline
 * again.
 */
async function summarizePrepared(p: PreparedEntry): Promise<string> {
  const realContent = (p.summary || p.bodyExcerpt || "").trim();
  const hasRealContent = realContent.length > 0 && realContent !== p.title.trim();
  const llmSummary = hasRealContent ? await generateAiSummary(p.title, realContent) : null;
  return llmSummary || p.summary || p.bodyExcerpt || "No summary available for this article.";
}

/** Sequential DB write, in original entry order — the only phase that touches Publisher/slug/create, so no race risk even though phase 2 (summarization) ran concurrently. */
async function finalizePrepared(p: PreparedEntry, aiSummary: string, source: FeedSource): Promise<void> {
  const publisher = await resolvePublisher(p.domain, p.nameHint);
  const slug = await uniqueSlug(p.title);
  const topics = deriveTopics(p.entry.title, p.summary);
  const dek = p.summary || p.bodyExcerpt || "No summary available for this article.";

  await prisma.newsArticle.create({
    data: {
      slug,
      title: p.title,
      dek,
      aiSummary,
      articleUrl: p.articleUrl,
      publisherId: publisher.id,
      category: source.category,
      filterTags: [],
      publishedAt: p.publishedAt,
      topics: {
        connectOrCreate: topics.map((name) => ({ where: { name }, create: { name } })),
      },
    },
  });
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

const SUMMARY_CONCURRENCY = 4;

/**
 * Three phases per source: (1) sequential validation/dedup/enrichment — the
 * only phase that must stay serial, so concurrent entries can't race on the
 * near-duplicate-title index; (2) concurrent LLM summarization — the slow
 * part (sequential retries/backoffs across 200+ articles were the direct
 * cause of a 19+ minute GitHub Actions run), safe to parallelize since it
 * touches no shared state; (3) sequential DB writes, original order.
 */
async function ingestEntries(entries: FeedEntry[], source: FeedSource, titleIndex: RecentTitleIndex): Promise<PipelineResult> {
  const result = newPipelineResult(source.name);
  result.fetched = entries.length;
  const seenInBatch = new Set<string>();

  const prepared: PreparedEntry[] = [];
  for (const entry of entries) {
    try {
      const outcome = await prepareEntry(entry, source, titleIndex, seenInBatch);
      if (outcome.kind === "prepared") prepared.push(outcome.data);
      else if (outcome.kind === "duplicate") result.skippedDuplicate++;
      else if (outcome.kind === "near-duplicate") result.skippedNearDuplicate++;
      else if (outcome.kind === "not-relevant") result.skippedNotAiRelevant++;
      else result.skippedInvalid++;
    } catch (err) {
      result.errors.push(`"${entry.title}": ${(err as Error).message}`);
    }
  }

  const summaries = await mapWithConcurrency(prepared, SUMMARY_CONCURRENCY, async (p) => {
    try {
      return await summarizePrepared(p);
    } catch (err) {
      result.errors.push(`"${p.title}" (summarization): ${(err as Error).message}`);
      return p.summary || p.bodyExcerpt || "No summary available for this article.";
    }
  });

  for (let i = 0; i < prepared.length; i++) {
    try {
      await finalizePrepared(prepared[i], summaries[i], source);
      result.created++;
    } catch (err) {
      result.errors.push(`"${prepared[i].title}": ${(err as Error).message}`);
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
