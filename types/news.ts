export interface NewsSource {
  name: string;
  domain: string;
  color: string;
  followers: string;
  /** Resolved once at ingestion/seed time and cached — the primary logo to render. */
  logoUrl: string | null;
}

export interface NewsCategory {
  key: string;
  label: string;
  count: number;
}

export interface NewsFilterChip {
  id: string;
  label: string;
}

/** Raw article shape as it would come back from an API/DB, before derived fields are added. */
export interface NewsArticleRecord {
  id: string;
  headline: string;
  dek: string;
  /** The "AI Summary" shown on the article page. */
  aiSummary: string;
  /** The original article URL at the source — never the publisher homepage. */
  articleUrl: string;
  category: string;
  topics: string[];
  /** Key into the sources map (see getSourcesMap()) — not a display name. */
  source: string;
  /** Hours since publication, derived from the real publishedAt timestamp at read time. */
  hours: number;
  up: number;
  down: number;
  filters: string[];
}

/** Article shape used throughout the UI, including the derived trending score. */
export interface NewsArticle extends NewsArticleRecord {
  score: number;
}

export type SortKey = "title" | "topics" | "date" | "source" | "trending";
export type SortDir = "asc" | "desc";

export interface SortState {
  key: SortKey;
  dir: SortDir;
}

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}
