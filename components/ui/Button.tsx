"use client";

import { useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";

type ButtonVariant = "primary" | "accent" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "style"> {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  pill?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
  style?: CSSProperties;
}

const SIZES: Record<ButtonSize, { height: number; padding: string; font: string; gap: number; icon: number; radius: string }> = {
  sm: { height: 28, padding: "0 10px", font: "var(--fs-xs)", gap: 6, icon: 14, radius: "var(--radius-sm)" },
  md: { height: 34, padding: "0 14px", font: "var(--fs-sm)", gap: 7, icon: 16, radius: "var(--radius-sm)" },
  lg: { height: 40, padding: "0 18px", font: "var(--fs-body)", gap: 8, icon: 18, radius: "var(--radius-md)" },
};

const VARIANTS: Record<
  ButtonVariant,
  { background: string; color: string; border: string; boxShadow?: string; hover: CSSProperties; active: CSSProperties }
> = {
  primary: {
    background: "var(--cream)",
    color: "var(--text-on-light)",
    border: "1px solid transparent",
    boxShadow: "var(--highlight-top)",
    hover: { background: "var(--cream-hover)" },
    active: { background: "var(--cream-active)" },
  },
  accent: {
    background: "var(--accent)",
    color: "var(--text-on-accent)",
    border: "1px solid transparent",
    boxShadow: "var(--highlight-top)",
    hover: { background: "var(--accent-hover)" },
    active: { background: "var(--accent-active)" },
  },
  secondary: {
    background: "var(--bg-elevated)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-default)",
    boxShadow: "var(--highlight-top)",
    hover: { background: "var(--bg-hover)", borderColor: "var(--border-strong)" },
    active: { background: "var(--bg-active)" },
  },
  ghost: {
    background: "transparent",
    color: "var(--text-secondary)",
    border: "1px solid transparent",
    hover: { background: "var(--bg-hover)", color: "var(--text-primary)" },
    active: { background: "var(--bg-active)" },
  },
};

export function Button({
  children,
  variant = "secondary",
  size = "md",
  pill = false,
  iconLeft,
  iconRight,
  fullWidth = false,
  disabled = false,
  style,
  ...rest
}: ButtonProps) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);
  const s = SIZES[size];
  const v = VARIANTS[variant];
  const stateStyle = disabled ? {} : active ? v.active : hover ? v.hover : {};

  return (
    <button
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setActive(false);
      }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: s.gap,
        height: s.height,
        padding: s.padding,
        width: fullWidth ? "100%" : "auto",
        font: `var(--fw-medium) ${s.font}/1 var(--font-sans)`,
        letterSpacing: "-0.006em",
        borderRadius: pill ? "var(--radius-pill)" : s.radius,
        background: v.background,
        color: v.color,
        border: v.border,
        boxShadow: v.boxShadow || "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transform: active && !disabled ? "scale(0.98)" : "none",
        transition: "var(--transition-colors), transform var(--dur-fast) var(--ease-standard)",
        whiteSpace: "nowrap",
        userSelect: "none",
        ...stateStyle,
        ...style,
      }}
      {...rest}
    >
      {iconLeft && <span style={{ display: "inline-flex", width: s.icon, height: s.icon, flex: "none" }}>{iconLeft}</span>}
      {children}
      {iconRight && <span style={{ display: "inline-flex", width: s.icon, height: s.icon, flex: "none" }}>{iconRight}</span>}
    </button>
  );
}
