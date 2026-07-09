import type { NewsFilterChip } from "@/types/news";

interface FilterChipsProps {
  items: NewsFilterChip[];
  value: string;
  onChange: (id: string) => void;
}

export function FilterChips({ items, value, onChange }: FilterChipsProps) {
  return (
    <div
      role="tablist"
      aria-label="News filters"
      className="tas-scroll-x gap-3"
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "nowrap",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        padding: "2px 4px",
      }}
    >
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.id)}
            className="tas-chip"
            data-active={active ? "" : undefined}
            style={{
              display: "inline-flex",
              alignItems: "center",
              flex: "none",
              gap: 7,
              height: 38,
              padding: "0 16px",
              font: "var(--fw-medium) var(--fs-sm)/1 var(--font-sans)",
              letterSpacing: "-0.006em",
              borderRadius: "var(--radius-pill)",
              whiteSpace: "nowrap",
              color: active ? "#fff" : "var(--text-primary)",
              background: active ? "var(--purple)" : "var(--bg-elevated)",
              border: `1px solid ${active ? "transparent" : "var(--border-default)"}`,
              boxShadow: active ? "none" : "var(--highlight-top)",
              transition: "var(--transition-colors)",
            }}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
