import Link from "next/link";
import { SidebarCard } from "./SidebarCard";
import { PublisherIcon } from "./PublisherIcon";
import { Icon } from "@/components/ui/Icon";
import { ICONS } from "@/lib/icons";
import type { NewsSource } from "@/types/news";

interface PopularSourcesProps {
  popular: string[];
  sources: Record<string, NewsSource>;
}

export function PopularSources({ popular, sources }: PopularSourcesProps) {
  return (
    <SidebarCard
      title="Popular sources"
      action={
        <Link href="/news" className="tas-link" style={{ font: "var(--fw-medium) 15px/1 var(--font-sans)", color: "var(--purple-text)" }}>
          View all
        </Link>
      }
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        {popular.map((key, i) => {
          const s = sources[key];
          return (
            <a
              key={key}
              href={`https://${s.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tas-srcrow py-4 lg:py-[13px]"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                paddingLeft: 8,
                paddingRight: 8,
                margin: "0 -8px",
                minHeight: 68,
                borderRadius: "var(--radius-md)",
                transition: "var(--transition-colors)",
                borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)",
              }}
            >
              <PublisherIcon source={s} box={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    font: "var(--fw-semibold) 18px/1.25 var(--font-sans)",
                    letterSpacing: "-0.01em",
                    color: "var(--text-primary)",
                  }}
                >
                  {s.name}
                </div>
                <div style={{ font: "var(--fw-regular) 15px/1 var(--font-sans)", color: "var(--text-quaternary)", marginTop: 6 }}>{s.followers} followers</div>
              </div>
              <Icon path={ICONS.chevronR} size={16} style={{ color: "var(--text-quaternary)", flex: "none" }} />
            </a>
          );
        })}
      </div>
    </SidebarCard>
  );
}
