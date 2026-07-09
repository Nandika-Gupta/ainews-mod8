"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ICONS } from "@/lib/icons";

interface ShareButtonProps {
  /** Fixed width filling its container (no content-driven growth) — used in the mobile equal-width grid. */
  fluid?: boolean;
}

export function ShareButton({ fluid }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const share = () => {
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      onClick={share}
      aria-label="Share"
      className="tas-savebtn"
      data-on={copied ? "" : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: fluid ? "center" : "flex-start",
        width: fluid ? "100%" : "auto",
        gap: 8,
        height: 40,
        padding: "0 16px",
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        transition: "var(--transition-colors)",
        font: "var(--fw-medium) var(--fs-body)/1 var(--font-sans)",
        color: copied ? "var(--purple-text)" : "var(--text-secondary)",
        background: copied ? "var(--purple-soft)" : "var(--bg-elevated)",
        border: `1px solid ${copied ? "var(--purple-border)" : "var(--border-default)"}`,
        boxShadow: "var(--highlight-top)",
      }}
    >
      <Icon path={copied ? ICONS.check : ICONS.share} size={17} />
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
