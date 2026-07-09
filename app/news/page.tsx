import type { Metadata } from "next";
import { PageShell } from "@/components/news/PageShell";
import { NewsListingClient } from "@/components/news/NewsListingClient";
import { getArticles, getCategories, getFilterChips, getSourcesMap } from "@/lib/data/news";

export const metadata: Metadata = {
  title: "AI News — The AI Signal",
  description: "AI news across the AI ecosystem — models, research, funding, and policy.",
};

interface NewsPageProps {
  searchParams: Promise<{ category?: string; topic?: string }>;
}

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const { category, topic } = await searchParams;
  const [articles, sources, categories] = await Promise.all([getArticles(), getSourcesMap(), getCategories()]);
  const filterChips = getFilterChips();

  return (
    <PageShell>
      <NewsListingClient
        articles={articles}
        sources={sources}
        categories={categories}
        filterChips={filterChips}
        category={category}
        initialTopic={topic}
      />
    </PageShell>
  );
}
