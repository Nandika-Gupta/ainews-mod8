import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ICONS } from "@/lib/icons";

export default function GlobalNotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-base)" }}>
      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 1200,
          margin: "0 auto",
          padding: "44px var(--page-pad-x) 96px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 52,
            height: 52,
            borderRadius: "var(--radius-lg)",
            background: "var(--bg-surface-2)",
            border: "1px solid var(--border-default)",
            color: "var(--text-tertiary)",
            marginBottom: 14,
          }}
        >
          <Icon path={ICONS.alert} size={22} />
        </div>
        <h3 style={{ font: "var(--fw-semibold) var(--fs-h3)/1.2 var(--font-sans)", letterSpacing: "-0.01em", color: "var(--text-primary)", margin: 0 }}>
          Page not found
        </h3>
        <p style={{ font: "var(--fw-regular) var(--fs-body)/1.5 var(--font-sans)", color: "var(--text-tertiary)", maxWidth: 380, margin: "4px 0 0" }}>
          The page you&rsquo;re looking for doesn&rsquo;t exist.
        </p>
        <div style={{ marginTop: 18 }}>
          <Link href="/news">
            <Button variant="secondary" iconLeft={<Icon path={ICONS.chevronL} size={16} />}>
              Back to news
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
