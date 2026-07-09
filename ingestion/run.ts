/**
 * One-shot ingestion run — analogous to GraphOne's run_once.py, minus the
 * continuous-loop variants (run_forever.sh/run_loop.sh). Run this yourself
 * on a schedule (cron, GitHub Action, etc.) once deployed; this sandbox has
 * no persistent process between sessions, so a "forever" runner doesn't
 * belong here.
 *
 * Usage: npm run ingest
 */
import { prisma } from "../lib/prisma";
import { FEED_SOURCES } from "./sources";
import { ingestAll, ingestHackerNewsDiscovery, loadRecentTitleIndex } from "./pipeline";

async function main() {
  console.log(`Ingesting ${FEED_SOURCES.length} feed source(s)...\n`);

  // Shared across both RSS and HN-discovery ingestion so a story picked up
  // by one doesn't slip past the other's near-duplicate check.
  const titleIndex = await loadRecentTitleIndex();
  const [results, hnResult] = await Promise.all([
    ingestAll(FEED_SOURCES, 30, titleIndex),
    ingestHackerNewsDiscovery(titleIndex),
  ]);
  const allResults = [...results, hnResult];

  let totalCreated = 0;
  for (const r of allResults) {
    totalCreated += r.created;
    console.log(
      `${r.source.padEnd(24)} fetched=${r.fetched} created=${r.created} duplicate=${r.skippedDuplicate} ` +
        `near-dup=${r.skippedNearDuplicate} not-ai=${r.skippedNotAiRelevant} invalid=${r.skippedInvalid}` +
        `${r.errors.length ? ` errors=${r.errors.length}` : ""}`
    );
    for (const err of r.errors.slice(0, 3)) console.log(`   ! ${err}`);
  }

  console.log(`\nDone. ${totalCreated} new article(s) ingested.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
