import type { ReactNode } from "react";

interface SidebarCardProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

export function SidebarCard({ title, action, children }: SidebarCardProps) {
  return (
    <section
      style={{
        borderRadius: "var(--radius-lg)",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--highlight-top)",
        padding: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
        <h3 style={{ font: "var(--fw-bold) 22px/1.1 var(--font-sans)", letterSpacing: "-0.02em", color: "var(--text-primary)", margin: 0 }}>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
