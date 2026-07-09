/**
 * RSS/Atom feed parsing. Reworked from GraphOne's hn_techcrunch_pipeline.py
 * (harvest_official_company_news, which used Python's `feedparser` over a
 * list of newsroom RSS URLs) — same idea, using `rss-parser` on the Node side.
 */
import Parser from "rss-parser";
import { cleanText, stripHtml } from "./normalize";

export interface FeedEntry {
  title: string;
  link: string;
  summary: string;
  /** Raw date string as the feed reported it — normalize.ts turns this into a Date. */
  publishedRaw: string | null;
}

const parser = new Parser({ timeout: 15_000 });

/** Fetches and parses a single RSS/Atom feed URL into a flat list of entries. */
export async function parseFeed(feedUrl: string, limit = 30): Promise<FeedEntry[]> {
  const feed = await parser.parseURL(feedUrl);
  const entries: FeedEntry[] = [];

  for (const item of feed.items.slice(0, limit)) {
    const title = cleanText(item.title);
    const link = (item.link || "").trim();
    if (!title || !link) continue;

    const summary = stripHtml(item.contentSnippet || item.content || item.summary || title).slice(0, 500);

    entries.push({
      title,
      link,
      summary,
      publishedRaw: item.isoDate || item.pubDate || null,
    });
  }

  return entries;
}
