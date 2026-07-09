/**
 * Structured-metadata extraction from a single article page's HTML — used
 * as a fallback when a publisher has no RSS feed, or to fill in gaps an RSS
 * entry didn't have (e.g. a missing publish date).
 *
 * Reworked from the JSON-LD extraction *technique* demonstrated in GraphOne's
 * tests/test_extraction.py (an `Extractor` class that parses
 * `<script type="application/ld+json">` blocks for `schema.org/Product`
 * data). Same technique, retargeted at `schema.org/NewsArticle` fields
 * (headline, datePublished, author, publisher.name/logo), with OpenGraph
 * meta tags as a second-tier fallback when a page has no JSON-LD at all.
 */
import * as cheerio from "cheerio";
import { cleanText } from "./normalize";

export interface ExtractedArticleMetadata {
  headline: string | null;
  description: string | null;
  datePublished: string | null;
  authorName: string | null;
  publisherName: string | null;
  publisherLogoUrl: string | null;
  imageUrl: string | null;
}

function firstOf<T>(value: T | T[] | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Parses every JSON-LD block on the page and returns the first NewsArticle-shaped one. */
function extractJsonLd(html: string): Record<string, unknown> | null {
  const $ = cheerio.load(html);
  const blocks = $('script[type="application/ld+json"]');

  for (const el of blocks.toArray()) {
    const raw = $(el).contents().text();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      for (const candidate of candidates) {
        const graph = (candidate as { "@graph"?: unknown[] })["@graph"];
        const pool = graph && Array.isArray(graph) ? graph : [candidate];
        for (const item of pool) {
          const type = (item as { "@type"?: string | string[] })["@type"];
          const types = Array.isArray(type) ? type : [type];
          if (types.some((t) => typeof t === "string" && /NewsArticle|Article|BlogPosting/i.test(t))) {
            return item as Record<string, unknown>;
          }
        }
      }
    } catch {
      // malformed JSON-LD on the page — skip this block, try the next one
      continue;
    }
  }
  return null;
}

function extractOpenGraph(html: string): Record<string, string> {
  const $ = cheerio.load(html);
  const og: Record<string, string> = {};
  $("meta[property^='og:'], meta[name^='article:'], meta[name='description']").each((_, el) => {
    const key = $(el).attr("property") || $(el).attr("name");
    const value = $(el).attr("content");
    if (key && value) og[key] = value;
  });
  return og;
}

export function extractArticleMetadata(html: string): ExtractedArticleMetadata {
  const jsonLd = extractJsonLd(html);
  const og = extractOpenGraph(html);

  const authorField = jsonLd?.author as { name?: string } | { name?: string }[] | string | undefined;
  const author = firstOf(Array.isArray(authorField) ? authorField : authorField ? [authorField] : []);
  const authorName = typeof author === "string" ? author : author?.name ?? null;

  const publisherField = jsonLd?.publisher as { name?: string; logo?: { url?: string } | string } | undefined;
  const publisherLogo =
    typeof publisherField?.logo === "string" ? publisherField.logo : publisherField?.logo?.url ?? null;

  return {
    headline: cleanText((jsonLd?.headline as string) || og["og:title"]) || null,
    description: cleanText((jsonLd?.description as string) || og["og:description"] || og["description"]) || null,
    datePublished: (jsonLd?.datePublished as string) || og["article:published_time"] || null,
    authorName: authorName ? cleanText(authorName) : null,
    publisherName: publisherField?.name ? cleanText(publisherField.name) : og["og:site_name"] || null,
    publisherLogoUrl: publisherLogo,
    imageUrl: (jsonLd?.image as string) || og["og:image"] || null,
  };
}
