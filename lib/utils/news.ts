import type { FilterOption, NewsArticle, NewsArticleRecord, NewsSource, SortState } from "@/types/news";

/** The specific original article URL at the source — never the publisher's homepage. */
export function articleSourceUrl(article: Pick<NewsArticleRecord, "articleUrl">): string {
  return article.articleUrl;
}

export function sortArticles(list: NewsArticle[], sort: SortState, sources: Record<string, NewsSource>): NewsArticle[] {
  const dir = sort.dir === "asc" ? 1 : -1;
  const l = list.slice();
  const comparators: Record<SortState["key"], (a: NewsArticle, b: NewsArticle) => number> = {
    title: (a, b) => a.headline.localeCompare(b.headline),
    topics: (a, b) => (a.topics[0] || "").localeCompare(b.topics[0] || ""),
    date: (a, b) => b.hours - a.hours, // asc = oldest first
    source: (a, b) => sources[a.source].name.localeCompare(sources[b.source].name),
    trending: (a, b) => a.score - b.score,
  };
  const cmp = comparators[sort.key] ?? ((a, b) => b.hours - a.hours);
  l.sort((a, b) => cmp(a, b) * dir);
  return l;
}

export function applySearch(list: NewsArticle[], query: string, sources: Record<string, NewsSource>): NewsArticle[] {
  if (!query.trim()) return list;
  const q = query.toLowerCase();
  return list.filter(
    (a) =>
      a.headline.toLowerCase().includes(q) ||
      a.dek.toLowerCase().includes(q) ||
      a.topics.some((t) => t.toLowerCase().includes(q)) ||
      sources[a.source].name.toLowerCase().includes(q)
  );
}

export function defaultSortDir(key: SortState["key"]): SortState["dir"] {
  return key === "title" || key === "source" || key === "topics" ? "asc" : "desc";
}

export function nextSortState(current: SortState, key: SortState["key"]): SortState {
  if (current.key === key) {
    return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  }
  return { key, dir: defaultSortDir(key) };
}

export function buildTopicOptions(articles: NewsArticle[]): FilterOption[] {
  const counts: Record<string, number> = {};
  articles.forEach((a) => a.topics.forEach((t) => (counts[t] = (counts[t] || 0) + 1)));
  return Object.keys(counts)
    .sort()
    .map((t) => ({ value: t, label: t, count: counts[t] }));
}

export function buildSourceOptions(articles: NewsArticle[], sources: Record<string, NewsSource>): FilterOption[] {
  const counts: Record<string, number> = {};
  articles.forEach((a) => (counts[a.source] = (counts[a.source] || 0) + 1));
  return Object.keys(counts)
    .sort((x, y) => sources[x].name.localeCompare(sources[y].name))
    .map((s) => ({ value: s, label: sources[s].name, count: counts[s] }));
}
