import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

interface StateShellProps {
  icon: string | string[];
  title: string;
  body: string;
  action?: ReactNode;
}

export function StateShell({ icon, title, body, action }: StateShellProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "72px 24px", gap: 6 }}>
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
        <Icon path={icon} size={22} />
      </div>
      <h3
        style={{
          font: "var(--fw-semibold) var(--fs-h3)/1.2 var(--font-sans)",
          letterSpacing: "-0.01em",
          color: "var(--text-primary)",
          margin: 0,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          font: "var(--fw-regular) var(--fs-body)/1.5 var(--font-sans)",
          color: "var(--text-tertiary)",
          maxWidth: 380,
          margin: "4px 0 0",
        }}
      >
        {body}
      </p>
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  );
}
