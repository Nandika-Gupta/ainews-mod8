/**
 * Keeps the live NewsArticle table bounded — running unbounded on a cron
 * makes every ingest slower (near-duplicate title check scans a growing
 * window, more publishers to resolve logos for) and the deployed app
 * heavier for no real benefit, since a news aggregator's value is in recent
 * coverage, not an ever-growing archive. Called at the end of every
 * ingestion run (see run.ts) — deletes the oldest articles beyond the cap,
 * by publishedAt, along with their dependent Bookmark/Vote rows. Publisher
 * and Topic rows are never touched.
 */
import { prisma } from "../lib/prisma";

export async function pruneToMostRecent(keep = 200): Promise<number> {
  const idsToDelete = await prisma.newsArticle.findMany({
    orderBy: { publishedAt: "desc" },
    skip: keep,
    select: { id: true },
  });
  const ids = idsToDelete.map((r) => r.id);
  if (ids.length === 0) return 0;

  await prisma.$transaction([
    prisma.vote.deleteMany({ where: { articleId: { in: ids } } }),
    prisma.bookmark.deleteMany({ where: { articleId: { in: ids } } }),
    prisma.newsArticle.deleteMany({ where: { id: { in: ids } } }),
  ]);

  return ids.length;
}
