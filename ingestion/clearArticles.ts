/**
 * Wipes NewsArticle (and its dependent Bookmark/Vote rows) while keeping
 * Publisher and Topic rows intact, since real ingested articles already
 * reference them. Used to clear the 200 synthetic seed articles (which have
 * fake, non-resolving articleUrls) before launch — re-run `npm run ingest`
 * afterward to repopulate with real content.
 *
 * Usage: npx tsx ingestion/clearArticles.ts
 */
import { prisma } from "../lib/prisma";

async function main() {
  const before = await prisma.newsArticle.count();

  const [votes, bookmarks, articles] = await prisma.$transaction([
    prisma.vote.deleteMany({}),
    prisma.bookmark.deleteMany({}),
    prisma.newsArticle.deleteMany({}),
  ]);

  console.log(`Deleted ${articles.count} article(s) (${before} before), ${bookmarks.count} bookmark(s), ${votes.count} vote(s).`);
  console.log("Publisher and Topic rows were left untouched.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
