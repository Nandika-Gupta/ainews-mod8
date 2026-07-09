import type { CSSProperties } from "react";

interface IconProps {
  path: string | string[];
  size?: number;
  stroke?: number;
  fill?: boolean;
  style?: CSSProperties;
  className?: string;
}

/** Lucide-style line glyph renderer. Renders one or more path strings on a 24x24 viewBox. */
export function Icon({ path, size = 16, stroke = 1.75, fill = false, style, className }: IconProps) {
  const paths = Array.isArray(path) ? path : [path];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ display: "block", flex: "none", ...style }}
      aria-hidden="true"
    >
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={fill ? "currentColor" : "none"}
        />
      ))}
    </svg>
  );
}
