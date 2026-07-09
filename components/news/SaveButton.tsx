"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ICONS } from "@/lib/icons";

interface SaveButtonProps {
  id: string;
  /** Fixed width filling its container (no content-driven growth) — used in the mobile equal-width grid. */
  fluid?: boolean;
}

export function SaveButton({ id, fluid }: SaveButtonProps) {
  const key = "tas_bm_" + id;
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      setSaved(window.localStorage.getItem(key) === "1");
    } catch {
      // localStorage unavailable — ignore
    }
  }, [key]);

  const toggle = () => {
    const next = !saved;
    setSaved(next);
    try {
      if (next) window.localStorage.setItem(key, "1");
      else window.localStorage.removeItem(key);
    } catch {
      // localStorage unavailable — ignore
    }
  };

  return (
    <button
      onClick={toggle}
      aria-pressed={saved}
      className="tas-savebtn"
      data-on={saved ? "" : undefined}
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
        color: saved ? "var(--purple-text)" : "var(--text-secondary)",
        background: saved ? "var(--purple-soft)" : "var(--bg-elevated)",
        border: `1px solid ${saved ? "var(--purple-border)" : "var(--border-default)"}`,
        boxShadow: "var(--highlight-top)",
      }}
    >
      <Icon path={ICONS.bookmark} size={17} fill={saved} />
      {saved ? "Saved" : "Save"}
    </button>
  );
}
