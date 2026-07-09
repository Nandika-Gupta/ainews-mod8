import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/news/PageShell";
import { ArticleDetail } from "@/components/news/ArticleDetail";
import { getRecentSlugs, getArticleBySlug, getPopularSources, getRelatedArticles, getSourcesMap } from "@/lib/data/news";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

// Live cron ingestion adds articles continuously, so pre-rendering every
// article at build time neither scales (floods the DB pool during `next
// build`) nor stays fresh (new articles wouldn't have a page until the next
// deploy). Pre-warm just the newest slugs; any other slug renders on first
// request and is cached from then on (ISR), refreshing every 30 minutes.
export async function generateStaticParams() {
  const slugs = await getRecentSlugs();
  return slugs.map((slug) => ({ slug }));
}

export const revalidate = 1800;

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Story not found — The AI Signal" };
  return {
    title: `${article.headline} — The AI Signal`,
    description: article.dek,
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const [related, sources, popularSources] = await Promise.all([
    getRelatedArticles(article),
    getSourcesMap(),
    getPopularSources(),
  ]);

  return (
    <PageShell>
      <ArticleDetail article={article} related={related} sources={sources} popularSources={popularSources} />
    </PageShell>
  );
}
