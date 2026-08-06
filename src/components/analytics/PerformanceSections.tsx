import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState, MetricLabel, Panel, Segmented } from "./bits";
import { fmtInt, fmtPaceSec, fmtShortDate } from "@/lib/format";
import {
  mass,
  massLabel,
  pace,
  paceLabel,
  type AnalyticsResponse,
  type Units,
} from "@/lib/analytics";

const axis = { fill: "var(--color-muted-foreground)", fontSize: 10 } as const;

function Box({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">{children}</div>;
}

export function PaceTrend({ d, units }: { d: AnalyticsResponse; units: Units }) {
  const rows = (d.pace_trend ?? []).map((p) => ({ ...p, y: pace(p.pace_sec, units) ?? 0 }));
  return (
    <Panel title="Pace trend" info="Run pace over time. Higher on the chart is faster." sources={["STRAVA"]}>
      {rows.length < 2 ? (
        <EmptyState>No runs with pace in this window.</EmptyState>
      ) : (
        <div className="mt-4 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 6, right: 6, bottom: 4, left: -6 }}>
              <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.5} vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                minTickGap={36}
                tickFormatter={(v: string) => fmtShortDate(v)}
                tick={axis}
              />
              <YAxis
                dataKey="y"
                reversed
                domain={["dataMin - 20", "dataMax + 20"]}
                tickFormatter={(v: number) => fmtPaceSec(v)}
                tick={axis}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Scatter data={rows} fill="var(--color-primary)" />
              <Tooltip
                content={({ active, payload }: { active?: boolean; payload?: { payload?: Record<string, unknown> }[] }) => {
                  const row = payload?.[0]?.payload;
                  if (!active || !row) return null;
                  return (
                    <Box>
                      <p className="text-xs text-foreground">{(row.name as string) ?? "Run"}</p>
                      <p className="text-[11px] tabular text-muted-foreground">
                        {fmtShortDate(row.date as string)} · {fmtPaceSec(row.y as number)}
                        {paceLabel(units)}
                      </p>
                    </Box>
                  );
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

export function AerobicEfficiency({ d, units }: { d: AnalyticsResponse; units: Units }) {
  const rows = (d.efficiency ?? []).map((p) => ({ ...p, y: pace(p.pace_sec, units) ?? 0 }));
  return (
    <Panel
      title="Aerobic efficiency"
      info="Pace against heart rate per run. Drifting right at the same pace means more effort for the same speed."
      sources={["STRAVA"]}
    >
      {rows.length < 3 ? (
        <EmptyState>Needs a few more runs with heart-rate data.</EmptyState>
      ) : (
        <div className="mt-4 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 6, right: 6, bottom: 4, left: -6 }}>
              <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.5} />
              <XAxis
                type="number"
                dataKey="avg_hr"
                domain={["dataMin - 5", "dataMax + 5"]}
                tick={axis}
                axisLine={false}
                tickLine={false}
                name="Avg HR"
              />
              <YAxis
                type="number"
                dataKey="y"
                reversed
                domain={["dataMin - 20", "dataMax + 20"]}
                tickFormatter={(v: number) => fmtPaceSec(v)}
                tick={axis}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Scatter data={rows} fill="var(--color-success)" />
              <Tooltip
                content={({ active, payload }: { active?: boolean; payload?: { payload?: Record<string, unknown> }[] }) => {
                  const row = payload?.[0]?.payload;
                  if (!active || !row) return null;
                  return (
                    <Box>
                      <p className="text-xs text-foreground">{(row.name as string) ?? "Run"}</p>
                      <p className="text-[11px] tabular text-muted-foreground">
                        {fmtShortDate(row.date as string)} · {Math.round(row.avg_hr as number)}bpm ·{" "}
                        {fmtPaceSec(row.y as number)}
                        {paceLabel(units)}
                      </p>
                    </Box>
                  );
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

export function ZoneDistribution({ d }: { d: AnalyticsResponse }) {
  const [source, setSource] = useState<"HR" | "Power">("HR");
  const bins = d.zone_distribution?.bins ?? [];
  const lthr = d.zone_distribution?.lthr ?? null;
  return (
    <Panel
      title="Zone distribution"
      info="Share of training time spent in each intensity zone."
      sources={["STRAVA"]}
      right={<Segmented label="Zone source" options={["HR", "Power"] as const} value={source} onChange={setSource} />}
    >
      {bins.length === 0 ? (
        <EmptyState>
          No zone data in this window. Zone splits appear once activity streams sync.
        </EmptyState>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {bins.map((b) => (
            <li key={b.zone}>
              <div className="flex items-baseline justify-between text-[11px]">
                <span className="text-foreground">
                  {b.zone}
                  {b.label ? ` ${b.label}` : ""}
                  {b.range ? <span className="ml-1 text-muted-foreground">{b.range}</span> : null}
                </span>
                <span className="tabular text-muted-foreground">{Math.round(b.pct)}%</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-border">
                <div className="h-full bg-primary" style={{ width: `${Math.min(100, b.pct)}%` }} aria-hidden="true" />
              </div>
            </li>
          ))}
        </ul>
      )}
      {lthr != null && (
        <p className="mt-3 text-[11px] text-muted-foreground">LTHR {Math.round(lthr)} (from profile)</p>
      )}
    </Panel>
  );
}

export function PowerProfile({ d }: { d: AnalyticsResponse }) {
  const [win, setWin] = useState<"6w" | "90d" | "1y" | "All">("90d");
  const rows = d.power_profile ?? [];
  return (
    <Panel
      title="Power profile"
      info="Your best sustained cycling power across durations."
      sources={["STRAVA"]}
      right={<Segmented label="Power window" options={["6w", "90d", "1y", "All"] as const} value={win} onChange={setWin} />}
    >
      {rows.length === 0 ? (
        <EmptyState>
          No cycling power data in this window. Try a longer window, or connect a power-equipped device.
        </EmptyState>
      ) : (
        <div className="mt-4 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 6, right: 6, bottom: 4, left: -22 }}>
              <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.5} vertical={false} />
              <XAxis
                dataKey="duration_sec"
                tick={axis}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => (v >= 60 ? `${Math.round(v / 60)}m` : `${v}s`)}
              />
              <YAxis tick={axis} axisLine={false} tickLine={false} width={34} />
              <Line type="monotone" dataKey="watts" dot={false} strokeWidth={2.5} stroke="var(--color-primary)" />
              <Tooltip
                content={({ active, payload }: { active?: boolean; payload?: { payload?: Record<string, unknown> }[] }) => {
                  const row = payload?.[0]?.payload;
                  if (!active || !row) return null;
                  const s = row.duration_sec as number;
                  return (
                    <Box>
                      <p className="text-xs tabular text-foreground">
                        {s >= 60 ? `${Math.round(s / 60)} min` : `${s} s`} · {fmtInt(row.watts as number)} W
                      </p>
                    </Box>
                  );
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

export function StrengthProgression({ d, units }: { d: AnalyticsResponse; units: Units }) {
  const sessions = d.strength?.sessions ?? [];
  const exercises = d.strength?.exercises ?? Array.from(new Set(sessions.map((s) => s.exercise)));
  const [exercise, setExercise] = useState<string | null>(null);
  const active = exercise ?? exercises[0] ?? null;
  const rows = useMemo(
    () =>
      sessions
        .filter((s) => s.exercise === active)
        .map((s) => ({
          ...s,
          top: mass(s.top_weight_kg, units) ?? 0,
          e1rm: mass(s.e1rm_kg, units) ?? 0,
        })),
    [sessions, active, units],
  );
  const latest = rows[rows.length - 1];
  const best = rows.reduce<number>((a, r) => Math.max(a, r.top), 0);
  const bestE1rm = rows.reduce<number>((a, r) => Math.max(a, r.e1rm), 0);
  const u = massLabel(units);
  return (
    <Panel title="Strength progression" info="Top set and estimated one-rep max per session." sources={["STRAVA", "GARMIN"]}>
      {exercises.length === 0 ? (
        <EmptyState>No strength sets logged in this window.</EmptyState>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {exercises.slice(0, 6).map((ex) => (
              <button
                key={ex}
                type="button"
                aria-pressed={ex === active}
                onClick={() => setExercise(ex)}
                className={`min-h-[32px] rounded-full border px-2.5 text-[11px] ${
                  ex === active ? "border-primary/60 text-foreground" : "border-border text-muted-foreground"
                }`}
              >
                {ex}
              </button>
            ))}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <Stat label="Latest top set" value={latest ? `${latest.top.toFixed(1)}${u}` : "—"} />
            <Stat label="Best top set" value={best ? `${best.toFixed(1)}${u}` : "—"} />
            <Stat label="Best est. 1RM" value={bestE1rm ? `${bestE1rm.toFixed(1)}${u}` : "—"} />
            <Stat label="Sessions" value={fmtInt(rows.length)} />
          </dl>
          {rows.length > 0 && (
            <div className="mt-4 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 6, right: 6, bottom: 4, left: -22 }}>
                  <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.5} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={axis}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={24}
                    tickFormatter={(v: string) => fmtShortDate(v)}
                  />
                  <YAxis tick={axis} axisLine={false} tickLine={false} width={34} />
                  <Bar dataKey="top" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
                  <Tooltip
                    cursor={{ fill: "var(--color-muted-foreground)", fillOpacity: 0.08 }}
                    content={({ active: a, payload }: { active?: boolean; payload?: { payload?: Record<string, unknown> }[] }) => {
                      const row = payload?.[0]?.payload;
                      if (!a || !row) return null;
                      return (
                        <Box>
                          <p className="text-[11px] tabular text-muted-foreground">{fmtShortDate(row.date as string)}</p>
                          <p className="text-xs tabular text-foreground">
                            {(row.top as number).toFixed(1)}
                            {u} × {fmtInt(row.reps as number)} reps
                          </p>
                        </Box>
                      );
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-base tabular text-foreground">{value}</dd>
    </div>
  );
}

export { MetricLabel };