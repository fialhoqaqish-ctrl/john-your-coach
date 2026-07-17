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
      className={`glass rounded-2xl p-6 ${accent ? "!border-primary/60" : ""} ${className}`}
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

export function BaselineForming({
  signals,
  etaDays = 12,
}: {
  signals: string[];
  etaDays?: number;
}) {
  return (
    <Card>
      <SectionLabel>Baseline forming</SectionLabel>
      <p className="mt-3 text-base text-foreground">
        {signals.join(" · ")} light up as data flows in.
      </p>
      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full bg-primary/60"
          style={{ width: "18%", transition: "width 500ms" }}
          aria-hidden="true"
        />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Full picture unlocks when your Garmin syncs — about {etaDays} days.
      </p>
    </Card>
  );
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