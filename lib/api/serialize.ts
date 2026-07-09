import type { NewsArticle, Publisher, Topic } from "@prisma/client";

export type ArticleWithRelations = NewsArticle & { publisher: Publisher; topics: Topic[] };

export function serializePublisher(p: Publisher) {
  return {
    id: p.id,
    name: p.name,
    domain: p.domain,
    website: p.website,
    logoUrl: p.logoUrl,
    faviconUrl: p.faviconUrl,
    colorHex: p.colorHex,
    followersLabel: p.followersLabel,
    credibilityScore: p.credibilityScore,
  };
}

/**
 * Public article shape. `source` links to the ORIGINAL article at the
 * publisher (articleUrl) — never the publisher's homepage (publisher.website).
 */
export function serializeArticle(a: ArticleWithRelations) {
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    dek: a.dek,
    aiSummary: a.aiSummary,
    articleUrl: a.articleUrl,
    category: a.category,
    filterTags: a.filterTags,
    topics: a.topics.map((t) => t.name),
    publishedAt: a.publishedAt.toISOString(),
    upvotes: a.upvotes,
    downvotes: a.downvotes,
    publisher: serializePublisher(a.publisher),
  };
}
