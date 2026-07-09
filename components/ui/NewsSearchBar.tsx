"use client";

import { useEffect, useRef } from "react";
import { Icon } from "./Icon";
import { ICONS } from "@/lib/icons";

interface NewsSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function NewsSearchBar({ value, onChange, placeholder = "Search AI news…" }: NewsSearchBarProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div
      className="tas-search h-[52px]"
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        width: "100%",
        borderRadius: "var(--radius-lg)",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-strong)",
        boxShadow: "var(--highlight-top)",
        transition: "var(--transition-colors)",
      }}
    >
      <span style={{ display: "inline-flex", paddingLeft: 18, paddingRight: 12, color: "var(--text-secondary)", flex: "none" }}>
        <Icon path={ICONS.search} size={18} />
      </span>
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search AI news"
        style={{
          flex: 1,
          minWidth: 0,
          height: "100%",
          border: "none",
          outline: "none",
          boxShadow: "none",
          background: "transparent",
          font: "var(--fw-regular) var(--fs-lg)/1 var(--font-sans)",
          color: "var(--text-primary)",
          padding: 0,
          paddingRight: 14,
          letterSpacing: "-0.006em",
        }}
      />
      <kbd
        className="hidden lg:inline-flex"
        style={{
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          marginRight: 10,
          flex: "none",
          minWidth: 34,
          height: 24,
          padding: "0 7px",
          borderRadius: "var(--radius-sm)",
          background: "var(--bg-surface-2)",
          border: "1px solid var(--border-default)",
          boxShadow: "var(--highlight-top)",
          font: "var(--fw-medium) var(--fs-xs)/1 var(--font-sans)",
          color: "var(--text-tertiary)",
          letterSpacing: "0.02em",
        }}
      >
        ⌘K
      </kbd>
    </div>
  );
}
