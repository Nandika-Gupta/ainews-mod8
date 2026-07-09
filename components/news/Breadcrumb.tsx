import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ICONS } from "@/lib/icons";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            {it.href && !last ? (
              <Link
                href={it.href}
                className="tas-crumb"
                style={{
                  font: "var(--fw-medium) var(--fs-xs)/1 var(--font-sans)",
                  color: "var(--text-tertiary)",
                  transition: "var(--transition-colors)",
                }}
              >
                {it.label}
              </Link>
            ) : (
              <span
                style={{
                  font: "var(--fw-medium) var(--fs-xs)/1 var(--font-sans)",
                  color: last ? "var(--text-secondary)" : "var(--text-tertiary)",
                }}
              >
                {it.label}
              </span>
            )}
            {!last && <Icon path={ICONS.chevronR} size={13} style={{ color: "var(--text-quaternary)" }} />}
          </span>
        );
      })}
    </nav>
  );
}
