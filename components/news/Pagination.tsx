"use client";

import { Icon } from "@/components/ui/Icon";
import { ICONS } from "@/lib/icons";

interface PaginationProps {
  page: number;
  pages: number;
  onPage: (page: number) => void;
  align?: "left" | "center";
}

/** Compact page window with ellipses: 1 … (p-1) p (p+1) … last */
export function Pagination({ page, pages, onPage, align = "center" }: PaginationProps) {
  if (pages <= 1) return null;

  const set = new Set<number>([1, pages, page, page - 1, page + 1]);
  if (page <= 3) {
    set.add(2);
    set.add(3);
  }
  if (page >= pages - 2) {
    set.add(pages - 1);
    set.add(pages - 2);
  }
  const nums = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const items: (number | string)[] = [];
  for (let i = 0; i < nums.length; i++) {
    if (i > 0 && nums[i] - nums[i - 1] > 1) items.push("gap" + i);
    items.push(nums[i]);
  }

  const box = (
    key: string,
    content: React.ReactNode,
    opts: { disabled?: boolean; onClick?: () => void; current?: boolean; label?: string } = {}
  ) => (
    <button
      key={key}
      disabled={opts.disabled}
      onClick={opts.onClick}
      className="tas-page h-11 min-w-11 lg:h-9 lg:min-w-9"
      data-current={opts.current ? "" : undefined}
      aria-label={opts.label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 10px",
        font: "var(--fw-medium) var(--fs-sm)/1 var(--font-sans)",
        fontVariantNumeric: "tabular-nums",
        color: opts.current ? "#fff" : opts.disabled ? "var(--text-quaternary)" : "var(--text-secondary)",
        background: opts.current ? "var(--purple)" : "var(--bg-elevated)",
        border: `1px solid ${opts.current ? "transparent" : "var(--border-default)"}`,
        borderRadius: "var(--radius-sm)",
        boxShadow: opts.current ? "none" : "var(--highlight-top)",
        cursor: opts.disabled ? "not-allowed" : "pointer",
        opacity: opts.disabled ? 0.5 : 1,
        transition: "var(--transition-colors)",
      }}
    >
      {content}
    </button>
  );

  return (
    <div
      className={`justify-start tas-scroll-x ${align === "left" ? "lg:justify-start" : "lg:justify-center"}`}
      style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "nowrap", overflowX: "auto", maxWidth: "100%" }}
    >
      {box("prev", <Icon path={ICONS.chevronL} size={16} />, { disabled: page === 1, onClick: () => onPage(page - 1), label: "Previous page" })}
      {items.map((it) =>
        typeof it === "number" ? (
          box(String(it), String(it), { current: it === page, onClick: () => onPage(it), label: "Page " + it })
        ) : (
          <span
            key={it}
            className="h-11 lg:h-9"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 24,
              color: "var(--text-quaternary)",
              font: "var(--fw-medium) var(--fs-sm)/1 var(--font-sans)",
            }}
          >
            …
          </span>
        )
      )}
      {box("next", <Icon path={ICONS.chevronR} size={16} />, { disabled: page === pages, onClick: () => onPage(page + 1), label: "Next page" })}
    </div>
  );
}
