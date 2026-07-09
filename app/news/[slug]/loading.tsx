import { PageShell } from "@/components/news/PageShell";

export default function ArticleLoading() {
  return (
    <PageShell>
      <div className="tas-shimmer" style={{ height: 18, width: 220, borderRadius: 6 }} />
      <div style={{ marginTop: 28, maxWidth: 680 }}>
        <div className="tas-shimmer" style={{ height: 14, width: 120, borderRadius: 999 }} />
        <div className="tas-shimmer" style={{ height: 44, width: "100%", borderRadius: 8, marginTop: 20 }} />
        <div className="tas-shimmer" style={{ height: 44, width: "70%", borderRadius: 8, marginTop: 10 }} />
        <div className="tas-shimmer" style={{ height: 18, width: "90%", borderRadius: 6, marginTop: 20 }} />
        <div className="tas-shimmer" style={{ height: 340, width: "100%", borderRadius: 12, marginTop: 32 }} />
      </div>
    </PageShell>
  );
}
