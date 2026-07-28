import { useState } from "react";
import { Card, SectionLabel, EmptyLine, Verdict } from "@/components/ui-bits";
import type { Dashboard, RhythmSession } from "@/lib/types";

// The ONE rhythm verdict — rendered identically on Trends and Milestones.
// In-band weeks are the win; over-band weeks are amber, never celebrated.
const STATE_COLOR: Record<string, string> = {
  in: "var(--color-primary)",
  over: "var(--color-warning)",
  under: "var(--color-muted-foreground)",
};
const STATE_WORD: Record<string, string> = {
  in: "in band",
  over: "big week — watch the rebound",
  under: "under band",
};

export function RhythmCard({ rhythm }: { rhythm: Dashboard["rhythm"] }) {
  const weeks = rhythm?.weeks ?? [];
  const band = rhythm?.band;
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (weeks.length === 0) {
    return (
      <Card>
        <SectionLabel>Training rhythm</SectionLabel>
        <EmptyLine>Building your baseline — the band unlocks as weeks land.</EmptyLine>
      </Card>
    );
  }

  const maxSessions = Math.max(...weeks.map((w) => w.volume), band?.high ?? 0, 6);
  const H = 112;
  const u = H / maxSessions;
  const bandTopY = band ? H - band.high * u : 0;
  const bandH = band ? Math.max(2, (band.high - band.low) * u) : 0;
  const headline = rhythm?.headline ?? "Your sustainable range.";

  return (
    <Card>
      <SectionLabel>
        Training rhythm{rhythm?.returned_weeks ? ` · ${rhythm.returned_weeks} weeks` : ""}
      </SectionLabel>
      <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
        Each block = one session. The shaded band is your sustainable range — staying inside it beats spiky weeks.
      </p>
      <div
        className="mt-4 relative"
        style={{ height: H }}
        role="img"
        aria-label={`Training rhythm: ${headline}${
          band ? `. Sustainable band ${band.low} to ${band.high} sessions per week` : ""
        }`}
      >
        {band && (
          <>
            <div
              className="absolute inset-x-0 rounded"
              style={{ top: bandTopY, height: bandH, background: "var(--color-primary)", opacity: 0.08 }}
              aria-hidden="true"
            />
            {band.median != null && (
              <div
                className="absolute inset-x-0"
                style={{
                  top: H - band.median * u,
                  height: 1,
                  background: "var(--color-muted-foreground)",
                  opacity: 0.35,
                }}
                aria-hidden="true"
              />
            )}
            <span
              className="absolute right-0 text-[10px] tabular text-muted-foreground"
              style={{ top: Math.max(0, bandTopY - 14) }}
            >
              {band.low}–{band.high}/wk
            </span>
          </>
        )}
        <div className="absolute inset-0 flex items-end gap-1">
          {weeks.map((w, wi) => {
            const color = STATE_COLOR[w.state] ?? STATE_COLOR.under;
            const isHover = hoverIdx === wi;
            const opacity = isHover ? 1 : w.state === "under" ? 0.4 : 0.95;
            const segH = Math.max(2, u - 2);
            return (
              <div
                key={w.week}
                className="flex-1 flex flex-col-reverse gap-[2px] cursor-pointer relative"
                aria-label={`${w.week}: ${w.volume} sessions, ${STATE_WORD[w.state] ?? w.state}`}
                role="button"
                tabIndex={0}
                onMouseEnter={() => setHoverIdx(wi)}
                onMouseLeave={() => setHoverIdx((v) => (v === wi ? null : v))}
                onFocus={() => setHoverIdx(wi)}
                onBlur={() => setHoverIdx((v) => (v === wi ? null : v))}
                onTouchStart={() => setHoverIdx(wi)}
                onClick={() => setHoverIdx((v) => (v === wi ? null : wi))}
              >
                {Array.from({ length: w.volume }).map((_, i) => (
                  <div key={i} style={{ height: segH, background: color, opacity, borderRadius: 2 }} />
                ))}
              </div>
            );
          })}
        </div>
        {hoverIdx != null && weeks[hoverIdx] && (
          <RhythmTooltip
            week={weeks[hoverIdx].week}
            state={weeks[hoverIdx].state}
            sessions={weeks[hoverIdx].sessions ?? []}
            align={hoverIdx / Math.max(1, weeks.length - 1)}
          />
        )}
      </div>
      <div className="mt-2 flex justify-between text-[10px] tabular text-muted-foreground">
        <span>{weeks[0].week}</span>
        <span>{weeks[weeks.length - 1].week}</span>
      </div>
      <Verdict>{headline}</Verdict>
    </Card>
  );
}

function RhythmTooltip({
  week,
  state,
  sessions,
  align,
}: {
  week: string;
  state: string;
  sessions: RhythmSession[];
  align: number;
}) {
  const left = `${Math.min(80, Math.max(0, align * 100))}%`;
  const transform =
    align < 0.15 ? "translateX(0)" : align > 0.85 ? "translateX(-100%)" : "translateX(-50%)";
  return (
    <div
      role="tooltip"
      className="absolute -top-2 z-20 -translate-y-full rounded-lg bg-foreground/95 px-3 py-2 text-[11px] leading-snug text-background shadow-lg max-w-[240px]"
      style={{ left, transform }}
    >
      <div className="mb-1 text-[10px] uppercase tracking-[0.14em] opacity-70">
        {week} · {STATE_WORD[state] ?? state}
      </div>
      {sessions.length === 0 ? (
        <div className="opacity-80">no sessions logged</div>
      ) : (
        <ul className="space-y-0.5">
          {sessions.map((s, i) => (
            <li key={i} className="tabular">{s.label}</li>
          ))}
        </ul>
      )}
    </div>
  );
}