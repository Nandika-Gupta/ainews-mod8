"use client";

import { NewsTable, type NewsTableFilters } from "./NewsTable";
import { EmptyState } from "./EmptyState";
import { NoResultsState } from "./NoResultsState";
import type { NewsArticle, NewsSource, SortKey, SortState } from "@/types/news";

interface NewsListProps {
  articles: NewsArticle[];
  sources: Record<string, NewsSource>;
  emptyKind: "search" | "empty";
  sort: SortState;
  onSort: (key: SortKey) => void;
  filters: NewsTableFilters;
}

/** Renders the discovery table, or the empty/no-results state when the feed has nothing to show. */
export function NewsList({ articles, sources, emptyKind, sort, onSort, filters }: NewsListProps) {
  if (!articles.length) {
    return emptyKind === "search" ? <NoResultsState /> : <EmptyState />;
  }
  return <NewsTable articles={articles} sources={sources} sort={sort} onSort={onSort} filters={filters} />;
}
