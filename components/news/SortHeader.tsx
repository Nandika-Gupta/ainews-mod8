"use client";

import { Icon } from "@/components/ui/Icon";
import { ICONS } from "@/lib/icons";
import type { SortKey, SortState } from "@/types/news";

function SortArrows({ active, dir }: { active: boolean; dir: SortState["dir"] | null }) {
  const up = active && dir === "asc";
  const down = active && dir === "desc";
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 1, marginLeft: 3 }}>
      <svg width="9" height="6" viewBox="0 0 8 5" fill="none">
        <path d="M1 4l3-3 3 3" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={up ? 1 : 0.5} />
      </svg>
      <svg width="9" height="6" viewBox="0 0 8 5" fill="none">
        <path d="M1 1l3 3 3-3" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={down ? 1 : 0.5} />
      </svg>
    </span>
  );
}

interface SortHeaderProps {
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
  onFilter?: () => void;
  filterActive?: boolean;
  align?: "left" | "right";
}

export function SortHeader({ label, sortKey, sort, onSort, onFilter, filterActive, align = "left" }: SortHeaderProps) {
  const active = sort.key === sortKey;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
      <button
        onClick={() => onSort(sortKey)}
        className="tas-sort"
        data-active={active ? "" : undefined}
        style={{
          display: "inline-flex",
          alignItems: "center",
          font: "var(--fw-semibold) var(--fs-xs)/1 var(--font-sans)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: active ? "var(--text-primary)" : "var(--text-secondary)",
          cursor: "pointer",
          transition: "var(--transition-colors)",
        }}
      >
        {label}
        <SortArrows active={active} dir={active ? sort.dir : null} />
      </button>
      {onFilter && (
        <button
          onClick={onFilter}
          aria-label={"Filter " + label}
          className="tas-funnel"
          data-active={filterActive ? "" : undefined}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            borderRadius: "var(--radius-sm)",
            color: filterActive ? "var(--text-primary)" : "var(--text-secondary)",
            background: filterActive ? "var(--bg-active)" : "transparent",
            cursor: "pointer",
            transition: "var(--transition-colors)",
            flex: "none",
          }}
        >
          <Icon path={ICONS.filter} size={13} />
        </button>
      )}
    </div>
  );
}
