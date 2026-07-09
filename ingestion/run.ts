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
import { pruneToMostRecent } from "./prune";

const MAX_LIVE_ARTICLES = 200;

/**
 * Fails fast with a clear message instead of letting a missing secret surface
 * as an opaque Prisma connection error 20+ seconds into the run — exactly
 * what happened on the last two scheduled GitHub Actions runs (both failed
 * in ~23s, consistent with DATABASE_URL never being set as a repo secret).
 */
function checkRequiredEnv(): void {
  if (!process.env.DATABASE_URL) {
    console.error("FATAL: DATABASE_URL is not set. If this is running in GitHub Actions, add it under Settings -> Secrets and variables -> Actions.");
    process.exit(1);
  }
  for (const key of ["GEMINI_API_KEY", "GROQ_API_KEY"]) {
    if (!process.env[key]) console.warn(`  note: ${key} is not set — LLM summaries will fall through to Pollinations.ai or the raw RSS description.`);
  }
}

async function main() {
  checkRequiredEnv();
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
        `near-dup=${r.skippedNearDuplicate} not-ai=${r.skippedNotAiRelevant} invalid=${r.skippedInvalid} ` +
        `no-content=${r.skippedNoContent}` +
        `${r.errors.length ? ` errors=${r.errors.length}` : ""}`
    );
    for (const err of r.errors.slice(0, 3)) console.log(`   ! ${err}`);
  }

  const pruned = await pruneToMostRecent(MAX_LIVE_ARTICLES);

  console.log(`\nDone. ${totalCreated} new article(s) ingested.${pruned ? ` Pruned ${pruned} older article(s) to stay at ${MAX_LIVE_ARTICLES}.` : ""}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
