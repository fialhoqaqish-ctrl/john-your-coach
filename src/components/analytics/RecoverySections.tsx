import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState, Panel, Segmented } from "./bits";
import { Stat } from "./PerformanceSections";
import { fmtInt, fmtShortDate } from "@/lib/format";
import { mass, massLabel, type AnalyticsResponse, type Units } from "@/lib/analytics";

const axis = { fill: "var(--color-muted-foreground)", fontSize: 10 } as const;

function Box({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">{children}</div>;
}

const SERIES = [
  { key: "hrv", label: "HRV", color: "var(--color-primary)" },
  { key: "sleep_hours", label: "Sleep", color: "var(--color-success)" },
  { key: "readiness", label: "Readiness", color: "var(--color-warning)" },
] as const;

export function WellnessTrends({ d }: { d: AnalyticsResponse }) {
  const rows = d.wellness ?? [];
  const [off, setOff] = useState<string[]>([]);
  return (
    <Panel title="Wellness trends" info="HRV, sleep and readiness over the selected range." sources={["GARMIN"]}>
      {rows.length < 2 ? (
        <EmptyState>Wellness trends unlock when your Garmin syncs.</EmptyState>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {SERIES.map((s) => {
              const hidden = off.includes(s.key);
              return (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={!hidden}
                  onClick={() => setOff((p) => (hidden ? p.filter((x) => x !== s.key) : [...p, s.key]))}
                  className={`min-h-[32px] rounded-full border px-2.5 text-[11px] ${
                    hidden ? "border-border text-muted-foreground/60" : "border-primary/60 text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 6, right: 6, bottom: 4, left: -22 }}>
                <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.5} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={axis}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={36}
                  tickFormatter={(v: string) => fmtShortDate(v)}
                />
                <YAxis yAxisId="l" tick={axis} axisLine={false} tickLine={false} width={34} />
                <YAxis yAxisId="r" orientation="right" tick={axis} axisLine={false} tickLine={false} width={28} />
                {SERIES.filter((s) => !off.includes(s.key)).map((s) => (
                  <Line
                    key={s.key}
                    yAxisId={s.key === "sleep_hours" ? "r" : "l"}
                    type="monotone"
                    dataKey={s.key}
                    dot={false}
                    strokeWidth={2}
                    stroke={s.color}
                    connectNulls
                  />
                ))}
                <Tooltip
                  content={({ active, payload, label }: {
                    active?: boolean;
                    payload?: { dataKey?: string | number; value?: number }[];
                    label?: string | number;
                  }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <Box>
                        <p className="text-[11px] tabular text-muted-foreground">{fmtShortDate(String(label))}</p>
                        {payload.map((p) => (
                          <p key={String(p.dataKey)} className="text-xs tabular text-foreground">
                            {SERIES.find((s) => s.key === p.dataKey)?.label ?? String(p.dataKey)}:{" "}
                            {p.value ?? "—"}
                          </p>
                        ))}
                      </Box>
                    );
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Panel>
  );
}

export function GarminRecovery({ d }: { d: AnalyticsResponse }) {
  const rows = d.garmin_recovery ?? [];
  return (
    <Panel title="Garmin recovery" info="Body battery / recovery score reported by your watch." sources={["GARMIN"]}>
      {rows.length < 2 ? (
        <EmptyState>Recovery unlocks when your Garmin syncs.</EmptyState>
      ) : (
        <div className="mt-4 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 6, right: 6, bottom: 4, left: -22 }}>
              <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.5} vertical={false} />
              <XAxis
                dataKey="date"
                tick={axis}
                axisLine={false}
                tickLine={false}
                minTickGap={36}
                tickFormatter={(v: string) => fmtShortDate(v)}
              />
              <YAxis domain={[0, 100]} tick={axis} axisLine={false} tickLine={false} width={30} />
              <Line type="monotone" dataKey="body_battery" dot={false} strokeWidth={2.5} stroke="var(--color-primary)" connectNulls />
              <Tooltip
                content={({ active, payload, label }: { active?: boolean; payload?: { value?: number }[]; label?: string | number }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <Box>
                      <p className="text-[11px] tabular text-muted-foreground">{fmtShortDate(String(label))}</p>
                      <p className="text-xs tabular text-foreground">Body battery {payload[0].value}</p>
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

export function WeightTrend({ d, units }: { d: AnalyticsResponse; units: Units }) {
  const rows = (d.weight_trend ?? []).map((r) => ({ ...r, w: mass(r.weight_kg, units) ?? 0 }));
  const u = massLabel(units);
  return (
    <Panel title="Weight trend" info="Scale readings over the selected range." sources={["GARMIN"]}>
      {rows.length < 3 ? (
        <EmptyState>
          Not enough weigh-ins yet — connect a smart scale. Readings build the trend from here forward.
        </EmptyState>
      ) : (
        <div className="mt-4 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 6, right: 6, bottom: 4, left: -14 }}>
              <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.5} vertical={false} />
              <XAxis
                dataKey="date"
                tick={axis}
                axisLine={false}
                tickLine={false}
                minTickGap={36}
                tickFormatter={(v: string) => fmtShortDate(v)}
              />
              <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={axis} axisLine={false} tickLine={false} width={40} />
              <Line type="monotone" dataKey="w" dot={false} strokeWidth={2.5} stroke="var(--color-primary)" />
              <Tooltip
                content={({ active, payload, label }: { active?: boolean; payload?: { value?: number }[]; label?: string | number }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <Box>
                      <p className="text-[11px] tabular text-muted-foreground">{fmtShortDate(String(label))}</p>
                      <p className="text-xs tabular text-foreground">
                        {(payload[0].value ?? 0).toFixed(1)} {u}
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

export function NutritionCard({ d }: { d: AnalyticsResponse }) {
  const rows = d.nutrition ?? [];
  return (
    <Panel title="Nutrition" info="Daily calories and protein from your food log." sources={["GARMIN"]}>
      {rows.length === 0 ? (
        <EmptyState>No nutrition data yet. Connect Apple Health, or log meals in the app.</EmptyState>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {rows.slice(-7).map((r) => (
            <li key={r.date} className="flex items-baseline justify-between py-2 text-sm">
              <span className="text-muted-foreground tabular">{fmtShortDate(r.date)}</span>
              <span className="tabular text-foreground">
                {fmtInt(r.kcal)} kcal · {fmtInt(r.protein_g)} g protein
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function CaloriesBurned({ d }: { d: AnalyticsResponse }) {
  const [win, setWin] = useState<"1w" | "4w" | "12w">("4w");
  const c = d.calories;
  const days = c?.days ?? [];
  const sliced = days.slice(-(win === "1w" ? 7 : win === "4w" ? 28 : 84));
  return (
    <Panel
      title="Calories burned"
      info="Basal plus active energy per day."
      sources={["GARMIN"]}
      right={<Segmented label="Calories window" options={["1w", "4w", "12w"] as const} value={win} onChange={setWin} />}
    >
      {sliced.length === 0 ? (
        <EmptyState>Calorie data unlocks when your Garmin or Apple Health syncs.</EmptyState>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-3 gap-3">
            <Stat label="Avg total" value={`${fmtInt(c?.avg_total)}`} />
            <Stat label="Avg BMR" value={`${fmtInt(c?.avg_bmr)}`} />
            <Stat label="Avg active" value={`${fmtInt(c?.avg_active)}`} />
          </dl>
          <p className="mt-1 text-[11px] text-muted-foreground">kcal/day</p>
          <div className="mt-4 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sliced} margin={{ top: 6, right: 6, bottom: 4, left: -14 }}>
                <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.5} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={axis}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={36}
                  tickFormatter={(v: string) => fmtShortDate(v)}
                />
                <YAxis tick={axis} axisLine={false} tickLine={false} width={42} />
                <Bar dataKey="bmr" stackId="c" fill="var(--color-muted-foreground)" fillOpacity={0.4} />
                <Bar dataKey="active" stackId="c" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
                <Tooltip
                  cursor={{ fill: "var(--color-muted-foreground)", fillOpacity: 0.08 }}
                  content={({ active, payload, label }: {
                    active?: boolean;
                    payload?: { dataKey?: string | number; value?: number }[];
                    label?: string | number;
                  }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <Box>
                        <p className="text-[11px] tabular text-muted-foreground">{fmtShortDate(String(label))}</p>
                        {payload.map((p) => (
                          <p key={String(p.dataKey)} className="text-xs tabular text-foreground">
                            {String(p.dataKey) === "bmr" ? "BMR" : "Active"}: {fmtInt(p.value)} kcal
                          </p>
                        ))}
                      </Box>
                    );
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="py-1 font-medium">Date</th>
                  <th className="py-1 text-right font-medium">Total</th>
                  <th className="py-1 text-right font-medium">BMR</th>
                  <th className="py-1 text-right font-medium">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sliced.slice(-10).reverse().map((r) => (
                  <tr key={r.date} className="tabular">
                    <td className="py-1.5 text-muted-foreground">{fmtShortDate(r.date)}</td>
                    <td className="py-1.5 text-right text-foreground">{fmtInt(r.total)}</td>
                    <td className="py-1.5 text-right text-muted-foreground">{fmtInt(r.bmr)}</td>
                    <td className="py-1.5 text-right text-muted-foreground">{fmtInt(r.active)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Panel>
  );
}