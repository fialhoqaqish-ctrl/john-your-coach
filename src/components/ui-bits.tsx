import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  accent = false,
}: {
  children: ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl bg-card p-6 ${accent ? "border border-primary/60" : "border border-border"} ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </div>
  );
}

export function Verdict({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 text-[15px] leading-snug text-muted-foreground">
      {children}
    </p>
  );
}

export function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export function Locked({ title, hint }: { title: string; hint: string }) {
  return (
    <Card>
      <SectionLabel>{title}</SectionLabel>
      <p className="mt-3 text-base text-foreground">🔒 {hint}</p>
    </Card>
  );
}

export function Building({ needed }: { needed: number }) {
  return <EmptyLine>Building your baseline — {needed} more…</EmptyLine>;
}

export function StatePill({ state }: { state: string }) {
  const map: Record<string, string> = {
    ready: "bg-success/15 text-success",
    ease_in: "bg-warning/15 text-warning",
    recover: "bg-destructive/15 text-destructive",
    no_data: "bg-muted text-muted-foreground",
  };
  const label: Record<string, string> = {
    ready: "Ready",
    ease_in: "Ease in",
    recover: "Recover",
    no_data: "No data",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[state] ?? map.no_data}`}>
      {label[state] ?? state}
    </span>
  );
}