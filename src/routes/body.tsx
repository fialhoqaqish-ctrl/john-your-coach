import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, SectionLabel, EmptyLine, Verdict, Building, BaselineForming } from "@/components/ui-bits";
import { useDashboard } from "@/lib/useDashboard";
import { fmtInt, fmtShortDate } from "@/lib/format";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  Scatter,
  ComposedChart,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import type { Dashboard } from "@/lib/types";

export const Route = createFileRoute("/body")({ component: BodyPage });

function BodyPage() {
  const { data, isLoading, error } = useDashboard();
  const sleepNights = data?.sleep_series ?? [];
  const sleepMissing = sleepNights.length < 3;
  return (
    <AppShell>
      <main className="px-5 safe-top pb-6 space-y-5">
        <h1 className="text-[13px] uppercase tracking-[0.16em] text-muted-foreground">Body</h1>
        {isLoading && <EmptyLine>Loading…</EmptyLine>}
        {error && <EmptyLine>Couldn't reach your data.</EmptyLine>}
        {data && (
          <>
            <WeightHero d={data} />
            <ProteinCard d={data} />
            {!sleepMissing && <SleepCard d={data} />}
            {sleepMissing && <BaselineForming signals={["Sleep"]} />}
          </>
        )}
      </main>
    </AppShell>
  );
}

function rollingAvg(pts: { date: string; weight: number }[], window = 7) {
  return pts.map((p, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = pts.slice(start, i + 1);
    const avg = slice.reduce((a, b) => a + b.weight, 0) / slice.length;
    return { ...p, avg };
  });
}

function WeightHero({ d }: { d: Dashboard }) {
  const pts = d.body?.weight ?? [];
  if (pts.length < 3) {
    return (
      <Card>
        <SectionLabel>Weight</SectionLabel>
        <Building needed={Math.max(1, 7 - pts.length)} />
      </Card>
    );
  }
  const withAvg = rollingAvg(pts);
  const firstAvg = withAvg[0].avg;
  const lastAvg = withAvg[withAvg.length - 1].avg;
  const trendingDown = lastAvg < firstAvg;
  // 2-week rolling trend for verdict (cut goal: down is good).
  const recent = withAvg.slice(-14);
  const twoWeekDelta = recent.length >= 2 ? recent[recent.length - 1].avg - recent[0].avg : 0;
  const rollingRising = twoWeekDelta > 0.2; // kg
  const values = pts.map((p) => p.weight);
  const avgs = withAvg.map((p) => p.avg);
  const domainMin = Math.min(...values, ...avgs);
  const domainMax = Math.max(...values, ...avgs);
  const spread = domainMax - domainMin;
  const pad = spread * 0.25 || 0.3;
  const goal = domainMin - pad * 0.5; // subtle goal line below current range
  const firstDate = pts[0].date;
  const lastDate = pts[pts.length - 1].date;
  const verdict = rollingRising
    ? "Trend ticking up — tighten intake."
    : "Up today — 7-day trend still on track. Normal noise on a cut.";
  return (
    <section>
      <SectionLabel>Weight</SectionLabel>
      <div className="flex items-baseline gap-3 mt-2">
        <p className="font-display text-6xl leading-none tabular">{lastAvg.toFixed(1)}</p>
        <span className="text-sm text-muted-foreground tabular">
          {trendingDown ? "▼" : "▲"} {Math.abs(lastAvg - firstAvg).toFixed(1)} kg
        </span>
      </div>
      <div className="mt-4 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={withAvg} margin={{ top: 6, right: 6, bottom: 18, left: 0 }}>
            <YAxis domain={[domainMin - pad, domainMax + pad]} hide />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              interval={0}
              ticks={[firstDate, lastDate]}
              tickFormatter={(v: string) => fmtShortDate(v)}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
            />
            <ReferenceLine y={goal} stroke="var(--color-primary)" strokeOpacity={0.3} strokeDasharray="4 4" />
            <Scatter dataKey="weight" fill="var(--color-muted-foreground)" fillOpacity={0.35} shape="circle" />
            <Line
              type="linear"
              dataKey="avg"
              stroke={rollingRising ? "var(--color-foreground)" : "var(--color-primary)"}
              strokeWidth={2.5}
              dot={false}
              animationDuration={400}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <Verdict>{verdict}</Verdict>
    </section>
  );
}

function ProteinCard({ d }: { d: Dashboard }) {
  const cur = d.nutrition?.protein_g;
  const target = d.nutrition?.protein_target_g;
  const history = d.nutrition?.history ?? [];
  if (cur == null || target == null) {
    return (
      <Card>
        <SectionLabel>Protein</SectionLabel>
        <EmptyLine>Log a meal to start tracking.</EmptyLine>
      </Card>
    );
  }
  if (cur === 0) {
    return (
      <Card>
        <SectionLabel>Protein · muscle protected</SectionLabel>
        <p className="mt-3 text-base text-muted-foreground">Log today's protein.</p>
        <p className="mt-1 text-xs text-muted-foreground tabular">Target {fmtInt(target)} g</p>
      </Card>
    );
  }
  const pct = Math.min(100, (cur / target) * 100);
  return (
    <Card>
      <SectionLabel>Protein · muscle protected</SectionLabel>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="font-display text-5xl leading-none tabular">{fmtInt(cur)}</p>
        <span className="text-sm text-muted-foreground tabular">/ {fmtInt(target)} g</span>
      </div>
      <div className="mt-3 h-1.5 w-full rounded-full bg-border overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${pct}%`, transition: "width 400ms" }} />
      </div>
      {history.length > 0 && (
        <div className="mt-4 grid gap-1" style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}>
          {history.slice(-14).map((h) => {
            const hit = h.protein_g >= h.target;
            return (
              <div
                key={h.date}
                title={`${h.date}: ${h.protein_g}g / ${h.target}g`}
                className="aspect-square rounded-sm"
                style={{
                  background: hit ? "var(--color-primary)" : "var(--color-border)",
                  opacity: hit ? 0.9 : 0.6,
                }}
              />
            );
          })}
        </div>
      )}
    </Card>
  );
}

function SleepCard({ d }: { d: Dashboard }) {
  const nights = d.sleep_series ?? [];
  if (nights.length < 3) {
    return (
      <Card>
        <SectionLabel>Sleep</SectionLabel>
        <Building needed={Math.max(1, 7 - nights.length)} />
      </Card>
    );
  }
  const hours = nights.map((n) => n.hours);
  const avg = hours.reduce((a, b) => a + b, 0) / hours.length;
  const swing = Math.max(...hours) - Math.min(...hours);
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <SectionLabel>Sleep · 7 nights</SectionLabel>
        <span className="text-sm text-muted-foreground tabular">{avg.toFixed(1)}h avg</span>
      </div>
      <div className="mt-4 h-24">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={nights} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
            <YAxis domain={[0, 10]} hide />
            <XAxis dataKey="date" hide />
            <ReferenceLine y={avg} stroke="var(--color-muted-foreground)" strokeOpacity={0.4} strokeDasharray="3 3" />
            <Bar dataKey="hours" radius={[3, 3, 0, 0]}>
              {nights.map((n) => (
                <Cell
                  key={n.date}
                  fill={n.hours < 6 ? "var(--color-destructive)" : "var(--color-foreground)"}
                  fillOpacity={n.hours < 6 ? 0.8 : 0.6}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {swing >= 2 && (
        <Verdict>Your sleep swings {swing.toFixed(1)}h night to night.</Verdict>
      )}
    </Card>
  );
}