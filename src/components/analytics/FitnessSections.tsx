import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel, MetricLabel, EmptyState, Segmented, DeltaChip, SourceChips } from "./bits";
import { fmtInt, fmtPaceSec, fmtShortDate } from "@/lib/format";
import {
  dist,
  distLabel,
  pace,
  paceLabel,
  type AnalyticsResponse,
  type Thresholds,
  type Units,
} from "@/lib/analytics";

/* ---------------- Week vs week ---------------- */

export function WeekCompare({ d, units }: { d: AnalyticsResponse; units: Units }) {
  const w = d.week_compare;
  const rows = [
    { label: "Sessions", c: w?.sessions, fmt: (v: number) => fmtInt(v) },
    { label: "Volume", c: w?.volume_hours, fmt: (v: number) => `${v.toFixed(1)}h` },
    {
      label: "Distance",
      c: w?.distance_km,
      fmt: (v: number) => `${(dist(v, units) ?? 0).toFixed(1)}${distLabel(units)}`,
    },
    {
      label: "Avg pace",
      c: w?.avg_pace_sec,
      fmt: (v: number) => `${fmtPaceSec(pace(v, units))}${paceLabel(units)}`,
      invert: true,
    },
  ];
  const has = rows.some((r) => r.c?.current != null);
  return (
    <Panel
      title="This week vs last week"
      info="Last 7 days compared with the 7 days before."
      sources={["STRAVA"]}
    >
      {!has ? (
        <EmptyState>No sessions in the last 14 days yet.</EmptyState>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => (
            <li key={r.label} className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-muted-foreground">{r.label}</span>
              <span className="flex items-baseline gap-2">
                <span className="text-base tabular text-foreground">
                  {r.c?.current != null ? r.fmt(r.c.current) : "—"}
                </span>
                <span className="text-[11px] text-muted-foreground tabular">
                  was {r.c?.previous != null ? r.fmt(r.c.previous) : "—"}
                </span>
                <DeltaChip deltaPct={r.c?.delta_pct} invert={r.invert} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ---------------- Performance management chart ---------------- */

export function PmcChart({ d, units }: { d: AnalyticsResponse; units: Units }) {
  const [showPace, setShowPace] = useState(false);
  const rows = (d.pmc ?? []).map((p) => ({
    ...p,
    pace_disp: p.threshold_pace_sec != null ? pace(p.threshold_pace_sec, units) : null,
  }));
  return (
    <Panel
      title="Performance management"
      info="Fitness (CTL), fatigue (ATL) and form (TSB) over time, with daily training load."
      sources={["DERIVED"]}
      right={
        <button
          type="button"
          onClick={() => setShowPace((v) => !v)}
          aria-pressed={showPace}
          className={`min-h-[32px] rounded-full border border-border px-2.5 text-[11px] ${
            showPace ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          Threshold pace
        </button>
      }
    >
      {rows.length < 2 ? (
        <EmptyState>Not enough training history in this window yet.</EmptyState>
      ) : (
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 6, right: 6, bottom: 4, left: -18 }}>
              <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.5} vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                minTickGap={40}
                tickFormatter={(v: string) => fmtShortDate(v)}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
              />
              <YAxis
                yAxisId="load"
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={34}
              />
              {showPace && (
                <YAxis
                  yAxisId="pace"
                  orientation="right"
                  reversed
                  width={40}
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => fmtPaceSec(v)}
                />
              )}
              <ReferenceLine yAxisId="load" y={0} stroke="var(--color-border)" />
              <Bar yAxisId="load" dataKey="load" fill="var(--color-muted-foreground)" fillOpacity={0.25} />
              <Line yAxisId="load" type="monotone" dataKey="ctl" dot={false} strokeWidth={2.5} stroke="var(--color-primary)" />
              <Line yAxisId="load" type="monotone" dataKey="atl" dot={false} strokeWidth={1.75} stroke="var(--color-warning)" />
              <Line yAxisId="load" type="monotone" dataKey="tsb" dot={false} strokeWidth={1.5} strokeDasharray="4 3" stroke="var(--color-foreground)" />
              {showPace && (
                <Line yAxisId="pace" type="monotone" dataKey="pace_disp" dot={false} strokeWidth={1.5} stroke="var(--color-success)" />
              )}
              <Tooltip content={<PmcTooltip units={units} />} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      <Legend
        items={[
          ["Fitness (CTL)", "var(--color-primary)"],
          ["Fatigue (ATL)", "var(--color-warning)"],
          ["Form (TSB)", "var(--color-foreground)"],
        ]}
      />
    </Panel>
  );
}

function Legend({ items }: { items: [string, string][] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-3">
      {items.map(([label, color]) => (
        <li key={label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="h-0.5 w-4 rounded-full" style={{ background: color }} aria-hidden="true" />
          {label}
        </li>
      ))}
    </ul>
  );
}

function PmcTooltip({ units, active, payload, label }: {
  units: Units;
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number }[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const names: Record<string, string> = {
    ctl: "Fitness",
    atl: "Fatigue",
    tsb: "Form",
    load: "Load",
    pace_disp: "Threshold pace",
  };
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-[11px] text-muted-foreground tabular">{fmtShortDate(String(label))}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="text-xs tabular text-foreground">
          {names[String(p.dataKey)] ?? String(p.dataKey)}:{" "}
          {p.dataKey === "pace_disp"
            ? `${fmtPaceSec(p.value)}${paceLabel(units)}`
            : Math.round(p.value ?? 0)}
        </p>
      ))}
    </div>
  );
}

/* ---------------- Thresholds editor ---------------- */

const THRESHOLD_FIELDS: { key: keyof Thresholds; label: string; unit: string; pace?: boolean }[] = [
  { key: "ftp_w", label: "FTP (cycling)", unit: "W" },
  { key: "lthr_cycling", label: "LTHR (cycling)", unit: "bpm" },
  { key: "lthr_running", label: "LTHR (running)", unit: "bpm" },
  { key: "stryd_cp_w", label: "Stryd CP", unit: "W" },
  { key: "threshold_pace_sec", label: "Threshold pace", unit: "sec/km", pace: true },
  { key: "max_hr", label: "Max HR", unit: "bpm" },
];

export function ThresholdsEditor({
  thresholds,
  onSave,
  saving,
}: {
  thresholds: Thresholds | null | undefined;
  onSave: (t: Thresholds) => void;
  saving?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const value = (k: keyof Thresholds) =>
    draft[k] ?? (thresholds?.[k] != null ? String(thresholds[k]) : "");
  return (
    <Panel>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[44px] w-full items-center justify-between text-left"
      >
        <MetricLabel info="Your training thresholds. Zones re-derive from these.">
          Performance thresholds
        </MetricLabel>
        <span className="text-xs text-muted-foreground">{open ? "Hide" : "Edit"}</span>
      </button>
      {open && (
        <div className="mt-4 space-y-3">
          {THRESHOLD_FIELDS.map((f) => (
            <label key={String(f.key)} className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">{f.label}</span>
              <span className="flex items-center gap-2">
                <input
                  inputMode="numeric"
                  value={value(f.key)}
                  onChange={(e) => setDraft((p) => ({ ...p, [f.key]: e.target.value }))}
                  className="h-11 w-24 rounded-lg border border-border bg-transparent px-2 text-right text-sm tabular text-foreground"
                />
                <span className="w-12 text-[11px] text-muted-foreground">{f.unit}</span>
              </span>
            </label>
          ))}
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              const out: Thresholds = {};
              for (const f of THRESHOLD_FIELDS) {
                const raw = draft[f.key as string];
                if (raw != null && raw !== "") (out as Record<string, number>)[f.key as string] = Number(raw);
              }
              onSave(out);
            }}
            className="min-h-[44px] w-full rounded-xl bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save & recompute zones"}
          </button>
          <p className="text-[11px] text-muted-foreground">
            Have lab-tested zones (CPET)? Set custom zone boundaries in your profile.
          </p>
        </div>
      )}
    </Panel>
  );
}

/* ---------------- Consistency heatmap ---------------- */

export function ConsistencyHeatmap({ d }: { d: AnalyticsResponse }) {
  const days = d.heatmap ?? [];
  const weeks = useMemo(() => groupWeeks(days), [days]);
  const max = Math.max(1, ...days.map((x) => x.load ?? 0));
  return (
    <Panel title="Consistency" info="Daily training load. Darker means a bigger day." sources={["STRAVA"]}>
      {days.length === 0 ? (
        <EmptyState>No activity days in this window.</EmptyState>
      ) : (
        <>
          <div className="mt-4 flex gap-[3px] overflow-x-auto pb-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((cell, di) =>
                  cell ? (
                    <span
                      key={cell.date}
                      title={`${cell.date} · ${cell.sessions ?? 0} session${(cell.sessions ?? 0) === 1 ? "" : "s"}`}
                      className="h-3 w-3 rounded-[3px]"
                      style={{
                        background: "var(--color-primary)",
                        opacity: cell.load ? 0.15 + 0.85 * ((cell.load ?? 0) / max) : 0.08,
                      }}
                    />
                  ) : (
                    <span key={di} className="h-3 w-3" />
                  ),
                )}
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Less → More</p>
        </>
      )}
    </Panel>
  );
}

type Cell = { date: string; load?: number | null; sessions?: number | null };
function groupWeeks(days: Cell[]): (Cell | null)[][] {
  const weeks: (Cell | null)[][] = [];
  let current: (Cell | null)[] = new Array(7).fill(null);
  for (const day of days) {
    const dt = new Date(`${day.date}T00:00:00`);
    const idx = (dt.getDay() + 6) % 7; // Monday first
    if (weeks.length === 0 && current.every((c) => c === null)) {
      // seed
    }
    if (idx === 0 && current.some((c) => c !== null)) {
      weeks.push(current);
      current = new Array(7).fill(null);
    }
    current[idx] = day;
  }
  if (current.some((c) => c !== null)) weeks.push(current);
  return weeks;
}

/* ---------------- Training volume ---------------- */

export function TrainingVolume({
  d,
  units,
  title = "Training volume",
}: {
  d: AnalyticsResponse;
  units: Units;
  title?: string;
}) {
  const [metric, setMetric] = useState<"Time" | "Distance">("Time");
  const entries = d.volume ?? [];
  const sports = useMemo(() => Array.from(new Set(entries.map((e) => e.sport))), [entries]);
  const [hidden, setHidden] = useState<string[]>([]);
  const rows = useMemo(() => {
    const byWeek = new Map<string, Record<string, number>>();
    for (const e of entries) {
      if (hidden.includes(e.sport)) continue;
      const row = byWeek.get(e.week) ?? { week: 0 as unknown as number };
      const v =
        metric === "Time" ? (e.hours ?? 0) : (dist(e.distance_km ?? 0, units) ?? 0);
      row[e.sport] = (row[e.sport] ?? 0) + v;
      byWeek.set(e.week, row);
    }
    return Array.from(byWeek.entries()).map(([week, v]) => ({ week, ...v }));
  }, [entries, hidden, metric, units]);
  const palette = ["var(--color-primary)", "var(--color-warning)", "var(--color-success)", "var(--color-muted-foreground)"];
  const suffix = metric === "Time" ? "h" : distLabel(units);
  return (
    <Panel
      title={title}
      info="Weekly training volume broken down by sport."
      sources={["STRAVA"]}
      right={<Segmented label="Volume metric" options={["Time", "Distance"] as const} value={metric} onChange={setMetric} />}
    >
      <div className="mt-3 flex flex-wrap gap-1.5">
        {sports.map((s) => {
          const off = hidden.includes(s);
          return (
            <button
              key={s}
              type="button"
              aria-pressed={!off}
              onClick={() => setHidden((p) => (off ? p.filter((x) => x !== s) : [...p, s]))}
              className={`min-h-[32px] rounded-full border px-2.5 text-[11px] ${
                off ? "border-border text-muted-foreground/60" : "border-primary/60 text-foreground"
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>
      {rows.length === 0 ? (
        <EmptyState>No sessions in this window.</EmptyState>
      ) : (
        <div className="mt-4 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 6, right: 6, bottom: 4, left: -22 }}>
              <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.5} vertical={false} />
              <XAxis
                dataKey="week"
                tickLine={false}
                axisLine={false}
                minTickGap={24}
                tickFormatter={(v: string) => fmtShortDate(v)}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
              />
              <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} width={34} />
              {sports
                .filter((s) => !hidden.includes(s))
                .map((s, i) => (
                  <Bar key={s} dataKey={s} stackId="v" fill={palette[i % palette.length]} radius={[3, 3, 0, 0]} />
                ))}
              <Tooltip
                cursor={{ fill: "var(--color-muted-foreground)", fillOpacity: 0.08 }}
                content={({ active, payload, label }: {
                  active?: boolean;
                  payload?: { dataKey?: string | number; value?: number }[];
                  label?: string | number;
                }) => {
                  if (!active || !payload?.length) return null;
                  const total = payload.reduce((a, p) => a + (p.value ?? 0), 0);
                  return (
                    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
                      <p className="text-[11px] text-muted-foreground tabular">{fmtShortDate(String(label))}</p>
                      {payload.map((p) => (
                        <p key={String(p.dataKey)} className="text-xs tabular text-foreground">
                          {String(p.dataKey)}: {(p.value ?? 0).toFixed(1)}{suffix}
                        </p>
                      ))}
                      <p className="mt-1 text-xs tabular text-primary">Total {total.toFixed(1)}{suffix}</p>
                    </div>
                  );
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      <SourceChips sources={["STRAVA"]} />
    </Panel>
  );
}