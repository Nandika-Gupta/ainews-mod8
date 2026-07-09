"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ICONS } from "@/lib/icons";

type Vote = "up" | "down" | null;

interface VoteButtonsProps {
  up: number;
  down: number;
  id: string;
  layout?: "row" | "col";
  size?: "sm" | "lg";
  /** Equal-width buttons filling their container (CSS grid, 1fr each) — used in the mobile equal-width grid. */
  fluid?: boolean;
}

export function VoteButtons({ up, down, id, layout = "row", size = "sm", fluid = false }: VoteButtonsProps) {
  const key = "tas_vote_" + id;
  const [vote, setVote] = useState<Vote>(null);
  const lg = size === "lg";

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored === "up" || stored === "down") setVote(stored);
    } catch {
      // localStorage unavailable — ignore
    }
  }, [key]);

  const set = (v: Vote) => {
    const next = vote === v ? null : v;
    setVote(next);
    try {
      if (next) window.localStorage.setItem(key, next);
      else window.localStorage.removeItem(key);
    } catch {
      // localStorage unavailable — ignore
    }
  };

  const upCount = up + (vote === "up" ? 1 : 0);
  const downCount = down + (vote === "down" ? 1 : 0);

  const renderButton = (dir: "up" | "down", count: number, path: string) => {
    const on = vote === dir;
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          set(dir);
        }}
        aria-pressed={on}
        aria-label={dir === "up" ? "Upvote" : "Downvote"}
        className="tas-vote"
        data-on={on ? "" : undefined}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: lg ? 8 : 5,
          height: lg ? 40 : 30,
          padding: lg ? "0 16px" : "0 9px",
          width: fluid ? "100%" : undefined,
          minWidth: lg ? 44 : 30,
          font: lg ? "var(--fw-medium) var(--fs-body)/1 var(--font-sans)" : "var(--fw-medium) var(--fs-xs)/1 var(--font-mono)",
          color: on ? "var(--purple-text)" : "var(--text-secondary)",
          background: on ? "var(--purple-soft)" : lg ? "var(--bg-elevated)" : "transparent",
          border: `1px solid ${on ? "var(--purple-border)" : "var(--border-default)"}`,
          borderRadius: lg ? "var(--radius-md)" : "var(--radius-sm)",
          boxShadow: lg && !on ? "var(--highlight-top)" : "none",
          cursor: "pointer",
          transition: "var(--transition-colors)",
        }}
      >
        <Icon path={path} size={lg ? 17 : 14} />
        <span style={{ minWidth: 8 }}>{count.toLocaleString()}</span>
      </button>
    );
  };

  if (fluid) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        {renderButton("up", upCount, ICONS.arrowUp)}
        {renderButton("down", downCount, ICONS.arrowDown)}
      </div>
    );
  }

  return (
    <div
      style={{ display: "inline-flex", flexDirection: layout === "col" ? "column" : "row", gap: lg ? 8 : 6 }}
      onClick={(e) => e.stopPropagation()}
    >
      {renderButton("up", upCount, ICONS.arrowUp)}
      {renderButton("down", downCount, ICONS.arrowDown)}
    </div>
  );
}
