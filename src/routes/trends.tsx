import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, SectionLabel, EmptyLine, Verdict, BaselineForming } from "@/components/ui-bits";
import { useDashboard } from "@/lib/useDashboard";
import { fmtPct, fmtInt } from "@/lib/format";
import { fmtShortDate } from "@/lib/format";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import type { Dashboard } from "@/lib/types";

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

function AerobicCard({ d }: { d: Dashboard }) {
  const data = d.pace_trend ?? [];
  if (data.length < 2) {
    return (
      <Card>
        <SectionLabel>Aerobic efficiency</SectionLabel>
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
  const verdictLine =
    improvement > 0.5
      ? `${abs.toFixed(1)}% more efficient than 8 weeks ago.`
      : improvement < -0.5
        ? `${abs.toFixed(1)}% less efficient than 8 weeks ago — slower at the same effort.`
        : "Holding pace at the same effort.";
  const bandLo = min + (max - min) * 0.35;
  const bandHi = min + (max - min) * 0.65;
  const firstLabel = data[0].period;
  const lastLabel = data[data.length - 1].period;
  return (
    <Card>
      <SectionLabel>Aerobic efficiency</SectionLabel>
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
          </LineChart>
        </ResponsiveContainer>
      </div>
      <Verdict>{verdictLine}</Verdict>
    </Card>
  );
}

function RhythmCard({ d }: { d: Dashboard }) {
  const weeks = d.rhythm?.weeks ?? [];
  const band = d.rhythm?.band;
  if (weeks.length === 0) {
    return (
      <Card>
        <SectionLabel>Training rhythm</SectionLabel>
        <EmptyLine>Twelve weeks needed to see your band.</EmptyLine>
      </Card>
    );
  }
  const maxVol = Math.max(...weeks.map((w) => w.volume), band?.high ?? 0);
  const firstWeek = weeks[0].week;
  const lastWeek = weeks[weeks.length - 1].week;
  return (
    <Card>
      <SectionLabel>Training rhythm · 12 weeks</SectionLabel>
      <div className="mt-4 h-28">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeks} margin={{ top: 4, right: 4, bottom: 18, left: 0 }}>
            <YAxis domain={[0, maxVol * 1.1]} hide />
            <XAxis
              dataKey="week"
              tickLine={false}
              axisLine={false}
              interval={0}
              ticks={[firstWeek, lastWeek]}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
            />
            {band && (
              <ReferenceArea y1={band.low} y2={band.high} fill="var(--color-primary)" fillOpacity={0.08} />
            )}
            <Bar dataKey="volume" radius={[3, 3, 0, 0]}>
              {weeks.map((w) => (
                <Cell
                  key={w.week}
                  fill={w.state === "in" ? "var(--color-primary)" : "var(--color-muted-foreground)"}
                  fillOpacity={w.state === "in" ? 0.95 : 0.4}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Verdict>{d.rhythm?.headline ?? "Volume in your sustainable band."}</Verdict>
    </Card>
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
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}