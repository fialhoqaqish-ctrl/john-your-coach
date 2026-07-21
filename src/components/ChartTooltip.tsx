import type { ReactNode } from "react";
import { fmtShortDate } from "@/lib/format";

type PayloadEntry = {
  value: number;
  payload: Record<string, unknown>;
};

type TooltipProps = {
  active?: boolean;
  payload?: PayloadEntry[];
  label?: string | number;
};

export function makeDateValueTooltip(opts: {
  dateKey?: string;
  formatValue: (value: number, row: Record<string, unknown>) => string;
  formatDate?: (raw: unknown) => string;
}) {
  const { dateKey = "date", formatValue, formatDate } = opts;
  return function DateValueTooltip({ active, payload }: TooltipProps) {
    if (!active || !payload || payload.length === 0) return null;
    const row = payload[0].payload;
    const rawDate = row?.[dateKey];
    const dateStr = formatDate ? formatDate(rawDate) : fmtShortDate(rawDate as string);
    return (
      <TooltipShell>
        <span className="opacity-70">{dateStr}</span>
        <span className="mx-1.5 opacity-40">—</span>
        <span className="tabular">{formatValue(payload[0].value, row)}</span>
      </TooltipShell>
    );
  };
}

export function TooltipShell({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none rounded-lg bg-foreground/95 px-2.5 py-1.5 text-[11px] leading-snug text-background shadow-lg">
      {children}
    </div>
  );
}