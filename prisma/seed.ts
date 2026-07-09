/**
 * Seeds Postgres from the project's existing sample dataset (data/news.ts) so
 * the app has real content to render immediately on the new Prisma-backed
 * stack. This is demo/seed content, not live-crawled news — the ingestion/
 * pipeline (see ingestion/pipeline.ts) is what populates real articles going
 * forward.
 */
import { PrismaClient } from "@prisma/client";
import { ARTICLES, SOURCES } from "./seedData";
import { SOURCE_LOGOS } from "../lib/data/sourceLogos";

const prisma = new PrismaClient();

/**
 * Publisher logo resolution, run once at seed/ingest time and cached in the
 * DB — mirrors what a real "new publisher discovered" event does in
 * ingestion/publisherRegistry.ts (see resolveLogo there for the live version).
 */
function resolveSeedLogo(sourceKey: string, domain: string): string {
  const bundled = SOURCE_LOGOS[sourceKey];
  if (bundled) return `/logos/${bundled}`;
  // No bundled asset for this publisher — fall back to a favicon aggregator
  // URL. Resolved once here and stored, never re-fetched per request.
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

async function seedPublishers(): Promise<Record<string, string>> {
  const idBySourceKey: Record<string, string> = {};

  for (const [sourceKey, source] of Object.entries(SOURCES)) {
    const publisher = await prisma.publisher.upsert({
      where: { domain: source.domain },
      update: {
        name: source.name,
        website: `https://${source.domain}`,
        logoUrl: resolveSeedLogo(sourceKey, source.domain),
        colorHex: source.color,
        followersLabel: source.followers,
      },
      create: {
        name: source.name,
        domain: source.domain,
        website: `https://${source.domain}`,
        logoUrl: resolveSeedLogo(sourceKey, source.domain),
        colorHex: source.color,
        followersLabel: source.followers,
        credibilityScore: 0.85,
      },
    });
    idBySourceKey[sourceKey] = publisher.id;
  }

  console.log(`Seeded ${Object.keys(idBySourceKey).length} publishers.`);
  return idBySourceKey;
}

/** Converts the mock dataset's "N hours ago" integer into a real timestamp. */
function hoursAgoToDate(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

/** Same derivation the frontend used for the AI Summary before there was a real field for it. */
function deriveAiSummary(dek: string, body: string[]): string {
  return [dek, ...body.slice(0, 2)].join(" ");
}

async function seedArticles(publisherIdBySourceKey: Record<string, string>) {
  let created = 0;
  let skipped = 0;

  for (const article of ARTICLES) {
    const publisherId = publisherIdBySourceKey[article.source];
    if (!publisherId) {
      console.warn(`Skipping "${article.id}" — unknown source key "${article.source}"`);
      skipped++;
      continue;
    }

    const domain = SOURCES[article.source].domain;
    const articleUrl = `https://${domain}/${article.id}`;

    await prisma.newsArticle.upsert({
      where: { slug: article.id },
      update: {},
      create: {
        slug: article.id,
        title: article.headline,
        dek: article.dek,
        aiSummary: deriveAiSummary(article.dek, article.body),
        articleUrl,
        publisherId,
        category: article.category,
        filterTags: article.filters,
        publishedAt: hoursAgoToDate(article.hours),
        upvotes: article.up,
        downvotes: article.down,
        topics: {
          connectOrCreate: article.topics.map((name) => ({
            where: { name },
            create: { name },
          })),
        },
      },
    });
    created++;
  }

  console.log(`Seeded ${created} articles (${skipped} skipped).`);
}

async function main() {
  const publisherIdBySourceKey = await seedPublishers();
  await seedArticles(publisherIdBySourceKey);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
