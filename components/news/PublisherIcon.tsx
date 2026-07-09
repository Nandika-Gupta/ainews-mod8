"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ICONS } from "@/lib/icons";
import type { NewsSource } from "@/types/news";

interface PublisherIconProps {
  source: NewsSource;
  box?: number;
}

/**
 * Renders a publisher's logo. Resolution itself now happens ONCE, server-side,
 * at Publisher-creation time (see ingestion/publisherRegistry.ts) and is
 * cached on source.logoUrl — this component just displays that, falling back
 * through the same tiers only if the stored URL turns out to 404 at render
 * time: domain favicon -> Google's favicon aggregator -> a tinted generic
 * icon as the last resort (never a text-initial avatar).
 */
export function PublisherIcon({ source, box = 44 }: PublisherIconProps) {
  const candidates = [source.logoUrl, `https://${source.domain}/favicon.ico`, `https://www.google.com/s2/favicons?domain=${source.domain}&sz=128`].filter(
    (u): u is string => Boolean(u)
  );

  const [index, setIndex] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setIndex(0);
  }, [source.domain, source.logoUrl]);

  // Belt-and-suspenders: some blocked/unreachable hosts never fire a load or
  // error event at all (the request just hangs) instead of failing cleanly,
  // which would leave the icon stuck forever. A timeout forces it to the
  // next candidate regardless.
  useEffect(() => {
    if (index >= candidates.length) return;
    const check = () => {
      const img = imgRef.current;
      if (img && (!img.complete || img.naturalWidth === 0)) {
        setIndex((i) => i + 1);
      }
    };
    const immediate = requestAnimationFrame(check); // catches the "already failed before mount" race
    const timeout = setTimeout(check, 2500); // catches requests that hang without ever erroring
    return () => {
      cancelAnimationFrame(immediate);
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- candidates is derived fresh each render from source; index is the real dependency
  }, [index, source.domain, source.logoUrl]);

  const radius = box <= 18 ? "var(--radius-xs)" : box >= 40 ? "var(--radius-md)" : "var(--radius-sm)";
  const imgSize = Math.round(box * 0.56);
  const c = source.color;
  const src = candidates[index];

  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: box,
        height: box,
        flex: "none",
        borderRadius: radius,
        background: `color-mix(in srgb, ${c} 16%, var(--bg-surface-2))`,
        border: `1px solid color-mix(in srgb, ${c} 38%, transparent)`,
        boxShadow: box >= 40 ? "var(--highlight-top)" : "none",
        overflow: "hidden",
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- mixes bundled local assets and arbitrary external favicon URLs; next/image optimization isn't needed for a tiny icon.
        <img
          key={src}
          ref={imgRef}
          src={src}
          alt={`${source.name} logo`}
          width={imgSize}
          height={imgSize}
          style={{ objectFit: "contain", width: imgSize, height: imgSize }}
          onError={() => setIndex((i) => i + 1)}
        />
      ) : (
        <Icon path={ICONS.newspaper} size={Math.round(box * 0.46)} stroke={1.6} style={{ color: c }} />
      )}
    </span>
  );
}
