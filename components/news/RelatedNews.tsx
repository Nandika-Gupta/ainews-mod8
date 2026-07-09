"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SidebarCard } from "./SidebarCard";
import { PublisherIcon } from "./PublisherIcon";
import { Icon } from "@/components/ui/Icon";
import { ICONS } from "@/lib/icons";
import { publishedLabel } from "@/lib/utils/format";
import { articleSourceUrl } from "@/lib/utils/news";
import type { NewsArticle, NewsSource } from "@/types/news";

interface RelatedNewsProps {
  articles: NewsArticle[];
  sources: Record<string, NewsSource>;
  title?: string;
}

export function RelatedNews({ articles, sources, title = "Related news" }: RelatedNewsProps) {
  const router = useRouter();

  return (
    <SidebarCard
      title={title}
      action={
        <Link href="/news" className="tas-link" style={{ font: "var(--fw-medium) 15px/1 var(--font-sans)", color: "var(--purple-text)" }}>
          View all
        </Link>
      }
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        {articles.map((a, i) => (
          <div
            key={a.id}
            role="link"
            tabIndex={0}
            onClick={() => router.push(`/news/${a.id}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter") router.push(`/news/${a.id}`);
            }}
            className="tas-relrow py-4 lg:py-[15px]"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              paddingLeft: 8,
              paddingRight: 8,
              margin: "0 -8px",
              borderRadius: "var(--radius-md)",
              transition: "var(--transition-colors)",
              borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)",
              cursor: "pointer",
            }}
          >
            <PublisherIcon source={sources[a.source]} box={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  font: "var(--fw-medium) 17px/1.4 var(--font-sans)",
                  letterSpacing: "-0.006em",
                  color: "var(--text-primary)",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {a.headline}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7, font: "var(--fw-regular) 15px/1 var(--font-sans)", color: "var(--text-quaternary)" }}>
                <a
                  className="tas-link"
                  href={articleSourceUrl(a)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ color: "var(--purple-text)", font: "var(--fw-medium) 15px/1 var(--font-sans)" }}
                >
                  {sources[a.source].domain}
                </a>
                <span>· {publishedLabel(a.hours)}</span>
              </div>
            </div>
            <Icon path={ICONS.chevronR} size={16} style={{ color: "var(--text-quaternary)", flex: "none" }} />
          </div>
        ))}
      </div>
    </SidebarCard>
  );
}
