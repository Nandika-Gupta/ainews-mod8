"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { SortHeader } from "./SortHeader";
import { FilterDropdown } from "./FilterDropdown";
import { PublisherIcon } from "./PublisherIcon";
import { TopicChip } from "./TopicChip";
import { Icon } from "@/components/ui/Icon";
import { ICONS } from "@/lib/icons";
import { publishedLabel } from "@/lib/utils/format";
import { articleSourceUrl } from "@/lib/utils/news";
import type { FilterOption, NewsArticle, NewsSource, SortKey, SortState } from "@/types/news";

export interface NewsTableFilters {
  topicOptions: FilterOption[];
  selectedTopics: string[];
  onToggleTopic: (value: string) => void;
  onClearTopics: () => void;
  sourceOptions: FilterOption[];
  selectedSources: string[];
  onToggleSource: (value: string) => void;
  onClearSources: () => void;
}

// One table for every viewport: Title | Source | Topics | Published | Actions. No column is
// pinned — on narrow screens the table's natural min-width exceeds the viewport and the whole
// thing scrolls horizontally together (see the wrapping .tas-scroll-x div in NewsTable below).
const GRID = "minmax(320px,2.2fr) minmax(120px,0.7fr) minmax(120px,0.6fr) 90px 84px";

const eyebrowStyle = {
  font: "var(--fw-semibold) var(--fs-2xs)/1 var(--font-sans)",
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "var(--text-secondary)",
};

interface NewsTableHeadProps {
  sort: SortState;
  onSort: (key: SortKey) => void;
  filters: NewsTableFilters;
  openFilter: "topics" | "source" | null;
  setOpenFilter: (v: "topics" | "source" | null) => void;
}

function NewsTableHead({ sort, onSort, filters, openFilter, setOpenFilter }: NewsTableHeadProps) {
  const cellBase = { display: "flex" as const, alignItems: "center" as const, height: "100%" };

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        background: "var(--bg-base)",
        display: "grid",
        gridTemplateColumns: GRID,
        gap: 12,
        alignItems: "center",
        height: 40,
        padding: "0 14px",
        borderBottom: "1px solid var(--border-default)",
      }}
    >
      <div style={cellBase}>
        <SortHeader label="Title" sortKey="title" sort={sort} onSort={onSort} />
      </div>
      <div style={{ ...cellBase, position: "relative" }}>
        <SortHeader
          label="Source"
          sortKey="source"
          sort={sort}
          onSort={onSort}
          onFilter={() => setOpenFilter(openFilter === "source" ? null : "source")}
          filterActive={filters.selectedSources.length > 0}
        />
        {openFilter === "source" && (
          <FilterDropdown
            title="Sources"
            options={filters.sourceOptions}
            selected={filters.selectedSources}
            onToggle={filters.onToggleSource}
            onClear={filters.onClearSources}
            onClose={() => setOpenFilter(null)}
          />
        )}
      </div>
      <div style={{ ...cellBase, position: "relative" }}>
        <SortHeader
          label="Topics"
          sortKey="topics"
          sort={sort}
          onSort={onSort}
          onFilter={() => setOpenFilter(openFilter === "topics" ? null : "topics")}
          filterActive={filters.selectedTopics.length > 0}
        />
        {openFilter === "topics" && (
          <FilterDropdown
            title="Topics"
            options={filters.topicOptions}
            selected={filters.selectedTopics}
            onToggle={filters.onToggleTopic}
            onClear={filters.onClearTopics}
            onClose={() => setOpenFilter(null)}
          />
        )}
      </div>
      <div style={cellBase}>
        <SortHeader label="Published" sortKey="date" sort={sort} onSort={onSort} />
      </div>
      <div style={{ ...cellBase, justifyContent: "flex-end", ...eyebrowStyle }}>Actions</div>
    </div>
  );
}

/** Bookmark + share row actions. */
function NewsRowActions({ article }: { article: NewsArticle }) {
  const key = "tas_bm_" + article.id;
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    try {
      setSaved(window.localStorage.getItem(key) === "1");
    } catch {
      // localStorage unavailable — ignore
    }
  }, [key]);

  const toggle = (e: MouseEvent) => {
    e.stopPropagation();
    const next = !saved;
    setSaved(next);
    try {
      if (next) window.localStorage.setItem(key, "1");
      else window.localStorage.removeItem(key);
    } catch {
      // localStorage unavailable — ignore
    }
  };

  const share = async (e: MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/news/${article.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: article.headline, text: article.headline, url });
        return;
      }
    } catch {
      // user cancelled or Web Share unsupported — fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // clipboard unavailable — ignore
    }
    setShared(true);
    setTimeout(() => setShared(false), 1400);
  };

  const box = (on: boolean, onClick: (e: MouseEvent) => void, path: string, label: string) => (
    <button
      onClick={onClick}
      className="tas-act-box w-9 h-9"
      data-on={on ? "" : undefined}
      aria-label={label}
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
        transition: "var(--transition-colors)",
        color: on ? "var(--purple-text)" : "var(--text-tertiary)",
        background: on ? "var(--purple-soft)" : "transparent",
        border: "1px solid transparent",
      }}
    >
      <Icon path={path} size={15} fill={on} />
    </button>
  );

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }} onClick={(e) => e.stopPropagation()}>
      {box(saved, toggle, ICONS.bookmark, saved ? "Saved" : "Save")}
      {box(shared, share, shared ? ICONS.check : ICONS.share, shared ? "Link copied" : "Share")}
    </div>
  );
}

interface NewsRowProps {
  article: NewsArticle;
  index: number;
  sources: Record<string, NewsSource>;
  onTopic?: (topic: string) => void;
}

function NewsRow({ article, index, sources, onTopic }: NewsRowProps) {
  const router = useRouter();
  const source = sources[article.source];
  const go = () => router.push(`/news/${article.id}`);
  const [primaryTopic] = article.topics;

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === "Enter") go();
      }}
      className="tas-row tas-enter"
      style={{
        display: "grid",
        gridTemplateColumns: GRID,
        gap: 12,
        alignItems: "center",
        padding: "18px 14px",
        borderBottom: "1px solid var(--border-subtle)",
        cursor: "pointer",
        animationDelay: Math.min(index, 12) * 24 + "ms",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        <PublisherIcon source={source} box={32} />
        <h3
          className="tas-row-title"
          style={{
            font: "var(--fw-semibold) 15px/1.45 var(--font-sans)",
            letterSpacing: "-0.012em",
            color: "var(--text-primary)",
            margin: 0,
            minWidth: 0,
          }}
        >
          {article.headline}
        </h3>
      </div>
      <div style={{ minWidth: 0 }}>
        <a
          className="tas-link"
          href={articleSourceUrl(article)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            display: "block",
            font: "var(--fw-semibold) var(--fs-sm)/1.3 var(--font-sans)",
            letterSpacing: "-0.01em",
            color: "var(--purple-text)",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          {source.name}
        </a>
      </div>
      <div style={{ minWidth: 0 }}>
        <TopicChip maxWidth={130} onClick={onTopic ? () => onTopic(primaryTopic) : undefined}>
          {primaryTopic}
        </TopicChip>
      </div>
      <div
        style={{
          minWidth: 0,
          font: "var(--fw-medium) var(--fs-sm)/1 var(--font-sans)",
          letterSpacing: "-0.01em",
          color: "var(--text-primary)",
          whiteSpace: "nowrap",
        }}
      >
        {publishedLabel(article.hours)}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <NewsRowActions article={article} />
      </div>
    </div>
  );
}

interface NewsTableProps {
  articles: NewsArticle[];
  sources: Record<string, NewsSource>;
  sort: SortState;
  onSort: (key: SortKey) => void;
  filters: NewsTableFilters;
}

export function NewsTable({ articles, sources, sort, onSort, filters }: NewsTableProps) {
  const [openFilter, setOpenFilter] = useState<"topics" | "source" | null>(null);

  return (
    <div className="tas-scroll-x" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <div style={{ minWidth: 820 }}>
        <NewsTableHead sort={sort} onSort={onSort} filters={filters} openFilter={openFilter} setOpenFilter={setOpenFilter} />
        <div>
          {articles.map((a, i) => (
            <NewsRow key={a.id} article={a} index={i} sources={sources} onTopic={filters.onToggleTopic} />
          ))}
        </div>
      </div>
    </div>
  );
}
