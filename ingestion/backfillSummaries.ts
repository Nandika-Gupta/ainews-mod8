/**
 * One-shot backfill: regenerates aiSummary (and dek, where needed) for
 * existing articles currently stuck on either (a) the title as their
 * summary — the symptom of the bug fixed in pipeline.ts's fallback chain
 * (hnDiscovery.ts and feedParser.ts used to silently substitute the title
 * when no real description was available), or (b) NO_SUMMARY_PLACEHOLDER —
 * which only happens when both enrichment and the LLM waterfall came up
 * empty, usually a transient site/network failure at that specific moment
 * rather than a permanent one (confirmed live: re-fetching the same URL
 * minutes later found real content that wasn't there during ingestion) —
 * so it's worth periodically retrying these rows, not just title-duplicates.
 *
 * For each broken row: reuse the existing dek if it's real (not itself
 * broken), otherwise re-fetch the article page for its real OG/JSON-LD
 * description or a body-text excerpt — the same real-content fallback chain
 * ingestion now uses — then run it through the LLM summarization waterfall.
 * Policy is real summary or nothing: if the retry still finds no real
 * content, the row is deleted rather than left showing a placeholder that
 * looks broken (pipeline.ts applies the same policy going forward — it
 * never creates a row like this in the first place).
 *
 * Usage: npx tsx ingestion/backfillSummaries.ts
 */
import { prisma } from "../lib/prisma";
import { generateAiSummary } from "./llmSummarizer";
import { extractArticleMetadata } from "./metadataExtractor";
import { NO_SUMMARY_PLACEHOLDER } from "./pipeline";

async function fetchRealContent(articleUrl: string): Promise<{ description: string | null; bodyExcerpt: string | null }> {
  try {
    const res = await fetch(articleUrl, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return { description: null, bodyExcerpt: null };
    const html = await res.text();
    const meta = extractArticleMetadata(html);
    return { description: meta.description, bodyExcerpt: meta.bodyExcerpt };
  } catch {
    return { description: null, bodyExcerpt: null };
  }
}

async function main() {
  const rows = await prisma.newsArticle.findMany({
    select: { id: true, title: true, dek: true, aiSummary: true, articleUrl: true },
  });

const isBroken = (text: string, title: string) => text.trim() === title.trim() || text.trim() === NO_SUMMARY_PLACEHOLDER;

  const broken = rows.filter((r) => isBroken(r.aiSummary, r.title) || isBroken(r.dek, r.title));
  console.log(`Found ${broken.length} article(s) with a title-duplicate or empty-fallback summary out of ${rows.length} total.\n`);

  let fixed = 0;
  let removed = 0;

  for (const row of broken) {
    let dek = isBroken(row.dek, row.title) ? "" : row.dek;
    let realContent = dek;

    if (!realContent) {
      const { description, bodyExcerpt } = await fetchRealContent(row.articleUrl);
      realContent = description || bodyExcerpt || "";
      dek = description || bodyExcerpt || "";
    }

    const hasRealContent = realContent.trim().length > 0 && realContent.trim() !== row.title.trim();
    const llmSummary = hasRealContent ? await generateAiSummary(row.title, realContent) : null;

    if (llmSummary) {
      await prisma.newsArticle.update({
        where: { id: row.id },
        data: { dek: dek || llmSummary, aiSummary: llmSummary },
      });
      fixed++;
      console.log(`  ✅ ${row.title.slice(0, 70)}`);
    } else {
      // Real summary or nothing — same policy pipeline.ts now applies at
      // ingestion time. Still no real content after a fresh retry, so
      // remove the article rather than leave a placeholder-looking row.
      await prisma.$transaction([
        prisma.bookmark.deleteMany({ where: { articleId: row.id } }),
        prisma.vote.deleteMany({ where: { articleId: row.id } }),
        prisma.newsArticle.delete({ where: { id: row.id } }),
      ]);
      removed++;
      console.log(`  🗑️  ${row.title.slice(0, 70)} -> no real content found anywhere, removed`);
    }
  }

  console.log(`\nDone. ${fixed} article(s) got a real LLM summary, ${removed} had no real content available and were removed.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
