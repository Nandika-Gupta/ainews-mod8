/**
 * One-shot backfill: regenerates aiSummary (and dek, where needed) for
 * existing articles currently stuck showing the title as their summary —
 * the symptom of the bug fixed in pipeline.ts's fallback chain (hnDiscovery.ts
 * and feedParser.ts used to silently substitute the title when no real
 * description was available, so `aiSummary === title` for a large share of
 * the site, especially every Hacker-News-discovered article).
 *
 * For each broken row: reuse the existing dek if it's real (not itself a
 * title-duplicate), otherwise re-fetch the article page for its real
 * OG/JSON-LD description or a body-text excerpt — the same real-content
 * fallback chain ingestion now uses — then run it through the LLM
 * summarization waterfall. Never falls back to the title.
 *
 * Usage: npx tsx ingestion/backfillSummaries.ts
 */
import { prisma } from "../lib/prisma";
import { generateAiSummary } from "./llmSummarizer";
import { extractArticleMetadata } from "./metadataExtractor";

const NO_SUMMARY_PLACEHOLDER = "No summary available for this article.";

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

  const broken = rows.filter((r) => r.aiSummary.trim() === r.title.trim() || r.dek.trim() === r.title.trim());
  console.log(`Found ${broken.length} article(s) with a title-duplicate summary out of ${rows.length} total.\n`);

  let fixed = 0;
  let noRealContent = 0;

  for (const row of broken) {
    let dek = row.dek.trim() === row.title.trim() ? "" : row.dek;
    let realContent = dek;

    if (!realContent) {
      const { description, bodyExcerpt } = await fetchRealContent(row.articleUrl);
      realContent = description || bodyExcerpt || "";
      dek = description || bodyExcerpt || "";
    }

    const hasRealContent = realContent.trim().length > 0 && realContent.trim() !== row.title.trim();
    const llmSummary = hasRealContent ? await generateAiSummary(row.title, realContent) : null;
    const newDek = dek || NO_SUMMARY_PLACEHOLDER;
    const newAiSummary = llmSummary || newDek;

    await prisma.newsArticle.update({
      where: { id: row.id },
      data: { dek: newDek, aiSummary: newAiSummary },
    });

    if (llmSummary) {
      fixed++;
      console.log(`  ✅ ${row.title.slice(0, 70)}`);
    } else {
      noRealContent++;
      console.log(`  ⚠️  ${row.title.slice(0, 70)} -> no real content found anywhere, set to honest fallback`);
    }
  }

  console.log(`\nDone. ${fixed} article(s) got a real LLM summary, ${noRealContent} had no real content available (article page unreachable / no description).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
