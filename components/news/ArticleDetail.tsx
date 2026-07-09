import Link from "next/link";
import { TopicChip } from "./TopicChip";
import { PublisherIcon } from "./PublisherIcon";
import { PopularSources } from "./PopularSources";
import { RelatedNews } from "./RelatedNews";
import { VoteButtons } from "./VoteButtons";
import { ShareButton } from "./ShareButton";
import { SaveButton } from "./SaveButton";
import { CommentBox } from "./CommentBox";
import { Icon } from "@/components/ui/Icon";
import { ICONS } from "@/lib/icons";
import { publishedLabel } from "@/lib/utils/format";
import { articleSourceUrl } from "@/lib/utils/news";
import type { NewsArticle, NewsSource } from "@/types/news";

interface ArticleDetailProps {
  article: NewsArticle;
  related: NewsArticle[];
  sources: Record<string, NewsSource>;
  popularSources: string[];
}

export function ArticleDetail({ article: a, related, sources, popularSources }: ArticleDetailProps) {
  const source = sources[a.source];
  const sourceUrl = articleSourceUrl(a);

  return (
    <div>
      <Link
        href="/news"
        className="tas-backlink"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          font: "var(--fw-medium) var(--fs-sm)/1 var(--font-sans)",
          color: "var(--text-tertiary)",
          transition: "var(--transition-colors)",
        }}
      >
        <Icon path={ICONS.chevronL} size={16} />
        All news
      </Link>

      <div
        className="grid grid-cols-1 gap-10 items-start lg:gap-9 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]"
        style={{ margin: "24px auto 0" }}
      >
        <article style={{ minWidth: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            <Link href={`/news?topic=${encodeURIComponent(a.topics[0])}`} style={{ display: "inline-flex" }}>
              <TopicChip large>{a.topics[0]}</TopicChip>
            </Link>
          </div>

          <h1
            className="text-[22px] leading-[1.3]"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--fw-bold)",
              letterSpacing: "-0.026em",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            {a.headline}
          </h1>

          <div className="gap-2 mt-3 lg:gap-[10px] lg:mt-4" style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 10px 3px 4px",
                borderRadius: 999,
                background: `color-mix(in srgb, ${source.color} 14%, var(--bg-surface-2))`,
                border: `1px solid color-mix(in srgb, ${source.color} 34%, transparent)`,
                textDecoration: "none",
              }}
            >
              <PublisherIcon key={source.domain} source={source} box={22} />
              <span style={{ font: "var(--fw-semibold) 13px/1 var(--font-sans)", color: "var(--text-primary)" }}>{source.name}</span>
            </a>
            <span style={{ color: "var(--text-quaternary)" }}>·</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--fw-medium) 14px/1 var(--font-sans)", color: "var(--text-secondary)" }}>
              <Icon path={ICONS.calendar} size={15} style={{ color: "var(--text-tertiary)" }} />
              {publishedLabel(a.hours)}
            </span>
          </div>

          <div style={{ height: 1, background: "var(--border-subtle)", margin: "22px 0 0" }} />

          <div style={{ marginTop: 22 }}>
            <h2
              style={{
                font: "var(--fw-bold) 15px/1 var(--font-sans)",
                letterSpacing: "0.02em",
                textTransform: "uppercase",
                color: "var(--text-primary)",
                margin: "0 0 12px",
              }}
            >
              AI Summary
            </h2>
            <p
              className="text-[16px] leading-[1.7] lg:text-[17px] lg:leading-[1.75]"
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: "var(--fw-regular)",
                letterSpacing: "-0.011em",
                color: "color-mix(in srgb, var(--text-primary) 85%, var(--text-secondary))",
                margin: 0,
                // Belt-and-suspenders: normal prose wraps at spaces fine on
                // its own, but a long unbroken run with no spaces at all
                // (e.g. concatenated nav-menu text from a bad extraction)
                // won't wrap without this, forcing the whole page wider than
                // the viewport instead of staying inside its container.
                overflowWrap: "break-word",
                wordBreak: "break-word",
              }}
            >
              {a.aiSummary}
            </p>
          </div>

          {/* Desktop engagement row */}
          <div
            className="hidden lg:flex"
            style={{ alignItems: "center", gap: 12, marginTop: 40, paddingTop: 24, borderTop: "1px solid var(--border-subtle)", flexWrap: "wrap" }}
          >
            <ShareButton />
            <SaveButton id={a.id} />
            <div style={{ marginLeft: "auto" }}>
              <VoteButtons up={a.up} down={a.down} id={a.id} size="lg" />
            </div>
          </div>

          {/* Mobile engagement grid — fixed rows/columns so "Link copied" never shifts other buttons */}
          <div
            className="grid lg:hidden"
            style={{ gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--border-subtle)" }}
          >
            <ShareButton fluid />
            <SaveButton id={a.id} fluid />
            <div style={{ gridColumn: "1 / -1" }}>
              <VoteButtons up={a.up} down={a.down} id={a.id} size="lg" fluid />
            </div>
          </div>

          <CommentBox />
        </article>

        <div className="static lg:sticky flex flex-col gap-6" style={{ top: 24 }}>
          <RelatedNews articles={related} sources={sources} />
          <PopularSources popular={popularSources} sources={sources} />
        </div>
      </div>
    </div>
  );
}
