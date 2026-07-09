import { PageShell } from "@/components/news/PageShell";
import { LoadingSkeleton } from "@/components/news/LoadingSkeleton";

export default function NewsLoading() {
  return (
    <PageShell>
      <div>
        <div className="tas-shimmer" style={{ height: 54, width: 260, borderRadius: 8 }} />
        <div className="tas-shimmer" style={{ height: 20, width: 420, borderRadius: 6, marginTop: 16 }} />
        <div className="tas-shimmer" style={{ height: 52, width: "100%", borderRadius: "var(--radius-lg)", marginTop: 32 }} />
        <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="tas-shimmer" style={{ height: 38, width: 96, borderRadius: 999 }} />
          ))}
        </div>
        <div style={{ marginTop: 28 }}>
          <LoadingSkeleton />
        </div>
      </div>
    </PageShell>
  );
}
