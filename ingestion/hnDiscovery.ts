/**
 * Company/product-name discovery via Hacker News' Algolia search API —
 * complementary to the RSS feeds in sources.ts, not a replacement.
 *
 * Adapted from the *technique* in GraphOne's hn_techcrunch_pipeline.py
 * (harvest_company_releases_algolia): HN submissions surface AI companies'
 * own announcements and engineering posts that a news publisher's RSS feed
 * never carries, because no journalist wrote about it. Every hit's `url` is
 * the actual linked page — the company's own post — not a Hacker News
 * discussion page, so it flows through the same ingestEntry() pipeline as
 * any RSS entry.
 *
 * Deliberately NOT ported from GraphOne: the "official company newsroom
 * only" framing that excludes news publishers, the strict ≤1-day-old
 * rejection gate, and the isOfficial/company-logo attribution — see
 * pipeline.ts for why those don't apply to this project's source-attributed
 * model.
 */
import type { FeedEntry } from "./feedParser";
import { cleanText } from "./normalize";

const ALGOLIA_SEARCH_URL = "https://hn.algolia.com/api/v1/search_by_date";
const MAX_AGE_DAYS = 3;

/** AI company/product names worth searching for on HN — not a feed URL, a discovery query. */
export const HN_DISCOVERY_QUERIES = [
  "OpenAI",
  "Anthropic",
  "DeepMind",
  "Mistral AI",
  "Hugging Face",
  "DeepSeek",
  "xAI",
  "Meta AI",
  "NVIDIA AI",
  "LLM release",
];

interface AlgoliaHit {
  title: string | null;
  url: string | null;
  created_at: string | null;
}

async function searchOneQuery(query: string): Promise<FeedEntry[]> {
  const url = `${ALGOLIA_SEARCH_URL}?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=30`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return [];
    const body = (await res.json()) as { hits?: AlgoliaHit[] };
    const cutoff = Date.now() - MAX_AGE_DAYS * 86_400_000;

    return (body.hits ?? [])
      .filter((h): h is AlgoliaHit & { title: string; url: string; created_at: string } => !!h.title && !!h.url && !!h.created_at)
      .filter((h) => !h.title.startsWith("Show HN:") && !h.title.startsWith("Ask HN:"))
      .filter((h) => new Date(h.created_at).getTime() >= cutoff)
      .map((h) => ({
        title: cleanText(h.title),
        link: h.url,
        summary: cleanText(h.title),
        publishedRaw: h.created_at,
      }));
  } catch {
    return [];
  }
}

/** Runs every discovery query in parallel and flattens/dedupes hits by link. */
export async function discoverFromHackerNews(queries: string[] = HN_DISCOVERY_QUERIES): Promise<FeedEntry[]> {
  const perQuery = await Promise.all(queries.map(searchOneQuery));
  const byLink = new Map<string, FeedEntry>();
  for (const entries of perQuery) {
    for (const entry of entries) {
      if (!byLink.has(entry.link)) byLink.set(entry.link, entry);
    }
  }
  return Array.from(byLink.values());
}
