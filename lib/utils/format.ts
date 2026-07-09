/** Relative + absolute date formatting for article timestamps expressed as "hours ago". */

export function absDate(h: number, now: number = Date.now()): string {
  const d = new Date(now - h * 3600 * 1000);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Single compact "Published" value: e.g. "2h" / "Yesterday" within a day, otherwise "Jul 7" (no year, no "ago"). */
export function publishedLabel(h: number, now: number = Date.now()): string {
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  return absDate(h, now);
}
