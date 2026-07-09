import type { CSSProperties, ReactNode } from "react";

interface TopicChipProps {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  maxWidth?: number;
  compact?: boolean;
  fluid?: boolean;
  large?: boolean;
}

export function TopicChip({ children, onClick, active, maxWidth, compact, fluid, large }: TopicChipProps) {
  const style: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    height: compact ? 22 : large ? 32 : 26,
    padding: compact ? "0 8px" : large ? "0 14px" : "0 11px",
    font: `var(--fw-medium) ${compact ? "11px" : large ? "15px" : "var(--fs-xs)"}/1 var(--font-sans)`,
    color: active ? "var(--text-primary)" : compact ? "var(--text-secondary)" : "var(--text-primary)",
    background: active ? "var(--bg-active)" : compact ? "var(--bg-surface-2)" : "var(--bg-elevated)",
    border: `1px solid ${compact ? "var(--border-default)" : "var(--border-strong)"}`,
    borderRadius: compact ? "var(--radius-sm)" : "var(--radius-pill)",
    whiteSpace: "nowrap",
    flex: fluid ? "0 1 auto" : "none",
    minWidth: fluid ? 44 : undefined,
    maxWidth: maxWidth ?? "none",
    overflow: "hidden",
    textOverflow: "ellipsis",
    cursor: onClick ? "pointer" : "default",
    transition: "var(--transition-colors)",
  };
  return (
    <button
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation();
              onClick();
            }
          : undefined
      }
      className="tas-topic"
      data-active={active ? "" : undefined}
      style={style}
    >
      {children}
    </button>
  );
}
