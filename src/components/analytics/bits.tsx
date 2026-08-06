import type { ReactNode } from "react";
import { Info } from "lucide-react";

export function Panel({
  title,
  info,
  sources,
  right,
  children,
  className = "",
}: {
  title?: string;
  info?: string;
  sources?: string[];
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`glass rounded-2xl p-5 ${className}`}>
      {(title || right) && (
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <MetricLabel info={info}>{title}</MetricLabel>}
            {sources && sources.length > 0 && <SourceChips sources={sources} />}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function MetricLabel({ children, info }: { children: ReactNode; info?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
      {children}
      {info && (
        <button
          type="button"
          title={info}
          aria-label={`About this metric: ${info}`}
          className="inline-flex h-6 w-6 -m-1.5 items-center justify-center rounded-full text-muted-foreground/70 hover:text-foreground"
        >
          <Info size={12} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}

export function SourceChips({ sources }: { sources: string[] }) {
  return (
    <span className="mt-1.5 flex flex-wrap gap-1">
      {sources.map((s) => (
        <span
          key={s}
          className="rounded-full border border-border px-1.5 py-px text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground"
        >
          {s}
        </span>
      ))}
    </span>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex rounded-full border border-border p-0.5"
    >
      {options.map((o) => {
        const active = o === value;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            aria-pressed={active}
            className={`min-h-[32px] rounded-full px-2.5 text-[11px] font-medium uppercase tracking-wide ${
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-border p-4">
      <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

export function DeltaChip({
  deltaPct,
  invert = false,
}: {
  deltaPct: number | null | undefined;
  invert?: boolean;
}) {
  if (deltaPct == null || !Number.isFinite(deltaPct)) {
    return <span className="text-[11px] text-muted-foreground">—</span>;
  }
  const good = invert ? deltaPct < 0 : deltaPct > 0;
  const flat = Math.abs(deltaPct) < 0.5;
  const color = flat
    ? "text-muted-foreground"
    : good
      ? "text-[color:var(--color-success)]"
      : "text-[color:var(--color-destructive)]";
  const glyph = flat ? "—" : deltaPct > 0 ? "▲" : "▼";
  return (
    <span className={`text-[11px] tabular ${color}`}>
      {glyph} {Math.abs(Math.round(deltaPct))}%
    </span>
  );
}
