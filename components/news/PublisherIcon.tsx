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
    // Fires on the very next paint (~16ms after mount) — far too soon for a
    // real network image request to have finished normally, so this must
    // NOT treat "still loading" (!img.complete) as failure, or it advances
    // past every real logo before it had any chance to load (invisible on
    // localhost, where same-machine requests often do finish within a
    // frame — but on any real network, i.e. production, this fired on
    // nearly every image and cascaded straight to the last-resort
    // placeholder). Only catches a request that has ALREADY synchronously
    // resolved to a broken image before this effect ran.
    const checkImmediate = () => {
      const img = imgRef.current;
      if (img && img.complete && img.naturalWidth === 0) {
        setIndex((i) => i + 1);
      }
    };
    // By 2.5s, any real image load should be long done — if it still hasn't
    // fired load/error at all, that's a genuine hang, so the broader
    // "not complete OR zero-width" check is correct here.
    const checkAfterTimeout = () => {
      const img = imgRef.current;
      if (img && (!img.complete || img.naturalWidth === 0)) {
        setIndex((i) => i + 1);
      }
    };
    const immediate = requestAnimationFrame(checkImmediate);
    const timeout = setTimeout(checkAfterTimeout, 2500);
    return () => {
      cancelAnimationFrame(immediate);
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- candidates is derived fresh each render from source; index is the real dependency
  }, [index, source.domain, source.logoUrl]);

  const radius = box <= 18 ? "var(--radius-xs)" : box >= 40 ? "var(--radius-md)" : "var(--radius-sm)";
  // Flat neutral chrome + a near-full-bleed image (real brand marks read as
  // crisp and self-contained, closer to how a plain favicon renders in a
  // browser tab) instead of a per-publisher color-tinted halo + border ring,
  // which read as an extra decorative "badge" competing with the logo's own
  // colors rather than a clean container for it.
  //
  // The chip background is a fixed near-white, not a dark app-surface color:
  // most real favicons/brand marks are solid black (or another dark, low-
  // saturation color) on a transparent background — designed for a light
  // browser-tab chrome — and are effectively invisible against our dark UI
  // otherwise (confirmed on Rust Foundation's and AI Now Institute's real
  // logos, both solid black line art on transparent backgrounds). A light
  // chip guarantees contrast for any logo regardless of its own color, which
  // is what makes GraphOne's icon list read as clean/polished — every icon
  // sits on the same light, predictable surface.
  const imgSize = Math.round(box * 0.72);
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
        background: "#F3F3F5",
        border: "1px solid rgba(0, 0, 0, 0.06)",
        boxShadow: box >= 40 ? "0 1px 2px rgba(0, 0, 0, 0.25)" : "none",
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
