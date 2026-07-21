import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Info } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, SectionLabel, EmptyLine, Verdict, BaselineForming } from "@/components/ui-bits";
import { useDashboard } from "@/lib/useDashboard";
import { fmtPct, fmtInt, fmtPaceSec, fmtShortDate } from "@/lib/format";
import { makeDateValueTooltip } from "@/components/ChartTooltip";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  ReferenceArea,
  ReferenceLine,
  Tooltip,
} from "recharts";
import type { Dashboard, RhythmSession } from "@/lib/types";

export const Route = createFileRoute("/trends")({ component: TrendsPage });

const VERDICT_COLOR: Record<string, string> = {
  RISING: "var(--color-primary)",
  HOLDING: "var(--color-foreground)",
  SLIPPING: "var(--color-destructive)",
  BUILDING: "var(--color-foreground)",
};

function TrendsPage() {
  const { data, isLoading, error, refetch } = useDashboard();
  const rhrSeries = data?.wellness?.rhr_series ?? [];
  const vo2Series = data?.body?.vo2max_series ?? [];
  const rhrMissing = rhrSeries.length < 2;
  const vo2Missing = vo2Series.length < 2;
  const missingSignals: string[] = [];
  if (rhrMissing) missingSignals.push("RHR");
  if (vo2Missing) missingSignals.push("VO₂max");
  return (
    <AppShell onRefresh={refetch}>
      <main className="px-5 safe-top pb-6 space-y-5">
        <h1 className="text-[13px] uppercase tracking-[0.16em] text-muted-foreground">Trends</h1>
        {isLoading && <EmptyLine>Loading…</EmptyLine>}
        {error && <EmptyLine>Couldn't reach your data.</EmptyLine>}
        {data && (
          <>
            <FitnessHero d={data} />
            <AerobicCard d={data} />
            <RhythmCard d={data} />
            {!rhrMissing && <RhrCard d={data} />}
            {!vo2Missing && <Vo2Card d={data} />}
            {missingSignals.length > 0 && <BaselineForming signals={missingSignals} />}
          </>
        )}
      </main>
    </AppShell>
  );
}

function FitnessHero({ d }: { d: Dashboard }) {
  const word = d.fitness_verdict?.word ?? "BUILDING";
  const pct = d.fitness_verdict?.pct;
  const confidence = d.fitness_verdict?.confidence ?? "ok";
  // Only RISING/SLIPPING shout; HOLDING/BUILDING stay neutral.
  const color = VERDICT_COLOR[word] ?? "var(--color-foreground)";
  const showPct = pct != null && (word === "RISING" || word === "SLIPPING") && confidence === "ok";
  return (
    <section className="pt-2">
      <SectionLabel>Fitness verdict</SectionLabel>
      <p className="font-display text-[76px] leading-[0.9] mt-3" style={{ color }}>
        {word}
      </p>
      <Verdict>
        {d.fitness_verdict?.subline ?? "Same heart rate, quicker pace."}
        {showPct && <span className="tabular"> {fmtPct(pct)}</span>}
      </Verdict>
    </section>
  );
}

type Range = "week" | "month" | "quarter";
const RANGE_LABEL: Record<Range, string> = { week: "Week", month: "Month", quarter: "3M" };
const RANGE_WORDS: Record<Range, string> = { week: "last week", month: "last month", quarter: "3 months ago" };

function AerobicCard({ d }: { d: Dashboard }) {
  const [range, setRange] = useState<Range>("month");
  const eff = d.efficiency;
  const source =
    (eff?.[range] as { period: string; median_pace_sec: number }[] | null | undefined) ??
    (range === "quarter" ? (d.pace_trend ?? []) : []);
  const data = source ?? [];
  const hasAny = !!eff && !!(eff.week?.length || eff.month?.length || eff.quarter?.length);
  if (data.length < 2) {
    return (
      <Card>
        <div className="flex items-baseline justify-between gap-2">
          <AerobicHeader />
          {hasAny && <RangeToggle value={range} onChange={setRange} />}
        </div>
        <EmptyLine>Two runs needed to compare effort.</EmptyLine>
      </Card>
    );
  }
  const values = data.map((p) => p.median_pace_sec);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.18 || 5;
  const first = values[0];
  const last = values[values.length - 1];
  // Positive = pace dropped (faster) = more efficient.
  const improvement = ((first - last) / first) * 100;
  const abs = Math.abs(improvement);
  const window = RANGE_WORDS[range];
  const verdictLine =
    improvement > 0.5
      ? `${abs.toFixed(1)}% more efficient vs ${window}.`
      : improvement < -0.5
        ? `${abs.toFixed(1)}% less efficient vs ${window} — slower at the same effort.`
        : "Holding pace at the same effort.";
  const bandLo = min + (max - min) * 0.35;
  const bandHi = min + (max - min) * 0.65;
  const firstLabel = data[0].period;
  const lastLabel = data[data.length - 1].period;
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-2">
        <AerobicHeader />
        <RangeToggle value={range} onChange={setRange} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Rising line = quicker at the same effort.</p>
      <div className="mt-4 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 18, left: 0 }}>
            <YAxis reversed domain={[min - pad, max + pad]} hide />
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={false}
              interval={0}
              ticks={[firstLabel, lastLabel]}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
            />
            <ReferenceArea y1={bandLo} y2={bandHi} fill="var(--color-muted-foreground)" fillOpacity={0.08} />
            <Line
              type="linear"
              dataKey="median_pace_sec"
              stroke="var(--color-foreground)"
              strokeWidth={2}
              dot={{ r: 2, fill: "var(--color-muted-foreground)", strokeWidth: 0 }}
              isAnimationActive
              animationDuration={400}
            />
            <Tooltip
              cursor={{ stroke: "var(--color-muted-foreground)", strokeOpacity: 0.3 }}
              content={makeDateValueTooltip({
                dateKey: "period",
                formatDate: (v) => String(v ?? ""),
                formatValue: (v) => `${fmtPaceSec(v)} /km`,
              })}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <Verdict>{verdictLine}</Verdict>
    </Card>
  );
}

function AerobicHeader() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex items-center gap-1.5">
      <SectionLabel>Aerobic fitness (pace at easy effort)</SectionLabel>
      <button
        type="button"
        aria-label="What is aerobic fitness?"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="text-muted-foreground hover:text-foreground focus-visible:text-foreground shrink-0"
      >
        <Info size={13} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute left-0 top-full z-20 mt-1.5 w-64 rounded-lg bg-foreground/95 px-3 py-2 text-[11px] leading-snug text-background shadow-lg"
        >
          Are you running faster at the same easy effort? We track your median easy-run pace over time. Quicker pace at the same heart rate = your aerobic engine is improving.
        </div>
      )}
    </div>
  );
}

function RangeToggle({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  const opts: Range[] = ["week", "month", "quarter"];
  return (
    <div role="tablist" aria-label="Efficiency range" className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-0.5">
      {opts.map((o) => {
        const active = o === value;
        return (
          <button
            key={o}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition ${
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {RANGE_LABEL[o]}
          </button>
        );
      })}
    </div>
  );
}

function RhythmCard({ d }: { d: Dashboard }) {
  const weeks = d.rhythm?.weeks ?? [];
  const band = d.rhythm?.band;
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  if (weeks.length === 0) {
    return (
      <Card>
        <SectionLabel>Training rhythm</SectionLabel>
        <EmptyLine>Twelve weeks needed to see your band.</EmptyLine>
      </Card>
    );
  }
  const maxSessions = Math.max(...weeks.map((w) => w.volume), band?.high ?? 0, 6);
  const H = 112;
  const u = H / maxSessions;
  const bandTopY = band ? H - band.high * u : 0;
  const bandH = band ? Math.max(2, (band.high - band.low) * u) : 0;
  return (
    <Card>
      <SectionLabel>Training rhythm · 12 weeks</SectionLabel>
      <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
        Each block = one session. The shaded band is your sustainable range — staying inside it beats spiky weeks.
      </p>
      <div className="mt-4 relative" style={{ height: H }}>
        {band && (
          <>
            <div
              className="absolute inset-x-0 rounded"
              style={{
                top: bandTopY,
                height: bandH,
                background: "var(--color-primary)",
                opacity: 0.08,
              }}
              aria-hidden="true"
            />
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
            const active = w.state === "in";
            const color = active ? "var(--color-primary)" : "var(--color-muted-foreground)";
            const isHover = hoverIdx === wi;
            const opacity = isHover ? 1 : active ? 0.95 : 0.4;
            const segH = Math.max(2, u - 2);
            return (
              <div
                key={w.week}
                className="flex-1 flex flex-col-reverse gap-[2px] cursor-pointer relative"
                aria-label={`${w.week}: ${w.volume} sessions`}
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
                  <div
                    key={i}
                    style={{ height: segH, background: color, opacity, borderRadius: 2 }}
                  />
                ))}
              </div>
            );
          })}
        </div>
        {hoverIdx != null && weeks[hoverIdx] && (
          <RhythmTooltip
            week={weeks[hoverIdx].week}
            sessions={weeks[hoverIdx].sessions ?? []}
            align={hoverIdx / Math.max(1, weeks.length - 1)}
          />
        )}
      </div>
      <div className="mt-2 flex justify-between text-[10px] tabular text-muted-foreground">
        <span>{weeks[0].week}</span>
        <span>{weeks[weeks.length - 1].week}</span>
      </div>
      <Verdict>{d.rhythm?.headline ?? "Volume in your sustainable band."}</Verdict>
    </Card>
  );
}

function RhythmTooltip({
  week,
  sessions,
  align,
}: {
  week: string;
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
      <div className="mb-1 text-[10px] uppercase tracking-[0.14em] opacity-70">{week}</div>
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

function RhrCard({ d }: { d: Dashboard }) {
  const series = d.wellness?.rhr_series ?? [];
  const rhr = d.wellness?.rhr;
  const delta = d.wellness?.rhr_delta;
  const values = series.map((p) => p.rhr);
  const baseline = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.3 || 2;
  const elevated = delta != null && delta > 2;
  const firstDate = series[0].date;
  const lastDate = series[series.length - 1].date;
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <SectionLabel>Resting heart rate</SectionLabel>
        {rhr != null && (
          <span className="text-sm text-muted-foreground tabular">
            {fmtInt(rhr)} bpm
          </span>
        )}
      </div>
      <div className="mt-4 h-24">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 6, right: 6, bottom: 18, left: 0 }}>
            <YAxis domain={[min - pad, max + pad]} hide />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              interval={0}
              ticks={[firstDate, lastDate]}
              tickFormatter={(v: string) => fmtShortDate(v)}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
            />
            <ReferenceLine y={baseline} stroke="var(--color-muted-foreground)" strokeOpacity={0.3} strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="rhr"
              stroke={elevated ? "var(--color-destructive)" : "var(--color-foreground)"}
              strokeWidth={2}
              dot={false}
              animationDuration={400}
            />
            <Tooltip
              cursor={{ stroke: "var(--color-muted-foreground)", strokeOpacity: 0.3 }}
              content={makeDateValueTooltip({
                formatValue: (v) => `${fmtInt(v)} bpm`,
              })}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {delta != null && (
        <Verdict>
          <span className="tabular">
            {delta > 0 ? `${fmtInt(delta)} bpm above` : `${fmtInt(Math.abs(delta))} bpm below`}
          </span>{" "}
          baseline{elevated ? " — recovery may be lagging." : "."}
        </Verdict>
      )}
    </Card>
  );
}

function Vo2Card({ d }: { d: Dashboard }) {
  const series = d.body?.vo2max_series ?? [];
  const values = series.map((p) => p.vo2max);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.2 || 1;
  const firstDate = series[0].date;
  const lastDate = series[series.length - 1].date;
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <SectionLabel>VO₂max</SectionLabel>
        <span className="text-sm text-muted-foreground tabular">
          {values[values.length - 1].toFixed(1)}
        </span>
      </div>
      <div className="mt-4 h-24">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 6, right: 6, bottom: 18, left: 0 }}>
            <YAxis domain={[min - pad, max + pad]} hide />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              interval={0}
              ticks={[firstDate, lastDate]}
              tickFormatter={(v: string) => fmtShortDate(v)}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
            />
            <Line type="monotone" dataKey="vo2max" stroke="var(--color-primary)" strokeWidth={2} dot={false} animationDuration={400} />
            <Tooltip
              cursor={{ stroke: "var(--color-muted-foreground)", strokeOpacity: 0.3 }}
              content={makeDateValueTooltip({
                formatValue: (v) => `${(v as number).toFixed(1)} VO₂max`,
              })}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}