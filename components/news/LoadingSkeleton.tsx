const GRID = "minmax(320px,2.2fr) minmax(120px,0.7fr) minmax(120px,0.6fr) 90px 84px";

export function LoadingSkeleton() {
  const rows = Array.from({ length: 8 });
  return (
    <div className="tas-scroll-x" style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 820 }}>
        <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 12, alignItems: "center", height: 40, padding: "0 14px", borderBottom: "1px solid var(--border-default)" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="tas-shimmer" style={{ height: 10, width: i === 0 ? 60 : 44, borderRadius: 4 }} />
          ))}
        </div>
        {rows.map((_, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: GRID, gap: 12, alignItems: "center", padding: "18px 14px", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div className="tas-shimmer" style={{ width: 32, height: 32, borderRadius: "var(--radius-md)", flex: "none" }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="tas-shimmer" style={{ height: 12, width: "85%", borderRadius: 4 }} />
                <div className="tas-shimmer" style={{ height: 10, width: "40%", borderRadius: 4 }} />
              </div>
            </div>
            <div className="tas-shimmer" style={{ height: 12, width: 80, borderRadius: 4 }} />
            <div className="tas-shimmer" style={{ height: 22, width: 100, borderRadius: 999 }} />
            <div className="tas-shimmer" style={{ height: 12, width: 50, borderRadius: 4 }} />
            <div className="tas-shimmer" style={{ height: 24, width: 76, borderRadius: "var(--radius-sm)", justifySelf: "end" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
