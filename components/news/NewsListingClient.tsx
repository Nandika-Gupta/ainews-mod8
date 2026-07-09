"use client";

import { useEffect, useMemo, useState } from "react";
import { Breadcrumb } from "./Breadcrumb";
import { NewsSearchBar } from "@/components/ui/NewsSearchBar";
import { FilterChips } from "./FilterChips";
import { TopicChip } from "./TopicChip";
import { NewsList } from "./NewsList";
import { Pagination } from "./Pagination";
import { applySearch, buildSourceOptions, buildTopicOptions, nextSortState, sortArticles } from "@/lib/utils/news";
import type { NewsArticle, NewsCategory, NewsFilterChip, NewsSource, SortState } from "@/types/news";

const PER_PAGE = 100;

interface NewsListingClientProps {
  articles: NewsArticle[];
  sources: Record<string, NewsSource>;
  categories: NewsCategory[];
  filterChips: NewsFilterChip[];
  category?: string;
  initialTopic?: string;
}

export function NewsListingClient({ articles, sources, categories, filterChips, category, initialTopic }: NewsListingClientProps) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>(initialTopic ? [initialTopic] : []);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [sort, setSort] = useState<SortState>({ key: "date", dir: "desc" });
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [filter, query, selectedTopics.length, selectedSources.length, sort.key, sort.dir]);

  const onSort = (key: SortState["key"]) => setSort((s) => nextSortState(s, key));

  const topicOptions = useMemo(() => buildTopicOptions(articles), [articles]);
  const sourceOptions = useMemo(() => buildSourceOptions(articles, sources), [articles, sources]);

  const toggleTopic = (v: string) =>
    setSelectedTopics((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));
  const toggleSource = (v: string) =>
    setSelectedSources((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));

  const tableFilters = {
    topicOptions,
    selectedTopics,
    onToggleTopic: toggleTopic,
    onClearTopics: () => setSelectedTopics([]),
    sourceOptions,
    selectedSources,
    onToggleSource: toggleSource,
    onClearSources: () => setSelectedSources([]),
  };

  let list = articles.slice();
  if (category) list = list.filter((a) => a.category === category || a.filters.includes(category));
  if (filter === "trending") list = list.filter((a) => a.score >= 80);
  else if (filter !== "all") list = list.filter((a) => a.filters.includes(filter) || a.category === filter);
  list = applySearch(list, query, sources);
  if (selectedTopics.length) list = list.filter((a) => selectedTopics.some((t) => a.topics.includes(t)));
  if (selectedSources.length) list = list.filter((a) => selectedSources.includes(a.source));
  list = sortArticles(list, sort, sources);

  const emptyKind: "search" | "empty" = query || selectedTopics.length || selectedSources.length ? "search" : "empty";

  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const paged = list.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const rangeStart = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const rangeEnd = Math.min(total, page * PER_PAGE);

  const cat = category ? categories.find((c) => c.key === category) : null;
  const catLabel = category ? cat?.label ?? category : null;

  return (
    <div>
      {category && (
        <div style={{ marginBottom: 18 }}>
          <Breadcrumb
            items={[
              { label: "AI News", href: "/news" },
              { label: catLabel ?? category },
            ]}
          />
        </div>
      )}

      <header>
        <div style={{ minWidth: 0 }}>
          <h1
            className="text-[40px] leading-[1.1] lg:text-[54px] lg:leading-[1.05]"
            style={{ fontFamily: "var(--font-display)", fontWeight: "var(--fw-bold)", letterSpacing: "-0.03em", color: "var(--text-primary)", margin: 0 }}
          >
            {category ? catLabel ?? category : "AI News"}
          </h1>
          {category ? (
            <p
              className="text-[18px] leading-[1.3] mt-[10px] lg:text-[24px] lg:leading-[1.2] lg:mt-[14px]"
              style={{ fontFamily: "var(--font-sans)", fontWeight: "var(--fw-medium)", letterSpacing: "-0.02em", color: "var(--text-secondary)" }}
            >
              {total} {catLabel ?? category} stories across the AI ecosystem
            </p>
          ) : (
            <p
              className="text-[15px] leading-[1.5] mt-3 lg:text-[18px] lg:leading-[1.65] lg:mt-4"
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: "var(--fw-regular)",
                letterSpacing: "-0.01em",
                color: "var(--text-secondary)",
                maxWidth: 940,
              }}
            >
              Curated news covering the most critical breakthroughs, investments, research, and models across the artificial intelligence landscape.
            </p>
          )}
        </div>
      </header>

      <div className="mt-5 lg:mt-8">
        <NewsSearchBar value={query} onChange={setQuery} />
      </div>

      <div className="mt-4 lg:mt-7">
        <FilterChips items={filterChips} value={filter} onChange={setFilter} />
      </div>

      {(selectedTopics.length > 0 || selectedSources.length > 0) && (
        <div className="mt-3 lg:mt-4" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {selectedTopics.map((t) => (
            <TopicChip key={"t" + t} active onClick={() => toggleTopic(t)}>
              {t} ✕
            </TopicChip>
          ))}
          {selectedSources.map((s) => (
            <TopicChip key={"s" + s} active onClick={() => toggleSource(s)}>
              {sources[s].name} ✕
            </TopicChip>
          ))}
          <button
            onClick={() => {
              setSelectedTopics([]);
              setSelectedSources([]);
            }}
            style={{ font: "var(--fw-medium) var(--fs-xs)/1 var(--font-sans)", color: "var(--text-secondary)", padding: "2px 4px" }}
          >
            Clear all
          </button>
        </div>
      )}

      {paged.length > 0 && (
        <div
          className="mt-4 mb-[10px] lg:mt-7 lg:mb-5"
          style={{
            font: "var(--fw-semibold) var(--fs-xs)/1 var(--font-sans)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-primary)",
          }}
        >
          Showing {total} {total === 1 ? "story" : "stories"}
        </div>
      )}

      <div style={{ height: paged.length ? 8 : 20 }} />

      <div
        className="px-3 lg:px-5"
        style={{
          borderRadius: "var(--radius-xl)",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          boxShadow: "var(--highlight-top)",
          paddingTop: 8,
          paddingBottom: 12,
        }}
      >
        <NewsList articles={paged} sources={sources} emptyKind={emptyKind} sort={sort} onSort={onSort} filters={tableFilters} />

        {total > 0 && (
          <div
            className="flex-col items-center lg:flex-row lg:items-center lg:justify-between"
            style={{
              display: "flex",
              gap: 16,
              padding: "18px 0 8px",
              marginTop: 8,
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <Pagination page={page} pages={pages} onPage={setPage} align="left" />
            <span
              className="lg:ml-auto"
              style={{ font: "var(--fw-regular) var(--fs-sm)/1 var(--font-sans)", color: "var(--text-quaternary)" }}
            >
              Showing {rangeStart} to {rangeEnd} of {total} stories
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
